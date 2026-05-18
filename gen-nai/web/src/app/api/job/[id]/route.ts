import { getRequestContext } from "@cloudflare/next-on-pages";
import { handleJobStatus } from "@/lib/api/handlers";
import { requestHasAuth, unauthorizedResponse } from "@/lib/auth";

export const runtime = "edge";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!requestHasAuth(req)) return unauthorizedResponse();

  const { env } = getRequestContext();
  const { id } = await ctx.params;
  return handleJobStatus(id, env as unknown as Env);
}
