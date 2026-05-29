# Defect: ai-throw — Green AI never throws

**Factual truth from the AS source:** in the original AS, a green AI does throw snowballs — once `titles._visible` returns to `false` (the title-card sprite runs `gotoAndStop(1)` at frames 73 / 165, and frame 1 sets `this._visible = false`), the cascade `(F) walk-roll → (G) titles gate → (H) balling countdown → (E) cocking countdown → throwball()` fires; under typical level-1 play one throw fires roughly every ~25-100 frames per still-alive green after the title fades, with `cocking==10` triggering the dispatch.

## 1. The dispatch site

`decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as:161-165`
```as
function throwball()
{
   var _loc2_ = {target:this,type:"throwball",force:0.3 + Math.random() * 0.6,team:this.team,x:this.dudiemc._x,y:this.dudiemc._y - 15};
   this.dispatchEvent(_loc2_);
}
```
There is exactly one caller: `frameloop()` at line 123.

## 2. The exact control flow that reaches `throwball()`

`GreenSnowDudie.as:73-159` is a strict priority cascade (early-return at every branch). For the dispatch on line 164 to ever fire we must, on some frame, descend through:

| Branch | AS lines | Pre-condition needed |
| --- | --- | --- |
| (A) dead | 75-78 | `this.dead === false` |
| (B) down | 79-82 | `this.dudiemc.down === false` |
| (C) justhit | 84-92 | `this.dudiemc.justhit === false` (or has counted down) |
| (D) walking | 93-116 | `this.walking === false` (must have arrived AND `titles._visible` was false at arrival, so 103-104 cleared `walking` and `walkendx/y`) |
| (E) cocking | 117-126 | reached only with `this.cocking > 0`. **Dispatch fires when `cocking` decrements to exactly `10`** |
| (F) walk-roll | 127-143 | `Math.random() > 0.975 && !this.walkendx` — i.e. the 2.5% walk dice **must not** roll, AND `walkendx` must already be 0 |
| (G) titles gate | 144-147 | `this.titles._visible === false` — otherwise return undefined |
| (H) balling countdown | 148-157 | runs only when not titlesVisible; when `balling` reaches 0 sets `cocking = 15 + round(rand*30)` |
| (I) start balling | 158-159 | sets `balling = 10 + round(rand*50)` |

Quoted from `GreenSnowDudie.as`:
```as
117:      if(this.cocking > 0)
118:      {
119:         this.cocking = this.cocking - 1;
120:         if(this.cocking == 10)
121:         {
122:            this.dudiemc.gotoAndStop("toss");
123:            this.throwball();
124:         }
125:         return undefined;
126:      }
...
129:      if(Math.random() > 0.975 || this.walkendx)
130:      {
131:         this.walking = true; ...
142:         return undefined;
143:      }
144:      if(this.titles._visible)
145:      {
146:         return undefined;
147:      }
148:      if(this.balling > 0)
149:      {
150:         this.balling = this.balling - 1;
151:         if(this.balling <= 0)
152:         {
153:            this.dudiemc.gotoAndStop("cock");
154:            this.cocking = 15 + Math.round(Math.random() * 30);
155:         }
156:         return undefined;
157:      }
158:      this.dudiemc.gotoAndStop("balling");
159:      this.balling = 10 + Math.round(Math.random() * 50);
```

### Answers to the specific gate questions

- **Is `titles._visible` required to be FALSE?** Yes. Branch (G) at line 144 unconditionally returns when `titles._visible` is true, so neither (H) nor (I) can run, so `balling` never gets initialized, so `cocking` is never set, so `throwball()` is never reached. (Branch (D) at line 98 also slows the dudie to `walkspeed=3` and prevents `walking` from being cleared on arrival while titles are visible.)
- **Does `balling` tick down to 0 first?** Yes. (I) at line 159 sets `balling = 10..60`; subsequent frames hit branch (H) to decrement; when `balling <= 0`, line 154 sets `cocking = 15..45`; subsequent frames hit (E); at the tick where `cocking` decrements to exactly `10`, `throwball()` fires.
- **Does `rand > 0.975 || walkendx` ever short-circuit cocking indefinitely?** No, not indefinitely. (F) is checked **after** (E), so once `cocking > 0` the AI is committed to the cocking countdown (E) and the walk-roll cannot interrupt. The walk-roll only delays the **start** of balling: when `walkendx === 0` and `cocking === 0` and `balling === 0`, the dice gate fires with probability ~0.025 per frame (one-tail of `Math.random()>0.975`); on the other ~0.975 of frames it falls through to (G) and (H/I). So balling/cocking is the typical path.

## 3. The "levelx" / "seasonsgreetings" timeline (titles sprite = DefineSprite_110)

The titles MovieClip controls `_visible` with timeline DoActions. From `decompiled/scripts/scripts/DefineSprite_110/`:

- `frame_1/DoAction.as:2` — `this._visible = false;`
- `frame_2/DoAction.as:1` — `this._visible = true; play();`
- `frame_5` — label `seasonsgreetings` (level 1 intro starts here)
- `frame_73/DoAction.as:1` — `gotoAndStop(1);` (returns to frame 1, fires `_visible = false` action)
- `frame_74/DoAction.as` — `this._visible = true; ... levelfade.levelx.text = "Level " + this.lev; _root.sounds.gotoAndPlay("goodbadugly"); play();`
- `frame_149` (label `levelx`)
- `frame_165/DoAction.as:1` — `gotoAndStop(1);` (again returns _visible to false)

So in the original Flash runtime, after the level-intro animation finishes its ~70 frames (~2-3 s at 24-30 fps), `gotoAndStop(1)` lands on frame 1 and `this._visible = false` runs. From that moment onward, branch (G) lets greens proceed to balling/cocking, and throws happen continuously.

`Snowcraft1Rewrite.as:447` also pre-clears `titles._visible = false` in `reset()`, but `dolevel(1)` immediately calls `titles.gotoAndPlay("seasonsgreetings")` which makes the title sprite play frame 2 first (`_visible = true`).

## 4. How often a throw fires under typical level-1 play

After titles drops to `_visible=false`, per active green AI per tick:

- `balling` countdown: starts at `10..60` frames (`balling = 10 + round(rand*50)`).
- `cocking` countdown: starts at `15..45` frames; throw fires when `cocking == 10`, so it takes `start - 10` ticks of cocking, i.e. `5..35` frames between starting to cock and the dispatch.
- Walk-roll occasionally (probability 0.025 per "idle" tick) injects a walk that takes (distance/walkspeed) frames before re-arrival.

Mean inter-throw interval per dudie ≈ mean(balling) + mean(cocking-to-10) ≈ 35 + 20 = ~55 frames, plus occasional walks. At ~24 fps that is roughly one throw every ~2.5 s per green after the title fades — i.e. with multiple greens, throws are essentially constant gameplay.

## 5. Status in the current web port

In `web/src/main.ts:93-102` the titles shim only flips `_visible` on `gotoAndPlay`:

```ts
const titles = {
  _visible: false,
  ...
  gotoAndPlay(label: string) {
    this.label = label;
    this._visible = label !== "" && label !== "1";
  },
};
```

There is no equivalent of the AS timeline that, after ~70 frames, runs `gotoAndStop(1)` → frame_1 action `_visible = false`. `Game.dolevel(1)` calls `titles.gotoAndPlay("seasonsgreetings")` (`web/src/core/Game.ts:576`) and `titlesVisible()` (passed through `factories.ts:221-222` into `TickContext`) returns `true` forever after.

In `web/src/core/AI.ts:357-358`:
```ts
// (G) Title-card freeze — AS:144-147
if (ctxIn.titlesVisible) return;
```
This branch returns every frame, so branches (H) and (I) never run, `balling`/`cocking` never get initialized, and `greenThrowBall()` (line 266-277) is never called.

Branch (D) at `AI.ts:303-318` reproduces the AS arrival behavior: when titlesVisible is true, on arrival `walkspeed = 3` and the dudie remains `walking=true` with `walkendx/y` not cleared, so it sticks at the destination posing "balling" each frame — this matches the AS, but the title never drops, so it never advances.

Net effect: green AIs in the port never reach `onThrow`. Verified by reading the cascade; no test confirms the absence of throws here, but the gate logic is unambiguous.

## What the port must do differently

The fix is in the `titles` shim (and only there). The AI cascade in `web/src/core/AI.ts` is faithful and does not need to change.

Concrete changes in `/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port/web/src/`:

1. **`web/src/main.ts:93-102` — make the `titles` shim model the timeline auto-return.**
   The AS title sprite plays a finite-length intro then runs `gotoAndStop(1)` which fires the frame-1 `_visible = false` action. The shim must reproduce this: when `gotoAndPlay("seasonsgreetings")` or `gotoAndPlay("levelx")` is called, schedule an automatic clear of `_visible` after the intro length elapses. Two acceptable approaches:
   - Tick-based (preferred for determinism and to mirror Flash's 24 fps timeline): track an internal `framesRemaining` counter on the shim that is decremented every `Game.frameloop()` and clears `_visible` when it hits 0. For "seasonsgreetings" use ~68 frames (frame 5 to frame 73 in DefineSprite_110); for "levelx" use ~16 frames (frame 149 to frame 165). Add a `tick()` method on the shim and call it from `main.ts`'s render/update loop alongside `game.frameloop()`.
   - Wall-clock fallback: `setTimeout(() => { this._visible = false; }, intervalMs)` with `intervalMs ≈ 70 / 24 * 1000 ≈ 2900ms` for "seasonsgreetings" and `~670ms` for "levelx". Less faithful (Flash framerate isn't real-time), but acceptable as a pragmatic shim.
   - Also: `gotoAndPlay("gameoverwin")` / `gotoAndPlay("gameoverlose")` / `gotoAndPlay("credits")` should keep `_visible = true` (no auto-clear) — those labels live further down the sprite at frames 297 / 516 / 706 and the SWF pauses there.

2. **No change to `web/src/core/AI.ts`.** The branch-(G) `if (ctxIn.titlesVisible) return;` at line 358 is correct and matches `GreenSnowDudie.as:144-147` verbatim. Once the shim drops `_visible` to `false` at the right time, the cascade reaches (H)/(I)/(E) and the existing `greenThrowBall()` (lines 266-277) dispatches to the existing snowball factory.

3. **No change to `web/src/core/Game.ts`.** `dolevel()` already calls `titles.gotoAndPlay("seasonsgreetings"|"levelx")` per the AS source, and `reset()` already pre-clears `_visible`. `Game.frameloop()` is the natural place to call `titles.tick?.()` once per frame to drive the shim's countdown if option (a) is chosen.

4. **Optional verification:** add a unit test against `tickGreen` that, given `titlesVisible: false`, walks through ~70 ticks with a fixed RNG and asserts `onThrow` was called at least once with `team:"green"`, `force` in `[0.3, 0.9]`, and `y === ai.y - 15` (per `GreenSnowDudie.as:163`). This locks the contract.
