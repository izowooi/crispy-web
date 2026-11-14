import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { type AppEnv, type User, DAY, HttpError, randomToken, sha256Hex } from "./util";

export const SESSION_COOKIE = "__Host-zk";
const TTL = { web: 180 * DAY, device: 400 * DAY } as const;
export type SessionKind = keyof typeof TTL;

type Ctx = Context<AppEnv>;

function readToken(c: Ctx): { token: string; via: "bearer" | "cookie" } | null {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) return { token: header.slice(7).trim(), via: "bearer" };
  const cookie = getCookie(c, SESSION_COOKIE);
  return cookie ? { token: cookie, via: "cookie" } : null;
}

/**
 * 호출자의 user_id로 평가되는 SQL 서브쿼리.
 * D1 왕복은 요청당 수십 ms라서, 세션 확인과 데이터 조회를 한 batch에 태우기 위해
 * 데이터 쿼리가 user_id를 미리 몰라도 되게 한다. bind 순서: tokenHash, now.
 */
export const USER_ID_SQL = "(SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?)";

export type Auth = { user: User; tokenHash: string; now: number };

/**
 * 세션을 확인한다. `extra`는 세션 조회와 같은 batch(=D1 왕복 1회)로 실행할 문장을 만든다.
 * 인증 실패 시 extra 결과는 버려진다(USER_ID_SQL이 NULL이라 어차피 빈 결과).
 */
export async function authenticate<T = unknown>(
  c: Ctx,
  extra?: (tokenHash: string, now: number) => D1PreparedStatement[],
): Promise<Auth & { results: D1Result<T>[] }> {
  const cred = readToken(c);
  if (!cred) throw new HttpError(401, "로그인이 필요합니다");

  // 쿠키 인증은 브라우저가 자동으로 붙이므로, 상태 변경 요청은 같은 origin에서 왔는지 확인한다.
  if (cred.via === "cookie" && !["GET", "HEAD"].includes(c.req.method)) {
    if (c.req.header("Origin") !== new URL(c.req.url).origin) throw new HttpError(403, "잘못된 요청 출처입니다");
  }

  const now = Date.now();
  const tokenHash = await sha256Hex(cred.token);
  const db = c.env.DB;
  const sessionStmt = db
    .prepare(
      `SELECT s.user_id, s.kind, s.last_used_at, u.email, u.name, u.picture
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(tokenHash, now);

  const [sessionResult, ...results] = await db.batch([sessionStmt, ...(extra?.(tokenHash, now) ?? [])]);
  const row = sessionResult.results[0] as
    | { user_id: string; kind: SessionKind; last_used_at: number; email: string; name: string; picture: string }
    | undefined;
  if (!row) throw new HttpError(401, "세션이 만료되었습니다");

  if (now - row.last_used_at > DAY) {
    c.executionCtx.waitUntil(
      db
        .prepare("UPDATE sessions SET last_used_at = ?, expires_at = ? WHERE token_hash = ?")
        .bind(now, now + TTL[row.kind], tokenHash)
        .run(),
    );
  }

  return {
    user: { id: row.user_id, email: row.email, name: row.name, picture: row.picture },
    tokenHash,
    now,
    results: results as D1Result<T>[],
  };
}

export async function createSession(db: D1Database, userId: string, kind: SessionKind, label = ""): Promise<string> {
  const token = randomToken();
  const now = Date.now();
  await db
    .prepare(
      "INSERT INTO sessions (token_hash, user_id, kind, label, created_at, last_used_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(await sha256Hex(token), userId, kind, label.slice(0, 80), now, now, now + TTL[kind])
    .run();
  return token;
}

export function setSessionCookie(c: Ctx, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: TTL.web / 1000,
  });
}

export async function destroySession(c: Ctx) {
  const cred = readToken(c);
  if (cred) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(cred.token)).run();
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: true });
}
