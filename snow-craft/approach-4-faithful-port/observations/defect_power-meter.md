# Defect: power-meter

The power meter is an inner MovieClip named **"meter"** (export-id-less; SWF chid **19**, named instance "meter" placed inside `reddudie` chid 32 at depth 13) whose own 15-frame timeline auto-advances at the runtime FPS the moment the parent reddudie hits the **"cock"** label and runs `meter.gotoAndPlay(1)`; `RedSnowDudie.throwball` then samples its `_currentframe` to derive the throw force.

## Factual evidence from the AS / SWF source

### 1. RedSnowDudie samples `meter._currentframe`

`decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/RedSnowDudie.as`

```as
108:   function throwball()
109:   {
110:      var _loc2_ = 0.001;
111:      trace(this.dudiemc.meter._currentframe);
112:      if(this.dudiemc.meter._currentframe > 4)
113:      {
114:         _loc2_ = this.dudiemc.meter._currentframe / 15;
115:      }
```

`onchosen` does **not** touch the meter — it just plays the parent `cock` label:

```as
63:      this.dragdudie = true;
64:      this.dudiemc.gotoAndPlay("cock");
```

### 2. The meter is started/stopped by the reddudie's per-frame DoActions

The reddudie sprite has these per-frame scripts (all in
`decompiled/scripts/scripts/DefineSprite_32_reddudie/`):

| frame | label     | DoAction.as content                                                       |
|------:|-----------|---------------------------------------------------------------------------|
| 1     | `rest`    | `meter._visible = false; stop();`                                          |
| 2     | `ready`   | `stop(); meter._visible = false; dazed = false;`                           |
| **3** | **`cock`**| `meter.gotoAndPlay(1); meter._visible = true; stop();`                     |
| 4     | `toss`    | `stop(); meter._visible = false;`                                          |
| 5     | `hitdazed`| `play();`                                                                  |
| 7     | `dazed`   | `meter._visible = false; play();`                                          |
| 15    | (mid-dazed loop) | `gotoAndStop("dazed"); play();`                                     |
| 16    | `dead`    | `play(); meter._visible = false;`                                          |
| …     | `walk`    | `play();` then `gotoAndStop("walk"); play();`                              |

So the reddudie **stops on `cock` frame 3** while the inner `meter` clip is the
only thing still ticking. There is **no `meter.gotoAndPlay`** on any other
frame and no AS-side code that increments `_currentframe`.

### 3. The "meter" clip definition (chid 19)

From `decompiled/dump.txt`:

- `35. DefineSprite (chid: 32)` is `reddudie` (export name confirmed by
  `36. ExportAssets (chid: 32, exp: "reddudie")`, dump line 263).
- Inside reddudie, on the `rest` frame (line 142):
  `7. PlaceObject2 (chid: 19, dpt: 13, nm: "meter")` — this is the only
  placement of the meter; no exported class name, just an instance name.
- `22. DefineSprite (chid: 19)` (dump line 45) has **15 frames**, with the
  inner sub-sprites `chid 15` and `chid 17` placed two-frames-apart so that
  more "tick marks" are visible on each successive frame, ending with a
  `DoAction stop();` (`scripts/DefineSprite_19/frame_15/DoAction.as`).
  Visually (verified by reading
  `decompiled/sprites/DefineSprite_19/{1,8,15}.png`) it is a small green
  vertical bar that grows from a single tick (frame 1) to a full stack of 7
  ticks (frame 15).
- It has **no `ExportAssets`** tag — it is referenced solely as an instance
  named "meter" inside reddudie.

### 4. Where it is drawn

The meter's position is set by the PlaceObject2 matrix on the `rest` frame
of reddudie (depth 13, child of the dudie sprite). Because it is a child of
`dudiemc` it inherits `dudiemc._x` / `_y` — the meter therefore sits at a
fixed offset above-and-slightly-right-of the dudie's foot, **moving with the
dudie** (drag teleport at `RedSnowDudie.as:177-181` updates `dudiemc._x/_y`,
and the meter follows automatically as a child).

### 5. Which timeline advances the meter

The meter advances on its **own** internal timeline. The trigger is
`meter.gotoAndPlay(1)` on the parent `cock` frame (DefineSprite_32 frame 3
DoAction); thereafter the parent does `stop()` and the meter keeps playing
because no `meter.stop()` is called from outside. The meter's internal
frame 15 contains `stop();`, so it self-clamps at full power. Force is
sampled exactly when the user releases (`mouserelease → throwball →
meter._currentframe / 15`). At Flash's 20 fps this means roughly
`50 ms × 14 = 700 ms` from press until full charge clamp, with the
`>4`-frame threshold reached at ~200 ms.

## What the port must do differently

The port currently treats the meter as a binary `0|1` flag and never animates
or draws it. Concretely, in
`/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/web/src/`:

1. **`main.ts:353`** sets `const meterFrame = dragging === d ? 1 : 0;`. This
   is wrong: the AS meter ticks 1→15 over time. Replace with a per-dudie
   integer that increments by 1 on every Game frame (20 fps) while the dudie
   is being held, and clamps at 15. Use `globalAnimTick - pressStartTick` (in
   ticks, not ms) so the cadence is locked to the 20 fps simulation, not
   wall-clock. Reset to 0 on release / when drag is cleared.

2. **`main.ts:227-229`** computes the throw force from `heldMs / 50` instead
   of from the actual meter frame. After (1), replace this with
   `meterFrame = clamp(globalAnimTick - pressStartTick, 1, 15)` and keep the
   `>4 ? meterFrame/15 : 0.001` rule (matches RedSnowDudie.as:110-114
   exactly). The current `Math.round(heldMs / 50)` is close in spirit but
   diverges from the AS truth that the meter is frame-discrete (only 15
   integer levels) and tied to the simulation tick.

3. **`render/Renderer.ts` (drawDudie / a new `drawMeter`)** does not draw the
   meter at all. Add a small green bar drawn above the dudie at the same
   sprite-local offset PlaceObject2 chid 19 used (i.e. roughly the dudie's
   head — see the green vertical strip in
   `decompiled/sprites/DefineSprite_19/15.png`). Show 1-of-15 height in
   proportion to `meterFrame`; hide entirely when `meterFrame === 0` (mirrors
   `meter._visible = false` on `rest`/`ready`/`toss`/`hitdazed`/`dazed`/
   `dead` frames). Pass `meterFrame` into `drawDudie` so the renderer can
   layer it over the body PNG; alternatively have the renderer expose a
   sibling `drawPowerMeter(x, y, meterFrame)` called after the dudie body.

4. **`render/pose.ts:89`** treats `meterFrame > 0` as the trigger for the
   `cock` pose. That stays correct AS-wise (cock is the parent label), but
   `meterFrame` must come from the new ticking value (1) instead of the
   hard-coded 1, so `pose.ts` does not need to change — only its caller.

5. **`core/Player.ts:102 (`meterFrame = 0`)** is already declared but never
   driven. If/when `main.ts` is rewired to use `Player` directly, the
   `Player.frameloop` should also advance `meterFrame` while
   `adobesucksmouseisdownflag && dragdudie` and reset it when those clear or
   when `mouserelease`/`yougothit` runs. (AS does this implicitly via the
   meter clip's auto-play; the port has to do it explicitly because we
   collapsed the inner timeline onto a scalar.)

Out of scope for this defect: the depth-swap logic
(`RedSnowDudie.as:56-60`), `selectioncircle` toggling, and the `dazed`
walking animation.
