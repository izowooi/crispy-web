import { createSession, passwordMatches, SESSION_COOKIE } from "@/lib/auth";
import { hasSession } from "@/lib/require-session";

export async function GET() {
  return Response.json({ authenticated: await hasSession() });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { password?: string } | null;
  if (!body?.password || !passwordMatches(body.password)) {
    return Response.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${await createSession()}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
  );
  return response;
}

export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  return response;
}
