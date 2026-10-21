import { playerKey, type Color, type GameSummary, type PlayerConfig, type StatRow, type Usage } from "../shared/types";

export interface Matchup {
  a: string;
  b: string;
  aWins: number;
  bWins: number;
  draws: number;
}

export interface StatGame {
  white: PlayerConfig;
  black: PlayerConfig;
  result?: string;
  usage: { w: Usage; b: Usage };
  moves: { w: number; b: number };
}

/** Engine ranking and AI head-to-head from finished, non-aborted games. */
export function aggregateStats(games: StatGame[]): { rows: StatRow[]; matchups: Matchup[] } {
  const byKey = new Map<string, StatRow>();
  const matchups = new Map<string, Matchup>();
  for (const g of games) {
    const sides: [PlayerConfig, Color, number][] = [
      [g.white, "w", g.result === "w" ? 1 : g.result === "b" ? -1 : 0],
      [g.black, "b", g.result === "b" ? 1 : g.result === "w" ? -1 : 0],
    ];
    for (const [player, color, outcome] of sides) {
      if (player.kind !== "ai") continue;
      const key = playerKey(player);
      const row = byKey.get(key) ?? {
        key,
        player,
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        costUsd: 0,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        thinkMs: 0,
        moves: 0,
        fallbacks: 0,
      };
      const u = g.usage[color];
      row.games++;
      if (outcome > 0) row.wins++;
      else if (outcome < 0) row.losses++;
      else row.draws++;
      row.costUsd += u.costUsd;
      row.calls += u.calls;
      row.inputTokens += u.inputTokens;
      row.outputTokens += u.outputTokens;
      row.thinkMs += u.thinkMs;
      row.fallbacks += u.fallbacks;
      row.moves += g.moves[color];
      byKey.set(key, row);
    }
    if (g.white.kind === "ai" && g.black.kind === "ai") {
      const [a, b] = [playerKey(g.white), playerKey(g.black)];
      const flip = a > b;
      const id = flip ? `${b}|${a}` : `${a}|${b}`;
      const m = matchups.get(id) ?? { a: flip ? b : a, b: flip ? a : b, aWins: 0, bWins: 0, draws: 0 };
      const whiteWon = g.result === "w";
      const blackWon = g.result === "b";
      if (!whiteWon && !blackWon) m.draws++;
      else if (whiteWon !== flip) m.aWins++;
      else m.bWins++;
      matchups.set(id, m);
    }
  }
  return {
    rows: [...byKey.values()].sort((x, y) => score(y) - score(x) || y.wins - x.wins || y.games - x.games),
    matchups: [...matchups.values()],
  };
}

/** Score: win = 1, draw = 1/2. */
const score = (r: StatRow) => (r.wins + r.draws / 2) / r.games;

export type { GameSummary };
