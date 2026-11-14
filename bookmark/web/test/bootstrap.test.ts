import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../worker/index";
import { ORIGIN } from "./helpers";

const KEY = "test-bootstrap-key";

async function call(overrides: Record<string, string>, path: string, init?: RequestInit) {
  const ctx = createExecutionContext();
  const res = await worker.fetch(new Request(`${ORIGIN}${path}`, init), { ...env, ...overrides }, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

const form = (key: string, origin = ORIGIN): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded", Origin: origin },
  body: new URLSearchParams({ key, next: "/" }).toString(),
});

describe("bootstrap key login", () => {
  const bootstrapEnv = { GOOGLE_CLIENT_ID: "", BOOTSTRAP_KEY: KEY };

  it("is closed once a Google client id is configured", async () => {
    const res = await call({ BOOTSTRAP_KEY: KEY }, "/auth/bootstrap", form(KEY));
    expect(res.status).toBe(404);
  });

  it("shows the key form on /auth/login only in bootstrap mode", async () => {
    const res = await call(bootstrapEnv, "/auth/login");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('action="/auth/bootstrap"');
  });

  it("rejects a wrong key and a cross-origin post", async () => {
    expect((await call(bootstrapEnv, "/auth/bootstrap", form("nope"))).status).toBe(401);
    expect((await call(bootstrapEnv, "/auth/bootstrap", form(KEY, "https://evil.example"))).status).toBe(403);
  });

  it("signs in with the key, and the first Google identity then takes over that account", async () => {
    const res = await call(bootstrapEnv, "/auth/bootstrap", form(KEY));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!.split(";")[0];
    expect(cookie).toMatch(/^__Host-zk=/);

    const saved = await call(bootstrapEnv, "/api/bookmarks", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/kept" }),
    });
    expect(saved.status).toBe(201);

    // dev-login은 Google 로그인과 같은 upsert 경로를 탄다.
    const claimed = await call({}, "/auth/dev-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "real@example.com" }),
    });
    expect(claimed.status).toBe(200);

    const users = await env.DB.prepare("SELECT google_sub, email FROM users").all();
    expect(users.results).toEqual([{ google_sub: "dev:real@example.com", email: "real@example.com" }]);

    // 기존 세션(쿠키)과 북마크가 그대로 이어진다.
    const list = await call({}, "/api/bookmarks", { headers: { Cookie: cookie } });
    const body = await list.json<{ items: { url: string }[] }>();
    expect(body.items.map((b) => b.url)).toEqual(["https://example.com/kept"]);
  });
});
