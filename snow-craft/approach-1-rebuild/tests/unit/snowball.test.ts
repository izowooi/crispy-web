import { describe, it, expect } from 'vitest';
import { Snowball, SNOWBALL_MAX_LIFETIME } from '../../src/core/snowball';
import { Vector2 } from '../../src/core/vector2';

function makeBall(overrides: Partial<{
  position: Vector2;
  velocity: Vector2;
  ownerTeam: 'player' | 'cpu';
  ownerId: string;
  damage: number;
}> = {}) {
  return new Snowball({
    position: overrides.position ?? new Vector2(0, 0),
    velocity: overrides.velocity ?? new Vector2(100, 0),
    ownerTeam: overrides.ownerTeam ?? 'player',
    ownerId: overrides.ownerId ?? 'p1',
    damage: overrides.damage,
  });
}

describe('Snowball', () => {
  it('moves forward by velocity', () => {
    const b = makeBall({ velocity: new Vector2(100, 0) });
    b.update(0.1);
    expect(b.position.x).toBeGreaterThan(9);
    expect(b.position.x).toBeLessThan(11);
  });

  it('expires after max lifetime', () => {
    const b = makeBall();
    b.update(SNOWBALL_MAX_LIFETIME + 0.1);
    expect(b.alive).toBe(false);
  });

  it('detects out of bounds', () => {
    const b = makeBall({ position: new Vector2(1000, 100) });
    expect(b.isOutOfBounds(800, 500)).toBe(true);
  });

  it('default damage is 1', () => {
    expect(makeBall().damage).toBe(1);
  });

  it('drag slows velocity over time', () => {
    const b = makeBall({ velocity: new Vector2(200, 0) });
    const initial = b.velocity.x;
    b.update(0.5);
    expect(b.velocity.x).toBeLessThan(initial);
  });
});
