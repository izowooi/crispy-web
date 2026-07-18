import { GenerationQueueDO } from "./queue-do";
import type { Env } from "./types";

export { GenerationQueueDO };

function authorized(request: Request, env: Env): boolean {
  const expected = env.QUEUE_SERVICE_SECRET;
  return Boolean(expected && request.headers.get("x-queue-secret") === expected);
}

function queueStub(env: Env): DurableObjectStub {
  return env.GENERATION_QUEUE.get(env.GENERATION_QUEUE.idFromName("global"));
}

async function history(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const promptHash = url.searchParams.get("promptId");
  const positiveHash = url.searchParams.get("positiveHash");
  const tag = url.searchParams.get("tag")?.trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 30)));
  let query = `SELECT DISTINCT r.id, r.campaign_id AS campaignId, r.status, r.settings_json AS settingsJson,
    r.seed, r.error, r.created_at AS createdAt, r.completed_at AS completedAt,
    p.id AS promptId, p.positive, p.negative
    FROM generation_runs r JOIN prompts p ON p.id=r.prompt_id`;
  const bindings: unknown[] = [];
  if (promptHash) { query += " WHERE p.id=?"; bindings.push(promptHash); }
  else if (positiveHash) { query += " WHERE p.positive_hash=?"; bindings.push(positiveHash); }
  else if (tag) {
    query += " JOIN prompt_tags t ON t.prompt_id=p.id WHERE t.tag=?";
    bindings.push(tag);
  }
  query += " ORDER BY r.created_at DESC LIMIT ?";
  bindings.push(limit);
  const rows = await env.DB.prepare(query).bind(...bindings).all();
  return Response.json({ items: rows.results });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!authorized(request, env)) return new Response("unauthorized", { status: 401 });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname.startsWith("/image/")) {
      const key = decodeURIComponent(url.pathname.slice(7));
      const object = await env.IMAGES.get(key);
      if (!object) return new Response("not found", { status: 404 });
      return new Response(object.body, { headers: { "content-type": "image/png", "cache-control": "private, max-age=86400", etag: object.httpEtag } });
    }
    if (request.method === "GET" && url.pathname === "/history") return history(request, env);
    if (["/enqueue", "/config"].includes(url.pathname) || url.pathname.startsWith("/campaign/")) {
      return queueStub(env).fetch(request);
    }
    if (url.pathname === "/healthz") return Response.json({ ok: true });
    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
