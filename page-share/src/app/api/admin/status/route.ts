import { isAdminRequest } from "@/lib/admin";

export const runtime = "edge";

export async function GET(request: Request) {
  const isAdmin = isAdminRequest(request);
  return Response.json({ isAdmin });
}
