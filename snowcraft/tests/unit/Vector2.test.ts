// Vector2 unit tests — TDD spec for the port-introduced 2D math helper.
//
// Note: the original AS2 source has NO Vector2 class — gameplay code uses raw
// MovieClip `_x`/`_y` and pairs of locals (`xmov`/`ymov`, `walkxmov`/`walkymov`,
// `walkendx`/`walkendy`). This Vector2 type exists in the web port as a thin
// helper whose ops are derived from the *exact* arithmetic the decompiled AS
// performs. Each test below cites the AS line it mirrors so the math stays
// faithful.

import { describe, it, expect } from "vitest";
import { Vector2 } from "../../src/core/Vector2.ts";

describe("Vector2 — construction & shape", () => {
  it("constructs with explicit (x, y)", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as:39-40
    // ballmc._x = originalx = x; ballmc._y = originaly = y;
    const v = new Vector2(450, 200);
    expect(v.x).toBe(450);
    expect(v.y).toBe(200);
  });

  it("zero() returns (0, 0)", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/RedSnowDudie.as:141
    // this.walkendx = this.walkendy = 0;
    const v = Vector2.zero();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it("clone() returns a new instance with equal components", () => {
    // generic — needed because pos/vel are mutated in place each tick
    // (see SnowBall.as:130-133) so callers occasionally need a snapshot.
    const a = new Vector2(-20, -10);
    const b = a.clone();
    expect(b.x).toBe(-20);
    expect(b.y).toBe(-10);
    expect(b).not.toBe(a);
  });

  it("equals() compares components by value", () => {
    // generic equality predicate — used in tests below.
    const a = new Vector2(3, 4);
    const b = new Vector2(3, 4);
    const c = new Vector2(3, 5);
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describe("Vector2 — addition (in-place position integration)", () => {
  it("addInPlace mirrors `ballmc._x += xmov; ballmc._y += ymov;`", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as:130-131
    // this.ballmc._x += this.xmov;
    // this.ballmc._y += this.ymov;
    const pos = new Vector2(450, 165); // red ball spawn (450, 200-35)
    const vel = new Vector2(-20, -10); // SnowBall.as:45-46 red initial velocity
    pos.addInPlace(vel);
    expect(pos.x).toBe(430);
    expect(pos.y).toBe(155);
  });

  it("addInPlace also mirrors green-ball integration with positive xmov/ymov", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as:50-51
    // this.xmov = this.shadowxmov = 20;
    // this.ymov = this.shadowymov = 10;
    const pos = new Vector2(0, 100);
    const vel = new Vector2(20, 10);
    pos.addInPlace(vel);
    expect(pos.x).toBe(20);
    expect(pos.y).toBe(110);
  });

  it("add() returns a new Vector2 without mutating either operand", () => {
    // generic — many callers want a non-destructive sum.
    const a = new Vector2(1, 2);
    const b = new Vector2(3, 4);
    const c = a.add(b);
    expect(c.x).toBe(4);
    expect(c.y).toBe(6);
    expect(a.x).toBe(1);
    expect(a.y).toBe(2);
    expect(b.x).toBe(3);
    expect(b.y).toBe(4);
    expect(c).not.toBe(a);
    expect(c).not.toBe(b);
  });

  it("ymov accumulator step `ymov += 3 - force` integrates correctly via add", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as:98
    // this.ymov += 3 - this.force;
    const vel = new Vector2(-20, -10);
    const drop = new Vector2(0, 3 - 0.5); // force = 0.5 → +2.5 to ymov
    vel.addInPlace(drop);
    expect(vel.x).toBe(-20);
    expect(vel.y).toBeCloseTo(-7.5, 12);
  });
});

describe("Vector2 — subtraction (delta to target)", () => {
  it("sub() mirrors `(walkendx - dudiemc._x, walkendy - dudiemc._y)`", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/RedSnowDudie.as:160-162
    // _loc3_ = sqrt(pow(walkendy - dudiemc._y,2) + pow(walkendx - dudiemc._x,2));
    // walkxmov = (walkendx - dudiemc._x) / (_loc3_ / walkspeed);
    // walkymov = (walkendy - dudiemc._y) / (_loc3_ / walkspeed);
    const target = new Vector2(450, 200);
    const pos = new Vector2(650, 300); // start = (450+200, 200+100) per Snowcraft1Rewrite.as:13-18,245-259
    const delta = target.sub(pos);
    expect(delta.x).toBe(-200);
    expect(delta.y).toBe(-100);
  });

  it("subInPlace mutates the receiver", () => {
    const a = new Vector2(10, 5);
    const b = new Vector2(3, 2);
    a.subInPlace(b);
    expect(a.x).toBe(7);
    expect(a.y).toBe(3);
  });
});

describe("Vector2 — scalar multiplication", () => {
  it("scale(s) returns a new vector with both components multiplied", () => {
    // generic — used to build `force * 100` / `force * 300` thresholds and
    // `unit × walkspeed` magnitudes.
    const v = new Vector2(2, -3);
    const s = v.scale(4);
    expect(s.x).toBe(8);
    expect(s.y).toBe(-12);
    expect(v.x).toBe(2); // not mutated
    expect(v.y).toBe(-3);
  });

  it("scaleInPlace mirrors `force *= 0.85` style multiplicative decay applied per axis", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/SnowBall.as:99
    // this.force -= this.force * 0.15;     // i.e. force *= 0.85
    // (Vector2 isn't used for `force` itself but the same shape applies to
    //  velocity decay should the port need it.)
    const v = new Vector2(20, 10);
    v.scaleInPlace(0.85);
    expect(v.x).toBeCloseTo(17, 12);
    expect(v.y).toBeCloseTo(8.5, 12);
  });
});

describe("Vector2 — length / distance", () => {
  it("length() equals `Math.sqrt(pow(dx,2) + pow(dy,2))`", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/RedSnowDudie.as:160
    // _loc3_ = Math.sqrt(Math.pow(walkendy - dudiemc._y,2) + Math.pow(walkendx - dudiemc._x,2));
    const d = new Vector2(3, 4);
    expect(d.length()).toBe(5);
  });

  it("length() of (-200,-100) matches direct hypot value used by walk math", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/RedSnowDudie.as:160
    // sqrt(pow(walkendy - dudiemc._y,2) + pow(walkendx - dudiemc._x,2))
    // For Red player walk-in: delta = (-200, -100), dist = sqrt(50000)
    const d = new Vector2(-200, -100);
    expect(d.length()).toBeCloseTo(Math.sqrt(50000), 12);
  });

  it("lengthSquared() avoids the sqrt", () => {
    // generic optimization helper — useful for inner-loop distance comparisons
    // even though the original AS always took the sqrt.
    const d = new Vector2(3, 4);
    expect(d.lengthSquared()).toBe(25);
  });

  it("distanceTo(other) equals `(other - this).length()`", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/RedSnowDudie.as:160
    // this is the same hypot the walk math performs.
    const a = new Vector2(0, 0);
    const b = new Vector2(3, 4);
    expect(a.distanceTo(b)).toBe(5);
    expect(b.distanceTo(a)).toBe(5);
  });
});

describe("Vector2 — normalize / unit-vector × walkspeed", () => {
  it("normalize() returns a unit vector with length 1", () => {
    // generic — used by the walk math after computing the delta.
    const d = new Vector2(3, 4);
    const u = d.normalize();
    expect(u.x).toBeCloseTo(0.6, 12);
    expect(u.y).toBeCloseTo(0.8, 12);
    expect(u.length()).toBeCloseTo(1, 12);
  });

  it("normalize() of (0,0) returns (0,0) (avoid NaN)", () => {
    // safety net — the AS code never normalizes a zero vector because it
    // gates the call on `if(this.walkendx)` (RedSnowDudie.as:156), but the
    // port-side helper should not return NaN if asked.
    const z = Vector2.zero();
    const u = z.normalize();
    expect(u.x).toBe(0);
    expect(u.y).toBe(0);
  });

  it("unit × walkspeed reproduces walkxmov/walkymov from RedSnowDudie.as:160-162", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/RedSnowDudie.as:160-162
    //   _loc3_ = sqrt(pow(walkendy - dudiemc._y,2) + pow(walkendx - dudiemc._x,2));
    //   walkxmov = (walkendx - dudiemc._x) / (_loc3_ / walkspeed);
    //   walkymov = (walkendy - dudiemc._y) / (_loc3_ / walkspeed);
    // i.e. walkmov = (delta / dist) * walkspeed = unit(delta) * walkspeed.
    // Red player walk-in: from (650,300) to (450,200), walkspeed=5.
    const target = new Vector2(450, 200);
    const pos = new Vector2(650, 300);
    const walkspeed = 5; // ASnowDudie.as:11
    const delta = target.sub(pos); // (-200, -100)
    const dist = delta.length(); // sqrt(50000)
    const expectedX = -200 / (dist / walkspeed);
    const expectedY = -100 / (dist / walkspeed);
    const vel = delta.normalize().scale(walkspeed);
    expect(vel.x).toBeCloseTo(expectedX, 12);
    expect(vel.y).toBeCloseTo(expectedY, 12);
  });
});

describe("Vector2 — Chebyshev / AABB hit-box helpers", () => {
  it("withinAabb mirrors `Math.abs(dx) < halfW && Math.abs(dy) < halfH`", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as:366,376
    //   Math.abs(_loc2_.ballmc._x - _loc4_.dudiemc._x) < 30
    //   && Math.abs(_loc2_.ballmc._y - (_loc4_.dudiemc._y - 20)) < 30
    // The hit shape is a 60x60 square (two independent abs<30 checks).
    const ball = new Vector2(100, 80);
    const dudie = new Vector2(110, 95); // hit center = (110, 95-20) = (110, 75)
    const center = new Vector2(dudie.x, dudie.y - 20);
    // |100-110| = 10 < 30 and |80-75| = 5 < 30 → hit.
    expect(ball.withinAabb(center, 30, 30)).toBe(true);
  });

  it("withinAabb is strict `<` (not `<=`), matching `Math.abs(...) < 30`", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as:366
    // The original predicate is `< 30`, not `<= 30`.
    const ball = new Vector2(30, 0); // |dx| = 30 exactly
    const center = new Vector2(0, 0);
    expect(ball.withinAabb(center, 30, 30)).toBe(false);
  });

  it("withinAabb rejects when only one axis exceeds half-extent", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as:366
    // Both abs-checks must pass (`&&`), so failing either axis means no hit.
    const ball = new Vector2(0, 31);
    const center = new Vector2(0, 0);
    expect(ball.withinAabb(center, 30, 30)).toBe(false);
  });
});

describe("Vector2 — out-of-bounds cull (Chebyshev radius)", () => {
  it("withinChebyshev(2999) matches the snowball reaper predicate", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as:384
    //   if(Math.abs(_loc2_.ballmc._x) > 2999 || Math.abs(_loc2_.ballmc._y) > 2999 ...)
    //       reap;
    // A point is "still alive" iff |x| <= 2999 AND |y| <= 2999. We expose the
    // inclusive form (`<=`) because the AS guard uses strict `>` for the
    // OUT-of-bounds branch.
    const ok = new Vector2(2999, -2999);
    const oobX = new Vector2(3000, 0);
    const oobY = new Vector2(0, -3000);
    expect(ok.withinChebyshev(2999)).toBe(true);
    expect(oobX.withinChebyshev(2999)).toBe(false);
    expect(oobY.withinChebyshev(2999)).toBe(false);
  });
});
