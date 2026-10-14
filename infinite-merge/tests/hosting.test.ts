import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BASE_ELEMENTS } from "@/lib/elements";
import { assertSameOrigin, ipKey } from "@/lib/server/guard";
import { siwcAvailable } from "@/lib/server/http";
import { createTestD1 } from "./support/d1";

describe("D1 schema (migrations/)", () => {
  it("seeds exactly the base elements from lib/elements.ts", async () => {
    // im_elements is WITHOUT ROWID (0003), so rows come back in name order: compare as sets.
    const { results } = await createTestD1().prepare("SELECT name, emoji, desc FROM im_elements ORDER BY name").all();
    const byName = (x: { name: string }, y: { name: string }) => (x.name < y.name ? -1 : 1);
    expect(results).toEqual(BASE_ELEMENTS.map((e) => ({ name: e.name, emoji: e.emoji, desc: e.desc })).sort(byName));
  });

  it("keeps the element counter in step with the table via triggers", async () => {
    const db = createTestD1();
    const count = () => db.prepare("SELECT value FROM im_counters WHERE key = 'elements'").first<number>("value");
    expect(await count()).toBe(5);
    await db.prepare("INSERT INTO im_elements (name, emoji, created_at) VALUES ('증기', '♨️', 1)").run();
    expect(await count()).toBe(6);
    await db.prepare("DELETE FROM im_elements WHERE name = '증기'").run();
    expect(await count()).toBe(5);
  });

  it("prefixes every table with im_", () => {
    const sql = fs
      .readdirSync(path.resolve(import.meta.dirname, "../migrations"))
      .map((f) => fs.readFileSync(path.resolve(import.meta.dirname, "../migrations", f), "utf8"))
      .join("\n");
    const tables = [...sql.matchAll(/CREATE TABLE (\w+)/g)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThan(0);
    expect(tables.filter((t) => !t.startsWith("im_"))).toEqual([]);
  });

  it("keeps the big tables WITHOUT ROWID so each insert bills one row written, not two", async () => {
    const { results } = await createTestD1()
      .prepare("SELECT name, sql FROM sqlite_master WHERE name IN ('im_elements', 'im_recipes', 'im_discoveries') ORDER BY name")
      .all<{ name: string; sql: string }>();
    expect(results.map((r) => r.name)).toEqual(["im_discoveries", "im_elements", "im_recipes"]);
    for (const r of results) expect(r.sql).toMatch(/WITHOUT ROWID/);
  });
});

function req(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { method: "POST", headers: { host: new URL(url).host, ...headers } });
}

describe("assertSameOrigin", () => {
  it("allows same-origin browser requests and header-less clients", () => {
    expect(() => assertSameOrigin(req("https://merge.zowoo.uk/api/combine", { origin: "https://merge.zowoo.uk", "sec-fetch-site": "same-origin" }))).not.toThrow();
    expect(() => assertSameOrigin(req("http://127.0.0.1:3000/api/combine", { origin: "http://127.0.0.1:3000" }))).not.toThrow();
    expect(() => assertSameOrigin(req("https://merge.zowoo.uk/api/combine"))).not.toThrow();
  });

  it("rejects cross-site requests", () => {
    expect(() => assertSameOrigin(req("https://merge.zowoo.uk/api/combine", { "sec-fetch-site": "cross-site" }))).toThrowError(
      expect.objectContaining({ code: "forbidden" }),
    );
    expect(() => assertSameOrigin(req("https://merge.zowoo.uk/api/combine", { origin: "https://evil.example" }))).toThrowError(
      expect.objectContaining({ code: "forbidden" }),
    );
  });
});

describe("ipKey", () => {
  it("is stable, short, and never contains the address", async () => {
    const a = await ipKey("203.0.113.7");
    expect(a).toBe(await ipKey("203.0.113.7"));
    expect(a).toMatch(/^[0-9a-f]{24}$/);
    expect(a).not.toContain("203");
    expect(a).not.toBe(await ipKey("203.0.113.8"));
  });
});

describe("siwcAvailable", () => {
  it("is on only for loopback hosts", () => {
    expect(siwcAvailable(req("http://127.0.0.1:3000/auth/chatgpt"))).toBe(true);
    expect(siwcAvailable(req("https://merge.zowoo.uk/auth/chatgpt"))).toBe(false);
  });

  it("honors the INFINITE_MERGE_SIWC=off kill switch", () => {
    process.env.INFINITE_MERGE_SIWC = "off";
    try {
      expect(siwcAvailable(req("http://127.0.0.1:3000/auth/chatgpt"))).toBe(false);
    } finally {
      delete process.env.INFINITE_MERGE_SIWC;
    }
  });
});
