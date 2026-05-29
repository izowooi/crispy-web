import { describe, it, expect, beforeEach } from 'vitest';
import { Game, PLAYER_TEAM_SIZE } from '../../src/core/game';
import { Vector2 } from '../../src/core/vector2';
import { levelConfig } from '../../src/core/types';

function deterministicRng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

describe('Game', () => {
  let g: Game;
  beforeEach(() => {
    g = new Game({ rng: deterministicRng(42) });
  });

  it('starts in idle phase', () => {
    expect(g.phase).toBe('idle');
  });

  it('startLevel(1) creates 3 player kids and 3 CPUs', () => {
    g.startLevel(1);
    expect(g.phase).toBe('playing');
    expect(g.players.length).toBe(PLAYER_TEAM_SIZE);
    expect(g.cpus.length).toBe(3);
    expect(g.enemiesRemaining).toBe(3);
  });

  it('startLevel(2) has 5 enemies', () => {
    g.startLevel(2);
    expect(g.enemiesRemaining).toBe(5);
  });

  it('caps onscreen CPU count for high levels', () => {
    g.startLevel(50);
    expect(g.cpus.length).toBeLessThanOrEqual(60);
    expect(g.enemiesRemaining).toBe(levelConfig(50).cpuCount);
  });

  it('throwFromActive spawns a snowball with player ownership', () => {
    g.startLevel(1);
    const before = g.snowballs.length;
    const ball = g.throwFromActive(new Vector2(700, 250), 0.5);
    expect(ball).not.toBeNull();
    expect(g.snowballs.length).toBe(before + 1);
    expect(ball!.ownerTeam).toBe('player');
  });

  it('snowball KOs an enemy at point-blank range', () => {
    g.startLevel(1);
    const cpu = g.cpus[0];
    cpu.position = new Vector2(200, 250);
    cpu.health = 1;
    g.players[0].position = new Vector2(180, 250);
    g.throwFromActive(cpu.position, 1);
    // step in small increments
    for (let i = 0; i < 60 && cpu.isAlive; i++) g.update(1 / 60);
    expect(cpu.isAlive).toBe(false);
    expect(g.score).toBeGreaterThan(0);
  });

  it('transitions to level-clear when all enemies are KOed', () => {
    g.startLevel(1);
    for (const c of g.cpus) c.takeDamage(c.health);
    g.enemiesRemaining = 0;
    g.update(0.016);
    expect(g.phase).toBe('level-clear');
  });

  it('advanceLevel goes from level-clear to next level playing', () => {
    g.startLevel(1);
    for (const c of g.cpus) c.takeDamage(c.health);
    g.enemiesRemaining = 0;
    g.update(0.016);
    expect(g.phase).toBe('level-clear');
    g.advanceLevel();
    expect(g.phase).toBe('playing');
    expect(g.level).toBe(2);
  });

  it('transitions to game-over when all player kids die', () => {
    g.startLevel(1);
    for (const p of g.players) p.takeDamage(p.health);
    g.update(0.016);
    expect(g.phase).toBe('game-over');
  });

  it('cycleActivePlayer skips dead players', () => {
    g.startLevel(1);
    g.activePlayerIndex = 0;
    g.players[1].takeDamage(g.players[1].health); // kill index 1
    g.cycleActivePlayer();
    expect(g.activePlayerIndex).toBe(2);
  });

  it('does not let a snowball hit own team', () => {
    g.startLevel(1);
    g.players[0].position = new Vector2(100, 100);
    g.players[1].position = new Vector2(110, 100);
    const ball = g.throwFromActive(new Vector2(110, 100), 0);
    expect(ball).not.toBeNull();
    for (let i = 0; i < 20; i++) g.update(1 / 60);
    expect(g.players[1].health).toBe(g.players[1].maxHealth);
  });
});
