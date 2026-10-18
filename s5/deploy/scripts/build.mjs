// Builds the deployable site (dist/) and the full SAM5PACK game pack (build/).
//
// Inputs (outside Git, see ../README.md):
//   SAM5_BUNDLE_WEB  shipped launcher build   (default ../mac-bundle/web)
//   SAM5_GAME_DIR    original 1.10r game dir  (default ../game)
//
// The launcher JS is copied untouched. index.html gets extra <script> tags for the speed-patched
// engine redirect (web/sam5-engine.js + scripts/patch-engine.mjs), the network auto-import adapter
// (web/sam5-autoload.js), the touch keyboard fix (web/sam5-touch.js) and the tablet sound unlock fix
// (web/sam5-audio.js).
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { patchEngine, patchedName } from './patch-engine.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundleWeb = resolve(root, process.env.SAM5_BUNDLE_WEB ?? '../mac-bundle/web');
const gameDir = resolve(root, process.env.SAM5_GAME_DIR ?? '../game');
const distDir = join(root, 'dist');
const buildDir = join(root, 'build');

const EXECUTABLE = 'SAM5GOLD25_KO_1.10r.exe';
const EXECUTABLE_SHA256 = '10574a01b3560a42e10dbaa74760adc7b06a9161483dc66615fb0bcd8f64cc72';
// Same list the shipped folder importer enforces; the pack importer does not check it, so we do.
const REQUIRED_S5 = 'acertwp.s5,btngrp.s5,budoukai.s5,calc.s5,canma.s5,canmb.s5,canmd.s5,estl.s5,fmap.s5,graph.s5,hanime.s5,henv.s5,hexgrp.s5,hexmap.s5,hunit.s5,ikki1.s5,ikki2.s5,ikkihai.s5,item.s5,kaodata.s5,logo.s5,mainmap.s5,mainwin.s5,map256.s5,mapanm.s5,message.s5,nbdata.s5,pal256.s5,pre_end.s5,sndata.s5,soundgrp.s5,taiki.s5'.split(',');
const DERIVED_ROLES = new Set(['glyphs', 'cursor', 'module']);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export function readPack(buf) {
  if (buf.subarray(0, 8).toString('latin1') !== 'SAM5PACK') throw Error('Invalid pack magic');
  const headerLength = buf.readUInt32LE(8);
  const header = JSON.parse(buf.subarray(12, 12 + headerLength).toString('utf8'));
  const base = 12 + headerLength;
  return header.files.map((f) => ({ ...f, data: buf.subarray(base + f.offset, base + f.offset + f.size) }));
}

export function writePack(entries) {
  let offset = 0;
  const files = entries.map(({ path, role, data }) => {
    const entry = { path, role, size: data.length, offset, sha256: sha256(data) };
    offset += data.length;
    return entry;
  });
  const header = Buffer.from(JSON.stringify({ version: 1, files }), 'utf8');
  const prefix = Buffer.alloc(12);
  prefix.write('SAM5PACK', 0, 'latin1');
  prefix.writeUInt32LE(header.length, 8);
  return Buffer.concat([prefix, header, ...entries.map((e) => e.data)]);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === '.DS_Store' || name.startsWith('._')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

export function buildGamePack() {
  if (!existsSync(join(gameDir, EXECUTABLE))) throw Error(`Missing ${EXECUTABLE} in ${gameDir}`);
  const entries = [];
  const seen = new Set();
  const add = (path, role, data) => {
    const key = path.toLowerCase();
    if (seen.has(key)) throw Error(`Duplicate pack path: ${path}`);
    seen.add(key);
    entries.push({ path, role, data });
  };
  // macOS can hand back NFD Hangul names; the browser importer compares NFC strings.
  const gameFiles = walk(gameDir)
    .map((full) => ({ full, path: relative(gameDir, full).split('\\').join('/').normalize('NFC') }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const { full, path } of gameFiles) add(path, path === EXECUTABLE ? 'executable' : 'data', readFileSync(full));

  const exe = entries.find((e) => e.role === 'executable');
  if (!exe || sha256(exe.data) !== EXECUTABLE_SHA256) throw Error('Executable SHA256 mismatch: not the supported 1.10r');
  for (const name of REQUIRED_S5) {
    const hit = entries.find((e) => e.path.toLowerCase() === name);
    if (!hit || !hit.data.length) throw Error(`Required game file missing or empty: ${name}`);
  }

  // Derived data (glyphs, cursors, decoded modules) the folder importer would merge from runtime.bin.
  const runtime = readPack(readFileSync(join(bundleWeb, 'private/runtime.bin')));
  for (const f of runtime) {
    if (!DERIVED_ROLES.has(f.role)) throw Error(`Unexpected runtime.bin role: ${f.role}`);
    add(f.path, f.role, Buffer.from(f.data));
  }
  return writePack(entries);
}

function buildSite(pack) {
  rmSync(distDir, { recursive: true, force: true });
  cpSync(bundleWeb, distDir, { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });
  cpSync(join(root, 'web'), distDir, { recursive: true });

  const workers = readdirSync(join(distDir, 'assets')).filter((f) => /^worker-[\w-]+\.js$/.test(f));
  if (workers.length !== 1) throw Error(`Expected one engine worker, found ${workers.join(', ')}`);
  const patched = patchEngine(readFileSync(join(distDir, 'assets', workers[0]), 'utf8'));
  const fastName = patchedName(patched);
  writeFileSync(join(distDir, 'assets', fastName), patched);
  const enginePath = join(distDir, 'sam5-engine.js');
  writeFileSync(enginePath, readFileSync(enginePath, 'utf8').replace('__FAST_WORKER__', fastName));

  const indexPath = join(distDir, 'index.html');
  const html = readFileSync(indexPath, 'utf8');
  const tag = ['sam5-audio.js', 'sam5-engine.js', 'sam5-autoload.js', 'sam5-touch.js'].map((f) => `<script type="module" src="./${f}"></script>`).join('\n    ');
  if (!html.includes('</head>')) throw Error('index.html has no </head>');
  writeFileSync(indexPath, html.replace('</head>', `    ${tag}\n  </head>`));

  const packSha = sha256(pack);
  const manifest = {
    format: 'SAM5PACK/1',
    game: 'SAM5GOLD25_KO_1.10r',
    key: `gamepacks/sam5gold25-ko-1.10r-${packSha.slice(0, 16)}.bin`,
    size: pack.length,
    sha256: packSha,
  };
  writeFileSync(join(distDir, 'pack-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pack = buildGamePack();
  const manifest = buildSite(pack);
  mkdirSync(buildDir, { recursive: true });
  writeFileSync(join(buildDir, 'pack.bin'), pack);
  writeFileSync(join(buildDir, 'pack-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}
