import { getRequestContext } from "@cloudflare/next-on-pages";
import { handleGenerate } from "@/lib/api/handlers";

export const runtime = "edge";

export async function POST(req: Request) {
  const { env } = getRequestContext();
  return handleGenerate(req, env as unknown as Env);
}
