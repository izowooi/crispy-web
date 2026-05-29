// Tests for /src/render/Animation.ts — selects a sprite frame for a given
// character state by indexing into the per-team sprite "labels" map and
// advancing through the labelled frame range with a tick counter.
//
// Index source: /assets/sprites/<team>/index.json (see public/assets/sprites/*).

import { describe, it, expect } from "vitest";
import {
  frameForState,
  getFootAnchor,
  type SpriteIndex,
} from "../../src/render/Animation.ts";

// Synthetic index used by the spec in the task description. Three labels with
// distinct ranges to exercise wrap-around and clamp behaviour.
const RED_INDEX: SpriteIndex = {
  frames: [
    { frame: 1, path: "sprites/red/1.png", footX: 1, footY: 11, w: 10, h: 10 },
    { frame: 2, path: "sprites/red/2.png", footX: 2, footY: 12, w: 10, h: 10 },
    { frame: 3, path: "sprites/red/3.png", footX: 3, footY: 13, w: 10, h: 10 },
    { frame: 4, path: "sprites/red/4.png", footX: 4, footY: 14, w: 10, h: 10 },
    { frame: 5, path: "sprites/red/5.png", footX: 5, footY: 15, w: 10, h: 10 },
    { frame: 6, path: "sprites/red/6.png", footX: 6, footY: 16, w: 10, h: 10 },
    { frame: 7, path: "sprites/red/7.png", footX: 7, footY: 17, w: 10, h: 10 },
    { frame: 8, path: "sprites/red/8.png", footX: 8, footY: 18, w: 10, h: 10 },
    { frame: 9, path: "sprites/red/9.png", footX: 9, footY: 19, w: 10, h: 10 },
    { frame: 10, path: "sprites/red/10.png", footX: 10, footY: 20, w: 10, h: 10 },
    { frame: 11, path: "sprites/red/11.png", footX: 11, footY: 21, w: 10, h: 10 },
    { frame: 12, path: "sprites/red/12.png", footX: 12, footY: 22, w: 10, h: 10 },
    { frame: 13, path: "sprites/red/13.png", footX: 13, footY: 23, w: 10, h: 10 },
    { frame: 14, path: "sprites/red/14.png", footX: 14, footY: 24, w: 10, h: 10 },
    { frame: 15, path: "sprites/red/15.png", footX: 15, footY: 25, w: 10, h: 10 },
    { frame: 16, path: "sprites/red/16.png", footX: 16, footY: 26, w: 10, h: 10 },
    { frame: 17, path: "sprites/red/17.png", footX: 17, footY: 27, w: 10, h: 10 },
    { frame: 18, path: "sprites/red/18.png", footX: 18, footY: 28, w: 10, h: 10 },
  ],
  labels: {
    ready: { first: 1, last: 5 },
    walk: { first: 6, last: 11 },
    cock: { first: 12, last: 18 },
  },
};

const GREEN_INDEX: SpriteIndex = {
  frames: [
    { frame: 1, path: "sprites/green/1.png", footX: 100, footY: 200, w: 42, h: 38 },
    { frame: 2, path: "sprites/green/2.png", footX: 101, footY: 201, w: 42, h: 38 },
    { frame: 3, path: "sprites/green/3.png", footX: 102, footY: 202, w: 42, h: 38 },
  ],
  labels: {
    balling: { first: 1, last: 1 },
    walk: { first: 2, last: 3 },
  },
};

describe("frameForState — basic lookup", () => {
  it("returns the first frame of the label when tick=0", () => {
    expect(frameForState(RED_INDEX, "ready", 0)).toBe(1);
    expect(frameForState(RED_INDEX, "walk", 0)).toBe(6);
    expect(frameForState(RED_INDEX, "cock", 0)).toBe(12);
  });

  it("advances by 1 each tick within the label range", () => {
    expect(frameForState(RED_INDEX, "ready", 1)).toBe(2);
    expect(frameForState(RED_INDEX, "ready", 2)).toBe(3);
    expect(frameForState(RED_INDEX, "ready", 3)).toBe(4);
    expect(frameForState(RED_INDEX, "ready", 4)).toBe(5);
  });

  it("wraps modulo the label length (ready: 5 frames -> tick 5 -> first frame)", () => {
    // ready: first=1, last=5, length=5. tick%5 cycles back to 0.
    expect(frameForState(RED_INDEX, "ready", 5)).toBe(1);
    expect(frameForState(RED_INDEX, "ready", 6)).toBe(2);
    expect(frameForState(RED_INDEX, "ready", 10)).toBe(1);
  });

  it("walk: 6 frames (6..11) wraps every 6 ticks", () => {
    // length = 11 - 6 + 1 = 6. tick=0 -> 6, tick=5 -> 11, tick=6 -> 6.
    expect(frameForState(RED_INDEX, "walk", 5)).toBe(11);
    expect(frameForState(RED_INDEX, "walk", 6)).toBe(6);
    expect(frameForState(RED_INDEX, "walk", 7)).toBe(7);
  });

  it("cock: 7 frames (12..18) wraps every 7 ticks", () => {
    // length = 18 - 12 + 1 = 7.
    expect(frameForState(RED_INDEX, "cock", 0)).toBe(12);
    expect(frameForState(RED_INDEX, "cock", 6)).toBe(18);
    expect(frameForState(RED_INDEX, "cock", 7)).toBe(12);
    expect(frameForState(RED_INDEX, "cock", 14)).toBe(12);
  });

  it("works for the green team labels too", () => {
    expect(frameForState(GREEN_INDEX, "balling", 0)).toBe(1);
    expect(frameForState(GREEN_INDEX, "balling", 99)).toBe(1); // single-frame label
    expect(frameForState(GREEN_INDEX, "walk", 0)).toBe(2);
    expect(frameForState(GREEN_INDEX, "walk", 1)).toBe(3);
    expect(frameForState(GREEN_INDEX, "walk", 2)).toBe(2);
  });
});

describe("frameForState — fallback when label is missing", () => {
  it("falls back to the first frame in the index when the requested label is absent", () => {
    // RED_INDEX has no "dead" label — module should return frames[0].frame.
    expect(frameForState(RED_INDEX, "dead", 0)).toBe(1);
    expect(frameForState(RED_INDEX, "dead", 12345)).toBe(1);
  });

  it("falls back to first frame for a totally unknown pose name", () => {
    expect(frameForState(GREEN_INDEX, "doesnotexist", 7)).toBe(1);
  });
});

describe("frameForState — tick clamping inside label range", () => {
  it("never returns a frame below first or above last (negative ticks treated as 0)", () => {
    // Negative tick must not yield NaN or a frame outside [first, last].
    const f = frameForState(RED_INDEX, "ready", -1);
    expect(f).toBeGreaterThanOrEqual(1);
    expect(f).toBeLessThanOrEqual(5);
  });

  it("very large tick values stay within the label range", () => {
    const f = frameForState(RED_INDEX, "walk", 1_000_000);
    expect(f).toBeGreaterThanOrEqual(6);
    expect(f).toBeLessThanOrEqual(11);
  });

  it("non-integer ticks are floored before modulo", () => {
    // tick 5.9 -> 5 -> last frame of "ready"
    expect(frameForState(RED_INDEX, "ready", 5.9)).toBe(1);
    expect(frameForState(RED_INDEX, "ready", 4.999)).toBe(5);
  });
});

// A dedicated index with multi-frame one-shot labels so we can exercise the
// "play once then hold the last frame" behaviour that death/down/hit need.
// (RED_INDEX has no "dead" label, so it can't test this — see the fallback
// describe above.)
const HOLD_INDEX: SpriteIndex = {
  frames: Array.from({ length: 12 }, (_, i) => ({
    frame: i + 1,
    path: `sprites/x/${i + 1}.png`,
    footX: 1,
    footY: 1,
    w: 10,
    h: 10,
  })),
  labels: {
    walk: { first: 1, last: 4 }, // looping pose
    dead: { first: 5, last: 11 }, // 7-frame one-shot (mirrors green dead 58..64)
  },
};

describe("frameForState — one-shot (hold-last) poses", () => {
  it("advances through a one-shot label once, then holds the last frame", () => {
    // dead: first=5, last=11, length=7.
    expect(frameForState(HOLD_INDEX, "dead", 0)).toBe(5);
    expect(frameForState(HOLD_INDEX, "dead", 1)).toBe(6);
    expect(frameForState(HOLD_INDEX, "dead", 6)).toBe(11); // last frame
    // Past the end it must NOT wrap back to the first frame (that is the
    // flicker bug) — it holds the last frame indefinitely.
    expect(frameForState(HOLD_INDEX, "dead", 7)).toBe(11);
    expect(frameForState(HOLD_INDEX, "dead", 50)).toBe(11);
    expect(frameForState(HOLD_INDEX, "dead", 100000)).toBe(11);
  });

  it("still loops non-one-shot poses (regression guard)", () => {
    // walk: first=1, last=4, length=4 -> wraps.
    expect(frameForState(HOLD_INDEX, "walk", 4)).toBe(1);
    expect(frameForState(HOLD_INDEX, "walk", 5)).toBe(2);
  });

  it("treats green 'down' as hold-last, but red 'hitdazed' remains an intro clip", () => {
    const idx: SpriteIndex = {
      frames: Array.from({ length: 6 }, (_, i) => ({
        frame: i + 1,
        path: `${i + 1}.png`,
        footX: 0,
        footY: 0,
        w: 1,
        h: 1,
      })),
      labels: {
        down: { first: 1, last: 3 },
        hitdazed: { first: 4, last: 6 },
      },
    };
    expect(frameForState(idx, "down", 99)).toBe(3);
    // The red sprite's frame_15 action jumps into the "dazed" loop; if the
    // port ever leaves pose as hitdazed too long, it should not freeze there.
    expect(frameForState(idx, "hitdazed", 3)).toBe(4);
  });
});

describe("getFootAnchor", () => {
  it("returns the {footX, footY} pair for the requested frame number", () => {
    expect(getFootAnchor(RED_INDEX, 1)).toEqual({ footX: 1, footY: 11 });
    expect(getFootAnchor(RED_INDEX, 5)).toEqual({ footX: 5, footY: 15 });
    expect(getFootAnchor(RED_INDEX, 18)).toEqual({ footX: 18, footY: 28 });
  });

  it("works for green index too", () => {
    expect(getFootAnchor(GREEN_INDEX, 2)).toEqual({ footX: 101, footY: 201 });
  });

  it("falls back to the first frame's anchor for an unknown frame number", () => {
    expect(getFootAnchor(RED_INDEX, 9999)).toEqual({ footX: 1, footY: 11 });
    expect(getFootAnchor(GREEN_INDEX, 0)).toEqual({ footX: 100, footY: 200 });
  });
});
