# Player Character — Faithful Port Spec

Scope: everything a porting team needs to reproduce the **player-controllable Red Snow Dudie** and its NPC counterpart **Green Snow Dudie** (the AI uses an almost-identical movement core, included for parity). All numbers and code snippets are taken verbatim from the decompiled ActionScript 2 in `decompiled/scripts/scripts/`. Lines are cited as `<file>:<line>`.

> Path prefix used in citations:
> `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/`
> abbreviated as `pkg/` below. Frame‑script DoActions live under
> `decompiled/scripts/scripts/DefineSprite_<id>_<name>/frame_<n>/DoAction.as`.

---

## 1. Class Hierarchy

```
AGame
└── Snowcraft1Rewrite          (game controller — owns dudie array, key listener, frameloop)
ASnowDudie                     (abstract base — walk math, line clipping, destroy)
├── RedSnowDudie               (PLAYER, mouse-driven)
└── GreenSnowDudie             (NPC enemy, AI-driven)
SnowBall                       (projectile spawned by either dudie)
```

Sources:
- `pkg/ASnowDudie.as` (1–73)
- `pkg/RedSnowDudie.as` (1–185)
- `pkg/GreenSnowDudie.as` (1–167)
- `pkg/Snowcraft1Rewrite.as` (1–452)
- `pkg/AGame.as` (1–33)
- `pkg/SnowBall.as` (1–136)

The frame loop is driven from a hidden MovieClip named `floop` whose `onEnterFrame` calls `frameloop()` (`pkg/AGame.as:6-8`). Ticks are therefore one-per-SWF-frame; **the SWF stage frame rate governs all "per-tick" constants below.**

---

## 2. Stage / Coordinate Space

All gameplay coordinates come from the AS code (no stage rect tag is exported in `dump.txt`):

| Constant | Value | Source |
|---|---|---|
| Player drag clamp polygon (Red) | line `(592,0) → (0,320)`, keep mouse below the line (`less = 1`) | `RedSnowDudie.as:179` (`this.checkline(592,0,0,320,..., 1)`) |
| Green destination clamp polygon | line `(610,0) → (0,340)`, keep destination above the line (`less = 0`) | `GreenSnowDudie.as:32` (`this.checkline(610,0,0,340,..., 0)`) |
| Random Green destination range | `x ∈ [0, 500)`, `y ∈ [0, 300)` | `GreenSnowDudie.as:30-31` |
| Off-stage snowball cull | `|x| > 2999 OR |y| > 2999` | `Snowcraft1Rewrite.as:384` |
| Red player spawn (animated walk-in) | spawned at `(start+200, start+100)` then walks to `(start, start)` for: `(450,200)`, `(420,260)`, `(310,250)` | `Snowcraft1Rewrite.as:13-18, 245-259` |

The SetBackgroundColor in `dump.txt:1-2` is `cc cc cc` (light gray). No explicit Show/Header rect was retrievable from the dump, so the stage size itself is **unknown** (see §11).

---

## 3. Constants — Player (`RedSnowDudie`)

| Field | Value | Source |
|---|---|---|
| `hitpoints` (initial) | **2** | `RedSnowDudie.as:13` |
| `dazed` cooldown timer (ticks) | **40** ticks after first hit | `RedSnowDudie.as:74` |
| `walkspeed` (inherited default) | **5** px/tick | `ASnowDudie.as:11` |
| Arrival tolerance (walk end test) | `< 10` px on each axis | `RedSnowDudie.as:138` |
| Drag clamp line | `checkline(592,0,0,320, x, y, 1)` | `RedSnowDudie.as:179` |
| Hitbox vs ball (collision rect, half-extent) | **30** px on each axis, vs ball at `(player._x, player._y - 20)` | `Snowcraft1Rewrite.as:376` |
| Ball spawn offset on throw | `(player._x, player._y - 35)` | `RedSnowDudie.as:116` |
| Throw force formula | `meter._currentframe / 15` if `meter._currentframe > 4`, else `0.001` | `RedSnowDudie.as:110-114` |
| Ineffective throw threshold | `force < 0.1` flag set on ball | `RedSnowDudie.as:116` |

> "Dazed" state: when first hit, the dudie shows `hitdazed`/`dazed` clip and is locked out of input for **40 ticks**.

### Inherited base (`ASnowDudie`)

| Field | Value | Source |
|---|---|---|
| `walkspeed` | **5** | `ASnowDudie.as:11` |
| `didfirstwalk` | `false` | `ASnowDudie.as:8` |
| `dead` | `false` | `ASnowDudie.as:9` |
| `walking` | `false` | `ASnowDudie.as:10` |

`ASnowDudie.checkline(x1,y1,x2,y2, x,y, less)` clamps a point against the line through `(x1,y1)–(x2,y2)`:
- compute slope `m = (y2-y1)/(x2-x1)`
- compute the line's `x` at the queried `y`: `x_on_line = (y - y1)/m + x1`
- if `less == true`, force `x >= x_on_line`; else force `x <= x_on_line`
- (`ASnowDudie.as:47-67`)

---

## 4. Constants — Green Dudie (NPC, included for parity)

| Field | Value | Source |
|---|---|---|
| `hitpoints` (initial) | **3** | `GreenSnowDudie.as:15` |
| `walkspeed` (default) | **5** (inherited) | `ASnowDudie.as:11` |
| `walkspeed` override on level 5 / >6 | **10** | `Snowcraft1Rewrite.as:273-275` |
| `walkspeed` override on level 6 | **15** | `Snowcraft1Rewrite.as:277-279` |
| `adobefrozenframebugfix` after hit | **50** ticks | `GreenSnowDudie.as:47` |
| Random destination range | `x ∈ [0,500)`, `y ∈ [0,300)` (then clipped) | `GreenSnowDudie.as:29-35` |
| AI: probability of starting a walk per tick when idle | `Math.random() > 0.975` (≈ 2.5 %) | `GreenSnowDudie.as:129` |
| AI: ball-up timer (`balling`) | `10 + round(rand()*50)` ticks | `GreenSnowDudie.as:159` |
| AI: cock timer (`cocking`) | `15 + round(rand()*30)` ticks | `GreenSnowDudie.as:154` |
| AI: throws when `cocking == 10` | fixed | `GreenSnowDudie.as:120-123` |
| Throw force | `0.3 + rand() * 0.6` | `GreenSnowDudie.as:163` |
| Ball spawn offset | `(self._x, self._y - 15)` | `GreenSnowDudie.as:163` |
| Hitbox vs ball | half-extent **30** px on each axis vs ball at `(green._x, green._y - 20)` | `Snowcraft1Rewrite.as:366` |
| Walk-end tolerance | `< 10` on each axis | `GreenSnowDudie.as:95` |
| If `titles._visible`, on-arrival reduce walkspeed | `walkspeed = 3` | `GreenSnowDudie.as:100` |

---

## 5. Controls — Key Codes & Mouse

The player's primary controls are **mouse-driven**, not keyboard.

### 5.1 Mouse handlers on the Red Dudie clip

```as2
this.dudiemc.onPress    = this.redpress;     // RedSnowDudie.as:26
this.dudiemc.onRelease  = this.redrelease;   // RedSnowDudie.as:27
this.dudiemc.onRollOver = this.redrollover;  // RedSnowDudie.as:29
this.dudiemc.onRollOut  = this.redrollout;   // RedSnowDudie.as:30
```

Behaviour:

| Event | Method called | Effect |
|---|---|---|
| `onRollOver` | `mouseover()` | shows `selectioncircle`; ignored if dazed/dead/walking (`RedSnowDudie.as:91-98`) |
| `onRollOut` | `mouserollout()` | hides `selectioncircle`, plays `ready` (`RedSnowDudie.as:99-107`) |
| `onPress` | `onchosen()` | swaps depth to top, dispatches `chosen` event, sets `dragdudie = true`, plays `cock` clip (`RedSnowDudie.as:49-65`) |
| `onRelease` | `mouserelease()` | clears drag flags; if not dazed/dead/walking, calls `throwball()` and plays `toss` (`RedSnowDudie.as:119-129`) |

While `dragdudie && adobesucksmouseisdownflag` the dudie is teleported to `(stage._xmouse, stage._ymouse)` then clipped by `checkline(592,0,0,320, …, 1)` (`RedSnowDudie.as:175-182`). The throw power "meter" lives inside the dudie clip as a child movieclip named `meter`; its `_currentframe` is sampled at release to compute force (`RedSnowDudie.as:110-114`).

### 5.2 Key codes (all of them)

The game has only **two keyboard inputs**, both wired in `Snowcraft1Rewrite`:

```as2
_loc5_.onKeyDown = function() { me.keydown(Key.getCode()); };  // Snowcraft1Rewrite.as:32
_loc5_.onKeyUp   = function() { me.keyup(Key.getCode()); };    // Snowcraft1Rewrite.as:36
Key.addListener(_loc5_);                                       // Snowcraft1Rewrite.as:40

function keydown(k){ if(k == 16){ this.shiftdown = true; }   } // Snowcraft1Rewrite.as:214-220
function keyup  (k){ if(k == 16){ this.shiftdown = false; }  } // Snowcraft1Rewrite.as:221-227
```

| Key | Code | Effect |
|---|---|---|
| **Shift** | `16` | sets `shiftdown` flag on game controller. *(Flag is written but not read by any source in this package — see Unknown.)* |

There are also two **debug cheat sequences** registered on a separate Key listener in the root frame‑5 script (`scripts/frame_5/DoAction.as:18-36`):

| Sequence | Effect |
|---|---|
| `l`, `v`, `<digit>` | `_root.game.dolevel(Number(digit))` — jump to level N |
| `c`, `r`, any | shows `titles` and plays `credits` |

These use ASCII characters (`Key.getAscii()` / `chr()`), not key codes.

---

## 6. Movement Physics

### 6.1 Walk algorithm (shared, identical math in Red and Green)

```as2
// RedSnowDudie.as:156-163  (Green: GreenSnowDudie.as:129-143)
if(this.walkendx) {
   this.walking = true;
   this.dudiemc.gotoAndPlay("walk");
   _loc3_ = Math.sqrt(Math.pow(this.walkendy - this.dudiemc._y, 2)
                    + Math.pow(this.walkendx - this.dudiemc._x, 2));
   this.walkxmov = (this.walkendx - this.dudiemc._x) / (_loc3_ / this.walkspeed);
   this.walkymov = (this.walkendy - this.dudiemc._y) / (_loc3_ / this.walkspeed);
   return;
}
// per tick while walking (RedSnowDudie.as:136-153, GreenSnowDudie.as:93-115):
if(|x - walkendx| < 10 && |y - walkendy| < 10) {
   walking = false; walkendx = walkendy = 0;
   gotoAndStop("ready");          // Red
   // gotoAndStop("balling");     // Green (then restarts the AI cycle)
} else {
   x += walkxmov; y += walkymov;
   if(sounds._currentframe == 1) sounds.gotoAndPlay("step");
}
```

Pseudocode summary:

```
on assignment of walkendx/walkendy:
    dist = hypot(dx, dy)
    velocity = (dx, dy) * (walkspeed / dist)   // unit vector × walkspeed
each tick while walking:
    if within 10 px of target on both axes:  arrive (state -> "ready")
    else:                                    pos += velocity; play "step" SFX if idle
```

There is **no acceleration, no gravity, no friction, no inertia** for dudies — speed is constant per walk command. Velocity magnitude equals `walkspeed` (px / tick) until arrival.

### 6.2 Player drag movement (Red only)

While the mouse is held on the player:

```as2
// RedSnowDudie.as:175-182
if(this.adobesucksmouseisdownflag && this.dragdudie) {
   this.dudiemc._x = this.stage._xmouse;
   this.dudiemc._y = this.stage._ymouse;
   _loc2_ = this.checkline(592, 0, 0, 320, this.dudiemc._x, this.dudiemc._y, 1);
   this.dudiemc._x = _loc2_[0];
   this.dudiemc._y = _loc2_[1];
}
```

Pseudocode:

```
while dragging (left mouse held on dudie):
    pos = mouse_pos
    pos = clip_against_line(p1=(592,0), p2=(0,320), point=pos, side=less=true)
```

The line `(592,0)→(0,320)` is the diagonal that separates the playfield from the red team's side; `less = true` keeps the player on/above this line (their own side of the snow embankment).

### 6.3 Green AI tick state machine

```
GreenSnowDudie.frameloop()  (GreenSnowDudie.as:73-160)

if dead: return
if dudiemc.down: return
if justhit:
    adobefrozenframebugfix -= 1
    if adobefrozenframebugfix < 0: justhit = false
    return
if walking:
    if arrived: gotoAndStop("balling"); walking = false
    else: pos += velocity; step SFX
    return
if cocking > 0:
    cocking -= 1
    if cocking == 10: gotoAndStop("toss"); throwball()
    return
if rand() > 0.975 OR walkendx is set:
    walking = true; gotoAndPlay("walk")
    if no walkendx: pick random clipped destination
    compute velocity
    return
if titles._visible: return
if balling > 0:
    balling -= 1
    if balling <= 0: gotoAndStop("cock"); cocking = 15 + round(rand()*30)
    return
gotoAndStop("balling"); balling = 10 + round(rand()*50)
```

---

## 7. Animation Frame Triggers

### 7.1 Sprite IDs / frame labels

Source: `dump.txt` ExportAssets / FrameLabel rows.

| Sprite | SWF char id | Export name | Labels (frame#) |
|---|---|---|---|
| Red dudie | 32 | `reddudie` | `rest` (1), `ready` (10/11), `cock` (15→16), `toss` (20→21), `hitdazed` (25→26), `dazed` (31→32), `dead` (49→50), `walk` (70→71) — see `dump.txt:137-206` |
| Green dudie | 69 | `greendudie` | `walk` (frame 1), `ready` (15), `balling` (20), `cock` (25), `toss` (30), `hit` (35), `midrecover` (46), `down` (68), `dead` (102), `yea` (123), `yealoop` (138) — `dump.txt:382-519` |
| Snowball | 35 | `snowball` | (no labels visible) |
| Snowball shadow | 48 | `snowballshadow` | `land` (5) — `dump.txt:263` |
| Selection circle | 8 | `selectioncircle` | (highlight ring drawn under player) |

> Frame numbers above are SWF tag ordinals, not necessarily the same numbers used by the AS `frame_NN/DoAction.as` directories — the AS scripts always reference labels by name (`gotoAndPlay("walk")` etc.), so labels are the contract.

### 7.2 Player (Red) frame‑label triggers (caller → label)

| Trigger | Label | Source |
|---|---|---|
| `onchosen()` (mouse down on dudie) | `cock` (`gotoAndPlay`) | `RedSnowDudie.as:64` |
| `mouserelease()` after throw | `toss` (`gotoAndStop`) | `RedSnowDudie.as:128` |
| `mouserollout()` | `ready` (`gotoAndStop`) | `RedSnowDudie.as:106` |
| arrived at walk target | `ready` (`gotoAndStop`) | `RedSnowDudie.as:142` |
| start walking | `walk` (`gotoAndPlay`) | `RedSnowDudie.as:159` |
| `yougothit()` first hit (HP 1) | `hitdazed` | `RedSnowDudie.as:76` |
| `yougothit()` killing hit (HP 0) | `dead` | `RedSnowDudie.as:87` |
| dazed timeout | `ready` (`gotoAndStop`) | `RedSnowDudie.as:171` |

Frame DoActions on the `reddudie` sprite (`DefineSprite_32_reddudie/frame_*/DoAction.as`):

| Frame | DoAction | Effect |
|---|---|---|
| 1 (`rest`) | `meter._visible = false; stop();` | resting idle — power meter hidden |
| 2 | `stop(); meter._visible = false; dazed = false;` | clear dazed flag at idle |
| 3 | `meter.gotoAndPlay(1); meter._visible = true; stop();` | start power meter on cock |
| 4 | `stop(); meter._visible = false;` | toss landing |
| 5 | `play();` | continue |
| 7 (entering `dazed`?) | `meter._visible = false; play();` | hide meter while dazed |
| 15 | `gotoAndStop("dazed"); play();` | hop into dazed loop |
| 16 | `play(); meter._visible = false;` | |
| 18 | `gotoAndStop(this._currentframe + Math.round(Math.random()*3));` | randomized rest variation |
| 24 | `play();` | |
| 27 | `gotoAndStop("walk"); play();` | jump into walk loop |

Sources: `DefineSprite_32_reddudie/frame_{1,2,3,4,5,7,15,16,18,24,27}/DoAction.as`.

### 7.3 Green frame‑script DoActions (NPC parity)

| Frame label/# | DoAction | Source |
|---|---|---|
| `frame_6` | `gotoAndStop("walk"); play();` | enters walk loop |
| `frame_7,8,9,10` | `stop();` | hold pose |
| `frame_11` | `justhit = true; play();` | hit reaction starts |
| `frame_17` | `justhit = true; down = false; play();` | another hit branch |
| `frame_31` | `justhit = false; down = false; gotoAndStop("walk"); play();` | recover to walk |
| `frame_36` | `play();` | |
| `frame_57` | `down = true; play();` | knocked-down |
| `frame_58` | `gotoAndStop("midrecover"); play();` | recover from down |
| `frame_60` | `play();` | |
| `frame_74` | `gotoAndStop(this._currentframe + Math.round(Math.random()*4));` | randomized variation |
| `frame_78` | `gotoAndPlay(this._currentframe + Math.floor(Math.random()*21));` | |
| `frame_98` | plays `laugh`/`laugh2` with 25 % each, then `gotoAndStop("yealoop")` | level-clear celebration |

Sources: corresponding files under `DefineSprite_69_greendudie/`.

### 7.4 Sound IDs used per gameplay event

The `sounds` clip is one timeline; the code triggers labels on it. Table of every label the player path can play:

| Event | Label called | Source |
|---|---|---|
| Footstep while walking | `step` | `RedSnowDudie.as:150`, `GreenSnowDudie.as:112` |
| Throw (force < 1) | `throw` | `SnowBall.as:59` |
| Throw (force ≥ 1) | `longthrow` | `SnowBall.as:55` |
| Snowball lands (red ball only) | `splat` | `SnowBall.as:84` |
| Player first hit | `hit1` | `RedSnowDudie.as:77` |
| Player first hit overlay (birds chirp tweet) | `birds` | `RedSnowDudie.as:78` |
| Player kill | `kids1` / `kids2` / `kids3` (random 1‑3) | `RedSnowDudie.as:88` |
| Green hit | `hit1` | `GreenSnowDudie.as:49` |
| Green killed | `kids1`/`kids2`/`kids3` | `GreenSnowDudie.as:65` |
| Green level-clear celebration | `laugh`/`laugh2` (50/50) | `DefineSprite_69_greendudie/frame_98/DoAction.as` |

Other labels exported in the sounds clip (not directly invoked from the player): `goodbadugly` (frame 14), `halaluja` (frame 268). See `dump.txt:579-844`.

---

## 8. Hitbox Dimensions

Collision is point-vs-rect, evaluated per frame in `Snowcraft1Rewrite.frameloop`:

```as2
// Snowcraft1Rewrite.as:366  (red ball vs Green dudie)
Math.abs(_loc2_.ballmc._x - _loc4_.dudiemc._x) < 30
&& Math.abs(_loc2_.ballmc._y - (_loc4_.dudiemc._y - 20)) < 30
&& !_loc4_.dead && !_loc4_.down && !_loc2_.dead && !_loc2_.ineffective

// Snowcraft1Rewrite.as:376  (green ball vs Red dudie)
Math.abs(_loc2_.ballmc._x - _loc5_.dudiemc._x) < 30
&& Math.abs(_loc2_.ballmc._y - (_loc5_.dudiemc._y - 20)) < 30
&& !_loc5_.dead && !_loc2_.dead && !_loc2_.ineffective
```

**Hitbox (both teams):**
- Centered at `(dudie._x, dudie._y - 20)`
- Half‑extents `(30, 30)` ⇒ full size **60 × 60 px**, offset upward 20 px from registration

Note the asymmetry: Green is invulnerable while either `dead` or `down`; Red is only checked for `dead` (Red has no `down` state — see §10).

---

## 9. Player Abilities — Throw Mechanics

### 9.1 Selection / drag

`onchosen()` (`RedSnowDudie.as:49-65`):
- Refuses if `dazed`, `dead`, or `walking`.
- Swaps depth so the just-clicked dudie renders above the previously-selected one (`highestreddudie` is a static ref).
- Sets `dragdudie = true`.
- Dispatches `{type:"chosen"}` event (used by HUD/Snowcraft1Rewrite for "selected dudie" decoration).
- Plays `cock` (begins charging meter — see frame_3 DoAction which restarts `meter` from frame 1).

### 9.2 Charge meter

A child clip `meter` inside the reddudie sprite advances on its own (started by `meter.gotoAndPlay(1); meter._visible = true;` at frame `cock` — `DefineSprite_32_reddudie/frame_3/DoAction.as`). At release, `meter._currentframe` is sampled to derive force.

### 9.3 Release (throw)

```as2
// RedSnowDudie.as:108-118
function throwball() {
   var _loc2_ = 0.001;
   trace(this.dudiemc.meter._currentframe);
   if(this.dudiemc.meter._currentframe > 4) {
      _loc2_ = this.dudiemc.meter._currentframe / 15;
   }
   var _loc3_ = { target:this, type:"throwball",
                  force:_loc2_, team:this.team,
                  x:this.dudiemc._x, y:this.dudiemc._y - 35,
                  ineffective:_loc2_ < 0.1 };
   this.dispatchEvent(_loc3_);
}
```

Pseudocode:

```
on mouse release while selected:
    if meter.frame > 4:  force = meter.frame / 15
    else:                force = 0.001
    spawn snowball(team="red", force, x=self.x, y=self.y-35)
    if force < 0.1: ball.ineffective = true (deals no damage)
    play "toss"
```

Implications:
- Power meter must support at least frame **15** ⇒ max force `1.0` (anything ≥1 plays `longthrow` SFX, see `SnowBall.as:53-60`).
- Frame **5** is the minimum for any usable throw; frames 5‑6 still produce `force ≤ 0.4` which is below the **0.1** ineffective bar only at meter frame 1 (`0.001`). Verify against the meter sprite when it becomes available — this spec only knows the formula, not the meter's frame count.

### 9.4 Snowball trajectory (sourced from `pkg/SnowBall.as`)

Snowball is a classic horizontal scroller projectile with shadow:

| Constant | Value | Source |
|---|---|---|
| Initial `(xmov, ymov)` red | `(-20, -10)` | `SnowBall.as:45-46` |
| Initial `(xmov, ymov)` green | `(20, 10)` | `SnowBall.as:50-51` |
| Shadow initial offset | `+35` on y at spawn | `SnowBall.as:42` |
| `grounddistance` | **35** | `SnowBall.as:17` |
| Apex / fall logic (red) | begin descent when `originalx - x > force*100`; per tick `ymov += 3 - force; force -= force*0.15` | `SnowBall.as:96-100` |
| Apex / fall logic (green) | begin descent when `|originalx - x| > force*300` (only if `force < 1`); per tick `ymov += 2 - force; force -= force*0.15` | `SnowBall.as:124-128` |
| Land trigger (red) | `2 < ymov < 50` ⇒ snap `ymov = 51`, hide ball, shadow plays `land`, sounds `splat` | `SnowBall.as:79-86` |
| Land trigger (green) | `18 < ymov < 50` (no `splat` SFX) | `SnowBall.as:108-113` |
| Death | `ymov > 100` after landing | `SnowBall.as:90-93` |
| Off-stage cull | `|x| > 2999 || |y| > 2999` | `Snowcraft1Rewrite.as:384` |
| Ineffective if (red) | `ymov > -3` (too flat) | `SnowBall.as:75-78` |
| Ineffective if (green) | `ymov > 17` | `SnowBall.as:104-107` |

Asset references:
- `attachMovie("snowball", …)` (`SnowBall.as:37`) — char id 35
- `attachMovie("snowballshadow", …)` (`SnowBall.as:34`) — char id 48

---

## 10. HP & Damage

| Team | Initial HP | After 1 hit | After 2 hits | After 3 hits |
|---|---|---|---|---|
| Red (player) | 2 | dazed for 40 ticks (`hitdazed`) | dead | n/a |
| Green | 3 | `hit` then continue | `down` (knockdown — invulnerable) | dead |

Citations:
- Red: `RedSnowDudie.as:13` (`hitpoints = 2`), `:71-89` (`yougothit`)
- Green: `GreenSnowDudie.as:15` (`hitpoints = 3`), `:37-67` (`yougothit`)

Score on green kill: `+10` per hit that connects (`Snowcraft1Rewrite.as:369`). Time bonus on victory: `(1_800_000 - elapsed_ms) / 1000` rounded if elapsed < 30 minutes (`Snowcraft1Rewrite.as:412-419`).

`yougothit` algorithm (Green, illustrative — Red is similar without the knockdown branch):

```
yougothit():
    walking = false
    cocking = balling = 0
    justhit = false
    down = false
    hp -= 1
    if hp == 2: justhit = true; adobefrozenframebugfix = 50; play("hit"); SFX hit1
    if hp == 1: down = true;   play("down"); SFX hit1
    if hp == 0: play("dead"); dead = true;
                swap depth to "deadgreendudie<n>" empty clip on stage;
                SFX kids1/2/3 (random)
```

`adobefrozenframebugfix` is a manual countdown that re-enables `justhit = false` after 50 ticks; the comment in the field name suggests it works around a Flash Player bug where the playhead doesn't notify the AS layer when an animation frame finishes.

---

## 11. Unknown / Ambiguous

1. **Stage frame rate (FPS).** The SWF header was not preserved in `dump.txt` (it starts at the FileAttributes tag). Every per-tick constant above is therefore in **frames**, not seconds. Need to inspect the SWF header (`Header { FrameRate }`) directly. Snowcraft was a Flash holiday game from ~2003 and almost certainly runs at 12‑24 FPS; without confirming, the port should expose the framerate as a tunable.
2. **Stage rectangle.** Same reason — `Show`/`MovieHeader` rect not in dump. The drag‑clip line `(592,0)→(0,320)` and Green clip line `(610,0)→(0,340)` strongly imply a play area roughly **600×320–340 px**, but actual stage size is unconfirmed.
3. **Power meter sprite.** `meter._currentframe` is read but the meter sprite (the inner `meter` MovieClip on chid 32 reddudie) wasn't in the AS source under `__Packages`; only its frame count and the formula `frame/15` are known. The exact frame range / hold behaviour must be read off the sprite timeline (chid 32 inner clips).
4. **`shiftdown` flag.** Set by `Snowcraft1Rewrite.keydown(16)` / `keyup(16)` (`Snowcraft1Rewrite.as:214-227`) but never read in any of the AS files in `__Packages`. Either dead code or its consumer is in a frame‑script we haven't enumerated. **Recommend porting as no‑op** until evidence found.
5. **Red dudie spawn entry walk.** `setposition(start+200, start+100); setwalkendx(start)` makes the red dudie walk in from off-stage at game start, but `RedSnowDudie.frameloop` doesn't initialize `walkendx` from `setwalkendx` automatically. The first tick of `frameloop` finds `walkendx != 0` and starts the walk (`RedSnowDudie.as:156-163`). Confirmed by reading.
6. **`down` on Red dudie.** Red has no `hitpoints == 1` knockdown branch (it goes straight to dazed). The collision check at `Snowcraft1Rewrite.as:376` does not test `_loc5_.down`, consistent with this. Still worth flagging for the porting team — if you mirror the Green knockdown into Red, you must add the `down` invulnerability gate to the collision test.
7. **`titles._visible` coupling.** Green AI reduces walkspeed to 3 and waits when titles are showing (`GreenSnowDudie.as:98-102`); Red dudie ignores titles. Implies title cards are a soft-pause — port should reproduce.
8. **`adobesucksmouseisdownflag` vs `dragdudie`.** Two flags both gate the drag in §6.2. `adobesucksmouseisdownflag` is set in `onchosen` and cleared in `mouserelease` and `yougothit`; `dragdudie` is set in `onchosen`, cleared on `mouserelease` and `yougothit`. They are redundantly tracked (the comment "adobesucks" hints this is a workaround for Flash's mouse-state quirks). One boolean is sufficient in the port; preserve both names if matching behaviour 1:1.
9. **Frame-label line numbers above (e.g. `walk` at frame 70/71)** are SWF tag positions in `dump.txt`, not the same as `frame_NN/` directory names. The AS scripts always use string labels, so this is a documentation-only ambiguity.
10. **Domain lock.** `frame_2/DoAction.as:1-10` checks the LocalConnection domain against a whitelist (`localhost`, `chiudesign.com`, `iconnicholson.com`, `onehammer;com` (sic, semicolon typo), `nicholsonny.com`, `onehammer.com`, …) and shows a `titles → error` if not matched. Port should remove this gate.

---

## 12. Quick Reference for Implementers

```
PLAYER (RedSnowDudie)
  hp=2  walkspeed=5  dazedTicks=40  arriveTol=10
  hitbox: 60x60 centered at (x, y-20)
  drag clamp: line (592,0)-(0,320), keep above
  ball spawn: (x, y-35), team="red"
  force = (meterFrame > 4) ? meterFrame/15 : 0.001
  ineffective if force < 0.1
  on mousedown -> "cock"; on mouseup -> throwball + "toss"
  hp 1 -> "hitdazed" + sounds.hit1 + sounds.birds, dazed=40
  hp 0 -> "dead" + sounds.kids{1|2|3}

GREEN AI (parity)
  hp=3  walkspeed=5 (or 10 lvl5/>6, 15 lvl6)
  random destination probability: 2.5% per tick
  cock: 15+rand*30 ticks, throw at counter==10
  ball-up: 10+rand*50 ticks
  force = 0.3 + rand*0.6
  ball spawn: (x, y-15)
  hp 2 -> "hit" + sounds.hit1, frozen 50 ticks
  hp 1 -> "down" + sounds.hit1, invulnerable
  hp 0 -> "dead" + sounds.kids{1|2|3}

CONTROLS
  Mouse on player: onPress=charge, drag=move, onRelease=throw
  Keyboard: Shift (code 16) -> shiftdown flag (no observed use)
  Cheats: type "lv<digit>" to jump levels; "cr<any>" for credits
```

— end of spec —
