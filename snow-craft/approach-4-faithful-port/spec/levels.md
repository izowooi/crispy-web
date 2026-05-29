# SPEC: Snowcraft Level Progression

Source SWF: `approach-3-ruffle/snowcraft.swf`
Decompiled root: `approach-4-faithful-port/decompiled/`
All AS file paths below are relative to
`approach-4-faithful-port/decompiled/scripts/scripts/`.
The classes live under `__Packages/com/iconnicholson/onehammer/`.

---

## 1. Engine-level constants (cited)

| Constant | Value | Source |
|---|---|---|
| Frame rate (fps) | **20 fps** | SWF header (decoded from `approach-3-ruffle/snowcraft.swf`; FrameRate fixed8 = 20.0) |
| Total movie frame count | 5 | SWF header |
| Stage background | 0xCCCCCC | dump.txt:2  `SetBackgroundColor cc cc cc` |
| Player-area clipping line (red) | (592,0)–(0,320), red drag stays *less* than line | `__Packages/com/iconnicholson/onehammer/RedSnowDudie.as:179` `this.checkline(592,0,0,320,...,1)` |
| Green-area random spawn box | x∈[0,500), y∈[0,300) clipped by line (610,0)–(0,340), kept *greater* than line | `GreenSnowDudie.as:30-34` |
| World cull bound for snowballs | `Math.abs(_x)>2999 \|\| Math.abs(_y)>2999` | `Snowcraft1Rewrite.as:384` |

Hit-test constants (snowball ↔ dudie):
- `Math.abs(ball._x − dudie._x) < 30`
- `Math.abs(ball._y − (dudie._y − 20)) < 30`
- Source: `Snowcraft1Rewrite.as:366` (red→green) and `:376` (green→red).

Score constants:
- +10 per green hit:  `Snowcraft1Rewrite.as:369` `this.score += 10;`
- Time bonus on win: `if (elapsedMs < 1_800_000) score += round((1_800_000 − elapsedMs)/1000)` — `Snowcraft1Rewrite.as:416-419` (i.e. 30-minute par; 1 point per second saved).

---

## 2. Level count

**Total levels = 9** (indices 1..9; data table is `greendudiestartingpoints[0..8]`).

Cited from `Snowcraft1Rewrite.as`:

- Table is built in the constructor lines `42-210`. Indices 0..8 are populated.
  Note that index 4 is **assigned twice** (lines 70-95). The second assignment
  (lines 83-95) overwrites the first; the first block is dead code and must
  not be reproduced in the port.
- Win-vs.-end-of-game decision uses table length:
  ```
  // Snowcraft1Rewrite.as:309-316
  if (this.lev == this.greendudiestartingpoints.length)
      this.ongameover(true);
  else
      this.dolevel(this.lev + 1);
  ```
  `greendudiestartingpoints.length == 9`, so passing level 9 triggers the win.

---

## 3. Enemy count per level (table)

The number of green dudies (enemies) spawned in a given level equals
`greendudiestartingpoints[level-1].length`. There is **no formula** — it is
a hand-authored table, with one exception (level 9 = 50 random points).

| Level | Green dudies | Source line range |
|---|---|---|
| 1 | 3  | `Snowcraft1Rewrite.as:42-45` |
| 2 | 5  | `:46-51` |
| 3 | 7  | `:52-59` |
| 4 | 9  | `:60-69` |
| 5 | 12 | `:83-95` (effective) — first `[4]=…` block on `:70-82` is overwritten |
| 6 | 12 | `:103-130` (post-mutation loop on `:116-130`) |
| 7 | 12 | `:131-163` |
| 8 | 12 | `:164-188` |
| 9 | 50 | `:189-210` (built by `while (_loc4_ < 50) push(...)`) |

Important quirks faithfully reproduced from source:

- **Level-5 mutation loop bug**: lines `96-102` iterate
  `while (_loc4_ < this.greendudiestartingpoints[4].length)` and rewrite
  `[0]`/`[1]` of each starting-point sub-array as `([2]−400, [3]−200)`.
  Because `[4]` is then *re-assigned* on line 83 to a fresh array, the loop
  on line 96 mutates the **first** `[4]` block — which is then thrown away.
  The mutation is therefore a no-op for level 5. The port must NOT replay it.
- **Level-6 mutation loop bug**: lines `145-163` iterate using
  `this.greendudiestartingpoints[4].length` (NOT `[6]`), so the loop runs
  for 12 iterations and uses the index `_loc4_` to mutate
  `greendudiestartingpoints[6]`. (Both arrays happen to have length 12, so
  no out-of-bounds read occurs, but the spec must use `[4].length` for
  byte-equivalent behaviour.)
- **Level-7 mutation loop bug**: lines `177-188` iterate using
  `[4].length` (= 12) again. For `_loc4_ < 6` it copies `[7][i+6][2..3]+150,−150`
  back into `[7][i][2..3]`. Then for all 12 entries it sets
  `[0] = [2]−400`, `[1] = [3]−200`.
- **Level-8 mutation loop bug**: lines `196-210` iterate using `[4].length`
  (= 12) but `[8]` was just filled with 50 entries; only the first 12 are
  mutated. Entries 12..49 keep their raw constructor values
  `(-50, 100, 50+rand*200, 50+rand*200)`.

Each starting-point entry is `[startX, startY, walkEndX, walkEndY]` and is
consumed in `dolevel(level)`:

```
// Snowcraft1Rewrite.as:264-282
while (_loc5_ < this.greendudiestartingpoints[level - 1].length) {
    _loc3_ = this.greendudiestartingpoints[level - 1][_loc5_];
    _loc2_ = new GreenSnowDudie(this.stage, this.sounds, this.titles);
    this.adudies.push(_loc2_);
    _loc2_.addEventListener("throwball", this);
    _loc2_.setposition(_loc3_[0], _loc3_[1]);
    _loc2_.setwalkendx(_loc3_[2]);
    _loc2_.setwalkendy(_loc3_[3]);
    if (level == 5 || level > 6)  _loc2_.setwalkspeed(10);
    if (level == 6)               _loc2_.setwalkspeed(15);
    _loc5_ = _loc5_ + 1;
}
```

Walk-speed override summary (default = 5 from `ASnowDudie.as:11`):
| Level | walkspeed |
|---|---|
| 1, 2, 3, 4, 6 | default 5  *(NOTE: 6 is set to 15 below — see :277-280)* |
| 5 | 10 |
| 6 | 15 |
| 7, 8, 9 | 10 |

(`level == 5 || level > 6` ⇒ 10; `level == 6` ⇒ 15; the `==6` branch runs
*after* the `>6` branch in code order so the level-6 override wins.)

---

## 4. Red (player) team — always 3 units, fixed start

`Snowcraft1Rewrite.as:13-18` declares the red start positions:

```
var reddudie1startx = 450;  var reddudie1starty = 200;
var reddudie2startx = 420;  var reddudie2starty = 260;
var reddudie3startx = 310;  var reddudie3starty = 250;
```

`dolevel()` lines `242-259` spawns 3 reds **every level** (i.e. health is
reset between levels). Each red is created as:
- **placed at** `(start + 200, start + 100)`,
- **walks to** `(start, start)`.

```
// example for red #1 (Snowcraft1Rewrite.as:242-247)
_loc6_ = new RedSnowDudie(this.stage, this.sounds);
_loc6_.addEventListener("throwball", this);
this.adudies.push(_loc6_);
_loc6_.setwalkendx(this.reddudie1startx);
_loc6_.setwalkendy(this.reddudie1starty);
_loc6_.setposition(this.reddudie1startx + 200, this.reddudie1starty + 100);
```

Red HP = 2 (`RedSnowDudie.as:13`).
Green HP = 3 (`GreenSnowDudie.as:15`).

---

## 5. Win / Lose conditions

Source: `Snowcraft1Rewrite.as:289-353` (the `frameloop` per-frame check).

```
// 1) WIN / advance: every green dudie must be dead
_loc9_ = true;
for (each adudies[i]) {
    if (i instanceof GreenSnowDudie && !i.dead) { _loc9_ = false; break; }
}
if (_loc9_ && !this.gameover) {
    if (this.lev == this.greendudiestartingpoints.length)  // == 9
        this.ongameover(true);                              // WIN
    else
        this.dolevel(this.lev + 1);                         // next level
}

// 2) LOSE: every red dudie must be dead
_loc10_ = true;
for (each adudies[i]) {
    if (i instanceof RedSnowDudie && !i.dead) { _loc10_ = false; break; }
}
if (_loc10_ && !this.gameover) {
    // celebrate any surviving greens
    for (each adudies[i]) if (GreenSnowDudie && !i.dead) i.gameover();
    this.ongameover();                                      // LOSE (no arg)
}
```

`ongameover(win)` (`Snowcraft1Rewrite.as:410-433`):
- if `win` truthy and elapsed time < 30 minutes (1,800,000 ms),
  score += `round((1_800_000 − elapsedMs)/1000)`.
- sets `this.gameover = true`.
- writes `this.titles.score = this.score`.
- `titles.gotoAndPlay("gameoverwin")` if win, else `"gameoverlose"`.
- dispatches `{type:"gameover", target:this}`.

Note: there is no draw or stalemate condition. Both branches are evaluated
in order each frame; if all greens AND all reds die on the same frame, the
**win** check runs first and triggers level advance / win, even though no
reds are alive — verify in port.

---

## 6. Level transition flow

Pseudocode (collated from `frame_5/DoAction.as`,
`Snowcraft1Rewrite.as:228-283`, `:289-316`, `:434-450`):

```
// boot — frame 5 of root timeline
on enter frame_5:
    stop()
    if (!_root.game) {
        _root.game = new Snowcraft1Rewrite(_root.floop, _root.gamemc,
                                           _root.titles, _root.sounds)
        _root.game.addEventListener("gameover", this)
        _root.game.dolevel(1)
    } else {
        _root.game.reset()    // resets starttime, hides titles, gameover=false, score=0
        _root.game.dolevel(1)
    }
    // also: cheat code "lv<digit>" jumps to that level via dolevel()
    // and "cr" plays the credits title ('frame_5/DoAction.as:18-35')

// dolevel(level)
function dolevel(level):
    clearbetweenlevels()             // destroy() every adudie, reset adudies = []
    this.lev = level
    if (level == 1)
        titles.gotoAndPlay("seasonsgreetings")
    else
        titles.lev = level
        titles.gotoAndPlay("levelx")        // a generic "Level X" intro frame
    spawn 3 reds (positions in §4)
    for entry in greendudiestartingpoints[level-1]:
        spawn GreenSnowDudie at entry[0..1], walking to entry[2..3]
        apply walkspeed override (§3)

// every frame (Snowcraft1Rewrite.as:289-409)
function frameloop():
    if all greens dead and !gameover:
        if lev == 9: ongameover(true)
        else:        dolevel(lev + 1)
    if all reds dead and !gameover:
        play "yea" on remaining greens; ongameover() (lose)
    update snowballs (collision, gravity, cull); update dudies

// reset (called when game already exists at frame_5 entry)
function reset():
    starttime = new Date()
    titles._visible = false
    gameover = false
    score = 0
```

The intro/outro screens are non-interactive movie-clip animations played on
the `titles` MovieClip. Frame labels referenced (cited at dump.txt lines):
- `"seasonsgreetings"` — dump.txt:1072 — title intro
- `"levelx"` — dump.txt:997, 1216 — generic per-level intro card; reads
  `titles.lev`
- `"gameoverlose"` — dump.txt:1364
- `"gameoverwin"` — dump.txt:1583
- `"credits"` — dump.txt:1773 — opened by cheat key sequence `c`,`r`
- `"error"` — dump.txt:1823 — domain-lock screen
  (see `frame_2/DoAction.as:4-10`)

While `titles._visible` is true, gameplay is gated:
- Greens slow to walkspeed 3 instead of completing their walk and stop
  taking the cock/throw branch (`GreenSnowDudie.as:98-102, 144-147`).
- Reds are unaffected — but the user typically doesn't click during a
  title card.

`clearbetweenlevels()` (`Snowcraft1Rewrite.as:434-443`) destroys every
adudie and resets `adudies = []`. Snowballs in flight are NOT cleared
between levels (they keep their entry in `this.snowballs` and will be
culled by the world bounds or by going `dead`).

---

## 7. AI / throw timing constants (relevant to level pacing)

Per-frame, FPS is 20 ⇒ "30 frames" ≈ 1.5s wall time.

GreenSnowDudie state-machine timings (`GreenSnowDudie.as`):
- Random walk trigger: `Math.random() > 0.975` per frame ⇒ ~0.025 chance
  per frame ≈ "expected 40 frames" = 2 s at 20 fps  (`:129`).
- Approach tolerance: `<10` px both axes (`:95`).
- "balling" duration before "cock":
  `balling = 10 + round(rand*50)` frames ⇒ 0.5 – 3.0 s (`:159`).
- "cocking" duration before throw frame: `cocking = 15 + round(rand*30)`
  frames ⇒ 0.75 – 2.25 s; throw fires when `cocking == 10`
  (so 5–20 frames after entering cock). (`:154, :120-123`).
- Throw force: `0.3 + rand*0.6`  ⇒ [0.3, 0.9)  (`:163`).
- Adobe-frozen-frame bug fix: `adobefrozenframebugfix = 50` frames after
  taking a hit (`:47, :86`).

RedSnowDudie timings (`RedSnowDudie.as`):
- Hit ⇒ if HP becomes 1 ⇒ `dazed = 40` frames (= 2 s). (`:74`).
- Throw force from charge meter:
  ```
  // RedSnowDudie.as:108-118
  var _loc2_ = 0.001;
  if (this.dudiemc.meter._currentframe > 4)
      _loc2_ = this.dudiemc.meter._currentframe / 15;
  // ineffective if force < 0.1
  ```
  The meter is a 15-frame sprite. Holding mouse longer ⇒ higher frame.
  Below frame 5, force = 0.001 (immediate dud).

SnowBall physics (`SnowBall.as`):
- Initial velocity (per frame):
  - red: `xmov = -20, ymov = -10` (`:45-46`)
  - green: `xmov = 20, ymov = 10` (`:50-51`)
- Per-frame gravity / arc:
  - red, while `force != 1 && (originalx − ball._x) > force*100`:
    `ymov += 3 − force; force -= force*0.15` (`:96-100`)
  - green, while `force < 1 && abs(originalx − ball._x) > force*300`:
    `ymov += 2 − force; force -= force*0.15` (`:124-128`)
  - "ineffective" red flag when `ymov > -3` (`:75-77`).
  - "ineffective" green flag when `ymov > 17` (`:104-106`).
- Landing/cull sequence: when ymov crosses the 18..50 / 50.. window the
  ball is hidden, a shadow `gotoAndPlay("land")` is played and `splat`
  sound is fired (red only — `:84`); finally when `ymov > 100` the ball
  is marked `dead` and removed by the parent loop (`:90-92, :117-120`).
- `grounddistance = 35` is the constant offset between snowball and shadow
  (`:17, :42, :43`).

---

## 8. Asset id ↔ event mapping (from `ExportAssets` in dump.txt)

| Symbol exported | charId | Used for |
|---|---|---|
| `selectioncircle` | 8 | Red-team hover ring (`RedSnowDudie.as:23, :69, :97, :101`) |
| `reddudie` | 32 | Red player MovieClip (`RedSnowDudie.as:22`, dump.txt:226) |
| `greendudie` | 69 | Green enemy MovieClip (`GreenSnowDudie.as:21`, dump.txt:553) |
| `snowball` | 35 | Snowball sprite (`SnowBall.as:37`, dump.txt:235) |
| `snowballshadow` | 48 | Shadow sprite (`SnowBall.as:34`, dump.txt:287) |

`titles` is `chid: 110`, named instance on the root (`dump.txt:1828`).

`sounds` MovieClip frame labels (cited dump.txt lines) and the gameplay
events that trigger each via `this.sounds.gotoAndPlay(...)`:

| Label | dump.txt | Triggered by |
|---|---|---|
| `"step"` | 579 | Either dudie while walking, when sounds._currentframe == 1 (`GreenSnowDudie.as:111-113`, `RedSnowDudie.as:148-151`) |
| `"throw"` | 637 | SnowBall ctor when `force < 1` (`SnowBall.as:58-60`) |
| `"longthrow"` | 646 | SnowBall ctor when `force >= 1` (`SnowBall.as:53-56`) |
| `"hit1"` | 671 | Green hit at HP 2 or 1 (`GreenSnowDudie.as:49, 55`); Red hit at HP 1 (`RedSnowDudie.as:77`) |
| `"birds"` | 811 | Red dazed (`RedSnowDudie.as:78`) |
| `"kids1" / "kids2" / "kids3"` | 685 / 700 / 718 | Death sound, picked by `Math.ceil(Math.random()*3)` for either team (`GreenSnowDudie.as:65`, `RedSnowDudie.as:88`) |
| `"splat"` | 800 | Red snowball landing (`SnowBall.as:84`) — green ball does NOT splat |

Title-track frame labels (cited above): `"seasonsgreetings"` (lvl 1 intro),
`"levelx"` (lvl 2..9 intro), `"gameoverwin"`, `"gameoverlose"`,
`"credits"`, `"error"`.

---

## 9. Per-level starting-point tables (verbatim, post-mutation)

Each entry is `[startX, startY, walkEndX, walkEndY]`. Reproduced
faithfully from the constructor; effective values **after** the mutation
loops are listed.

### Level 1 — 3 enemies (`Snowcraft1Rewrite.as:42-45`)
```
[ -20, -60, 180,  40]
[-130, -60,  70,  40]
[-130,   1,  70, 100]
```

### Level 2 — 5 enemies (`:46-51`)
```
[ -20, -60, 180,  40]
[-130, -60,  70,  40]
[-130,   1,  70, 100]
[ -50,-100,  -2, -99]
[ -50,   1, -49,   1]
```

### Level 3 — 7 enemies (`:52-59`)
```
[ -20, -60, 180,  40]
[-130, -60,  70,  40]
[-130,   1,  70, 100]
[ -50, 100, -51, 101]
[ -50, 150, -51, 151]
[-100, -50,-101, -51]
[-150, -50,-151, -50]
```

### Level 4 — 9 enemies (`:60-69`)
```
[ -20, -60, 180,  40]
[-130, -60,  70,  40]
[-130,   1,  70, 100]
[ -50, 100, -51, 101]
[ -50, 150, -51, 151]
[-100, -50,-101, -51]
[-150, -50,-151, -50]
[-100, -50,-101, -51]
[-150, -50,-151, -50]
```

### Level 5 — 12 enemies (effective table from `:83-95`; the line 70-82 block is overwritten)
```
[ -20, -60, 180,  40]
[-130, -60,  70,  40]
[-130,   1,  70, 100]
[ -50, 100, -51, 101]
[ -50, 150, -51, 151]
[ 160, -50, 160,  80]
[-150, -50, 270,  90]
[-100, -50, 160, 150]
[-150, -50, 300, 140]
[ -50, 100, 400, 150]
[ -50, 150, -51, 151]
[ -50, 100, 300, 205]
```
Then the loop at `:96-102` rewrites every entry's `[0..1]` to `[2]-400, [3]-200`:
```
[-220,-160, 180,  40]
[-330,-120,  70,  40]
[-330, -99,  70, 100]
[-449, -99, -51, 101]
[-451, -49, -51, 151]
[-240, -120,160,  80]
[-130, -110,270,  90]
[-240,  -50,160, 150]
[-100,  -60,300, 140]
[   0,  -50,400, 150]
[-451, -49, -51, 151]
[-100,   5, 300, 205]
```

### Level 6 — 12 enemies (`:103-130`)
Initial table:
```
[ -20, -60, 520,  40]
[-130, -60, 460,  80]
[-130,   1, 400, 130]
[ -50, 100, 340, 165]
[ -50, 150, 280, 200]
[ 160, -50, 230, 250]
[-150, -50, 470,  40]
[-100, -50, 410,  80]
[-150, -50, 340, 130]
[ -50, 100, 280, 165]
[ -50, 150, 230, 200]
[ -50, 100, 180, 250]
```
Mutation (`:116-130`):
- if i<6: `[0] = -450 - i*8`, `[1] = [3]`
- else:   `[0] = [2]`, `[1] = -350 - i*8`

Yielding effective:
```
i=0: [-450, 40, 520,  40]
i=1: [-458, 80, 460,  80]
i=2: [-466,130, 400, 130]
i=3: [-474,165, 340, 165]
i=4: [-482,200, 280, 200]
i=5: [-490,250, 230, 250]
i=6: [ 470,-398, 470,  40]
i=7: [ 410,-406, 410,  80]
i=8: [ 340,-414, 340, 130]
i=9: [ 280,-422, 280, 165]
i=10:[ 230,-430, 230, 200]
i=11:[ 180,-438, 180, 250]
```
Note: walkspeed is forced to **15** for level 6.

### Level 7 — 12 enemies (`:131-163`)
Initial table:
```
[ -20, -60, 400,  80]
[-130, -60, 435,  70]
[-130,   1, 435, 105]
[ -50, 100, 345, 135]
[ -50, 150, 310, 175]
[ 160, -50, 350, 175]
[-150, -50,  85, 220]
[-100, -50, 135, 220]
[-150, -50, 180, 220]
[ -50, 100, 110, 260]
[ -50, 150, 155, 260]
[ -50, 100, 125, 290]
```
Mutation (`:145-163`, iterating using `[4].length` = length of *level-5*):
The first pass (`if i<3` then `else if i<6` then `else`) overwrites
`[0..1]` of `greendudiestartingpoints[6]`:
```
i=0: [400,-250, 400,  80]
i=1: [435,-250, 435,  70]
i=2: [435,-250, 435, 105]
i=3: [345,-350, 345, 135]
i=4: [310,-350, 310, 175]
i=5: [350,-350, 350, 175]
i=6: [-315,  20,  85, 220]   // [2]-400,[3]-200
i=7: [-265,  20, 135, 220]
i=8: [-220,  20, 180, 220]
i=9: [-290,  60, 110, 260]
i=10:[-245,  60, 155, 260]
i=11:[-275,  90, 125, 290]
```
Walkspeed forced to **10** (level==5 || level>6).

### Level 8 — 12 enemies (`:164-188`)
Initial table identical to Level 7's initial table. Then the loop at
`:177-188` (iterating using `[4].length` = 12):
- For `i < 6`: copy `[7][i+6][2..3]+150,−150` into `[7][i][2..3]`.
- For all 12: set `[0]=[2]−400, [1]=[3]−200`.

Effective table (after first-pass copies, then offset):
```
i=0:  [2]=85+150=235, [3]=220-150=70   -> [-165,-130, 235,  70]
i=1:  [2]=135+150=285,[3]=220-150=70   -> [-115,-130, 285,  70]
i=2:  [2]=180+150=330,[3]=220-150=70   -> [ -70,-130, 330,  70]
i=3:  [2]=110+150=260,[3]=260-150=110  -> [-140, -90, 260, 110]
i=4:  [2]=155+150=305,[3]=260-150=110  -> [ -95, -90, 305, 110]
i=5:  [2]=125+150=275,[3]=290-150=140  -> [-125, -60, 275, 140]
i=6:  unchanged -> [-315,  20,  85, 220]
i=7:  unchanged -> [-265,  20, 135, 220]
i=8:  unchanged -> [-220,  20, 180, 220]
i=9:  unchanged -> [-290,  60, 110, 260]
i=10: unchanged -> [-245,  60, 155, 260]
i=11: unchanged -> [-275,  90, 125, 290]
```
Walkspeed forced to **10**.

### Level 9 — 50 enemies (`:189-210`)
Built by:
```
greendudiestartingpoints[8] = []
for (i = 0..49) {
    greendudiestartingpoints[8].push(
        [-50, 100, 50 + Math.random()*200, 50 + Math.random()*200]
    )
}
```
Then mutated (`:196-210`, again using `[4].length` = 12, so only i=0..11 are touched):
- i<10:  `[0] = [2]-400, [1] = [3]-200`
- i=10,11: `[0] = [2]-400, [1] = [3]`

Entries 12..49 retain their constructor values
`[-50, 100, randX, randY]`. **The randomness is generated at game start
(in the `Snowcraft1Rewrite` constructor), not at level-load.** A faithful
port must seed once at game start so retries through the same game session
see the same map.

Walkspeed forced to **10**.

---

## 10. Pseudocode summary of each algorithm

### A. Game boot / level loop
```
on frame_5:
    if !_root.game:
        game = new Snowcraft1Rewrite(floop, gamemc, titles, sounds)
        game.dolevel(1)
    else:
        game.reset(); game.dolevel(1)

each frame (driven by floop.onEnterFrame -> AGame.frameloop -> Snowcraft1Rewrite.frameloop):
    if every GreenSnowDudie in adudies is dead and !gameover:
        if lev == 9: ongameover(win=true); break
        else:        dolevel(lev+1)
    if every RedSnowDudie in adudies is dead and !gameover:
        for green in adudies: green.gameover()    # play "yea"
        ongameover(win=false)
    for ball in snowballs:
        for dudie in adudies:
            if collides(ball, dudie) and team mismatch and not ineffective:
                ball.dead = true
                if green hit: score += 10
                dudie.yougothit()
        if ball off-world or ball.dead: queue removal
        else: ball.frameloop()
    for dudie in adudies: dudie.frameloop()
    sweep removed snowballs
```

### B. dolevel(level)
```
dolevel(level):
    clearbetweenlevels()             # destroy + new array
    this.lev = level
    titles.gotoAndPlay(level==1 ? "seasonsgreetings" : "levelx")
    if level != 1: titles.lev = level
    spawn 3 reds at (start+200, start+100), walking to (start, start)
    for entry in greendudiestartingpoints[level-1]:
        green = new GreenSnowDudie(...)
        green.setposition(entry[0], entry[1])
        green.setwalkendx(entry[2]); green.setwalkendy(entry[3])
        if level==5 or level>6: green.setwalkspeed(10)
        if level==6:            green.setwalkspeed(15)
```

### C. ongameover(win?)
```
elapsedMs = now - starttime
if win and elapsedMs < 1_800_000:
    score += round((1_800_000 - elapsedMs) / 1000)
gameover = true
titles.score = score
titles.gotoAndPlay(win ? "gameoverwin" : "gameoverlose")
dispatchEvent({type:"gameover"})
```

---

## 11. Unknown / ambiguous

- **Sprite-internal frame numbers for "down", "hit", "dead", "yea"** —
  the AS only references frame *labels*. The DefineSprite_85
  (greendudie) and DefineSprite_32 (reddudie) timelines define how many
  frames each animation plays. This spec deliberately omits exact
  durations (e.g. the "down" pose lifetime) — they are timeline-driven,
  not script-driven. Read `decompiled/sprites/` to extract them.
- **Whether scoring shows during play** — `score` is written to
  `this.titles.score` only inside `ongameover(...)`; whether the title
  MovieClip displays it elsewhere is determined by the (timeline)
  `titles` movie's TextField bindings — not visible in AS source.
- **Snowball clean-up between levels** — `clearbetweenlevels()` does NOT
  call `destroy()` on `this.snowballs`. In-flight balls survive the
  level transition. The port should match this unless gameplay testing
  shows it is undesirable.
- **Slow-mo** — `var slomo = 0;` is declared (`Snowcraft1Rewrite.as:19`)
  but never read or written elsewhere. Treat as dead code.
- **`shiftdown`** — set/cleared on Shift key (`:216-227`) but never read.
  Treat as dead code.
- **Cheat code Y-bonus / scoring on cheat-jump levels** — the cheat
  `lv<digit>` calls `dolevel(N)` directly, bypassing `reset()`. `starttime`
  therefore reflects the original game start, not the cheat-jumped level.
  This is a quirk of the source and can be reproduced or fixed depending
  on porting goals.
- **`level == 6` vs. `level > 6` walkspeed precedence** — the source has
  both `if (level==5 || level>6) setwalkspeed(10)` and `if (level==6)
  setwalkspeed(15)`. They are non-overlapping (level 6 cannot satisfy the
  first), so 15 stands for level 6. Confirm in port.
- **Title-card duration** — entirely controlled by the `titles` MovieClip
  timeline (frame counts between the labels and any internal `stop()`
  calls). Not visible in AS. The port must read those frames or hard-code
  empirically.
- **Audio looping** — `sounds` is a single MovieClip with frame labels;
  whether each segment ends with a `stop()` or loops back to frame 1 is
  in its timeline (DoAction tags inside DefineSprite_19 etc.). Not in
  the AS sources reviewed here.

---

## 12. File map for porters

| Concern | File / lines |
|---|---|
| Level table & spawn | `__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as:42-210, :228-283` |
| Frame loop / win-lose | same file `:289-353` |
| Score / time bonus | same file `:410-433` |
| Reset on retry | same file `:444-450` |
| Boot wiring & cheats | `frame_5/DoAction.as:1-37` |
| Domain lock screen | `frame_2/DoAction.as:1-10` |
| Iter counters seed | `frame_1/DoAction.as:5-6` |
| Player class | `__Packages/com/iconnicholson/onehammer/RedSnowDudie.as` |
| Enemy class | `__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as` |
| Base class | `__Packages/com/iconnicholson/onehammer/ASnowDudie.as` |
| Projectile | `__Packages/com/iconnicholson/onehammer/SnowBall.as` |
| Game base | `__Packages/com/iconnicholson/onehammer/AGame.as` |
| FPS / bg / ExportAssets | `decompiled/dump.txt` (line cites in §8) |
