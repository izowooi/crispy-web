import { describe, expect, it } from "vitest";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

async function call(body: unknown) {
  const mod = await import("@/app/api/auth/route");
  const req = new Request("https://app.test/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const res = await mod.POST(req);
  const json = (await res.json()) as { ok: boolean; error?: string };
  return { res, json };
}

describe("/api/auth", () => {
  it("returns 200 and auth cookie when password matches nicenovel", async () => {
    const { res, json } = await call({ password: "nicenovel" });
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(res.headers.get("set-cookie")).toContain(`${AUTH_COOKIE_NAME}=1`);
  });

  it("returns 401 when password mismatches", async () => {
    const { res, json } = await call({ password: "wrong" });
    expect(res.status).toBe(401);
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/암호/);
  });

  it("returns 400 on malformed or missing password", async () => {
    expect((await call("{not-json")).res.status).toBe(400);
    expect((await call({})).res.status).toBe(400);
    expect((await call({ password: "" })).res.status).toBe(400);
  });

  it("GET returns 405", async () => {
    const mod = await import("@/app/api/auth/route");
    const res = await mod.GET();
    expect(res.status).toBe(405);
  });
});
