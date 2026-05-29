# Snowball / Projectile — Faithful Port Spec

Source of truth: decompiled AS2 from `snowcraft.swf` (CWS, SWF v8).
All citations are line-accurate against the files under
`approach-4-faithful-port/decompiled/scripts/scripts/`.

## 1. Engine assumptions (from SWF header + `frame_1`)

| Property         | Value                  | Source                                                            |
|------------------|------------------------|-------------------------------------------------------------------|
| FrameRate        | **20 fps** (fixed8.8)  | SWF header (decompressed body byte 9..10 = `0x00 0x14`)           |
| Stage            | **592 x 320 px**       | SWF RECT (xmax=11840 twips, ymax=6400 twips)                      |
| Coordinate space | Flash MovieClip `_x/_y`, top-left origin, +Y down | engine convention             |
| `_root.comiter`  | starts at **19200**, +1 per attached MovieClip   | `scripts/frame_1/DoAction.as:5` |
| `_root.grounditer` | starts at **1200** | `scripts/frame_1/DoAction.as:6`                                     |
| `_root.shadowiter` | initialised to **550** lazily before first snowball | `SnowBall.as:29-32`           |

All time-based constants below are expressed **per frame at 20 fps** because the
original `frameloop()` runs once per `onEnterFrame`. Multiply by `1/20 s` to get
seconds. Pixel-velocity values are **px/frame**.

## 2. Class summary

```
class com.iconnicholson.onehammer.SnowBall          // SnowBall.as
class com.iconnicholson.onehammer.Snowcraft1Rewrite // Snowcraft1Rewrite.as (owns snowballs[])
class com.iconnicholson.onehammer.RedSnowDudie      // RedSnowDudie.as (player throws)
class com.iconnicholson.onehammer.GreenSnowDudie    // GreenSnowDudie.as (AI throws)
```

### 2.1 `SnowBall` constructor signature
```as
function SnowBall(stage, sounds, team, force, x, y, ineffective)
```
`scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as:18`

Fields (all instance vars, declared `var ...;`):
- `ballmc`, `shadowmc` — MovieClip refs
- `force:Number`
- `originalx, originaly:Number` (latched at construction)
- `xmov, ymov:Number` — ball velocity per frame
- `shadowxmov, shadowymov:Number` — shadow velocity per frame
- `team:String` — `"red"` | `"green"`
- `dead:Boolean = false` (`SnowBall.as:15`)
- `ineffective:Boolean = false` (`SnowBall.as:16`)
- `grounddistance:Number = 35` (`SnowBall.as:17`) — vertical offset from ball to its shadow

### 2.2 `Snowcraft1Rewrite.throwball(eventObject)` — projectile factory
`Snowcraft1Rewrite.as:284-288`
```as
function throwball(eventObject)
{
   var _loc3_ = new com.iconnicholson.onehammer.SnowBall(
       this.stage, this.sounds,
       eventObject.team, eventObject.force,
       eventObject.x,    eventObject.y,
       eventObject.ineffective);
   this.snowballs.push(_loc3_);
}
```

## 3. Spawn position relative to thrower

Both dudies dispatch a `"throwball"` event with `{x, y}`.

### 3.1 Red (player)
`RedSnowDudie.as:108-118`
```as
function throwball()
{
   var _loc2_ = 0.001;
   trace(this.dudiemc.meter._currentframe);
   if(this.dudiemc.meter._currentframe > 4)
   {
      _loc2_ = this.dudiemc.meter._currentframe / 15;
   }
   var _loc3_ = {target:this, type:"throwball",
                 force:_loc2_, team:this.team,
                 x:this.dudiemc._x,
                 y:this.dudiemc._y - 35,        // <-- spawn y offset
                 ineffective:_loc2_ < 0.1};
   this.dispatchEvent(_loc3_);
}
```
- Spawn **x** = thrower's `_x` (no horizontal offset)
- Spawn **y** = thrower's `_y - 35`
- `force` is derived from a charge meter clip frame:
  - `meter._currentframe <= 4` → `force = 0.001` (also marked `ineffective` because `0.001 < 0.1`)
  - `meter._currentframe > 4` → `force = currentframe / 15`
  - `ineffective = (force < 0.1)`

### 3.2 Green (AI)
`GreenSnowDudie.as:161-165`
```as
function throwball()
{
   var _loc2_ = {target:this, type:"throwball",
                 force:0.3 + Math.random() * 0.6,  // [0.3, 0.9)
                 team:this.team,
                 x:this.dudiemc._x,
                 y:this.dudiemc._y - 15};          // <-- spawn y offset
   this.dispatchEvent(_loc2_);
}
```
Note: green's event omits `ineffective`, so `SnowBall` keeps its default
`ineffective = false` unless explicitly set (see `SnowBall.as:24-27`).

### 3.3 In `SnowBall` constructor (`SnowBall.as:33-42`)
```as
this.shadowmc = stage.attachMovie("snowballshadow","snowballshadow"+_root.shadowiter,_root.shadowiter);
...
this.ballmc   = stage.attachMovie("snowball","snowball"+_root.comiter,_root.comiter);
this.ballmc._x = this.originalx = x;
this.ballmc._y = this.originaly = y;
this.shadowmc._x = x;
this.shadowmc._y = y + 35;        // grounddistance=35
```
Shadow is placed **35 px below** the ball (matches `grounddistance = 35`).

## 4. Initial velocity (per frame)

Set in constructor `SnowBall.as:43-52` — **NOT a function of `force`** at spawn time:

```as
if(this.team == "red")
{
   this.xmov = this.shadowxmov = -20;   // moves left  (toward greens)
   this.ymov = this.shadowymov = -10;   // moves up
}
else if(this.team == "green")
{
   this.xmov = this.shadowxmov = 20;    // moves right (toward reds)
   this.ymov = this.shadowymov = 10;    // moves down
}
```

| Team   | xmov (px/frame) | ymov (px/frame) | shadowxmov | shadowymov |
|--------|-----------------|-----------------|------------|------------|
| red    | **-20**         | **-10**         | **-20**    | **-10**    |
| green  | **+20**         | **+10**         | **+20**    | **+10**    |

So the launch is a fixed-vector cast; `force` only modulates **range** through
the in-air "fall" trigger (Section 5).

## 5. In-flight integration & "gravity" / drag — `frameloop()`

`SnowBall.as:67-134`. Runs every frame. Pseudocode:

```
if dead: return

if team == "red":
    # Step A: become ineffective once arc starts to flatten
    if ymov > -3:                       (line 75)
        ineffective = true

    # Step B: trigger landing/splat
    if ymov > -2 and ymov < 50:         (line 79)
        ymov = 51                       # snap into "landed" mode
        ballmc._visible = false
        shadowmc.gotoAndPlay("land")
        sounds.gotoAndPlay("splat")
        return                          # <-- skip xy update this frame

    # Step C: post-landing decay until removal
    if ymov > 50:                       (line 87)
        ymov += 1
        if ymov > 100: dead = true
        return

    # Step D: range-based drop (only if not "fast" throw)
    if force != 1 and (originalx - ballmc._x) > force*100:   (line 96)
        ymov  += 3 - force
        force -= force * 0.15

elif team == "green":
    if ymov > 17:                       (line 104)
        ineffective = true
    if ymov > 18 and ymov < 50:         (line 108)
        ymov = 51
        ballmc._visible = false
        shadowmc.gotoAndPlay("land")
        return                          # NOTE: no "splat" sound for green
    if ymov > 50:                       (line 115)
        ymov += 1
        if ymov > 100: dead = true
        return
    if force < 1 and abs(originalx - ballmc._x) > force*300: (line 124)
        ymov  += 2 - force
        force -= force * 0.15

# Common: integrate position
ballmc._x   += xmov                     (line 130)
ballmc._y   += ymov                     (line 131)
shadowmc._x += shadowxmov               (line 132)
shadowmc._y += shadowymov               (line 133)
```

### 5.1 Notes / "physics" interpretation
- There is **no continuous gravity**; the ball flies in a straight line until
  it has travelled past a `force`-dependent horizontal distance threshold.
- After the threshold, on each frame `ymov` is **increased by `(3 - force)` for
  red** or `(2 - force)` for green — this is a per-frame "fall acceleration"
  but only applied while the trigger condition is true (i.e. while still past
  the threshold), and it is **gated by `force != 1` (red) / `force < 1`
  (green)**: a perfectly-charged red shot (`force == 1`) **never** drops.
- `force` itself decays each frame the trigger fires: `force -= force * 0.15`
  → multiplicative `force *= 0.85`.
- "Drag" in the horizontal sense: **none.** `xmov` is constant for life.
- Lifetime termination: once `ymov` exceeds 50 it counts as landed; `ymov`
  ticks up by 1 per frame and the ball is marked `dead` when `ymov > 100`
  → up to ~50 frames of post-landing animation cleanup. The owning
  `Snowcraft1Rewrite.frameloop` then destroys it (Section 6).

### 5.2 Range thresholds (px from `originalx`)
| Team   | Trigger predicate                                   | Drop per frame | Force decay |
|--------|------------------------------------------------------|----------------|-------------|
| red    | `force != 1 && originalx - ballmc._x > force*100`    | `ymov += 3-force` | `force *= 0.85` |
| green  | `force < 1 && |originalx - ballmc._x| > force*300`   | `ymov += 2-force` | `force *= 0.85` |

(Red's predicate is signed because reds always travel `-x`, but green's uses
`Math.abs(...)`. This asymmetry is in the source; preserve as-is.)

### 5.3 Landing windows (signal that the ball has hit the ground)
| Team   | "Becomes ineffective" when | "Triggers land/splat" when         |
|--------|----------------------------|------------------------------------|
| red    | `ymov > -3`                | `ymov > -2 && ymov < 50`           |
| green  | `ymov > 17`                | `ymov > 18 && ymov < 50`           |

## 6. Hit detection, hit radius, damage

Owned by `Snowcraft1Rewrite.frameloop`, not by `SnowBall`.
`Snowcraft1Rewrite.as:354-393`

### 6.1 Red ball vs Green dudie (`Snowcraft1Rewrite.as:363-372`)
```as
if(this.adudies[_loc3_] instanceof com.iconnicholson.onehammer.GreenSnowDudie)
{
   _loc4_ = this.adudies[_loc3_];
   if(_loc2_.team == "red"
      && Math.abs(_loc2_.ballmc._x - _loc4_.dudiemc._x) < 30
      && Math.abs(_loc2_.ballmc._y - (_loc4_.dudiemc._y - 20)) < 30
      && !_loc4_.dead && !_loc4_.down && !_loc2_.dead && !_loc2_.ineffective)
   {
      _loc2_.dead = true;
      this.score += 10;
      _loc4_.yougothit();
   }
}
```

### 6.2 Green ball vs Red dudie (`Snowcraft1Rewrite.as:373-381`)
```as
else if(this.adudies[_loc3_] instanceof com.iconnicholson.onehammer.RedSnowDudie)
{
   _loc5_ = this.adudies[_loc3_];
   if(_loc2_.team == "green"
      && Math.abs(_loc2_.ballmc._x - _loc5_.dudiemc._x) < 30
      && Math.abs(_loc2_.ballmc._y - (_loc5_.dudiemc._y - 20)) < 30
      && !_loc5_.dead && !_loc2_.dead && !_loc2_.ineffective)
   {
      _loc2_.dead = true;
      _loc5_.yougothit();
   }
}
```

### 6.3 Constants (collision)
| Constant                              | Value | Source line                |
|---------------------------------------|-------|----------------------------|
| Hit half-width (Chebyshev/AABB-x)     | **30 px** | `Snowcraft1Rewrite.as:366,376` |
| Hit half-height (Chebyshev/AABB-y)    | **30 px** | `Snowcraft1Rewrite.as:366,376` |
| Vertical offset of hitbox center on dudie | **-20 px** (`dudiemc._y - 20`) | `Snowcraft1Rewrite.as:366,376` |
| Score per green hit                   | **+10** | `Snowcraft1Rewrite.as:369`     |
| Score per red-hit                     | (none — only red-on-green scores) | n/a |
| Time-bonus on win                     | `Math.round((1800000 - elapsed_ms)/1000)` if `elapsed_ms < 1_800_000` | `Snowcraft1Rewrite.as:416-419` |

The hitbox is an **axis-aligned 60x60 px square** centered at
`(dudie._x, dudie._y - 20)`. (Two independent `Math.abs(...) < 30` checks form
a square, not a circle.)

### 6.4 Damage / hit points
| Dudie | Starting HP | Per-hit cost | On-hit branches                                      |
|-------|-------------|--------------|------------------------------------------------------|
| Red   | **2** (`RedSnowDudie.as:13`)   | -1 | HP==1 → `dazed=40`, frame `"hitdazed"`, sounds `"hit1"` & `"birds"` (`RedSnowDudie.as:71-79`); HP==0 → `dead`, frame `"dead"`, sound `"kids" + Math.ceil(Math.random()*3)` (`:81-89`) |
| Green | **3** (`GreenSnowDudie.as:15`) | -1 | HP==2 → frame `"hit"`, sound `"hit1"` (`GreenSnowDudie.as:44-50`); HP==1 → `down=true`, frame `"down"`, sound `"hit1"` (`:51-56`); HP==0 → frame `"dead"`, sound `"kids1..3"` (`:57-66`) |

A green dudie that is `down` (HP==1) **cannot be hit again** by snowballs
because of the `!_loc4_.down` guard at `Snowcraft1Rewrite.as:366`. (Red has no
equivalent `down` state.)

### 6.5 Ineffective rule
A snowball with `ineffective == true` **never registers a hit** (final clause
of both predicates: `!_loc2_.ineffective`). `ineffective` becomes true when:
- Red: launched with `force < 0.1` (`RedSnowDudie.as:116` — `ineffective:_loc2_ < 0.1`),
  **or** during flight when `ymov > -3` (`SnowBall.as:75-78`).
- Green: not set at launch (`GreenSnowDudie.throwball` omits the field), but is
  set in flight when `ymov > 17` (`SnowBall.as:104-107`).

## 7. Lifetime / despawn

Two independent reapers:

### 7.1 Self-marking (`SnowBall.frameloop`)
- Sets `dead = true` once `ymov > 100` (`SnowBall.as:90-93,118-121`) — i.e. ~50
  frames after touching ground.
- Sets `dead = true` immediately on collision (in
  `Snowcraft1Rewrite.frameloop`).

### 7.2 Game loop sweep (`Snowcraft1Rewrite.as:384-407`)
```as
if(Math.abs(_loc2_.ballmc._x) > 2999 || Math.abs(_loc2_.ballmc._y) > 2999 || _loc2_.dead)
{
   _loc7_.push(_loc6_);
}
else
{
   _loc2_.frameloop();
}
...
this.snowballs[_loc7_[_loc6_]].destroy();
this.snowballs.splice(_loc7_[_loc6_],1);
```
- World-bound culling: any `|ballmc._x| > 2999` **or** `|ballmc._y| > 2999`.
- After a ball is reaped, `destroy()` removes both `ballmc` and `shadowmc`
  (`SnowBall.as:62-66`).

### 7.3 Throw cooldown
There is no explicit `throwCooldown` constant. Effective cadence is gated by
- Red: must press → `cock` animation → release (`RedSnowDudie.as:64,127`),
  charge meter is read on release.
- Green AI: between throws, runs a state machine in `GreenSnowDudie.frameloop`
  using `balling` and `cocking` counters:
  - `balling = 10 + Math.round(Math.random()*50)` frames (`:159`)
  - then `cocking = 15 + Math.round(Math.random()*30)` frames (`:154`)
  - `throwball()` fires when `cocking == 10` (`:120-123`)
  - Random "wander" interrupt with `Math.random() > 0.975` (`:129`).
  - At 20 fps these intervals are roughly: balling ≈ 0.5–3.0 s, cocking ≈ 0.75–2.25 s.

## 8. Sounds — playback contract (frame labels on `_root.sounds`)

`_root.sounds` is the MovieClip exported as `DefineSprite_85` (the SWF's
sound-cue jukebox). All `this.sounds.gotoAndPlay("...")` calls jump the clip
to a labelled frame whose only purpose is to play one `DefineSound`.

| Event                                  | Call site                                          | Frame label   |
|----------------------------------------|----------------------------------------------------|---------------|
| Snowball spawn, `force >= 1`           | `SnowBall.as:53-56`                                | `"longthrow"` |
| Snowball spawn, `force < 1`            | `SnowBall.as:57-60`                                | `"throw"`     |
| Red snowball lands (splat)             | `SnowBall.as:84`                                   | `"splat"`     |
| Green snowball lands                   | (no sound — only `shadowmc.gotoAndPlay("land")`)   | n/a           |
| Dudie hurt (HP > 0)                    | `RedSnowDudie.as:77`, `GreenSnowDudie.as:49,55`    | `"hit1"`      |
| Red dazed bonus cue                    | `RedSnowDudie.as:78`                               | `"birds"`     |
| Dudie killed                           | `RedSnowDudie.as:88`, `GreenSnowDudie.as:65`       | `"kids1"`, `"kids2"`, `"kids3"` randomised via `Math.ceil(Math.random()*3)` |
| Walking footstep                       | `RedSnowDudie.as:150`, `GreenSnowDudie.as:112`     | `"step"`      |

Frame-label evidence in `dump.txt`:
- `"throw"` — `dump.txt:637`
- `"longthrow"` — `dump.txt:646`
- `"hit1"` — `dump.txt:671`
- `"kids1"` — `dump.txt:685`, `"kids2"` — `:700`, `"kids3"` — `:718`
- `"splat"` — `dump.txt:800`
- `"birds"` — `dump.txt:811`
- `"step"` — `dump.txt:579`

## 9. Asset IDs (sprite/sound character ids in the SWF)

| Logical name      | Linkage id (`ExportAssets`) | SWF chid | Where used |
|-------------------|------------------------------|----------|------------|
| Snowball ball     | `"snowball"`                 | **35** (`dump.txt:235`) | `attachMovie("snowball", ...)` `SnowBall.as:37` |
| Snowball shadow   | `"snowballshadow"`           | **48** (`dump.txt:287`) | `attachMovie("snowballshadow", ...)` `SnowBall.as:34` |
| Red dudie         | `"reddudie"`                 | **32** (`dump.txt:226`) | `RedSnowDudie.as:22` |
| Green dudie       | `"greendudie"`               | **69** (`dump.txt:553`) | `GreenSnowDudie.as:21` |
| Selection circle  | `"selectioncircle"`          | **8**  (`dump.txt:21`)  | `RedSnowDudie.as:23,69,97,101` |
| Sounds container  | `_root.sounds` MovieClip     | **85** (DefineSprite_85)| `Snowcraft1Rewrite` constructor (passed in via `frame_5` factory) |

### 9.1 Snowball ball sprite
- `DefineSprite (chid: 35)`, single image frame: `decompiled/sprites/DefineSprite_35_snowball/1.png`.
- It is **not animated**; only its container `MovieClip._x/_y` move.

### 9.2 Snowball shadow sprite (`DefineSprite_48_snowballshadow`)
Timeline (from `dump.txt:257-287`):
- Frame 1: idle shadow shape (chid 37). `DoAction` → `stop()`
  (`DefineSprite_48_snowballshadow/frame_1/DoAction.as:1`).
- Frame 2: `FrameLabel "land"` + chid 40 → start of splash anim.
- Frames 3..14: shape swaps 43, 47 with several `ShowFrame`s producing the
  splat dissipation.
- Frame 15: `DoAction` → `stop()`
  (`DefineSprite_48_snowballshadow/frame_15/DoAction.as:1`).

So `shadowmc.gotoAndPlay("land")` plays exactly **14 frames** (≈ 0.7 s at 20 fps)
before stopping.

## 10. Pseudocode summary (port-friendly)

```pseudo
class SnowBall:
    GROUND_DISTANCE = 35
    KILL_OUT_OF_BOUNDS = 2999

    on_construct(team, force, x, y, ineffective):
        self.team, self.force = team, force
        self.originalx, self.originaly = x, y
        self.ball.pos  = (x, y)
        self.shadow.pos = (x, y + GROUND_DISTANCE)
        if team == "red":   self.vel = self.shadow_vel = (-20, -10)
        else:               self.vel = self.shadow_vel = ( 20,  10)   # green
        self.dead = False
        self.ineffective = bool(ineffective)
        play_sound("longthrow" if force >= 1 else "throw")

    tick():       # called once per 1/20 s
        if self.dead: return
        if self.team == "red":
            if self.vel.y > -3: self.ineffective = True
            if -2 < self.vel.y < 50:                    # landed
                self.vel.y = 51
                self.ball.visible = False
                self.shadow.play("land")
                play_sound("splat")
                return
            if self.vel.y > 50:
                self.vel.y += 1
                if self.vel.y > 100: self.dead = True
                return
            if self.force != 1 and self.originalx - self.ball.x > self.force * 100:
                self.vel.y += (3 - self.force)
                self.force *= 0.85
        else:  # green
            if self.vel.y > 17: self.ineffective = True
            if 18 < self.vel.y < 50:
                self.vel.y = 51
                self.ball.visible = False
                self.shadow.play("land")     # NOTE: green has no splat sound
                return
            if self.vel.y > 50:
                self.vel.y += 1
                if self.vel.y > 100: self.dead = True
                return
            if self.force < 1 and abs(self.originalx - self.ball.x) > self.force * 300:
                self.vel.y += (2 - self.force)
                self.force *= 0.85

        self.ball.pos   += self.vel
        self.shadow.pos += self.shadow_vel

class Game.frameloop_collisions(snowballs, dudies):
    for sb in snowballs:
        for d in dudies:
            if not d.dead and not sb.dead and not sb.ineffective:
                if (d is GreenSnowDudie and sb.team == "red"  and not d.down) \
                or (d is RedSnowDudie   and sb.team == "green"):
                    if abs(sb.ball.x - d.x) < 30 \
                    and abs(sb.ball.y - (d.y - 20)) < 30:
                        sb.dead = True
                        if d is GreenSnowDudie: score += 10
                        d.yougothit()
        if abs(sb.ball.x) > 2999 or abs(sb.ball.y) > 2999 or sb.dead:
            reap(sb)
        else:
            sb.tick()
```

## 11. "Unknown / ambiguous" — items not pinned down by source

1. **Throw cooldown for the player.** Red's cadence is gated by the manual UI
   (`cock` → release) and the `meter` MovieClip's frame, not by a numeric
   cooldown. The exact frame-rate of the meter clip itself isn't in any
   `.as`; it is a Flash timeline (would need to dump `DefineSprite_32_reddudie`
   timeline to derive max-charge time).
2. **Force-to-meter mapping precision.** `force = meter._currentframe / 15`
   (`RedSnowDudie.as:114`) implies the meter clip has 15 frames; not verified
   in source; verify by dumping `reddudie.meter` timeline if exact charge curve
   is needed.
3. **Why the asymmetric `force != 1` (red) vs `force < 1` (green) gate.**
   For red, a `force == 1` shot never drops, but for green the equivalent never
   triggers either (since random `force` ∈ `[0.3, 0.9)`). Whether this is a
   bug in the original or intentional is undocumented — keep as-is for
   faithful port.
4. **No splat sound for green-team landings.** `SnowBall.frameloop` omits the
   `sounds.gotoAndPlay("splat")` in the green branch (`SnowBall.as:108-114`).
   Source-original behaviour; consciously match it (do **not** "fix" it).
5. **Hit shape is a square (two independent abs-checks), not a circle.** The
   30 px is a half-extent on each axis, not a radius. We preserve this.
6. **`grounddistance = 35` field is set but unused after construction**
   (`SnowBall.as:17,42`). The shadow's vertical offset is hard-coded `+35` at
   spawn; it never tracks the ball during flight. Carry forward as a literal,
   not a parameter.
7. **Damage values are implicit** (each hit always does -1 HP); no separate
   "damage" parameter exists. If the port adds damage variants later, they are
   non-faithful additions.
8. **Per-team starting positions** (`reddudie1startx=450, ...startx=420, =310`,
   `Snowcraft1Rewrite.as:13-18`) are dudie-spec, not snowball-spec, but useful
   to compute initial throw origins on level start.
9. **Slow-mo (`slomo = 0`) field** in `Snowcraft1Rewrite` is declared but never
   read in the decompiled source — leave inert.
