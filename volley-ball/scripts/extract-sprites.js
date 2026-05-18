'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { PNG } = require('pngjs');

async function extractSprites({ pngPath, layout, outDir }) {
  const buf = await fs.readFile(pngPath);
  const sheet = PNG.sync.read(buf);

  const results = [];
  for (const [name, info] of Object.entries(layout.frames)) {
    const { x, y, w, h } = info.frame;

    if (x + w > sheet.width || y + h > sheet.height) {
      throw new Error(
        `${name}: frame (${x},${y},${w},${h}) exceeds sheet ${sheet.width}x${sheet.height}`
      );
    }

    const sub = new PNG({ width: w, height: h });
    for (let row = 0; row < h; row++) {
      const srcOffset = ((y + row) * sheet.width + x) * 4;
      const dstOffset = row * w * 4;
      sheet.data.copy(sub.data, dstOffset, srcOffset, srcOffset + w * 4);
    }

    const outPath = path.join(outDir, name);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, PNG.sync.write(sub));

    results.push({ name, w, h });
  }

  return results;
}

async function main() {
  const repo = path.resolve(__dirname, '..');
  const args = process.argv.slice(2);
  const pngPath = args[0] || path.join(repo, 'src/assets/images/sprite_sheet.png');
  const jsonPath = args[1] || path.join(repo, 'src/assets/images/sprite_sheet.json');
  const outDir = args[2] || path.join(repo, 'assets_src');

  const layout = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
  await fs.mkdir(outDir, { recursive: true });

  const results = await extractSprites({ pngPath, layout, outDir });
  const rel = path.relative(repo, outDir);
  console.log(`Extracted ${results.length} sprites into ${rel}/`);
}

module.exports = { extractSprites };

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
