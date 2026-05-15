import { getRequestContext } from "@cloudflare/next-on-pages";
import { handleJobStatus } from "@/lib/api/handlers";

export const runtime = "edge";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { env } = getRequestContext();
  const { id } = await ctx.params;
  return handleJobStatus(id, env as unknown as Env);
}
