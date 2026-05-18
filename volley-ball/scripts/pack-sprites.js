'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { PNG } = require('pngjs');

async function packSprites({ srcDir, layout }) {
  const sheetW = layout.meta.size.w;
  const sheetH = layout.meta.size.h;

  const out = new PNG({ width: sheetW, height: sheetH });
  out.data.fill(0); // start fully transparent

  for (const [name, info] of Object.entries(layout.frames)) {
    const { x, y, w, h } = info.frame;
    const srcPath = path.join(srcDir, name);

    let srcBuf;
    try {
      srcBuf = await fs.readFile(srcPath);
    } catch (err) {
      throw new Error(`${name}: source file not found at ${srcPath}`);
    }

    const sprite = PNG.sync.read(srcBuf);
    if (sprite.width !== w || sprite.height !== h) {
      throw new Error(
        `${name}: expected ${w}x${h}, got ${sprite.width}x${sprite.height}`
      );
    }

    for (let row = 0; row < h; row++) {
      const srcOffset = row * w * 4;
      const dstOffset = ((y + row) * sheetW + x) * 4;
      sprite.data.copy(out.data, dstOffset, srcOffset, srcOffset + w * 4);
    }
  }

  return PNG.sync.write(out);
}

async function main() {
  const repo = path.resolve(__dirname, '..');
  const args = process.argv.slice(2);
  const srcDir = args[0] || path.join(repo, 'assets_src');
  const jsonPath = args[1] || path.join(repo, 'src/assets/images/sprite_sheet.json');
  const outPng = args[2] || path.join(repo, 'src/assets/images/sprite_sheet.png');

  const layout = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
  const buf = await packSprites({ srcDir, layout });
  await fs.writeFile(outPng, buf);

  const rel = path.relative(repo, outPng);
  console.log(
    `Packed ${Object.keys(layout.frames).length} sprites into ${rel}`
  );
}

module.exports = { packSprites };

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
