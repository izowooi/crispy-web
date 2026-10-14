import "server-only";
import type { GuestLimits } from "../config";
import { getDb, transaction } from "../db";
import { AppError } from "../errors";

const GLOBAL = "*";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Quotas reset at midnight in Korea, where the players are. */
export function kstDay(now = Date.now()): string {
  return new Date(now + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function used(day: string, scope: string): number {
  const row = getDb().prepare("SELECT count FROM guest_usage WHERE day = ? AND scope = ?").get(day, scope) as
    | { count: number }
    | undefined;
  return row?.count ?? 0;
}

export function globalBudgetLeft(limits: GuestLimits, now = Date.now()): number {
  return Math.max(0, limits.global - used(kstDay(now), GLOBAL));
}

export function guestRemaining(sub: string, limits: GuestLimits, now = Date.now()): number {
  const day = kstDay(now);
  return Math.min(Math.max(0, limits.perGuest - used(day, sub)), globalBudgetLeft(limits, now));
}

/** Reserve one model call before making it; throws when this guest or the whole guest pool is out. */
export function consumeGuestCall(sub: string, limits: GuestLimits, now = Date.now()): number {
  const db = getDb();
  const day = kstDay(now);
  return transaction(db, () => {
    if (used(day, GLOBAL) >= limits.global) throw new AppError("guest_unavailable", { detail: "global daily budget spent" });
    if (used(day, sub) >= limits.perGuest) throw new AppError("guest_limit");
    const bump = db.prepare(
      "INSERT INTO guest_usage (day, scope, count) VALUES (?, ?, 1) ON CONFLICT(day, scope) DO UPDATE SET count = count + 1",
    );
    bump.run(day, GLOBAL);
    bump.run(day, sub);
    return guestRemaining(sub, limits, now);
  });
}
