// Tests for /src/render/PoseClock.ts — a per-object animation clock that
// resets to 0 whenever the pose label changes. This is what lets the renderer
// play a one-shot animation (death, fall) from its first frame each time the
// pose is entered, instead of indexing into it with a monotonic global tick
// (the cause of the death-frame flicker — see PROGRESS_BEHAVIOR.md).

import { describe, it, expect } from "vitest";
import { PoseClock } from "../../src/render/PoseClock.ts";

describe("PoseClock.advance", () => {
  it("returns 0 the first time an object is seen in a pose", () => {
    const clock = new PoseClock();
    const a = {};
    expect(clock.advance(a, "ready")).toBe(0);
  });

  it("increments while the pose stays the same", () => {
    const clock = new PoseClock();
    const a = {};
    expect(clock.advance(a, "walk")).toBe(0);
    expect(clock.advance(a, "walk")).toBe(1);
    expect(clock.advance(a, "walk")).toBe(2);
  });

  it("resets to 0 when the pose changes", () => {
    const clock = new PoseClock();
    const a = {};
    clock.advance(a, "ready"); // 0
    clock.advance(a, "ready"); // 1
    clock.advance(a, "ready"); // 2
    // Transition ready -> dead must restart the clock so the death animation
    // plays from its first frame (this is the flicker fix).
    expect(clock.advance(a, "dead")).toBe(0);
    expect(clock.advance(a, "dead")).toBe(1);
  });

  it("tracks each object independently", () => {
    const clock = new PoseClock();
    const a = {};
    const b = {};
    clock.advance(a, "walk"); // a:0
    clock.advance(a, "walk"); // a:1
    expect(clock.advance(b, "walk")).toBe(0); // b is fresh
    expect(clock.advance(a, "walk")).toBe(2); // a unaffected by b
  });
});
