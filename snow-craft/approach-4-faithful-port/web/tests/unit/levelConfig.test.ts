// Tests for the faithful port of `Snowcraft1Rewrite.greendudiestartingpoints`
// (i.e. the per-level enemy spawn table) plus the immediately-related
// constants from the same class. All citations are to
// `decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as`
// unless stated otherwise.
//
// The TDD authority for arithmetic in this file is the AS source itself,
// not `spec/levels.md` §9 (which has a couple of typos in the "post-mutation"
// listings — every datum below is recomputed from the source operations).

import { describe, expect, it } from "vitest";

import {
  RED_DUDIE_STARTS,
  buildLevelConfig,
  greenWalkSpeedForLevel,
  isLastLevel,
  TOTAL_LEVELS,
  ORIGINAL_TOTAL_LEVELS,
  EXTRA_LEVELS,
  RED_HP,
  GREEN_HP,
  RED_BALL_INITIAL_XMOV,
  RED_BALL_INITIAL_YMOV,
  GREEN_BALL_INITIAL_XMOV,
  GREEN_BALL_INITIAL_YMOV,
  WORLD_CULL_BOUND,
  GREEN_HIT_SCORE,
  TIME_BONUS_WINDOW_MS,
  GAME_FPS,
  HIT_TEST_RADIUS,
  HIT_TEST_Y_OFFSET,
  REDDUDIE_PLACEMENT_DX,
  REDDUDIE_PLACEMENT_DY,
} from "../../src/core/levelConfig.ts";

// A perfectly deterministic RNG so we can assert the level-9 random values
// without relying on Math.random().
const constRng = (v: number) => () => v;

describe("levelConfig — engine-level constants", () => {
  it("has 20 fps from the SWF header", () => {
    // from spec/levels.md §1 (SWF header FrameRate fixed8 = 20.0)
    expect(GAME_FPS).toBe(20);
  });

  it("uses Math.abs(_x|_y) > 2999 to cull off-world snowballs", () => {
    // from scripts/Snowcraft1Rewrite.as:384
    expect(WORLD_CULL_BOUND).toBe(2999);
  });

  it("uses |Δx|<30 and |Δy-(-20)|<30 hit-test for ball↔dudie", () => {
    // from scripts/Snowcraft1Rewrite.as:366 (red→green) and :376 (green→red)
    expect(HIT_TEST_RADIUS).toBe(30);
    expect(HIT_TEST_Y_OFFSET).toBe(20);
  });

  it("awards +10 score per green hit", () => {
    // from scripts/Snowcraft1Rewrite.as:369  this.score += 10;
    expect(GREEN_HIT_SCORE).toBe(10);
  });

  it("uses a 30-minute (1.8e6 ms) win-time bonus window", () => {
    // from scripts/Snowcraft1Rewrite.as:416-419
    expect(TIME_BONUS_WINDOW_MS).toBe(1_800_000);
  });
});

describe("levelConfig — dudie HP", () => {
  it("RED HP = 2", () => {
    // from scripts/.../RedSnowDudie.as:13
    expect(RED_HP).toBe(2);
  });
  it("GREEN HP = 3", () => {
    // from scripts/.../GreenSnowDudie.as:15
    expect(GREEN_HP).toBe(3);
  });
});

describe("levelConfig — red team starts (always 3, fixed every level)", () => {
  it("declares the three red start positions verbatim", () => {
    // from scripts/Snowcraft1Rewrite.as:13-18
    expect(RED_DUDIE_STARTS).toEqual([
      { startX: 450, startY: 200 },
      { startX: 420, startY: 260 },
      { startX: 310, startY: 250 },
    ]);
  });

  it("places reds at (start+200, start+100) and walks them to (start, start)", () => {
    // from scripts/Snowcraft1Rewrite.as:242-259
    expect(REDDUDIE_PLACEMENT_DX).toBe(200);
    expect(REDDUDIE_PLACEMENT_DY).toBe(100);
  });
});

describe("levelConfig — snowball initial velocity per team", () => {
  it("red ball xmov = -20, ymov = -10", () => {
    // from scripts/.../SnowBall.as:45-46
    expect(RED_BALL_INITIAL_XMOV).toBe(-20);
    expect(RED_BALL_INITIAL_YMOV).toBe(-10);
  });
  it("green ball xmov = 20, ymov = 10", () => {
    // from scripts/.../SnowBall.as:50-51
    expect(GREEN_BALL_INITIAL_XMOV).toBe(20);
    expect(GREEN_BALL_INITIAL_YMOV).toBe(10);
  });
});

describe("levelConfig — total level count and end-of-game test", () => {
  it("has 9 original + 5 extended = 14 level entries", () => {
    // Original table indices 0..8 (Snowcraft1Rewrite.as:42-210) PLUS the
    // appended extended campaign (EXTRA_LEVELS, levels 10..14).
    const cfg = buildLevelConfig(constRng(0.5));
    expect(ORIGINAL_TOTAL_LEVELS).toBe(9);
    expect(EXTRA_LEVELS).toHaveLength(5);
    expect(cfg.levels).toHaveLength(14);
    expect(TOTAL_LEVELS).toBe(14);
  });

  it("isLastLevel(14) is true; original last level 9 is no longer last", () => {
    // Win triggers at `lev == greendudiestartingpoints.length`
    // (Snowcraft1Rewrite.as:309-316) — now 14 with the extended campaign.
    expect(isLastLevel(14)).toBe(true);
    expect(isLastLevel(13)).toBe(false);
    expect(isLastLevel(9)).toBe(false);
    expect(isLastLevel(1)).toBe(false);
  });
});

describe("levelConfig — per-level enemy counts", () => {
  it("keeps the canonical original progression (3,5,7,9,12,12,12,12,50)", () => {
    // from scripts/Snowcraft1Rewrite.as:42-210 — original levels 1..9 unchanged.
    const cfg = buildLevelConfig(constRng(0.5));
    expect(cfg.levels.slice(0, 9).map((l) => l.greens.length)).toEqual([
      3, 5, 7, 9, 12, 12, 12, 12, 50,
    ]);
  });

  it("extended levels 10..14 ramp the enemy count 6→7→8→9→10", () => {
    const cfg = buildLevelConfig(constRng(0.5));
    expect(cfg.levels.slice(9).map((l) => l.greens.length)).toEqual([
      6, 7, 8, 9, 10,
    ]);
  });

  it("extended-level greens spawn off the left edge and walk to on-stage targets", () => {
    const cfg = buildLevelConfig(constRng(0.5));
    for (const lvl of cfg.levels.slice(9)) {
      for (const [sx, , tx, ty] of lvl.greens) {
        expect(sx).toBeLessThan(0); // spawns off-screen left
        expect(tx).toBeGreaterThanOrEqual(0); // walks onto the 592-wide stage
        expect(tx).toBeLessThanOrEqual(592);
        expect(ty).toBeGreaterThanOrEqual(0);
        expect(ty).toBeLessThanOrEqual(320);
        // Target stays in green territory (above the (592,0)-(0,320) divider).
        expect(ty).toBeLessThan(320 - (320 / 592) * tx);
      }
    }
  });
});

describe("levelConfig — green walk-speed per level", () => {
  it("levels 1,2,3,4 use the default walkspeed (5)", () => {
    // from scripts/.../ASnowDudie.as:11 (default = 5)
    // and scripts/Snowcraft1Rewrite.as:273-280 (no override applies)
    expect(greenWalkSpeedForLevel(1)).toBe(5);
    expect(greenWalkSpeedForLevel(2)).toBe(5);
    expect(greenWalkSpeedForLevel(3)).toBe(5);
    expect(greenWalkSpeedForLevel(4)).toBe(5);
  });
  it("level 5 forces walkspeed = 10", () => {
    // from scripts/Snowcraft1Rewrite.as:273-275  (level == 5 || level > 6)
    expect(greenWalkSpeedForLevel(5)).toBe(10);
  });
  it("level 6 forces walkspeed = 15", () => {
    // from scripts/Snowcraft1Rewrite.as:277-280  (level == 6, runs after the >6 branch)
    expect(greenWalkSpeedForLevel(6)).toBe(15);
  });
  it("levels 7,8,9 force walkspeed = 10", () => {
    // from scripts/Snowcraft1Rewrite.as:273-275  (level > 6)
    expect(greenWalkSpeedForLevel(7)).toBe(10);
    expect(greenWalkSpeedForLevel(8)).toBe(10);
    expect(greenWalkSpeedForLevel(9)).toBe(10);
  });
  it("extended levels 10..14 ramp walkspeed 11..15 (capped at 16)", () => {
    expect(greenWalkSpeedForLevel(10)).toBe(11);
    expect(greenWalkSpeedForLevel(11)).toBe(12);
    expect(greenWalkSpeedForLevel(12)).toBe(13);
    expect(greenWalkSpeedForLevel(13)).toBe(14);
    expect(greenWalkSpeedForLevel(14)).toBe(15);
  });
});

describe("levelConfig — Level 1 spawn table (verbatim)", () => {
  it("is exactly the 3 hand-authored entries", () => {
    // from scripts/Snowcraft1Rewrite.as:42-45
    const cfg = buildLevelConfig(constRng(0.5));
    expect(cfg.levels[0].greens).toEqual([
      [-20, -60, 180, 40],
      [-130, -60, 70, 40],
      [-130, 1, 70, 100],
    ]);
  });
});

describe("levelConfig — Level 2 spawn table (verbatim)", () => {
  it("is exactly the 5 hand-authored entries", () => {
    // from scripts/Snowcraft1Rewrite.as:46-51
    const cfg = buildLevelConfig(constRng(0.5));
    expect(cfg.levels[1].greens).toEqual([
      [-20, -60, 180, 40],
      [-130, -60, 70, 40],
      [-130, 1, 70, 100],
      [-50, -100, -2, -99],
      [-50, 1, -49, 1],
    ]);
  });
});

describe("levelConfig — Level 3 spawn table (verbatim)", () => {
  it("is exactly the 7 hand-authored entries", () => {
    // from scripts/Snowcraft1Rewrite.as:52-59
    const cfg = buildLevelConfig(constRng(0.5));
    expect(cfg.levels[2].greens).toEqual([
      [-20, -60, 180, 40],
      [-130, -60, 70, 40],
      [-130, 1, 70, 100],
      [-50, 100, -51, 101],
      [-50, 150, -51, 151],
      [-100, -50, -101, -51],
      [-150, -50, -151, -50],
    ]);
  });
});

describe("levelConfig — Level 4 spawn table (verbatim)", () => {
  it("is exactly the 9 hand-authored entries", () => {
    // from scripts/Snowcraft1Rewrite.as:60-69
    const cfg = buildLevelConfig(constRng(0.5));
    expect(cfg.levels[3].greens).toEqual([
      [-20, -60, 180, 40],
      [-130, -60, 70, 40],
      [-130, 1, 70, 100],
      [-50, 100, -51, 101],
      [-50, 150, -51, 151],
      [-100, -50, -101, -51],
      [-150, -50, -151, -50],
      [-100, -50, -101, -51],
      [-150, -50, -151, -50],
    ]);
  });
});

describe("levelConfig — Level 5 spawn table", () => {
  it("uses the second [4] block (lines 83-95) and applies the [0]=[2]-400, [1]=[3]-200 mutation", () => {
    // from scripts/Snowcraft1Rewrite.as:83-95 (second assignment overrides 70-82)
    // and scripts/Snowcraft1Rewrite.as:96-102 (mutation loop applied to the live array)
    const cfg = buildLevelConfig(constRng(0.5));
    expect(cfg.levels[4].greens).toEqual([
      [-220, -160, 180, 40],
      [-330, -160, 70, 40],
      [-330, -100, 70, 100],
      [-451, -99, -51, 101],
      [-451, -49, -51, 151],
      [-240, -120, 160, 80],
      [-130, -110, 270, 90],
      [-240, -50, 160, 150],
      [-100, -60, 300, 140],
      [0, -50, 400, 150],
      [-451, -49, -51, 151],
      [-100, 5, 300, 205],
    ]);
  });
});

describe("levelConfig — Level 6 spawn table", () => {
  it("applies the if(i<6) [0]=-450-i*8, [1]=[3] / else [0]=[2], [1]=-350-i*8 mutation", () => {
    // from scripts/Snowcraft1Rewrite.as:103-130
    // (loop bound is greendudiestartingpoints[5].length = 12 — same as [4].length)
    const cfg = buildLevelConfig(constRng(0.5));
    expect(cfg.levels[5].greens).toEqual([
      [-450, 40, 520, 40],
      [-458, 80, 460, 80],
      [-466, 130, 400, 130],
      [-474, 165, 340, 165],
      [-482, 200, 280, 200],
      [-490, 250, 230, 250],
      [470, -398, 470, 40],
      [410, -406, 410, 80],
      [340, -414, 340, 130],
      [280, -422, 280, 165],
      [230, -430, 230, 200],
      [180, -438, 180, 250],
    ]);
  });
});

describe("levelConfig — Level 7 spawn table", () => {
  it("applies the i<3:[1]=-250 / i<6:[1]=-350 / else:[0]=[2]-400,[1]=[3]-200 mutation, [0]=[2] in the first two branches", () => {
    // from scripts/Snowcraft1Rewrite.as:131-163
    // NOTE: loop bound uses greendudiestartingpoints[4].length (= 12) — see :145
    const cfg = buildLevelConfig(constRng(0.5));
    expect(cfg.levels[6].greens).toEqual([
      [400, -250, 400, 80],
      [435, -250, 435, 70],
      [435, -250, 435, 105],
      [345, -350, 345, 135],
      [310, -350, 310, 175],
      [350, -350, 350, 175],
      [-315, 20, 85, 220],
      [-265, 20, 135, 220],
      [-220, 20, 180, 220],
      [-290, 60, 110, 260],
      [-245, 60, 155, 260],
      [-275, 90, 125, 290],
    ]);
  });
});

describe("levelConfig — Level 8 spawn table", () => {
  it("applies the i<6:copy [i+6][2..3]+150,-150, then [0]=[2]-400, [1]=[3]-200 mutation", () => {
    // from scripts/Snowcraft1Rewrite.as:164-188
    // NOTE: loop bound uses greendudiestartingpoints[4].length (= 12) — see :178
    const cfg = buildLevelConfig(constRng(0.5));
    expect(cfg.levels[7].greens).toEqual([
      [-165, -130, 235, 70],
      [-115, -130, 285, 70],
      [-70, -130, 330, 70],
      [-140, -90, 260, 110],
      [-95, -90, 305, 110],
      [-125, -60, 275, 140],
      [-315, 20, 85, 220],
      [-265, 20, 135, 220],
      [-220, 20, 180, 220],
      [-290, 60, 110, 260],
      [-245, 60, 155, 260],
      [-275, 90, 125, 290],
    ]);
  });
});

describe("levelConfig — Level 9 spawn table (50 random entries; only first 12 mutated)", () => {
  it("with rng()=0.5 each call produces deterministic table", () => {
    // from scripts/Snowcraft1Rewrite.as:189-210
    // raw push:  [-50, 100, 50 + rand*200, 50 + rand*200]   (50 entries)
    // mutation loop iterates greendudiestartingpoints[4].length = 12 times:
    //   i<10:  [0]=[2]-400, [1]=[3]-200
    //   i>=10: [0]=[2]-400, [1]=[3]
    // entries 12..49 are NOT touched.
    const cfg = buildLevelConfig(constRng(0.5));
    const greens = cfg.levels[8].greens;
    expect(greens).toHaveLength(50);

    // i = 0..9: [-250, -50, 150, 150]
    for (let i = 0; i < 10; i++) {
      expect(greens[i]).toEqual([-250, -50, 150, 150]);
    }
    // i = 10, 11: [-250, 150, 150, 150]   (note [1] retains [3] = 150)
    expect(greens[10]).toEqual([-250, 150, 150, 150]);
    expect(greens[11]).toEqual([-250, 150, 150, 150]);
    // i = 12..49: untouched constructor values [-50, 100, 150, 150]
    for (let i = 12; i < 50; i++) {
      expect(greens[i]).toEqual([-50, 100, 150, 150]);
    }
  });

  it("with rng()=0 each call: x=50, y=50 for the raw push, mutation as documented", () => {
    // raw entry: [-50, 100, 50, 50]
    // i<10:  [-350, -150, 50, 50]
    // i>=10: [-350,   50, 50, 50]
    // i>=12: [ -50,  100, 50, 50] (untouched)
    const cfg = buildLevelConfig(constRng(0));
    const greens = cfg.levels[8].greens;
    expect(greens[0]).toEqual([-350, -150, 50, 50]);
    expect(greens[9]).toEqual([-350, -150, 50, 50]);
    expect(greens[10]).toEqual([-350, 50, 50, 50]);
    expect(greens[11]).toEqual([-350, 50, 50, 50]);
    expect(greens[12]).toEqual([-50, 100, 50, 50]);
    expect(greens[49]).toEqual([-50, 100, 50, 50]);
  });

  it("seeds randomness ONCE at construction (re-build with same rng yields same table)", () => {
    // from spec/levels.md §9 final note — randomness is generated at game start,
    // not at level-load. We model this by snapshotting the table at construction.
    let n = 0;
    const seq = () => {
      // deterministic incrementing sequence in [0,1)
      n = (n + 0.123456789) % 1;
      return n;
    };
    const cfg1 = buildLevelConfig(seq);
    n = 0;
    const cfg2 = buildLevelConfig(seq);
    expect(cfg1.levels[8].greens).toEqual(cfg2.levels[8].greens);
  });
});

describe("levelConfig — independence of returned arrays", () => {
  it("two calls return independent arrays (mutating one does not affect the other)", () => {
    const a = buildLevelConfig(constRng(0.5));
    const b = buildLevelConfig(constRng(0.5));
    a.levels[0].greens[0][0] = 999;
    expect(b.levels[0].greens[0][0]).toBe(-20);
  });
});
