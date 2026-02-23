import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getGoogleUserInfo } from '@/lib/auth/google';
import { signJwt, COOKIE_NAME } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=no_code', request.url)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const user = await getGoogleUserInfo(tokens.access_token);

    const jwt = await signJwt({
      email: user.email,
      name: user.name,
      picture: user.picture,
    });

    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(COOKIE_NAME, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', request.url)
    );
  }
}
