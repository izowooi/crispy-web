import { hasSession, unauthorized } from "@/lib/require-session";
import { queueFetch } from "@/lib/queue-client";

export async function GET() {
  if (!(await hasSession())) return unauthorized();
  const response = await queueFetch("/config");
  return new Response(response.body, { status: response.status, headers: { "content-type": "application/json" } });
}

export async function PUT(request: Request) {
  if (!(await hasSession())) return unauthorized();
  const response = await queueFetch("/config", {
    method: "PUT", headers: { "content-type": "application/json" }, body: await request.text(),
  });
  return new Response(response.body, { status: response.status, headers: { "content-type": "application/json" } });
}
