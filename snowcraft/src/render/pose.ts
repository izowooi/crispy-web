// pose.ts — derives the animation label ("pose") for a red or green dudie
// from its current logical state. Extracted into its own module so main.ts's
// per-frame state→sprite mapping is pure and unit-testable.
//
// The labels here MUST match the keys in /assets/sprites/<team>/index.json
// (see public/assets/sprites/red/index.json, green/index.json):
//
//   red:    "rest" "ready" "cock" "toss" "hitdazed" "dazed" "dead" "walk"
//   green:  "walk" "ready" "balling" "cock" "toss" "hit" "midrecover"
//           "down" "dead" "yea" "yealoop"
//
// Mapping rationale (faithful to the AS-source state machine):
//
//   RED  — RedSnowDudie.as
//     dead          → "dead"      (RedSnowDudie.as:81-89)
//     dudiemcDazed  → "hitdazed" then "dazed"
//                       (RedSnowDudie.as:75-76; DefineSprite_32 frame_15)
//     walking       → "walk"      (gotoAndPlay("walk") at end of walk-start)
//     dragdudie     → "cock"      (RedSnowDudie.as:64 — drag holds cock pose)
//     justReleased  → "toss"      (RedSnowDudie.as:128 — short-lived after release)
//     else          → "ready"     (default idle pose)
//
//   GREEN — GreenSnowDudie.as
//     dead          → "dead"      (:58-66)
//     down          → "down"      (:51-56)
//     justhit       → "hit"       (:44-50)
//     walking       → "walk"      (:108-113)
//     cocking > 10  → "cock"      (:117-126 — first phase of the countdown)
//     cocking > 0   → "toss"      (cocking==10 dispatches throw + toss pose)
//     balling > 0   → "balling"   (:148-159)
//     else          → "balling"   (default idle pose for green)

export interface RedPoseState {
  /** Player.dead — RedSnowDudie.as:81-89. */
  dead: boolean;
  /** Player.dudiemcDazed — RedSnowDudie.as:75 / :170. */
  dudiemcDazed: boolean;
  /** Player.dazed countdown — starts at 40 and clears the stun at 0. */
  dazedFrames?: number;
  /** Player.walking — ASnowDudie.as:9. */
  walking: boolean;
  /** Charge meter frame; >0 while user is dragging the dudie
   *  (RedSnowDudie.as:111-114 reads this from the meter clip). */
  meterFrame: number;
  /** True for the few ticks immediately after mouserelease so we can show
   *  the "toss" frame before falling back to ready. */
  justReleased: boolean;
}

export interface GreenPoseState {
  /** GreenAI.dead — GreenSnowDudie.as:58-66. */
  dead: boolean;
  /** GreenAI.down — GreenSnowDudie.as:51-56. */
  down: boolean;
  /** GreenAI.justhit — GreenSnowDudie.as:44-50. */
  justhit: boolean;
  /** GreenAI.walking. */
  walking: boolean;
  /** GreenAI.cocking — countdown after the AI commits to a throw. */
  cocking: number;
  /** GreenAI.balling — countdown the AI spends "winding up". */
  balling: number;
}

export type PoseLabel =
  | "rest"
  | "ready"
  | "cock"
  | "toss"
  | "hitdazed"
  | "dazed"
  | "dead"
  | "walk"
  | "balling"
  | "hit"
  | "midrecover"
  | "down"
  | "yea"
  | "yealoop";

/**
 * Pose for a red player dudie.
 *
 * The priority order matches the AS state-machine: dead beats everything,
 * dazed beats walking, dragging (meterFrame > 0) beats idle, and a recent
 * release shows "toss" before reverting to "ready".
 */
export function redPose(s: RedPoseState): PoseLabel {
  if (s.dead) return "dead";
  if (s.dudiemcDazed) {
    const remaining = s.dazedFrames ?? 40;
    return remaining >= 38 ? "hitdazed" : "dazed";
  }
  if (s.walking) return "walk";
  if (s.meterFrame > 0) return "cock";
  if (s.justReleased) return "toss";
  return "ready";
}

/**
 * Pose for a green AI dudie.
 *
 * The priority order matches GreenSnowDudie.frameloop()'s cascade: dead and
 * down short-circuit; justhit (the post-first-hit recovery window) is
 * higher priority than walking; cocking (charged throw) takes precedence
 * over balling (idle wind-up) once the countdown has started.
 */
export function greenPose(s: GreenPoseState): PoseLabel {
  if (s.dead) return "dead";
  if (s.down) return "down";
  if (s.justhit) return "hit";
  if (s.walking) return "walk";
  if (s.cocking > 10) return "cock";
  if (s.cocking > 0) return "toss";
  if (s.balling > 0) return "balling";
  return "balling";
}
