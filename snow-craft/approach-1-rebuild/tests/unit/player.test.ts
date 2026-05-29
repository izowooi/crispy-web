import { describe, it, expect } from 'vitest';
import { Player, PLAYER_THROW_COOLDOWN, PLAYER_RELOAD_TIME, type PlayerInit } from '../../src/core/player';
import { Vector2 } from '../../src/core/vector2';

function makePlayer(overrides: Partial<PlayerInit> = {}): Player {
  return new Player({
    id: 'p1',
    team: 'player',
    color: 'green',
    position: new Vector2(100, 100),
    maxHealth: 3,
    ...overrides,
  });
}

describe('Player', () => {
  it('starts alive with full health', () => {
    const p = makePlayer();
    expect(p.isAlive).toBe(true);
    expect(p.health).toBe(3);
  });

  it('takes damage and dies at 0', () => {
    const p = makePlayer({ maxHealth: 2 });
    p.takeDamage();
    expect(p.health).toBe(1);
    p.takeDamage();
    expect(p.health).toBe(0);
    expect(p.isAlive).toBe(false);
  });

  it('does not heal below 0', () => {
    const p = makePlayer({ maxHealth: 1 });
    p.takeDamage(5);
    expect(p.health).toBe(0);
  });

  it('allows throwing initially', () => {
    expect(makePlayer().canThrow()).toBe(true);
  });

  it('respects cooldown after a throw', () => {
    const p = makePlayer();
    p.registerThrow();
    expect(p.canThrow()).toBe(false);
    p.update(PLAYER_THROW_COOLDOWN + PLAYER_RELOAD_TIME + 0.01);
    expect(p.canThrow()).toBe(true);
  });

  it('moves by velocity', () => {
    const p = makePlayer();
    p.velocity = new Vector2(50, 0);
    p.update(1);
    expect(p.position.x).toBeCloseTo(150);
    expect(p.position.y).toBeCloseTo(100);
  });

  it('does not move when dead', () => {
    const p = makePlayer({ maxHealth: 1 });
    p.takeDamage();
    p.velocity = new Vector2(50, 0);
    p.update(1);
    expect(p.position.x).toBeCloseTo(100);
  });

  it('clamps inside bounds', () => {
    const p = makePlayer({ position: new Vector2(-5, 1000) });
    p.clampToBounds(800, 500);
    expect(p.position.x).toBeGreaterThanOrEqual(p.radius);
    expect(p.position.y).toBeLessThanOrEqual(500 - p.radius);
  });

  it('sets facing toward target', () => {
    const p = makePlayer();
    p.setFacingTowards(new Vector2(200, 100));
    expect(p.facing).toBeCloseTo(0);
  });
});
