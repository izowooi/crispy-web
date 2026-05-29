export type TeamId = 'player' | 'cpu';

export type TeamColor =
  | 'blue'
  | 'green'
  | 'red'
  | 'yellow'
  | 'purple'
  | 'orange'
  | 'brown'
  | 'black'
  | 'grey'
  | 'pink';

export const TEAM_COLOR_LIST: TeamColor[] = [
  'blue',
  'green',
  'red',
  'yellow',
  'purple',
  'orange',
  'brown',
  'black',
  'grey',
  'pink',
];

export const TEAM_COLOR_HEX: Record<TeamColor, string> = {
  blue: '#1f4d8e',
  green: '#2f8a3d',
  red: '#b32525',
  yellow: '#d8b400',
  purple: '#7e3f9c',
  orange: '#d96b14',
  brown: '#6e3a1a',
  black: '#1a1a1a',
  grey: '#6f6f6f',
  pink: '#d266a3',
};

export interface LevelConfig {
  level: number;
  cpuCount: number;
  cpuDifficulty: number;
  cpuHealth: number;
}

export const MAX_LEVEL = 100;

/**
 * Implements the README/MAIN.as level scaling rules:
 *   level 1: count=3, difficulty=1, health=3
 *   each level: +2 count, +0.5 difficulty, +0.25 health
 *   level 100 caps: count=203, difficulty=51, health=28 (rounded as integers)
 */
export function levelConfig(level: number): LevelConfig {
  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  const steps = safeLevel - 1;
  return {
    level: safeLevel,
    cpuCount: 3 + steps * 2,
    cpuDifficulty: 1 + steps * 0.5,
    cpuHealth: Math.round(3 + steps * 0.25),
  };
}
