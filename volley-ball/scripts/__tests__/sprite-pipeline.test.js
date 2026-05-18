'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PNG } = require('pngjs');

const { extractSprites } = require('../extract-sprites.js');
const { packSprites } = require('../pack-sprites.js');

const REPO = path.resolve(__dirname, '../..');
const ORIG_PNG = path.join(REPO, 'src/assets/images/sprite_sheet.png');
const ORIG_JSON = path.join(REPO, 'src/assets/images/sprite_sheet.json');
const WORKSPACE = path.join(REPO, '_workspace');

async function readLayout() {
  return JSON.parse(await fs.readFile(ORIG_JSON, 'utf8'));
}

async function makeTempDir(prefix) {
  await fs.mkdir(WORKSPACE, { recursive: true });
  return fs.mkdtemp(path.join(WORKSPACE, prefix));
}

test('extract produces all 77 sprites with dimensions matching layout', async (t) => {
  const outDir = await makeTempDir('test-extract-');
  t.after(() => fs.rm(outDir, { recursive: true, force: true }));

  const layout = await readLayout();
  const results = await extractSprites({ pngPath: ORIG_PNG, layout, outDir });

  assert.equal(results.length, 77, 'should extract 77 sprites');

  for (const name of Object.keys(layout.frames)) {
    const fullPath = path.join(outDir, name);
    const stat = await fs.stat(fullPath);
    assert.ok(stat.size > 0, `${name} should be non-empty`);

    const buf = await fs.readFile(fullPath);
    const png = PNG.sync.read(buf);
    const expected = layout.frames[name].frame;
    assert.equal(png.width, expected.w, `${name} width should be ${expected.w}`);
    assert.equal(png.height, expected.h, `${name} height should be ${expected.h}`);
  }
});

test('all 28 pikachu frames exist after extract', async (t) => {
  const outDir = await makeTempDir('test-pikachu-');
  t.after(() => fs.rm(outDir, { recursive: true, force: true }));

  const layout = await readLayout();
  await extractSprites({ pngPath: ORIG_PNG, layout, outDir });

  // states 0/1/2/5/6 have 5 frames; state 3 has 2 frames; state 4 has 1 frame
  const stateFrameCounts = { 0: 5, 1: 5, 2: 5, 3: 2, 4: 1, 5: 5, 6: 5 };
  let total = 0;
  for (const [state, count] of Object.entries(stateFrameCounts)) {
    for (let frame = 0; frame < count; frame++) {
      const p = path.join(outDir, `pikachu/pikachu_${state}_${frame}.png`);
      const stat = await fs.stat(p);
      assert.ok(stat.size > 0, `pikachu_${state}_${frame}.png missing`);
      const png = PNG.sync.read(await fs.readFile(p));
      assert.equal(png.width, 64);
      assert.equal(png.height, 64);
      total++;
    }
  }
  assert.equal(total, 28);
});

test('round-trip: extract -> pack reproduces frame pixels byte-perfect', async (t) => {
  const outDir = await makeTempDir('test-roundtrip-');
  t.after(() => fs.rm(outDir, { recursive: true, force: true }));

  const layout = await readLayout();
  await extractSprites({ pngPath: ORIG_PNG, layout, outDir });
  const packedBuf = await packSprites({ srcDir: outDir, layout });

  const orig = PNG.sync.read(await fs.readFile(ORIG_PNG));
  const repack = PNG.sync.read(packedBuf);
  assert.equal(repack.width, orig.width);
  assert.equal(repack.height, orig.height);

  // Verify every pixel within every frame region matches exactly
  for (const [name, info] of Object.entries(layout.frames)) {
    const { x, y, w, h } = info.frame;
    for (let row = 0; row < h; row++) {
      const start = ((y + row) * orig.width + x) * 4;
      const end = start + w * 4;
      for (let i = start; i < end; i++) {
        if (orig.data[i] !== repack.data[i]) {
          assert.fail(`${name}: pixel mismatch at row ${row}, byte offset ${i - start}`);
        }
      }
    }
  }
});

test('pack rejects mismatched sprite dimensions', async (t) => {
  const outDir = await makeTempDir('test-mismatch-');
  t.after(() => fs.rm(outDir, { recursive: true, force: true }));

  const layout = await readLayout();
  await extractSprites({ pngPath: ORIG_PNG, layout, outDir });

  // Replace one sprite with a wrong-sized PNG
  const targetName = 'pikachu/pikachu_0_0.png';
  const wrongPng = new PNG({ width: 32, height: 32 });
  wrongPng.data.fill(0);
  await fs.writeFile(path.join(outDir, targetName), PNG.sync.write(wrongPng));

  await assert.rejects(
    packSprites({ srcDir: outDir, layout }),
    /pikachu_0_0\.png/,
    'pack should reject sprite with wrong dimensions and reference the offending file'
  );
});
