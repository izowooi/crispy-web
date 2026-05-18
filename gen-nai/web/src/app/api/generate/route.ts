import { getRequestContext } from "@cloudflare/next-on-pages";
import { handleGenerate } from "@/lib/api/handlers";
import { requestHasAuth, unauthorizedResponse } from "@/lib/auth";

export const runtime = "edge";

export async function POST(req: Request) {
  if (!requestHasAuth(req)) return unauthorizedResponse();

  const { env } = getRequestContext();
  return handleGenerate(req, env as unknown as Env);
}
