import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/google';
import { getMetadataFromR2 } from '@/lib/r2/upload';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionFromCookies(request.cookies);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metadata = await getMetadataFromR2();

    return NextResponse.json({
      clips: metadata.clips,
    });
  } catch (error) {
    console.error('Get clips error:', error);
    return NextResponse.json(
      { error: 'Failed to get clips' },
      { status: 500 }
    );
  }
}
