import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { patchEngine, patchedName } from '../scripts/patch-engine.mjs';

const root = new URL('..', import.meta.url).pathname;
const launcherAssets = resolve(root, process.env.SAM5_BUNDLE_WEB ?? '../mac-bundle/web', 'assets');
const original = readFileSync(join(launcherAssets, readdirSync(launcherAssets).find((f) => /^worker-[A-Za-z0-9_]+\.js$/.test(f))), 'utf8');
// dist/ only exists after `npm run build`, which needs your own game folder.
const assets = join(root, 'dist/assets');
const noBuild = existsSync(assets) ? false : 'dist/ not built (npm run build needs your own game folder)';

test('patch applies to the shipped engine and yields valid module syntax', () => {
  const patched = patchEngine(original);
  assert.ok(patched.includes('this.cpu.run(e-r,typeof t==`function`?void 0:t,{stopBeforeHook:!0})'));
  assert.ok(!patched.includes('setTimeout(a,0)'));
  assert.ok(patched.includes('this.sleep(t/__sam5Speed)'));
  const dir = mkdtempSync(join(tmpdir(), 'sam5-patch-'));
  const file = join(dir, 'worker.mjs');
  writeFileSync(file, patched);
  execFileSync(process.execPath, ['--check', file]);
  assert.throws(() => patchEngine(patched), /already patched/);
});

test('build ships the patched worker the redirect points at', { skip: noBuild }, () => {
  const name = patchedName(patchEngine(original));
  assert.ok(readdirSync(assets).includes(name));
  assert.match(readFileSync(join(root, 'dist/sam5-engine.js'), 'utf8'), new RegExp(`FAST_WORKER = '${name}'`));
  assert.match(readFileSync(join(root, 'dist/index.html'), 'utf8'), /src="\.\/sam5-engine\.js"[\s\S]*src="\.\/sam5-autoload\.js"/);
});

test('a changed launcher fails the build instead of shipping a half patch', () => {
  assert.throws(() => patchEngine(original.replace('setTimeout(a,0)', 'setTimeout(a,1)')), /unclamped slice yield/);
});
