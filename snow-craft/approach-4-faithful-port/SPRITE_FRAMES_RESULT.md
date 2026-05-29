# Sprite Frames — Final Result (approach-4-faithful-port)

## Frames cropped

- **Red dudie**: 36 frames in `web/public/assets/sprites/red/`
  (`1.png` … `36.png` + `index.json`).
- **Green dudie**: 98 frames in `web/public/assets/sprites/green/`
  (`1.png` … `98.png` + `index.json`).
- Per-frame metadata (footX, footY, width, height) is recorded in each
  team's `index.json` so the renderer can anchor each sprite to the foot
  point rather than the bitmap top-left.

## Label coverage

### Red (`web/public/assets/sprites/red/index.json` → `labels`)

| Label    | Frame range | Frame count |
|----------|-------------|-------------|
| rest     | 1..1        | 1           |
| ready    | 2..2        | 1           |
| cock     | 3..3        | 1           |
| toss     | 4..4        | 1           |
| hitdazed | 5..6        | 2           |
| dazed    | 7..15       | 9           |
| dead     | 16..23      | 8           |
| walk     | 24..36      | 13          |

Total covered: 36 frames (full atlas).

### Green (`web/public/assets/sprites/green/index.json` → `labels`)

| Label      | Frame range | Frame count |
|------------|-------------|-------------|
| walk       | 1..6        | 6           |
| ready      | 7..7        | 1           |
| balling    | 8..8        | 1           |
| cock       | 9..9        | 1           |
| toss       | 10..10      | 1           |
| hit        | 11..16      | 6           |
| midrecover | 17..32      | 16          |
| down       | 33..57      | 25          |
| dead       | 58..64      | 7           |
| yea        | 65..73      | 9           |
| yealoop    | 74..98      | 25          |

Total covered: 98 frames (full atlas).

Every gameplay state surfaced by the AS source has a corresponding label:
- Red: idle/ready/cock/toss/hitdazed/dazed/dead/walk.
- Green: walk/ready/balling/cock/toss/hit/midrecover/down/dead/yea/yealoop.

## Final test counts

- **Unit (vitest)**: 250 / 250 passed across 10 files.
- **E2E (Playwright, chromium)**: 8 / 8 passed.
  - `tests/e2e/game.spec.ts`: 7 scenarios (canvas-non-blank, title screen
    + asset preload, level-1 enemy counts, mouse-press snowball spawn,
    snowball-hits-green, level-clear, all-reds-dead → game-over).
  - `tests/e2e/visibility.spec.ts`: 1 scenario (full-frame red+green pixel
    histogram **plus** a region-restricted histogram bound on a 480×270
    rect at offset (10, 10) — covers the upper-left green cluster and the
    middle-right red cluster after 80 frameloop ticks).

E2E diagnostic image saved to
`web/test-results/visibility-after-80-ticks.png` for offline inspection.

## How to run the page

```sh
cd web

# Live dev server (vite, port 5173). Click the green START button on the
# canvas overlay to begin level 1.
npm run dev

# Production-style build + preview server (port 4173 by default; 4273 in
# the Playwright webServer config to avoid collisions).
npm run build
npm run preview

# Unit tests (vitest).
npm run test

# E2E tests (Playwright chromium). The webServer config builds + previews
# automatically, so no manual server is required.
npx playwright test
```

After clicking **START** on the title screen the renderer drives both team
atlases through the labels above (red walk/ready/cock/toss/dazed/dead;
green walk/ready/cock/toss/balling/hit/midrecover/down/dead/yea/yealoop).
