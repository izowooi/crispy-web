import { Vector2 } from '../core/vector2';

export interface InputState {
  keys: Set<string>;
  mouse: { x: number; y: number };
  isMouseDown: boolean;
  mouseDownStart: number; // performance.now() when pressed
}

export interface PointerEventLite {
  x: number;
  y: number;
}

/** Reads logical movement input axis (-1..1) for active player. */
export function readMoveAxis(state: InputState): Vector2 {
  let dx = 0;
  let dy = 0;
  if (state.keys.has('a') || state.keys.has('arrowleft')) dx -= 1;
  if (state.keys.has('d') || state.keys.has('arrowright')) dx += 1;
  if (state.keys.has('w') || state.keys.has('arrowup')) dy -= 1;
  if (state.keys.has('s') || state.keys.has('arrowdown')) dy += 1;
  const v = new Vector2(dx, dy);
  return v.length() === 0 ? v : v.normalized();
}

export function chargeFromHoldMs(ms: number, fullChargeMs: number): number {
  return Math.max(0, Math.min(1, ms / fullChargeMs));
}

export function createInputState(): InputState {
  return {
    keys: new Set(),
    mouse: { x: 0, y: 0 },
    isMouseDown: false,
    mouseDownStart: 0,
  };
}
