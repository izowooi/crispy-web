import { asciiGrid, gridFrom, nearbyLegalPoints, turnOf, type DoubleThreeRule, type Grid, type Stone } from "../../shared/omok";

export interface Candidate {
  point: string;
  note: string;
}

export function sideName(c: Stone): string {
  return c === "b" ? "Black (X)" : "White (O)";
}

/** Legal points near the stones with a purely descriptive note; no evaluation is added so engines are compared on their own. */
export function candidates(grid: Grid, c: Stone, rule: DoubleThreeRule): Candidate[] {
  return nearbyLegalPoints(grid, c, rule).map((point) => ({ point, note: `place ${c === "b" ? "black" : "white"} stone on ${point}` }));
}

export function historyText(points: string[], maxPlies = 120): string {
  const start = Math.max(0, points.length - maxPlies);
  const out: string[] = [];
  for (let i = start; i < points.length; i++) out.push(`${i + 1}.${i % 2 === 0 ? "X" : "O"} ${points[i]}`);
  return out.length ? out.join(" ") : "(no moves yet)";
}

export function positionBrief(points: string[]): string {
  const me = turnOf(points.length);
  return [
    `You are playing ${sideName(me)}. It is ${sideName(me)} to move.`,
    `Board (15x15, columns A-O left to right, rows 1-15 bottom to top; X = Black, O = White, . = empty):`,
    asciiGrid(gridFrom(points)),
    `Moves so far: ${historyText(points)}`,
  ].join("\n");
}

const DOUBLE_THREE_RULE: Record<DoubleThreeRule, string> = {
  black: "a move that creates two open threes at once is forbidden for Black only (unless it makes five)",
  both: "a move that creates two open threes at once is forbidden for both sides (unless it makes five)",
  none: "there are no forbidden moves",
};

export function moveInstructions(rule: DoubleThreeRule): string {
  return `Gomoku (omok) on a 15x15 board: Black moves first, five or more stones in an unbroken row (horizontal, vertical or diagonal) wins, and ${DOUBLE_THREE_RULE[rule]}. Pick the strongest legal point for the side to move: complete five when you can, stop the opponent from making five, and build your own threats.`;
}
