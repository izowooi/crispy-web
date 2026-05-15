/**
 * gennai-queue Worker — NovelAI 글로벌 큐 단일 진입점.
 * Pages 프로젝트가 service binding 또는 fetch URL 로 호출한다.
 *
 * Public routes:
 *   POST /enqueue       — { jobId, position } 반환
 *   GET  /job/<jobId>   — JobStatus 반환
 *   GET  /healthz
 */
import { NovelAiQueueDO } from "./queue-do";
import type { Env } from "./types";

export { NovelAiQueueDO };

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/healthz") return new Response("ok");

    // CORS — Pages 도메인에서 호출
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const id = env.NOVELAI_QUEUE.idFromName("global");
    const stub = env.NOVELAI_QUEUE.get(id);

    // 라우팅: /enqueue, /job/<id>
    const r = await stub.fetch(new Request(`https://do${url.pathname}`, req));
    const headers = new Headers(r.headers);
    for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
    return new Response(r.body, { status: r.status, headers });
  },
};
