import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("/api/auth — POST", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function call(body: unknown, init?: RequestInit) {
    const mod = await import("@/app/api/auth/route");
    const req = new Request("http://localhost/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
      ...init,
    });
    const res = await mod.POST(req);
    const json = (await res.json()) as { ok: boolean; error?: string };
    return { status: res.status, json };
  }

  it("returns 200 + { ok: true } when password matches", async () => {
    vi.stubEnv("ACCESS_PASSWORD", "letmein");
    const { status, json } = await call({ password: "letmein" });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("returns 401 when password mismatches", async () => {
    vi.stubEnv("ACCESS_PASSWORD", "letmein");
    const { status, json } = await call({ password: "wrong" });
    expect(status).toBe(401);
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/암호/);
  });

  it("returns 500 when ACCESS_PASSWORD is not configured", async () => {
    vi.stubEnv("ACCESS_PASSWORD", "");
    const { status, json } = await call({ password: "anything" });
    expect(status).toBe(500);
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/서버 설정/);
  });

  it("returns 400 on malformed JSON", async () => {
    vi.stubEnv("ACCESS_PASSWORD", "letmein");
    const { status, json } = await call("{not-json");
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
  });

  it("returns 400 when password is missing", async () => {
    vi.stubEnv("ACCESS_PASSWORD", "letmein");
    const { status, json } = await call({});
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
  });

  it("returns 400 when password is not a string", async () => {
    vi.stubEnv("ACCESS_PASSWORD", "letmein");
    const { status, json } = await call({ password: 1234 });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
  });

  it("returns 400 when password is empty string", async () => {
    vi.stubEnv("ACCESS_PASSWORD", "letmein");
    const { status, json } = await call({ password: "" });
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
  });

  it("GET returns 405", async () => {
    const mod = await import("@/app/api/auth/route");
    const res = await mod.GET();
    expect(res.status).toBe(405);
  });
});
