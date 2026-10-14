import "server-only";
import type { GuestLimits } from "../config";
import { getDb } from "../db";
import { AppError } from "../errors";

const GLOBAL = "*";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Quotas reset at midnight in Korea, where the players are. */
export function kstDay(now = Date.now()): string {
  return new Date(now + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export const ipScope = (ipKey: string) => `ip:${ipKey}`;
export const joinScope = (ipKey: string) => `join:${ipKey}`;

async function usedMany(day: string, scopes: string[]): Promise<Map<string, number>> {
  const placeholders = scopes.map(() => "?").join(", ");
  const { results } = await getDb()
    .prepare(`SELECT scope, count FROM im_guest_usage WHERE day = ? AND scope IN (${placeholders})`)
    .bind(day, ...scopes)
    .all<{ scope: string; count: number }>();
  return new Map(results.map((r) => [r.scope, r.count]));
}

export async function globalBudgetLeft(limits: GuestLimits, now = Date.now()): Promise<number> {
  const used = await usedMany(kstDay(now), [GLOBAL]);
  return Math.max(0, limits.global - (used.get(GLOBAL) ?? 0));
}

export async function guestRemaining(sub: string, limits: GuestLimits, now = Date.now()): Promise<number> {
  const used = await usedMany(kstDay(now), [GLOBAL, sub]);
  return Math.max(0, Math.min(limits.perGuest - (used.get(sub) ?? 0), limits.global - (used.get(GLOBAL) ?? 0)));
}

type Bucket = { scope: string; limit: number; error: () => AppError };

/**
 * Take one unit from every bucket or from none.
 * Each bucket is one conditional upsert (`… DO UPDATE … WHERE count < limit RETURNING count`): no row back
 * means that bucket was full. D1 has no BEGIN/ROLLBACK, so units taken from the other buckets in the same
 * batch are handed back with a compensating decrement.
 */
async function take(day: string, buckets: Bucket[]): Promise<Map<string, number>> {
  const empty = buckets.find((b) => b.limit <= 0);
  if (empty) throw empty.error();
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO im_guest_usage (day, scope, count) VALUES (?, ?, 1)
     ON CONFLICT(day, scope) DO UPDATE SET count = count + 1 WHERE count < ?
     RETURNING count`,
  );
  const results = await db.batch<{ count: number }>(buckets.map((b) => upsert.bind(day, b.scope, b.limit)));
  const full = buckets.filter((_, i) => results[i].results.length === 0);
  if (full.length > 0) {
    const taken = buckets.filter((_, i) => results[i].results.length > 0);
    if (taken.length > 0) {
      const giveBack = db.prepare("UPDATE im_guest_usage SET count = count - 1 WHERE day = ? AND scope = ?");
      await db.batch(taken.map((b) => giveBack.bind(day, b.scope)));
    }
    throw full[0].error();
  }
  return new Map(buckets.map((b, i) => [b.scope, results[i].results[0].count]));
}

/** Reserve one model call before making it; throws when this guest, this IP or the whole guest pool is out. */
export async function consumeGuestCall(
  sub: string,
  ipKey: string | null,
  limits: GuestLimits,
  now = Date.now(),
): Promise<number> {
  const buckets: Bucket[] = [
    { scope: GLOBAL, limit: limits.global, error: () => new AppError("guest_unavailable", { detail: "global daily budget spent" }) },
    { scope: sub, limit: limits.perGuest, error: () => new AppError("guest_limit") },
  ];
  if (ipKey) {
    buckets.push({
      scope: ipScope(ipKey),
      limit: limits.perIp,
      error: () =>
        new AppError("guest_limit", { message: "이 네트워크에서 오늘 쓸 수 있는 게스트 연성 횟수를 모두 썼어요.", detail: "ip daily limit" }),
    });
  }
  const counts = await take(kstDay(now), buckets);
  return Math.max(0, Math.min(limits.perGuest - counts.get(sub)!, limits.global - counts.get(GLOBAL)!));
}

/** One new guest session from this IP today; stops cookie-clearing from minting unlimited fresh guests. */
export async function consumeGuestJoin(ipKey: string, limits: GuestLimits, now = Date.now()): Promise<void> {
  await take(kstDay(now), [
    {
      scope: joinScope(ipKey),
      limit: limits.joinsPerIp,
      error: () =>
        new AppError("guest_limit", { message: "이 네트워크에서 오늘 새 게스트를 너무 많이 만들었어요. 내일 다시 와 주세요.", detail: "join daily limit" }),
    },
  ]);
}
