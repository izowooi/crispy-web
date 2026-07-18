import { hasSession, unauthorized } from "@/lib/require-session";
import { queueFetch } from "@/lib/queue-client";

export async function GET(request: Request) {
  if (!(await hasSession())) return unauthorized();
  const query = new URL(request.url).search;
  const response = await queueFetch(`/history${query}`);
  return new Response(response.body, { status: response.status, headers: { "content-type": "application/json" } });
}
