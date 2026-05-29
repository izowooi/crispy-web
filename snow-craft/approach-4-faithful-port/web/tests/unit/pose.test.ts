// Tests for /src/render/pose.ts — derives the animation label for a red or
// green dudie from its current logical state. Pure function; no DOM.
//
// The labels here MUST match the keys in /assets/sprites/<team>/index.json:
//   red:    "ready" "cock" "toss" "hitdazed" "dead" "walk"
//   green:  "walk" "balling" "cock" "toss" "hit" "down" "dead"

import { describe, it, expect } from "vitest";
import { redPose, greenPose } from "../../src/render/pose.ts";

describe("redPose — priority cascade", () => {
  it("returns 'dead' when the player is dead, regardless of other flags", () => {
    expect(
      redPose({
        dead: true,
        dudiemcDazed: true,
        walking: true,
        meterFrame: 8,
        justReleased: true,
      })
    ).toBe("dead");
  });

  it("returns 'hitdazed' when dudiemcDazed is set (and not dead)", () => {
    expect(
      redPose({
        dead: false,
        dudiemcDazed: true,
        walking: true, // dazed beats walking
        meterFrame: 5,
        justReleased: true,
      })
    ).toBe("hitdazed");
  });

  it("returns 'walk' when walking (and not dead/dazed)", () => {
    expect(
      redPose({
        dead: false,
        dudiemcDazed: false,
        walking: true,
        meterFrame: 0,
        justReleased: false,
      })
    ).toBe("walk");
  });

  it("returns 'cock' when meterFrame > 0 (drag in progress)", () => {
    expect(
      redPose({
        dead: false,
        dudiemcDazed: false,
        walking: false,
        meterFrame: 1,
        justReleased: false,
      })
    ).toBe("cock");
  });

  it("returns 'toss' immediately after release (meterFrame cleared)", () => {
    expect(
      redPose({
        dead: false,
        dudiemcDazed: false,
        walking: false,
        meterFrame: 0,
        justReleased: true,
      })
    ).toBe("toss");
  });

  it("returns 'ready' for the idle default", () => {
    expect(
      redPose({
        dead: false,
        dudiemcDazed: false,
        walking: false,
        meterFrame: 0,
        justReleased: false,
      })
    ).toBe("ready");
  });

  it("walk takes priority over cock (walking beats meterFrame)", () => {
    expect(
      redPose({
        dead: false,
        dudiemcDazed: false,
        walking: true,
        meterFrame: 9,
        justReleased: false,
      })
    ).toBe("walk");
  });
});

describe("greenPose — priority cascade", () => {
  it("returns 'dead' when dead", () => {
    expect(
      greenPose({
        dead: true,
        down: true,
        justhit: true,
        walking: true,
        cocking: 20,
        balling: 5,
      })
    ).toBe("dead");
  });

  it("returns 'down' when down (and not dead)", () => {
    expect(
      greenPose({
        dead: false,
        down: true,
        justhit: true,
        walking: true,
        cocking: 20,
        balling: 5,
      })
    ).toBe("down");
  });

  it("returns 'hit' when justhit", () => {
    expect(
      greenPose({
        dead: false,
        down: false,
        justhit: true,
        walking: true,
        cocking: 20,
        balling: 5,
      })
    ).toBe("hit");
  });

  it("returns 'walk' when walking (no down/justhit/dead)", () => {
    expect(
      greenPose({
        dead: false,
        down: false,
        justhit: false,
        walking: true,
        cocking: 20,
        balling: 5,
      })
    ).toBe("walk");
  });

  it("returns 'cock' when cocking > 10 (early phase of charged throw)", () => {
    expect(
      greenPose({
        dead: false,
        down: false,
        justhit: false,
        walking: false,
        cocking: 15,
        balling: 0,
      })
    ).toBe("cock");
  });

  it("returns 'toss' when 0 < cocking <= 10 (release phase)", () => {
    expect(
      greenPose({
        dead: false,
        down: false,
        justhit: false,
        walking: false,
        cocking: 10,
        balling: 0,
      })
    ).toBe("toss");
    expect(
      greenPose({
        dead: false,
        down: false,
        justhit: false,
        walking: false,
        cocking: 1,
        balling: 0,
      })
    ).toBe("toss");
  });

  it("returns 'balling' when balling > 0 and not cocking", () => {
    expect(
      greenPose({
        dead: false,
        down: false,
        justhit: false,
        walking: false,
        cocking: 0,
        balling: 25,
      })
    ).toBe("balling");
  });

  it("returns 'balling' as the idle default", () => {
    expect(
      greenPose({
        dead: false,
        down: false,
        justhit: false,
        walking: false,
        cocking: 0,
        balling: 0,
      })
    ).toBe("balling");
  });
});
