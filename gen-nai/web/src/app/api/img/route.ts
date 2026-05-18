import { getRequestContext } from "@cloudflare/next-on-pages";
import { requestHasAuth, unauthorizedResponse } from "@/lib/auth";

export const runtime = "edge";

/**
 * /api/img?key=<r2-key>  — queue-worker의 /img/<key> 로 프록시.
 * 파일 확장자(.png)를 path에 두면 Next.js가 정적 자산으로 오인하므로 쿼리스트링 사용.
 */
export async function GET(req: Request) {
  if (!requestHasAuth(req)) return unauthorizedResponse();

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) return new Response("missing key", { status: 400 });
  const { env } = getRequestContext();
  return await (env as unknown as Env).QUEUE.fetch(
    new Request(`https://q/img/${encodeURIComponent(key)}`, { method: "GET" }),
  );
}
