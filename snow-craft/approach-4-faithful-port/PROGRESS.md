# Approach 4: Faithful Port — Progress Log

## Start
- Start time: 2026-05-29
- Goal: Faithful web port of Snowcraft (Flash/SWF) by decompiling original assets and AS bytecode using JPEXS Free Flash Decompiler (FFDec) and reimplementing logic in JS/TS.

## Plan
- Phase 0: Tooling setup (FFDec + ffmpeg). [DONE]
- Phase 1: Decompile SWF — dump tags, export assets (images, shapes, sounds, fonts), export ActionScript (AS2/AS3) sources to disk.
- Phase 2: Inventory assets and AS classes. Build a high-level architecture map (frames, sprites, exported symbols, class hierarchy, entry points).
- Phase 3: Port game loop, state machine, and entities to TypeScript on a Canvas/PixiJS renderer.
- Phase 4: Port asset pipeline — convert ADPCM/MP3 streams to web-friendly formats (mp3/ogg) using ffmpeg; convert shapes to SVG/PNG sprites.
- Phase 5: Wire up input, audio, networking (if any), and parity-test against original behavior in Ruffle.
- Phase 6: Polish, performance pass, and packaging.

## Phase 0 — Tooling setup [DONE 2026-05-29]

### JPEXS Free Flash Decompiler (FFDec) v26.2.1
- `brew install --cask jpexs-decompiler` — NOT AVAILABLE (no such cask).
- `brew install ffdec` — NOT AVAILABLE (no such formula).
- Worked: downloaded official macOS release zip from GitHub.
  - Source: https://github.com/jindrapetrik/jpexs-decompiler/releases/download/version26.2.1/ffdec_26.2.1_macosx.zip
  - Extracted to: `/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/tools/ffdec/`
  - App bundle path: `/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/tools/ffdec/FFDec.app`
  - CLI shell script: `/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/tools/ffdec/FFDec.app/Contents/Resources/ffdec.sh`
  - Convenience symlink: `/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/tools/ffdec-cli`
- Java runtime present: OpenJDK 17 (Zulu17.58+21-CA).

### Verified commands
```
# Help
/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/tools/ffdec-cli -help

# Dump SWF tags
/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/tools/ffdec-cli \
  -dumpSWF /Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-3-ruffle/snowcraft.swf
```
- Output begins with `FileAttributes`, `SetBackgroundColor` (cc cc cc), `Protect` tag, then `DefineShape`/`DefineSprite`/`DefineBitsJPEG3`/`DefineBitsLossless2`/`ExportAssets` (e.g. `selectioncircle`). SWF parses cleanly.

### ffmpeg
- Already installed: `ffmpeg version 7.1.1` at `/opt/homebrew/bin/ffmpeg`.

### Source SWF
- `/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-3-ruffle/snowcraft.swf` (441,752 bytes).

## Phase 4 (asset pipeline) — partial [2026-05-29]

Staged decompiled assets into `web/public/assets/` for the faithful port. Logical
names follow `spec/assets.md` (sound frame labels and sprite linkage IDs).

### Images (`web/public/assets/images/`, 10 files)
Sources copied verbatim where already PNG; JPEG sources transcoded to PNG with
`sips -s format png` (no transparency present to lose).

| Logical name                | swf chid | source                 |
|-----------------------------|----------|------------------------|
| `reddudie_body.png`         | 3        | `decompiled/images/3.png`   |
| `selectioncircle.png`       | 6        | `decompiled/images/6.png`   |
| `reddudie_part_11.png`      | 11       | `decompiled/images/11.png`  |
| `snowball.png`              | 33       | `decompiled/images/33.jpg`  |
| `snowball_impact.png`       | 36       | `decompiled/images/36.jpg`  |
| `snowballshadow_ground.png` | 38       | `decompiled/images/38.png`  |
| `snowball_shadow_41.png`    | 41       | `decompiled/images/41.jpg`  |
| `snowball_shadow_44.png`    | 44       | `decompiled/images/44.jpg`  |
| `greendudie_body.png`       | 49       | `decompiled/images/49.png`  |
| `gamemc_background.png`     | 111      | `decompiled/images/111.jpg` |

### Sounds (`web/public/assets/sounds/`, 13 cues × {mp3, ogg} = 26 files)
Each cid was re-encoded from the decompiled MP3 with ffmpeg:
```
ffmpeg -i <cid>.mp3 -codec:a libmp3lame -qscale:a 2 <name>.mp3
ffmpeg -i <cid>.mp3 -codec:a libvorbis  -qscale:a 5 <name>.ogg
```
Cues (cid → name): 72=step, 73=goodbadugly, 74=throw, 75=longthrow, 76=hit1,
77=kids1, 78=kids2, 79=kids3, 80=laugh, 81=splat, 82=birds, 83=halaluja,
84=laugh2. `decompiled/sounds/-1.wav` (SoundStreamHead2 placeholder, cid −1) is
intentionally NOT shipped.

### Manifest
`web/public/assets/manifest.json` maps every logical name → relative path,
original SWF chid, defining tag, source file, gameplay trigger, and intended
use (citations from `spec/assets.md`).

### Faithful-port discipline
No sounds were synthesized; no images were redrawn. Every staged asset comes
from the FFDec export under `decompiled/`.

## Phase 3 (web scaffold) — DONE 2026-05-29

Scaffolded the TypeScript web project at `web/` using Vite (`vanilla-ts`
template, non-interactive with `--overwrite --no-interactive`). Note: the
`--overwrite` flag wiped the previously staged `web/public/assets/` tree, so
the asset pipeline from Phase 4 was re-run in place — all 10 PNGs and 13
sound cues × {mp3, ogg} are restored from `decompiled/`, and
`web/public/assets/manifest.json` was rewritten verbatim from `spec/assets.md`
(no synthesized audio, no redrawn images, faithful-port discipline preserved).

### Toolchain installed (web/package.json)
- vite 8.0 + typescript 6.0 (vanilla-ts template, edited scripts).
- vitest 4 + jsdom 29 — unit tests via `npm run test`.
- @playwright/test 1.x + chromium browser (`npx playwright install chromium`)
  — e2e via `npm run test:e2e` against `vite preview` on :4173.
- @types/node for config typing.

### Configs
- `web/vite.config.ts`     — dev :5173, preview :4173.
- `web/vitest.config.ts`   — `environment: 'jsdom'`, picks up
  `tests/unit/**/*.{test,spec}.ts` and `src/**/*.{test,spec}.ts`.
- `web/playwright.config.ts` — chromium project, `webServer` runs
  `npm run build && npm run preview -- --port 4173 --strictPort`.
- `web/tsconfig.json`      — kept the vite-default strict bundler config.

### Folder layout
```
web/
  index.html                <canvas id="game"></canvas>
  src/
    main.ts                 minimal canvas bootstrap (real boot in Phase 5)
    core/Vector2.ts         placeholder
    core/Player.ts          placeholder (RedSnowDudie / GreenSnowDudie base)
    core/Snowball.ts        placeholder (SnowBall.as port)
    core/AI.ts              placeholder (GreenSnowDudie.frameloop)
    core/levelConfig.ts     placeholder (greendudiestartingpoints[0..8])
    core/Game.ts            placeholder (Snowcraft1Rewrite.frameloop)
    render/Renderer.ts      placeholder (loads PNGs from /assets/images/)
    audio/Sfx.ts            placeholder (loads MP3/OGG from /assets/sounds/)
    input/Input.ts          placeholder (mouse + keyboard)
  tests/unit/.gitkeep
  tests/e2e/.gitkeep
  public/assets/            (re-staged Phase 4 output)
    images/*.png            10 sprites
    sounds/*.{mp3,ogg}      13 cues × 2 codecs = 26 files
    manifest.json           logical name → path/chid/source/trigger/use
```

### npm scripts (web/package.json)
- `dev`        → vite
- `build`      → tsc && vite build (verified green; 5 modules, 0.85 kB JS)
- `preview`    → vite preview
- `test`       → vitest run
- `test:watch` → vitest
- `test:e2e`   → playwright test

## Phase 5 — Vector2 module [DONE 2026-05-29]

Port-introduced 2D math helper. The original AS2 source has **no** `Vector2`
class; gameplay code uses raw MovieClip `_x`/`_y` and parallel locals
(`xmov`/`ymov`, `walkxmov`/`walkymov`, `walkendx`/`walkendy`). This helper
consolidates those pair-arithmetic patterns into a single TypeScript type
while preserving the *exact* arithmetic from the decompiled AS.

### Tests
- `web/tests/unit/Vector2.test.ts`
- 23 tests, **23 passed / 0 failed** via
  `npx vitest run tests/unit/Vector2.test.ts`.
- Each operation cites the AS source it mirrors:
  - construction `(x, y)`, `zero()`, `clone()`, `equals()`
  - `add` / `addInPlace` ← `SnowBall.as:130-131`
    (`ballmc._x += xmov; ballmc._y += ymov`)
  - `sub` / `subInPlace` ← `RedSnowDudie.as:160-162`
    (`walkendx - dudiemc._x`, `walkendy - dudiemc._y`)
  - `scale` / `scaleInPlace` ← `SnowBall.as:99` (`force *= 0.85` shape)
  - `length`, `lengthSquared`, `distanceTo` ← `RedSnowDudie.as:160` hypot
  - `normalize` (with safe (0,0) handling) ← walk-unit-vector × walkspeed
    pattern from `RedSnowDudie.as:160-162`
  - `withinAabb(center, 30, 30)` ← `Snowcraft1Rewrite.as:366,376`
    strict-`<` 60×60 hitbox (two independent abs-checks form a square)
  - `withinChebyshev(2999)` ← `Snowcraft1Rewrite.as:384` off-stage cull
    (inclusive boundary because the AS reaper uses strict `>`)

### Implementation
- `web/src/core/Vector2.ts` — pure TS class with mutable `x`/`y`. Both
  destructive (`*InPlace`) and non-destructive variants are provided so the
  caller can match the AS in-place mutation style or take snapshots when
  needed.

## Phase 5 — Snowball module [DONE 2026-05-29]

TDD-ported `class com.iconnicholson.onehammer.SnowBall` to TypeScript.

### Sources of truth
- `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as`
  (135 lines). Every behavior in `web/src/core/Snowball.ts` cites the AS line
  it ports. Spec: `spec/snowball.md`.

### Tests
- `web/tests/unit/Snowball.test.ts`
- 27 tests, **27 passed / 0 failed** via
  `npx vitest run tests/unit/Snowball.test.ts`.
- Coverage: constructor (originalx/y, ground placement, defaults,
  ineffective truthy-only assignment, red/green initial velocity,
  longthrow/throw spawn sound), `destroy()`, `frameloop()` early return when
  dead, all four red branches (ineffective on `ymov > -3`, landing snap on
  `-2 < ymov < 50` with splat sound, post-land tick + dead at `ymov > 100`,
  signed drop predicate with `ymov += 3-force` and `force *= 0.85`,
  `force == 1` never drops), all four green branches (ineffective on
  `ymov > 17`, landing snap on `18 < ymov < 50` with **no splat sound**,
  post-land tick + dead at `ymov > 100`, abs-based drop predicate with
  `ymov += 2-force` and `force *= 0.85`, `force >= 1` never drops), and the
  ineffective-then-landing order of operations on both teams.

### Implementation
- `web/src/core/Snowball.ts` — pure TS class, no DOM/canvas dependency.
  `ballmc` and `shadowmc` are abstract `MovieClipLike` shims with
  `gotoAndPlay`/`removeMovieClip` so the renderer can later subclass or
  adapt them. `sounds` is a `SoundsLike` interface (`gotoAndPlay(label)`)
  matching the original `_root.sounds` jukebox MovieClip. No `_root.shadowiter`
  / `_root.comiter` integration yet — that lives in `Game.ts`
  (Snowcraft1Rewrite) once the game loop is ported.

## Phase 5 — Player module [DONE 2026-05-29]

TDD-ported the player class — `class com.iconnicholson.onehammer.RedSnowDudie`
plus the inherited `class com.iconnicholson.onehammer.ASnowDudie` movement /
line-clipping core — to TypeScript.

### Sources of truth
- `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/RedSnowDudie.as`
  (185 lines, player-specific: hp/dazed/throwball/drag).
- `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/ASnowDudie.as`
  (73 lines, base class: walkspeed/walking/checkline/setters).
- Spec: `spec/player.md` §3, §6, §8, §9, §10.

### Tests
- `web/tests/unit/Player.test.ts`
- **30 tests, 30 passed / 0 failed** via
  `npx vitest run tests/unit/Player.test.ts`.
- Coverage (each test cites the AS line it pins):
  - `checkline` clipping in both `less=true` and `less=false` modes
    (ASnowDudie.as:47-67), verified against the player drag line
    `(592,0)-(0,320)` and the green destination line `(610,0)-(0,340)`.
  - Initial state — hp=2 (RedSnowDudie.as:13), team="red" (:28),
    dazed=0/dead=false/walking=false (:14 + ASnowDudie.as:8-10),
    drag flags false (:15-16), walkspeed=5 (ASnowDudie.as:11).
  - Walking math — unit-velocity × walkspeed (RedSnowDudie.as:156-163),
    per-tick movement (:146-147), arrival at <10px on each axis (:138-142),
    `setwalkspeed` setter (ASnowDudie.as:26-29).
  - Damage — hp 2→1 sets dazed=40 + dudiemcDazed=true (:71-79), hp 1→0
    sets dead=true (:81-89), drag flags clear on hit (:68-70).
  - Dazed cooldown — decrements per frameloop, clears flag at 0
    (:165-172); frameloop short-circuits when dead (:132-134).
  - Drag — teleports to mouse + clips by `checkline(592,0,0,320,…,1)`
    when both `dragdudie && adobesucksmouseisdownflag` (:175-182).
  - Mouse handlers — `onchosen` sets flags + dispatches `chosen` event
    and is gated on dazed/dead/walking (:49-65); `mouserelease` always
    clears flags but only throws when not gated (:119-129).
  - Throw force formula — `force = meterFrame/15` if `meterFrame > 4`
    else `0.001` (:110-114); ineffective when `force < 0.1` (:116);
    ball spawns at `(x, y-35)` team="red" (:116).
  - `setposition`/`setwalkendx`/`setwalkendy` setters
    (ASnowDudie.as:18-25, :42-46).

### Implementation
- `web/src/core/Player.ts` — `Player` class plus standalone `checkline`
  function (re-exported as an instance method on `Player` to mirror the AS
  `this.checkline(...)` API). Pure TS, no DOM/canvas dependency. Flash
  MovieClip plumbing (depth swap, `attachMovie`, `gotoAndPlay`) is *not*
  modeled; instead the port exposes the same logical fields the renderer
  / event consumer needs (`dudiemcDazed`, `meterFrame`,
  `addEventListener("chosen"|"throwball")`). The `frameloop()` method
  optionally takes `{ mouseX, mouseY }` as a stand-in for the original
  `stage._xmouse`/`stage._ymouse` reads (RedSnowDudie.as:177-178).

## Phase 5 — levelConfig module [DONE 2026-05-29]

TDD-ported `Snowcraft1Rewrite.greendudiestartingpoints[0..8]` plus the
immediately-related per-class engine constants needed by the game loop.

### Sources of truth
- `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as`
  (lines 13-18 red starts, 42-210 spawn-table builder, 264-282 walkspeed
  override, 309-316 last-level test, 366-376 hit-test, 384 cull bound,
  416-419 time bonus).
- `RedSnowDudie.as:13` (HP=2), `GreenSnowDudie.as:15` (HP=3),
  `SnowBall.as:45-46, 50-51` (initial ball velocities),
  `ASnowDudie.as:11` (default walkspeed=5).
- Spec: `spec/levels.md` §1, §2, §3, §4, §9.

### Tests
- `web/tests/unit/levelConfig.test.ts`
- **30 tests, 30 passed / 0 failed** via
  `npx vitest run tests/unit/levelConfig.test.ts`.
- Coverage:
  - Engine constants — fps=20, world cull=2999, hit-test radius/yoff,
    +10 score per green, 1.8e6 ms time-bonus window.
  - Per-team — red HP=2, green HP=3, red ball xmov/ymov=(-20,-10),
    green ball xmov/ymov=(20,10).
  - Red team starts (×3, fixed every level) and red placement offset
    (start+200, start+100).
  - `greenWalkSpeedForLevel` — defaults 5; lvl 5/7/8/9 → 10; lvl 6 → 15.
  - `isLastLevel` / total levels = 9.
  - Levels 1-4 verbatim verbatim hand-authored tables.
  - Levels 5-8 with their respective post-mutation arithmetic, computed
    by the same operations the AS source executes (so byte-equivalent).
  - Level 9 with deterministic RNG injection (`rng()=0.5` and `rng()=0`
    both checked); first 12 entries mutated, entries 12-49 retain raw
    `[-50, 100, 50+rand*200, 50+rand*200]` values.
  - "Seed once at game start" — re-running `buildLevelConfig` with the
    same RNG yields identical level-9 tables.
  - Returned arrays are independent across calls (no shared state).

### Implementation
- `web/src/core/levelConfig.ts` — exports the engine constants and a
  pure `buildLevelConfig(rng?)` builder. The mutation loops are ported
  verbatim from the AS source (e.g. lvl 6/7/8 use `t[4].length` as their
  loop bound, exactly as in the source). `rng` defaults to `Math.random`.
- TypeScript compiles clean (`npx tsc --noEmit`).

### Faithfulness notes
- Spec §3 mis-describes the level-5 mutation as a no-op; the AS source
  in fact applies `[0]=[2]-400, [1]=[3]-200` to the live (post-line-83)
  array. Spec §9 confirms this and lists the expected post-mutation
  values, with a couple of arithmetic typos (e.g. `-330,-120` vs the
  correct `-330,-160`). The implementation derives values directly from
  the AS arithmetic and the tests assert the AS-derived values.
- Levels 6/7/8 mutation loops use `greendudiestartingpoints[4].length`
  (= 12) as their bound — a quirk of the original code preserved here.
- The lvl-7 spec table in §9 uses `[2]` as `[0]` (since `[0]=[2]` in the
  i<6 branches). Implementation matches the AS source verbatim.

## Phase 5 — AI module [DONE 2026-05-29]

TDD-ported `class com.iconnicholson.onehammer.GreenSnowDudie.frameloop` (the
CPU enemy state machine) plus the `randomdestinationwithinboundaries` and
`yougothit` helpers, including the inherited `ASnowDudie.checkline`
boundary-clip primitive.

### Sources of truth
- `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as`
  (167 lines).
- `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/ASnowDudie.as`
  (73 lines, base class — `checkline`, `walkspeed`).
- Spec: `spec/ai.md` §3 (decision cascade), §4 (cadence), §5 (no aim model),
  §7 (movement), §9 (damage), §12 (constants).

### Tests
- `web/tests/unit/AI.test.ts`
- **53 tests, 53 passed / 0 failed** via
  `npx vitest run tests/unit/AI.test.ts`.
- Coverage:
  - Constants block — HP=3, just-hit=50, walkspeed defaults (5/3),
    arrival=10, throw-y-offset=-15, ball velocities (±20, ±10),
    boundary line `(610,0)→(0,340)` w/ less=0.
  - `createGreenAI` initial state — all flags + counters at AS defaults.
  - Branch (A) dead — full short-circuit.
  - Branch (B) `dudiemc.down` — short-circuit while down.
  - Branch (C) `justhit` — `adobefrozenframebugfix` decrement, clears at <0,
    no movement / no throw while staggered.
  - Branch (D) walking — per-tick translation, arrival `<10` on each axis,
    title-march `walkspeed=3` carve-out, "step" sound gating on
    `sounds._currentframe == 1`.
  - Branch (E) cocking — decrement, throw fires *exactly* at `cocking==10`,
    pose changes to "toss", 10-frame follow-through after release.
  - Branch (F) random walk — 2.5%/frame dice (`> 0.975`), `walkendx`
    short-circuit overrides dice, `randomdestinationwithinboundaries` clips
    to boundary line.
  - Branch (G) titles — blocks balling/cocking but NOT branch-F walk roll.
  - Branch (H) balling countdown → cocking — `15 + round(rand*30)` ∈ [15..45].
  - Branch (I) start balling — `10 + round(rand*50)` ∈ [10..60].
  - `yougothit` — 3→2 sets justhit + 50f freeze, 2→1 sets down,
    1→0 sets dead + plays `kids[1..3]` from `Math.ceil(rand*3)`.
  - `greenStartWalk` — unit step magnitude == `walkspeed` for any walkspeed.
  - `randomDestinationWithinBoundaries` — RNG order is x then y; clip
    matches AS line math.
  - `checkline` — both `less=0` and `less=1` clipping branches.
  - `greenThrowForce` — endpoints (rand=0 → 0.3, rand=1 → 0.9, rand=0.5 → 0.6).
  - End-to-end cadence — minimum 16-frame path from spawn to first throw with
    all-zero RNG matches the spec §4 derivation.
  - Determinism — two AIs with the same RNG sequence produce identical
    pose/throw/sound traces.
  - Just-hit blocks throw cadence for the full 50-frame stagger.

### Implementation
- `web/src/core/AI.ts` — exports `createGreenAI`, `tickGreen`, `greenYouGotHit`,
  helpers (`greenStartWalk`, `randomDestinationWithinBoundaries`, `checkline`,
  `greenThrowForce`) and constants. Pure TS, no DOM/canvas dependency.
- The original AS reads `dudiemc._x/_y`/`dudiemc.justhit`/`dudiemc.down` from
  the timeline; in the port these are inlined onto the `GreenAI` struct.
  Per-tick transient inputs (`titlesVisible`, `soundsCurrentFrame`) and side
  effects (`onPose`/`onPlaySound`/`onThrow`) are passed via `TickContext` so
  callers can plug in the renderer/sfx/spawner. The `rand: () => number`
  callback enables fully deterministic replay.
- `npx tsc --noEmit` passes clean.

### Faithfulness notes
- Branch (F) consumes one `rand()` for the dice roll *unconditionally* —
  matches AS short-circuit-OR semantics (`Math.random() > 0.975 || walkendx`
  evaluates LHS first, so the `Math.random()` call is always made).
- The `cocking==10` release fires the throwball event *and* changes pose to
  "toss" on the same tick; the next 10 ticks decrement the timer with no
  further throw, matching AS:117-126.
- `yougothit` resets `walking`, `cocking`, `balling`, `justhit`, `down` BEFORE
  decrementing HP — order matters because the 3→2 branch then re-arms
  `justhit=true` (AS:39-50).

## Phase 5 — Game module [DONE 2026-05-29]

TDD-ported the top-level controller — `class
com.iconnicholson.onehammer.Snowcraft1Rewrite` (extends
`com.iconnicholson.onehammer.AGame`) — to TypeScript.

### Sources of truth
- `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as`
  (451 lines).
- `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/AGame.as`
  (32 lines, parent class — heartbeat / EventDispatcher mixin).
- `decompiled/scripts/scripts/frame_5/DoAction.as`
  (entry point — `_root.game = new Snowcraft1Rewrite(...)` + `dolevel(1)`).
- Spec: `spec/main.md` §3-§10.

### Tests
- `web/tests/unit/Game.test.ts`
- **43 tests, 43 passed / 0 failed** via
  `npx vitest run tests/unit/Game.test.ts`.
- Coverage (each test cites the AS line it pins):
  - Level table builder — 9 levels (Snowcraft1Rewrite.as:309-311), per-level
    counts {1:3, 2:5, 3:7, 4:9, 5:12, 6:12, 7:12, 8:12, 9:50}, the verbatim
    `[4]` overwrite anomaly (:83-95), level 5 `(walkX-400, walkY-200)` shift
    (:96-102), level 6 split spawn (:116-130), level 7 three-way split
    (:144-163), level 8 `[i+6][2]+150 / [i+6][3]-150` mirror + shift
    (:178-188), level 9 bonus round 50-entry build with first-12-only
    post-process (:189-210).
  - Constructor — paused=true (AGame.as:4), gameover=false / score=0 /
    slomo=0 (Snowcraft1Rewrite.as:12, 19-20), reddudieN start anchors
    (:13-18), empty `adudies` / `snowballs` (:28-29).
  - `reset()` — Snowcraft1Rewrite.as:444-450 (starttime, _visible=false,
    gameover=false, score=0).
  - `dolevel(n)` — `clearbetweenlevels` (:230, :434-443), level 1 plays
    `seasonsgreetings` / level >1 plays `levelx` and writes `titles.lev`
    (:232-240), 3 reds at fixed anchors offset by (+200, +100) (:242-259),
    per-level walkspeed overrides on greens — 5 default (ASnowDudie.as:11),
    10 for level 5 / >6 (:273-276), 15 for level 6 (:277-280).
  - `throwball(eventObject)` — spawns a SnowBall with team/force/x/y/
    ineffective (:284-288).
  - `frameloop()` hit detection — red→green AABB(30) on `(d.x, d.y-20)`
    awards score+=10 + decrements green hp + kills ball (:366-371);
    green→red AABB hit decrements red hp + kills ball, no score (:373-380);
    `ineffective` and `down` flags gate hits (:366); off-stage cull
    `|x|>2999 || |y|>2999` (:384); `dead` snowballs are spliced (:402-408).
  - Win check — all greens dead && lev<9 → `dolevel(lev+1)` (:307-316);
    all greens dead && lev==9 → `ongameover(true)` (:309-311).
  - Lose check — all reds dead → greens get `gameover()` taunt + `ongameover(false)`
    (:334-353).
  - `ongameover(win)` — time bonus only when win && elapsed<1.8e6 ms,
    bonus = round((1.8e6 - elapsed)/1000) (:410-420); plays `gameoverwin` /
    `gameoverlose` on titles (:423-430); writes `titles.score` (:422); fires
    `gameover` event via EventDispatcher mixin (AGame.as:11-15, :431-432).
  - Keyboard — Shift (16) toggles `shiftdown`, others ignored (:214-227).
  - Phase getter — `title` before dolevel(); `playing` after dolevel(N);
    `game-over` after ongameover(); transitions through `level-clear`/`next`
    when frameloop advances levels (porting harness — not in AS source).

### Implementation
- `web/src/core/Game.ts` — pure TS class. Stage / titles / sounds are kept
  as opaque collaborator objects (any shape that exposes `gotoAndPlay` /
  `_visible` / `score` / `lev` works), matching the AS code's MovieClip
  duck-typing. The class injects light internal `Red/Green/SnowBall` shims
  by default (just enough surface — `dudiemc._x/_y`, `hitpoints`, `dead`,
  `down`, `team`, `setposition`, `setwalk*`, `yougothit`, `gameover`,
  `frameloop`, `destroy` — for `frameloop()` to hit-test and tick). Real
  ports of `Player.ts` / `AI.ts` / `Snowball.ts` can be plugged via the
  `factories` constructor option without touching `Game.ts`.
- The state machine `phase` getter (`title` → `playing` → `level-clear` →
  `next` → `game-over`) is a thin derived view; the AS source has no
  explicit phase enum, only a boolean `gameover` and an integer `lev`.
- EventDispatcher mixin is implemented in-line (no `mx.events` polyfill);
  matches AS semantics — listener can be a function or an object exposing
  a method named after the event type.
- Heartbeat — if a `floop` clip is supplied, its `onEnterFrame` is bound
  to `() => this.frameloop()` (AGame.as:7); otherwise the harness drives
  ticks manually. Tests use the manual mode.

### Faithfulness notes
- The level-5 `[4]` overwrite anomaly (Snowcraft1Rewrite.as:83-95) is
  reproduced verbatim — only the second block survives, then the
  transform loop runs.
- Levels 6/7/8/9 mutation loops use `greendudiestartingpoints[4].length`
  (= 12) as their bound, a quirk of the original code preserved here. For
  level 9 (50 entries), only the first 12 are post-processed.
- The all-reds-dead lose check is guarded by a "any red present" predicate,
  because `clearbetweenlevels` runs before reds are pushed and an empty
  `adudies` would otherwise trip the lose path. The AS source happens to
  always have reds because `dolevel` pushes them before yielding control.

## Phase 5 — Renderer / Sfx / Input + boot integration [DONE 2026-05-29]

Wired the three non-`core/` adapters and the `main.ts` boot loop so the
faithful port runs end-to-end as a static page.

### Renderer (`web/src/render/Renderer.ts`)
- `Renderer.create(canvas, baseUrl?)` fetches `/assets/manifest.json`,
  preloads every PNG via `new Image()` + `img.decode()`-equivalent
  onload promises, and returns a ready-to-draw instance.
- Stage is locked at **592 × 320** — exposed as
  `Renderer.STAGE_WIDTH / STAGE_HEIGHT` (spec/main.md §2: SWF FrameSize
  rect → 11840/20 × 6400/20 twips). `imageSmoothingEnabled = false`
  preserves pixel-art crispness.
- `drawBackground()` blits the `gamemc_background` PNG (full-stage) at
  (0,0).
- `drawDudie({team,x,y,selected,dazed,dead})` blits the red/green body
  PNG with bottom-centre anchor (matches AS dudie sprite registration
  point), optionally compositing the `selectioncircle` ring under a
  hovered red dudie and the `reddudie_part_11` chunk above a dazed one.
- `drawSnowball({ballX,ballY,shadowX,shadowY,visible})` blits the
  `snowball` PNG over the `snowballshadow_ground` PNG with each sprite
  centred on its world-space coordinates.
- **Discipline:** every draw is `ctx.drawImage(<HTMLImageElement>, …)`.
  Zero geometric primitives, zero canvas paths used as stand-ins.

### Sfx (`web/src/audio/Sfx.ts`)
- `Sfx.create(baseUrl?)` chooses Web Audio first, falling back to
  HTMLAudioElement when `AudioContext` is unavailable or decode fails.
- Web Audio path: `fetch` → `arrayBuffer` → `decodeAudioData`, then per
  cue plays a fresh `AudioBufferSourceNode` so overlapping voices work
  (e.g. random `kids[1..3]` knockout SFX).
- HTMLAudio fallback: one `<audio>` per cue, replay via
  `currentTime = 0; play()`.
- `_currentframe` getter returns 1 when idle / 2 when a cue is currently
  playing — matches the AS:110 step-sound gate
  (`if (sounds._currentframe == 1) gotoAndPlay("step")`).
- **Discipline:** **no oscillator synthesis**, no procedural tones. All
  cues come from the FFDec-extracted MP3 streams already staged at
  `web/public/assets/sounds/`.

### Input (`web/src/input/Input.ts`)
- Binds `mousedown / mousemove / mouseup / mouseleave / contextmenu` on
  the canvas (window-level `mouseup` so a release outside the canvas
  still clears drag — matches Flash `onRelease` semantics).
- Binds `keydown / keyup` on `document` to mirror Flash's global
  `Key.addListener` (Snowcraft1Rewrite.as:32-40).
- Reports keys as both `keyCode` (for AS-parity Shift = 16) and `key`
  (for the cheat-sequence path described in spec/player.md §5.2).
- `state` getter exposes `{ mouseX, mouseY, pressed, shiftDown }` for
  per-tick polling; `dispose()` tears down all listeners.
- The module owns no gameplay state — hit-testing red dudies vs. cursor
  position is the consumer's responsibility (see `main.ts`).

### Boot (`web/src/main.ts`)
1. Resolves `<canvas id="game">`, sets it to 592 × 320.
2. Awaits `Promise.all([Renderer.create(canvas), Sfx.create()])`.
3. Constructs `new Game({ stage, titles, sounds: sfx })` and calls
   `game.dolevel(1)` — entry point matches frame_5/DoAction.as:11.
4. Drives `game.frameloop()` from a `requestAnimationFrame` loop with a
   fixed-step accumulator at **20 fps** (`1000 / GAME_FPS = 50 ms`).
   Catch-up is capped at 1 s of accumulated dt to avoid spiral-of-death
   after a backgrounded tab.
5. After each tick the `draw()` step paints background → snowballs →
   dudies (in `adudies` order, so last-clicked red renders above the
   others — mirrors AS depth-swap-on-chosen).
6. `Input` is wired with a press → drag → release flow on red dudies
   that calls `Game.throwball({ team:'red', force, x, y-35, … })` on
   release (RedSnowDudie.as:117 spawn-y = -35), and forwards keyboard
   events to `Game.keydown / keyup` (Shift toggles `shiftdown`).

### Verification (2026-05-29)
- `npm run build` → green: `tsc` + `vite build`, 10 modules, 15.26 kB JS.
- `npx vitest run` → **6 files, 206 tests, 0 failures** (Vector2 23 +
  Snowball 27 + Player 30 + levelConfig 30 + AI 53 + Game 43).
- `npm run preview` + `curl http://localhost:4173/` → **HTTP 200**,
  1.17 kB index.html served correctly.
- `web/index.html` updated to lock canvas to 592 × 320 with
  `image-rendering: pixelated` and the SWF `#CCCCCC` background.

### Faithfulness notes
- Spawn-y offsets mirror the AS source: red `(x, y-35)`
  (`RedSnowDudie.as:117`); green `(x, y-15)` (`GreenSnowDudie.as:163`).
- Drag teleport writes both `dudie.x/y` and `dudiemc._x/_y` so
  Game.frameloop hit-detection (which reads `dudiemc._x/_y`) matches the
  rendered position.
- The `force = 0.5` constant in `onRelease` is a stand-in for the meter
  sample (`RedSnowDudie.as:110-114`) until the full `Player` port is
  plugged into Game via the `factories` constructor option. The throw
  spawn, sound dispatch, and physics are all handled by the already-
  ported `Game` / `Snowball` modules.

## Next
- Plug the full `Player.ts` / `AI.ts` / `Snowball.ts` ports into
  `Game.ts` via the `factories: { red, green, snowball }` constructor
  option, replacing the lightweight in-Game shims.
- Surface a real meter sprite + frame counter so `RedSnowDudie.throwball`
  can sample force from the meter clip (RedSnowDudie.as:110-114) instead
  of approximating with hold duration.

## Phase 5 — Playwright E2E parity tests [DONE 2026-05-29]

### Debug hook (`window.__snowcraft`)
Added a non-production debug surface in `web/src/main.ts` (only attached
during boot; never read by gameplay code) so Playwright can drive
deterministic flows without poking private internals:

| Hook | Purpose |
|---|---|
| `isReady` | Sentinel set after asset preload completes. |
| `isStarted()` / `start()` | Programmatic Start-button click. |
| `titleScreen()` | Title overlay state + START button rect. |
| `counts()` | Live `{greens, reds, level, gameover}`. |
| `lastSnowball()` | Last-spawned ball (team, position, **xmov/ymov**). |
| `hitGreen(i)` / `killAllGreens()` | Drive `yougothit()` directly. |
| `killAllReds()` | Drive lose path. |
| `tick()` | Advance `Game.frameloop()` by one frame. |
| `throwSnowball(team, force, x, y)` | Spawn a ball directly. |
| `spawnAndHit(i)` | Spawn-on-target + tick → asserts hit predicate. |

Game.ts was updated to expose `xmov` / `ymov` on the default snowball
factory (per `SnowBall.as:43-52`: red = (-20,-10), green = (20,10)) so
the velocity can be inspected from a unit-test perspective.

### Title / start screen
`main.ts` no longer auto-runs `dolevel(1)`. Boot now paints a
"seasonsgreetings"-labelled title overlay (mirrors
`Snowcraft1Rewrite.as:232-235`) with a Start button; gameplay only
begins after the user clicks it. `Game.dolevel(1)` itself is unchanged.

### Tests (`web/tests/e2e/game.spec.ts`)
Seven scenarios, each cited against `spec/*.md`:

1. Canvas is non-blank within 3 s of preload (pixel sample on START button).
2. Title screen visible; network shows `/assets/manifest.json` + `/assets/images/*.png` requests.
3. Click Start → level 1 has **3 greens + 3 reds** (`spec/levels.md §3,§4`).
4. Mouse press+hold+release on red → snowball with `xmov=-20, ymov=-10` (`spec/snowball.md §4`); spawn-y offset −35 (`§3.1`).
5. Hit a green → HP 3→2 (+10 score), 2→1, 1→0 dead (`spec/snowball.md §6.4`).
6. Clear level 1 → level 2 has **5 greens** (`spec/levels.md §3` line 46-51).
7. All reds dead → `gameoverlose` label + dark+white-text overlay (`spec/levels.md §5`).

### Final test counts
- **Unit (vitest):** 206 / 206 passed across 6 files (`Vector2`, `Snowball`, `Player`, `AI`, `levelConfig`, `Game`).
- **E2E (Playwright):** **7 / 7 passed** on chromium (`npx playwright test`).
- **Build:** `tsc && vite build` clean (17.82 kB JS / 5.83 kB gzip).

No assertions were weakened to make tests pass — only timing guards were
hardened (poll the canvas for the expected paint state before asserting,
rather than blind `waitForTimeout`).

## Phase 5 — Sprite frame inventory [DONE 2026-05-29]

Inventoried every per-frame PNG exported by FFDec for the two character
sprites. The PNGs are decoded onto a fixed canvas the size of the source
sprite's bounds; almost every pixel on that canvas is fully transparent,
so a per-frame **alpha-trim bbox** is needed before we can crop and
foot-anchor each frame for the renderer.

### Method
- ImageMagick is not installed and `brew` is unavailable on this machine.
  Fell back to Pillow per the task instructions:
  `python3 -m pip install --user Pillow` (Pillow 12.2.0).
- For each PNG: load via `PIL.Image.open`, take the alpha channel, call
  `alpha.getbbox()` (returns `(left, upper, right, lower)` of the
  smallest rectangle enclosing all non-zero alpha pixels — exactly what
  `magick … -trim` would have produced).
- Builder script: `/tmp/build_inventory.py` (one-shot, not committed —
  the JSON output is the artefact).

### Results
- `red` (`decompiled/sprites/DefineSprite_32_reddudie/`) — **36 frames**,
  every frame on an 811 × 770 canvas. Trim bboxes range:
  - `x` ∈ [358, 371], `y` ∈ [90, 117]
  - `w` ∈ [44, 97], `h` ∈ [32, 57]
- `green` (`decompiled/sprites/DefineSprite_69_greendudie/`) —
  **98 frames**, every frame on an 814 × 331 canvas. Trim bboxes range:
  - `x` ∈ [347, 394], `y` ∈ [142, 151]
  - `w` ∈ [41, 69], `h` ∈ [35, 46]
- No fully-transparent frames in either set.

### Output
`approach-4-faithful-port/sprite_inventory.json` —
```
{
  "red":   [ { "frame": N, "size": [W,H], "trim": {"x":...,"y":...,"w":...,"h":...} }, ... ],
  "green": [ ... ]
}
```
Frames are sorted by numeric index (1..36 for red, 1..98 for green) so a
consumer can index by `frames[i-1]`. This file is the input for the next
step (per-frame cropping + foot-anchor calculation).

## Phase 4 (asset pipeline) — per-frame crop + index [2026-05-29]

### Tooling
- `magick` / ImageMagick was not available on this machine (`brew` not in
  PATH for non-interactive shells); rather than blocking on an install we
  used Python + Pillow 12.2.0 (already present at
  `/Library/Frameworks/Python.framework/Versions/3.11`).
- Cropper script: `tools/crop_sprites.py` (committed; reproducible).

### Outputs
- `web/public/assets/sprites/red/<frame>.png` — 36 cropped PNGs (RGBA).
- `web/public/assets/sprites/green/<frame>.png` — 98 cropped PNGs (RGBA).
- `web/public/assets/sprites/red/index.json` and `.../green/index.json`:
  ```json
  {
    "frames": [
      { "frame": 1, "path": "sprites/red/1.png", "footX": 47.5, "footY": 671, "w": 68, "h": 48 }
    ],
    "labels": { "rest": { "first": 1, "last": 1 }, ... }
  }
  ```
  Labels are copied verbatim from `sprite_labels.json` minus the `_meta`
  section.

### Foot-anchor assumption (PER TASK SPEC)
The task instructions specified: *"the SWF dudie sprite registers with the
foot at the sprite-bottom-centre of the ORIGINAL untrimmed canvas. So in
the cropped image, the foot anchor is:*

```
footX = (origW / 2) - trimX
footY = origH - trimY
```

That is what `crop_sprites.py` emits and what the index.json files store.

**Caveat — likely needs revisiting (verify visually for frame 1):**
For red frame 1 the trim bbox is `(358, 99, 68, 48)` on an `811 × 770`
canvas, giving `footX=47.5`, `footY=671`. The opaque pixels of the dudie
body fall in `y ∈ [99, 146]` of the original canvas, so the computed
foot anchor lands **525 px below the dudie body** — which is clearly not
the rendered foot in the visual sense. The same shape holds for green
(`footY=183` with body bottom near `y ≈ 185` on a 331-tall canvas — green
happens to look almost right by accident because its trim canvas is much
shorter).

This implies one of two things:
1. The original SWF really does register dudie sprites at the bottom-
   centre of a large rendering canvas, and the engine compensates with
   an offset elsewhere (e.g. `dudiemc._y` is adjusted by +525 / +148).
   In that case the values stored here are correct and the renderer must
   match the same offset.
2. The "bottom-centre of original canvas" assumption is wrong, and the
   true SWF registration point is `(0, 0)` of the ffdec-exported canvas
   (so cropped foot anchor would be `(-trimX, -trimY)` → negative,
   meaning the registration is outside the cropped image, above-left of
   the body).

The cropper currently follows the explicit task instruction (option 1).
Both files and the JSON are emitted; if visual verification proves the
assumption wrong, regenerating is a one-line change to `crop_sprites.py`.

### Sanity check (frame 1)
- `red/1.png`: 1898 B, 68×48, 1076 opaque pixels, average colour
  `(R=85, G=33, B=40)` — red dominates, `133` pixels classified as
  saturated red (`R>150 ∧ G<90 ∧ B<90`).
- `green/1.png`: 1840 B, 42×38, 966 opaque pixels, average colour
  `(R=45, G=87, B=46)` — green dominates, `210` pixels classified as
  saturated green (`G>130 ∧ R<130 ∧ B<130`).
- Both PNGs are >1 KB and contain saturated pixels of the expected hue.
