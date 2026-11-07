import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/auth/google';
import { readMetadata } from '@/lib/storage/metadata';

export async function GET(request: NextRequest) {
  try {
    if (!(await getAdminFromCookies(request.cookies))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const metadata = await readMetadata();
    return NextResponse.json({ clips: metadata.clips });
  } catch (error) {
    console.error('Get clips error:', error);
    return NextResponse.json({ error: 'Failed to get clips' }, { status: 500 });
  }
}
