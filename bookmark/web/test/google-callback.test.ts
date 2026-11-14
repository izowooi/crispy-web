import { SELF, env } from "cloudflare:test";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { setGoogleKeySetForTest } from "../worker/google";
import { ORIGIN } from "./helpers";

type Keys = { privateKey: CryptoKey; kid: string };
let good: Keys;
let other: Keys;

async function makeKeys(kid: string): Promise<{ keys: Keys; jwk: JWK }> {
  const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
  return { keys: { privateKey, kid }, jwk: { ...(await exportJWK(publicKey)), kid, alg: "RS256", use: "sig" } };
}

beforeAll(async () => {
  const a = await makeKeys("good-key");
  const b = await makeKeys("good-key");
  good = a.keys;
  other = b.keys;
  setGoogleKeySetForTest(createLocalJWKSet({ keys: [a.jwk] }));
});

type Claims = { aud?: string; iss?: string; sub?: string; email?: string; email_verified?: boolean; nonce?: string; exp?: number | string };

async function signToken(nonce: string, claims: Claims = {}, key: Keys = good) {
  const { exp = "1h", aud = "test-client-id", iss = "https://accounts.google.com", ...rest } = claims;
  return new SignJWT({ sub: "google-sub-1", email: "Owner@Example.com", email_verified: true, name: "Owner Name", picture: "https://example.com/p.png", nonce, ...rest })
    .setProtectedHeader({ alg: "RS256", kid: key.kid })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
    .setExpirationTime(exp)
    .sign(key.privateKey);
}

async function startLogin(next = "/") {
  const res = await SELF.fetch(`${ORIGIN}/auth/login?next=${encodeURIComponent(next)}`, { redirect: "manual" });
  const cookie = res.headers.get("set-cookie")!.split(";")[0];
  const [state, nonce] = decodeURIComponent(cookie.split("=").slice(1).join("=")).split(".");
  return { cookie, state, nonce };
}

async function callback(fields: Record<string, string>, cookie?: string) {
  const res = await SELF.fetch(`${ORIGIN}/auth/callback`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { Cookie: cookie } : {}) },
    body: new URLSearchParams(fields),
  });
  const setCookies = res.headers.getSetCookie();
  return { res, html: await res.text(), session: setCookies.find((c) => c.startsWith("__Host-zk=") && !c.startsWith("__Host-zk=;")), setCookies };
}

const sessionCount = async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions").first<{ n: number }>())!.n;

async function expectRejected(run: () => ReturnType<typeof callback>) {
  const before = await sessionCount();
  const { res, html, session } = await run();
  expect(res.status).toBe(200);
  expect(html).toContain("/?auth_error=");
  expect(session).toBeUndefined();
  expect(await sessionCount()).toBe(before);
}

describe("POST /auth/callback", () => {
  it("shares module state with the worker (local key set is in effect)", async () => {
    const { cookie, state, nonce } = await startLogin();
    const { session } = await callback({ state, id_token: await signToken(nonce) }, cookie);
    expect(session).toBeDefined();
  });

  it("creates a session and redirects to next on success", async () => {
    const { cookie, state, nonce } = await startLogin("/app?x=1");
    const { res, html, session, setCookies } = await callback({ state, id_token: await signToken(nonce) }, cookie);
    expect(res.status).toBe(200);
    expect(html).toContain('url=/app?x=1"');
    expect(html).not.toContain("auth_error");
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    expect(setCookies.some((c) => c.startsWith("__Host-zk_oauth=;"))).toBe(true);

    const me = await SELF.fetch(`${ORIGIN}/api/me`, { headers: { Cookie: session!.split(";")[0] } });
    expect(me.status).toBe(200);
    expect((await me.json<{ user: { email: string; name: string; picture: string } }>()).user).toEqual(
      expect.objectContaining({ email: "owner@example.com", name: "Owner Name", picture: "https://example.com/p.png" }),
    );
  });

  it("falls back to / when the stored next is unsafe", async () => {
    const { cookie, state, nonce } = await startLogin("//evil.com");
    const { html } = await callback({ state, id_token: await signToken(nonce) }, cookie);
    expect(html).toContain('url=/"');
  });

  it("accepts the bare accounts.google.com issuer", async () => {
    const { cookie, state, nonce } = await startLogin();
    const { session } = await callback({ state, id_token: await signToken(nonce, { iss: "accounts.google.com" }) }, cookie);
    expect(session).toBeDefined();
  });

  it("rejects a wrong state", async () => {
    const { cookie, nonce } = await startLogin();
    await expectRejected(async () => callback({ state: "wrong-state", id_token: await signToken(nonce) }, cookie));
  });

  it("rejects a missing oauth cookie", async () => {
    const { state, nonce } = await startLogin();
    await expectRejected(async () => callback({ state, id_token: await signToken(nonce) }));
  });

  it("rejects a missing id_token", async () => {
    const { cookie, state } = await startLogin();
    await expectRejected(() => callback({ state }, cookie));
  });

  it("rejects when Google reports an error", async () => {
    const { cookie, state } = await startLogin();
    await expectRejected(() => callback({ state, error: "access_denied" }, cookie));
  });

  it("rejects a wrong audience", async () => {
    const { cookie, state, nonce } = await startLogin();
    await expectRejected(async () => callback({ state, id_token: await signToken(nonce, { aud: "someone-else" }) }, cookie));
  });

  it("rejects a wrong issuer", async () => {
    const { cookie, state, nonce } = await startLogin();
    await expectRejected(async () => callback({ state, id_token: await signToken(nonce, { iss: "https://evil.example" }) }, cookie));
  });

  it("rejects a wrong nonce", async () => {
    const { cookie, state } = await startLogin();
    await expectRejected(async () => callback({ state, id_token: await signToken("another-nonce") }, cookie));
  });

  it("rejects an unverified email", async () => {
    const { cookie, state, nonce } = await startLogin();
    await expectRejected(async () => callback({ state, id_token: await signToken(nonce, { email_verified: false }) }, cookie));
  });

  it("rejects an expired token", async () => {
    const { cookie, state, nonce } = await startLogin();
    await expectRejected(async () => callback({ state, id_token: await signToken(nonce, { exp: Math.floor(Date.now() / 1000) - 60 }) }, cookie));
  });

  it("rejects a token signed by a different key", async () => {
    const { cookie, state, nonce } = await startLogin();
    await expectRejected(async () => callback({ state, id_token: await signToken(nonce, {}, other) }, cookie));
  });

  it("rejects an unsigned (alg=none) token", async () => {
    const { cookie, state, nonce } = await startLogin();
    const b64 = (o: object) => btoa(JSON.stringify(o)).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
    const forged = `${b64({ alg: "none" })}.${b64({ iss: "https://accounts.google.com", aud: "test-client-id", sub: "x", email: "owner@example.com", email_verified: true, nonce, exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
    await expectRejected(() => callback({ state, id_token: forged }, cookie));
  });

  it("rejects replay of the oauth cookie after it was used", async () => {
    const { cookie, state, nonce } = await startLogin();
    const token = await signToken(nonce);
    expect((await callback({ state, id_token: token }, cookie)).session).toBeDefined();
    const replay = await callback({ state, id_token: token });
    expect(replay.html).toContain("/?auth_error=");
    expect(replay.session).toBeUndefined();
  });

  it("does not create a user when the token is rejected", async () => {
    const { cookie, state } = await startLogin();
    await callback({ state, id_token: await signToken("bad-nonce", { sub: "never-created", email: "never@example.com" }) }, cookie);
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE google_sub = 'never-created'").first<{ n: number }>();
    expect(row?.n).toBe(0);
  });

  it("rejects a new Google account once the first user exists (first-user mode)", async () => {
    const { cookie, state, nonce } = await startLogin();
    await expectRejected(async () =>
      callback({ state, id_token: await signToken(nonce, { sub: "google-sub-2", email: "intruder@example.com" }) }, cookie),
    );
  });
});
