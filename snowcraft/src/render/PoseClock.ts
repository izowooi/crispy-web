// PoseClock — a per-object animation clock keyed on the pose label.
//
// The renderer picks a sprite frame with `frameForState(index, pose, tick)`.
// For that to be faithful, `tick` must be the number of game-frames the object
// has spent IN ITS CURRENT POSE — not a monotonic counter. When a dudie
// transitions (e.g. ready -> dead), the clock restarts at 0 so the one-shot
// death animation plays from its first frame and then holds its last frame
// (see HOLD_LAST_POSES in Animation.ts). Indexing a one-shot pose with a
// monotonic global tick caused the death-frame flicker (PROGRESS_BEHAVIOR.md).
//
// Keys are objects (the live dudie wrappers) held weakly so destroyed dudies
// are garbage-collected without manual cleanup.

interface PoseEntry {
  pose: string;
  tick: number;
}

export class PoseClock {
  private readonly state = new WeakMap<object, PoseEntry>();

  /**
   * Advance the clock for `key` given its pose THIS frame and return the tick
   * to feed `frameForState`.
   *
   * - First time the object is seen, or whenever `pose` differs from the last
   *   call, the tick resets to 0.
   * - While `pose` is unchanged, the tick increments by 1 each call.
   *
   * Call exactly once per object per game frameloop tick (20 fps), not per
   * render frame, so animations advance at the SWF's fixed rate.
   */
  advance(key: object, pose: string): number {
    const prev = this.state.get(key);
    const tick = prev && prev.pose === pose ? prev.tick + 1 : 0;
    this.state.set(key, { pose, tick });
    return tick;
  }

  /** Read the current tick for `key` without advancing (0 if unseen). */
  peek(key: object): number {
    return this.state.get(key)?.tick ?? 0;
  }
}
