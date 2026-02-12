import { NextResponse } from 'next/server';
import { createToken, verifyPassword } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: '비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 비밀번호 검증
    const isValid = verifyPassword(password);

    if (!isValid) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 토큰 생성 (async)
    const token = await createToken();

    // 응답 생성
    const response = NextResponse.json(
      { success: true, message: '로그인 성공' },
      { status: 200 }
    );

    // HttpOnly 쿠키 설정
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24시간
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
