import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/auth/google';
import { readMetadata, visibleClips } from '@/lib/storage/metadata';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromCookies(request.cookies);
    const metadata = await readMetadata();
    return NextResponse.json(
      { clips: visibleClips(metadata, !!admin) },
      // Admin responses include private clips, so they must never be shared-cached.
      { headers: { 'Cache-Control': admin ? 'private, no-store' : 'public, max-age=0, must-revalidate' } }
    );
  } catch (error) {
    console.error('Get clips error:', error);
    return NextResponse.json({ error: 'Failed to load clips' }, { status: 500 });
  }
}
