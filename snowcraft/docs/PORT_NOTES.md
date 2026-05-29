# Snowcraft Behavior Capture — Ground-Truth Workflow

Goal: drive the original Flash SWF (running under Ruffle WASM) with Playwright,
record screenshots and notes for the five "load-bearing" behaviors that the
faithful port (`snowcraft`) is being measured against, and
cross-cite each observation against the decompiled ActionScript so we have a
single source of truth.

## 8-Phase Workflow

| Phase | What | Output |
|---|---|---|
| 0 | Setup — start `python3 -m http.server 8765` in `approach-3-ruffle/`, install Playwright Chromium if missing, sanity-check `http://127.0.0.1:8765/index.html` returns 200. | `/tmp/snowcraft_server.log`, server running. |
| 1 | Title / start screen — what's drawn before any input. Click canvas centre to dismiss the unmute overlay. | `observations/01_title_*.png`, asCite `Snowcraft1Rewrite.as:232-235`. |
| 2 | AI throw cadence — 30 s of no input. Count snowballs and which dudie threw them. Screenshots at t = 2, 5, 10, 20, 30 s. | `observations/02_cadence_t*.png`, asCite `GreenSnowDudie.as:117-126,148-159`. |
| 3 | Selection circle — does it appear under a red without hover? Cursor away, cursor over, click+hold. | `observations/03_circle_*.png`, asCite `RedSnowDudie.as:23,91-98,99-101`. |
| 4 | Power meter gauge — press+hold a red dudie. Bar/dial visible? Where? Frames at hold = 0 / 250 / 500 / 750 / 1000 ms. | `observations/04_meter_*.png`, asCite `RedSnowDudie.as:108-117`. |
| 5 | Green HP — does a green fall on the FIRST or SECOND hit? | `observations/05_green_hp_*.png`, asCite `GreenSnowDudie.as:43-66`. |
| 6 | Document failures (if Ruffle won't load) in `observations/RUFFLE_BLOCKERS.md`. | RUFFLE_BLOCKERS.md (only if needed). |
| 7 | Compile final findings + cite AS lines for each. Returned to caller as JSON. | StructuredOutput tool call. |

## Driver

`tools/capture_behavior.mjs` — Playwright script that:
1. Launches Chromium, opens `http://127.0.0.1:8765/index.html`.
2. Polls `window.RufflePlayer` and the `<ruffle-player>` element's `metadata`
   for up to 30 s.
3. Takes the canvas centre of the player's bounding rect, dispatches mouse
   events at canvas-relative coordinates.
4. Saves PNG screenshots into `observations/`.

## Update log

- 2026-05-29 phase 0: server started on :8765, Playwright Chromium present in
  `node_modules`.
- 2026-05-29 phase 1: title shows orange "Seasons greetings" text on a snowy
  white background with two cloud-blob foreground shapes. Reds are still walking
  in from off-stage. Confirms `Snowcraft1Rewrite.as:234`
  (`titles.gotoAndPlay("seasonsgreetings")`).
  Screenshots: `observations/01_title_*.png`.
- 2026-05-29 phase 2: greens walk into position for the first ~3-4s with NO
  snowballs in flight. First snowball-in-flight observed at t=6000ms; first
  red taking damage (chunk-11 sprite + hp=1 dazed) by t=12000ms; by t=20s, 2
  of 3 reds are lying dead with hearts. Confirms `GreenSnowDudie.as:148-159`
  (balling cadence `10 + round(rand*50)` then 30+ tick cocking) plus
  `RedSnowDudie.as:74-79` (dazed=40 + birds + hit1 sound on first hit) and
  `RedSnowDudie.as:81-89` (dead on second hit).
  Screenshots: `observations/v2_02_cadence_t*ms.png`,
  `observations/02_cadence_t*ms.png`.
- 2026-05-29 phase 3: cursor-far → no selection circle anywhere. Cursor over
  red at (450,200) → blue elliptical ring appears under the red.
  Press+hold → ring stays + green vertical bar meter appears next to the
  red's head. Cursor moved away after release → ring disappears.
  Confirms `RedSnowDudie.as:23, 91-98, 99-101`.
  Screenshots: `observations/v2_03_circle_*.png`,
  `observations/03_circle_*.png`.
- 2026-05-29 phase 4: power meter is a vertical green-tick bar attached to
  the right side of the held red dudie's head. At t=0ms the bar is short
  (≈1 tick), grows ~1 tick per SWF frame (50ms @ 20fps), reaches ≈12-15
  ticks by t=750-1000ms, then visually saturates. Matches the AS reading
  `this.dudiemc.meter._currentframe / 15` (RedSnowDudie.as:111-114).
  Screenshots: `observations/v2_04_meter_t*.png`,
  `observations/04_meter_t*.png`.
- 2026-05-29 phase 5: dragging a red toward green territory is BLOCKED by
  `checkline(592,0,0,320, x,y, 1)` (RedSnowDudie.as:179-181) — the diagonal
  line from (592,0) to (0,320) clips reds to the back-right half of the
  field. Could not place a red close enough to a green via drag for a
  guaranteed point-blank hit. AS source is authoritative:
  `GreenSnowDudie.as:43-66` shows hp starts at 3, hp 3→2 plays "hit"
  (dazed/justhit, 50-frame freeze, NOT down), hp 2→1 plays "down"
  (the sprite falls), hp 1→0 plays "dead". So a green falls down on the
  **SECOND** hit, not the first. Same conclusion verified during phase 2:
  greens never appear in the "down" pose during the 30-s observation
  window (greens are not being hit at all by AI; reds get killed instead).
  Screenshots: `observations/v2_05_*.png`,
  `observations/v3_05_*.png`,
  `observations/v4_05_*.png`,
  `observations/v5_05_*.png`.
- 2026-05-29 phase 6: Ruffle loaded successfully — no blockers file needed.
  metadata: { width: 592, height: 320, swfVersion: 8 }; status text "SWF
  loaded. Click the canvas to start." unmute overlay was dismissed by the
  initial centre click.
- 2026-05-29 phase 7: final findings compiled and returned via
  StructuredOutput.
- 2026-05-29 ai-throw fix (TDD):
  Defect: `observations/defect_ai-throw.md` — green AI never throws because
  (a) `src/core/factories.ts` dispatch only invoked function-typed
  listeners, dropping the object listener that `Game.dolevel` registers via
  `addEventListener("throwball", this)`; and (b) `src/main.ts` titles
  shim flipped `_visible=true` on `gotoAndPlay("seasonsgreetings"|"levelx")`
  and never cleared it, so branch (G) of `GreenSnowDudie.frameloop`
  (`GreenSnowDudie.as:144`) short-circuited every tick.
  Tests added at `tests/unit/AI.throwIntegration.test.ts` (2 tests):
   1. Bare `tickGreen` over 600 ticks (~30 s @ 20 fps) with `titlesVisible:
      false` on the TickContext — asserts at least 1 throwball event with
      `team:"green"`, `force ∈ [0.3, 0.9]`, `y === ai.y - 15`
      (`GreenSnowDudie.as:163`).
   2. Full Game with `makeRedFactory`/`makeGreenFactory`/`snowballFactory`,
      `titles._visible=false` enforced on the wrapper, ticked 600 times —
      asserts a green-team snowball was spawned.
  Pre-fix: test 2 fails with `TypeError: fn is not a function` from the
  factories dispatch; test 1 already passes because the AI cascade itself
  is correct.
  Fixes applied:
   - `src/core/factories.ts`: `dispatch()` now handles both function
     listeners (`fn(ev)`) and object listeners with a method named after
     the event type (`obj[type](ev)`), matching the AS
     `mx.events.EventDispatcher` semantics already implemented in
     `Game.dispatchEvent` (`Game.ts:527-535`).
   - `src/main.ts`: titles shim now models the SWF DefineSprite_110
     timeline auto-return — `gotoAndPlay("seasonsgreetings")` schedules a
     68-frame countdown (frames 5..73), `gotoAndPlay("levelx")` schedules
     16 frames (149..165), end-of-game labels hold visible. Added
     `titles.tick()` invoked once per `game.frameloop()` so the countdown
     advances deterministically with gameplay.
  All 250 pre-existing unit tests still pass; 2 new tests pass; total 252.
- 2026-05-29 presentation fixes (TDD) — user feedback: "death frame flickers,
  charge gauge looks awkward". Two distinct defects, both confirmed by
  re-playing the port via Playwright MCP:
  1. DEATH FLICKER. `src/main.ts` fed a single MONOTONIC per-dudie tick to
     `frameForState(index, pose, tick)`, which did `first + (tick % length)`.
     Multi-frame one-shot clips (green `dead` 58-64, `down` 33-57; red `dead`
     16-23) therefore re-cycled their whole range every tick = flicker. In the
     SWF these clips `gotoAndPlay` once and settle (the green `dead` frame
     script uses `_currentframe`/GotoFrame2 to hold). Fix:
      - `src/render/Animation.ts`: added `HOLD_LAST_POSES`
        (dead/down/hit/midrecover/yea/hitdazed). For those, `frameForState`
        clamps `first + min(tick, length-1)` instead of wrapping.
      - `src/render/PoseClock.ts` (new): per-dudie animation clock that
        resets to 0 when the pose changes, so a one-shot plays from its first
        frame (a monotonic tick would clamp a fresh corpse straight to the last
        frame and skip the animation). `main.ts` resolves pose + advances the
        clock once per 20 fps game tick (hover/selection stays at render time).
     Verified temporally: dead green frame runs 58→60→62→63→64 then HOLDS 64
     (E2E scenario 8). Was: cycled 58..64,58.. forever.
  2. CHARGE METER. FFDec had exported the red dudie frames from the PARENT
     `DefineSprite_32_reddudie`, which baked its `selectioncircle` (chid 8) and
     `meter` (chid 19) CHILD clips into every red PNG. So every red carried a
     permanent selection ring AND a frozen meter tick that never charged. Fix:
      - Re-extracted clean red body frames: removed chid 8 + chid 19 with
        `ffdec -removeCharacter`, re-exported `DefineSprite_32_reddudie`, and
        re-trimmed to `public/assets/sprites/red/*.png` + `index.json`
        (body now ~40px wide, was ~68px with the ring; bottom-centre anchor
        unchanged). Greens were already clean (no ring/meter in AS).
      - Selection ring now draws hover-only via `selectioncircle.png`
        (was always-on baked). Verified: ring blue pixels rest≈16 vs hover≈56.
      - `src/core/meter.ts` (new): `chargeFrame(heldMs)` / `chargeForce`
        — single source of truth for the 15-frame meter
        (`RedSnowDudie.as:108-117`), shared by the on-release throw force AND a
        new procedural gauge drawn over the held dudie's head in `main.ts`.
     Verified: gauge charges 1→15 over a hold (E2E scenario 9).
  New tests: `Animation.test.ts` (hold-last cases), `PoseClock.test.ts` (4),
  `meter.test.ts` (8), E2E scenarios 8-9. Totals: unit 264/264, E2E 10/10,
  build OK. Screenshots: `observations/_fix-2026-05-29-presentation/`.
- 2026-05-29 round-3 polish (3 user-reported issues) + extended campaign:
  1. AI STEP SOUND too loud/odd. `src/core/factories.ts` hard-coded the
     green tick context's `soundsCurrentFrame: 1`, so EVERY walking green
     played "step" EVERY tick (~5 greens × 20 fps ≈ 100 overlapping/sec). The
     AS gates on the SINGLE shared `_root.sounds._currentframe == 1`
     (all dudies share `this.sounds` — Snowcraft1Rewrite passes it to each),
     so only one footstep plays per ~0.57 s (the step segment length). Fix:
     made `soundsCurrentFrame` a live getter reading the shared Sfx
     `_currentframe`. Verified in-browser: 4 step plays in 2.6 s (was ~150).
  2. SELECTION ELLIPSE too low. `selectioncircle.png` was 63×49 but the
     ellipse only filled the lower band (opaque bbox y 21..48); drawn
     PNG-centred it landed +10 px BELOW the foot. Original ring center ≈ foot
     (measured off the old baked frame: foot y125, ring center 126). Fix:
     trimmed the PNG to its opaque bbox (63×28) so the existing centre-anchor
     lands the ellipse on the foot. Verified: ring center ≈ foot (+4 px).
  3. TRACKPAD DRAG never threw on finger-lift; the throw only fired on the
     NEXT tap. Root cause: mouse events can swallow `mouseup` on a macOS
     trackpad drag (three-finger-drag / Drag Lock). Fix: rewrote
     `src/input/Input.ts` to Pointer Events + `setPointerCapture` +
     `touch-action: none` + a `pointercancel → onRelease` fallback, so a
     release anywhere reliably throws. Verified: single press→hold→release
     throws (red ball, xmov −20) and E2E scenarios 4/9 use real `page.mouse`.
     NOTE: a true OS-level Drag Lock holds the button down regardless of code
     — if it persists for the user it's a macOS accessibility setting, not a
     bug we can fix. (Not reproducible in Playwright.)
  EXTENDED CAMPAIGN (user-requested): original 9 levels kept faithful; added
  5 NEW levels 10..14 (`EXTRA_LEVELS` in `src/core/levelConfig.ts`,
  appended in both `buildLevelConfig` and `Game.buildGreenDudieStartingPoints`).
  Clean readable design (greens march in from just off the left edge to
  on-stage formations in green territory), progressive difficulty: enemy count
  6→7→8→9→10, walkspeed ramp 11→15 (`greenWalkSpeedForLevel`, plus the inline
  override in `Game.dolevel`). Win now triggers at level 14
  (`lev == greendudiestartingpoints.length`, auto). Verified visually at L10.
  New/updated tests: levelConfig (count 14, ramp, off-left spawn, green
  territory), Game (14 levels, L9→L10 advance, win at L14), E2E scenario 10
  (campaign walk-through to the win). Totals: unit 269/269, E2E 11/11,
  build OK. Screenshot: `observations/_fix-2026-05-29-presentation/snowcraft-level10.png`.
