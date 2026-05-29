# Snowcraft AI / Enemy Behavior — Faithful Port Spec

> Scope: CPU/enemy decision tree, throw cadence, aim accuracy, movement,
> difficulty scaling per level. Player ("red") behavior is included only where
> needed to contrast with CPU ("green") behavior or where the game-loop refers
> to it.
>
> All path references in this document are relative to
> `snow-craft/approach-4-faithful-port/decompiled/`.
> All line numbers refer to the decompiled ActionScript 2 sources under
> `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/`.

---

## 1. Overview & Class Map

| Class | File | Role |
|---|---|---|
| `AGame` | `__Packages/com/iconnicholson/onehammer/AGame.as` | Base game class. Wires `floop.onEnterFrame -> hackparent.frameloop()` (per-frame tick). |
| `Snowcraft1Rewrite` | `__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as` | Root game controller. Spawns dudies, drives global frameloop, collision, level transitions, scoring, win/lose. Extends `AGame`. |
| `ASnowDudie` | `__Packages/com/iconnicholson/onehammer/ASnowDudie.as` | Abstract dudie base. Holds walking primitives, `walkspeed`, `checkline()` boundary clip. |
| `RedSnowDudie` | `__Packages/com/iconnicholson/onehammer/RedSnowDudie.as` | Player-controlled snow dudie (mouse drag/throw). |
| `GreenSnowDudie` | `__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as` | **CPU enemy AI.** Random walk + balling/cocking/toss state machine. |
| `SnowBall` | `__Packages/com/iconnicholson/onehammer/SnowBall.as` | Projectile physics for both teams. |

The CPU AI is implemented entirely in `GreenSnowDudie.frameloop()` plus
constructor-side level-scaling in `Snowcraft1Rewrite.dolevel()` and the
per-level `greendudiestartingpoints` arrays.

### FPS / tick assumption
The SWF header (`dump.txt:1` `FileAttributes`) is intact but the SWF rate is
not visible in the available decompile dump. All time-based AI constants in
the source are integer **frames**; the original published game runs the timer
off `onEnterFrame` (see `AGame.as:7`). FPS itself is **Unknown — see §10**.

---

## 2. Per-Frame Tick — How AI is Driven

`AGame` constructor (`AGame.as:5-9`) installs the master heartbeat:

```as
function AGame(floop)
{
   floop.onEnterFrame = this.floopenterframe;
   floop.hackparent = this;
   mx.events.EventDispatcher.initialize(this);
}
```

`AGame.floopenterframe()` (`AGame.as:16-19`) calls
`Snowcraft1Rewrite.frameloop()`, which in turn iterates every dudie:

```as
// Snowcraft1Rewrite.as:396-401
while(_loc6_ < this.adudies.length)
{
   _loc8_ = this.adudies[_loc6_];
   _loc8_.frameloop();
   _loc6_ = _loc6_ + 1;
}
```

Therefore `GreenSnowDudie.frameloop()` runs **once per Flash frame** for
every CPU dudie that exists in the level.

---

## 3. CPU AI Decision Tree (`GreenSnowDudie.frameloop`)

Source: `GreenSnowDudie.as:73-160`. The function is structured as a strict
priority cascade — the first branch whose guard is true returns and ends
the tick.

### 3.1 Member state used by the AI

```as
// GreenSnowDudie.as:1-16
var balling = 0;            // frames remaining in "balling" (packing) state
var cocking = 0;            // frames remaining in "cocking" (winding up) state
var down = false;           // dazed (1 hp left)
var hitpoints = 3;          // starting HP (3 hits to kill)
var adobefrozenframebugfix = 0; // frame-counter for the "justhit" recovery state
// inherited from ASnowDudie:
//   walkspeed = 5, walking, walkendx, walkendy, walkxmov, walkymov, dead
```

### 3.2 Priority cascade (verbatim order)

```as
// GreenSnowDudie.as:73-160 — abridged with line ranges
function frameloop()
{
   if(this.dead)            return;          // (A)
   if(this.dudiemc.down)    return;          // (B)
   this.down = false;
   if(this.dudiemc.justhit) {                // (C)
      this.adobefrozenframebugfix--;
      if (this.adobefrozenframebugfix < 0) this.dudiemc.justhit = false;
      return;
   }
   if(this.walking) { ... return; }          // (D) walk integration
   if(this.cocking > 0) { ... return; }      // (E) cocking countdown
   if(Math.random() > 0.975 || this.walkendx) { ... return; } // (F) walk start
   if(this.titles._visible) return;          // (G) freeze during title cards
   if(this.balling > 0) { ... return; }      // (H) balling countdown
   this.dudiemc.gotoAndStop("balling");      // (I) start balling
   this.balling = 10 + Math.round(Math.random() * 50);
}
```

#### (A) Dead — `GreenSnowDudie.as:75-78`
If `this.dead` → no-op forever. Set in `yougothit()` when HP reaches 0.

#### (B) Down — `GreenSnowDudie.as:79-82`
If `dudiemc.down` (HP==1, animation has the "down" flag set), no-op until
the down animation/clip clears the flag. The dudie cannot throw, cannot
move, cannot be hit again by the snowball collision check (the collider
also excludes `_loc4_.down`, see `Snowcraft1Rewrite.as:366`).

#### (C) Just-hit recovery — `GreenSnowDudie.as:84-92`
After taking a hit (HP went from 3→2) `yougothit()` sets
`adobefrozenframebugfix = 50` and `justhit = true` (`GreenSnowDudie.as:46-48`).
The frameloop counts that down by 1 each tick and clears `justhit` when it
goes negative. **CPU is fully frozen for ~50 frames after first hit.**

#### (D) Walking — `GreenSnowDudie.as:93-116`
Continues an in-progress walk. Per-tick logic:

```as
if (Math.abs(dudiemc._x - walkendx) < 10 &&
    Math.abs(dudiemc._y - walkendy) < 10) {
   dudiemc.gotoAndStop("balling");
   if (titles._visible) { walkspeed = 3; return; }   // intro lockstep
   walking = false; walkendx = walkendy = 0;
} else {
   dudiemc._x += walkxmov;
   dudiemc._y += walkymov;
   if (sounds._currentframe == 1) sounds.gotoAndPlay("step");
}
```

Arrival threshold: **±10 px on each axis**.
Note: when reaching destination the dudie *immediately enters "balling"
animation pose* but the `balling` timer itself isn't initialized here — it
falls through to branch (H)/(I) on the next tick.

#### (E) Cocking → throw — `GreenSnowDudie.as:117-126`

```as
if (cocking > 0) {
   cocking--;
   if (cocking == 10) {
      dudiemc.gotoAndStop("toss");
      throwball();             // <-- ACTUAL projectile spawn
   }
   return;
}
```

The throw fires when `cocking` hits **exactly 10** (so the animation has
~10 frames of follow-through after the ball is released).

#### (F) Random walk roll — `GreenSnowDudie.as:127-143`

```as
if (Math.random() > 0.975 || this.walkendx) {
   this.walking = true;
   this.dudiemc.gotoAndPlay("walk");
   if (!this.walkendx) {
      _loc2_ = this.randomdestinationwithinboundaries();
      this.walkendx = _loc2_[0];
      this.walkendy = _loc2_[1];
   }
   _loc3_ = sqrt((walkendy-_y)^2 + (walkendx-_x)^2);
   this.walkxmov = (walkendx - _x) / (_loc3_ / walkspeed);
   this.walkymov = (walkendy - _y) / (_loc3_ / walkspeed);
   return;
}
```

Probability per frame to start a random walk: **2.5 %** (`Math.random() > 0.975`).
The branch is also entered automatically when `walkendx` is preset from the
constructor / initial spawn route, regardless of dice roll.

#### (G) Title-card freeze — `GreenSnowDudie.as:144-147`
While the level title overlay is up (`titles._visible == true`), the dudie
will not start cocking/balling. They *can* keep walking (branch D/F still
runs first) — this is what makes them march to their starting positions
at level start.

#### (H) Balling countdown → cocking — `GreenSnowDudie.as:148-157`

```as
if (balling > 0) {
   balling--;
   if (balling <= 0) {
      dudiemc.gotoAndStop("cock");
      cocking = 15 + Math.round(Math.random() * 30);
   }
   return;
}
```

When the packing timer ends, the dudie switches to "cock" pose and rolls
`cocking ∈ [15, 45]` integer frames of wind-up.

#### (I) Start balling — `GreenSnowDudie.as:158-159`

```as
this.dudiemc.gotoAndStop("balling");
this.balling = 10 + Math.round(Math.random() * 50);
```

`balling ∈ [10, 60]` integer frames.

### 3.3 Pseudocode — full CPU tick

```text
on each frame for each GreenSnowDudie d:
  if d.dead:        return
  if d.down:        return            # 1-HP dazed; freed by Flash anim
  if d.justhit:                       # 50-frame stagger after first hit
      d.adobefrozenframebugfix -= 1
      if d.adobefrozenframebugfix < 0: d.justhit = false
      return
  if d.walking:
      if dist_axes(d.pos, d.walkend) < 10:
          d.pose = "balling"
          if titles_visible: d.walkspeed = 3; return    # intro march
          d.walking = false; d.walkend = (0,0)
      else:
          d.pos += (d.walkxmov, d.walkymov)
          play_step_sound_if_idle()
      return
  if d.cocking > 0:                   # throwing wind-up
      d.cocking -= 1
      if d.cocking == 10:
          d.pose = "toss"
          d.throwball()                # <-- dispatches "throwball" event
      return
  if random() > 0.975 OR d.walkend.x != 0:    # 2.5% per-frame walk start
      d.walking = true
      if d.walkend.x == 0:
          d.walkend = randomdestinationwithinboundaries()
      v = (d.walkend - d.pos)
      step = v / (|v| / d.walkspeed)
      (d.walkxmov, d.walkymov) = step
      return
  if titles_visible: return            # don't start throwing during titles
  if d.balling > 0:
      d.balling -= 1
      if d.balling <= 0:
          d.pose = "cock"
          d.cocking = 15 + round(random()*30)        # [15..45]
      return
  d.pose = "balling"
  d.balling = 10 + round(random()*50)                # [10..60]
```

---

## 4. Throw Cadence (Frames Between Throws)

CPU throw cadence is composed of three sequential timers, all set from the
`GreenSnowDudie` source above:

| Phase | Pose | Frames | Source |
|---|---|---|---|
| Balling (packing) | "balling" | `10 + round(random()*50)` → **[10..60]** | `GreenSnowDudie.as:159` |
| Cocking (wind-up) | "cock" | `15 + round(random()*30)` → **[15..45]** | `GreenSnowDudie.as:154` |
| Toss → release | "toss" | release happens when `cocking==10` (i.e., 5..35 frames into cocking) | `GreenSnowDudie.as:120-123` |

**Time from "starts balling" to "ball leaves hand"**:
- Min: `10 + (15 - 10) = 15` frames  (balling=10 then cocking 15 down to 10)
- Max: `60 + (45 - 10) = 95` frames  (balling=60 then cocking 45 down to 10)

After release the remaining `10` frames of `cocking` play out, then control
returns to the cascade. **Earliest possible next throw start = next frame
after `cocking` reaches 0**, modulated by the 2.5%/frame random-walk
interrupt.

So under steady state (no walking, never hit) the **average throw period**
is approximately:
- balling avg = 10 + 25 = 35
- cocking avg = 15 + 15 = 30
- => avg ~65 frames between throw releases (release happens 10 frames before cocking ends, but the next balling can only start after cocking reaches 0).

There is **no global cooldown** and no per-class minimum besides the timers
above. Multiple greens throw independently and their RNG is uncorrelated.

### Player (red) "throw cadence"
Player is mouse-driven, but the force computation uses the same animation:

```as
// RedSnowDudie.as:108-118
function throwball() {
   var _loc2_ = 0.001;
   if(this.dudiemc.meter._currentframe > 4)
      _loc2_ = this.dudiemc.meter._currentframe / 15;
   var _loc3_ = {target:this,type:"throwball",force:_loc2_,
                 team:this.team,x:this.dudiemc._x,y:this.dudiemc._y - 35,
                 ineffective:_loc2_ < 0.1};
   this.dispatchEvent(_loc3_);
}
```

The player's `meter` movie clip frame at release determines the force; if
≤ 4, force defaults to `0.001` (essentially a dud, also marked ineffective
because `_loc2_ < 0.1`).

---

## 5. Aim Accuracy / Random Spread

There is **no aim model**. The CPU does **not** target the player at all —
the throw direction is *team-static*, hard-coded in `SnowBall`'s constructor:

```as
// SnowBall.as:43-52
if(this.team == "red") {
   this.xmov = this.shadowxmov = -20;
   this.ymov = this.shadowymov = -10;
}
else if(this.team == "green") {
   this.xmov = this.shadowxmov = 20;
   this.ymov = this.shadowymov = 10;
}
```

So:
- Every **green** snowball launches with **(xmov=+20, ymov=+10)** px/frame.
- Every **red** snowball launches with **(xmov=-20, ymov=-10)** px/frame.

The "aim" therefore comes from **where the dudie chose to walk to**. If the
green dudie wandered closer to the red side, its throw ends up on the red
side because it has more time/distance before the gravity arc finishes.

### CPU "force" (only random factor in CPU throw)

```as
// GreenSnowDudie.as:161-165
function throwball() {
   var _loc2_ = {target:this,type:"throwball",force:0.3 + Math.random() * 0.6,
                 team:this.team, x:this.dudiemc._x, y:this.dudiemc._y - 15};
   this.dispatchEvent(_loc2_);
}
```

CPU `force ∈ [0.3, 0.9]` uniform random. `force` controls how far the ball
flies before gravity-driven `ymov` begins climbing — see §6.

There is **no per-frame heading jitter, no Gaussian spread, no target-lead
calculation, and no aimpoint at all**. The accuracy of any individual
throw is purely a function of (a) where the green is currently standing,
(b) the random `force` value, (c) the fixed (xmov,ymov) per team.

### Origin offsets

| Team | Origin x | Origin y | Source |
|---|---|---|---|
| Red player throw | `dudiemc._x` | `dudiemc._y - 35` | `RedSnowDudie.as:116` |
| Green CPU throw | `dudiemc._x` | `dudiemc._y - 15` | `GreenSnowDudie.as:163` |
| Snowball shadow start | x | `y + 35` (then drifts) | `SnowBall.as:41-42`, `grounddistance = 35` `SnowBall.as:17` |

---

## 6. Snowball Physics (Required for Implementing AI Outcomes)

### 6.1 Constants (cited)

```as
// SnowBall.as:1-17
var dead = false;
var ineffective = false;
var grounddistance = 35;
```

### 6.2 Per-frame integration

```as
// SnowBall.as:67-134 (abridged)
function frameloop() {
   if(this.dead) return;
   if(this.team == "red") {
      if(this.ymov > -3)  this.ineffective = true;          // arc too low
      if(this.ymov > -2 && this.ymov < 50) {                // landed
         this.ymov = 51; this.ballmc._visible = false;
         this.shadowmc.gotoAndPlay("land");
         this.sounds.gotoAndPlay("splat"); return;
      }
      if(this.ymov > 50) { this.ymov++; if(this.ymov>100) this.dead=true; return; }
      if(this.force != 1 && this.originalx - this.ballmc._x > this.force * 100) {
         this.ymov += 3 - this.force;            // gravity kicks in
         this.force -= this.force * 0.15;
      }
   }
   else if(this.team == "green") {
      if(this.ymov > 17) this.ineffective = true;
      if(this.ymov > 18 && this.ymov < 50) { /* land + no splat sound */ }
      if(this.ymov > 50) { this.ymov++; if(this.ymov>100) this.dead=true; return; }
      if(this.force < 1 && Math.abs(this.originalx - this.ballmc._x) > this.force * 300) {
         this.ymov += 2 - this.force;
         this.force -= this.force * 0.15;
      }
   }
   this.ballmc._x += this.xmov; this.ballmc._y += this.ymov;
   this.shadowmc._x += this.shadowxmov; this.shadowmc._y += this.shadowymov;
}
```

### 6.3 Implications

- Green ball travels horizontally `force * 300` pixels before the gravity
  phase starts. With `force ∈ [0.3, 0.9]` that's 90..270 px of "flat"
  travel before the arc descends. At `xmov=20` per frame that's 4.5..13.5
  frames of flat travel, then arcing.
- Green ball is marked `ineffective` once `ymov > 17` (arc too high to
  damage), causing the collision check to skip damage:

```as
// Snowcraft1Rewrite.as:373-381
else if(this.adudies[_loc3_] instanceof com.iconnicholson.onehammer.RedSnowDudie) {
   _loc5_ = this.adudies[_loc3_];
   if(_loc2_.team == "green" &&
      Math.abs(_loc2_.ballmc._x - _loc5_.dudiemc._x) < 30 &&
      Math.abs(_loc2_.ballmc._y - (_loc5_.dudiemc._y - 20)) < 30 &&
      !_loc5_.dead && !_loc2_.dead && !_loc2_.ineffective) {
      _loc2_.dead = true;
      _loc5_.yougothit();
   }
}
```

- Hit box: ±30 px on each axis around (red._x, red._y - 20).
- Off-screen kill: `|x| > 2999 || |y| > 2999` (`Snowcraft1Rewrite.as:384`).

---

## 7. Movement Patterns

### 7.1 Random destination

```as
// GreenSnowDudie.as:27-36
function randomdestinationwithinboundaries() {
   var _loc2_ = new Array();
   _loc2_[0] = Math.random() * 500;
   _loc2_[1] = Math.random() * 300;
   var _loc3_ = this.checkline(610,0,0,340,_loc2_[0],_loc2_[1],0);
   _loc2_[0] = _loc3_[0];
   _loc2_[1] = _loc3_[1];
   return _loc2_;
}
```

Raw destination: `x ∈ [0, 500)`, `y ∈ [0, 300)`. Then clipped against the
diagonal "battle-front" line via `ASnowDudie.checkline(610,0, 0,340, x,y, less=0)`
(`ASnowDudie.as:47-67`). The line goes from (610,0) to (0,340); `less=0`
means the destination is forced **down-right of (i.e. above)** that
diagonal — keeping greens on their (left/back) side of the snow battle.

For comparison, red player movement is clipped against the **opposite**
diagonal `(592, 0) → (0, 320)` with `less=1` (`RedSnowDudie.as:179`).

### 7.2 Walk integration

In branches (D)/(F) of `GreenSnowDudie.frameloop()`:

```as
_loc3_ = sqrt((walkendy - _y)^2 + (walkendx - _x)^2);
this.walkxmov = (walkendx - _x) / (_loc3_ / walkspeed);
this.walkymov = (walkendy - _y) / (_loc3_ / walkspeed);
```

This produces a unit-speed step of length `walkspeed` per frame toward
`walkend`. Re-evaluated only when starting a new walk (not per-frame
homing).

### 7.3 Default speeds

| Class | `walkspeed` default | Source |
|---|---|---|
| `ASnowDudie` (base) | `5` | `ASnowDudie.as:11` |
| Red dudie | inherited `5` | `RedSnowDudie.as` (none overrides) |
| Green dudie | inherited `5` | `GreenSnowDudie.as` (none overrides) |
| Green during title-card march | `3` | `GreenSnowDudie.as:100` (set on arrival while titles visible) |
| Green level 5 | `10` | `Snowcraft1Rewrite.as:273-275` |
| Green level 6 | `15` | `Snowcraft1Rewrite.as:277-280` |
| Green level 7+ | `10` | `Snowcraft1Rewrite.as:273` (`level == 5 || level > 6`) |

```as
// Snowcraft1Rewrite.as:273-280
if(level == 5 || level > 6) { _loc2_.setwalkspeed(10); }
if(level == 6)             { _loc2_.setwalkspeed(15); }
```

(Level 1–4 and level 6 are explicit; level 6's `setwalkspeed(15)` is the
**maximum** walk speed of any AI in the game.)

### 7.4 Arrival
Stop threshold is **`|Δx| < 10` AND `|Δy| < 10`** (`GreenSnowDudie.as:95`).
Same threshold for red walks (`RedSnowDudie.as:138`).

### 7.5 Behavior during the level title overlay
While `titles._visible == true` the green dudie:
- Continues walking to its scripted starting point (branch D).
- Will not roll the 2.5% start-walk dice (branch F still works since
  branch G is later, but typically `walkendx` is preset so branch F
  takes precedence).
- Cannot enter balling/cocking/throw (branch G blocks branches H/I).
- On arriving at its starting point during titles, gets **walkspeed = 3**
  (the slow march look — `GreenSnowDudie.as:100`).

---

## 8. Difficulty Scaling Per Level

### 8.1 Level data structure

`Snowcraft1Rewrite.greendudiestartingpoints` is an array of arrays. Index
`level - 1` provides the spawn list. Each entry is `[startX, startY,
walkEndX, walkEndY]`.

```as
// Snowcraft1Rewrite.as:41-210 — example: level 1
this.greendudiestartingpoints[0] = new Array();
this.greendudiestartingpoints[0][0] = new Array(-20,-60,180,40);
this.greendudiestartingpoints[0][1] = new Array(-130,-60,70,40);
this.greendudiestartingpoints[0][2] = new Array(-130,1,70,100);
```

### 8.2 Number of greens per level (from source)

| Level | # Greens | Source range | Notes |
|---|---|---|---|
| 1 | 3 | `Snowcraft1Rewrite.as:42-45` | Same 3 spawn points as L2/L3. |
| 2 | 5 | `:46-51` | +2 dudies on left/back row. |
| 3 | 7 | `:52-59` | +2 more spawn rows. |
| 4 | 9 | `:60-69` | Adds duplicate-position dudies. |
| 5 | 12 | `:70-95` (the `[4]` block is **assigned twice**, the second `[4]` overwrites: 12 entries, lines `:84-95`) | 12 dudies; **walkspeed=10**. The first level-5 `[4]` block at `:70-82` is dead code overwritten on the next line. |
| 6 | 12 | `:103-130` | 12 dudies; **walkspeed=15**. Spawn points are reseated: first 6 enter from `x = -450 - i*8` (left side off-screen); last 6 enter from `y = -350 - i*8` (top off-screen). |
| 7 | 12 | `:131-163` | 12 dudies; **walkspeed=10** (per `level == 5 \|\| level > 6` rule). Spawn-point loop iterates `greendudiestartingpoints[4].length` (i.e., the level-5 length, 12) but writes into `[6]`. |
| 8 | 12 | `:164-188` | Same iteration; remixes the level-7 walk-end points. |
| 9 | 50 (allocated) but only first 12 reseated | `:189-210` | Loop `while(_loc4_ < 50)` pushes 50 random-end entries; subsequent loop at `:197-210` only reseats the first `greendudiestartingpoints[4].length == 12` of them. Result: **12 deterministic + 38 randomly-placed greens** = 50 total. |

> See §10 for the dead-code / fallthrough oddities — implement the post-overwrite
> values; the first `[4]` block at `:70-82` is unreachable because `:83-95`
> reassigns `this.greendudiestartingpoints[4] = new Array();` and refills it.

### 8.3 Walkspeed scaling (re-stated)

```as
// Snowcraft1Rewrite.as:273-280
if(level == 5 || level > 6) { _loc2_.setwalkspeed(10); }
if(level == 6)              { _loc2_.setwalkspeed(15); }
```

| Level | Green walkspeed |
|---|---|
| 1, 2, 3, 4 | 5 (inherited default) |
| 5 | 10 |
| 6 | 15 |
| 7, 8, 9 | 10 |

### 8.4 Other CPU difficulty knobs that **do not** change with level

These are hard-coded in `GreenSnowDudie` and used identically every level:
- `hitpoints = 3`
- `balling = 10 + round(random*50)` → [10..60] frames
- `cocking = 15 + round(random*30)` → [15..45] frames
- random-walk probability per frame = 2.5%
- `force = 0.3 + random*0.6` → [0.3..0.9]
- ball `xmov, ymov = (20, 10)` (fixed for green)

So difficulty scales **only** by (a) number of enemies, (b) walk speed at
levels 5/6/7+, (c) spawn placement (greens enter further forward / closer
to player on later levels).

### 8.5 Win condition / level advance

```as
// Snowcraft1Rewrite.as:289-317
// Loop over adudies; if no living GreenSnowDudie remains, advance:
if(_loc9_ && !this.gameover) {
   if(this.lev == this.greendudiestartingpoints.length) {
      this.ongameover(true);          // win
   } else {
      this.dolevel(this.lev + 1);     // next level
   }
}
```

Total levels = `greendudiestartingpoints.length`. From the source there are
indices `[0]..[8]` populated → **9 levels total**.

Red death check immediately follows (`:318-353`) and triggers `ongameover()`
on full red-team wipe.

### 8.6 Score & time bonus

```as
// Snowcraft1Rewrite.as:368-369   — per kill
_loc2_.dead = true;
this.score += 10;
_loc4_.yougothit();
```

```as
// Snowcraft1Rewrite.as:411-420  — end-of-game bonus
var _loc2_ = _loc3_.getTime() - this.starttime.getTime();
if (win) {
   if (_loc2_ < 1800000) {
      this.score += Math.round((1800000 - _loc2_) / 1000);
   }
}
```

Each green kill is +10 points. On win, time bonus = `max(0, (1,800,000 ms -
elapsed_ms) / 1000)` rounded — i.e., one point per second under 30 minutes.

---

## 9. Damage Model (CPU side)

### 9.1 Green HP & states

```as
// GreenSnowDudie.as:37-67
function yougothit() {
   this.walking = false;
   this.cocking = this.balling = 0;
   this.dudiemc.justhit = false;
   this.down = this.dudiemc.down = false;
   this.hitpoints = this.hitpoints - 1;
   if(this.hitpoints == 2) {
      this.dudiemc.justhit = true;
      this.adobefrozenframebugfix = 50;
      this.dudiemc.gotoAndPlay("hit");
      this.sounds.gotoAndPlay("hit1");
   }
   if(this.hitpoints == 1) {
      this.down = this.dudiemc.down = true;
      this.dudiemc.gotoAndPlay("down");
      this.sounds.gotoAndPlay("hit1");
   }
   if(this.hitpoints == 0) {
      this.dudiemc.gotoAndPlay("dead");
      this.dead = true;
      _root.grounditer++;
      _loc3_ = this.stage.createEmptyMovieClip("deadgreendudie" + _root.grounditer, _root.grounditer);
      this.dudiemc.swapDepths(_loc3_);
      this.sounds.gotoAndPlay("kids" + Math.ceil(Math.random() * 3));
   }
}
```

Behaviors:
- 3 → 2: `justhit` flag + 50-frame freeze (`adobefrozenframebugfix`); state
  cleared by frameloop branch (C).
- 2 → 1: `down` flag, plays "down" anim. Branch (B) keeps the dudie out of
  the AI cascade indefinitely until the down anim resets the flag (the
  flag is owned by the movieclip, not by AS state — see §10 ambiguity).
- 1 → 0: dead = true forever; depth swapped under any subsequent dudie so
  body lies on the ground.

### 9.2 Red HP

```as
// RedSnowDudie.as:13-14
var hitpoints = 2;
var dazed = 0;
```

Red has **2 HP** (vs green's 3). On first hit:

```as
// RedSnowDudie.as:66-89
function yougothit() {
   this.dragdudie = false;
   this.dudiemc.selectioncircle._visible = false;
   this.adobesucksmouseisdownflag = false;
   this.hitpoints--;
   if(this.hitpoints == 1) {
      this.dazed = 40;
      this.dudiemc.dazed = true;
      this.dudiemc.gotoAndPlay("hitdazed");
      this.sounds.gotoAndPlay("hit1");
      this.sounds.gotoAndPlay("birds");
   }
   if(this.hitpoints == 0) {
      this.dead = true;
      _root.grounditer++;
      _loc3_ = this.stage.createEmptyMovieClip("deadreddudie" + _root.grounditer, _root.grounditer);
      this.dudiemc.swapDepths(_loc3_);
      this.dudiemc.gotoAndPlay("dead");
      this.sounds.gotoAndPlay("kids" + Math.ceil(Math.random() * 3));
   }
}
```

Red dazed-recovery counter: 40 frames (`RedSnowDudie.as:74`), counted down
in `RedSnowDudie.frameloop()` (`:165-173`).

---

## 10. Asset / Sprite / Sound References

### 10.1 Sprite (chid) → exported name (from `dump.txt`)

| Asset name | DefineSprite chid | dump.txt line |
|---|---|---|
| `selectioncircle` | 8 | `dump.txt` `00000cb2` |
| `reddudie` | 32 | `dump.txt` `00002f6d` |
| `snowball` | 35 | `dump.txt` `000035f6` |
| `snowballshadow` | 48 | `dump.txt` `0000467b` |
| `greendudie` | 69 | `dump.txt` `000074ce` |

These names are used as the exact strings in `attachMovie()` calls:
- Red dudie: `RedSnowDudie.as:22` — `stage.attachMovie("reddudie", ...)`
- Green dudie: `GreenSnowDudie.as:21` — `stage.attachMovie("greendudie", ...)`
- Snowball: `SnowBall.as:37` — `attachMovie("snowball", ...)`
- Shadow: `SnowBall.as:34` — `attachMovie("snowballshadow", ...)`
- Selection circle: child of red dudie; used by `RedSnowDudie.as:23, 69, 97`.

### 10.2 Sound bank — frame labels in `_root.sounds` movie clip

These are **frame labels inside DefineSprite_110** (the sounds clip). All
play via `this.sounds.gotoAndPlay("<label>")`.

| Label | dump.txt line | Trigger |
|---|---|---|
| `step` | `0000fd61` | Walk integration tick when sounds idle (`RedSnowDudie.as:150`, `GreenSnowDudie.as:112`). |
| `throw` | `0000fe10` | Snowball constructor when `force < 1` (`SnowBall.as:59`). |
| `longthrow` | `0000fe3d` | Snowball constructor when `force >= 1` (`SnowBall.as:55`). |
| `hit1` | `0000fe8e` | `yougothit()` first/second hit on either team (`RedSnowDudie.as:77`, `GreenSnowDudie.as:49,55`). |
| `kids1` / `kids2` / `kids3` | `0000fec4`, `0000fefd`, `0000ff3c` | Death yell, randomly chosen via `"kids" + Math.ceil(Math.random()*3)` (`RedSnowDudie.as:88`, `GreenSnowDudie.as:65`). |
| `splat` | `00010016` | Red snowball lands (`SnowBall.as:84`). Note: green snowball lands but **does not** play splat (`SnowBall.as:108-114`). |
| `birds` | `00010047` | Red dudie just got dazed (`RedSnowDudie.as:78`). |
| `laugh` / `laugh2` | (in `DefineSprite_110`; not in the head listing above) | Green "yea" celebration on game over (`DefineSprite_69_greendudie/frame_78/DoAction.as`). |

### 10.3 Animation labels referenced from AS

Each dudie sprite has named frames the AI scripts gotoAndPlay/Stop on:

Green (`greendudie` / DefineSprite_69):
- `walk`, `balling`, `cock`, `toss`, `hit`, `down`, `dead`, `yea`,
  `yealoop` (`DefineSprite_69_greendudie/frame_78/DoAction.as`),
  `midrecover` (`frame_57`).

Red (`reddudie` / DefineSprite_32):
- `cock`, `toss`, `walk`, `ready`, `hitdazed`, `dead` (per `RedSnowDudie.as`).

These are the labels the port must implement on the dudie sprites/state
machines for `gotoAndPlay("X")` calls to function semantically.

### 10.4 Throwball event payload (AI-to-game contract)

```as
// GreenSnowDudie.as:163
var _loc2_ = {target:this, type:"throwball",
              force: 0.3 + Math.random() * 0.6,
              team: this.team,
              x: this.dudiemc._x, y: this.dudiemc._y - 15};
this.dispatchEvent(_loc2_);

// Snowcraft1Rewrite.as:284-288
function throwball(eventObject) {
   var _loc3_ = new com.iconnicholson.onehammer.SnowBall(this.stage, this.sounds,
      eventObject.team, eventObject.force, eventObject.x, eventObject.y,
      eventObject.ineffective);   // green never sets ineffective; arrives undefined
   this.snowballs.push(_loc3_);
}
```

Note: red sets `ineffective: _loc2_ < 0.1` (`RedSnowDudie.as:116`); green
never sets an `ineffective` field, so it arrives `undefined` and the
`SnowBall` constructor leaves its instance `ineffective` at the default
`false` (`SnowBall.as:24-27`).

---

## 11. Pseudocode Summary — Per-Algorithm

### 11.1 CPU per-frame tick
See §3.3.

### 11.2 CPU throw
```text
on throwball():
   force = 0.3 + random()*0.6                       # [0.3, 0.9]
   spawn SnowBall(team="green", force, pos.x, pos.y - 15)
   # SnowBall picks fixed (xmov, ymov) = (+20, +10) for green
```

### 11.3 CPU walk plan
```text
on walk_start():
   if walkend not preset:
       walkend = randomdestinationwithinboundaries()   # x∈[0,500), y∈[0,300)
                                                       # then clipped to right of (610,0)->(0,340)
   v   = walkend - pos
   d   = |v|
   step = v * (walkspeed / d)
   while not arrived (axes |Δ| ≥ 10):
       pos += step
       if sounds idle: play "step"
   # on arrival enter "balling" pose; if title overlay, walkspeed -> 3
```

### 11.4 Per-level spawn
```text
on dolevel(L):
   clear old dudies
   spawn 3 reds at fixed positions:
      (450,200), (420,260), (310,250)   # Snowcraft1Rewrite.as:13-18
      each red is positioned at (start+200, start+100) and walked back to start
   for each (sx, sy, ex, ey) in greendudiestartingpoints[L-1]:
      g = new GreenSnowDudie
      g.position = (sx, sy)
      g.walkend  = (ex, ey)             # immediate walk to combat position
      if L == 5 or L > 6: g.walkspeed = 10
      if L == 6:          g.walkspeed = 15
```

### 11.5 Difficulty curve (essence)
```text
L1: 3 greens, speed 5
L2: 5 greens, speed 5
L3: 7 greens, speed 5
L4: 9 greens, speed 5
L5: 12 greens, speed 10
L6: 12 greens, speed 15  (off-screen pincer enter from left and top)
L7: 12 greens, speed 10  (variant arrangement)
L8: 12 greens, speed 10  (variant arrangement)
L9: 50 greens (12 fixed + 38 random spawn-points), speed 10 ; final boss-wave level
```

Win at end of L9 → `ongameover(true)`.

---

## 12. Constants Cheat-Sheet

| Constant | Value | Source |
|---|---|---|
| Green starting HP | 3 | `GreenSnowDudie.as:15` |
| Red starting HP | 2 | `RedSnowDudie.as:13` |
| Red dazed frames | 40 | `RedSnowDudie.as:74` |
| Green just-hit freeze frames | 50 | `GreenSnowDudie.as:47` |
| Green balling duration | 10 + round(random*50) | `GreenSnowDudie.as:159` |
| Green cocking duration | 15 + round(random*30) | `GreenSnowDudie.as:154` |
| Cocking-→-toss release frame | when cocking == 10 | `GreenSnowDudie.as:120` |
| Green random-walk roll | per-frame `Math.random() > 0.975` | `GreenSnowDudie.as:129` |
| Green CPU throw force | 0.3 + random*0.6 | `GreenSnowDudie.as:163` |
| Green random destination range | x ∈ [0,500), y ∈ [0,300) | `GreenSnowDudie.as:30-31` |
| Green destination clip line | (610,0)→(0,340), keep right | `GreenSnowDudie.as:32` |
| Red destination clip line | (592,0)→(0,320), keep left | `RedSnowDudie.as:179` |
| Default walkspeed | 5 | `ASnowDudie.as:11` |
| Title-march walkspeed (green only) | 3 | `GreenSnowDudie.as:100` |
| Walkspeed L5 | 10 | `Snowcraft1Rewrite.as:273` |
| Walkspeed L6 | 15 | `Snowcraft1Rewrite.as:279` |
| Walkspeed L7+ | 10 | `Snowcraft1Rewrite.as:273` |
| Arrival threshold | abs<10 on each axis | `GreenSnowDudie.as:95`, `RedSnowDudie.as:138` |
| Snowball red velocity | (xmov, ymov) = (-20, -10) | `SnowBall.as:45-46` |
| Snowball green velocity | (xmov, ymov) = (+20, +10) | `SnowBall.as:49-51` |
| Snowball ground distance | 35 px (shadow offset) | `SnowBall.as:17, 41-42` |
| Red ineffective threshold | ymov > -3 | `SnowBall.as:75` |
| Green ineffective threshold | ymov > 17 | `SnowBall.as:104` |
| Red landing ymov band | (>-2, <50) | `SnowBall.as:79` |
| Green landing ymov band | (>18, <50) | `SnowBall.as:108` |
| Snowball off-screen kill | abs(x) or abs(y) > 2999 | `Snowcraft1Rewrite.as:384` |
| Red flat-flight distance | force * 100 | `SnowBall.as:96` |
| Green flat-flight distance | force * 300 | `SnowBall.as:124` |
| Gravity step (red) | ymov += 3 - force | `SnowBall.as:98` |
| Gravity step (green) | ymov += 2 - force | `SnowBall.as:126` |
| Force decay | force -= force * 0.15 (per gravity tick) | `SnowBall.as:99, 127` |
| Long-throw sound threshold | force >= 1 (red only — green force never reaches 1) | `SnowBall.as:53` |
| Hit-box (snowball vs dudie) | abs(Δx) < 30 AND abs(Δy - (-20)) < 30 | `Snowcraft1Rewrite.as:366, 376` |
| Per-kill score | +10 | `Snowcraft1Rewrite.as:369` |
| Time-bonus baseline | 1,800,000 ms (30 min) | `Snowcraft1Rewrite.as:416-418` |
| Time-bonus rate | 1 point / 1000 ms | `Snowcraft1Rewrite.as:418` |
| Total levels | 9 (`greendudiestartingpoints[0..8]`) | `Snowcraft1Rewrite.as:42-210` |
| Red spawn 1 | (450, 200), pre-walked to (250, 100) | `Snowcraft1Rewrite.as:13-14, 245-247` |
| Red spawn 2 | (420, 260), pre-walked to (220, 160) | `Snowcraft1Rewrite.as:15-16, 251-253` |
| Red spawn 3 | (310, 250), pre-walked to (110, 150) | `Snowcraft1Rewrite.as:17-18, 257-259` |

---

## 13. Unknown / Ambiguous

1. **SWF frame rate (FPS).** All AI timers are in frames. The dump.txt
   header summary doesn't include the SWF frame-rate field
   (FileAttributes shown as `00 00 00 00`; no explicit `frameRate=` line in
   the `dump.txt` we have). Without opening the SWF binary header it is
   unknown; common values for the era are 24 or 30. **Action: read the
   actual SWF header (first 4 bytes after the header rect) before
   choosing a tick interval.** Until then, port the timers as integer
   frames at a chosen `TARGET_FPS`.

2. **`dudiemc.down` / `dudiemc.justhit` flag clearing.** These flags are
   read by the AS frameloop but written *both* from AS (`yougothit()`) and
   from inside the `greendudie` movieclip's frame scripts (the .fla
   timeline). Specifically:
   - `down` is set true at HP==1, never cleared in AS — must be cleared
     somewhere in the down/midrecover animation timeline of DefineSprite_69.
     `frame_57/DoAction.as` only does `gotoAndStop("midrecover"); play();`
     and `frame_60/DoAction.as` does a small random frame jump. The exact
     frame where `down = false` happens is **unknown** without examining
     each frame script of DefineSprite_69; port should expose this as a
     "down anim length" tunable. Same caveat for `justhit` (which is
     also cleared by `adobefrozenframebugfix < 0` in AS, but the anim may
     also clear it earlier).

3. **`adobefrozenframebugfix = 50` semantics.** The variable name implies
   it is a workaround for a Flash bug where `dudiemc.justhit` would not
   reliably clear from the timeline. Decrementing it to <0 force-clears
   `justhit` after 50 frames. In a port, this is the **upper bound on the
   stagger duration**; the actual visible recovery may be shorter when
   the timeline clears `justhit` earlier.

4. **Level-5 dead code.** `Snowcraft1Rewrite.as:70-82` populates
   `greendudiestartingpoints[4]` (12 entries with one normalization loop),
   then `:83-95` re-creates `[4]` with new content. The first block is
   unreachable. Port should match the post-overwrite layout (lines 84–95).

5. **Level-7 / 8 / 9 loop bound bug.** Lines `:145, :178, :197` all loop
   `while(_loc4_ < this.greendudiestartingpoints[4].length)` — i.e., 12
   iterations — even though the levels in question may have more entries.
   Port must reproduce this exactly to be faithful (reseats only the
   first 12 of each higher-level array). Specifically:
   - L9 has 50 raw entries pushed (`:191-195`) but only the first 12 are
     reseated; entries 12..49 keep their `[-50, 100, 50+rand*200, 50+rand*200]`
     raw form (i.e., they spawn at a tight cluster `(-50, 100)` and walk
     into a random forward point). This is not a guess — it follows from
     the loop bound on `:197`.

6. **`greendudie` "balling"/"cock"/"toss" frame counts** are timeline-driven
   (visual only); the AI is pose-agnostic, so visual mismatch won't break
   the AI. The actual sprite frame counts are not parsed in this spec;
   decompile each frame range to mirror the visual cadence.

7. **Sound clip frame layout.** Frame labels listed in §10.2 are confirmed
   to exist in `DefineSprite_110` per `dump.txt`. The exact
   "play length per label" (i.e., how long the clip stays on each label
   before returning to frame 1) is not parsed here. The AI relies only on
   `sounds._currentframe == 1` as the "free" check
   (`GreenSnowDudie.as:110`, `RedSnowDudie.as:148`) — i.e., a single
   sound channel with idle-at-frame-1 contention.

8. **`titles._visible` source.** Called in the AI cascade but driven by
   the title-card movie clip's own gotoAndPlay events (e.g., `levelx`,
   `seasonsgreetings`, `gameoverwin`, `gameoverlose`). The exact frames
   that toggle `_visible` are inside DefineSprite_110/various `titles`
   subclips, not parsed here. Port should expose this as a global "intro
   freeze" flag during level-start animations.

9. **No explicit AI difficulty tuning between L5 and the L6/L7 walkspeed
   numbers.** The only changes are walkspeed and spawn placement; HP,
   throw cadence, force range, and random-walk probability remain
   constant across all 9 levels.

10. **Interaction between random-walk roll and balling/cocking.** Note
    that branch (F) `Math.random() > 0.975` runs *before* branches (H)/(I)
    in the cascade. Therefore an in-progress balling/cocking timer is
    *not* interrupted by the walk roll (because branches D/E return
    early), but **after** cocking ends and the dudie returns to balling,
    a 2.5%/frame chance of breaking off into a walk applies until balling
    actually starts ticking on the next frame. This is the intended
    behavior — port faithfully.

---

*End of spec.*
