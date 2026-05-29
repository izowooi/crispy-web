// meter.ts — the red dudie charge meter (RedSnowDudie.as).
//
// In the SWF the meter is a 15-frame clip nested inside the dudie movieclip.
// While the player holds (drags) a red dudie it sits in the "cock" pose and the
// meter clip plays, advancing ~1 frame per game tick (20 fps -> 50 ms/frame).
// On release `throwball()` samples `meter._currentframe` to set the throw force
// (RedSnowDudie.as:110-114):
//
//     var force = 0.001;
//     if (this.dudiemc.meter._currentframe > 4) {
//         force = this.dudiemc.meter._currentframe / 15;
//     }
//
// Both the on-screen gauge (main.ts draw) and the on-release force must read
// the SAME frame value, so the visible charge matches the thrown power. This
// module is the single source of truth for that mapping.

/** Number of frames in the meter clip (RedSnowDudie meter, DefineSprite). */
export const METER_MAX = 15;

/** Milliseconds the meter spends per frame = one 20 fps game tick. */
export const METER_MS_PER_FRAME = 50;

/**
 * Meter frame (1..METER_MAX) for a given press-and-hold duration in ms.
 * Floors at 1 (the clip is always at least on frame 1 once cocking) and
 * saturates at METER_MAX.
 */
export function chargeFrame(heldMs: number): number {
  const frame = Math.round(heldMs / METER_MS_PER_FRAME);
  return Math.max(1, Math.min(METER_MAX, frame));
}

/**
 * Throw force for a meter frame, per RedSnowDudie.as:110-114. Frames 1..4 are
 * an ineffective "barely cocked" throw (0.001); frames 5..15 scale linearly to
 * 1.0 at full charge.
 */
export function chargeForce(frame: number): number {
  return frame > 4 ? frame / METER_MAX : 0.001;
}
