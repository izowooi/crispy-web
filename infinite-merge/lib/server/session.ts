import "server-only";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { aiProvider } from "./config";
import { randomToken } from "./siwc/pkce";

export const SESSION_COOKIE = "im_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MOCK_SUB = "mock-local";
const GUEST_PREFIX = "guest:";

export function isGuest(sub: string): boolean {
  return sub.startsWith(GUEST_PREFIX);
}

/** Anonymous player on the operator's Claude credits: an account row + session, no OAuth. */
export async function createGuestSession(): Promise<string> {
  const sub = GUEST_PREFIX + randomToken(16);
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO accounts (sub, email, name, picture, client_id, selected_model, created_at, last_login_at)
       VALUES (?, NULL, '익명 연금술사', NULL, NULL, NULL, ?, ?)`,
    )
    .run(sub, now, now);
  await createSession(sub);
  return sub;
}

/** Carry a guest's collection over when they sign in with ChatGPT; the guest row stays as an orphan. */
export function mergeGuestInto(guestSub: string, sub: string): number {
  const res = getDb()
    .prepare(
      `INSERT OR IGNORE INTO discoveries (sub, element_name, discovered_at, first_discovery)
       SELECT ?, element_name, discovered_at, first_discovery FROM discoveries WHERE sub = ?`,
    )
    .run(sub, guestSub);
  getDb().prepare("DELETE FROM sessions WHERE sub = ?").run(guestSub);
  return Number(res.changes);
}

export type Account = {
  sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  client_id: string | null;
  selected_model: string | null;
};

export async function createSession(sub: string): Promise<void> {
  const id = randomToken(32);
  const now = Date.now();
  getDb()
    .prepare("INSERT INTO sessions (id, sub, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(id, sub, now, now + SESSION_TTL_MS);
  (await cookies()).set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false, // local http://127.0.0.1 only for now
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
  store.delete(SESSION_COOKIE);
}

export function findAccount(sub: string): Account | null {
  const row = getDb()
    .prepare("SELECT sub, email, name, picture, client_id, selected_model FROM accounts WHERE sub = ?")
    .get(sub) as Account | undefined;
  return row ?? null;
}

function ensureMockAccount(): Account {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO accounts (sub, email, name, picture, client_id, selected_model, created_at, last_login_at)
       VALUES (?, NULL, 'Mock 연금술사', NULL, NULL, 'mock', ?, ?)
       ON CONFLICT(sub) DO UPDATE SET last_login_at = excluded.last_login_at`,
    )
    .run(MOCK_SUB, now, now);
  return findAccount(MOCK_SUB)!;
}

/** Signed-in account for the current request, or null. In mock mode everyone is the local mock alchemist. */
export async function getCurrentAccount(): Promise<Account | null> {
  if (aiProvider() === "mock") return ensureMockAccount();
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const row = getDb().prepare("SELECT sub, expires_at FROM sessions WHERE id = ?").get(id) as
    | { sub: string; expires_at: number }
    | undefined;
  if (!row || row.expires_at < Date.now()) return null;
  return findAccount(row.sub);
}
