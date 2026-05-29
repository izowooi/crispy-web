import { describe, it, expect } from 'vitest';
import { readMoveAxis, chargeFromHoldMs, createInputState } from '../../src/input/input';

describe('input', () => {
  it('readMoveAxis returns zero by default', () => {
    const s = createInputState();
    const v = readMoveAxis(s);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it('readMoveAxis WASD goes right-down', () => {
    const s = createInputState();
    s.keys.add('d');
    s.keys.add('s');
    const v = readMoveAxis(s);
    expect(v.x).toBeCloseTo(Math.SQRT1_2);
    expect(v.y).toBeCloseTo(Math.SQRT1_2);
  });

  it('readMoveAxis arrow keys also work', () => {
    const s = createInputState();
    s.keys.add('arrowleft');
    expect(readMoveAxis(s).x).toBe(-1);
  });

  it('chargeFromHoldMs clamps to 0..1', () => {
    expect(chargeFromHoldMs(0, 1000)).toBe(0);
    expect(chargeFromHoldMs(500, 1000)).toBeCloseTo(0.5);
    expect(chargeFromHoldMs(2000, 1000)).toBe(1);
    expect(chargeFromHoldMs(-100, 1000)).toBe(0);
  });
});
