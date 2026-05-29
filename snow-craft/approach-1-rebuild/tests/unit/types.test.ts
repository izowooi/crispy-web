import { describe, it, expect } from 'vitest';
import { levelConfig, TEAM_COLOR_LIST, MAX_LEVEL } from '../../src/core/types';

describe('levelConfig', () => {
  it('returns level 1 defaults', () => {
    const c = levelConfig(1);
    expect(c.level).toBe(1);
    expect(c.cpuCount).toBe(3);
    expect(c.cpuDifficulty).toBe(1);
    expect(c.cpuHealth).toBe(3);
  });

  it('scales by +2 count, +0.5 difficulty, +0.25 health per level', () => {
    const c = levelConfig(2);
    expect(c.cpuCount).toBe(5);
    expect(c.cpuDifficulty).toBe(1.5);
    expect(c.cpuHealth).toBe(3); // round(3.25) = 3
  });

  it('matches level 100 ceiling stats per +2 per level formula', () => {
    // Note: the original pseudocode in MAIN.as is internally inconsistent —
    // its "level 100: 203" hard-coded comment doesn't match 3+99*2=201 from
    // its own +2/level formula. We honor the explicit formula (the actual
    // logic in the for-loop) which yields:
    //   count = 3 + 99 * 2  = 201
    //   diff  = 1 + 99 * 0.5 = 50.5  (matches "51" when rounded)
    //   health = round(3 + 99*0.25) = 28
    const c = levelConfig(100);
    expect(c.cpuCount).toBe(201);
    expect(Math.round(c.cpuDifficulty)).toBe(51);
    expect(c.cpuHealth).toBe(28);
  });

  it('clamps level above 100 down to 100', () => {
    expect(levelConfig(150).level).toBe(MAX_LEVEL);
  });

  it('clamps level below 1 up to 1', () => {
    expect(levelConfig(0).level).toBe(1);
    expect(levelConfig(-5).level).toBe(1);
  });

  it('exposes the canonical team color list', () => {
    expect(TEAM_COLOR_LIST).toContain('green');
    expect(TEAM_COLOR_LIST).toContain('red');
    expect(TEAM_COLOR_LIST.length).toBe(10);
  });
});
