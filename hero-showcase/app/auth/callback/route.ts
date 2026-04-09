import { NextRequest, NextResponse } from "next/server";
import { encodeSession, SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("hs_oauth_state")?.value;

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  // 인가 코드 → 액세스 토큰 교환
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/auth/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/?error=token_exchange_failed`);
  }

  const { access_token } = await tokenRes.json() as { access_token: string };

  // 사용자 정보 조회
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(`${origin}/?error=userinfo_failed`);
  }

  const { email, name, picture } = await userRes.json() as {
    email: string;
    name: string;
    picture?: string;
  };

  const sessionToken = await encodeSession({ email, name, picture });

  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
  });
  response.cookies.delete("hs_oauth_state");

  return response;
}
