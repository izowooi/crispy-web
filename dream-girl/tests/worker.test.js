import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

function fakeDb() {
  const calls = [];
  const stmt = (sql) => ({
    bind: (...args) => ({
      sql,
      args,
      run: async () => (calls.push({ sql, args }), {}),
      first: async () => (sql.includes("dg_shares") ? null : { cnt: 1, total: 0 }),
    }),
    all: async () => ({ results: [] }),
    first: async () => ({ cnt: 1, total: 0 }),
  });
  return {
    calls,
    prepare: stmt,
    batch: async (items) => (calls.push({ batch: items.length }), []),
  };
}

const req = (path, init) => new Request("https://dg.zowoo.uk" + path, init);
const post = (path, body) =>
  req(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("health reports d1/r2 bindings", async () => {
  const res = await worker.fetch(req("/api/health"), { DB: fakeDb(), IMAGES: {} });
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.d1, true);
  assert.equal(data.r2, true);
});

test("vote validates character ids", async () => {
  const env = { DB: fakeDb() };
  const bad = await worker.fetch(post("/api/vote", { winnerId: "zz", loserId: "f01" }), env);
  assert.equal(bad.status, 400);
  const same = await worker.fetch(post("/api/vote", { winnerId: "f01", loserId: "f01" }), env);
  assert.equal(same.status, 400);
  const ok = await worker.fetch(post("/api/vote", { winnerId: "mf01", loserId: "mm16" }), env);
  assert.equal(ok.status, 200);
  assert.equal(env.DB.calls.at(-1).batch, 2);
});

test("share create returns id; unknown share is 404", async () => {
  const env = { DB: fakeDb() };
  const created = await worker.fetch(
    post("/api/share", { winnerId: "f01", theme: "fantasy", roundSize: 16, history: [] }),
    env,
  );
  assert.equal(created.status, 201);
  assert.ok((await created.json()).id);
  const missing = await worker.fetch(req("/api/share/abcdef123456"), env);
  assert.equal(missing.status, 404);
});

test("images fall back to ASSETS when R2 misses", async () => {
  const env = {
    IMAGES: { get: async () => null },
    ASSETS: { fetch: async () => new Response("asset", { status: 200 }) },
  };
  const res = await worker.fetch(req("/images/fantasy/f01.jpg"), env);
  assert.equal(await res.text(), "asset");
});

test("unknown api route is 404", async () => {
  const res = await worker.fetch(req("/api/nope"), {});
  assert.equal(res.status, 404);
});
