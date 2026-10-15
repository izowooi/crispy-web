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

type Usage = { count: number; refilled_at: number | null };

async function usedMany(day: string, scopes: string[]): Promise<Map<string, Usage>> {
  const placeholders = scopes.map(() => "?").join(", ");
  const { results } = await getDb()
    .prepare(`SELECT scope, count, refilled_at FROM im_guest_usage WHERE day = ? AND scope IN (${placeholders})`)
    .bind(day, ...scopes)
    .all<{ scope: string } & Usage>();
  return new Map(results.map((r) => [r.scope, r]));
}

type Refill = { intervalMs: number; amount: number };

function guestRefill(limits: GuestLimits): Refill | null {
  const minutes = limits.refillMinutes ?? 0;
  const amount = limits.refillAmount ?? 0;
  return minutes > 0 && amount > 0 ? { intervalMs: minutes * 60_000, amount } : null;
}

/** Spent calls after the refills earned since refilled_at; NULL refilled_at (older rows) earns nothing. */
function spentAfterRefill(row: Usage | undefined, refill: Refill | null, now: number): number {
  if (!row) return 0;
  if (!refill || row.refilled_at === null) return row.count;
  const earned = Math.floor(Math.max(0, now - row.refilled_at) / refill.intervalMs) * refill.amount;
  return Math.max(0, row.count - earned);
}

export async function globalBudgetLeft(limits: GuestLimits, now = Date.now()): Promise<number> {
  const used = await usedMany(kstDay(now), [GLOBAL]);
  return Math.max(0, limits.global - (used.get(GLOBAL)?.count ?? 0));
}

export async function guestRemaining(sub: string, limits: GuestLimits, now = Date.now()): Promise<number> {
  const used = await usedMany(kstDay(now), [GLOBAL, sub]);
  const mine = limits.perGuest - spentAfterRefill(used.get(sub), guestRefill(limits), now);
  return Math.max(0, Math.min(mine, limits.global - (used.get(GLOBAL)?.count ?? 0)));
}

type Bucket = { scope: string; limit: number; refill?: Refill | null; error: () => AppError };

/**
 * Take one unit from every bucket or from none.
 * Each bucket is one conditional upsert (`… DO UPDATE … WHERE count < limit RETURNING count`): no row back
 * means that bucket was full. D1 has no BEGIN/ROLLBACK, so units taken from the other buckets in the same
 * batch are handed back with a compensating decrement.
 *
 * A refilling bucket is a lazy token bucket: the same upsert first subtracts the refills earned since
 * refilled_at, so there is no timer and no extra write. refilled_at moves forward by whole intervals only,
 * keeping partial progress toward the next refill, and restarts at now once the bucket is back to empty.
 */
async function take(day: string, buckets: Bucket[], now: number): Promise<Map<string, number>> {
  const empty = buckets.find((b) => b.limit <= 0);
  if (empty) throw empty.error();
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO im_guest_usage (day, scope, count) VALUES (?, ?, 1)
     ON CONFLICT(day, scope) DO UPDATE SET count = count + 1 WHERE count < ?
     RETURNING count`,
  );
  // Plain ? placeholders, bound in order (node:sqlite rejects ?NNN). CAST keeps the division whole even if a
  // number binds as REAL. SET expressions all read the row as it was before the update.
  const intervals = "CAST((? - coalesce(refilled_at, ?)) / ? AS INTEGER)"; // now, now, interval ms
  const refillUpsert = db.prepare(
    `INSERT INTO im_guest_usage (day, scope, count, refilled_at) VALUES (?, ?, 1, ?)
     ON CONFLICT(day, scope) DO UPDATE SET
       count = max(0, count - ${intervals} * ?) + 1,
       refilled_at = CASE WHEN count - ${intervals} * ? <= 0 THEN ? ELSE coalesce(refilled_at, ?) + ${intervals} * ? END
     WHERE max(0, count - ${intervals} * ?) < ?
     RETURNING count`,
  );
  const bindRefill = (b: Bucket, r: Refill) => {
    const n = [now, now, r.intervalMs];
    return refillUpsert.bind(day, b.scope, now, ...n, r.amount, ...n, r.amount, now, now, ...n, r.intervalMs, ...n, r.amount, b.limit);
  };
  const results = await db.batch<{ count: number }>(
    buckets.map((b) =>
      b.refill ? bindRefill(b, b.refill) : upsert.bind(day, b.scope, b.limit),
    ),
  );
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
  const refill = guestRefill(limits);
  const buckets: Bucket[] = [
    { scope: GLOBAL, limit: limits.global, error: () => new AppError("guest_unavailable", { detail: "global daily budget spent" }) },
    { scope: sub, limit: limits.perGuest, refill, error: () => new AppError("guest_limit", refill ? { message: refillMessage(refill) } : undefined) },
  ];
  if (ipKey) {
    buckets.push({
      scope: ipScope(ipKey),
      limit: limits.perIp,
      error: () =>
        new AppError("guest_limit", { message: "이 네트워크에서 오늘 쓸 수 있는 게스트 연성 횟수를 모두 썼어요.", detail: "ip daily limit" }),
    });
  }
  const counts = await take(kstDay(now), buckets, now);
  return Math.max(0, Math.min(limits.perGuest - counts.get(sub)!, limits.global - counts.get(GLOBAL)!));
}

/** One new guest session from this IP today; stops cookie-clearing from minting unlimited fresh guests. */
export async function consumeGuestJoin(ipKey: string, limits: GuestLimits, now = Date.now()): Promise<void> {
  await take(
    kstDay(now),
    [
    {
      scope: joinScope(ipKey),
      limit: limits.joinsPerIp,
      error: () =>
        new AppError("guest_limit", { message: "이 네트워크에서 오늘 새 게스트를 너무 많이 만들었어요. 내일 다시 와 주세요.", detail: "join daily limit" }),
    },
    ],
    now,
  );
}

function refillMessage(refill: Refill): string {
  return `게스트 연성 횟수를 모두 썼어요. ${refill.intervalMs / 60_000}분마다 ${refill.amount}회씩 다시 충전돼요.`;
}

/** What the UI shows: "every N minutes, +M calls", or null when refill is off. */
export function guestRefillView(limits: GuestLimits): { minutes: number; amount: number } | null {
  const refill = guestRefill(limits);
  return refill ? { minutes: refill.intervalMs / 60_000, amount: refill.amount } : null;
}
