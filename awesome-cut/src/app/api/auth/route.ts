import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const serverPassword = process.env.ACCESS_PASSWORD;

  // ACCESS_PASSWORD 미설정 시 개발 환경 편의상 통과
  if (!serverPassword) {
    return NextResponse.json({ ok: true });
  }

  if (password === serverPassword) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
