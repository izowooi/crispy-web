import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { ORIGIN } from "./helpers";
import { type Item, seedUser } from "./seed";

type Client = Awaited<ReturnType<typeof seedUser>>;
type ListBody = { items: Item[]; nextCursor: string | null; counts?: { all: number; unread: number } };

let seq = 0;
const uniqueEmail = () => `user${++seq}-${crypto.randomUUID().slice(0, 6)}@example.com`;
const newUser = () => seedUser(uniqueEmail());

async function save(c: Client, json: Record<string, unknown>) {
  const res = await c.request("/api/bookmarks", { method: "POST", json });
  return { res, body: await res.json<{ item: Item; duplicate: boolean }>() };
}

async function list(c: Client, query = "") {
  const res = await c.request(`/api/bookmarks${query}`);
  expect(res.status).toBe(200);
  return res.json<ListBody>();
}

describe("authentication", () => {
  it("rejects anonymous requests with 401", async () => {
    for (const [method, path] of [
      ["GET", "/api/bookmarks"],
      ["POST", "/api/bookmarks"],
      ["PATCH", "/api/bookmarks/abc"],
      ["DELETE", "/api/bookmarks/abc"],
      ["POST", "/api/bookmarks/abc/restore"],
    ]) {
      const res = await SELF.fetch(`${ORIGIN}${path}`, { method, headers: { Origin: ORIGIN } });
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });

  it("returns a JSON 404 for unknown API routes", async () => {
    const res = await SELF.fetch(`${ORIGIN}/api/nope`);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/bookmarks", () => {
  it("creates a bookmark and returns the full shape", async () => {
    const c = await newUser();
    const { res, body } = await save(c, { text: "Read me https://www.example.com/a?x=1" });
    expect(res.status).toBe(201);
    expect(body.duplicate).toBe(false);
    expect(body.item).toMatchObject({
      url: "https://www.example.com/a?x=1",
      title: "Read me",
      note: "",
      description: "",
      image: null,
      siteName: "",
      favicon: null,
      domain: "example.com",
      readAt: null,
    });
    expect(body.item.id).toBeTruthy();
    expect(body.item.createdAt).toBeGreaterThan(0);
  });

  it("saves a memo without URL with an empty domain", async () => {
    const c = await newUser();
    const { res, body } = await save(c, { text: "just a thought" });
    expect(res.status).toBe(201);
    expect(body.item).toMatchObject({ url: null, note: "just a thought", domain: "" });
  });

  it("rejects an invalid explicit url and empty input with 400", async () => {
    const c = await newUser();
    expect((await save(c, { url: "nope" })).res.status).toBe(400);
    expect((await save(c, {})).res.status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    const c = await newUser();
    const res = await c.request("/api/bookmarks", { method: "POST", body: "{not json", headers: { "content-type": "application/json" } });
    expect(res.status).toBe(400);
  });

  it("is idempotent for the same client id", async () => {
    const c = await newUser();
    const id = `client-${crypto.randomUUID()}`;
    const first = await save(c, { id, url: "https://example.com/idem" });
    const second = await save(c, { id, url: "https://example.com/idem" });
    expect(first.res.status).toBe(201);
    expect(second.res.status).toBe(200);
    expect(second.body.item).toEqual(first.body.item);
    expect(second.body.duplicate).toBe(false);
    const rows = await env.DB.prepare("SELECT COUNT(*) AS n FROM bookmarks WHERE id = ?").bind(id).first<{ n: number }>();
    expect(rows?.n).toBe(1);
  });

  it("uses a valid client id and ignores a malformed one", async () => {
    const c = await newUser();
    const good = await save(c, { id: "abcdefgh-1234", url: "https://example.com/good-id" });
    expect(good.body.item.id).toBe("abcdefgh-1234");
    const bad = await save(c, { id: "short", url: "https://example.com/bad-id" });
    expect(bad.body.item.id).not.toBe("short");
  });

  it("saving the same URL again bumps the item to the top and marks it unread", async () => {
    const c = await newUser();
    const now = Date.now();
    const a = await save(c, { url: "https://example.com/dup-a", createdAt: now - 3000 });
    await save(c, { url: "https://example.com/dup-b", createdAt: now - 2000 });
    await c.request(`/api/bookmarks/${a.body.item.id}`, { method: "PATCH", json: { read: true } });

    const again = await save(c, { url: "https://example.com/dup-a" });
    expect(again.res.status).toBe(200);
    expect(again.body.duplicate).toBe(true);
    expect(again.body.item.id).toBe(a.body.item.id);
    expect(again.body.item.readAt).toBeNull();
    expect(again.body.item.createdAt).toBeGreaterThan(now - 2000);

    const { items, counts } = await list(c);
    expect(items.map((i) => i.url)).toEqual(["https://example.com/dup-a", "https://example.com/dup-b"]);
    expect(counts).toEqual({ all: 2, unread: 2 });
  });

  it("appends a new note when re-saving a URL with different note text", async () => {
    const c = await newUser();
    await save(c, { url: "https://example.com/note-merge", note: "first" });
    const again = await save(c, { url: "https://example.com/note-merge", note: "second" });
    expect(again.body.item.note).toBe("first\nsecond");
  });

  it("honors a client createdAt in the past", async () => {
    const c = await newUser();
    const past = Date.now() - 60 * 60_000;
    const { body } = await save(c, { url: "https://example.com/past", createdAt: past });
    expect(body.item.createdAt).toBe(past);
  });

  it("ignores a client createdAt in the future", async () => {
    const c = await newUser();
    const before = Date.now();
    const { body } = await save(c, { url: "https://example.com/future", createdAt: before + 3_600_000 });
    expect(body.item.createdAt).toBeGreaterThanOrEqual(before);
    expect(body.item.createdAt).toBeLessThanOrEqual(Date.now());
  });

  it("ignores a client createdAt older than 30 days", async () => {
    const c = await newUser();
    const before = Date.now();
    const { body } = await save(c, { url: "https://example.com/ancient", createdAt: before - 31 * 86_400_000 });
    expect(body.item.createdAt).toBeGreaterThanOrEqual(before);
  });

  it("rejects cookie-authenticated writes without or with a wrong Origin", async () => {
    const c = await newUser();
    const send = (headers: Record<string, string>) =>
      SELF.fetch(`${ORIGIN}/api/bookmarks`, {
        method: "POST",
        headers: { Cookie: `__Host-zk=${c.token}`, "content-type": "application/json", ...headers },
        body: JSON.stringify({ url: "https://example.com/origin" }),
      });
    expect((await send({})).status).toBe(403);
    expect((await send({ Origin: "https://evil.example" })).status).toBe(403);
    expect((await send({ Origin: ORIGIN })).status).toBe(201);
  });

  it("allows cookie-authenticated reads without Origin", async () => {
    const c = await newUser();
    const res = await SELF.fetch(`${ORIGIN}/api/bookmarks`, { headers: { Cookie: `__Host-zk=${c.token}` } });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/bookmarks", () => {
  it("lists newest first", async () => {
    const c = await newUser();
    const now = Date.now();
    await save(c, { url: "https://example.com/old", createdAt: now - 3000 });
    await save(c, { url: "https://example.com/new", createdAt: now - 1000 });
    await save(c, { url: "https://example.com/mid", createdAt: now - 2000 });
    const { items } = await list(c);
    expect(items.map((i) => i.url)).toEqual(["https://example.com/new", "https://example.com/mid", "https://example.com/old"]);
  });

  it("filters by unread, read and all", async () => {
    const c = await newUser();
    const a = await save(c, { url: "https://example.com/f-a" });
    await save(c, { url: "https://example.com/f-b" });
    await c.request(`/api/bookmarks/${a.body.item.id}`, { method: "PATCH", json: { read: true } });

    expect((await list(c, "?filter=unread")).items.map((i) => i.url)).toEqual(["https://example.com/f-b"]);
    expect((await list(c, "?filter=read")).items.map((i) => i.url)).toEqual(["https://example.com/f-a"]);
    expect((await list(c, "?filter=all")).items).toHaveLength(2);
    expect((await list(c)).counts).toEqual({ all: 2, unread: 1 });
  });

  it("includes counts on the first page only", async () => {
    const c = await newUser();
    const now = Date.now();
    for (let i = 0; i < 3; i++) await save(c, { url: `https://example.com/c${i}`, createdAt: now - i * 1000 });
    const first = await list(c, "?limit=2");
    expect(first.counts).toEqual({ all: 3, unread: 3 });
    expect(first.nextCursor).toBeTruthy();
    const second = await list(c, `?limit=2&cursor=${encodeURIComponent(first.nextCursor!)}`);
    expect(second.counts).toBeUndefined();
  });

  it("paginates with nextCursor without duplicates or gaps", async () => {
    const c = await newUser();
    const now = Date.now();
    const urls: string[] = [];
    for (let i = 0; i < 7; i++) {
      const url = `https://example.com/p${i}`;
      urls.push(url);
      await save(c, { url, createdAt: now - i * 1000 });
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const query: string = `?limit=3${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const body = await list(c, query);
      expect(body.items.length).toBeLessThanOrEqual(3);
      seen.push(...body.items.map((i) => i.url!));
      cursor = body.nextCursor;
      pages++;
    } while (cursor && pages < 10);

    expect(pages).toBe(3);
    expect(seen).toEqual(urls);
  });

  it("paginates correctly across items that share the same createdAt", async () => {
    const c = await newUser();
    const at = Date.now() - 10_000;
    for (let i = 0; i < 5; i++) await save(c, { url: `https://example.com/tie${i}`, createdAt: at });

    const seen: string[] = [];
    let cursor: string | null = null;
    let guard = 0;
    do {
      const body: ListBody = await list(c, `?limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
      seen.push(...body.items.map((i) => i.id));
      cursor = body.nextCursor;
    } while (cursor && ++guard < 10);

    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
  });

  it("clamps a negative limit to 1 and falls back to the default for 0", async () => {
    const c = await newUser();
    await save(c, { url: "https://example.com/lim-a" });
    await save(c, { url: "https://example.com/lim-b" });
    expect((await list(c, "?limit=0")).items).toHaveLength(2);
    expect((await list(c, "?limit=-5")).items).toHaveLength(1);
    expect((await list(c, "?limit=1")).items).toHaveLength(1);
  });

  it("searches title, url and note case-insensitively", async () => {
    const c = await newUser();
    await save(c, { url: "https://example.com/s1", title: "Quantum Gravity" });
    await save(c, { url: "https://example.com/zebra-page" });
    await save(c, { url: "https://example.com/s3", note: "remember the Walrus" });

    expect((await list(c, "?q=quantum")).items.map((i) => i.url)).toEqual(["https://example.com/s1"]);
    expect((await list(c, "?q=zebra")).items.map((i) => i.url)).toEqual(["https://example.com/zebra-page"]);
    expect((await list(c, "?q=walrus")).items.map((i) => i.url)).toEqual(["https://example.com/s3"]);
    expect((await list(c, "?q=nothing-matches")).items).toEqual([]);
  });

  it("treats % and _ literally in search", async () => {
    const c = await newUser();
    await save(c, { url: "https://example.com/pct1", title: "100% sure" });
    await save(c, { url: "https://example.com/pct2", title: "100 sure" });
    await save(c, { url: "https://example.com/us1", title: "snake_case" });
    await save(c, { url: "https://example.com/us2", title: "snakeXcase" });

    expect((await list(c, `?q=${encodeURIComponent("100%")}`)).items.map((i) => i.title)).toEqual(["100% sure"]);
    expect((await list(c, `?q=${encodeURIComponent("snake_case")}`)).items.map((i) => i.title)).toEqual(["snake_case"]);
    expect((await list(c, `?q=${encodeURIComponent("%")}`)).items.map((i) => i.title)).toEqual(["100% sure"]);
    expect((await list(c, `?q=${encodeURIComponent("_")}`)).items.map((i) => i.title)).toEqual(["snake_case"]);
  });

  it("sends Cache-Control: private, no-store", async () => {
    const c = await newUser();
    const res = await c.request("/api/bookmarks");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});

describe("PATCH /api/bookmarks/:id", () => {
  it("sets and clears readAt", async () => {
    const c = await newUser();
    const { body } = await save(c, { url: "https://example.com/read" });
    const id = body.item.id;

    const read = await c.request(`/api/bookmarks/${id}`, { method: "PATCH", json: { read: true } });
    expect(read.status).toBe(200);
    const readAt = (await read.json<{ item: Item }>()).item.readAt;
    expect(readAt).toBeGreaterThan(0);

    const again = await c.request(`/api/bookmarks/${id}`, { method: "PATCH", json: { read: true } });
    expect((await again.json<{ item: Item }>()).item.readAt).toBe(readAt);

    const unread = await c.request(`/api/bookmarks/${id}`, { method: "PATCH", json: { read: false } });
    expect((await unread.json<{ item: Item }>()).item.readAt).toBeNull();
  });

  it("updates title and note with trimming", async () => {
    const c = await newUser();
    const { body } = await save(c, { url: "https://example.com/edit", title: "old", note: "old note" });
    const res = await c.request(`/api/bookmarks/${body.item.id}`, { method: "PATCH", json: { title: "  New title ", note: " new note\n" } });
    expect((await res.json<{ item: Item }>()).item).toMatchObject({ title: "New title", note: "new note" });
    const { items } = await list(c);
    expect(items[0]).toMatchObject({ title: "New title", note: "new note" });
  });

  it("returns 400 for an empty body", async () => {
    const c = await newUser();
    const { body } = await save(c, { url: "https://example.com/empty-patch" });
    expect((await c.request(`/api/bookmarks/${body.item.id}`, { method: "PATCH", json: {} })).status).toBe(400);
    expect((await c.request(`/api/bookmarks/${body.item.id}`, { method: "PATCH", json: { read: "yes" } })).status).toBe(400);
  });

  it("returns 400 for malformed JSON", async () => {
    const c = await newUser();
    const { body } = await save(c, { url: "https://example.com/bad-json-patch" });
    const res = await c.request(`/api/bookmarks/${body.item.id}`, { method: "PATCH", body: "{oops", headers: { "content-type": "application/json" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown id", async () => {
    const c = await newUser();
    expect((await c.request("/api/bookmarks/does-not-exist", { method: "PATCH", json: { read: true } })).status).toBe(404);
  });

  it("returns 404 for a soft-deleted bookmark", async () => {
    const c = await newUser();
    const { body } = await save(c, { url: "https://example.com/patch-deleted" });
    await c.request(`/api/bookmarks/${body.item.id}`, { method: "DELETE" });
    expect((await c.request(`/api/bookmarks/${body.item.id}`, { method: "PATCH", json: { read: true } })).status).toBe(404);
  });
});

describe("DELETE and restore", () => {
  it("deletes with 204 and removes the item from the list", async () => {
    const c = await newUser();
    const { body } = await save(c, { url: "https://example.com/del" });
    const res = await c.request(`/api/bookmarks/${body.item.id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
    const { items, counts } = await list(c);
    expect(items).toEqual([]);
    expect(counts).toEqual({ all: 0, unread: 0 });
  });

  it("stays 204 when deleting twice and keeps the first deleted_at", async () => {
    const c = await newUser();
    const { body } = await save(c, { url: "https://example.com/del-twice" });
    const id = body.item.id;
    expect((await c.request(`/api/bookmarks/${id}`, { method: "DELETE" })).status).toBe(204);
    const first = await env.DB.prepare("SELECT deleted_at FROM bookmarks WHERE id = ?").bind(id).first<{ deleted_at: number }>();
    expect((await c.request(`/api/bookmarks/${id}`, { method: "DELETE" })).status).toBe(204);
    const second = await env.DB.prepare("SELECT deleted_at FROM bookmarks WHERE id = ?").bind(id).first<{ deleted_at: number }>();
    expect(second?.deleted_at).toBe(first?.deleted_at);
  });

  it("returns 404 when deleting an unknown id", async () => {
    const c = await newUser();
    expect((await c.request("/api/bookmarks/does-not-exist", { method: "DELETE" })).status).toBe(404);
  });

  it("restores a deleted bookmark", async () => {
    const c = await newUser();
    const { body } = await save(c, { url: "https://example.com/restore", title: "keep me" });
    await c.request(`/api/bookmarks/${body.item.id}`, { method: "DELETE" });
    const res = await c.request(`/api/bookmarks/${body.item.id}/restore`, { method: "POST" });
    expect(res.status).toBe(200);
    expect((await res.json<{ item: Item }>()).item).toMatchObject({ id: body.item.id, title: "keep me" });
    expect((await list(c)).items.map((i) => i.id)).toEqual([body.item.id]);
  });

  it("returns 409 when restoring after the same URL was saved again", async () => {
    const c = await newUser();
    const first = await save(c, { url: "https://example.com/restore-conflict" });
    await c.request(`/api/bookmarks/${first.body.item.id}`, { method: "DELETE" });
    const second = await save(c, { url: "https://example.com/restore-conflict" });
    expect(second.res.status).toBe(201);
    expect(second.body.item.id).not.toBe(first.body.item.id);

    const res = await c.request(`/api/bookmarks/${first.body.item.id}/restore`, { method: "POST" });
    expect(res.status).toBe(409);
    expect((await list(c)).items.map((i) => i.id)).toEqual([second.body.item.id]);
  });

  it("returns 404 when restoring an unknown id", async () => {
    const c = await newUser();
    expect((await c.request("/api/bookmarks/does-not-exist/restore", { method: "POST" })).status).toBe(404);
  });
});

describe("user isolation", () => {
  it("hides, protects and refuses to restore another user's bookmark", async () => {
    const a = await newUser();
    const b = await newUser();
    const { body } = await save(a, { url: "https://example.com/private", title: "mine" });
    const id = body.item.id;

    expect((await list(b)).items).toEqual([]);
    expect((await list(b, "?q=private")).items).toEqual([]);
    expect((await b.request(`/api/bookmarks/${id}`, { method: "PATCH", json: { title: "hacked" } })).status).toBe(404);
    expect((await b.request(`/api/bookmarks/${id}`, { method: "DELETE" })).status).toBe(404);
    expect((await b.request(`/api/bookmarks/${id}/restore`, { method: "POST" })).status).toBe(404);

    const mine = await list(a);
    expect(mine.items).toHaveLength(1);
    expect(mine.items[0]).toMatchObject({ id, title: "mine" });
    const row = await env.DB.prepare("SELECT deleted_at FROM bookmarks WHERE id = ?").bind(id).first<{ deleted_at: number | null }>();
    expect(row?.deleted_at).toBeNull();
  });

  it("returns 409 when another user posts an existing bookmark id", async () => {
    const a = await newUser();
    const b = await newUser();
    const { body } = await save(a, { url: "https://example.com/id-clash" });
    const res = await b.request("/api/bookmarks", { method: "POST", json: { id: body.item.id, url: "https://example.com/other" } });
    expect(res.status).toBe(409);
    expect((await list(b)).items).toEqual([]);
  });

  it("allows different users to save the same URL", async () => {
    const a = await newUser();
    const b = await newUser();
    expect((await save(a, { url: "https://example.com/shared-url" })).res.status).toBe(201);
    expect((await save(b, { url: "https://example.com/shared-url" })).res.status).toBe(201);
  });
});
