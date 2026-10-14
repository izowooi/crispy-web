import "server-only";
import { cookies, headers } from "next/headers";
import { getDb } from "./db";
import { aiProvider } from "./config";
import { kstDay } from "./guest/quota";
import { isLoopbackHost } from "./http";
import { randomToken } from "./siwc/pkce";

export const SESSION_COOKIE = "im_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const USAGE_KEEP_DAYS = 7;
export const MOCK_SUB = "mock-local";
const GUEST_PREFIX = "guest:";

export function isGuest(sub: string): boolean {
  return sub.startsWith(GUEST_PREFIX);
}

/**
 * Anonymous player on the operator's Claude credits: an account row + session, no OAuth.
 * Also the natural moment to sweep expired sessions and old usage rows, so the tables stay small
 * without a cron job.
 */
export async function createGuestSession(): Promise<string> {
  const sub = GUEST_PREFIX + randomToken(16);
  const id = randomToken(32);
  const now = Date.now();
  const oldestDay = kstDay(now - USAGE_KEEP_DAYS * 86_400_000);
  const db = getDb();
  await db.batch([
    db
      .prepare(
        `INSERT INTO im_accounts (sub, email, name, picture, client_id, selected_model, created_at, last_login_at)
         VALUES (?, NULL, '익명 연금술사', NULL, NULL, NULL, ?, ?)`,
      )
      .bind(sub, now, now),
    db.prepare("INSERT INTO im_sessions (id, sub, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(id, sub, now, now + SESSION_TTL_MS),
    db.prepare("DELETE FROM im_sessions WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM im_guest_usage WHERE day < ?").bind(oldestDay),
  ]);
  await setSessionCookie(id);
  return sub;
}

/** Carry a guest's collection over when they sign in with ChatGPT; the guest row stays as an orphan. */
export async function mergeGuestInto(guestSub: string, sub: string): Promise<number> {
  const db = getDb();
  const [moved] = await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO im_discoveries (sub, element_name, discovered_at, first_discovery)
         SELECT ?, element_name, discovered_at, first_discovery FROM im_discoveries WHERE sub = ?`,
      )
      .bind(sub, guestSub),
    db.prepare("DELETE FROM im_sessions WHERE sub = ?").bind(guestSub),
  ]);
  return moved.meta.changes;
}

export type Account = {
  sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  client_id: string | null;
  selected_model: string | null;
};

async function setSessionCookie(id: string): Promise<void> {
  const host = (await headers()).get("host") ?? "";
  (await cookies()).set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // http://127.0.0.1 runs can't carry a Secure cookie; the hosted site is HTTPS only.
    secure: !isLoopbackHost(host.replace(/:\d+$/, "")),
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function createSession(sub: string): Promise<void> {
  const id = randomToken(32);
  const now = Date.now();
  await getDb()
    .prepare("INSERT INTO im_sessions (id, sub, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(id, sub, now, now + SESSION_TTL_MS)
    .run();
  await setSessionCookie(id);
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) await getDb().prepare("DELETE FROM im_sessions WHERE id = ?").bind(id).run();
  store.delete(SESSION_COOKIE);
}

export async function findAccount(sub: string): Promise<Account | null> {
  return getDb()
    .prepare("SELECT sub, email, name, picture, client_id, selected_model FROM im_accounts WHERE sub = ?")
    .bind(sub)
    .first<Account>();
}

async function ensureMockAccount(): Promise<Account> {
  const now = Date.now();
  await getDb()
    .prepare(
      `INSERT INTO im_accounts (sub, email, name, picture, client_id, selected_model, created_at, last_login_at)
       VALUES (?, NULL, 'Mock 연금술사', NULL, NULL, 'mock', ?, ?)
       ON CONFLICT(sub) DO UPDATE SET last_login_at = excluded.last_login_at`,
    )
    .bind(MOCK_SUB, now, now)
    .run();
  return (await findAccount(MOCK_SUB))!;
}

/** Signed-in account for the current request, or null. In mock mode everyone is the local mock alchemist. */
export async function getCurrentAccount(): Promise<Account | null> {
  if (aiProvider() === "mock") return ensureMockAccount();
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  // One round trip: the session lookup and the account row come back together.
  return getDb()
    .prepare(
      `SELECT a.sub, a.email, a.name, a.picture, a.client_id, a.selected_model
         FROM im_sessions s JOIN im_accounts a ON a.sub = s.sub
        WHERE s.id = ? AND s.expires_at >= ?`,
    )
    .bind(id, Date.now())
    .first<Account>();
}
