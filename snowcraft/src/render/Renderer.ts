// Renderer — faithful Canvas 2D blit of the SWF stage.
//
// Loads PNG sprites listed in `/assets/manifest.json` via `new Image()` and
// renders them at the original SWF stage layout (592 x 320, top-left origin,
// +Y down — see spec/main.md §2 / spec/snowball.md §1). NO procedural drawing
// of game art: every pixel comes from the FFDec-extracted PNGs.
//
// The original frame layout is reconstructed from line cites:
//   * Background sprite (`gamemc_background`) is the full 592×320 play-field
//     image (spec/assets.md, "DefineBits 111 → DefineSprite 113 → gamemc 114").
//   * Red/green dudie bodies are now drawn from the per-team per-frame sprite
//     index at /assets/sprites/<team>/index.json. Each frame carries its own
//     foot-anchor (sprite-local pixels) so the renderer can land the foot at
//     world (x,y) regardless of the frame's bounding box.
//   * Snowball (chid 33) — centred at ball position (no y-offset; spawn-y
//     offset of 35/15 is applied by the caller per spec/snowball.md).
//   * Shadow (chid 38, "snowballshadow_ground") — drawn at shadow position.
//   * Selection ring (chid 6) — drawn under hovered red dudie when
//     `Player.mouseover()` returns true (spec/player.md §5.1).
//
// Faithful-port discipline: this module does NOT perform any geometric
// shape stand-ins. Every draw is `ctx.drawImage(<HTMLImageElement>, ...)`.

import {
  frameForState,
  getFootAnchor,
  type SpriteIndex,
} from "./Animation.ts";

export type SpriteId =
  | "reddudie_body"
  | "selectioncircle"
  | "reddudie_part_11"
  | "snowball"
  | "snowball_impact"
  | "snowballshadow_ground"
  | "snowball_shadow_41"
  | "snowball_shadow_44"
  | "greendudie_body"
  | "gamemc_background";

export interface ManifestImageEntry {
  path: string;
  swfChid: number;
  definingTag: string;
  source: string;
  trigger: string;
  use: string;
}

export interface ManifestSoundEntry {
  mp3: string;
  ogg: string;
  swfCid: number;
  frameLabel: string;
  source: string;
  trigger: string;
  use: string;
}

export interface AssetManifest {
  description?: string;
  images: Record<string, ManifestImageEntry>;
  sounds: Record<string, ManifestSoundEntry>;
}

export interface DudieDrawState {
  team: "red" | "green";
  x: number;
  y: number;
  selected?: boolean;
  dazed?: boolean;
  dead?: boolean;
  /** Animation label (matches a key in the per-team sprite index's labels
   *  map — e.g. "ready", "walk", "cock", "toss", "hit", "down", "dead", …).
   *  When omitted, defaults to "ready" for red and "balling" for green. */
  pose?: string;
  /** Monotonically-increasing animation tick (advanced once per game
   *  frameloop tick by the caller). The renderer does `tick % length` to
   *  pick a frame inside the label's range. Defaults to 0. */
  tick?: number;
}

export interface SnowballDrawState {
  ballX: number;
  ballY: number;
  shadowX: number;
  shadowY: number;
  visible: boolean;
}

/**
 * Load + decode the asset manifest from `/assets/manifest.json`. A test/SSR
 * caller can pass an explicit URL prefix; the default works when served from
 * Vite's static `/public` root.
 */
export async function loadManifest(
  baseUrl = "/assets/",
  fetchImpl: typeof fetch = fetch
): Promise<AssetManifest> {
  const res = await fetchImpl(baseUrl + "manifest.json");
  if (!res.ok) {
    throw new Error(
      `Renderer: failed to load manifest (${res.status} ${res.statusText})`
    );
  }
  return (await res.json()) as AssetManifest;
}

/**
 * Load the per-team sprite index JSON
 * (/assets/sprites/<team>/index.json — produced by the FFDec frame-extract step).
 */
export async function loadSpriteIndex(
  team: "red" | "green",
  baseUrl = "/assets/",
  fetchImpl: typeof fetch = fetch
): Promise<SpriteIndex> {
  const url = baseUrl + "sprites/" + team + "/index.json";
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(
      `Renderer: failed to load sprite index ${url} (${res.status} ${res.statusText})`
    );
  }
  return (await res.json()) as SpriteIndex;
}

/** Preload one HTMLImageElement; resolves only after the image is decoded. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Renderer: failed to load image ${src}`));
    img.src = src;
  });
}

/**
 * Renderer — owns the canvas + the decoded HTMLImageElement bank.
 *
 * Stage size is locked at 592×320 (spec/main.md §2: SWF FrameSize rect →
 * 11840/20 x 6400/20 twips). The caller is responsible for setting
 * `canvas.width / canvas.height` to those values; this constructor verifies.
 */
export class Renderer {
  static readonly STAGE_WIDTH = 592;
  static readonly STAGE_HEIGHT = 320;

  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly manifest: AssetManifest;
  readonly images: Map<SpriteId, HTMLImageElement> = new Map();

  /** Per-team sprite index (frames + label ranges). */
  readonly redIndex: SpriteIndex | null;
  readonly greenIndex: SpriteIndex | null;
  /** Per-team frame cache: frameNumber → HTMLImageElement. */
  readonly redFrames: Map<number, HTMLImageElement>;
  readonly greenFrames: Map<number, HTMLImageElement>;

  /**
   * Construct a Renderer with already-loaded images. Use the static
   * `Renderer.create()` helper to do the asynchronous preload step.
   */
  constructor(
    canvas: HTMLCanvasElement,
    manifest: AssetManifest,
    images: Map<SpriteId, HTMLImageElement>,
    options?: {
      redIndex?: SpriteIndex | null;
      greenIndex?: SpriteIndex | null;
      redFrames?: Map<number, HTMLImageElement>;
      greenFrames?: Map<number, HTMLImageElement>;
    }
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Renderer: 2D context unavailable on canvas");
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.manifest = manifest;
    this.images = images;
    this.redIndex = options?.redIndex ?? null;
    this.greenIndex = options?.greenIndex ?? null;
    this.redFrames = options?.redFrames ?? new Map();
    this.greenFrames = options?.greenFrames ?? new Map();
    // Preserve original SWF pixel art crispness.
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * Async factory: fetch manifest + per-team sprite indices, preload every
   * PNG referenced (by the manifest AND by the per-frame indices), and
   * return a ready-to-draw Renderer.
   */
  static async create(
    canvas: HTMLCanvasElement,
    baseUrl = "/assets/",
    fetchImpl: typeof fetch = fetch
  ): Promise<Renderer> {
    const manifest = await loadManifest(baseUrl, fetchImpl);
    const images = new Map<SpriteId, HTMLImageElement>();
    const entries = Object.entries(manifest.images) as [SpriteId, ManifestImageEntry][];

    // Per-team sprite index loads run in parallel with the manifest-image
    // preload. If a sprite index is missing on disk we fall back to the
    // legacy single-body sprite so the game still draws something.
    const redIndexPromise = loadSpriteIndex("red", baseUrl, fetchImpl).catch(
      () => null
    );
    const greenIndexPromise = loadSpriteIndex("green", baseUrl, fetchImpl).catch(
      () => null
    );

    const [redIndex, greenIndex] = await Promise.all([
      redIndexPromise,
      greenIndexPromise,
    ]);

    const redFrames = new Map<number, HTMLImageElement>();
    const greenFrames = new Map<number, HTMLImageElement>();

    const framePreloads: Promise<void>[] = [];
    if (redIndex) {
      for (const f of redIndex.frames) {
        framePreloads.push(
          loadImage(baseUrl + f.path).then((img) => {
            redFrames.set(f.frame, img);
          })
        );
      }
    }
    if (greenIndex) {
      for (const f of greenIndex.frames) {
        framePreloads.push(
          loadImage(baseUrl + f.path).then((img) => {
            greenFrames.set(f.frame, img);
          })
        );
      }
    }

    await Promise.all([
      ...entries.map(async ([id, entry]) => {
        const img = await loadImage(baseUrl + entry.path);
        images.set(id, img);
      }),
      ...framePreloads,
    ]);
    return new Renderer(canvas, manifest, images, {
      redIndex,
      greenIndex,
      redFrames,
      greenFrames,
    });
  }

  /** Clear the stage to the SWF background color (#CCCCCC, dump.txt §1). */
  clear(): void {
    this.ctx.fillStyle = "#CCCCCC";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Draw the gamemc_background sprite at (0,0). */
  drawBackground(): void {
    const bg = this.images.get("gamemc_background");
    if (!bg) return;
    // Original sprite is full-stage; draw at native size top-left.
    this.ctx.drawImage(bg, 0, 0);
  }

  /**
   * Draw a dudie sprite (red or green) anchored on its foot at world (x, y).
   *
   * When a per-team sprite index + frame cache is available, we look up the
   * frame for `state.pose` at `state.tick`, fetch its (footX, footY) anchor,
   * and blit the cropped PNG so its anchor lands exactly at world (x, y).
   * Otherwise we fall back to the legacy single-body sprite, which is
   * anchored at sprite-bottom-centre.
   */
  drawDudie(state: DudieDrawState): void {
    if (state.dead && state.team === "red") {
      // Red has a dedicated death animation in the new sprite index, but the
      // legacy fallback path can't render it — preserve existing behaviour
      // (skip the body draw) when no index is loaded.
      const idx = this.redIndex;
      if (!idx) return;
    }

    const team = state.team;
    const index = team === "red" ? this.redIndex : this.greenIndex;
    const frames = team === "red" ? this.redFrames : this.greenFrames;
    const defaultPose = team === "red" ? "ready" : "balling";
    const pose = state.pose ?? defaultPose;
    const tick = state.tick ?? 0;

    // Selection ring is drawn UNDER the dudie body at its feet (red only).
    if (team === "red" && state.selected) {
      const ring = this.images.get("selectioncircle");
      if (ring) {
        this.ctx.drawImage(
          ring,
          Math.round(state.x - ring.width / 2),
          Math.round(state.y - ring.height / 2)
        );
      }
    }

    if (index && frames.size > 0) {
      const frameNumber = frameForState(index, pose, tick);
      const frameImg = frames.get(frameNumber);
      if (frameImg) {
        const { footX, footY } = getFootAnchor(index, frameNumber);
        // The foot-anchor is in sprite-LOCAL pixels (footY may be a stage-
        // wide Y extracted by FFDec — typically larger than the cropped PNG
        // height). The faithful rule is: place the sprite so its anchor
        // lands at world (x, y), so the destination top-left is
        // (x - footX, y - footY) BUT footY refers to the bottom of the SWF
        // movieclip's bounding box, which after cropping may exceed h. The
        // FFDec extract preserves footY as "anchor measured from the top of
        // the sprite local coord system", so footY > h means the anchor is
        // below the cropped image (typical for these sprites whose
        // registration point is the original stage-Y baseline). To keep the
        // foot at world (x, y) we anchor by the image's BOTTOM-CENTRE in
        // that case; otherwise we use the precise footX/footY.
        let dx: number;
        let dy: number;
        if (footY > frameImg.height || footX > frameImg.width) {
          dx = Math.round(state.x - frameImg.width / 2);
          dy = Math.round(state.y - frameImg.height);
        } else {
          dx = Math.round(state.x - footX);
          dy = Math.round(state.y - footY);
        }
        this.ctx.drawImage(frameImg, dx, dy);
        return;
      }
    }

    // Legacy fallback — draw the single-body sprite if the per-frame index
    // is missing (e.g. unit-test contexts that don't preload sprites).
    if (state.dead) return;
    const sprite = this.images.get(team === "red" ? "reddudie_body" : "greendudie_body");
    if (!sprite) return;
    const dx = Math.round(state.x - sprite.width / 2);
    const dy = Math.round(state.y - sprite.height);
    this.ctx.drawImage(sprite, dx, dy);
    if (state.dazed) {
      const part = this.images.get("reddudie_part_11");
      if (part) {
        this.ctx.drawImage(
          part,
          Math.round(state.x - part.width / 2),
          dy - part.height
        );
      }
    }
  }

  /**
   * Draw a snowball + its ground shadow. Ball sprite is centred on
   * (ballX, ballY); shadow sprite is centred on (shadowX, shadowY).
   */
  drawSnowball(state: SnowballDrawState): void {
    const shadow = this.images.get("snowballshadow_ground");
    if (shadow) {
      this.ctx.drawImage(
        shadow,
        Math.round(state.shadowX - shadow.width / 2),
        Math.round(state.shadowY - shadow.height / 2)
      );
    }
    if (!state.visible) return;
    const ball = this.images.get("snowball");
    if (!ball) return;
    this.ctx.drawImage(
      ball,
      Math.round(state.ballX - ball.width / 2),
      Math.round(state.ballY - ball.height / 2)
    );
  }
}
