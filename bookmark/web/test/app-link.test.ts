import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../worker/util";
import { ORIGIN } from "./helpers";
import { seedUser } from "./seed";

const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

type Web = Awaited<ReturnType<typeof seedUser>>;

let seq = 0;
const newUser = () => seedUser(`app${++seq}-${crypto.randomUUID().slice(0, 6)}@example.com`);

const form = (fields: Record<string, string>) => ({
  method: "POST",
  body: new URLSearchParams(fields),
  headers: { "content-type": "application/x-www-form-urlencoded" },
});

async function approve(web: Web, challenge = CHALLENGE, device = "Pixel 9") {
  const res = await web.request("/auth/app/approve", form({ challenge, device }));
  expect(res.status).toBe(303);
  const location = res.headers.get("location")!;
  expect(location.startsWith("zkeep://auth?code=")).toBe(true);
  return location.slice("zkeep://auth?code=".length);
}

const exchange = (body: unknown) =>
  SELF.fetch(`${ORIGIN}/auth/app/token`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("GET /auth/app/start", () => {
  it.each(["", "short", `${CHALLENGE}x`, "!".repeat(43)])("returns 400 for a bad challenge %j", async (challenge) => {
    const res = await SELF.fetch(`${ORIGIN}/auth/app/start?challenge=${encodeURIComponent(challenge)}`, { redirect: "manual" });
    expect(res.status).toBe(400);
  });

  it("redirects to login preserving the challenge when there is no session", async () => {
    const res = await SELF.fetch(`${ORIGIN}/auth/app/start?challenge=${CHALLENGE}&device=Pixel`, { redirect: "manual" });
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location")!, ORIGIN);
    expect(location.pathname).toBe("/auth/login");
    const next = new URL(location.searchParams.get("next")!, ORIGIN);
    expect(next.pathname).toBe("/auth/app/start");
    expect(next.searchParams.get("challenge")).toBe(CHALLENGE);
    expect(next.searchParams.get("device")).toBe("Pixel");
  });

  it("shows the consent form with the user's email when signed in", async () => {
    const web = await newUser();
    const email = (await (await web.request("/api/me")).json<{ user: { email: string } }>()).user.email;
    const res = await web.request(`/auth/app/start?challenge=${CHALLENGE}&device=Pixel%209`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain(email);
    expect(html).toContain('action="/auth/app/approve"');
    expect(html).toContain(`name="challenge" value="${CHALLENGE}"`);
    expect(html).toContain("Pixel 9");
  });

  it("escapes the device label in the consent page", async () => {
    const web = await newUser();
    const res = await web.request(`/auth/app/start?challenge=${CHALLENGE}&device=${encodeURIComponent('<script>alert(1)</script>')}`);
    const html = await res.text();
    expect(html).not.toContain("<script>alert(1)");
  });
});

describe("POST /auth/app/approve", () => {
  it("redirects 303 to zkeep://auth with a one-time code", async () => {
    const web = await newUser();
    const code = await approve(web);
    expect(code.length).toBeGreaterThanOrEqual(20);
    const row = await env.DB.prepare("SELECT challenge, label FROM auth_codes WHERE code_hash = ?").bind(await sha256Hex(code)).first<{ challenge: string; label: string }>();
    expect(row).toEqual({ challenge: CHALLENGE, label: "Pixel 9" });
  });

  it("rejects a request without Origin with 403", async () => {
    const web = await newUser();
    const res = await SELF.fetch(`${ORIGIN}/auth/app/approve`, {
      ...form({ challenge: CHALLENGE }),
      headers: { "content-type": "application/x-www-form-urlencoded", Cookie: `__Host-zk=${web.token}` },
      redirect: "manual",
    });
    expect(res.status).toBe(403);
  });

  it("rejects a request from a foreign Origin with 403", async () => {
    const web = await newUser();
    const res = await web.request("/auth/app/approve", { ...form({ challenge: CHALLENGE }), headers: { Origin: "https://evil.example", "content-type": "application/x-www-form-urlencoded" } });
    expect(res.status).toBe(403);
  });

  it("rejects an anonymous request with 401", async () => {
    const res = await SELF.fetch(`${ORIGIN}/auth/app/approve`, { ...form({ challenge: CHALLENGE }), redirect: "manual" });
    expect(res.status).toBe(401);
  });

  it("rejects a malformed challenge with 400", async () => {
    const web = await newUser();
    const res = await web.request("/auth/app/approve", form({ challenge: "short" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/app/token", () => {
  it("exchanges the code with the correct verifier for a working bearer token", async () => {
    const web = await newUser();
    const email = (await (await web.request("/api/me")).json<{ user: { email: string } }>()).user.email;
    const code = await approve(web);

    const res = await exchange({ code, verifier: VERIFIER });
    expect(res.status).toBe(200);
    const { token, user } = await res.json<{ token: string; user: { id: string; email: string } }>();
    expect(token).toBeTruthy();
    expect(user).toMatchObject({ id: web.id, email });

    const me = await SELF.fetch(`${ORIGIN}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    expect(me.status).toBe(200);
    expect((await me.json<{ user: { email: string } }>()).user.email).toBe(email);

    const saved = await SELF.fetch(`${ORIGIN}/api/bookmarks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/from-app" }),
    });
    expect(saved.status).toBe(201);

    const session = await env.DB.prepare("SELECT kind, label FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).first<{ kind: string; label: string }>();
    expect(session).toEqual({ kind: "device", label: "Pixel 9" });
  });

  it("rejects a wrong verifier and burns the code", async () => {
    const web = await newUser();
    const code = await approve(web);
    expect((await exchange({ code, verifier: `${VERIFIER}x` })).status).toBe(400);
    expect((await exchange({ code, verifier: VERIFIER })).status).toBe(400);
  });

  it("rejects reuse of a code", async () => {
    const web = await newUser();
    const code = await approve(web);
    expect((await exchange({ code, verifier: VERIFIER })).status).toBe(200);
    expect((await exchange({ code, verifier: VERIFIER })).status).toBe(400);
  });

  it("rejects an expired code", async () => {
    const web = await newUser();
    const code = await approve(web);
    await env.DB.prepare("UPDATE auth_codes SET expires_at = ? WHERE code_hash = ?").bind(Date.now() - 1000, await sha256Hex(code)).run();
    expect((await exchange({ code, verifier: VERIFIER })).status).toBe(400);
  });

  it("rejects an unknown code", async () => {
    expect((await exchange({ code: "unknown", verifier: VERIFIER })).status).toBe(400);
  });

  it("rejects a missing code or verifier and malformed JSON with 400", async () => {
    expect((await exchange({ code: "x" })).status).toBe(400);
    expect((await exchange({ verifier: VERIFIER })).status).toBe(400);
    const res = await SELF.fetch(`${ORIGIN}/auth/app/token`, { method: "POST", body: "{nope" });
    expect(res.status).toBe(400);
  });

  it("does not need an Origin header or cookie", async () => {
    const web = await newUser();
    const code = await approve(web);
    const res = await SELF.fetch(`${ORIGIN}/auth/app/token`, { method: "POST", body: JSON.stringify({ code, verifier: VERIFIER }) });
    expect(res.status).toBe(200);
  });
});

describe("bearer sessions", () => {
  it("invalidates the token on bearer logout", async () => {
    const web = await newUser();
    const code = await approve(web);
    const { token } = await (await exchange({ code, verifier: VERIFIER })).json<{ token: string }>();
    const auth = { Authorization: `Bearer ${token}` };

    const out = await SELF.fetch(`${ORIGIN}/auth/logout`, { method: "POST", headers: auth });
    expect(out.status).toBe(204);
    expect((await SELF.fetch(`${ORIGIN}/api/me`, { headers: auth })).status).toBe(401);
    expect((await web.request("/api/me")).status).toBe(200);
  });
});
