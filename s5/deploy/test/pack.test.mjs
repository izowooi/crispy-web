// Parses packs with the launcher's own SAM5PACK reader (shipped store module), so the tests fail if
// our writer drifts from the contract the browser enforces.
//
// The first test needs no game data. The rest check the real build output and are skipped until you
// run `npm run build` against your own legally owned game folder.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { readPack, writePack } from '../scripts/build.mjs';

const root = new URL('..', import.meta.url).pathname;
const launcherAssets = resolve(root, process.env.SAM5_BUNDLE_WEB ?? '../mac-bundle/web', 'assets');
const storeFile = readdirSync(launcherAssets).find((f) => /^store-.*\.js$/.test(f));
const { l: parseShippedPack } = await import(join(launcherAssets, storeFile));

const packPath = join(root, 'build/pack.bin');
const manifestPath = join(root, 'dist/pack-manifest.json');
const noBuild = existsSync(packPath) && existsSync(manifestPath) ? false : 'no build/pack.bin (npm run build needs your own game folder)';

test('writer output is accepted by the shipped parser (synthetic data, no game files)', async () => {
  const entries = [
    { path: 'hello.s5', role: 'data', data: Buffer.from('not game data') },
    { path: '한글/경로.txt', role: 'data', data: Buffer.from([0, 1, 2, 3]) },
  ];
  const buf = writePack(entries);
  assert.equal(buf.subarray(0, 8).toString('latin1'), 'SAM5PACK');
  const { header, files } = await parseShippedPack(new Blob([buf]));
  assert.equal(header.version, 1);
  assert.deepEqual(files.map((f) => f.path), entries.map((e) => e.path));
  for (const [i, f] of files.entries()) {
    assert.deepEqual(Buffer.from(await f.blob.arrayBuffer()), entries[i].data);
    assert.equal(f.sha256, createHash('sha256').update(entries[i].data).digest('hex'));
  }
  assert.deepEqual(readPack(buf).map((f) => Buffer.from(f.data)), entries.map((e) => e.data));
});

test('manifest matches the built pack', { skip: noBuild }, () => {
  const packBuf = readFileSync(packPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.size, packBuf.length);
  assert.equal(manifest.sha256, createHash('sha256').update(packBuf).digest('hex'));
  assert.match(manifest.key, new RegExp(`^gamepacks/sam5gold25-ko-1\\.10r-${manifest.sha256.slice(0, 16)}\\.bin$`));
});

test('shipped parser accepts the built pack and finds the supported executable', { skip: noBuild }, async () => {
  const { header, files } = await parseShippedPack(new Blob([readFileSync(packPath)]));
  assert.equal(header.version, 1);
  const exes = files.filter((f) => f.role === 'executable');
  assert.deepEqual(exes.map((f) => f.path), ['SAM5GOLD25_KO_1.10r.exe']);
  assert.equal(exes[0].sha256, '10574a01b3560a42e10dbaa74760adc7b06a9161483dc66615fb0bcd8f64cc72');
  const paths = new Set(files.map((f) => f.path.toLowerCase()));
  for (const p of ['glyphs.json', 'glyphs.bin', 'modules/modules.json', 'cursors/cursors.json', 'kaodata.s5', 'sound/track02.mp3', 'open.avi']) {
    assert.ok(paths.has(p), `missing ${p}`);
  }
  assert.ok(![...paths].some((p) => p.endsWith('.ds_store')));
  assert.ok(files.every((f) => f.path === f.path.normalize('NFC')), 'paths must be NFC');
});

test('index.html loads the adapters and keeps the shipped launcher', { skip: noBuild }, () => {
  const html = readFileSync(join(root, 'dist/index.html'), 'utf8');
  assert.match(html, /<script type="module" src="\.\/sam5-autoload\.js"><\/script>/);
  assert.match(html, /assets\/shell-[\w-]+\.js/);
  assert.match(html, /<script type="module" src="\.\/sam5-touch\.js"><\/script>/);
  assert.match(html, /<script type="module" src="\.\/sam5-audio\.js"><\/script>/);
  for (const f of ['sam5-audio.js', 'sam5-autoload.js', 'sam5-touch.js']) assert.ok(existsSync(join(root, 'dist', f)), `${f} must be copied into dist`);
  const headers = readFileSync(join(root, 'dist/_headers'), 'utf8');
  assert.match(headers, /Cross-Origin-Opener-Policy: same-origin/);
  assert.match(headers, /Cross-Origin-Embedder-Policy: require-corp/);
});
