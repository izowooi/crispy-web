import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return Response.json({ ok: false, error: "Admin not configured" }, { status: 403 });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.password !== adminPassword) {
    return Response.json({ ok: false, error: "Wrong password" }, { status: 401 });
  }

  const store = await cookies();
  store.set(COOKIE_NAME, adminPassword, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return Response.json({ ok: true });
}
