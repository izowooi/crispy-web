// Faithful port of `Snowcraft1Rewrite.greendudiestartingpoints[0..8]` and
// the immediately-related per-class constants used by gameplay code.
//
// Authoritative source (all line cites are relative to
// `decompiled/scripts/scripts/`):
//   __Packages/com/iconnicholson/onehammer/Snowcraft1Rewrite.as
//   __Packages/com/iconnicholson/onehammer/RedSnowDudie.as
//   __Packages/com/iconnicholson/onehammer/GreenSnowDudie.as
//   __Packages/com/iconnicholson/onehammer/SnowBall.as
//   __Packages/com/iconnicholson/onehammer/ASnowDudie.as
//
// Every numeric literal below is a verbatim copy of the AS source. Where a
// "post-mutation" table is recorded, the mutation is the ActionScript
// expression evaluated below — not a precomputed snapshot — so the output is
// guaranteed to byte-equal what the SWF builds at runtime.

// ---------------------------------------------------------------------------
// Engine-level constants (cited)
// ---------------------------------------------------------------------------

/** SWF FrameRate (fixed8 = 20.0) — see spec/levels.md §1 / dump.txt. */
export const GAME_FPS = 20;

/** Off-world snowball cull bound — Snowcraft1Rewrite.as:384 */
export const WORLD_CULL_BOUND = 2999;

/** Hit-test box (snowball ↔ dudie) — Snowcraft1Rewrite.as:366, :376 */
export const HIT_TEST_RADIUS = 30;
export const HIT_TEST_Y_OFFSET = 20;

/** +10 score per green hit — Snowcraft1Rewrite.as:369 */
export const GREEN_HIT_SCORE = 10;

/** 30-minute time-bonus window — Snowcraft1Rewrite.as:416-419 */
export const TIME_BONUS_WINDOW_MS = 1_800_000;

// ---------------------------------------------------------------------------
// Per-team gameplay constants
// ---------------------------------------------------------------------------

/** Red HP — RedSnowDudie.as:13 */
export const RED_HP = 2;
/** Green HP — GreenSnowDudie.as:15 */
export const GREEN_HP = 3;

/** Red snowball initial velocity — SnowBall.as:45-46 */
export const RED_BALL_INITIAL_XMOV = -20;
export const RED_BALL_INITIAL_YMOV = -10;

/** Green snowball initial velocity — SnowBall.as:50-51 */
export const GREEN_BALL_INITIAL_XMOV = 20;
export const GREEN_BALL_INITIAL_YMOV = 10;

// ---------------------------------------------------------------------------
// Red team — fixed every level (Snowcraft1Rewrite.as:13-18)
// ---------------------------------------------------------------------------

export interface RedDudieStart {
  startX: number;
  startY: number;
}

export const RED_DUDIE_STARTS: readonly RedDudieStart[] = [
  // Snowcraft1Rewrite.as:13-14
  { startX: 450, startY: 200 },
  // :15-16
  { startX: 420, startY: 260 },
  // :17-18
  { startX: 310, startY: 250 },
];

/**
 * Reds are placed at (start + 200, start + 100) and walk to (start, start).
 * Snowcraft1Rewrite.as:242-259
 */
export const REDDUDIE_PLACEMENT_DX = 200;
export const REDDUDIE_PLACEMENT_DY = 100;

// ---------------------------------------------------------------------------
// Walkspeed override — Snowcraft1Rewrite.as:273-280
//
//   if (level == 5 || level > 6)  walkspeed = 10;
//   if (level == 6)               walkspeed = 15;
//
// (The level-6 branch runs *after* the >6 branch, so 15 wins for level 6.)
// Default walkspeed is 5 (ASnowDudie.as:11).
// ---------------------------------------------------------------------------

export function greenWalkSpeedForLevel(level: number): number {
  let ws = 5;
  if (level === 5 || level > 6) ws = 10;
  if (level === 6) ws = 15;
  // Extended (non-original) levels 10+ — gentle speed ramp on top of the
  // base 10 so the added campaign keeps getting harder. Capped at 16.
  if (level >= 10) ws = Math.min(10 + (level - 9), 16); // L10..L14 → 11..15
  return ws;
}

// ---------------------------------------------------------------------------
// Extended campaign — NEW levels 10..14 (NOT in the original SWF).
//
// The original game has 9 levels (its late levels 6-9 spawn enemies far
// off-screen due to mutation-loop quirks faithfully reproduced above). These
// five appended levels are a clean, readable continuation: greens march in
// from just off the left edge to on-stage formations in green territory
// (upper-left of the (592,0)-(0,320) divider), with a steady difficulty ramp
// in enemy count (6→7→8→9→10) and walkspeed (greenWalkSpeedForLevel).
// ---------------------------------------------------------------------------

/** Build a level from on-stage target points: each green spawns just off the
 *  left edge (staggered so they arrive as a wave) and walks straight in. */
function marchInFromLeft(targets: ReadonlyArray<readonly [number, number]>): GreenStart[] {
  return targets.map(
    ([tx, ty], i): GreenStart => [-50 - i * 15, ty, tx, ty]
  );
}

export const EXTRA_LEVELS: readonly GreenStart[][] = [
  // L10 — 6 greens: two tidy rows of three (a phalanx).
  marchInFromLeft([
    [110, 70], [170, 80], [230, 90],
    [90, 120], [150, 130], [210, 140],
  ]),
  // L11 — 7 greens: a rightward-pointing wedge.
  marchInFromLeft([
    [220, 100],
    [180, 75], [180, 125],
    [140, 55], [140, 145],
    [100, 40], [100, 160],
  ]),
  // L12 — 8 greens: wide front diagonal + a second row + low flanker.
  marchInFromLeft([
    [80, 60], [140, 70], [200, 80], [260, 90],
    [110, 120], [170, 130], [230, 140],
    [60, 170],
  ]),
  // L13 — 9 greens: a 3×3 grid filling green territory.
  marchInFromLeft([
    [90, 60], [160, 60], [230, 60],
    [90, 110], [160, 110], [230, 110],
    [90, 160], [160, 160], [230, 160],
  ]),
  // L14 — 10 greens: full assault, spread wide (front 4 / mid 3 / back 3).
  marchInFromLeft([
    [70, 50], [140, 55], [210, 60], [280, 70],
    [90, 105], [160, 110], [230, 115],
    [110, 160], [180, 165], [250, 150],
  ]),
];

// ---------------------------------------------------------------------------
// Total level count / end-of-game predicate — Snowcraft1Rewrite.as:309-316.
// The original game ends at level 9; the extended campaign adds EXTRA_LEVELS,
// so the last level (and the win trigger) is 9 + EXTRA_LEVELS.length.
// ---------------------------------------------------------------------------

export const ORIGINAL_TOTAL_LEVELS = 9;
export const TOTAL_LEVELS = ORIGINAL_TOTAL_LEVELS + EXTRA_LEVELS.length;

export function isLastLevel(level: number): boolean {
  return level === TOTAL_LEVELS;
}

// ---------------------------------------------------------------------------
// Spawn-point tables
// ---------------------------------------------------------------------------

/**
 * One green-dudie starting record:
 *   [startX, startY, walkEndX, walkEndY]
 * Consumed by `dolevel()` at Snowcraft1Rewrite.as:264-282.
 */
export type GreenStart = [number, number, number, number];

export interface LevelConfig {
  /** 1-based level index for cross-reference; not used by the loop itself. */
  level: number;
  greens: GreenStart[];
}

export interface FullLevelConfig {
  /** Indices 0..8 correspond to in-game levels 1..9. */
  levels: LevelConfig[];
}

/**
 * Build the full level table. The randomness for level 9 (index 8) is consumed
 * here, ONCE at "game start", matching the original where the table is built
 * inside the `Snowcraft1Rewrite` constructor (Snowcraft1Rewrite.as:189-195).
 *
 * Pass a deterministic `rng` for reproducible tests/demos; defaults to
 * `Math.random`.
 */
export function buildLevelConfig(rng: () => number = Math.random): FullLevelConfig {
  // Top-level array, AS source `this.greendudiestartingpoints = new Array();`
  // Snowcraft1Rewrite.as:41
  const t: GreenStart[][] = [];

  // ---- Level 1 (index 0) — Snowcraft1Rewrite.as:42-45 ----------------------
  t[0] = [
    [-20, -60, 180, 40],
    [-130, -60, 70, 40],
    [-130, 1, 70, 100],
  ];

  // ---- Level 2 (index 1) — Snowcraft1Rewrite.as:46-51 ----------------------
  t[1] = [
    [-20, -60, 180, 40],
    [-130, -60, 70, 40],
    [-130, 1, 70, 100],
    [-50, -100, -2, -99],
    [-50, 1, -49, 1],
  ];

  // ---- Level 3 (index 2) — Snowcraft1Rewrite.as:52-59 ----------------------
  t[2] = [
    [-20, -60, 180, 40],
    [-130, -60, 70, 40],
    [-130, 1, 70, 100],
    [-50, 100, -51, 101],
    [-50, 150, -51, 151],
    [-100, -50, -101, -51],
    [-150, -50, -151, -50],
  ];

  // ---- Level 4 (index 3) — Snowcraft1Rewrite.as:60-69 ----------------------
  t[3] = [
    [-20, -60, 180, 40],
    [-130, -60, 70, 40],
    [-130, 1, 70, 100],
    [-50, 100, -51, 101],
    [-50, 150, -51, 151],
    [-100, -50, -101, -51],
    [-150, -50, -151, -50],
    [-100, -50, -101, -51],
    [-150, -50, -151, -50],
  ];

  // ---- Level 5 (index 4) — Snowcraft1Rewrite.as:70-102 ---------------------
  // The first assignment (lines 70-82) is dead code: line 83 immediately
  // replaces `[4]` with a fresh array. The mutation loop at :96-102 then
  // operates on this fresh array (the live reference at that moment).
  // Faithful port: skip the dead block entirely.
  t[4] = [
    [-20, -60, 180, 40],
    [-130, -60, 70, 40],
    [-130, 1, 70, 100],
    [-50, 100, -51, 101],
    [-50, 150, -51, 151],
    [160, -50, 160, 80],
    [-150, -50, 270, 90],
    [-100, -50, 160, 150],
    [-150, -50, 300, 140],
    [-50, 100, 400, 150],
    [-50, 150, -51, 151],
    [-50, 100, 300, 205],
  ];
  // Snowcraft1Rewrite.as:96-102
  for (let i = 0; i < t[4].length; i++) {
    t[4][i][0] = t[4][i][2] - 400;
    t[4][i][1] = t[4][i][3] - 200;
  }

  // ---- Level 6 (index 5) — Snowcraft1Rewrite.as:103-130 --------------------
  t[5] = [
    [-20, -60, 520, 40],
    [-130, -60, 460, 80],
    [-130, 1, 400, 130],
    [-50, 100, 340, 165],
    [-50, 150, 280, 200],
    [160, -50, 230, 250],
    [-150, -50, 470, 40],
    [-100, -50, 410, 80],
    [-150, -50, 340, 130],
    [-50, 100, 280, 165],
    [-50, 150, 230, 200],
    [-50, 100, 180, 250],
  ];
  // Snowcraft1Rewrite.as:116-130 — bound is `this.greendudiestartingpoints[5].length`
  for (let i = 0; i < t[5].length; i++) {
    if (i < 6) {
      t[5][i][0] = -450 - i * 8;
      t[5][i][1] = t[5][i][3];
    } else {
      t[5][i][0] = t[5][i][2];
      t[5][i][1] = -350 - i * 8;
    }
  }

  // ---- Level 7 (index 6) — Snowcraft1Rewrite.as:131-163 --------------------
  t[6] = [
    [-20, -60, 400, 80],
    [-130, -60, 435, 70],
    [-130, 1, 435, 105],
    [-50, 100, 345, 135],
    [-50, 150, 310, 175],
    [160, -50, 350, 175],
    [-150, -50, 85, 220],
    [-100, -50, 135, 220],
    [-150, -50, 180, 220],
    [-50, 100, 110, 260],
    [-50, 150, 155, 260],
    [-50, 100, 125, 290],
  ];
  // Snowcraft1Rewrite.as:144-163
  // Loop bound is `this.greendudiestartingpoints[4].length` (= 12), NOT [6]'s
  // own length. Both happen to be 12 here, so behaviour is identical.
  const level7Bound = t[4].length;
  for (let i = 0; i < level7Bound; i++) {
    if (i < 3) {
      t[6][i][0] = t[6][i][2];
      t[6][i][1] = -250;
    } else if (i < 6) {
      t[6][i][0] = t[6][i][2];
      t[6][i][1] = -350;
    } else {
      t[6][i][0] = t[6][i][2] - 400;
      t[6][i][1] = t[6][i][3] - 200;
    }
  }

  // ---- Level 8 (index 7) — Snowcraft1Rewrite.as:164-188 --------------------
  t[7] = [
    [-20, -60, 400, 80],
    [-130, -60, 435, 70],
    [-130, 1, 435, 105],
    [-50, 100, 345, 135],
    [-50, 150, 310, 175],
    [160, -50, 350, 175],
    [-150, -50, 85, 220],
    [-100, -50, 135, 220],
    [-150, -50, 180, 220],
    [-50, 100, 110, 260],
    [-50, 150, 155, 260],
    [-50, 100, 125, 290],
  ];
  // Snowcraft1Rewrite.as:177-188
  // Loop bound is again `[4].length` (= 12), matching the [7] length.
  const level8Bound = t[4].length;
  for (let i = 0; i < level8Bound; i++) {
    if (i < 6) {
      t[7][i][2] = t[7][i + 6][2] + 150;
      t[7][i][3] = t[7][i + 6][3] - 150;
    }
    t[7][i][0] = t[7][i][2] - 400;
    t[7][i][1] = t[7][i][3] - 200;
  }

  // ---- Level 9 (index 8) — Snowcraft1Rewrite.as:189-210 --------------------
  // 50 random entries pushed at construction time, then a 12-iteration
  // mutation loop that touches only the first 12 entries.
  t[8] = [];
  for (let i = 0; i < 50; i++) {
    t[8].push([-50, 100, 50 + rng() * 200, 50 + rng() * 200]);
  }
  // Snowcraft1Rewrite.as:196-210 — bound is `[4].length` (= 12)
  const level9Bound = t[4].length;
  for (let i = 0; i < level9Bound; i++) {
    if (i < 10) {
      t[8][i][0] = t[8][i][2] - 400;
      t[8][i][1] = t[8][i][3] - 200;
    } else {
      t[8][i][0] = t[8][i][2] - 400;
      t[8][i][1] = t[8][i][3];
    }
  }

  // Append the extended campaign (levels 10..14). These are NOT from the SWF;
  // see EXTRA_LEVELS. Cloned so callers can't mutate the shared template.
  for (const extra of EXTRA_LEVELS) {
    t.push(extra.map((g) => [...g] as GreenStart));
  }

  // Wrap into the typed config shape. 1-based `level` numbers for
  // cross-reference with the AS source.
  const levels: LevelConfig[] = t.map((greens, idx) => ({
    level: idx + 1,
    greens,
  }));

  return { levels };
}
