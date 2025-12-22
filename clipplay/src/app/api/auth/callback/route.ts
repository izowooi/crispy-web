import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
  isAllowedUploader,
  createSessionToken,
  SESSION_COOKIE,
} from '@/lib/auth/google';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${baseUrl}/admin/login?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/admin/login?error=no_code`);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user info
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    // Check if user is allowed uploader
    const isAdmin = await isAllowedUploader(userInfo.email);

    // Create session token
    const sessionToken = await createSessionToken({
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      isAdmin,
    });

    // Create response with redirect
    const response = NextResponse.redirect(`${baseUrl}/admin`);

    // Set session cookie
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(`${baseUrl}/admin/login?error=auth_failed`);
  }
}
