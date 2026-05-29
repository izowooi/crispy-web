// Animation — pure helpers that pick the correct sprite frame for a given
// character state from a per-team sprite index (the JSON files at
// /assets/sprites/<team>/index.json).
//
// The sprite index lists every PNG frame extracted from the SWF together with
// its foot-anchor (sprite-bottom-centre in the original SWF registration) and
// pixel size. A `labels` map groups runs of frames into named animations
// ("ready", "walk", "cock", "toss", "hitdazed", "dead", "balling", "hit", …).
//
// frameForState() picks one frame number out of a label's [first, last] range
// based on a monotonically-increasing tick counter (advanced by the caller
// once per game frameloop). The pick wraps around the range modulo its length
// so that animations loop smoothly. If the requested label is missing the
// function falls back to the first frame in the index, which matches the
// SWF's behaviour of clamping to the first stage frame on an unknown label.

/**
 * One PNG frame from the sprite index. Mirrors the JSON shape produced by the
 * FFDec extraction step (see public/assets/sprites/<team>/index.json).
 */
export interface SpriteFrame {
  /** 1-based SWF frame number. */
  frame: number;
  /** Public asset path relative to /assets/. */
  path: string;
  /** Foot-anchor X (sprite-local pixels — usually w/2). */
  footX: number;
  /** Foot-anchor Y (sprite-local pixels — usually h or h-1). */
  footY: number;
  /** Native sprite width in pixels. */
  w: number;
  /** Native sprite height in pixels. */
  h: number;
}

/** A named [first, last] frame range inside a sprite index. */
export interface SpriteLabel {
  first: number;
  last: number;
}

/**
 * The full per-team sprite index. `frames` is the flat list of PNG frames in
 * SWF order; `labels` maps animation names to inclusive [first, last] frame
 * ranges into that list.
 */
export interface SpriteIndex {
  frames: SpriteFrame[];
  labels: Record<string, SpriteLabel>;
}

/**
 * One-shot ("hold last frame") poses. In the original SWF these clips play
 * through once and then `stop()` on (or settle to) their final frame — the
 * corpse stays down, the fallen dudie stays fallen. Indexing into them with a
 * looping `tick % length` re-cycles the multi-frame range every tick, which is
 * exactly the death-frame "flicker" the port exhibited (PROGRESS_BEHAVIOR.md).
 *
 * Faithful mapping (frame ranges per public/assets/sprites/<team>/index.json):
 *   GREEN — hit(11-16), midrecover(17-32), down(33-57), dead(58-64), yea(65-73)
 *           GreenSnowDudie.as:44-66 / :70-71
 *   RED   — hitdazed(5-6), dead(16-23)
 *           RedSnowDudie.as:72-89
 * Looping poses (walk, dazed, balling, ready, cock, toss, yealoop) keep
 * wrapping — `gotoAndPlay("walk")` etc. loop in the SWF.
 */
export const HOLD_LAST_POSES: ReadonlySet<string> = new Set([
  "dead",
  "down",
  "hit",
  "midrecover",
  "yea",
  "hitdazed",
]);

/**
 * Pick the sprite frame number for a character at the given animation tick.
 *
 * - If the label exists and is a one-shot (HOLD_LAST_POSES) pose, returns
 *   `first + min(floor(max(tick,0)), length-1)` — i.e. it advances through the
 *   range once and then holds the last frame, never wrapping.
 * - If the label exists and loops, returns `first + (floor(max(tick,0)) %
 *   length)`, where length = last - first + 1.
 * - If the label is missing (or its range is empty/invalid), falls back to
 *   the first frame in the index — i.e. `index.frames[0].frame`.
 *
 * NOTE: `tick` must be reset to 0 each time the pose is (re)entered (see
 * PoseClock) so a one-shot animation plays from its first frame; a monotonic
 * global tick would clamp a fresh one-shot straight to its last frame.
 */
export function frameForState(
  index: SpriteIndex,
  pose: string,
  tick: number
): number {
  const label = index.labels[pose];
  const fallback = index.frames.length > 0 ? index.frames[0].frame : 0;
  if (!label) return fallback;
  const length = label.last - label.first + 1;
  if (length <= 0) return fallback;
  // Floor non-integer ticks; clamp negative ticks to 0 so we never produce a
  // negative modulo result (JS `%` preserves sign of the dividend).
  const t = Math.max(0, Math.floor(tick));
  if (HOLD_LAST_POSES.has(pose)) {
    return label.first + Math.min(t, length - 1);
  }
  return label.first + (t % length);
}

/**
 * Look up the {footX, footY} anchor for a specific frame number. Falls back
 * to the first frame's anchor when the frame is not in the index.
 */
export function getFootAnchor(
  index: SpriteIndex,
  frame: number
): { footX: number; footY: number } {
  const entry = index.frames.find((f) => f.frame === frame);
  const src = entry ?? index.frames[0];
  return { footX: src.footX, footY: src.footY };
}
