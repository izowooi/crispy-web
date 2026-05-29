# Snowcraft — Asset Spec (Faithful Port)

> Scope: Catalog every image / sprite / sound asset shipped in the original SWF (decompiled by ffdec into `decompiled/`) and map each one to its gameplay role. Constants and excerpts are pulled directly from `decompiled/scripts/scripts/...` and `decompiled/dump.txt`. No values are guessed — anything not derivable from the source is listed in the "Unknown / ambiguous" section at the bottom.

Paths in this document are relative to the original reverse-engineering export:
`$HOME/Downloads/snow-craft/approach-4-faithful-port/decompiled/`

---

## 1. Class index (decompiled ActionScript 2)

| Class | Source file | Linkage / character ID |
|------|-------------|------------------------|
| `com.iconnicholson.onehammer.AGame` | `scripts/scripts/__Packages/com/iconnicholson/onehammer/AGame.as` | DefineSprite chid 115 (dump.txt:1830) |
| `mx.events.EventDispatcher` | `scripts/scripts/__Packages/mx/events/EventDispatcher.as` | DefineSprite chid 116 (dump.txt:1833) |
| `com.iconnicholson.onehammer.Snowcraft1Rewrite` (extends `AGame`) | `scripts/scripts/__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as` | DefineSprite chid 117 (dump.txt:1836) |
| `com.iconnicholson.onehammer.ASnowDudie` | `scripts/scripts/__Packages/com/iconnicholson/onehammer/ASnowDudie.as` | DefineSprite chid 118 (dump.txt:1839) |
| `com.iconnicholson.onehammer.RedSnowDudie` (extends `ASnowDudie`) | `scripts/scripts/__Packages/com/iconnicholson/onehammer/RedSnowDudie.as` | DefineSprite chid 119 (dump.txt:1842) |
| `com.iconnicholson.onehammer.GreenSnowDudie` (extends `ASnowDudie`) | `scripts/scripts/__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as` | DefineSprite chid 120 (dump.txt:1845) |
| `com.iconnicholson.onehammer.SnowBall` | `scripts/scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as` | DefineSprite chid 121 (dump.txt:1848) |

Boot frames (root timeline): `scripts/scripts/frame_1/DoAction.as`, `frame_2/DoAction.as`, `frame_5/DoAction.as`.

---

## 2. Top-level sprites attached at root (`PlaceObject2 nm=…`)

These are the named clips the AS code references via `_root.<name>`.

| `_root` name | Char ID | Source role | Citation |
|--------------|---------|-------------|----------|
| `sounds` | 85 | Sound bank movieclip — its frames are labelled per SFX cue (`step`, `throw`, `longthrow`, `hit1`, `kids1/2/3`, `laugh`, `laugh2`, `splat`, `birds`, `goodbadugly`, `halaluja`). Frame 1 stops; calling `gotoAndPlay("<label>")` plays the corresponding `StartSound` tag. | dump.txt:972 (PlaceObject2 nm:"sounds"), dump.txt:579–891 |
| `floop` | 86 | Empty 1-frame movieclip used as the `onEnterFrame` host. `AGame` constructor sets `floop.onEnterFrame = floopenterframe` (AGame.as:7). | dump.txt:976, AGame.as:5–10 |
| `gamemc` | 114 | The play-field stage where dudies / balls are attached via `stage.attachMovie(...)`. Passed in as `stage` to `Snowcraft1Rewrite`. | dump.txt:1866 |
| `titles` | 110 | UI overlay movieclip with labelled frames (`seasonsgreetings`, `levelx`, `gameoverlose`, `gameoverwin`, `halaluja`, `credits`, `error`). Holds `score` and `lev` data fields. | dump.txt:1828, frame_5/DoAction.as:9 |

Other exported movieclips referenced by AS via `attachMovie(<linkageId>, …)`:

| Linkage ID (export name) | Exported chid | AS callsite |
|--------------------------|---------------|-------------|
| `selectioncircle` | 8 | dump.txt:21 (ExportAssets) — placed inside `reddudie` sprite (dump.txt:140) |
| `reddudie` | 32 | dump.txt:226 — `RedSnowDudie.as:22` `stage.attachMovie("reddudie", ...)` |
| `snowball` | 35 | dump.txt:235 — `SnowBall.as:37` `stage.attachMovie("snowball", ...)` |
| `snowballshadow` | 48 | dump.txt:287 — `SnowBall.as:34` `stage.attachMovie("snowballshadow", ...)` |
| `greendudie` | 69 | dump.txt:553 — `GreenSnowDudie.as:21` `stage.attachMovie("greendudie", ...)` |

---

## 3. Sound catalog (DefineSound + sounds-sprite frame labels)

The `sounds` movieclip (chid 85) contains a single `StartSound` per labelled frame. The AS code triggers SFX with `this.sounds.gotoAndPlay("<label>")`.

| Sound chid | Exported file (decompiled/sounds/) | Frame label inside `sounds` sprite | StartSound tag (dump.txt) | Triggered by (AS file:line) | Gameplay role |
|------------|------------------------------------|-------------------------------------|-----------------------------|------------------------------|---------------|
| 72 | `72.mp3` | `step` | dump.txt:580 | `RedSnowDudie.as:150` & `GreenSnowDudie.as:112` (during walk while `sounds._currentframe == 1`) | Footstep loop while a dudie is moving. |
| 73 | `73.mp3` | `goodbadugly` | dump.txt:591 | `titles` sprite frame for `levelx` (DefineSprite_110/frame_74/DoAction.as:10) | Level-start sting. |
| 74 | `74.mp3` | `throw` | dump.txt:638 | `SnowBall.as:59` (when `force < 1`) | Short-throw whoosh. |
| 75 | `75.mp3` | `longthrow` | dump.txt:647 | `SnowBall.as:55` (when `force >= 1`) | Long/charged throw whoosh. |
| 76 | `76.mp3` | `hit1` | dump.txt:672 | `RedSnowDudie.as:77` (when `hitpoints == 1`) and `GreenSnowDudie.as:49,55` (on hit/down) | Hit impact. |
| 77 | `77.mp3` | `kids1` | dump.txt:686 | `RedSnowDudie.as:88` / `GreenSnowDudie.as:65` via `"kids" + Math.ceil(Math.random()*3)` on death | Kid voice variant 1 on knockout. |
| 78 | `78.mp3` | `kids2` | dump.txt:701 | Same random pick as above | Kid voice variant 2 on knockout. |
| 79 | `79.mp3` | `kids3` | dump.txt:719 | Same random pick as above | Kid voice variant 3 on knockout. |
| 80 | `80.mp3` | `laugh` | dump.txt:743 | `DefineSprite_69_greendudie/frame_98/DoAction.as:5` (50% branch when green is in `yea` victory state) | Green-team taunt laugh A. |
| 81 | `81.mp3` | `splat` | dump.txt:801 | `SnowBall.as:84` (red-team ball impact on ground) | Snowball splat on ground. |
| 82 | `82.mp3` | `birds` | dump.txt:812 | `RedSnowDudie.as:78` (immediately after `hit1` when red is dazed) | "Tweety birds" dazed cue. |
| 83 | `83.mp3` | `halaluja` | dump.txt:845 | `DefineSprite_110/frame_375/DoAction.as:1` (titles `gameoverwin`/`halaluja` frame) | Win celebration. |
| 84 | `84.mp3` | `laugh2` | dump.txt:891 | `DefineSprite_69_greendudie/frame_98/DoAction.as:9` (other 50% branch) | Green-team taunt laugh B. |

`-1.wav` in `decompiled/sounds/` corresponds to the `SoundStreamHead2` placeholder tags (cid −1) sprinkled at the start of every DefineSprite (e.g. dump.txt:6) — it carries no audible content and should be ignored.

---

## 4. Bitmap / shape catalog (`decompiled/images/`, `decompiled/shapes/`, `decompiled/frames/`)

| File on disk | Underlying chid | What it is (per dump.txt tag) | Gameplay role |
|--------------|-----------------|--------------------------------|---------------|
| `images/3.png` | 3 | DefineBitsJPEG3 (dump.txt:9) | Wrapped by Shape 4 (dump.txt:10) and used inside the `reddudie` (chid 32) timeline. Red character body sprite. |
| `images/6.png` | 6 | DefineBitsLossless2 (dump.txt:15) | Wrapped by Shape 7 (dump.txt:16) → DefineSprite 8 = `selectioncircle` export. The yellow ring shown when hovering a red dudie (`RedSnowDudie.as:97`). |
| `images/11.png` | 11 | DefineBitsLossless2 (dump.txt:27) | Used inside Shape 12 (dump.txt:28). Red-team body part / face piece referenced from the reddudie animation states. |
| `images/33.jpg` | 33 | DefineBits (dump.txt:228) | Wrapped by Shape 34 (dump.txt:229) → DefineSprite 35 = `snowball` export. The flying snowball graphic (`SnowBall.as:37`). |
| `images/36.jpg` | 36 | DefineBits (dump.txt:236) | Wrapped by Shape 37 (dump.txt:237) → snowball-impact frame inside the `snowballshadow` (chid 48) clip (used at `land` label). |
| `images/38.png` | 38 | DefineBitsLossless (dump.txt:238) | Wrapped by Shape 39 (dump.txt:239) → snowball shadow ground sprite (chid 40 → 48). |
| `images/41.jpg` | 41 | DefineBits (dump.txt:244) | Wrapped by Shape 42 (dump.txt:245) — used in shadow / impact animation. |
| `images/44.jpg` | 44 | DefineBits (dump.txt:250) | Wrapped by Shape 45 (dump.txt:251) — additional shadow / impact frame. |
| `images/49.png` | 49 | DefineBitsLossless2 (dump.txt:288) | Wrapped by Shape 50 (dump.txt:289). Green character body sprite (used inside `greendudie` chid 69). |
| `images/111.jpg` | 111 | DefineBits (dump.txt:1856) | Wrapped by Shape 112 (dump.txt:1857) → DefineSprite 113 → DefineSprite 114 = `gamemc` background. The play-field background image. |
| `shapes/*.svg` | matching `<n>.svg` | DefineShape vector outlines | Vector decorations (lines, blocks of color) composed into character/UI sprites. They appear inside larger sprites listed below; no AS code references them by name. |
| `frames/1.png … 5.png` | n/a (raster snapshots of root frames 1–5) | Boot/intro frames | Rasterized timeline frames; used only for visual reference — gameplay is driven by the AS classes after frame 5. |

Note: every `DefineSprite` in the dump opens with a stray `SoundStreamHead2 (cid: -1)` (e.g. dump.txt:6) — these are zero-byte placeholders, not real audio.

---

## 5. Animation sprites — frame labels

### 5.1 `reddudie` (chid 32)

Frame labels (dump.txt:137–185) and their semantics from `RedSnowDudie.as` and `decompiled/scripts/scripts/DefineSprite_32_reddudie/`:

| Frame label | Source script | Behaviour |
|-------------|---------------|-----------|
| `rest` | (initial position) | Idle pose (frame 1). |
| `ready` | `frame_1/DoAction.as` → `meter._visible = false; stop();` | Default visible state when not throwing. Set by `RedSnowDudie.as:106` (`mouserollout`), `:142` (after walk completes), `:171` (after dazed timer expires). |
| `cock` | `frame_3/DoAction.as` → `meter.gotoAndPlay(1); meter._visible = true; stop();` | Charge windup. Plays the embedded `meter` clip from frame 1; the throw uses `meter._currentframe` to compute force. Set by `RedSnowDudie.as:64` (`onchosen`). |
| `toss` | `frame_4/DoAction.as` → `stop(); meter._visible = false;` | Release pose. Set by `RedSnowDudie.as:128` after `throwball()`. |
| `hitdazed` | `frame_5/DoAction.as` → `play();` | Hit→dazed transition. Set by `RedSnowDudie.as:76`. |
| `dazed` | `frame_7/DoAction.as` → `meter._visible = false; play();` | Stunned loop while `dazed > 0`. |
| `dead` | `frame_15/DoAction.as` → `play();` (with later `frame_24` random branch and `frame_27` recovery to walk) | Knockout animation. Set by `RedSnowDudie.as:87`. |
| `walk` | `frame_18/DoAction.as` → `gotoAndStop("dazed"); play();` (mislabelled in source — see Unknown #1) | Walking loop. Set by `RedSnowDudie.as:159`. |

`meter` is a child sprite (chid 19) placed at name `"meter"` (dump.txt:142). It contains 15 frames of an animated power gauge (PlaceObject2 entries at dump.txt:48–66). The throw force is read directly from this meter (`RedSnowDudie.as:108–118`).

### 5.2 `greendudie` (chid 69)

Frame labels (dump.txt:382–519) and behaviour from `GreenSnowDudie.as` and `DefineSprite_69_greendudie/`:

| Frame label | Source script | Behaviour |
|-------------|---------------|-----------|
| `walk` | `frame_6/DoAction.as` → `gotoAndStop("walk"); play();` | Walk cycle. Set by `GreenSnowDudie.as:132`. |
| `ready` | `frame_7/DoAction.as` → `stop();` | Standing idle (used after walk arrives). |
| `balling` | `frame_8/DoAction.as` → `stop();` | "Making a snowball" pose. Used during the `balling` countdown (`GreenSnowDudie.as:158`). |
| `cock` | `frame_9/DoAction.as` → `stop();` | Charge / aim pose entered when `balling` hits 0 (`GreenSnowDudie.as:153`). |
| `toss` | `frame_10/DoAction.as` → `stop();` | Throw release; entered when `cocking == 10` (`GreenSnowDudie.as:122`). |
| `hit` | `frame_11/DoAction.as` → `justhit = true; play();` | First hit. Set by `GreenSnowDudie.as:48`. |
| `midrecover` | `frame_36/DoAction.as` → `gotoAndStop("midrecover"); play();` | Recovery transition (auto-played from `down` timeline). |
| `down` | `frame_33/DoAction.as` → `down = true; play();` | Knocked down (second-hit) state. Set by `GreenSnowDudie.as:54`. |
| `dead` | `frame_57/DoAction.as` → `play();` (with `frame_60` random branch) | Knockout. Set by `GreenSnowDudie.as:60`. |
| `yea` | `frame_74/DoAction.as` → random jump, then `gotoAndStop("yealoop")` | Win celebration — entered via `GreenSnowDudie.gameover()` (line 71). |
| `yealoop` | `frame_98/DoAction.as` → triggers `laugh` / `laugh2` SFX 50/50 | Looping celebration with random taunt. |

Ad-hoc helpers:
- `frame_17/DoAction.as` → `justhit = true; down = false; play();`
- `frame_31/DoAction.as` → `justhit = false; down = false; gotoAndStop("walk"); play();`
- `frame_58/DoAction.as` → `gotoAndStop(this._currentframe + Math.round(Math.random()*4));`
- `frame_78/DoAction.as` → `gotoAndPlay(this._currentframe + Math.floor(Math.random()*21));`

### 5.3 `snowballshadow` (chid 48)

| Frame label | Source script | Behaviour |
|-------------|---------------|-----------|
| (frame 1) | `DefineSprite_48_snowballshadow/frame_1/DoAction.as` → `stop();` | Travelling shadow under the ball. |
| `land` | `DefineSprite_48_snowballshadow/frame_15/DoAction.as` → `stop();` | Splat on ground; triggered by `SnowBall.as:83` (red) and `:112` (green). |

### 5.4 `meter` (chid 19, placed inside reddudie)

| Frame label | Source script | Behaviour |
|-------------|---------------|-----------|
| (no label) | `DefineSprite_19/frame_15/DoAction.as` → `stop();` | Power meter ends at frame 15 and stops. Throw force is read from `meter._currentframe` at release time (RedSnowDudie.as:112). |

### 5.5 `titles` (chid 110, root name `titles`)

Frame labels (dump.txt:1072–1823):

| Label | Frame # | Effect | Triggered by |
|-------|---------|--------|--------------|
| `seasonsgreetings` | 5 | Visible=true; play intro. (DefineSprite_110/frame_2/DoAction.as) | `Snowcraft1Rewrite.dolevel(1)` (Snowcraft1Rewrite.as:234) |
| `levelx` | 149 | Set `levelfade.levelx.text = "Level " + lev` (or "Bonus Round" if `lev == 9`); play `goodbadugly` SFX. (DefineSprite_110/frame_74/DoAction.as) | `dolevel(level)` for level ≥ 2 (Snowcraft1Rewrite.as:239) |
| `gameoverlose` | 297 | (DefineSprite_110/frame_166/DoAction.as → visible=true) | `ongameover(false)` (Snowcraft1Rewrite.as:429) |
| `gameoverwin` | 516 | Same showbox; eventually plays `halaluja`. | `ongameover(true)` (Snowcraft1Rewrite.as:425) |
| `halaluja` | 556 | `_root.sounds.gotoAndPlay("halaluja");` (DefineSprite_110/frame_375/DoAction.as) | reached during win sequence |
| `credits` | 706 | Credits screen. Triggered by typing `r,c` cheat (frame_5/DoAction.as:30) or by clicking the "credits" button on the win/lose card (DefineSprite_110/frame_271/DoAction.as:13). |
| `error` | 756 | "wfw" branch when domain check fails (frame_2/DoAction.as:7). |

The win/lose card (DefineSprite_110/frame_270/DoAction.as and /frame_271/DoAction.as) wires up `playagain.onRelease`, `visit.onRelease` (`http://www.iconnicholson.com`), and `creditsblock.onRelease` (jump to `credits`). `scorebox` is bound from `this.score`, set by `Snowcraft1Rewrite.ongameover()` (Snowcraft1Rewrite.as:422).

---

## 6. Constants (cited verbatim from AS source)

All values below come from the `__Packages` files. No assumed/guessed values.

### 6.1 Game / level (`Snowcraft1Rewrite.as`)
- Initial red dudie spawn (Snowcraft1Rewrite.as:13–18):
  - `reddudie1startx = 450, reddudie1starty = 200`
  - `reddudie2startx = 420, reddudie2starty = 260`
  - `reddudie3startx = 310, reddudie3starty = 250`
- Each red dudie is initially placed at `(startx + 200, starty + 100)` (Snowcraft1Rewrite.as:247, 253, 259), then walks to `(startx, starty)`.
- Green spawn tables: hard-coded per level in `greendudiestartingpoints[0..8]` (Snowcraft1Rewrite.as:42–210). Number of greens per level = length of that array (3, 5, 7, 9, 12, 12, 12, 12, 50). Level count therefore = 9. `dolevel` is invoked from frame_5/DoAction.as:11 with `1`; transition to next level happens in `frameloop` when all greens are dead (Snowcraft1Rewrite.as:309–316).
- Bonus round trigger: `lev == 9` → titles label `"levelx"` displays text `"Bonus Round"` (DefineSprite_110/frame_74/DoAction.as:3–4).
- Green walk speed override per level (Snowcraft1Rewrite.as:273–280):
  - Level 5 or level > 6 → `walkspeed = 10`
  - Level 6 → `walkspeed = 15`
  - Otherwise default (5, see ASnowDudie.as:11).
- Hit detection radii (Snowcraft1Rewrite.as:366,376):
  - X tolerance: `Math.abs(ball._x - dudie._x) < 30`
  - Y tolerance: `Math.abs(ball._y - (dudie._y - 20)) < 30`
- Ball culling distance (Snowcraft1Rewrite.as:384): `|x| > 2999 || |y| > 2999`.
- Score on green hit (Snowcraft1Rewrite.as:369): `score += 10`.
- Time bonus on win (Snowcraft1Rewrite.as:413–419):
  - `elapsedMs = now - starttime`
  - if `elapsedMs < 1_800_000` (30 minutes): `score += round((1_800_000 - elapsedMs) / 1000)`
- Shift key code captured (Snowcraft1Rewrite.as:216) — sets `shiftdown` flag (no further usage in source; see Unknown #2).
- Cheats (frame_5/DoAction.as:18–34):
  - `l`,`v`,<digit> → jump to that level (`_root.game.dolevel(Number(chr(Key.getAscii())))`).
  - `c`,`r`,<any> → `_root.titles.gotoAndPlay("credits")`.

### 6.2 `ASnowDudie.as`
- Default `walkspeed = 5` (line 11).
- Default `dead = false`, `walking = false`, `didfirstwalk = false` (lines 8–10).

### 6.3 `RedSnowDudie.as`
- `hitpoints = 2` (line 13).
- `dazed` cooldown = `40` frames after first hit (line 74); `dazed` countdown decremented per frame (lines 167–172).
- Throw-force calculation from charge meter (lines 110–115):
  - `force = 0.001` baseline; if `meter._currentframe > 4` then `force = meter._currentframe / 15`.
  - `ineffective = (force < 0.1)` (line 116).
- Drag boundary line (line 179): `checkline(592, 0, 0, 320, mouseX, mouseY, 1)` — clamps the dragged dudie below the diagonal from (592, 0) to (0, 320), i.e. the line that separates the red half-court from the rest of the field.
- Walk arrival threshold = 10 px on both axes (line 138).
- On 0 HP: depth-swap into a per-`grounditer` empty MovieClip (lines 84–86) so the corpse sinks below live characters; play random `kids1/2/3` (line 88).

### 6.4 `GreenSnowDudie.as`
- `hitpoints = 3` (line 15).
- `balling = 0`, `cocking = 0`, `down = false`, `adobefrozenframebugfix = 0` (lines 12–16).
- Idle → walk RNG: `Math.random() > 0.975` → start a random walk (line 129). Random destination clamped by `checkline(610, 0, 0, 340, x, y, 0)` (line 32) — diagonal line bounding the green half of the play field.
- Cock duration = `15 + round(random()*30)` frames (line 154); throw fires when `cocking == 10` (line 120).
- Balling duration = `10 + round(random()*50)` frames (line 159).
- After-hit freeze duration = `50` frames (`adobefrozenframebugfix = 50`, line 47).
- During title overlay (`titles._visible`): if walk just ended, force `walkspeed = 3` and bail (lines 97–102).
- Throw event payload (lines 162–164):
  - `force = 0.3 + random()*0.6` (range 0.3..0.9 — never long-throw)
  - emit at `(dudie._x, dudie._y - 15)`.
- 0 HP: depth-swap (lines 62–64); play random `kids1/2/3` (line 65).

### 6.5 `SnowBall.as`
- `grounddistance = 35` (line 17). Shadow Y offset (line 42): `shadowmc._y = y + 35`.
- Initial velocity by team (lines 43–52):
  - `red`: `xmov = -20`, `ymov = -10` (also for shadow)
  - `green`: `xmov = +20`, `ymov = +10` (also for shadow)
- SFX selection (lines 53–60): `force >= 1` → `longthrow`, else `throw`.
- Red-team flight model (lines 73–101):
  - If `ymov > -3` mark `ineffective` (cannot hit anyone).
  - If `-2 < ymov < 50`: snap `ymov = 51`, hide ball, play `snowballshadow` "land" + sounds `splat`.
  - If `ymov > 50`: `ymov += 1` per frame; when `ymov > 100` set `dead = true`.
  - While in flight, when `originalx - ballmc._x > force*100` (and `force != 1`): apply gravity-ish `ymov += (3 - force)` and `force -= force * 0.15` (drag).
- Green-team flight model (lines 102–129) — analogous:
  - Mark `ineffective` when `ymov > 17`.
  - Land snap when `18 < ymov < 50`.
  - Same `> 50` settle and `> 100` death rules.
  - Drag triggers on horizontal travel `|originalx - ballmc._x| > force*300`, `ymov += (2 - force)`, `force -= force * 0.15`. (Note: green never plays `splat` — see line 113 vs 84.)
- Position update (lines 130–133): `ballmc._x += xmov; ballmc._y += ymov; shadowmc._x += shadowxmov; shadowmc._y += shadowymov;`.

### 6.6 `AGame.as`
- Per-frame loop is just `floop.onEnterFrame = floopenterframe` (line 7) which calls `this.hackparent.frameloop()` (line 18). FPS is whatever the SWF stage rate is (not asserted in code — see Unknown #3).

---

## 7. Method signatures (per class)

`AGame.as` (lines 1–32):
- `AGame(floop)` (line 5)
- `ongameover()` (line 11)
- `floopenterframe()` (line 16)
- `frameloop()` (line 20)
- `dispatchEvent / addEventListener / removeEventListener` (stubs)

`ASnowDudie.as` (lines 1–72):
- `ASnowDudie(stage, sounds)` (line 12)
- `setwalkendx(n) / setwalkendy(n) / setwalkspeed(i)` (lines 18–28)
- `setposition(x, y)` (line 42)
- `checkline(x1,y1, x2,y2, x,y, less)` (line 47) — diagonal clip helper
- `destroy()` (line 68)

`RedSnowDudie.as` (lines 1–184):
- `RedSnowDudie(stage, sounds)` (line 18)
- `redrollover/redrollout/redpress/redrelease` (lines 33–48) — wired in constructor as MovieClip handlers (lines 26–30)
- `onchosen()` (line 49)
- `yougothit()` (line 66)
- `mouseover() / mouserollout()` (lines 91–107)
- `throwball()` (line 108)
- `mouserelease()` (line 119)
- `frameloop()` (line 130)

`GreenSnowDudie.as` (lines 1–166):
- `GreenSnowDudie(stage, sounds, titles)` (line 17)
- `randomdestinationwithinboundaries()` (line 27)
- `yougothit()` (line 37)
- `gameover()` (line 68)
- `frameloop()` (line 73)
- `throwball()` (line 161)

`SnowBall.as` (lines 1–135):
- `SnowBall(stage, sounds, team, force, x, y, ineffective)` (line 18)
- `destroy()` (line 62)
- `frameloop()` (line 67)

`Snowcraft1Rewrite.as` (lines 1–451):
- `Snowcraft1Rewrite(floop, stage, titles, sounds)` (line 21)
- `keydown(k) / keyup(k)` (lines 214–227)
- `dolevel(level)` (line 228)
- `throwball(eventObject)` (line 284)
- `frameloop()` (line 289)
- `ongameover(win)` (line 410)
- `clearbetweenlevels()` (line 434)
- `reset()` (line 444)

---

## 8. Algorithm pseudocode (faithful summary)

### 8.1 Per-frame main loop (`Snowcraft1Rewrite.frameloop`, lines 289–409)
```
allGreensDead = true
for each adudie a:
  if a is GreenSnowDudie and !a.dead: allGreensDead = false; break
if allGreensDead and !gameover:
  if lev == greendudiestartingpoints.length: ongameover(true)
  else: dolevel(lev + 1)

allRedsDead = true
for each adudie a:
  if a is RedSnowDudie and !a.dead: allRedsDead = false; break
if allRedsDead and !gameover:
  for each green g not dead: g.gameover()   # play "yea" celebration
  ongameover(false)                         # win=undefined → lose

removeIdx = []
for ball b in snowballs:
  for each adudie a:
    if (a is GreenSnowDudie and b.team=="red"
        and |b.x - a.x| < 30 and |b.y - (a.y - 20)| < 30
        and !a.dead and !a.down and !b.dead and !b.ineffective):
      b.dead = true; score += 10; a.yougothit()
    elif (a is RedSnowDudie and b.team=="green"
        and same proximity test
        and !a.dead and !b.dead and !b.ineffective):
      b.dead = true; a.yougothit()
  if |b.x| > 2999 or |b.y| > 2999 or b.dead:
    removeIdx.push(idx)
  else:
    b.frameloop()
for each adudie a: a.frameloop()
for idx in removeIdx (in original order): destroy + splice from snowballs
```
Note the `splice` happens with original indices (Snowcraft1Rewrite.as:402–408); see Unknown #4.

### 8.2 Red player flow (`RedSnowDudie`)
```
ctor: attachMovie("reddudie"); set onPress=redpress, onRelease=redrelease,
      onRollOver=redrollover, onRollOut=redrollout
mouseover: if !dazed and !dead and !walking: show selectioncircle
onchosen (mousedown on reddudie):
  if dazed/dead/walking: return
  swap depth so this is on top of all reds
  dispatch "chosen"; dragdudie=true
  dudiemc.gotoAndPlay("cock")  # starts the meter
mouserelease:
  if dazed/dead/walking: return
  throwball(); dudiemc.gotoAndStop("toss")
throwball:
  force = 0.001
  if meter._currentframe > 4: force = meter._currentframe / 15
  emit {type:"throwball", force, team:"red", x, y-35, ineffective: force<0.1}
yougothit:
  hitpoints--
  if hitpoints==1: dazed=40; play "hitdazed"; SFX hit1, birds
  if hitpoints==0: dead=true; depth-swap into corpse layer; play "dead"; SFX kids[1..3]
frameloop:
  if dead: return
  if walking: lerp toward walkend at walkspeed; if arrived: stop, "ready"
  elif walkendx set: start walking, play "walk", compute (walkxmov,walkymov)
  if dazed: dazed--; if 0: play "ready"
  if dragdudie and mouse held:
     dudie.x = stage._xmouse; dudie.y = stage._ymouse
     clamp via checkline(592,0, 0,320, x,y, less=1)
```

### 8.3 Green AI (`GreenSnowDudie.frameloop`)
```
if dead or down or justhit (with adobefrozenframebugfix countdown): return
if walking: lerp toward walkend; arrived → "balling" pose
            (and if titles._visible, set walkspeed=3 and bail)
if cocking>0:
  cocking--; if cocking==10: "toss"; throwball()
if random()>0.975 or walkendx set:
  walking=true; "walk"; pick random destination via randomdestinationwithinboundaries()
  compute (walkxmov,walkymov) so total distance / walkspeed = numFrames
if titles._visible: return  # don't shoot during intros
if balling>0:
  balling--; if balling<=0: "cock"; cocking = 15 + random()*30
else:
  "balling"; balling = 10 + random()*50
throwball: emit {force: 0.3 + random()*0.6, team:"green", x, y-15}
yougothit:
  hitpoints--
  hp==2: justhit=true; adobefrozenframebugfix=50; "hit"; SFX hit1
  hp==1: down=true; "down"; SFX hit1
  hp==0: "dead"; dead=true; depth-swap; SFX kids[1..3]
gameover: dead=true; "yea"   # used when ALL reds are out
```

### 8.4 Snowball physics (`SnowBall.frameloop`)
```
if dead: return
if team=="red":
  if ymov > -3: ineffective=true
  if -2 < ymov < 50: ymov=51; ball._visible=false; shadow.play("land"); SFX splat; return
  if ymov > 50: ymov++; if ymov>100: dead=true; return
  if force != 1 and (originalx - ball.x) > force*100:
     ymov += 3 - force; force -= force*0.15
elif team=="green":
  if ymov > 17: ineffective=true
  if 18 < ymov < 50: ymov=51; ball._visible=false; shadow.play("land"); return  # no splat sfx
  if ymov > 50: ymov++; if ymov>100: dead=true; return
  if force < 1 and |originalx - ball.x| > force*300:
     ymov += 2 - force; force -= force*0.15
ball.x += xmov; ball.y += ymov; shadow.x += shadowxmov; shadow.y += shadowymov
```

### 8.5 Boot sequence
1. `frame_1/DoAction.as` — sets `_root.comiter = 19200; _root.grounditer = 1200;` (live-character and corpse depth counters).
2. `frame_2/DoAction.as` — domain check; if not on whitelist, jumps `titles` to `error` and `stop()`s.
3. `frame_5/DoAction.as` — constructs `_root.game = new Snowcraft1Rewrite(_root.floop, _root.gamemc, _root.titles, _root.sounds)`, listens for `gameover`, calls `dolevel(1)`. Adds the level / credits cheat key listener.

---

## 9. Asset → gameplay event quick-reference

| Event | Asset / movie referenced | Code citation |
|-------|---------------------------|---------------|
| Hovering a red dudie | show child sprite `selectioncircle` (chid 8) | RedSnowDudie.as:97 |
| Mouse-down on red dudie | `reddudie` plays `cock`; embedded `meter` (chid 19) starts ticking from frame 1 | RedSnowDudie.as:64; DefineSprite_32_reddudie/frame_3/DoAction.as |
| Release red throw | spawn `snowball` (chid 35) and `snowballshadow` (chid 48); play `throw` (cid 74) or `longthrow` (cid 75) by force | SnowBall.as:34–60 |
| Snowball lands | `snowballshadow` `gotoAndPlay("land")`; red-team only also plays `splat` (cid 81) | SnowBall.as:83–84 / 112 |
| Red dudie footstep | `sounds.gotoAndPlay("step")` → cid 72 | RedSnowDudie.as:148–151 |
| Green dudie footstep | same `step` cue | GreenSnowDudie.as:110–113 |
| First hit on red | `reddudie` `hitdazed`; SFX `hit1`+`birds` | RedSnowDudie.as:74–78 |
| First hit on green | `greendudie` `hit`; SFX `hit1` | GreenSnowDudie.as:46–49 |
| Knockdown on green (HP=1) | `greendudie` `down`; SFX `hit1` | GreenSnowDudie.as:53–55 |
| Death (either team) | `dead` label + random `kids1/2/3` (cid 77/78/79); depth-swap into `_root.grounditer` corpse layer | RedSnowDudie.as:84–88; GreenSnowDudie.as:62–65 |
| Win (all greens dead) | `titles.gotoAndPlay("gameoverwin")`; later `halaluja` (cid 83) | Snowcraft1Rewrite.as:425; DefineSprite_110/frame_375/DoAction.as |
| Lose (all reds dead) | Each surviving green plays `yea`/`yealoop` and randomly plays `laugh` (cid 80) or `laugh2` (cid 84); `titles.gotoAndPlay("gameoverlose")` | Snowcraft1Rewrite.as:344–351 + DefineSprite_69_greendudie/frame_98/DoAction.as |
| Level start (≥2) | `titles.gotoAndPlay("levelx")` → plays `goodbadugly` (cid 73), shows "Level N" or "Bonus Round" | DefineSprite_110/frame_74/DoAction.as |
| Game start (level 1) | `titles.gotoAndPlay("seasonsgreetings")` | Snowcraft1Rewrite.as:234 |
| Domain failure | `titles.gotoAndPlay("error")` | frame_2/DoAction.as:7 |
| Cheat: `l`,`v`,N | `_root.game.dolevel(N)` | frame_5/DoAction.as:23–25 |
| Cheat: `c`,`r`,_ | `_root.titles.gotoAndPlay("credits")` | frame_5/DoAction.as:27–32 |

---

## 10. Unknown / ambiguous

1. **`walk` frame label inside `reddudie`.** `decompiled/scripts/scripts/DefineSprite_32_reddudie/frame_18/DoAction.as` reads `gotoAndStop("dazed"); play();`, but the FrameLabel at frame 71 is named `walk` (dump.txt:206). It's unclear whether ffdec re-numbered scripts onto wrong frames, whether multiple `gotoAndStop` calls share a frame, or whether the original timeline genuinely jumps `walk` → `dazed`. Recommend treating `walk` as a normal walk loop and ignoring the literal `gotoAndStop("dazed")` until verified against the SWF in a player.
2. **`shiftdown` flag.** Captured in `Snowcraft1Rewrite.keydown/keyup` (lines 216–225) but never read elsewhere in the decompiled source. Unused dead code or AS that was stripped during compile — no behaviour to port.
3. **Frame rate / FPS.** Not asserted in any AS file. `AGame` ties everything to the stage's `onEnterFrame`. The exact rate must be read from the SWF header (FileAttributes / FrameRate) — not present in the decompiled `.as` files. Pick the SWF's declared FPS from `dump.txt` header line 2 if available; otherwise treat numeric durations (`dazed=40`, `adobefrozenframebugfix=50`, `cocking=15+rand*30`, `balling=10+rand*50`) as "frames at the SWF's native FPS".
4. **Splice order in `frameloop`.** Snowcraft1Rewrite.as:402–408 splices items from `this.snowballs` using indices captured *before* any splice happens. After the first removal, subsequent indices are off by one. The decompiled code is faithful to the original; the original may simply have had the same off-by-one bug. The port should decide whether to reproduce the bug or fix it (recommend fix: iterate in reverse).
5. **Level total = 9.** `greendudiestartingpoints[8]` is allocated for a 50-dudie "bonus" level (Snowcraft1Rewrite.as:189–195), and `lev == 9` produces the title `"Bonus Round"` (DefineSprite_110/frame_74/DoAction.as:3). Note however that `greendudiestartingpoints[4]` is initialized twice (lines 70–82 then overwritten at 83–95). The first block is dead code in the source — final level-5 layout is the second block.
6. **`-1.wav`.** Filed under `decompiled/sounds/-1.wav`; corresponds to the `cid: -1` SoundStreamHead2 placeholders, not real audio. Do not ship.
7. **`shapes/*.svg` and `frames/*.png` mapping to specific game elements.** The dump only confirms which DefineShape IDs are placed inside which DefineSprite (see §4). The port team may need a visual inspection in ffdec to assign each SVG to a body part / UI element if individual sub-sprites need to be re-authored.
8. **Sounds mc constructor.** The clip `sounds` (chid 85) is placed at depth 3 with `nm:"sounds"` (dump.txt:972). The first frame stops the timeline (`DefineSprite_85/frame_1/DoAction.as` → `stop();`) and every labelled frame is followed shortly by another `gotoAndStop(1)` (frames 9, 53, 59, 81, 92, 104, 119, 140, 195, 203, 233, 276, 355) so each cue plays exactly once per `gotoAndPlay`. This is the canonical "sound bank" pattern; honour it in the port.
9. **`SnowBall.ineffective` for the green team.** `SnowBall.as:106` flips `ineffective = true` once `ymov > 17`, but greens use the same hit test (Snowcraft1Rewrite.as:376) where `ineffective` blocks impacts. This means green throws auto-disarm before they reach reds if they were thrown too softly. Verify against gameplay: this is the source of the "green sometimes can't hurt you" feel.
