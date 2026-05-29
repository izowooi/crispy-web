# PROGRESS — Faithful sprite-frames port (web)

Timeline of work on the "faithful" approach (`snowcraft`).
Each entry lists the trigger, the change, and the resulting test signal.

## T0 — baseline (entry to this session)

- E2E suite: 7 game scenarios + 1 visibility regression (8 total).
- Unit suite: 250 tests across 10 files (vitest run).
- Sprite atlases extracted into `public/assets/sprites/{red,green}/`:
  - red — 36 frames + `index.json`
  - green — 98 frames + `index.json`
- Atlas labels (red): rest, ready, cock, toss, hitdazed, dazed, dead, walk.
- Atlas labels (green): walk, ready, balling, cock, toss, hit, midrecover,
  down, dead, yea, yealoop.

## T1 — Re-run Playwright suite

- Ran `npx playwright test` against the built bundle (`vite build` →
  `vite preview --port 4273`).
- First parallel run flaked on scenario 4 (mouse press/release): expected
  `ballY=165`, received `155`. Diagnosed as a timing/teardown interaction
  between parallel workers — *not* a real port bug — confirmed by:
  - Running the failing scenario alone → passed.
  - Running the full suite again → all 8 passed.
  - Running the full suite three more times → 8/8 each time.
  No production-code change required for the underlying behaviour.

## T2 — Extra visual assertion in `visibility.spec.ts`

- Captured a diagnostic PNG at *Start + 80 ticks* via
  `page.locator('#game').screenshot({ path: 'test-results/visibility-after-80-ticks.png' })`.
- Inspected the PNG via the Read tool to determine empirical settle zones:
  - greens: upper-left corner (x≈20..160, y≈15..80)
  - reds:   middle-right (x≈260..480, y≈170..240)
- Added a *region-restricted* histogram bound that runs after the existing
  full-frame assertions:
  - Region: `(rx, ry, rw, rh) = (10, 10, 480, 270)` (covers both clusters
    with margin, excludes the rightmost stage edge and bottom band).
  - Asserts `redLikely > 200` ∧ `greenLikely > 200` inside that rect.
  - Same colour predicates as the full-frame check (R-dominant for reds,
    G-dominant for greens) so a regression that *places* characters off
    the playable diagonal still trips the assertion even if the canvas-wide
    pixel counts remain non-zero (e.g. a stray red blitted into the bottom
    margin would not save the assertion).
- Snapshot tooling (`toMatchSnapshot`) was *not* used — the histogram bound
  already pins the regression and avoids the friction of committing a
  baseline PNG to the repo.

## T3 — Verification

- Final E2E run: 8 passed (all 7 game scenarios + visibility regression).
- Final unit run: 250 passed across 10 files.
- Diagnostic PNG saved to `test-results/visibility-after-80-ticks.png` for
  offline review.

## How to reproduce

```sh
cd snowcraft
npm run test       # vitest run — 250 unit tests
npx playwright test  # builds the bundle, serves on :4273, runs 8 scenarios
```

To see the live page: `npm run dev` (vite, port 5173) then click the green
**START** button drawn on the canvas overlay.
