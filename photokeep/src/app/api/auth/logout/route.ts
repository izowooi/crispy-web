import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth/jwt';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
