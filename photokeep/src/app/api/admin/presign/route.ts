import { NextRequest, NextResponse } from 'next/server';
import { getPresignedPutUrl } from '@/lib/r2/signer';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const files: { filename: string; contentType: string }[] = body.files;

  if (!files || files.length === 0 || files.length > 10) {
    return NextResponse.json({ error: 'Invalid files (1-10)' }, { status: 400 });
  }

  const results = await Promise.all(
    files.map(async (file) => {
      const id = crypto.randomUUID();
      const ext = file.filename.split('.').pop() || 'jpg';
      const key = `photos/${id}.${ext}`;
      const url = await getPresignedPutUrl(key, file.contentType);
      const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;

      return { id, key, uploadUrl: url, publicUrl, contentType: file.contentType };
    })
  );

  return NextResponse.json({ files: results });
}
