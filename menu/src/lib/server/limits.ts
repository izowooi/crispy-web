import type { AppEnv } from "./env";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 공개 URL에서 사용자의 Claude 크레딧과 DB가 남용되지 않도록 하루 단위 상한을 둔다. */
export const LIMITS = {
  analyzePerDaycare: 10,
  analyzeGlobal: 60,
  createPerIp: 5,
  unlockFailPerIp: 20,
} as const;

export async function countRecent(env: AppEnv, kind: string, scope: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM usage_events WHERE kind = ? AND scope = ? AND created_at > ?",
  )
    .bind(kind, scope, Date.now() - DAY_MS)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function recordEvent(env: AppEnv, kind: string, scope: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("INSERT INTO usage_events (kind, scope, created_at) VALUES (?, ?, ?)").bind(kind, scope, Date.now()),
    env.DB.prepare("DELETE FROM usage_events WHERE created_at < ?").bind(Date.now() - 7 * DAY_MS),
  ]);
}

export function clientIp(headers: Headers): string {
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
