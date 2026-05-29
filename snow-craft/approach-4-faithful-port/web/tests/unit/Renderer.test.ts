// Tests for /src/render/Renderer.ts — focused on the per-frame sprite
// pipeline:
//   * drawDudie() consults the per-team SpriteIndex + frame cache,
//   * frameForState(pose, tick) selects which frame number to blit,
//   * getFootAnchor() lands the foot at world (x, y).
//
// We build a Renderer manually (bypassing Renderer.create() so we don't have
// to fetch the manifest or load PNGs) and intercept ctx.drawImage to assert
// the exact image + destination coords.

import { describe, it, expect, beforeEach } from "vitest";
import { Renderer, type AssetManifest } from "../../src/render/Renderer.ts";
import type { SpriteIndex } from "../../src/render/Animation.ts";

// Empty manifest — drawDudie does NOT need anything from manifest.images
// when both the sprite index AND frame cache are populated.
const EMPTY_MANIFEST: AssetManifest = { images: {}, sounds: {} };

// Calls recorder type used by the stub 2D context.
type DrawCall = { src: HTMLImageElement; dx: number; dy: number };

/**
 * jsdom does not implement HTMLCanvasElement.getContext('2d'), so we stub a
 * canvas + 2D context whose drawImage just records its arguments. Renderer
 * only ever calls drawImage / fillRect / and reads imageSmoothingEnabled, so
 * a tiny stub is enough.
 */
function makeStubCanvas(): {
  canvas: HTMLCanvasElement;
  calls: DrawCall[];
} {
  const calls: DrawCall[] = [];
  const ctx: Partial<CanvasRenderingContext2D> & {
    drawImage: (...args: unknown[]) => void;
    fillRect: (...args: unknown[]) => void;
  } = {
    fillStyle: "#000",
    imageSmoothingEnabled: false,
    drawImage(img: unknown, dx: unknown, dy: unknown) {
      calls.push({
        src: img as HTMLImageElement,
        dx: dx as number,
        dy: dy as number,
      });
    },
    fillRect() {
      // no-op: clear() uses fillRect; we don't assert on it.
    },
  };
  // The Renderer only checks for truthiness on getContext's return value.
  const canvas = {
    width: 592,
    height: 320,
    getContext(_id: string) {
      void _id;
      return ctx as unknown as CanvasRenderingContext2D;
    },
  } as unknown as HTMLCanvasElement;
  return { canvas, calls };
}

// Per-frame mock used in place of HTMLImageElement. The Renderer reads only
// `.width` / `.height` and passes the object to ctx.drawImage(); the canvas
// 2D context in jsdom accepts any object as the image source argument.
function makeImg(w: number, h: number, tag: string): HTMLImageElement {
  // jsdom's HTMLImageElement is fine — we just set width/height and a tag we
  // can spot in the drawImage spy.
  const img = new Image() as HTMLImageElement & { __tag?: string };
  Object.defineProperty(img, "width", { value: w, configurable: true });
  Object.defineProperty(img, "height", { value: h, configurable: true });
  img.__tag = tag;
  return img;
}

// Tiny 4-frame red index covering "ready" (1), "walk" (2..3), "dead" (4).
const RED_INDEX: SpriteIndex = {
  frames: [
    { frame: 1, path: "sprites/red/1.png", footX: 30, footY: 60, w: 60, h: 60 },
    { frame: 2, path: "sprites/red/2.png", footX: 30, footY: 60, w: 60, h: 60 },
    { frame: 3, path: "sprites/red/3.png", footX: 30, footY: 60, w: 60, h: 60 },
    { frame: 4, path: "sprites/red/4.png", footX: 30, footY: 60, w: 60, h: 60 },
  ],
  labels: {
    ready: { first: 1, last: 1 },
    walk: { first: 2, last: 3 },
    dead: { first: 4, last: 4 },
  },
};

const GREEN_INDEX: SpriteIndex = {
  frames: [
    { frame: 1, path: "sprites/green/1.png", footX: 22, footY: 38, w: 44, h: 38 },
    { frame: 2, path: "sprites/green/2.png", footX: 22, footY: 38, w: 44, h: 38 },
  ],
  labels: {
    balling: { first: 1, last: 1 },
    walk: { first: 2, last: 2 },
  },
};

describe("Renderer.drawDudie — per-frame sprite pipeline", () => {
  let canvas: HTMLCanvasElement;
  let calls: DrawCall[];

  beforeEach(() => {
    const stub = makeStubCanvas();
    canvas = stub.canvas;
    calls = stub.calls;
  });

  function makeRenderer(): Renderer {
    const redFrames = new Map<number, HTMLImageElement>();
    redFrames.set(1, makeImg(60, 60, "red#1"));
    redFrames.set(2, makeImg(60, 60, "red#2"));
    redFrames.set(3, makeImg(60, 60, "red#3"));
    redFrames.set(4, makeImg(60, 60, "red#4"));

    const greenFrames = new Map<number, HTMLImageElement>();
    greenFrames.set(1, makeImg(44, 38, "green#1"));
    greenFrames.set(2, makeImg(44, 38, "green#2"));

    return new Renderer(canvas, EMPTY_MANIFEST, new Map(), {
      redIndex: RED_INDEX,
      greenIndex: GREEN_INDEX,
      redFrames,
      greenFrames,
    });
  }

  it("draws the red 'ready' frame (frame 1) for an idle red dudie at tick=0", () => {
    const r = makeRenderer();
    r.drawDudie({ team: "red", x: 100, y: 200, pose: "ready", tick: 0 });
    // Only the body draw — no selection ring, no fallback.
    expect(calls.length).toBe(1);
    // Foot anchor (30, 60) → dx = 100 - 30 = 70, dy = 200 - 60 = 140.
    expect(calls[0].dx).toBe(70);
    expect(calls[0].dy).toBe(140);
    expect((calls[0].src as unknown as { __tag: string }).__tag).toBe("red#1");
  });

  it("advances through 'walk' frames as tick increments (2,3,2,3,…)", () => {
    const r = makeRenderer();
    r.drawDudie({ team: "red", x: 100, y: 200, pose: "walk", tick: 0 });
    r.drawDudie({ team: "red", x: 100, y: 200, pose: "walk", tick: 1 });
    r.drawDudie({ team: "red", x: 100, y: 200, pose: "walk", tick: 2 });
    r.drawDudie({ team: "red", x: 100, y: 200, pose: "walk", tick: 3 });
    expect(calls.length).toBe(4);
    expect((calls[0].src as unknown as { __tag: string }).__tag).toBe("red#2");
    expect((calls[1].src as unknown as { __tag: string }).__tag).toBe("red#3");
    expect((calls[2].src as unknown as { __tag: string }).__tag).toBe("red#2");
    expect((calls[3].src as unknown as { __tag: string }).__tag).toBe("red#3");
  });

  it("uses the right frame for a green 'walk' pose anchored on its foot", () => {
    const r = makeRenderer();
    r.drawDudie({ team: "green", x: 50, y: 100, pose: "walk", tick: 0 });
    expect(calls.length).toBe(1);
    // Green walk frame 2: footX=22, footY=38 → dx=50-22=28, dy=100-38=62.
    expect(calls[0].dx).toBe(28);
    expect(calls[0].dy).toBe(62);
    expect((calls[0].src as unknown as { __tag: string }).__tag).toBe("green#2");
  });

  it("draws the dead frame for a dead red (skips the early-return fallback)", () => {
    const r = makeRenderer();
    r.drawDudie({ team: "red", x: 0, y: 0, pose: "dead", tick: 0, dead: true });
    expect(calls.length).toBe(1);
    expect((calls[0].src as unknown as { __tag: string }).__tag).toBe("red#4");
  });

  it("draws the selection ring under a selected red BEFORE the body sprite", () => {
    // Add a selection-ring image to the legacy images map.
    const r = makeRenderer();
    const ring = makeImg(40, 20, "ring");
    r.images.set("selectioncircle", ring);
    r.drawDudie({
      team: "red",
      x: 100,
      y: 200,
      pose: "ready",
      tick: 0,
      selected: true,
    });
    expect(calls.length).toBe(2);
    expect((calls[0].src as unknown as { __tag: string }).__tag).toBe("ring");
    expect((calls[1].src as unknown as { __tag: string }).__tag).toBe("red#1");
  });

  it("falls back to first frame when an unknown pose is supplied", () => {
    const r = makeRenderer();
    r.drawDudie({
      team: "red",
      x: 100,
      y: 200,
      pose: "doesnotexist",
      tick: 0,
    });
    expect(calls.length).toBe(1);
    // frameForState falls back to frames[0].frame (=1).
    expect((calls[0].src as unknown as { __tag: string }).__tag).toBe("red#1");
  });

  it("default red pose is 'ready' when omitted", () => {
    const r = makeRenderer();
    r.drawDudie({ team: "red", x: 100, y: 200 });
    expect(calls.length).toBe(1);
    expect((calls[0].src as unknown as { __tag: string }).__tag).toBe("red#1");
  });

  it("default green pose is 'balling' when omitted", () => {
    const r = makeRenderer();
    r.drawDudie({ team: "green", x: 50, y: 100 });
    expect(calls.length).toBe(1);
    expect((calls[0].src as unknown as { __tag: string }).__tag).toBe("green#1");
  });
});

describe("Renderer.drawDudie — anchor fallback for footY > h sprites", () => {
  let canvas: HTMLCanvasElement;
  let calls: DrawCall[];

  beforeEach(() => {
    const stub = makeStubCanvas();
    canvas = stub.canvas;
    calls = stub.calls;
  });

  it("uses bottom-centre when footY exceeds the sprite height (FFDec stage-Y artifact)", () => {
    // Real red index frames have footY ~= 670 but cropped height ~= 48. The
    // renderer must detect that and fall back to anchoring by sprite-bottom-
    // centre so the foot lands at world (x, y).
    const idx: SpriteIndex = {
      frames: [
        { frame: 1, path: "sprites/red/1.png", footX: 47.5, footY: 671, w: 68, h: 48 },
      ],
      labels: { ready: { first: 1, last: 1 } },
    };
    const frames = new Map<number, HTMLImageElement>();
    frames.set(1, makeImg(68, 48, "red#1"));
    const r = new Renderer(canvas, EMPTY_MANIFEST, new Map(), {
      redIndex: idx,
      greenIndex: null,
      redFrames: frames,
      greenFrames: new Map(),
    });
    r.drawDudie({ team: "red", x: 100, y: 200, pose: "ready", tick: 0 });
    expect(calls.length).toBe(1);
    // bottom-centre anchor: dx = 100 - 68/2 = 66, dy = 200 - 48 = 152.
    expect(calls[0].dx).toBe(66);
    expect(calls[0].dy).toBe(152);
  });
});
