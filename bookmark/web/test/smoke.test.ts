import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { ORIGIN, signIn } from "./helpers";

describe("smoke", () => {
  it("rejects anonymous API calls", async () => {
    const res = await SELF.fetch(`${ORIGIN}/api/me`);
    expect(res.status).toBe(401);
  });

  it("saves and lists a bookmark", async () => {
    const { request } = await signIn();
    const saved = await request("/api/bookmarks", { method: "POST", json: { text: "읽을 글 https://example.com/a?x=1", title: "읽을 글" } });
    expect(saved.status).toBe(201);
    const { item } = await saved.json<{ item: { url: string; title: string; note: string; domain: string } }>();
    expect(item).toMatchObject({ url: "https://example.com/a?x=1", title: "읽을 글", note: "", domain: "example.com" });

    const list = await (await request("/api/bookmarks?filter=unread")).json<{ items: unknown[]; counts: { all: number; unread: number } }>();
    expect(list.items).toHaveLength(1);
    expect(list.counts).toEqual({ all: 1, unread: 1 });
  });
});
