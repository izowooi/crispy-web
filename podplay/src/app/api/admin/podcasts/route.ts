import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/google';
import { getMetadataFromR2 } from '@/lib/r2/upload';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionFromCookies(request.cookies);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metadata = await getMetadataFromR2();

    return NextResponse.json({
      podcasts: metadata.podcasts,
      categories: metadata.categories,
    });
  } catch (error) {
    console.error('Get podcasts error:', error);
    return NextResponse.json(
      { error: 'Failed to get podcasts' },
      { status: 500 }
    );
  }
}
