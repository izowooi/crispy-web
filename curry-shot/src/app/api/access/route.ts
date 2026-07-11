import { getAccessState } from "@/lib/server/access";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json(getAccessState(), {
    headers: { "Cache-Control": "no-store" },
  });
}
