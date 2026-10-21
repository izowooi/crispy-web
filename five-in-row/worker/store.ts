import type { GameSummary } from "../shared/types";
import type { GameState } from "./game";
import { aggregateStats, type StatGame } from "./stats";

interface GameRow {
  id: string;
  mode: GameSummary["mode"];
  double_three: GameSummary["doubleThree"];
  created_at: number;
  status: GameSummary["status"];
  result: GameSummary["result"] | null;
  reason: GameSummary["reason"] | null;
  white: string;
  black: string;
  initial_ms: number;
  increment_ms: number;
  move_count: number;
  cost_usd: number;
}

const SUMMARY_COLS =
  "id, mode, double_three, created_at, status, result, reason, white, black, initial_ms, increment_ms, move_count, cost_usd";

function toSummary(r: GameRow): GameSummary {
  return {
    id: r.id,
    mode: r.mode,
    doubleThree: r.double_three,
    createdAt: r.created_at,
    status: r.status,
    result: r.result ?? undefined,
    reason: r.reason ?? undefined,
    white: JSON.parse(r.white),
    black: JSON.parse(r.black),
    initialMs: r.initial_ms,
    incrementMs: r.increment_ms,
    moveCount: r.move_count,
    costUsd: r.cost_usd,
  };
}

export async function saveGame(db: D1Database, st: GameState, now = Date.now()) {
  const s = st.snap;
  const moves = { w: s.moves.filter((m) => m.color === "w").length, b: s.moves.filter((m) => m.color === "b").length };
  await db
    .prepare(
      `INSERT INTO games (id, mode, double_three, listed, created_at, updated_at, status, result, reason, white, black,
         initial_ms, increment_ms, move_count, cost_usd, usage, creator_ip, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET updated_at = excluded.updated_at, status = excluded.status,
         result = excluded.result, reason = excluded.reason, white = excluded.white, black = excluded.black,
         move_count = excluded.move_count, cost_usd = excluded.cost_usd, usage = excluded.usage,
         expires_at = excluded.expires_at`,
    )
    .bind(
      s.id,
      s.mode,
      s.doubleThree,
      s.listed ? 1 : 0,
      s.createdAt,
      now,
      s.status,
      s.result ?? null,
      s.reason ?? null,
      JSON.stringify(s.white),
      JSON.stringify(s.black),
      s.initialMs,
      s.incrementMs,
      s.moves.length,
      s.usage.w.costUsd + s.usage.b.costUsd,
      JSON.stringify({ w: s.usage.w, b: s.usage.b, moves }),
      st.creatorIp,
      st.expiresAt ?? null,
    )
    .run();
}

export async function lobby(db: D1Database, now = Date.now()) {
  const [open, live, recent] = await db.batch<GameRow>([
    db
      .prepare(`SELECT ${SUMMARY_COLS} FROM games WHERE status = 'waiting' AND listed = 1 AND expires_at > ? ORDER BY created_at DESC LIMIT 30`)
      .bind(now),
    // A game whose room crashed could stay 'playing' here; hide anything idle for over 3 hours.
    db
      .prepare(`SELECT ${SUMMARY_COLS} FROM games WHERE status = 'playing' AND updated_at > ? ORDER BY created_at DESC LIMIT 20`)
      .bind(now - 3 * 3600_000),
    db.prepare(
      `SELECT ${SUMMARY_COLS} FROM games WHERE status = 'ended' AND reason NOT IN ('aborted', 'expired') ORDER BY created_at DESC LIMIT 30`,
    ),
  ]);
  return {
    open: open.results.map(toSummary),
    live: live.results.map(toSummary),
    recent: recent.results.map(toSummary),
  };
}

export async function lookup(db: D1Database, ids: string[]): Promise<GameSummary[]> {
  if (ids.length === 0) return [];
  const { results } = await db
    .prepare(`SELECT ${SUMMARY_COLS} FROM games WHERE id IN (${ids.map(() => "?").join(",")}) ORDER BY created_at DESC`)
    .bind(...ids)
    .all<GameRow>();
  return results.map(toSummary);
}

export async function stats(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT white, black, result, usage FROM games
       WHERE mode IN ('ai', 'arena') AND status = 'ended' AND reason NOT IN ('aborted', 'expired')
       ORDER BY created_at DESC LIMIT 5000`,
    )
    .all<{ white: string; black: string; result: string | null; usage: string }>();
  const games: StatGame[] = results.map((r) => {
    const u = JSON.parse(r.usage);
    return { white: JSON.parse(r.white), black: JSON.parse(r.black), result: r.result ?? undefined, usage: u, moves: u.moves };
  });
  return aggregateStats(games);
}

export async function activeAiGames(db: D1Database, ip: string, now = Date.now()): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM games WHERE creator_ip = ? AND mode != 'pvp' AND status = 'playing' AND updated_at > ?`)
    .bind(ip, now - 3 * 3600_000)
    .first<{ n: number }>();
  return row?.n ?? 0;
}
