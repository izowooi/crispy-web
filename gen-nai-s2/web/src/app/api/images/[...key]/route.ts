import { hasSession, unauthorized } from "@/lib/require-session";
import { queueFetch } from "@/lib/queue-client";

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  if (!(await hasSession())) return unauthorized();
  const key = (await context.params).key.join("/");
  const response = await queueFetch(`/image/${encodeURIComponent(key)}`);
  return new Response(response.body, { status: response.status, headers: response.headers });
}
