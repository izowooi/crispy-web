import { kstDay } from "./time";

/* AI games are paid for by the developer, so each visitor gets a generous daily allowance. */

export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`chess.zowoo.uk:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function usedToday(db: D1Database, ip: string, now = Date.now()): Promise<number> {
  const row = await db.prepare("SELECT games FROM ai_quota WHERE day = ? AND ip = ?").bind(kstDay(now), ip).first<{ games: number }>();
  return row?.games ?? 0;
}

/** Atomically takes one game from the counter unless it is already at `limit`. */
async function take(db: D1Database, day: string, ip: string, limit: number): Promise<boolean> {
  const row = await db
    .prepare(
      `INSERT INTO ai_quota (day, ip, games) VALUES (?, ?, 1)
       ON CONFLICT (day, ip) DO UPDATE SET games = games + 1 WHERE games < ?
       RETURNING games`,
    )
    .bind(day, ip, limit)
    .first<{ games: number }>();
  return row !== null;
}

export async function consume(
  db: D1Database,
  ip: string,
  perIp: number,
  global: number,
  now = Date.now(),
): Promise<"ok" | "ip" | "global"> {
  const day = kstDay(now);
  if (!(await take(db, day, ip, perIp))) return "ip";
  if (!(await take(db, day, "*", global))) {
    await db.prepare("UPDATE ai_quota SET games = games - 1 WHERE day = ? AND ip = ?").bind(day, ip).run();
    return "global";
  }
  return "ok";
}
