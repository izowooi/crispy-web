import { NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/auth/google';

export const runtime = 'edge';

export async function GET() {
  const authUrl = getGoogleAuthUrl();
  return NextResponse.redirect(authUrl);
}
