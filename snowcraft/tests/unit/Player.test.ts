// Tests for the faithful port of the Red Snow Dudie player class
// (and its inherited ASnowDudie movement/clipping core).
//
// Spec source: spec/player.md (cited inline) and the decompiled
// ActionScript at decompiled/scripts/scripts/__Packages/com/iconnicholson/onehammer/{ASnowDudie,RedSnowDudie}.as.

import { describe, it, expect, beforeEach } from "vitest";
import { Player, checkline } from "../../src/core/Player.ts";

describe("ASnowDudie.checkline (line clipping)", () => {
  it("returns same point when 'less=true' and point is already on/above the diagonal", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/ASnowDudie.as:47-67
    // less=true forces x >= x_on_line; pick a point clearly on the >= side.
    const r = checkline(592, 0, 0, 320, 600, 0, 1);
    expect(r[0]).toBeCloseTo(600, 6);
    expect(r[1]).toBe(0);
  });

  it("clamps x up to the line when 'less=true' and point is below the line", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/ASnowDudie.as:47-67
    // Line through (592,0)-(0,320): m = (320-0)/(0-592) = -0.5405405...
    // x_on_line at y=160 is (160-0)/m + 592 = 296.
    // less=true means: if x < x_on_line, set x = x_on_line.
    const r = checkline(592, 0, 0, 320, 100, 160, 1);
    expect(r[0]).toBeCloseTo(296, 6);
    expect(r[1]).toBe(160);
  });

  it("clamps x down to the line when 'less=false' and point is above the line", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/ASnowDudie.as:59-62
    // less=false means: if x > x_on_line, set x = x_on_line.
    const r = checkline(610, 0, 0, 340, 600, 170, 0);
    // At y=170 line is x = (170/((340-0)/(0-610))) + 610 = 305.
    expect(r[0]).toBeCloseTo(305, 6);
    expect(r[1]).toBe(170);
  });

  it("returns the same point when 'less=false' and point already below the line", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/ASnowDudie.as:47-67
    const r = checkline(610, 0, 0, 340, 50, 50, 0);
    expect(r[0]).toBe(50);
    expect(r[1]).toBe(50);
  });
});

describe("Player initial state", () => {
  let p: Player;
  beforeEach(() => {
    p = new Player();
  });

  it("has hitpoints=2", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/RedSnowDudie.as:13
    expect(p.hitpoints).toBe(2);
  });

  it("has team='red'", () => {
    // from scripts/__Packages/com/iconnicholson/onehammer/RedSnowDudie.as:28
    expect(p.team).toBe("red");
  });

  it("starts not dazed, not dead, not walking", () => {
    // from RedSnowDudie.as:14 + ASnowDudie.as:8-10
    expect(p.dazed).toBe(0);
    expect(p.dead).toBe(false);
    expect(p.walking).toBe(false);
  });

  it("starts with adobesucksmouseisdownflag=false and dragdudie=false", () => {
    // from RedSnowDudie.as:15-16
    expect(p.adobesucksmouseisdownflag).toBe(false);
    expect(p.dragdudie).toBe(false);
  });

  it("has walkspeed=5 (inherited default)", () => {
    // from ASnowDudie.as:11
    expect(p.walkspeed).toBe(5);
  });
});

describe("Player walking math", () => {
  it("starts a walk when walkendx is set on next frameloop, computing unit-velocity*walkspeed", () => {
    // from RedSnowDudie.as:156-163
    // dx=300 dy=400 dist=500, vx=300/(500/5)=3 vy=400/(500/5)=4
    const p = new Player();
    p.setposition(0, 0);
    p.setwalkendx(300);
    p.setwalkendy(400);
    p.frameloop();
    expect(p.walking).toBe(true);
    expect(p.walkxmov).toBeCloseTo(3, 6);
    expect(p.walkymov).toBeCloseTo(4, 6);
  });

  it("each subsequent tick moves the dudie by (walkxmov, walkymov)", () => {
    // from RedSnowDudie.as:146-147
    const p = new Player();
    p.setposition(0, 0);
    p.setwalkendx(300);
    p.setwalkendy(400);
    p.frameloop(); // sets velocity
    const sx = p.x;
    const sy = p.y;
    p.frameloop(); // moves
    expect(p.x).toBeCloseTo(sx + 3, 6);
    expect(p.y).toBeCloseTo(sy + 4, 6);
  });

  it("arrives when within 10px on each axis: clears walking and zeroes walkend", () => {
    // from RedSnowDudie.as:138-142
    const p = new Player();
    p.setposition(0, 0);
    p.setwalkendx(8); // within 10 already
    p.setwalkendy(8);
    p.frameloop(); // first tick assigns velocity (walking flips true)
    // Next tick: dist check |x-walkendx|<10 && |y-walkendy|<10 should be true
    // since x=0, walkendx=8, but velocity was based on hypot(8,8)=11.31
    // so walkxmov = 8/(11.31/5) = 3.535... we run another tick to test arrival.
    p.frameloop();
    // After the second tick we should have arrived (tolerance < 10).
    expect(p.walking).toBe(false);
    expect(p.walkendx).toBe(0);
    expect(p.walkendy).toBe(0);
  });

  it("setwalkspeed changes walkspeed (inherited setter)", () => {
    // from ASnowDudie.as:26-29
    const p = new Player();
    p.setwalkspeed(10);
    expect(p.walkspeed).toBe(10);
  });
});

describe("Player damage / yougothit", () => {
  it("first hit: hitpoints->1, dazed=40, sets dudiemc.dazed=true (no death)", () => {
    // from RedSnowDudie.as:71-79
    const p = new Player();
    p.yougothit();
    expect(p.hitpoints).toBe(1);
    expect(p.dazed).toBe(40);
    expect(p.dudiemcDazed).toBe(true);
    expect(p.dead).toBe(false);
  });

  it("clears drag/mouse flags on hit", () => {
    // from RedSnowDudie.as:68-70
    const p = new Player();
    p.dragdudie = true;
    p.adobesucksmouseisdownflag = true;
    p.yougothit();
    expect(p.dragdudie).toBe(false);
    expect(p.adobesucksmouseisdownflag).toBe(false);
  });

  it("second hit: hitpoints->0 and dead=true", () => {
    // from RedSnowDudie.as:81-89
    const p = new Player();
    p.yougothit();
    p.yougothit();
    expect(p.hitpoints).toBe(0);
    expect(p.dead).toBe(true);
  });
});

describe("Player dazed cooldown", () => {
  it("decrements dazed each frameloop and clears dudiemcDazed at zero", () => {
    // from RedSnowDudie.as:165-172
    const p = new Player();
    p.yougothit(); // dazed = 40
    for (let i = 0; i < 39; i++) p.frameloop();
    expect(p.dazed).toBe(1);
    expect(p.dudiemcDazed).toBe(true);
    p.frameloop();
    expect(p.dazed).toBe(0);
    expect(p.dudiemcDazed).toBe(false);
  });

  it("frameloop short-circuits when dead (no dazed decrement, no movement)", () => {
    // from RedSnowDudie.as:132-134
    const p = new Player();
    p.dead = true;
    p.dazed = 5;
    p.x = 100;
    p.y = 100;
    p.frameloop();
    expect(p.dazed).toBe(5);
    expect(p.x).toBe(100);
    expect(p.y).toBe(100);
  });
});

describe("Player drag (mouse-driven movement)", () => {
  it("teleports to mouse coords when dragdudie && adobesucksmouseisdownflag, then clips by line(592,0)-(0,320), less=true", () => {
    // from RedSnowDudie.as:175-182
    const p = new Player();
    p.dragdudie = true;
    p.adobesucksmouseisdownflag = true;
    // Place mouse below the diagonal at (100, 160) — should be clipped to x=296.
    p.frameloop({ mouseX: 100, mouseY: 160 });
    expect(p.x).toBeCloseTo(296, 6);
    expect(p.y).toBe(160);
  });

  it("does not teleport when the flags are not both set", () => {
    // from RedSnowDudie.as:175 (compound condition)
    const p = new Player();
    p.dragdudie = false;
    p.adobesucksmouseisdownflag = true;
    p.setposition(50, 50);
    p.frameloop({ mouseX: 999, mouseY: 999 });
    expect(p.x).toBe(50);
    expect(p.y).toBe(50);
  });
});

describe("Player onchosen / mouse handlers", () => {
  it("onchosen sets dragdudie=true and adobesucksmouseisdownflag=true and dispatches 'chosen' event", () => {
    // from RedSnowDudie.as:49-65
    const p = new Player();
    let dispatched: any = null;
    p.addEventListener("chosen", (ev: any) => {
      dispatched = ev;
    });
    p.onchosen();
    expect(p.dragdudie).toBe(true);
    expect(p.adobesucksmouseisdownflag).toBe(true);
    expect(dispatched).not.toBeNull();
    expect(dispatched.type).toBe("chosen");
    expect(dispatched.target).toBe(p);
  });

  it("onchosen is a no-op when dazed/dead/walking", () => {
    // from RedSnowDudie.as:51-54
    const p = new Player();
    p.dudiemcDazed = true;
    p.onchosen();
    expect(p.dragdudie).toBe(false);
    expect(p.adobesucksmouseisdownflag).toBe(false);

    const p2 = new Player();
    p2.dead = true;
    p2.onchosen();
    expect(p2.dragdudie).toBe(false);

    const p3 = new Player();
    p3.walking = true;
    p3.onchosen();
    expect(p3.dragdudie).toBe(false);
  });

  it("mouserelease clears flags and dispatches throwball event with force, team, x, y, ineffective", () => {
    // from RedSnowDudie.as:108-129
    const p = new Player();
    p.setposition(200, 100);
    p.meterFrame = 15; // exactly maxes out (15/15=1.0)
    let ev: any = null;
    p.addEventListener("throwball", (e: any) => {
      ev = e;
    });
    // Simulate having been chosen (drag flags set) — mouserelease clears them.
    p.adobesucksmouseisdownflag = true;
    p.dragdudie = true;
    p.mouserelease();
    expect(p.adobesucksmouseisdownflag).toBe(false);
    expect(p.dragdudie).toBe(false);
    expect(ev).not.toBeNull();
    expect(ev.type).toBe("throwball");
    expect(ev.team).toBe("red");
    expect(ev.force).toBeCloseTo(1.0, 6);
    expect(ev.x).toBe(200);
    expect(ev.y).toBe(100 - 35);
    expect(ev.ineffective).toBe(false);
  });

  it("mouserelease is a no-op (no throwball dispatched) when dazed/dead/walking", () => {
    // from RedSnowDudie.as:123-126
    const p = new Player();
    let ev: any = null;
    p.addEventListener("throwball", (e: any) => (ev = e));
    p.dead = true;
    p.mouserelease();
    expect(ev).toBeNull();
  });
});

describe("Player throwball formula", () => {
  it("force = 0.001 when meter._currentframe <= 4", () => {
    // from RedSnowDudie.as:110-114
    const p = new Player();
    p.setposition(0, 0);
    p.meterFrame = 4;
    let ev: any = null;
    p.addEventListener("throwball", (e: any) => (ev = e));
    p.throwball();
    expect(ev.force).toBeCloseTo(0.001, 9);
    expect(ev.ineffective).toBe(true); // 0.001 < 0.1
  });

  it("force = meterFrame/15 when meter._currentframe > 4", () => {
    // from RedSnowDudie.as:112-114
    const p = new Player();
    p.setposition(0, 0);
    p.meterFrame = 9;
    let ev: any = null;
    p.addEventListener("throwball", (e: any) => (ev = e));
    p.throwball();
    expect(ev.force).toBeCloseTo(9 / 15, 9);
    expect(ev.ineffective).toBe(false);
  });

  it("ineffective flag is true when force < 0.1", () => {
    // from RedSnowDudie.as:116
    const p = new Player();
    // meterFrame=1 -> force=0.001 (since <=4)
    p.meterFrame = 1;
    let ev: any = null;
    p.addEventListener("throwball", (e: any) => (ev = e));
    p.throwball();
    expect(ev.ineffective).toBe(true);
  });

  it("ball spawn coordinates are (x, y - 35)", () => {
    // from RedSnowDudie.as:116
    const p = new Player();
    p.setposition(123, 200);
    p.meterFrame = 8;
    let ev: any = null;
    p.addEventListener("throwball", (e: any) => (ev = e));
    p.throwball();
    expect(ev.x).toBe(123);
    expect(ev.y).toBe(200 - 35);
  });
});

describe("Player setposition / setwalkend* setters", () => {
  it("setposition writes x and y", () => {
    // from ASnowDudie.as:42-46
    const p = new Player();
    p.setposition(50, 60);
    expect(p.x).toBe(50);
    expect(p.y).toBe(60);
  });

  it("setwalkendx / setwalkendy update fields", () => {
    // from ASnowDudie.as:18-25
    const p = new Player();
    p.setwalkendx(11);
    p.setwalkendy(22);
    expect(p.walkendx).toBe(11);
    expect(p.walkendy).toBe(22);
  });
});
