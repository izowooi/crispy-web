import { describe, it, expect, vi } from "vitest";
import { handleGenerate, handleJobStatus } from "@/lib/api/handlers";
import type { GenerateInput } from "@/lib/types";

function input(): GenerateInput {
  return {
    prompt: "1girl",
    negativePrompt: "lowres",
    width: 832,
    height: 1216,
    steps: 28,
    guidance: 5,
    sampler: "euler_ancestral",
  };
}

/** gennai-queue service binding 모의 */
function makeEnv() {
  const store = new Map<string, unknown>();
  let jobIdCounter = 0;
  const queueFetcher = {
    fetch: vi.fn(async (req: Request): Promise<Response> => {
      const url = new URL(req.url);
      if (req.method === "POST" && url.pathname === "/enqueue") {
        jobIdCounter++;
        const jobId = `job-${jobIdCounter}`;
        store.set(`job:${jobId}`, { id: jobId, status: "queued" });
        return Response.json({ jobId, position: jobIdCounter });
      }
      if (req.method === "GET" && url.pathname.startsWith("/job/")) {
        const id = url.pathname.slice("/job/".length);
        const j = store.get(`job:${id}`);
        if (!j) return Response.json({ id, status: "unknown" });
        return Response.json(j);
      }
      return new Response("nf", { status: 404 });
    }),
  };
  return { QUEUE: queueFetcher } as unknown as Env;
}

describe("handleGenerate", () => {
  it("유효한 입력이면 jobId와 position을 반환한다", async () => {
    const env = makeEnv();
    const req = new Request("https://app/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input()),
    });
    const r = await handleGenerate(req, env);
    expect(r.status).toBe(200);
    const body = (await r.json()) as { jobId: string; position: number };
    expect(body.jobId).toBeTruthy();
    expect(body.position).toBe(1);
  });

  it("input 검증 실패 시 400과 message를 반환한다", async () => {
    const env = makeEnv();
    const req = new Request("https://app/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "", width: 0 }), // 빠진 필드
    });
    const r = await handleGenerate(req, env);
    expect(r.status).toBe(400);
    const body = (await r.json()) as { error: string };
    expect(body.error).toMatch(/invalid|validation|prompt/i);
  });

  it("토큰은 응답에 노출되지 않는다", async () => {
    const env = makeEnv();
    const req = new Request("https://app/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input()),
    });
    const r = await handleGenerate(req, env);
    const txt = await r.text();
    expect(txt).not.toMatch(/pst-/);
  });

  it("env.QUEUE.fetch 로 /enqueue 경로를 호출한다", async () => {
    const env = makeEnv();
    await handleGenerate(
      new Request("https://app/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input()),
      }),
      env,
    );
    const calls = (env.QUEUE as any).fetch.mock.calls;
    expect(calls.length).toBe(1);
    const sent = calls[0][0] as Request;
    expect(new URL(sent.url).pathname).toBe("/enqueue");
    expect(sent.method).toBe("POST");
  });
});

describe("handleJobStatus", () => {
  it("존재하지 않는 id면 status:unknown을 반환한다", async () => {
    const env = makeEnv();
    const r = await handleJobStatus("nonexistent", env);
    const body = (await r.json()) as { status: string };
    expect(body.status).toBe("unknown");
  });

  it("enqueue 후 동일 id를 조회하면 상태가 반환된다", async () => {
    const env = makeEnv();
    const gen = await handleGenerate(
      new Request("https://app/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input()),
      }),
      env,
    );
    const { jobId } = (await gen.json()) as { jobId: string };
    const r = await handleJobStatus(jobId, env);
    const body = (await r.json()) as { status: string };
    expect(body.status).toBe("queued");
  });
});
