/// <reference types="@cloudflare/workers-types" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { onRequest } from "../functions/api/[[path]].ts";
const image = {
  width: 1,
  height: 1,
  src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJb0AAAAASUVORK5CYII=",
};
function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../schema.sql", import.meta.url), "utf8"));
  const DB = {
    prepare(sql: string) {
      return {
        bind(...args: any[]) {
          return {
            async run() {
              const result = sqlite.prepare(sql).run(...args);
              return { meta: { changes: Number(result.changes) } };
            },
          };
        },
      };
    },
  };
  return { sqlite, DB };
}

async function call(env: any, body: any, cookie = "") {
  return (await onRequest({
    request: new Request("https://test.local/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    }),
    env,
    params: { path: "generate" },
  } as any)) as Response;
}
function env(DB: any) {
  return {
    DB,
    SESSION_SECRET: "test-secret",
    OPENAI_API_KEY: "fake",
    GEMINI_API_KEY: "fake",
  };
}
test("rejects unapproved models, remote URLs and forged pixel dimensions before spending", async () => {
  const { DB, sqlite } = database();
  for (const body of [
    { images: [image], models: ["fake"] },
    {
      images: [{ ...image, src: "https://example.com/x.png" }],
      models: ["flare"],
    },
    { images: [{ ...image, width: 2049 }], models: ["flare"] },
    { images: [{ ...image, width: 2 }], models: ["flare"] },
    { images: Array(5).fill(image), models: ["flare"] },
  ])
    assert.equal((await call(env(DB), body)).status, 400);
  assert.equal(
    (sqlite.prepare("SELECT count(*) as n FROM ledger").get() as any).n,
    0,
  );
});
test("atomic reservations prevent concurrent requests exceeding model monthly cap", async () => {
  const { DB, sqlite } = database();
  const original = globalThis.fetch;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    await gate;
    return new Response(
      JSON.stringify({
        data: [{ b64_json: "fake" }],
        usage: { input_tokens: 10, output_tokens: 100 },
      }),
    );
  };
  try {
    const pending = Array.from({ length: 51 }, () =>
      call(env(DB), { images: [image], models: ["flare"] }),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(calls, 50);
    assert.equal(
      (sqlite.prepare("SELECT sum(flare) as total FROM ledger").get() as any)
        .total,
      50,
    );
    release();
    const responses = await Promise.all(pending);
    assert.equal(responses.filter((r) => r.status === 429).length, 1);
    assert.equal(responses.filter((r) => r.status === 200).length, 50);
  } finally {
    release();
    globalThis.fetch = original;
  }
});
test("signed browser cookie enforces the 500-request daily limit", async () => {
  const { DB, sqlite } = database();
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        data: [{ b64_json: "fake" }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    );
  try {
    const first = (await onRequest({
      request: new Request("https://test.local/api/health"),
      env: env(DB),
      params: { path: "health" },
    } as any)) as Response;
    const cookie = first.headers.get("Set-Cookie")!.split(";")[0];
    const repeat = (await onRequest({
      request: new Request("https://test.local/api/health", {
        headers: { Cookie: cookie },
      }),
      env: env(DB),
      params: { path: "health" },
    } as any)) as Response;
    assert.equal(repeat.headers.get("Set-Cookie"), null);
    assert.equal(
      (await call(env(DB), { images: [image], models: ["flare"] }, cookie))
        .status,
      200,
    );
    const row = sqlite.prepare("SELECT * FROM ledger LIMIT 1").get() as any;
    const stmt = sqlite.prepare("INSERT INTO ledger VALUES (?,?,?,?,0,0,0)");
    for (let i = 1; i < 500; i++)
      stmt.run(`request-${i}`, row.browser, row.day, row.month);
    assert.equal(
      (await call(env(DB), { images: [image], models: ["flare"] }, cookie))
        .status,
      429,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("four images use realtime requests for all twelve outputs, never batch endpoints", async () => {
  const { DB } = database(),
    original = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input: any) => {
    const url = String(input);
    requests.push(url);
    return Response.json(
      url.includes("googleapis")
        ? {
            candidates: [
              {
                content: {
                  parts: [
                    { inlineData: { mimeType: "image/png", data: "fake" } },
                  ],
                },
              },
            ],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 1680 },
          }
        : {
            data: [{ b64_json: "fake" }],
            usage: { input_tokens: 10, output_tokens: 100 },
          },
    );
  };
  try {
    const response = await call(env(DB), {
      images: Array(4).fill(image),
      models: ["flare", "sunburst", "banana"],
    });
    const data = (await response.json()) as any;
    assert.equal(response.status, 200);
    assert.equal(data.jobs, undefined);
    assert.equal(data.results.length, 12);
    assert.equal(requests.length, 12);
    assert.ok(
      requests.every(
        (url) =>
          url.endsWith("/images/edits") || url.endsWith(":generateContent"),
      ),
    );
    for (const model of ["flare", "sunburst", "banana"])
      assert.deepEqual(
        data.results
          .filter((r: any) => r.model === model)
          .map((r: any) => r.index),
        [0, 1, 2, 3],
      );
  } finally {
    globalThis.fetch = original;
  }
});
