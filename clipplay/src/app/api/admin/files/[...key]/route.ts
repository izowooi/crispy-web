import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/auth/google';
import { UploadError, writeChunk } from '@/lib/storage/files';

interface RouteParams {
  params: Promise<{ key: string[] }>;
}

/** PUT /api/admin/files/videos/<id>.mp4?offset=<n>&total=<bytes> — one upload chunk. */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  if (!(await getAdminFromCookies(request.cookies))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key } = await params;
  const offset = Number(request.nextUrl.searchParams.get('offset') ?? '0');
  const total = Number(request.nextUrl.searchParams.get('total'));

  try {
    const result = await writeChunk(key.join('/'), offset, total, request.body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Chunk upload error:', error);
    return NextResponse.json({ error: 'Failed to store chunk' }, { status: 500 });
  }
}
