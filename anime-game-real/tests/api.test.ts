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
    const first = await call(env(DB), { images: [image], models: ["flare"] });
    const cookie = first.headers.get("Set-Cookie")!.split(";")[0];
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

test("four images submit independent model batches and return all twelve mapped results", async () => {
  const { DB } = database();
  const original = globalThis.fetch;
  const requests: { url: string; body: any }[] = [];
  let file = 0;
  globalThis.fetch = async (input: any, init: any) => {
    const url = String(input);
    let body: any;
    if (init?.body instanceof FormData) {
      body = JSON.parse(
        (await (init.body.get("file") as Blob).text()).split("\n")[0],
      );
    } else if (init?.body) body = JSON.parse(init.body);
    requests.push({ url, body });
    if (url.endsWith("/files") && init?.method === "POST")
      return Response.json({ id: `file-${++file}` });
    if (url.endsWith("/batches") && init?.method === "POST")
      return Response.json({ id: `batch-${file}` });
    if (url.includes("batchGenerateContent"))
      return Response.json({ name: "batches/google" });
    if (url.endsWith("/batches/google"))
      return Response.json({
        done: true,
        response: {
          inlinedResponses: Array.from({ length: 4 }, (_, index) => ({
            metadata: { key: String(index) },
            response: {
              candidates: [
                {
                  content: {
                    parts: [
                      { inlineData: { mimeType: "image/png", data: "fake" } },
                    ],
                  },
                },
              ],
              usageMetadata: {
                promptTokenCount: 10,
                candidatesTokenCount: 1680,
              },
            },
          })),
        },
      });
    if (url.includes("/v1/batches/batch-"))
      return Response.json({
        status: "completed",
        output_file_id: `out-${url.split("-").pop()}`,
      });
    if (url.endsWith("/content"))
      return new Response(
        Array.from({ length: 4 }, (_, index) =>
          JSON.stringify({
            custom_id: String(index),
            response: {
              body: {
                data: [{ b64_json: "fake" }],
                usage: { input_tokens: 10, output_tokens: 100 },
              },
            },
          }),
        ).join("\n"),
      );
    if (init?.method === "DELETE") return Response.json({ deleted: true });
    throw Error("Unexpected endpoint " + url);
  };
  try {
    const response = await call(env(DB), {
      images: Array(4).fill(image),
      models: ["flare", "sunburst", "banana"],
    });
    const submitted = (await response.json()) as any;
    assert.equal(response.status, 200);
    assert.equal(submitted.results.length, 0);
    assert.ok(submitted.jobs);
    assert.equal(
      requests.filter((r) => r.url.includes("batchGenerateContent")).length,
      1,
    );
    assert.equal(
      requests.find((r) => r.url.includes("batchGenerateContent"))!.body.batch
        .input_config.requests.requests.length,
      4,
    );
    assert.equal(requests.filter((r) => r.url.endsWith("/files")).length, 2);
    for (const r of requests.filter((r) => r.url.endsWith("/files")))
      assert.equal(r.body.body.images.length, 1);
    const status = (await onRequest({
      request: new Request("https://test.local/api/status", {
        method: "POST",
        body: JSON.stringify({ token: submitted.jobs }),
      }),
      env: env(DB),
      params: { path: "status" },
    } as any)) as Response;
    const finished = (await status.json()) as any;
    assert.equal(finished.jobs, undefined);
    assert.equal(finished.results.length, 12);
    assert.equal(finished.results.filter((r: any) => r.error).length, 0);
    for (const model of ["flare", "sunburst", "banana"])
      assert.deepEqual(
        finished.results
          .filter((r: any) => r.model === model)
          .map((r: any) => r.index),
        [0, 1, 2, 3],
      );
  } finally {
    globalThis.fetch = original;
  }
});
