/*
 * Omok rules shared by the server (authority) and the client (hints, previews).
 * 15×15 board, black moves first, five or more in a row wins. A move that makes two open
 * threes at once (double-three, 쌍삼) is forbidden unless it wins — for black only (default,
 * since black moves first), for both sides, or for nobody, as chosen when the room is opened.
 */

export const SIZE = 15;
export const COLS = "ABCDEFGHIJKLMNO";
export const CENTER = "H8";

export type Stone = "b" | "w";

/** Who may not play a double-three. */
export type DoubleThreeRule = "black" | "both" | "none";
export const DOUBLE_THREE_RULES: DoubleThreeRule[] = ["black", "both", "none"];
export const DEFAULT_DOUBLE_THREE: DoubleThreeRule = "black";

export const bansDoubleThree = (rule: DoubleThreeRule, c: Stone) => rule === "both" || (rule === "black" && c === "b");
/** Index = y * SIZE + x, where x = column (A = 0) and y = row (1 = 0, bottom). */
export type Grid = (Stone | null)[];

const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export function emptyGrid(): Grid {
  return Array(SIZE * SIZE).fill(null);
}

export function parsePoint(p: string): { x: number; y: number } | null {
  const m = /^([A-O])(1[0-5]|[1-9])$/.exec(p);
  if (!m) return null;
  return { x: COLS.indexOf(m[1]), y: Number(m[2]) - 1 };
}

export function pointName(x: number, y: number): string {
  return `${COLS[x]}${y + 1}`;
}

const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;
const at = (g: Grid, x: number, y: number) => (inside(x, y) ? g[y * SIZE + x] : undefined);

/** Replays a move list (alternating, black first) onto a fresh grid. */
export function gridFrom(points: string[]): Grid {
  const g = emptyGrid();
  points.forEach((p, i) => {
    const pt = parsePoint(p);
    if (pt) g[pt.y * SIZE + pt.x] = i % 2 === 0 ? "b" : "w";
  });
  return g;
}

export const turnOf = (moveCount: number): Stone => (moveCount % 2 === 0 ? "b" : "w");

/** Stones of `c` running through (x, y) along one direction, assuming (x, y) holds `c`. */
function run(g: Grid, x: number, y: number, dx: number, dy: number, c: Stone) {
  let lo = 0;
  let hi = 0;
  while (at(g, x - (lo + 1) * dx, y - (lo + 1) * dy) === c) lo++;
  while (at(g, x + (hi + 1) * dx, y + (hi + 1) * dy) === c) hi++;
  return { lo, hi, len: lo + hi + 1 };
}

/** The winning line through (x, y) if `c` there makes five or more. */
export function fiveLine(g: Grid, x: number, y: number, c: Stone): string[] | null {
  for (const [dx, dy] of DIRS) {
    const r = run(g, x, y, dx, dy, c);
    if (r.len >= 5) {
      const line: string[] = [];
      for (let k = -r.lo; k <= r.hi; k++) line.push(pointName(x + k * dx, y + k * dy));
      return line;
    }
  }
  return null;
}

function makesFiveIn(g: Grid, x: number, y: number, dx: number, dy: number, c: Stone) {
  return run(g, x, y, dx, dy, c).len >= 5;
}

/**
 * With `c` already on (x, y): is the line in this direction an open three, i.e. one more
 * stone can turn it into a straight four (_XXXX_) that includes (x, y)?
 */
function openThreeIn(g: Grid, x: number, y: number, dx: number, dy: number, c: Stone): boolean {
  const empties: [number, number][] = [];
  for (let k = -4; k <= 4; k++) {
    const px = x + k * dx;
    const py = y + k * dy;
    if (k !== 0 && at(g, px, py) === null) empties.push([px, py]);
  }
  // A line that can already make five is a four, not a three.
  for (const [px, py] of empties) {
    g[py * SIZE + px] = c;
    const five = makesFiveIn(g, px, py, dx, dy, c);
    g[py * SIZE + px] = null;
    if (five) return false;
  }
  for (const [px, py] of empties) {
    g[py * SIZE + px] = c;
    const r = run(g, x, y, dx, dy, c);
    const straight =
      r.len === 4 &&
      at(g, x - (r.lo + 1) * dx, y - (r.lo + 1) * dy) === null &&
      at(g, x + (r.hi + 1) * dx, y + (r.hi + 1) * dy) === null;
    g[py * SIZE + px] = null;
    if (straight) return true;
  }
  return false;
}

export type Verdict = { ok: true; five: string[] | null } | { ok: false; reason: "occupied" | "outside" | "double-three" };

/** Whether `c` may play `point` on `g` under `rule`, and the five it completes if any. Does not mutate `g`. */
export function judge(g: Grid, point: string, c: Stone, rule: DoubleThreeRule = DEFAULT_DOUBLE_THREE): Verdict {
  const pt = parsePoint(point);
  if (!pt) return { ok: false, reason: "outside" };
  const i = pt.y * SIZE + pt.x;
  if (g[i] !== null) return { ok: false, reason: "occupied" };
  g[i] = c;
  try {
    const five = fiveLine(g, pt.x, pt.y, c);
    if (five) return { ok: true, five };
    if (!bansDoubleThree(rule, c)) return { ok: true, five: null };
    let threes = 0;
    for (const [dx, dy] of DIRS) if (openThreeIn(g, pt.x, pt.y, dx, dy, c)) threes++;
    return threes >= 2 ? { ok: false, reason: "double-three" } : { ok: true, five: null };
  } finally {
    g[i] = null;
  }
}

/** Empty points `c` may not play because of the double-three rule. */
export function forbiddenPoints(g: Grid, c: Stone, rule: DoubleThreeRule = DEFAULT_DOUBLE_THREE): string[] {
  const out: string[] = [];
  if (!bansDoubleThree(rule, c)) return out;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (g[y * SIZE + x] !== null || !hasNeighbor(g, x, y, 2)) continue;
      const v = judge(g, pointName(x, y), c, rule);
      if (!v.ok && v.reason === "double-three") out.push(pointName(x, y));
    }
  }
  return out;
}

function hasNeighbor(g: Grid, x: number, y: number, radius: number) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if ((dx || dy) && at(g, x + dx, y + dy)) return true;
    }
  }
  return false;
}

/** Every legal point for `c`. */
export function legalPoints(g: Grid, c: Stone, rule: DoubleThreeRule = DEFAULT_DOUBLE_THREE): string[] {
  const out: string[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (g[y * SIZE + x] === null && judge(g, pointName(x, y), c, rule).ok) out.push(pointName(x, y));
    }
  }
  return out;
}

/**
 * Legal points within `radius` of any stone (the 5×5 centre on an empty board).
 * A fixed geometric filter — no evaluation — used to keep AI choice lists small.
 */
export function nearbyLegalPoints(g: Grid, c: Stone, rule: DoubleThreeRule = DEFAULT_DOUBLE_THREE, radius = 2): string[] {
  const empty = g.every((s) => s === null);
  const out: string[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (g[y * SIZE + x] !== null) continue;
      const near = empty ? Math.abs(x - 7) <= 2 && Math.abs(y - 7) <= 2 : hasNeighbor(g, x, y, radius);
      if (near && judge(g, pointName(x, y), c, rule).ok) out.push(pointName(x, y));
    }
  }
  return out;
}

export const isFull = (g: Grid) => g.every((s) => s !== null);

/** Text board for prompts and logs: X = black, O = white, row 15 at top. */
export function asciiGrid(g: Grid): string {
  const lines = [`    ${COLS.split("").join(" ")}`];
  for (let y = SIZE - 1; y >= 0; y--) {
    const row = [];
    for (let x = 0; x < SIZE; x++) row.push(g[y * SIZE + x] === "b" ? "X" : g[y * SIZE + x] === "w" ? "O" : ".");
    lines.push(`${String(y + 1).padStart(2)}  ${row.join(" ")}`);
  }
  return lines.join("\n");
}
