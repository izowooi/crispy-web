# Snowcraft — Faithful Port Result

A line-cited, web-native port of the original Snowcraft Flash game. The
pipeline preserves every gameplay constant against the decompiled
ActionScript 2 source: each numeric literal in `web/src/core/*.ts` carries
the AS file + line range it was extracted from.

Source SWF: `approach-3-ruffle/snowcraft.swf` (441,752 B, CWS, SWF v8).

---

## 1. Decompiled artifacts → spec docs

Decompiled with **JPEXS Free Flash Decompiler 26.2.1** + **ffmpeg 7.1.1**
(see `PROGRESS.md` Phase 0 for tooling install).

### `approach-4-faithful-port/decompiled/`
| Folder | Count | Content |
|---|---|---|
| `scripts/` | **68 files** | Full AS2 dump under `__Packages/com/iconnicholson/onehammer/` plus `frame_*/DoAction.as`. Includes `Snowcraft1Rewrite.as`, `AGame.as`, `RedSnowDudie.as`, `GreenSnowDudie.as`, `ASnowDudie.as`, `SnowBall.as`. |
| `images/` | **10 files** | Raw PNG/JPEG bitmaps (chids 3, 6, 11, 33, 36, 38, 41, 44, 49, 111). |
| `sprites/` | **65 dirs** | Per-sprite frame dumps (`DefineSprite_<id>_<name>/<frame>.png`). |
| `sounds/` | **14 files** | Raw decompiled MP3/WAV streams (cids 72..84 + −1 placeholder). |
| `shapes/` | **17 files** | SWF shape extracts. |
| `dump.txt` | 1 file | `ffdec -dumpSWF` text dump (frame labels, ExportAssets, tag tree). |

### `approach-4-faithful-port/spec/` — 7 docs / 4,790 lines total
| Doc | Lines | Coverage |
|---|---|---|
| `main.md` | 923 | SWF header, frame timeline, boot/loop entry points. |
| `ai.md` | 974 | Green dudie state machine + throw timing. |
| `ui.md` | 758 | Title MovieClip frame labels, HUD wiring. |
| `levels.md` | 670 | Per-level enemy tables (post-mutation), win/lose, walkspeeds. |
| `player.md` | 519 | Red dudie controls, hit-box, drag/teleport, charge meter. |
| `snowball.md` | 496 | Projectile physics, collision, sound cues. |
| `assets.md` | 450 | Sprite linkage IDs ↔ extracted PNGs ↔ logical names. |

Every spec section cites the AS source file + line numbers it summarizes.

---

## 2. Test counts (final)

| Layer | Tool | Files | Tests | Pass | Fail |
|---|---|---|---|---|---|
| Unit | vitest 4.1.7 | 6 | **206** | **206** | 0 |
| E2E  | Playwright 1.60 (chromium) | 1 | **7** | **7** | 0 |

### Unit test files (`web/tests/unit/`)
- `Vector2.test.ts` — Vector2 helper port.
- `Snowball.test.ts` — Snowball physics + sound contract per `spec/snowball.md`.
- `Player.test.ts` — RedSnowDudie behaviour (HP, daze, drag clip, throw event).
- `AI.test.ts` — GreenSnowDudie state machine (balling/cocking/throw).
- `levelConfig.test.ts` — Per-level table & mutation-loop quirks.
- `Game.test.ts` — `dolevel`, `frameloop`, `ongameover`, throwball factory.

### E2E scenarios (`web/tests/e2e/game.spec.ts`)
1. Page loads; canvas non-blank within 3 s of asset preload (pixel sample on START button).
2. Title screen visible; network shows `/assets/manifest.json` + `/assets/images/*.png` requests.
3. Click Start → level 1 begins with **3 greens + 3 reds** (`spec/levels.md §3, §4`).
4. Press+hold+release on a red → snowball spawns with **xmov=-20, ymov=-10** (`spec/snowball.md §4`); spawn-y offset −35 (`§3.1`).
5. Hit a green → HP **3→2→1→0 (dead)**; +10 score per hit (`spec/snowball.md §6.4`, `Snowcraft1Rewrite.as:369`).
6. Clear level 1 → level 2 starts with **5 greens** (`spec/levels.md §3`, lines 46-51).
7. All reds dead → `gameoverlose` label + dark+white-text overlay (`spec/levels.md §5`).

No assertions were weakened to make tests pass — only timing guards were
hardened (each pixel-diff scenario polls the canvas for the expected paint
state via `page.waitForFunction` before snapshot, instead of a blind
`waitForTimeout`).

---

## 3. Build status

```
$ npm run build
> tsc && vite build

vite v8.0.14 building client environment for production...
✓ 10 modules transformed.
dist/index.html                 1.17 kB │ gzip: 0.65 kB
dist/assets/index-*.js         17.82 kB │ gzip: 5.83 kB
✓ built in ~150ms
```

`tsc` strict-mode pass: 0 errors. Bundle size: **17.82 kB** raw (5.83 kB
gzip) for the entire game (no third-party runtime deps).

---

## 4. How to run

All commands run from
`/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/web/`.

### One-time setup
```bash
npm install
npx playwright install chromium     # only if the cache is missing
```

### Dev server (hot reload)
```bash
npm run dev
# Open http://localhost:5173/
```

### Production build + preview
```bash
npm run build
npm run preview                       # http://localhost:4173/
```

### Unit tests (vitest)
```bash
npm test                              # one-shot, exits with code
npm run test:watch                    # watch mode
```

### E2E tests (Playwright)
```bash
# `playwright.config.ts` auto-runs `npm run build && npm run preview` on
# port 4173 before launching chromium. No separate server start needed.
npx playwright test
# or
npm run test:e2e
```

### Inspecting from the browser console
The debug hook is exposed only when running `main.ts` (build or dev):
```js
window.__snowcraft.counts()           // {greens, reds, level, gameover}
window.__snowcraft.start()            // dispatches dolevel(1)
window.__snowcraft.lastSnowball()     // last spawned ball + xmov/ymov
window.__snowcraft.spawnAndHit(0)     // hit greens[0] + tick
```

---

## 5. File map

```
approach-4-faithful-port/
├── PORT_RESULT.md                  ← this file
├── PROGRESS.md                     ← phase-by-phase log + tooling notes
├── decompiled/                     ← FFDec dump (scripts, sprites, audio, shapes)
├── spec/                           ← 7 spec docs (4,790 lines, all line-cited)
├── tools/ffdec/                    ← FFDec 26.2.1 install
└── web/
    ├── index.html                  ← canvas mount (592×320, #CCCCCC)
    ├── public/assets/              ← extracted PNGs + transcoded MP3/OGG + manifest.json
    ├── src/
    │   ├── core/                   ← Vector2, Snowball, Player, AI, Game, levelConfig
    │   ├── render/Renderer.ts      ← Canvas2D blit of extracted sprites
    │   ├── audio/Sfx.ts            ← Web Audio + HTMLAudioElement fallback
    │   ├── input/Input.ts          ← mouse/keyboard → Game
    │   └── main.ts                 ← boot, title screen, rAF loop, debug hook
    └── tests/
        ├── unit/                   ← 206 vitest tests across 6 files
        └── e2e/game.spec.ts        ← 7 Playwright scenarios
```

---

## 6. Faithfulness summary

- Every numeric constant in `web/src/core/*.ts` is annotated with its AS
  source file + line number.
- Per-level mutation-loop bugs from the original (level 5 dead-code
  `[4]` block, level 6/7/8/9 `[4].length` iterations) are reproduced
  verbatim in `buildGreenDudieStartingPoints()`.
- Snowball physics are unmodified: red `xmov=-20, ymov=-10`; green
  `xmov=+20, ymov=+10`; red landing plays `splat`, green does not (the
  original asymmetric bug is preserved).
- The hit-box is a 60×60 axis-aligned square at `(dudie._x,
  dudie._y - 20)` — two `Math.abs<30` checks, not a circle.
- Frame rate locked to 20 fps via fixed-step accumulator in `main.ts`.
- All sprites are extracted PNGs blitted via `ctx.drawImage` — zero
  procedural game art.
