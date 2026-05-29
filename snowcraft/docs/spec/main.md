# SPEC: Snowcraft Main / Document Class & Root Architecture

Faithful-port specification derived **only** from the decompiled ActionScript 2 source under
`approach-4-faithful-port/decompiled/`. All file paths are relative to that directory unless
absolute. All numeric constants are quoted from the original source — no guesses.

---

## 1. SWF-level facts (from SWF header)

| Field        | Value           | Source                                                                  |
|--------------|-----------------|-------------------------------------------------------------------------|
| Signature    | `CWS` (zlib)    | SWF header bytes 0..2 of `approach-3-ruffle/snowcraft.swf`              |
| SWF version  | `8`             | SWF header byte 3                                                        |
| Stage size   | **592 x 320**   | SWF FrameSize rect → 11840/20 x 6400/20 twips                            |
| **Frame rate** | **20 fps**    | SWF FrameRateFixed8 (decompressed body offset 9 = 0x14 0x00 → 20.0)      |
| Root frames  | **5**           | SWF FrameCount = 5; ShowFrame tags 163 / 165 / 166 / 167 / 174           |
| Background   | `0xCCCCCC`      | `dump.txt:2` (`SetBackgroundColor cc cc cc`)                             |

The 20 fps assumption is **load-bearing** — the engine relies on `_root.gamemc.onEnterFrame`
firing 20×/sec for movement integration. All speeds below are pixels/frame at 20 fps.

---

## 2. Document / Main class

There is **no `[Frame(factoryClass=…)]`** — this is AS2 published from Flash. The "main" of
the application is the **root timeline of the SWF** plus three `DoAction` blocks that run on
frames 1, 2, and 5 of that root. The actual game-controller class is
`com.iconnicholson.onehammer.Snowcraft1Rewrite`, instantiated **on root frame 5**.

### 2.1 Exported AS2 packages (from `dump.txt` ExportAssets / DoInitAction)

`dump.txt:1830, 1833, 1836, 1839, 1842, 1845, 1848`

| Class FQN                                                  | DefineSprite ID | Init order |
|------------------------------------------------------------|-----------------|------------|
| `com.iconnicholson.onehammer.AGame`                         | 115             | 1          |
| `mx.events.EventDispatcher`                                 | 116             | 2          |
| `com.iconnicholson.onehammer.Snowcraft1Rewrite`             | 117             | 3          |
| `com.iconnicholson.onehammer.ASnowDudie`                    | 118             | 4          |
| `com.iconnicholson.onehammer.RedSnowDudie`                  | 119             | 5          |
| `com.iconnicholson.onehammer.GreenSnowDudie`                | 120             | 6          |
| `com.iconnicholson.onehammer.SnowBall`                      | 121             | 7          |

These `DoInitAction` blocks all execute *before* root frame-1 code (per SWF spec).

---

## 3. Root timeline scripts

Frame 1, 2, and 5 each carry one `DoAction` block. Frames 3 and 4 are empty pads.

### 3.1 Root frame 1 — `scripts/frame_1/DoAction.as`

```actionscript
// scripts/frame_1/DoAction.as:1-6
var vers = System.capabilities.version.split(" ")[1].split(",")[0];
if(vers < 8)
{
}
_root.comiter   = 19200;   // global "object iter" base for attachMovie depths
_root.grounditer =  1200;  // global "ground/dead-body iter" base for swapDepths
```

Two globals are seeded on `_root`. They are subsequently incremented every time a
new clip is attached (see §6 for usage).

### 3.2 Root frame 2 — `scripts/frame_2/DoAction.as`

```actionscript
// scripts/frame_2/DoAction.as:1-10
var lc = new LocalConnection();
var domain = lc.domain();
trace(domain);
if(domain != "localhost" && domain != "chiudesign.com" &&
   domain != "iconnicholson.com" && domain != "onehammer;com" &&  // (sic)
   domain != "www.chiudesign.com" && domain != "chiudesign.com" &&
   domain != "www.nny.com" && domain != "nny.com" &&
   domain != "nicholsonny.com" && domain != "www.onehammer.com")
{
   _root.titles._visible = true;
   _root.titles.gotoAndPlay("error");
   trace("wfw");
   stop();
}
```

Domain gate. The faithful port should either drop this entirely or replicate it
behind a feature flag (the original error frame is the `titles` MC label `"error"`,
see `dump.txt:1823`).

### 3.3 Root frame 5 — `scripts/frame_5/DoAction.as`

```actionscript
// scripts/frame_5/DoAction.as:1-36
function gameover(eventObject) { trace("game over"); }
stop();
trace("s");
if(!_root.game)
{
   _root.game = new com.iconnicholson.onehammer.Snowcraft1Rewrite(
       _root.floop, _root.gamemc, _root.titles, _root.sounds);
   _root.game.addEventListener("gameover", this);
   _root.game.dolevel(1);
}
else
{
   _root.game.reset();
   _root.game.dolevel(1);
}
var lastkey = "";
var secondfromlastkey = "";
var keyListener = new Object();
keyListener.onKeyDown = function()
{
   if(lastkey == "v" && secondfromlastkey == "l")
   {
      _root.game.dolevel(Number(chr(Key.getAscii())));   // "lv<n>" cheat → jump to level <n>
   }
   if(lastkey == "r" && secondfromlastkey == "c")
   {
      _root.titles._visible = true;
      _root.titles.gotoAndPlay("credits");                // "cr" cheat → credits
      _root.titles._visible = true;
   }
   secondfromlastkey = lastkey;
   lastkey = chr(Key.getAscii());
};
Key.addListener(keyListener);
```

This is the entry point. `dolevel(1)` starts level 1.

### 3.4 Root timeline named children (`PlaceObject2` with name)

`dump.txt:972, 976, 1828, 1866`

| Depth | Instance name | Source clip / DefineSprite | Role                                                        |
|-------|---------------|----------------------------|-------------------------------------------------------------|
| 3     | `sounds`      | id 85                      | Sound bank — labelled MC; gameplay calls `sounds.gotoAndPlay("hit1")` etc. |
| 5     | `floop`       | id 86 (1-frame empty MC)   | Heartbeat clip. `AGame` attaches `onEnterFrame` to this clip. |
| 9     | `titles`      | id 110                     | Overlay/title screens (level intro, error, credits, gameover, halaluja). |
| 7     | `gamemc`      | id 114                     | Stage container — all dudies and snowballs are `attachMovie`'d into this. |

These four are passed to `new Snowcraft1Rewrite(floop, gamemc, titles, sounds)`.

---

## 4. Class architecture (text diagram)

```
                        SWF root timeline (5 frames, 20 fps, 592x320, bg #CCCCCC)
                        ┌──────────────────────────────────────────────────────────┐
                        │ frame 1  comiter=19200, grounditer=1200                  │
                        │ frame 2  domain gate                                     │
                        │ frame 3,4  pad                                           │
                        │ frame 5  new Snowcraft1Rewrite(floop,gamemc,titles,sounds)│
                        │          .dolevel(1) ; Key listener (cheats lv*, cr)     │
                        └────────────────────────────┬─────────────────────────────┘
                                                     │
                                                     ▼
                                       ┌────────────────────────────┐
                  mx.events.           │      AGame  (base)         │
                  EventDispatcher  ◄───┤  - paused = true           │
                  (mixin via           │  - hackparent              │
                   .initialize)        │  - ctor: floop.onEnterFrame│
                                       │      = floopenterframe     │
                                       │    floop.hackparent = this │
                                       │  - frameloop()  (override) │
                                       │  - ongameover()            │
                                       └─────────────▲──────────────┘
                                                     │ extends
                                       ┌─────────────┴──────────────┐
                                       │   Snowcraft1Rewrite        │
                                       │   - lev, score, gameover   │
                                       │   - adudies[]              │
                                       │   - snowballs[]            │
                                       │   - greendudiestartingpoints│
                                       │   - reddudie{1,2,3}start{x,y}│
                                       │   - shiftdown, slomo, starttime│
                                       │   - dolevel(level)         │
                                       │   - throwball(evt)         │
                                       │   - frameloop()  (per tick)│
                                       │   - reset(), clearbetweenlevels│
                                       │   - keydown/keyup (Shift)  │
                                       │   - ongameover(win)        │
                                       └──────┬──────────────┬──────┘
                                              │ creates 3    │ creates N (per level)
                                              ▼              ▼
                                ┌──────────────────────┐   ┌────────────────────────┐
                                │ ASnowDudie (base)    │◄──┤ both children extend    │
                                │  - dudiemc            │   └────────────────────────┘
                                │  - walkendx,walkendy  │
                                │  - walkspeed = 5      │
                                │  - dead, walking      │
                                │  - checkline(...)     │ (clip line constraint)
                                │  - destroy()          │
                                └─────────┬─────────────┘
                                          │ extends
                          ┌───────────────┴────────────────┐
                          ▼                                ▼
            ┌─────────────────────────┐        ┌─────────────────────────────┐
            │ RedSnowDudie  (player)  │        │ GreenSnowDudie  (enemy AI)  │
            │  hitpoints = 2          │        │  hitpoints = 3              │
            │  dazed = 0 (frames)     │        │  balling, cocking           │
            │  swapDepths to top on   │        │  adobefrozenframebugfix=0   │
            │   chosen / drag         │        │  random destination logic   │
            │  attaches "reddudie"    │        │  attaches "greendudie"      │
            │   into stage            │        │   into stage                │
            │  throwball uses meter   │        │  random throw force         │
            │   _currentframe        │        │   0.3 + rand*0.6            │
            │  events: throwball     │        │  events: throwball          │
            └────────────────────────┘        └─────────────────────────────┘
                          │                                  │
                          └────────► dispatch "throwball" ◄──┘
                                          │
                                          ▼
                          ┌─────────────────────────────────┐
                          │   SnowBall                      │
                          │   - ballmc (snowball clip)      │
                          │   - shadowmc (snowballshadow)   │
                          │   - team in {"red","green"}     │
                          │   - force, originalx, originaly │
                          │   - xmov, ymov                  │
                          │   - shadowxmov, shadowymov      │
                          │   - grounddistance = 35         │
                          │   - dead, ineffective           │
                          │   - frameloop() per-tick physics│
                          └─────────────────────────────────┘
```

Heartbeat / tick: `AGame` ctor (`AGame.as:5-10`) sets

```actionscript
floop.onEnterFrame = this.floopenterframe;   // AGame.as:7
floop.hackparent  = this;                    // AGame.as:8
```

so the empty `floop` MovieClip drives `Snowcraft1Rewrite.frameloop()` once per SWF
frame (20 fps). All gameplay happens inside that single per-frame method.

---

## 5. Constants — exact values from source

### 5.1 Globals (`scripts/frame_1/DoAction.as`)

| Name              | Value | Line                              | Purpose                                      |
|-------------------|-------|-----------------------------------|----------------------------------------------|
| `_root.comiter`   | 19200 | `frame_1/DoAction.as:5`           | base depth for attached clips (incremented before each `attachMovie`) |
| `_root.grounditer`|  1200 | `frame_1/DoAction.as:6`           | base depth for "dead body / land" clips      |
| `_root.shadowiter`|   550 | `SnowBall.as:31` (lazy-init)      | base depth for snowball shadows              |

### 5.2 Stage / world geometry

| Name                | Value | Source                                            |
|---------------------|-------|---------------------------------------------------|
| Stage width         | 592   | SWF FrameSize                                     |
| Stage height        | 320   | SWF FrameSize                                     |
| Red drag-clip line  | (592,0) → (0,320) | `RedSnowDudie.as:179` `checkline(592,0,0,320,...)` (player can be dragged only **right of/below** that line) |
| Green wander-clip line | (610,0) → (0,340) | `GreenSnowDudie.as:32` `checkline(610,0,0,340,...,0)` |
| Snowball death bound| `\|x\|>2999 \|\| \|y\|>2999` | `Snowcraft1Rewrite.as:384` |

### 5.3 Snowcraft1Rewrite — fixed reddudie spawn positions

`Snowcraft1Rewrite.as:13-18`

```actionscript
var reddudie1startx = 450;  reddudie1starty = 200;
var reddudie2startx = 420;  reddudie2starty = 260;
var reddudie3startx = 310;  reddudie3starty = 250;
```

`dolevel()` then **walks them in** from offset (+200, +100):

```actionscript
// Snowcraft1Rewrite.as:245-247 (and similarly for dudie 2 & 3)
_loc6_.setwalkendx(this.reddudie1startx);
_loc6_.setwalkendy(this.reddudie1starty);
_loc6_.setposition(this.reddudie1startx + 200, this.reddudie1starty + 100);
```

### 5.4 ASnowDudie defaults

`ASnowDudie.as:8-11`

```actionscript
var didfirstwalk = false;
var dead         = false;
var walking      = false;
var walkspeed    = 5;       // px/frame
```

### 5.5 RedSnowDudie

`RedSnowDudie.as:13-17`

```actionscript
var hitpoints                  = 2;
var dazed                      = 0;
var adobesucksmouseisdownflag  = false;
var dragdudie                  = false;
var olddepth                   = 0;
```

Hit thresholds: `RedSnowDudie.as:72-89`

- 1st hit → `hitpoints == 1` → `dazed = 40` frames; clip plays `"hitdazed"`; `sounds.gotoAndPlay("hit1")` + `sounds.gotoAndPlay("birds")`
- 2nd hit → `hitpoints == 0` → dead; clip plays `"dead"`; sound `"kids" + Math.ceil(Math.random()*3)` (1..3)
- Hitbox in `Snowcraft1Rewrite.frameloop`: `\|ball.x − dudie.x\|<30 && \|ball.y − (dudie.y−20)\|<30` (line 376)

Throw force from charge meter: `RedSnowDudie.as:108-118`

```actionscript
var _loc2_ = 0.001;
if(this.dudiemc.meter._currentframe > 4)
{
   _loc2_ = this.dudiemc.meter._currentframe / 15;     // force = meterFrame / 15
}
// dispatched event:
{ type:"throwball", force:_loc2_, team:"red",
  x: dudie.x, y: dudie.y - 35,
  ineffective: _loc2_ < 0.1 }
```

So minimum effective force is `0.1`, max occurs at meter frame 15 → `force = 1.0`.
Throw spawn point is **35 px above** the dudie origin.

### 5.6 GreenSnowDudie

`GreenSnowDudie.as:12-16`

```actionscript
var balling                = 0;
var cocking                = 0;
var down                   = false;
var hitpoints              = 3;
var adobefrozenframebugfix = 0;
```

Hit thresholds: `GreenSnowDudie.as:43-66`

- 1st hit → `hitpoints == 2` → `justhit=true`, `adobefrozenframebugfix = 50`; clip `"hit"`; sound `"hit1"`
- 2nd hit → `hitpoints == 1` → `down = true`; clip `"down"`; sound `"hit1"`
- 3rd hit → `hitpoints == 0` → dead; clip `"dead"`; sound `"kids" + Math.ceil(Math.random()*3)`

Score: only red→green hits award points.
`Snowcraft1Rewrite.as:369`: `this.score += 10;`

AI cadence (per tick when idle, `frameloop` of `GreenSnowDudie.as`):

```actionscript
// GreenSnowDudie.as:129  (random wander trigger)
if(Math.random() > 0.975 || this.walkendx) { walking = true; ... }

// GreenSnowDudie.as:148-159 (idle ball-up → cock → throw cycle)
if (this.balling > 0) {
    this.balling -= 1;
    if (this.balling <= 0) {
        this.dudiemc.gotoAndStop("cock");
        this.cocking = 15 + Math.round(Math.random() * 30);   // cock: 15..45 frames
    }
    return;
}
this.dudiemc.gotoAndStop("balling");
this.balling = 10 + Math.round(Math.random() * 50);            // ball-up: 10..60 frames

// GreenSnowDudie.as:120-124  (cock countdown → throw)
if (this.cocking == 10) { dudiemc.gotoAndStop("toss"); this.throwball(); }
```

Throw force: `GreenSnowDudie.as:163` → `force = 0.3 + Math.random() * 0.6` (range 0.3..0.9).
Throw origin: `(dudie.x, dudie.y − 15)` (line 163).

Per-level walk-speed override (`Snowcraft1Rewrite.as:273-280`):

| Level | walkspeed override |
|-------|--------------------|
| 1..4  | (default = 5)      |
| 5     | 10                 |
| 6     | 15                 |
| 7..   | 10                 |

When `titles._visible` (intro/outro overlay), greens slow down: `walkspeed = 3`
(`GreenSnowDudie.as:100`).

Hitbox in `Snowcraft1Rewrite.frameloop` (red→green): `\|ball.x − dudie.x\|<30 && \|ball.y − (dudie.y−20)\|<30`
(line 366), additionally requires `!_loc4_.dead && !_loc4_.down && !_loc2_.ineffective`.

### 5.7 SnowBall physics (`SnowBall.as`)

Constants and per-team initial velocity (`SnowBall.as:17, 43-52`):

```actionscript
var grounddistance = 35;   // shadow offset below ball at spawn

if (team == "red")   { xmov = shadowxmov = -20;  ymov = shadowymov = -10; }
if (team == "green") { xmov = shadowxmov =  20;  ymov = shadowymov =  10; }
```

Sound on launch: `force >= 1` → `"longthrow"`, else `"throw"` (`SnowBall.as:53-60`).

Per-tick physics (`SnowBall.as:67-134`):

#### Red (player) trajectory
```actionscript
if (this.ymov > -3)  this.ineffective = true;                          // line 75-78
if (this.ymov > -2 && this.ymov < 50) {                                // line 79-86
    this.ymov = 51;
    this.ballmc._visible = false;
    this.shadowmc.gotoAndPlay("land");
    this.sounds.gotoAndPlay("splat");
    return;
}
if (this.ymov > 50) {                                                  // line 87-95
    this.ymov += 1;                            // gravity tail (+1/frame)
    if (this.ymov > 100) this.dead = true;
    return;
}
if (this.force != 1 && this.originalx - this.ballmc._x > this.force * 100) {
    this.ymov  += 3 - this.force;              // gravity onset
    this.force -= this.force * 0.15;           // air drag on force
}
```

#### Green (AI) trajectory
```actionscript
if (this.ymov > 17) this.ineffective = true;                           // line 104-107
if (this.ymov > 18 && this.ymov < 50) { ... shadow.land; return; }     // line 108-114 (no splat sound)
if (this.ymov > 50)  { this.ymov += 1;  if (>100) dead; return; }     // line 115-123
if (this.force < 1 && Math.abs(this.originalx - this.ballmc._x) > this.force * 300) {
    this.ymov  += 2 - this.force;
    this.force -= this.force * 0.15;
}
```

Universal step (after team-branch, `SnowBall.as:130-133`):

```actionscript
this.ballmc._x   += this.xmov;
this.ballmc._y   += this.ymov;
this.shadowmc._x += this.shadowxmov;
this.shadowmc._y += this.shadowymov;
```

> **Note**: red ball xmov stays at -20 forever (no x-decel), green xmov stays at +20. Only
> `ymov` is mutated by gravity. The horizontal range is therefore controlled by *when*
> gravity kicks in, gated by the `force * 100` (red) or `force * 300` (green) threshold.

### 5.8 Score / time bonus

`Snowcraft1Rewrite.as:410-422`

```actionscript
function ongameover(win) {
   var _loc3_ = new Date();
   var _loc2_ = _loc3_.getTime() - this.starttime.getTime();   // ms since reset()
   if (win) {
      if (_loc2_ < 1800000)                                    // 1,800,000 ms = 30 min
         this.score += Math.round((1800000 - _loc2_) / 1000);  // +1 point per second saved
   }
   ...
}
```

### 5.9 Levels

`Snowcraft1Rewrite.as:41-210` — `greendudiestartingpoints` is an Array indexed `[level-1]`,
each entry being an Array of `[startX, startY, walkEndX, walkEndY]` quadruples.

| Level (1-based) | # green dudies | Notes (verbatim line refs)                                        |
|------|----|--------------------------------------------------------------------------------|
| 1    |  3 | `Snowcraft1Rewrite.as:42-45`                                                    |
| 2    |  5 | `:46-51`                                                                        |
| 3    |  7 | `:52-59`                                                                        |
| 4    |  9 | `:60-69` (the last two are duplicates of `:[5][6]` — appears intentional)       |
| 5    | 12 | `:70-95` — second `[4]` block at :83-95 **overwrites** :70-82 (bug? or intent), then a transform loop `:96-102` shifts each entry by `(−400, −200)` from its `(walkEndX, walkEndY)`. Defaults `walkspeed = 10`. |
| 6    | 12 | `:103-130` — first 6 spawn from x = `−450 − i*8` at the entry's walkEndY; last 6 spawn at the entry's walkEndX with y = `−350 − i*8`. Defaults `walkspeed = 15`. |
| 7    | 12 | `:131-163` — uses `[4].length` (=12) loop bound; halves into top-3 / mid-3 / outer-6. Defaults `walkspeed = 10`. |
| 8    | 12 | `:164-188` — copies `[6]` end-points then shifts top-6 from `[+6][2]+150, [+6][3]−150`; transform `(−400,−200)`. Default `walkspeed = 10`. |
| 9 (Bonus) | 50 | `:189-210` — loop pushes 50 entries `(-50,100, 50+rand*200, 50+rand*200)`. First 10 transformed by `(−400,−200)`, rest only x by `−400`. (Title text: `"Bonus Round"`, `DefineSprite_110/frame_74`.) |

**Last level**: `if (this.lev == this.greendudiestartingpoints.length) ongameover(true);`
`Snowcraft1Rewrite.as:309-311`. Length = 9 → game ends after level 9.

> Note: the source has a clear off-by/copy-paste anomaly at `:83-95` where `[4]` is reset.
> Faithful port should reproduce as-is.

---

## 6. Asset / clip / sound IDs

### 6.1 Library symbols (`ExportAssets`, `dump.txt`)

| `chid` | Export name        | Used as                                     |
|--------|--------------------|---------------------------------------------|
| 8      | `selectioncircle`  | Hover/selection ring on red dudie (`RedSnowDudie.as:23`)  |
| 32     | `reddudie`         | `stage.attachMovie("reddudie", ...)` → `RedSnowDudie.as:22` |
| 35     | `snowball`         | `stage.attachMovie("snowball", ...)` → `SnowBall.as:37` |
| 48     | `snowballshadow`   | `stage.attachMovie("snowballshadow", ...)` → `SnowBall.as:34` |
| 69     | `greendudie`       | `stage.attachMovie("greendudie", ...)` → `GreenSnowDudie.as:21` |

### 6.2 `reddudie` (DefineSprite 32) frame labels

`dump.txt:137-206` — the player-character clip uses these labels referenced by AS:

| Label       | Used by                                                                   |
|-------------|---------------------------------------------------------------------------|
| `rest`      | (initial)                                                                  |
| `ready`     | `RedSnowDudie.as:106, 142, 171` (idle pose)                                |
| `cock`      | `RedSnowDudie.as:64` (`onchosen` → `gotoAndPlay("cock")`)                 |
| `toss`      | `RedSnowDudie.as:128` (`mouserelease` → `gotoAndStop("toss")`)            |
| `hitdazed`  | `RedSnowDudie.as:76` (after first hit)                                    |
| `dazed`     | (transition target from frame 15 of `reddudie`)                            |
| `dead`      | `RedSnowDudie.as:87`                                                       |
| `walk`      | `RedSnowDudie.as:159`                                                      |

The `meter` child clip inside reddudie controls throw force (1..15 frames) — see frame_3
(`meter.gotoAndPlay(1); meter._visible = true; stop();`) at
`scripts/DefineSprite_32_reddudie/frame_3/DoAction.as`.

### 6.3 `greendudie` (DefineSprite 69) frame labels

`dump.txt:382-519`

| Label       | Used by                                                       |
|-------------|---------------------------------------------------------------|
| `walk`      | `GreenSnowDudie.as:132` (also frame_31 of greendudie)         |
| `ready`     | (legacy)                                                       |
| `balling`   | `GreenSnowDudie.as:97, 158`                                   |
| `cock`      | `GreenSnowDudie.as:153`                                       |
| `toss`      | `GreenSnowDudie.as:122`                                       |
| `hit`       | `GreenSnowDudie.as:48`                                        |
| `midrecover`| frame_57 → `gotoAndStop("midrecover"); play();` (recovery branch from `down`) |
| `down`      | `GreenSnowDudie.as:54`                                        |
| `dead`      | `GreenSnowDudie.as:60`                                        |
| `yea`       | `GreenSnowDudie.as:71` (victory taunt on game-over-lose)       |
| `yealoop`   | frame_78, frame_98 of greendudie (loop the taunt)              |

### 6.4 `sounds` MC (DefineSprite 85) — labels and how they are triggered

`dump.txt:579-890`

| Label         | Triggered from                                                                       |
|---------------|-------------------------------------------------------------------------------------|
| `step`        | `RedSnowDudie.as:150`, `GreenSnowDudie.as:112` (footstep while walking)              |
| `goodbadugly` | `DefineSprite_110/frame_74` (level intro music: `_root.sounds.gotoAndPlay("goodbadugly")`) |
| `throw`       | `SnowBall.as:59` (force < 1)                                                         |
| `longthrow`   | `SnowBall.as:55` (force >= 1)                                                        |
| `hit1`        | `RedSnowDudie.as:77`, `GreenSnowDudie.as:49,55`                                      |
| `kids1` / `kids2` / `kids3` | `RedSnowDudie.as:88`, `GreenSnowDudie.as:65` (`"kids" + Math.ceil(Math.random()*3)` on death) |
| `laugh`       | `DefineSprite_69_greendudie/frame_78` (greens taunt on game-over-lose)               |
| `laugh2`      | same — 50/50 alternative                                                              |
| `splat`       | `SnowBall.as:84` (red ball lands)                                                    |
| `birds`       | `RedSnowDudie.as:78` (after first hit, dazed bird-tweet)                             |
| `halaluja`    | `DefineSprite_110/frame_290` (`_root.sounds.gotoAndPlay("halaluja")` on win celebration) |

### 6.5 `titles` MC (DefineSprite 110) — labels

`dump.txt:1072-1823`

| Label              | Triggered from                                                                  |
|--------------------|---------------------------------------------------------------------------------|
| `seasonsgreetings` | `Snowcraft1Rewrite.dolevel(1)` → `titles.gotoAndPlay("seasonsgreetings")` (`Snowcraft1Rewrite.as:234`) |
| `levelx`           | `Snowcraft1Rewrite.dolevel(level>1)` → `titles.gotoAndPlay("levelx")`. The MC reads `this.lev` and writes `levelfade.levelx.text = "Level " + this.lev` (or `"Bonus Round"` if 9) at `DefineSprite_110/frame_74`. |
| `gameoverlose`     | `Snowcraft1Rewrite.ongameover(false)` (`:429`)                                  |
| `gameoverwin`      | `Snowcraft1Rewrite.ongameover(true)` (`:425`)                                   |
| `halaluja`         | internal at frame 556                                                            |
| `credits`          | root frame 5 cheat handler (`frame_5/DoAction.as:30`)                            |
| `error`            | `frame_2/DoAction.as:7` (domain gate)                                            |

The win/lose end-cards (`DefineSprite_110/frame_253` and `:358`) wire up:

```actionscript
this.fromyour.scorebox.text = "SCORE: " + this.score;
this.fromyour.playagain.onRelease = function() { me._visible = false; _root.gotoAndPlay(1); };
this.fromyour.visit.onRelease     = function() { getURL("http://www.iconnicholson.com","_blank"); };
this.fromyour.creditsblock.onRelease = function() { _root.titles._visible=true; _root.titles.gotoAndPlay("credits"); };
```

Score is set just before via `Snowcraft1Rewrite.as:422`: `this.titles.score = this.score;`.

---

## 7. Algorithm pseudocode

### 7.1 Per-tick game loop (`Snowcraft1Rewrite.frameloop`, lines 289-409)

```
// Driven by floop.onEnterFrame at 20 fps.

// (1) Win check: any GreenSnowDudie not dead?
allGreensDead = true
for d in adudies:
    if d is GreenSnowDudie and not d.dead:
        allGreensDead = false; break
if allGreensDead and not gameover:
    if lev == greendudiestartingpoints.length:   // = 9
        ongameover(win=true)
    else:
        dolevel(lev + 1)

// (2) Lose check: any RedSnowDudie not dead?
allRedsDead = true
for d in adudies:
    if d is RedSnowDudie and not d.dead:
        allRedsDead = false; break
if allRedsDead and not gameover:
    for d in adudies if d is GreenSnowDudie and not d.dead:
        d.gameover()              // plays "yea"
    ongameover(win=false)

// (3) Snowball collisions + cleanup
toRemove = []
for i, b in snowballs:
    for d in adudies:
        if d is GreenSnowDudie:
            if b.team == "red"
               and |b.ball.x - d.dudie.x| < 30
               and |b.ball.y - (d.dudie.y - 20)| < 30
               and not d.dead and not d.down
               and not b.dead and not b.ineffective:
                b.dead = true
                score += 10
                d.yougothit()
        elif d is RedSnowDudie:
            if b.team == "green"
               and |b.ball.x - d.dudie.x| < 30
               and |b.ball.y - (d.dudie.y - 20)| < 30
               and not d.dead and not b.dead and not b.ineffective:
                b.dead = true
                d.yougothit()
    if |b.ball.x| > 2999 or |b.ball.y| > 2999 or b.dead:
        toRemove.push(i)
    else:
        b.frameloop()

// (4) Tick all dudies
for d in adudies:
    d.frameloop()

// (5) Destroy dead snowballs
for i in toRemove:
    snowballs[i].destroy()
    snowballs.splice(i, 1)
```

### 7.2 `dolevel(level)` (lines 228-283)

```
clearbetweenlevels()                  // destroy all dudies, adudies = []
this.lev = level
if level == 1: titles.gotoAndPlay("seasonsgreetings")
else:         titles.lev = level; titles.gotoAndPlay("levelx")

// 3 reds, fixed positions, walk in from (+200, +100)
for i in [1,2,3]:
    r = new RedSnowDudie(stage, sounds)
    r.addEventListener("throwball", this)
    adudies.push(r)
    r.setwalkendx(reddudie<i>startx)
    r.setwalkendy(reddudie<i>starty)
    r.setposition(reddudie<i>startx + 200, reddudie<i>starty + 100)

// N greens per level table
for entry in greendudiestartingpoints[level - 1]:
    g = new GreenSnowDudie(stage, sounds, titles)
    adudies.push(g)
    g.addEventListener("throwball", this)
    g.setposition (entry[0], entry[1])
    g.setwalkendx(entry[2])
    g.setwalkendy(entry[3])
    if level == 5 or level > 6: g.setwalkspeed(10)
    if level == 6:              g.setwalkspeed(15)
```

### 7.3 `RedSnowDudie.frameloop` (lines 130-183)

```
if dead: return
if walking:
    if |x - walkendx| < 10 and |y - walkendy| < 10:
        walking = false
        walkendx = walkendy = 0
        clip.gotoAndStop("ready")
    else:
        x += walkxmov; y += walkymov
        if sounds._currentframe == 1: sounds.gotoAndPlay("step")
    return

if walkendx:                                   // begin walk
    walking = true
    clip.gotoAndPlay("walk")
    dist  = sqrt((walkendy-y)^2 + (walkendx-x)^2)
    walkxmov = (walkendx - x) / (dist / walkspeed)   // walkspeed = 5 px/frame default
    walkymov = (walkendy - y) / (dist / walkspeed)
    return

if dazed:
    dazed -= 1
    if dazed == 0: clip.dazed = false; clip.gotoAndStop("ready")

if mouseDownFlag and dragdudie:                // user is dragging
    x = stage._xmouse; y = stage._ymouse
    [x, y] = checkline(592, 0, 0, 320, x, y, less=1)   // clamp to lower-right of line
```

`checkline` (`ASnowDudie.as:47-67`):

```
slope     = (y2 - y1) / (x2 - x1)
x_on_line = (y - y1) / slope + x1
if less: if x < x_on_line: x = x_on_line     // clamp to ≥ line
else:    if x > x_on_line: x = x_on_line
return [x, y]
```

### 7.4 `RedSnowDudie.onchosen` (lines 49-65)

```
if dudie.dazed or dead or walking: return
mouseDownFlag = true
if dudie.depth < highestreddudie.depth:
    dudie.swapDepths(highestreddudie)        // bring to front
highestreddudie = this.dudie
dispatch("chosen")
dragdudie = true
dudie.gotoAndPlay("cock")                    // starts charging meter
```

### 7.5 `GreenSnowDudie.frameloop` (lines 73-160)

```
if dead: return
if dudie.down: return
down = false
if dudie.justhit:
    adobefrozenframebugfix -= 1
    if adobefrozenframebugfix < 0: dudie.justhit = false
    return
if walking:
    if |x - walkendx| < 10 and |y - walkendy| < 10:
        clip.gotoAndStop("balling")
        if titles._visible:
            walkspeed = 3
            return
        walking = false; walkendx = walkendy = 0
    else:
        x += walkxmov; y += walkymov
        if sounds._currentframe == 1: sounds.gotoAndPlay("step")
    return
if cocking > 0:
    cocking -= 1
    if cocking == 10:
        clip.gotoAndStop("toss")
        throwball()                          // dispatch throwball event
    return
if Math.random() > 0.975 or walkendx:
    walking = true
    clip.gotoAndPlay("walk")
    if not walkendx: [walkendx, walkendy] = randomdestinationwithinboundaries()
    dist  = sqrt(...)
    walkxmov = (walkendx - x) / (dist / walkspeed)
    walkymov = (walkendy - y) / (dist / walkspeed)
    return
if titles._visible: return                   // pause AI during overlays
if balling > 0:
    balling -= 1
    if balling <= 0:
        clip.gotoAndStop("cock")
        cocking = 15 + round(rand() * 30)
    return
clip.gotoAndStop("balling")
balling = 10 + round(rand() * 50)
```

`randomdestinationwithinboundaries` (lines 27-36):

```
x = rand() * 500
y = rand() * 300
[x, y] = checkline(610, 0, 0, 340, x, y, less=0)    // clamp to upper-left of line
return [x, y]
```

### 7.6 `SnowBall.frameloop` (lines 67-134) — full pseudocode

(For exact constants see §5.7; here is the high-level flow.)

```
if dead: return
if team == "red":
    if ymov > -3:        ineffective = true
    if -2 < ymov < 50:   ymov = 51; ball.visible=false; shadow.gotoAndPlay("land"); sounds.play("splat"); return
    if ymov > 50:        ymov += 1; if ymov > 100: dead = true; return
    if force != 1 and (originalx - ball.x) > force * 100:
                         ymov  += 3 - force
                         force -= force * 0.15
elif team == "green":
    if ymov > 17:        ineffective = true
    if 18 < ymov < 50:   ymov = 51; ball.visible=false; shadow.gotoAndPlay("land"); return
    if ymov > 50:        ymov += 1; if ymov > 100: dead = true; return
    if force < 1 and |originalx - ball.x| > force * 300:
                         ymov  += 2 - force
                         force -= force * 0.15
ball.x   += xmov
ball.y   += ymov
shadow.x += shadowxmov
shadow.y += shadowymov
```

---

## 8. EventDispatcher contract

`mx.events.EventDispatcher.initialize(this)` is called in every constructor that
participates (AGame, ASnowDudie, RedSnowDudie, GreenSnowDudie, Snowcraft1Rewrite). It
attaches `addEventListener / removeEventListener / dispatchEvent / dispatchQueue` as
instance methods.

Events used in the codebase:

| Event       | Dispatcher                          | Listener                               | Payload (verbatim)                                                                                |
|-------------|--------------------------------------|----------------------------------------|---------------------------------------------------------------------------------------------------|
| `throwball` | `RedSnowDudie.throwball` (`:116`)   | `Snowcraft1Rewrite.throwball` (`:284`) | `{target, type:"throwball", force, team:"red", x, y:y-35, ineffective: force<0.1}`                |
| `throwball` | `GreenSnowDudie.throwball` (`:163`) | `Snowcraft1Rewrite.throwball` (`:284`) | `{target, type:"throwball", force:0.3+rand*0.6, team:"green", x, y:y-15}` (no `ineffective` flag) |
| `chosen`   | `RedSnowDudie.onchosen` (`:61`)     | (no listener registered in source)     | `{target, type:"chosen"}`                                                                          |
| `gameover`  | `Snowcraft1Rewrite.ongameover` (`:431`) | root-frame-5 `gameover()` stub (`frame_5/DoAction.as:1`) | `{target, type:"gameover"}` |

`Snowcraft1Rewrite.throwball(eventObject)` simply spawns a `SnowBall`:

```actionscript
// Snowcraft1Rewrite.as:284-288
function throwball(eventObject) {
   var _loc3_ = new com.iconnicholson.onehammer.SnowBall(
      this.stage, this.sounds, eventObject.team, eventObject.force,
      eventObject.x, eventObject.y, eventObject.ineffective);
   this.snowballs.push(_loc3_);
}
```

---

## 9. Cheat keys (root frame 5)

`scripts/frame_5/DoAction.as:18-36`

- Type `lv<digit>` → `_root.game.dolevel(Number(<digit>))` (only one digit; relies on
  `Number(chr(Key.getAscii()))`, so 0..9).
- Type `cr` → opens `titles` and `gotoAndPlay("credits")`.

---

## 10. Implementation notes for the porting team

1. **Tick rate must be locked at 20 Hz** for movement constants to feel right.
   The original integrates positions in pixels-per-frame at exactly 20 fps.
2. **Event-driven `throwball`** is the sole communication path from dudies to the game
   controller; preserve the payload shape if you mirror the AS event API.
3. **Depth management** is hand-rolled via `comiter` (clips), `grounditer` (dead bodies +
   "land" shadows), and `shadowiter` (ball shadows). Faithful port should reproduce z-order
   semantics (dragged red dudie always on top of other reds; dead bodies pushed to lower
   layer).
4. **Hitboxes** are 30-px AABB centered on `(dudie.x, dudie.y - 20)`.
5. **Ball spawn origin**: red `(x, y - 35)`, green `(x, y - 15)`. Note the asymmetry.
6. **No traditional gravity constant**: `ymov` accumulates a per-frame delta of
   `(3 - force)` (red) or `(2 - force)` (green) only after a horizontal-distance gate.
   Simulation is *not* physically Newtonian — keep the branch structure verbatim.
7. **`titles._visible` pauses AI and slows greens** (walkspeed = 3) — see
   `GreenSnowDudie.as:98-101, 144-147`. Don't skip this; level intros depend on it.
8. **Reds are draggable** anywhere below/right of the line `(592,0)→(0,320)` while the
   meter charges. Charge-meter frame (1..15) determines force `frame/15` (`> 4` for
   "effective"). Clip `meter` is internal to `reddudie` (DefineSprite 32).
9. **Win condition**: all greens dead. After level 9 → `ongameover(true)` with score
   bonus = `round((1,800,000 - elapsedMs) / 1000)` if `elapsedMs < 1,800,000` (30 min).
10. **Lose condition**: all reds dead.

---

## 11. Unknown / ambiguous

Items the source does **not** unambiguously specify; flag during porting:

1. **Anomaly at `Snowcraft1Rewrite.as:83-95`**: `greendudiestartingpoints[4]` is
   defined twice — the second definition wins. Faithful port should reproduce the
   second block, but it's unclear if this was intentional.
2. **`Snowcraft1Rewrite.as:145, 178, 197`** loop bounds use
   `this.greendudiestartingpoints[4].length` (=12) while iterating `[6]`, `[7]`, or
   `[8]`. This means the transform loop for level 6 only touches the first 12 entries
   (which is also the length of `[6]`, OK) — but for `[8]` (which has 50 entries) only
   the first 12 are transformed. The remaining 38 keep raw `(50+rand*200, 50+rand*200)`
   walk-end coords with `(-50,100)` start positions. The bonus round behavior in the
   original is therefore "12 transformed + 38 raw". Confirm against gameplay video.
3. **`Snowcraft1Rewrite.as:215-227` `keydown/keyup` handler** only tracks Shift (16).
   `shiftdown` is set but **never read** elsewhere in the decompiled source. The
   `slomo` field (initialized 0) is also never written/read after construction. They
   may have been planned features. Faithful port can stub them.
4. **`Snowcraft1Rewrite.as:431`** dispatches `"gameover"` event but the only listener is
   the trivial `gameover(eventObject) { trace("game over"); }` in `frame_5/DoAction.as`.
   Faithful port can omit this listener UI-side.
5. **No frame-rate adjustment logic** in source — physics constants are calibrated to
   exactly 20 fps. Running the port at a different rate is out-of-scope of "faithful".
6. **`AGame.as:4` `paused = true`** field is never read. Looks vestigial; safe to ignore.
7. **`ASnowDudie.didfirstwalk` / `walking`** declared but `didfirstwalk` is never used
   in the source. Ignore.
8. **Sound clip frame numbers** (e.g. `kids2 = 124`) — the spec only references *labels*;
   the WAV/MP3 file mapping inside `DefineSprite_85` is implicit and was likely produced
   by the asset author. Use the exported `decompiled/sounds/72.mp3 .. 84.mp3` set
   1:1, ordered by their position inside the timeline; final mapping has to be
   verified by ear or by reading SoundStreamHead positions inside `DefineSprite_85`.
9. **`reddudie.meter` clip** internals: AS code uses `meter._currentframe` as a 1..15
   integer charge gauge. The exact tween (linear / non-linear) is in the timeline of
   the meter MC inside DefineSprite 32 — not visible in scripts. Treat as linear unless
   visual tests say otherwise.
10. **`GreenSnowDudie.adobefrozenframebugfix = 50`** is described in the source as a
    workaround for a Flash bug. Modern engines won't have that bug; faithful port
    should still keep the 50-frame "just hit" stun window because gameplay timing
    depends on it.
11. **The `slomo` field** suggests an unimplemented slow-motion power. No code path sets
    it to non-zero. Ignore.
12. **Domain gate** at `frame_2/DoAction.as` — almost certainly not desired in the
    faithful port; replicate behind a flag or remove.
