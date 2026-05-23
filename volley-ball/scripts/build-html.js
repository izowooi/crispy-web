'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const DIST = path.join(REPO, 'dist');

const SOUND_MIME = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

const SOUND_KEYS = [
  'BGM',
  'PIPIKACHU',
  'PIKA',
  'CHU',
  'PI',
  'PIKACHU',
  'POWERHIT',
  'BALLTOUCHESGROUND',
];

// Matches the constants in src/game/assets_path.js
const SOUND_FILE_MAP = {
  BGM: 'bgm.mp3',
  PIPIKACHU: 'WAVE140_1.wav',
  PIKA: 'WAVE141_1.wav',
  CHU: 'WAVE142_1.wav',
  PI: 'WAVE143_1.wav',
  PIKACHU: 'WAVE144_1.wav',
  POWERHIT: 'WAVE145_1.wav',
  BALLTOUCHESGROUND: 'WAVE146_1.wav',
};

async function readBase64(filePath) {
  const buf = await fs.readFile(filePath);
  return buf.toString('base64');
}

async function main() {
  // Sanity: dist must exist with the expected outputs
  const required = [
    'index.html',
    'main.bundle.js',
    'style.css',
    'assets/images/sprite_sheet.png',
    'assets/images/sprite_sheet.json',
  ];
  for (const rel of required) {
    try {
      await fs.access(path.join(DIST, rel));
    } catch {
      throw new Error(
        `Missing ${rel} under dist/. Run 'npm run build' first.`
      );
    }
  }

  const [bundle, css, spriteJsonText, spritePngB64] = await Promise.all([
    fs.readFile(path.join(DIST, 'main.bundle.js'), 'utf8'),
    fs.readFile(path.join(DIST, 'style.css'), 'utf8'),
    fs.readFile(path.join(DIST, 'assets/images/sprite_sheet.json'), 'utf8'),
    readBase64(path.join(DIST, 'assets/images/sprite_sheet.png')),
  ]);

  const spriteJson = JSON.parse(spriteJsonText);
  // Rewrite the image reference to a data URI so the sheet is fully self-contained.
  // PixiJS will use the JSON-supplied data URI verbatim instead of resolving against
  // the JSON's own URL (which would be a blob: URL and would not resolve correctly
  // against a relative path).
  spriteJson.meta = spriteJson.meta || {};
  spriteJson.meta.image = `data:image/png;base64,${spritePngB64}`;
  const spriteJsonInline = JSON.stringify(spriteJson);

  const sounds = {};
  for (const key of SOUND_KEYS) {
    const file = SOUND_FILE_MAP[key];
    const ext = path.extname(file).toLowerCase();
    const mime = SOUND_MIME[ext];
    if (!mime) throw new Error(`Unknown sound extension: ${ext}`);
    const b64 = await readBase64(path.join(DIST, 'assets/sounds', file));
    sounds[key] = `data:${mime};base64,${b64}`;
  }

  // PixiJS' SpritesheetLoader uses `meta.image` directly only when the JSON
  // resource itself is a data URL (`resource.isDataUrl === true`). For blob URLs
  // it falls back to `url.resolve(jsonUrl, meta.image)`, which mangles
  // `blob:` + `data:` combinations. So we deliver the JSON as a data URI too —
  // ~100KB overhead from re-encoding the embedded PNG base64, but reliable.
  const spriteJsonB64 = Buffer.from(spriteJsonInline, 'utf8').toString('base64');
  const spriteSheetDataUri = `data:application/json;base64,${spriteJsonB64}`;

  const overrideScript = `
(function () {
  window.__ASSETS_OVERRIDE = {
    SPRITE_SHEET: ${JSON.stringify(spriteSheetDataUri)},
    SOUNDS: ${JSON.stringify(sounds)}
  };
})();
`.trim();

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Volleyball (offline)</title>
<style>
${css}
</style>
</head>
<body>
<div id="game-canvas-container">
  <div id="loading-box">
    <div class="loading-inner">
      <p>Loading...</p>
      <div id="progress-bar-border"><div id="progress-bar" style="width: 0%"></div></div>
    </div>
  </div>
</div>
<script>
${overrideScript}
</script>
<script>
${bundle}
</script>
</body>
</html>
`;

  // Write to repo root (not dist/) — dist/ is wiped by CleanWebpackPlugin on
  // every webpack build, but the offline HTML is a tracked deliverable.
  const outPath = path.join(REPO, 'volley-ball.html');
  await fs.writeFile(outPath, html);

  const stat = await fs.stat(outPath);
  const mib = (stat.size / 1024 / 1024).toFixed(2);
  console.log(
    `Wrote ${path.relative(REPO, outPath)} — ${stat.size.toLocaleString()} bytes (${mib} MiB)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
