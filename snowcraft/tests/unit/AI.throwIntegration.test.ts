// Integration tests for the Green AI throw cadence.
//
// These tests guard against the "ai-throw" defect documented in
//   approach-4-faithful-port/observations/defect_ai-throw.md
// where greens never reach `throwball()` because the title overlay never
// drops back to `_visible=false`.
//
// They drive both the bare `tickGreen()` API (with titlesVisible=false on the
// TickContext) and a full Game built with the real factories, and assert that
// at least one green-team throw is dispatched during a 30-second window
// (600 ticks @ 20 fps).
//
// AS source citations:
//   GreenSnowDudie.as:73-160  — frameloop priority cascade
//   GreenSnowDudie.as:117-126 — (E) cocking countdown → throwball at cocking==10
//   GreenSnowDudie.as:144-147 — (G) titles._visible gate
//   GreenSnowDudie.as:148-159 — (H)/(I) balling → cocking transition
//   GreenSnowDudie.as:161-165 — throwball() event payload

import { describe, it, expect } from "vitest";
import { Game } from "../../src/core/Game.ts";
import {
  makeRedFactory,
  makeGreenFactory,
  snowballFactory,
} from "../../src/core/factories.ts";
import {
  createGreenAI,
  tickGreen,
  type ThrowEvent,
  type TickContext,
} from "../../src/core/AI.ts";

// ---------------------------------------------------------------------------
// Test 1: bare GreenAI with titlesVisible=false on the TickContext.
//
// Per defect_ai-throw.md §2: when titlesVisible is false the cascade reaches
// branches (H)/(I) so balling/cocking initialise; on the tick where cocking
// reaches exactly 10 a throwball event fires (GreenSnowDudie.as:120-123).
// With a deterministic RNG that never crosses the 0.975 walk-roll threshold,
// 600 ticks must produce at least one throw.
// ---------------------------------------------------------------------------

describe("AI throw integration — bare tickGreen", () => {
  it("dispatches at least one throwball over 600 ticks (~30s @ 20fps) with titlesVisible=false", () => {
    // GreenSnowDudie.as:73-160 — running the cascade with titlesVisible=false.
    const ai = createGreenAI({ x: 100, y: 100 });
    // Capture each throw together with the AI's y AT THROW TIME — the AI may
    // continue to walk between throws, so a snapshot is required for the
    // GreenSnowDudie.as:163 (`y - 15`) assertion to be checked correctly.
    const throws: { e: ThrowEvent; aiYAtThrow: number }[] = [];

    // Mulberry32 PRNG — deterministic, decent distribution. We avoid Math.random
    // here so the test is reproducible across machines.
    let s = 0x12345678;
    const rand = () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const ctx: TickContext = {
      titlesVisible: false, // GreenSnowDudie.as:144 — branch (G) does NOT short-circuit
      soundsCurrentFrame: 1,
      rand,
      onPose: () => {},
      onPlaySound: () => {},
      onThrow: (e) => throws.push({ e, aiYAtThrow: ai.y }),
    };

    for (let i = 0; i < 600; i++) {
      tickGreen(ai, ctx);
    }

    // Per GreenSnowDudie.as:148-159 the mean cycle is balling(10..60) +
    // (cocking-to-10)(5..35) ≈ 55 frames per throw, so 600 ticks should yield
    // ~10 throws. Lower bound 1 is the bug-tripwire.
    expect(throws.length).toBeGreaterThanOrEqual(1);

    // Force range — GreenSnowDudie.as:163: 0.3 + Math.random()*0.6 ∈ [0.3, 0.9].
    for (const { e, aiYAtThrow } of throws) {
      expect(e.team).toBe("green");
      expect(e.force).toBeGreaterThanOrEqual(0.3);
      expect(e.force).toBeLessThanOrEqual(0.9);
      // GreenSnowDudie.as:163: y = dudiemc._y - 15 at the moment of dispatch.
      expect(e.y).toBe(aiYAtThrow - 15);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 2: full Game with the real factories.
//
// Replicates the production wiring (snake-test cf. factories.test.ts) — the
// Game owns a `titles` shim that the GreenFactory reads through a closure
// (titlesVisible: () => titles._visible). When the shim's `_visible` stays
// false after dolevel(1), the AI cascade must reach (H)/(I)/(E) and at least
// one green-team snowball must appear in `game.snowballs` during a 30s window.
//
// This is the regression test for the production-path bug: in main.ts the
// titles shim's gotoAndPlay sets _visible=true and never clears it, so greens
// never throw. This test forces _visible=false on the wrapper directly to
// document the AI-side contract: given titles hidden, throws must happen.
// ---------------------------------------------------------------------------

describe("AI throw integration — full Game with real factories", () => {
  it("at least one green snowball is spawned over 600 ticks with titles hidden", () => {
    // The production titles shim — but with `gotoAndPlay` as a no-op so
    // dolevel(1)'s call to gotoAndPlay("seasonsgreetings") doesn't flip
    // _visible back to true. Mirrors `defect_ai-throw.md §5`'s recommended
    // post-fix behaviour: after the title intro elapses, titles._visible
    // returns to false and stays there.
    const titles = {
      _visible: false,
      lev: 0,
      score: 0,
      label: "",
      gotoAndPlay(_label: string) {
        // After the title-intro animation finishes the AS sprite runs
        // gotoAndStop(1) which sets this._visible = false (DefineSprite_110
        // frame_1/DoAction.as:2). The fix in factories.ts/AI.ts must respect
        // that the wrapper's _visible state is the source of truth and not
        // override it on every dolevel call.
      },
    };

    const game = new Game({
      stage: { _xmouse: 0, _ymouse: 0 },
      titles,
      sounds: { gotoAndPlay() {} },
      factories: {
        red: makeRedFactory(),
        green: makeGreenFactory({
          titlesVisible: () => titles._visible,
          // Use Math.random for a realistic cadence over 600 ticks.
        }),
        snowball: snowballFactory,
      },
    });

    game.dolevel(1);

    // Force the wrapper into the post-intro state per the test contract.
    titles._visible = false;

    // 600 ticks ≈ 30 s @ 20 fps (spec/main.md §2: GAME_FPS = 20).
    for (let i = 0; i < 600; i++) {
      game.frameloop();
    }

    // The bug-tripwire: any green-team snowball spawned during the run.
    // GreenSnowDudie.as:161-165 — throwball() dispatches an event with
    // team:"green" which Game.throwball() pushes into snowballs[] (here
    // produced via the real `snowballFactory`).
    const greenBalls = game.snowballs.filter((b) => b.team === "green");
    // Note: snowballs that fly off-stage are removed in Game.frameloop step
    // (5) (Snowcraft1Rewrite.as:402-408). To survive the assertion we count
    // the *currently live* greens. With ~10 throws expected over 600 ticks
    // and each ball living ~30 frames before exiting, several should be in
    // flight at the end — but lower bound 1 is the regression tripwire.
    // If all balls have flown off, fall back to a counter that watches
    // dispatched events directly.
    if (greenBalls.length === 0) {
      // Re-run with a dispatch counter — the cleanup step would have erased
      // everything that flew off-screen.
      const titles2 = {
        _visible: false,
        lev: 0,
        score: 0,
        label: "",
        gotoAndPlay(_label: string) {},
      };
      let throwCount = 0;
      const game2 = new Game({
        stage: { _xmouse: 0, _ymouse: 0 },
        titles: titles2,
        sounds: { gotoAndPlay() {} },
        factories: {
          red: makeRedFactory(),
          green: makeGreenFactory({
            titlesVisible: () => titles2._visible,
          }),
          snowball: (...args) => {
            const ball = snowballFactory(...args);
            if (ball.team === "green") throwCount += 1;
            return ball;
          },
        },
      });
      game2.dolevel(1);
      titles2._visible = false;
      for (let i = 0; i < 600; i++) game2.frameloop();
      expect(throwCount).toBeGreaterThan(0);
    } else {
      expect(greenBalls.length).toBeGreaterThan(0);
    }
  });
});
