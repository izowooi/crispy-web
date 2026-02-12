import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Edge Runtime 사용 (Cloudflare Pages 호환)
export const runtime = 'edge';

// 공개 경로 (인증 불필요)
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('[Middleware] 요청 경로:', pathname);

  // 정적 파일 및 Next.js 내부 경로는 건너뛰기
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/docs')
  ) {
    console.log('[Middleware] 정적 파일/내부 경로 - 인증 건너뜀');
    return NextResponse.next();
  }

  // 공개 경로는 인증 체크 건너뛰기
  if (PUBLIC_PATHS.includes(pathname)) {
    console.log('[Middleware] 공개 경로 - 인증 건너뜀');
    return NextResponse.next();
  }

  // 쿠키에서 인증 토큰 확인
  const authToken = request.cookies.get('auth_token')?.value;
  console.log('[Middleware] 인증 토큰 존재:', !!authToken);

  if (!authToken) {
    // 토큰이 없으면 로그인 페이지로 리다이렉트
    console.log('[Middleware] 토큰 없음 - /login으로 리다이렉트');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 토큰 검증 (async)
  const payload = await verifyToken(authToken);
  console.log('[Middleware] 토큰 검증 결과:', payload);

  if (!payload || !payload.authenticated) {
    // 유효하지 않은 토큰은 로그인 페이지로 리다이렉트
    console.log('[Middleware] 토큰 유효하지 않음 - /login으로 리다이렉트');
    const response = NextResponse.redirect(new URL('/login', request.url));
    // 잘못된 토큰 쿠키 삭제
    response.cookies.delete('auth_token');
    return response;
  }

  // 인증 성공
  console.log('[Middleware] 인증 성공');
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
