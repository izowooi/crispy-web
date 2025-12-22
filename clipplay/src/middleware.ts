import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/google';

// Protected admin routes (except login)
const PROTECTED_ADMIN_ROUTES = ['/admin', '/admin/upload', '/admin/episodes'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip login page
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Check if accessing protected admin route
  const isProtectedRoute = PROTECTED_ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE);

    // Redirect to login if no session
    if (!sessionCookie) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
