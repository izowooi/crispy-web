// Tests for /src/core/meter.ts — the red dudie charge meter.
//
// Faithful to RedSnowDudie.as:
//   * The meter is a 15-frame clip inside the dudie that advances ~1 frame per
//     game tick (20 fps) while the dudie is held in the "cock" pose.
//   * throwball() reads `meter._currentframe`:
//       force = currentframe > 4 ? currentframe / 15 : 0.001
//     (RedSnowDudie.as:110-114).

import { describe, it, expect } from "vitest";
import {
  METER_MAX,
  METER_MS_PER_FRAME,
  chargeFrame,
  chargeForce,
} from "../../src/core/meter.ts";

describe("chargeFrame — hold duration -> meter frame (1..15)", () => {
  it("starts at frame 1 (minimum), never 0", () => {
    expect(chargeFrame(0)).toBe(1);
    expect(chargeFrame(10)).toBe(1);
  });

  it("advances ~1 frame per 50 ms (20 fps tick)", () => {
    expect(METER_MS_PER_FRAME).toBe(50);
    expect(chargeFrame(50)).toBe(1);
    expect(chargeFrame(100)).toBe(2);
    expect(chargeFrame(250)).toBe(5);
    expect(chargeFrame(500)).toBe(10);
    expect(chargeFrame(750)).toBe(15);
  });

  it("saturates at METER_MAX (15)", () => {
    expect(METER_MAX).toBe(15);
    expect(chargeFrame(1000)).toBe(15);
    expect(chargeFrame(99999)).toBe(15);
  });
});

describe("chargeForce — meter frame -> throw force", () => {
  it("is the ineffective stub (0.001) for frames 1..4", () => {
    // RedSnowDudie.as:112 — only frames > 4 produce real force.
    expect(chargeForce(1)).toBe(0.001);
    expect(chargeForce(4)).toBe(0.001);
  });

  it("is currentframe / 15 for frames 5..15", () => {
    expect(chargeForce(5)).toBeCloseTo(5 / 15);
    expect(chargeForce(10)).toBeCloseTo(10 / 15);
    expect(chargeForce(15)).toBe(1);
  });
});
