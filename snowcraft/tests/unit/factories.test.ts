// Regression tests for the "blank screen after Start" bug.
//
// Bug summary: main.ts boots Game without supplying the optional `factories`
// argument, so Game falls back to its in-file default factories whose
// frameloop() are no-ops. As a result reddudies (spawned at +200/+100 of their
// walkend = off-stage) and greens (spawned at negative coords for level 1)
// never move toward their walkend positions, and snowballs never integrate.
//
// These tests verify the src/core/factories.ts module wires the real
// Player/AI/Snowball classes (which DO have working frameloop()) into the
// shapes Game expects (RedDudie / GreenDudie / SnowBallLike).

import { describe, it, expect } from "vitest";
import { Game } from "../../src/core/Game.ts";
import {
  makeRedFactory,
  makeGreenFactory,
  snowballFactory,
} from "../../src/core/factories.ts";

function makeGameWithRealFactories() {
  return new Game({
    stage: { _xmouse: 0, _ymouse: 0 },
    titles: { _visible: false, gotoAndPlay() {} },
    sounds: { gotoAndPlay() {} },
    factories: {
      red: makeRedFactory(),
      green: makeGreenFactory({ titlesVisible: () => false, rand: () => 0.5 }),
      snowball: snowballFactory,
    },
  });
}

describe("real factories wire Player/AI/Snowball into Game", () => {
  it("3 reds spawn off-stage at (+200,+100) and converge to walkend after ~60 ticks", () => {
    const game = makeGameWithRealFactories();
    game.dolevel(1);
    const reds = game.adudies.filter((d) => d.team === "red");
    expect(reds).toHaveLength(3);

    // Pre: Snowcraft1Rewrite.as:242-259 — reddudie1: (450+200, 200+100).
    expect(reds[0].x).toBe(650);
    expect(reds[0].y).toBe(300);

    // Tick: max distance sqrt(200^2 + 100^2) ~= 224 px @ walkspeed=5 → ~45 frames.
    for (let i = 0; i < 60; i++) game.frameloop();

    // Post: at walkend (450, 200) within arrival threshold (< 10).
    expect(reds[0].walking).toBe(false);
    expect(Math.abs(reds[0].x - 450)).toBeLessThanOrEqual(10);
    expect(Math.abs(reds[0].y - 200)).toBeLessThanOrEqual(10);

    // dudiemc must live-mirror x/y — Game.frameloop hit-detection reads it.
    expect(reds[0].dudiemc._x).toBe(reds[0].x);
    expect(reds[0].dudiemc._y).toBe(reds[0].y);
  });

  it("level-1 greens spawn at the AS table coords and converge into the visible stage", () => {
    const game = makeGameWithRealFactories();
    game.dolevel(1);
    const greens = game.adudies.filter((d) => d.team === "green");
    expect(greens).toHaveLength(3);

    // Pre: Snowcraft1Rewrite.as:42-45 — level 1 starts: (-20,-60), (-130,-60), (-130,1).
    expect([greens[0].x, greens[0].y]).toEqual([-20, -60]);
    expect([greens[1].x, greens[1].y]).toEqual([-130, -60]);
    expect([greens[2].x, greens[2].y]).toEqual([-130, 1]);

    for (let i = 0; i < 80; i++) game.frameloop();

    // Post: all greens are inside the 592x320 stage (visible to the player).
    for (const g of greens) {
      expect(g.x).toBeGreaterThanOrEqual(0);
      expect(g.x).toBeLessThanOrEqual(592);
      expect(g.y).toBeGreaterThanOrEqual(0);
      expect(g.y).toBeLessThanOrEqual(320);
    }
  });

  it("dudiemc on the wrapper is writable so debug/E2E teleports work", () => {
    const game = makeGameWithRealFactories();
    game.dolevel(1);
    const red = game.adudies.find((d) => d.team === "red")!;
    red.dudiemc._x = 200;
    red.dudiemc._y = 220;
    expect(red.x).toBe(200);
    expect(red.y).toBe(220);
  });

  it("snowball factory builds a real Snowball whose position integrates per frame", () => {
    const game = makeGameWithRealFactories();
    game.dolevel(1);
    game.throwball({
      team: "red",
      force: 0.5,
      x: 300,
      y: 150,
      ineffective: false,
    });
    const ball = game.snowballs[0];
    // Spawn position + initial velocity per spec/snowball.md (SnowBall.as:43-52).
    expect(ball.ballmc._x).toBe(300);
    expect(ball.ballmc._y).toBe(150);
    expect(ball.xmov).toBe(-20);
    expect(ball.ymov).toBe(-10);
    expect(ball.ballmc._visible).toBe(true);
    // Shadow at (x, y + grounddistance=35) — SnowBall.as:42.
    expect(ball.shadowmc._x).toBe(300);
    expect(ball.shadowmc._y).toBe(185);

    // One frameloop integrates ballmc by xmov/ymov (SnowBall.as:130-133).
    ball.frameloop();
    expect(ball.ballmc._x).toBe(300 + -20);
    expect(ball.ballmc._y).toBe(150 + -10);
  });

  it("yougothit on the red wrapper drives Player HP transitions (RedSnowDudie.as:66-90)", () => {
    const game = makeGameWithRealFactories();
    game.dolevel(1);
    const red = game.adudies.find((d) => d.team === "red")!;
    expect(red.hitpoints).toBe(2);
    red.yougothit();
    expect(red.hitpoints).toBe(1);
    expect(red.dazed).toBe(40);
    expect(red.dead).toBe(false);
    red.yougothit();
    expect(red.hitpoints).toBe(0);
    expect(red.dead).toBe(true);
  });

  it("yougothit on the green wrapper drives AI HP transitions (GreenSnowDudie.as:43-66)", () => {
    const game = makeGameWithRealFactories();
    game.dolevel(1);
    const green = game.adudies.find((d) => d.team === "green")!;
    expect(green.hitpoints).toBe(3);
    green.yougothit();
    expect(green.hitpoints).toBe(2);
    green.yougothit();
    expect(green.hitpoints).toBe(1);
    expect(green.down).toBe(true);
    green.yougothit();
    expect(green.hitpoints).toBe(0);
    expect(green.dead).toBe(true);
  });
});
