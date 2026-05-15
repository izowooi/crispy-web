/**
 * API 라우트 핸들러 — Cloudflare 의존성과 분리하여 단위 테스트 가능.
 * 큐는 별도 Worker(gennai-queue)에 있고, Pages는 service binding(env.QUEUE)으로 접근한다.
 */
import { z } from "zod";

const inputSchema = z.object({
  prompt: z.string().min(1, "prompt is required"),
  negativePrompt: z.string().default(""),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  steps: z.number().int().min(1).max(50),
  guidance: z.number().min(0).max(20),
  seed: z.number().int().min(0).max(0xffffffff).optional(),
  sampler: z.enum([
    "euler_ancestral",
    "euler",
    "dpmpp_2s_ancestral",
    "dpmpp_2m_sde",
    "dpmpp_2m",
    "dpmpp_sde",
  ]),
  characters: z
    .array(z.object({ prompt: z.string(), negativePrompt: z.string() }))
    .optional(),
});

export async function handleGenerate(req: Request, env: Env): Promise<Response> {
  let parsed;
  try {
    const json = await req.json();
    parsed = inputSchema.safeParse(json);
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return Response.json({ error: `invalid input — ${msg}` }, { status: 400 });
  }

  const r = await env.QUEUE.fetch(
    new Request("https://gennai-queue.internal/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    }),
  );
  return new Response(await r.text(), {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleJobStatus(jobId: string, env: Env): Promise<Response> {
  const r = await env.QUEUE.fetch(
    new Request(`https://gennai-queue.internal/job/${encodeURIComponent(jobId)}`, {
      method: "GET",
    }),
  );
  return new Response(await r.text(), {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}
