import { SELF, env } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";
import { ORIGIN, signIn } from "./helpers";
import { sha256Hex } from "../worker/util";

const OWNER = "owner@example.com";

describe("dev-login and sessions", () => {
  it("sets a hardened __Host-zk session cookie", async () => {
    const res = await SELF.fetch(`${ORIGIN}/auth/dev-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: OWNER }),
    });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^__Host-zk=[A-Za-z0-9_-]{20,};/);
    expect(cookie).toMatch(/;\s*HttpOnly/i);
    expect(cookie).toMatch(/;\s*Secure/i);
    expect(cookie).toMatch(/;\s*SameSite=Lax/i);
    expect(cookie).toMatch(/;\s*Path=\//i);
    expect(cookie).not.toMatch(/Domain=/i);
    expect((await res.json<{ user: { email: string } }>()).user.email).toBe(OWNER);
  });

  it("stores only a hash of the session token", async () => {
    const { cookie } = await signIn(OWNER);
    const token = cookie.split("=")[1];
    const row = await env.DB.prepare("SELECT token_hash, kind FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).first<{ token_hash: string; kind: string }>();
    expect(row?.kind).toBe("web");
    const raw = await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE token_hash = ?").bind(token).first<{ n: number }>();
    expect(raw?.n).toBe(0);
  });

  it("returns the signed-in user from /api/me", async () => {
    const { request } = await signIn(OWNER);
    const res = await request("/api/me");
    expect(res.status).toBe(200);
    const { user } = await res.json<{ user: { id: string; email: string; name: string; picture: string } }>();
    expect(user).toMatchObject({ email: OWNER, name: "owner", picture: "" });
    expect(user.id).toBeTruthy();
  });

  it("signs the same user in again with a new session", async () => {
    const first = await signIn(OWNER);
    const second = await signIn(OWNER);
    expect(second.cookie).not.toBe(first.cookie);
    const a = await (await first.request("/api/me")).json<{ user: { id: string } }>();
    const b = await (await second.request("/api/me")).json<{ user: { id: string } }>();
    expect(a.user.id).toBe(b.user.id);
  });

  it("invalidates the session on logout", async () => {
    const { request, cookie } = await signIn(OWNER);
    const out = await request("/auth/logout", { method: "POST" });
    expect(out.status).toBe(204);
    expect(out.headers.get("set-cookie")).toMatch(/__Host-zk=;/);
    expect((await request("/api/me")).status).toBe(401);
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE token_hash = ?")
      .bind(await sha256Hex(cookie.split("=")[1]))
      .first<{ n: number }>();
    expect(row?.n).toBe(0);
  });

  it("logout of one session leaves other sessions valid", async () => {
    const a = await signIn(OWNER);
    const b = await signIn(OWNER);
    await a.request("/auth/logout", { method: "POST" });
    expect((await b.request("/api/me")).status).toBe(200);
  });

  it("rejects an expired session", async () => {
    const { request, cookie } = await signIn(OWNER);
    expect((await request("/api/me")).status).toBe(200);
    await env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ?")
      .bind(Date.now() - 1000, await sha256Hex(cookie.split("=")[1]))
      .run();
    expect((await request("/api/me")).status).toBe(401);
  });

  it("rejects a bogus cookie and a bogus bearer token", async () => {
    expect((await SELF.fetch(`${ORIGIN}/api/me`, { headers: { Cookie: "__Host-zk=bogus" } })).status).toBe(401);
    expect((await SELF.fetch(`${ORIGIN}/api/me`, { headers: { Authorization: "Bearer bogus" } })).status).toBe(401);
  });

  it("extends a session that has not been used for over a day", async () => {
    const { request, cookie } = await signIn(OWNER);
    const hash = await sha256Hex(cookie.split("=")[1]);
    const stale = Date.now() - 2 * 86_400_000;
    await env.DB.prepare("UPDATE sessions SET last_used_at = ? WHERE token_hash = ?").bind(stale, hash).run();
    expect((await request("/api/me")).status).toBe(200);
    await vi.waitFor(async () => {
      const row = await env.DB.prepare("SELECT last_used_at FROM sessions WHERE token_hash = ?").bind(hash).first<{ last_used_at: number }>();
      expect(row!.last_used_at).toBeGreaterThan(stale + 86_400_000);
    });
  });

  it("returns a JSON 404 for unknown /auth routes", async () => {
    const res = await SELF.fetch(`${ORIGIN}/auth/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toHaveProperty("error");
  });
});

describe("GET /auth/login", () => {
  async function login(query = "") {
    const res = await SELF.fetch(`${ORIGIN}/auth/login${query}`, { redirect: "manual" });
    const cookie = res.headers.get("set-cookie") ?? "";
    const value = decodeURIComponent(cookie.split(";")[0].split("=").slice(1).join("="));
    return { res, cookie, value, location: res.headers.get("location") ? new URL(res.headers.get("location")!) : null };
  }

  it("redirects to Google with an implicit form_post id_token request", async () => {
    const { res, location } = await login();
    expect(res.status).toBe(302);
    expect(location!.origin).toBe("https://accounts.google.com");
    const p = location!.searchParams;
    expect(p.get("response_type")).toBe("id_token");
    expect(p.get("response_mode")).toBe("form_post");
    expect(p.get("client_id")).toBe("test-client-id");
    expect(p.get("scope")).toBe("openid email profile");
    const redirect = new URL(p.get("redirect_uri")!);
    expect(redirect.origin).toBe(ORIGIN);
    expect(redirect.pathname).toBe("/auth/callback");
    expect(p.get("state")).toBeTruthy();
    expect(p.get("nonce")).toBeTruthy();
  });

  it("sets a SameSite=None oauth cookie bound to the state and nonce", async () => {
    const { cookie, value, location } = await login("?next=/app");
    expect(cookie).toMatch(/^__Host-zk_oauth=/);
    expect(cookie).toMatch(/;\s*HttpOnly/i);
    expect(cookie).toMatch(/;\s*Secure/i);
    expect(cookie).toMatch(/;\s*SameSite=None/i);
    expect(cookie).toMatch(/;\s*Max-Age=600/i);
    const [state, nonce, next] = value.split(".");
    expect(state).toBe(location!.searchParams.get("state"));
    expect(nonce).toBe(location!.searchParams.get("nonce"));
    expect(decodeURIComponent(next)).toBe("/app");
  });

  it("uses a fresh state and nonce for every login", async () => {
    const a = await login();
    const b = await login();
    expect(a.location!.searchParams.get("state")).not.toBe(b.location!.searchParams.get("state"));
    expect(a.location!.searchParams.get("nonce")).not.toBe(b.location!.searchParams.get("nonce"));
  });

  it.each(["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)"])("neutralizes open-redirect next=%s", async (next) => {
    const { value } = await login(`?next=${encodeURIComponent(next)}`);
    expect(decodeURIComponent(value.split(".")[2])).toBe("/");
  });

  it("keeps a same-origin path with query as next", async () => {
    const { value } = await login(`?next=${encodeURIComponent("/auth/app/start?challenge=abc")}`);
    expect(decodeURIComponent(value.split(".")[2])).toBe("/auth/app/start?challenge=abc");
  });
});
