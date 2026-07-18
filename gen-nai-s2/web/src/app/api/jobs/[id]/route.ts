import { hasSession, unauthorized } from "@/lib/require-session";
import { queueFetch } from "@/lib/queue-client";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await hasSession())) return unauthorized();
  const { id } = await context.params;
  const response = await queueFetch(`/campaign/${encodeURIComponent(id)}`);
  return new Response(response.body, { status: response.status, headers: { "content-type": "application/json" } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await hasSession())) return unauthorized();
  const { id } = await context.params;
  const response = await queueFetch(`/campaign/${encodeURIComponent(id)}`, { method: "DELETE" });
  return new Response(response.body, { status: response.status, headers: { "content-type": "application/json" } });
}
