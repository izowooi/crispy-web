/**
 * gennai-queue Worker — NovelAI 글로벌 큐 + 이미지 서버.
 *
 * Public routes:
 *   POST /enqueue            — { jobId, position }
 *   GET  /job/<jobId>        — JobStatus
 *   GET  /img/<key>          — R2에서 PNG 스트림
 *   GET  /healthz
 */
import { NovelAiQueueDO } from "./queue-do";
import type { Env } from "./types";

export { NovelAiQueueDO };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    if (url.pathname === "/healthz") return new Response("ok");

    // R2 이미지 서빙
    if (req.method === "GET" && url.pathname.startsWith("/img/")) {
      const key = decodeURIComponent(url.pathname.slice("/img/".length));
      const obj = await env.IMAGES.get(key);
      if (!obj) return new Response("not found", { status: 404, headers: CORS_HEADERS });
      return new Response(obj.body, {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
          ETag: obj.httpEtag,
        },
      });
    }

    // DO 라우팅: /enqueue, /job/<id>
    const id = env.NOVELAI_QUEUE.idFromName("global");
    const stub = env.NOVELAI_QUEUE.get(id);
    const r = await stub.fetch(new Request(`https://do${url.pathname}`, req));
    const headers = new Headers(r.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
    return new Response(r.body, { status: r.status, headers });
  },
};
