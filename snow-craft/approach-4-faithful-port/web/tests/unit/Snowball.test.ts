import { describe, it, expect, beforeEach } from "vitest";
import { Snowball } from "../../src/core/Snowball";

// Faithful port of `class com.iconnicholson.onehammer.SnowBall`
// (decompiled at scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as).
// Spec: spec/snowball.md.
//
// All time-based constants are per-frame at 20 fps (Flash original ran
// frameloop() once per onEnterFrame; spec/snowball.md §1).

// Simple `sounds` stub that records every gotoAndPlay call.
function makeSoundsStub() {
  const calls: string[] = [];
  return {
    calls,
    gotoAndPlay(label: string) {
      calls.push(label);
    },
  };
}

describe("Snowball — construction (SnowBall.as:18-61)", () => {
  it("latches originalx/originaly and places ball + shadow", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as:39-42
    const sounds = makeSoundsStub();
    const sb = new Snowball({
      sounds,
      team: "red",
      force: 0.5,
      x: 100,
      y: 200,
    });
    expect(sb.originalx).toBe(100);
    expect(sb.originaly).toBe(200);
    expect(sb.ballmc.x).toBe(100);
    expect(sb.ballmc.y).toBe(200);
    expect(sb.shadowmc.x).toBe(100);
    expect(sb.shadowmc.y).toBe(200 + 35); // grounddistance = 35 (SnowBall.as:17,42)
  });

  it("defaults: dead=false, ineffective=false, grounddistance=35", () => {
    // from SnowBall.as:15-17
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 0.5,
      x: 0,
      y: 0,
    });
    expect(sb.dead).toBe(false);
    expect(sb.ineffective).toBe(false);
    expect(sb.grounddistance).toBe(35);
  });

  it("respects ineffective constructor arg when truthy", () => {
    // from SnowBall.as:24-27 — only sets when truthy
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 0.001,
      x: 0,
      y: 0,
      ineffective: true,
    });
    expect(sb.ineffective).toBe(true);
  });

  it("does NOT overwrite ineffective default when arg is falsy", () => {
    // from SnowBall.as:24-27 — `if(ineffective){ this.ineffective = ineffective; }`
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "green",
      force: 0.5,
      x: 0,
      y: 0,
      ineffective: false,
    });
    expect(sb.ineffective).toBe(false);
  });

  it("red team initial velocity = (-20, -10) for both ball and shadow", () => {
    // from SnowBall.as:43-47
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 0.5,
      x: 0,
      y: 0,
    });
    expect(sb.xmov).toBe(-20);
    expect(sb.ymov).toBe(-10);
    expect(sb.shadowxmov).toBe(-20);
    expect(sb.shadowymov).toBe(-10);
  });

  it("green team initial velocity = (+20, +10) for both ball and shadow", () => {
    // from SnowBall.as:48-52
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "green",
      force: 0.5,
      x: 0,
      y: 0,
    });
    expect(sb.xmov).toBe(20);
    expect(sb.ymov).toBe(10);
    expect(sb.shadowxmov).toBe(20);
    expect(sb.shadowymov).toBe(10);
  });

  it("plays 'longthrow' sound when force >= 1", () => {
    // from SnowBall.as:53-56
    const sounds = makeSoundsStub();
    new Snowball({ sounds, team: "red", force: 1, x: 0, y: 0 });
    expect(sounds.calls).toContain("longthrow");
    expect(sounds.calls).not.toContain("throw");
  });

  it("plays 'throw' sound when force < 1", () => {
    // from SnowBall.as:57-60
    const sounds = makeSoundsStub();
    new Snowball({ sounds, team: "red", force: 0.5, x: 0, y: 0 });
    expect(sounds.calls).toContain("throw");
    expect(sounds.calls).not.toContain("longthrow");
  });
});

describe("Snowball — destroy (SnowBall.as:62-66)", () => {
  it("marks both ballmc and shadowmc as removed", () => {
    // from SnowBall.as:64-65 — removeMovieClip()
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 0.5,
      x: 0,
      y: 0,
    });
    sb.destroy();
    expect(sb.ballmc.removed).toBe(true);
    expect(sb.shadowmc.removed).toBe(true);
  });
});

describe("Snowball — frameloop early return when dead (SnowBall.as:69-72)", () => {
  it("does nothing when dead", () => {
    // from SnowBall.as:69-72
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 0.5,
      x: 100,
      y: 100,
    });
    sb.dead = true;
    const beforeX = sb.ballmc.x;
    const beforeY = sb.ballmc.y;
    sb.frameloop();
    expect(sb.ballmc.x).toBe(beforeX);
    expect(sb.ballmc.y).toBe(beforeY);
  });
});

describe("Snowball — red frameloop branches (SnowBall.as:73-101)", () => {
  it("integrates position by xmov/ymov on a normal frame (force=1, no drop)", () => {
    // from SnowBall.as:130-133. force == 1 disables the drop trigger.
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 1,
      x: 100,
      y: 100,
    });
    sb.frameloop();
    expect(sb.ballmc.x).toBe(100 + -20);
    expect(sb.ballmc.y).toBe(100 + -10);
    expect(sb.shadowmc.x).toBe(100 + -20);
    expect(sb.shadowmc.y).toBe(100 + 35 + -10);
    // ymov still -10, force never drops
    expect(sb.ymov).toBe(-10);
    expect(sb.force).toBe(1);
  });

  it("force == 1 NEVER drops (drop gate is force != 1) — SnowBall.as:96", () => {
    // from SnowBall.as:96 — `if(this.force != 1 && ...)`
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 1,
      x: 100,
      y: 100,
    });
    // simulate a long flight where ball has travelled many px past the threshold
    sb.ballmc.x = 100 - 9999;
    sb.frameloop();
    // ymov still -10 (not -10 + (3-force))
    expect(sb.ymov).toBe(-10);
    expect(sb.force).toBe(1);
  });

  it("when ymov > -3 sets ineffective = true (SnowBall.as:75-78)", () => {
    // from SnowBall.as:75-78
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 0.5,
      x: 100,
      y: 100,
    });
    sb.ymov = -2.5; // > -3
    sb.frameloop();
    expect(sb.ineffective).toBe(true);
  });

  it("when -2 < ymov < 50 triggers landing (SnowBall.as:79-86)", () => {
    // from SnowBall.as:79-86 — snap ymov=51, hide ball, play splat
    const sounds = makeSoundsStub();
    const sb = new Snowball({
      sounds,
      team: "red",
      force: 0.5,
      x: 100,
      y: 100,
    });
    sounds.calls.length = 0; // clear spawn sound
    sb.ymov = 0; // > -2 && < 50
    sb.frameloop();
    expect(sb.ymov).toBe(51);
    expect(sb.ballmc.visible).toBe(false);
    expect(sb.shadowmc.animation).toBe("land");
    expect(sounds.calls).toContain("splat");
    // landing returns early — ball didn't move this frame
    expect(sb.ballmc.x).toBe(100);
    expect(sb.ballmc.y).toBe(100);
  });

  it("when ymov > 50 ticks +1 and stays alive while <= 100 (SnowBall.as:87-94)", () => {
    // from SnowBall.as:87-94
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 0.5,
      x: 100,
      y: 100,
    });
    sb.ymov = 51;
    sb.frameloop();
    expect(sb.ymov).toBe(52);
    expect(sb.dead).toBe(false);
    // returns early — no position update
    expect(sb.ballmc.x).toBe(100);
  });

  it("when ymov > 100 marks dead (SnowBall.as:90-93)", () => {
    // from SnowBall.as:90-93
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 0.5,
      x: 100,
      y: 100,
    });
    sb.ymov = 101; // already > 100? No, branch increments first. Use 100.
    // the branch is: if(ymov > 50) { ymov += 1; if(ymov > 100) dead = true; }
    // so to flip dead we need ymov pre-tick >= 100.
    sb.ymov = 100;
    sb.frameloop();
    expect(sb.ymov).toBe(101);
    expect(sb.dead).toBe(true);
  });

  it("red drop trigger: ymov += (3 - force), force *= 0.85 (SnowBall.as:96-100)", () => {
    // from SnowBall.as:96-100
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 0.5,
      x: 100,
      y: 100,
    });
    // originalx - ballmc._x must exceed force*100 = 50.
    // Place ball 60 px to the left of originalx (red moves -x).
    sb.ballmc.x = 40; // 100 - 40 = 60 > 50
    sb.frameloop();
    // ymov was -10. After: -10 + (3 - 0.5) = -7.5
    expect(sb.ymov).toBeCloseTo(-7.5, 10);
    // force was 0.5. After: 0.5 - 0.5*0.15 = 0.425
    expect(sb.force).toBeCloseTo(0.425, 10);
    // and then position is integrated (xmov=-20, ymov=-7.5 post-update)
    expect(sb.ballmc.x).toBeCloseTo(40 - 20, 10);
    expect(sb.ballmc.y).toBeCloseTo(100 + -7.5, 10);
  });

  it("red: drop predicate signed (originalx - x), not abs", () => {
    // from SnowBall.as:96 — `this.originalx - this.ballmc._x > this.force * 100`
    // If ball were to the RIGHT of originalx (originalx - x is negative), no drop.
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 0.5,
      x: 100,
      y: 100,
    });
    sb.ballmc.x = 9999; // originalx - x = 100 - 9999 = -9899 (NOT > 50)
    sb.frameloop();
    // ymov should still be -10 (no drop applied)
    expect(sb.ymov).toBe(-10);
    expect(sb.force).toBe(0.5);
  });
});

describe("Snowball — green frameloop branches (SnowBall.as:102-128)", () => {
  it("integrates position by xmov/ymov on a normal frame (force=0.5, below threshold)", () => {
    // from SnowBall.as:130-133.
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "green",
      force: 0.5,
      x: 100,
      y: 100,
    });
    sb.frameloop();
    expect(sb.ballmc.x).toBe(100 + 20);
    expect(sb.ballmc.y).toBe(100 + 10);
    expect(sb.shadowmc.x).toBe(100 + 20);
    expect(sb.shadowmc.y).toBe(100 + 35 + 10);
    // ymov should still be 10, no drop yet (originalx - x = -20, abs = 20, 20 < 0.5*300=150)
    expect(sb.ymov).toBe(10);
    expect(sb.force).toBe(0.5);
  });

  it("when ymov > 17 sets ineffective = true (SnowBall.as:104-107)", () => {
    // from SnowBall.as:104-107
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "green",
      force: 0.5,
      x: 100,
      y: 100,
    });
    sb.ymov = 17.5; // > 17 but <= 18 — exercises the ineffective branch in isolation
    sb.frameloop();
    expect(sb.ineffective).toBe(true);
    // not a landing (need > 18)
    expect(sb.ymov).not.toBe(51);
  });

  it("when 18 < ymov < 50 triggers landing — NO splat sound (SnowBall.as:108-114)", () => {
    // from SnowBall.as:108-114 — green has no `sounds.gotoAndPlay("splat")` line
    const sounds = makeSoundsStub();
    const sb = new Snowball({
      sounds,
      team: "green",
      force: 0.5,
      x: 100,
      y: 100,
    });
    sounds.calls.length = 0; // clear spawn sound
    sb.ymov = 19; // > 18 && < 50
    sb.frameloop();
    expect(sb.ymov).toBe(51);
    expect(sb.ballmc.visible).toBe(false);
    expect(sb.shadowmc.animation).toBe("land");
    // crucially NO splat sound — see spec/snowball.md §11.4
    expect(sounds.calls).not.toContain("splat");
    // returns early — ball didn't move
    expect(sb.ballmc.x).toBe(100);
  });

  it("when ymov > 50 ticks +1 and dies > 100 (SnowBall.as:115-122)", () => {
    // from SnowBall.as:115-122
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "green",
      force: 0.5,
      x: 100,
      y: 100,
    });
    sb.ymov = 51;
    sb.frameloop();
    expect(sb.ymov).toBe(52);
    expect(sb.dead).toBe(false);
    expect(sb.ballmc.x).toBe(100); // returns early, no integration
    sb.ymov = 100;
    sb.frameloop();
    expect(sb.ymov).toBe(101);
    expect(sb.dead).toBe(true);
  });

  it("green drop trigger: ymov += (2 - force), force *= 0.85 (SnowBall.as:124-128)", () => {
    // from SnowBall.as:124-128
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "green",
      force: 0.5,
      x: 100,
      y: 100,
    });
    // |originalx - x| > 0.5*300 = 150. Move green ball far to the right.
    sb.ballmc.x = 100 + 200; // |100 - 300| = 200 > 150
    sb.frameloop();
    expect(sb.ymov).toBeCloseTo(10 + (2 - 0.5), 10); // 11.5
    expect(sb.force).toBeCloseTo(0.5 - 0.5 * 0.15, 10); // 0.425
    // Then position integrated
    expect(sb.ballmc.x).toBeCloseTo(300 + 20, 10);
    expect(sb.ballmc.y).toBeCloseTo(100 + 11.5, 10);
  });

  it("green: drop predicate uses Math.abs (SnowBall.as:124)", () => {
    // from SnowBall.as:124 — `Math.abs(this.originalx - this.ballmc._x) > this.force * 300`
    // Move green ball far to the LEFT — abs threshold should still trigger.
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "green",
      force: 0.5,
      x: 100,
      y: 100,
    });
    sb.ballmc.x = 100 - 200; // |100 - (-100)| = 200 > 150
    sb.frameloop();
    expect(sb.ymov).toBeCloseTo(10 + (2 - 0.5), 10);
    expect(sb.force).toBeCloseTo(0.425, 10);
  });

  it("green: force >= 1 NEVER drops (SnowBall.as:124 gate is force < 1)", () => {
    // from SnowBall.as:124 — `if(this.force < 1 && ...)`
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "green",
      force: 1,
      x: 100,
      y: 100,
    });
    sb.ballmc.x = 9999;
    sb.frameloop();
    expect(sb.ymov).toBe(10);
    expect(sb.force).toBe(1);
  });
});

describe("Snowball — landing-window order of operations", () => {
  it("ineffective check fires before landing snap on red (SnowBall.as:75 vs 79)", () => {
    // from SnowBall.as:75-86 — ineffective set first, then if also in landing window we land too
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "red",
      force: 0.5,
      x: 0,
      y: 0,
    });
    sb.ymov = 0; // > -3 (ineffective) AND > -2 && < 50 (landing)
    sb.frameloop();
    expect(sb.ineffective).toBe(true);
    expect(sb.ymov).toBe(51); // landing snap
  });

  it("ineffective check fires before landing snap on green (SnowBall.as:104 vs 108)", () => {
    // from SnowBall.as:104-114
    const sb = new Snowball({
      sounds: makeSoundsStub(),
      team: "green",
      force: 0.5,
      x: 0,
      y: 0,
    });
    sb.ymov = 19; // > 17 (ineffective) AND > 18 && < 50 (landing)
    sb.frameloop();
    expect(sb.ineffective).toBe(true);
    expect(sb.ymov).toBe(51);
  });
});
