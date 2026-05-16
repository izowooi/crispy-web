import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/** queue-worker의 /img/<key> 로 프록시 — 같은 출처(Pages 도메인) 유지 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ key: string }> },
) {
  const { env } = getRequestContext();
  const { key } = await ctx.params;
  const r = await (env as unknown as Env).QUEUE.fetch(
    new Request(`https://q/img/${encodeURIComponent(key)}`, { method: "GET" }),
  );
  return r;
}
