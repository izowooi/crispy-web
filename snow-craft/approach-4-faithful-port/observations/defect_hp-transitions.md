# Defect: hp-transitions (GREEN dudie HP cascade)

**Factual truth:** Per `GreenSnowDudie.as:37-67`, a green dudie starts with `hitpoints = 3` and `yougothit()` decrements once per call; the *first* hit lands `justhit=true` (hp=2), the *second* hit puts the green `down=true` (hp=1), and the *third* hit kills it (`dead=true`, hp=0). The user's recollection that the green "falls down on first hit" is wrong — it takes **two** hits to fall.

---

## AS source — exact lines

File: `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/GreenSnowDudie.as`

Initial HP (line 15):

```as
15:   var hitpoints = 3;
14:   var down = false;
```

`yougothit()` body (lines 37-67):

```as
37:   function yougothit()
38:   {
39:      this.walking = false;
40:      this.cocking = this.balling = 0;
41:      this.dudiemc.justhit = false;
42:      this.down = this.dudiemc.down = false;
43:      this.hitpoints = this.hitpoints - 1;
44:      if(this.hitpoints == 2)
45:      {
46:         this.dudiemc.justhit = true;
47:         this.adobefrozenframebugfix = 50;
48:         this.dudiemc.gotoAndPlay("hit");
49:         this.sounds.gotoAndPlay("hit1");
50:      }
51:      if(this.hitpoints == 1)
52:      {
53:         this.down = this.dudiemc.down = true;
54:         this.dudiemc.gotoAndPlay("down");
55:         this.sounds.gotoAndPlay("hit1");
56:      }
57:      var _loc3_;
58:      if(this.hitpoints == 0)
59:      {
60:         this.dudiemc.gotoAndPlay("dead");
61:         this.dead = true;
62:         _root.grounditer = _root.grounditer + 1;
63:         _loc3_ = this.stage.createEmptyMovieClip("deadgreendudie" + _root.grounditer,_root.grounditer);
64:         this.dudiemc.swapDepths(_loc3_);
65:         this.sounds.gotoAndPlay("kids" + Math.ceil(Math.random() * 3));
66:      }
67:   }
```

Note: the three `if` checks are sequential and use `==` (not `else if`). Only one branch fires per call because each call decrements exactly once at line 43, and the post-decrement value is one of {2, 1, 0}.

Also note that lines 41-42 unconditionally clear `justhit` and `down` *before* the decrement, then the matching branch re-sets the appropriate flag for the new HP. So a hit while already `justhit` simply transitions the green to the next state — `justhit` is not stacked.

---

## Trace — sequential hits to a fresh green

Initial: `hitpoints=3, justhit=false, down=false, dead=false`.

**After 1st `yougothit()` call** (AS:39-50)
- AS:39-42 clear `walking`, `cocking`, `balling`, `justhit`, `down`.
- AS:43 → `hitpoints = 3 - 1 = 2`.
- AS:44-50 branch fires: `justhit = true`, `adobefrozenframebugfix = 50`, plays pose `"hit"` and sound `"hit1"`.
- Lines 51-66 do NOT fire (hp is 2, not 1, not 0).
- **State:** `hitpoints=2, justhit=true, down=false, dead=false`.

**After 2nd `yougothit()` call** (AS:39-42, 51-56)
- AS:39-42 clear `justhit` (and others) again.
- AS:43 → `hitpoints = 2 - 1 = 1`.
- AS:44-50 does NOT fire.
- AS:51-56 branch fires: `down = true`, plays pose `"down"` and sound `"hit1"`.
- Lines 58-66 do NOT fire.
- **State:** `hitpoints=1, justhit=false, down=true, dead=false`. ← This is the "falls down" frame.

**After 3rd `yougothit()` call** (AS:39-42, 58-66)
- AS:39-42 clear `justhit`/`down`.
- AS:43 → `hitpoints = 1 - 1 = 0`.
- AS:44-50 and AS:51-56 do NOT fire.
- AS:58-66 branch fires: pose `"dead"`, `dead = true`, depth-swap onto a new `deadgreendudie<N>` clip on `stage`, sound `"kids" + ceil(rand*3)` (1..3).
- **State:** `hitpoints=0, justhit=false, down=false, dead=true`.

So the cascade is:

| Call | hp before | hp after | justhit | down  | dead  | Pose / SFX                  |
|------|-----------|----------|---------|-------|-------|-----------------------------|
| 1st  | 3         | 2        | true    | false | false | `"hit"` + `hit1`            |
| 2nd  | 2         | 1        | false   | true  | false | `"down"` + `hit1`           |
| 3rd  | 1         | 0        | false   | false | true  | `"dead"` + `kids1\|2\|3`    |

The user's claim that green "falls down on first hit" is contradicted by lines 44-50: the first hit only sets `justhit=true` and plays the `"hit"` animation; the green keeps standing. The fall (`down=true`, `"down"` animation) requires the second hit (lines 51-56).

---

## Port status — current code is CORRECT

File: `web/src/core/AI.ts` lines 42, 144, 229-260.

- `GREEN_HP = 3` (line 42) and the AI factory seeds `hitpoints: GREEN_HP` (line 144). ✓ matches AS:15.
- `greenYouGotHit` (lines 229-260) mirrors AS:39-66 line-for-line:
  - Lines 231-235 clear `walking/cocking/balling/justhit/down` (AS:39-42). ✓
  - Line 237 decrements `hitpoints` (AS:43). ✓
  - Lines 239-245: `hp===2` branch sets `justhit=true`, `adobefrozenframebugfix`, pose `"hit"`, sound `"hit1"` (AS:44-50). ✓
  - Lines 246-251: `hp===1` branch sets `down=true`, pose `"down"`, sound `"hit1"` (AS:51-56). ✓
  - Lines 252-259: `hp===0` branch sets `dead=true`, pose `"dead"`, sound `"kids" + ceil(rand*3)` (AS:58-66). ✓
- The three branches are sequential `if` statements (not `else if`), matching AS exactly.

I read `web/src/core/AI.ts` lines 220-300 and `web/src/core/Player.ts` (which is the *red/player* `yougothit`, separate from green). The green path in `AI.ts` already implements the AS:37-67 cascade faithfully.

---

## What the port must do differently

Based on a direct read of `web/src/core/AI.ts:225-260`, **no change is required to the HP-cascade logic itself**. The port is faithful to AS:37-67. Specifically:

- `web/src/core/AI.ts:42` — `GREEN_HP = 3` is correct; do **not** lower this to 1 to match the user's recollection. The recollection is incorrect.
- `web/src/core/AI.ts:229-260` (`greenYouGotHit`) — keep as-is. The three sequential `if (ai.hitpoints === N)` blocks for N in {2,1,0} match AS:44, 51, 58 exactly. Do not convert them to `else if`; the AS source uses plain `if` (line numbers 44, 51, 58 are independent statements).
- `web/src/core/AI.ts:231-235` — the unconditional pre-clear of `justhit`/`down` before the decrement matches AS:41-42 and must stay (otherwise repeat hits would leave stale flags set).

If the symptom "green falls down on first hit" is being observed in the running port, the bug is **not** in `greenYouGotHit`. Likely real causes to investigate (this report does not confirm any of them — they are starting points only):

1. **Double-invocation of `greenYouGotHit` per snowball impact.** Check the collision/impact site that calls into `greenYouGotHit` (search `web/src/core/Game.ts` and `web/src/core/Snowball.ts` for the call site). If a single hit dispatches `yougothit` twice in one frame, hp would go 3→2→1 and the green would fall on what looks like the first hit.
2. **Wrong factory seed.** Verify at runtime that the green's `hitpoints` field is actually 3 when spawned (`web/src/core/AI.ts:144` reads `GREEN_HP`); a regression elsewhere that overwrites it to 2 would produce the same observed symptom.
3. **Renderer reading `down` from the wrong source.** AS:42 sets both `this.down` and `this.dudiemc.down`; the port collapses these into a single `ai.down` (`AI.ts:88`, comments at `AI.ts:287-292`). If the renderer/pose layer treats `justhit` as "down", the green would *appear* to fall on hit 1 even though `ai.down` is still false. Confirm `render/pose.ts` distinguishes `"hit"` vs `"down"` poses.
4. **Snapshots in `observations/05_green_after_first_hit.png` etc.** were captured with a build that may have had a different bug; re-verify against the current `AI.ts` before drawing conclusions.

The fix surface, if any, is in the **caller** of `greenYouGotHit` or the **renderer**, not in the `yougothit` cascade itself.
