import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt, COOKIE_NAME } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(null, { status: 401 });
  }

  const user = await verifyJwt(token);

  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json(user);
}
