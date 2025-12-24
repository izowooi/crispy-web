import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/google';
import {
  updateClipInMetadata,
  deleteClipFromMetadata,
  deleteFileFromR2,
  uploadFileToR2,
} from '@/lib/r2/upload';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const user = await getSessionFromCookies(request.cookies);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const contentType = request.headers.get('content-type') || '';

    let updates: Record<string, unknown>;

    // multipart/form-data 처리 (썸네일 포함)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const thumbnail = formData.get('thumbnail') as File | null;
      const metadataStr = formData.get('metadata') as string;
      const thumbnailTimestamp = formData.get('thumbnailTimestamp') as string | null;

      updates = metadataStr ? JSON.parse(metadataStr) : {};

      // 썸네일 업로드
      if (thumbnail && thumbnail.size > 0) {
        const buffer = Buffer.from(await thumbnail.arrayBuffer());
        const thumbnailKey = `thumbnails/${id}.jpg`;
        await uploadFileToR2(buffer, thumbnailKey, 'image/jpeg');
        updates.thumbnailKey = thumbnailKey;
        if (thumbnailTimestamp) {
          updates.thumbnailTimestamp = parseFloat(thumbnailTimestamp);
        }
      }
    } else {
      // JSON 처리 (기존 방식)
      updates = await request.json();
    }

    // Don't allow updating certain fields
    delete updates.id;
    delete updates.fileKey;
    delete updates.fileSize;
    delete updates.createdAt;

    const clip = await updateClipInMetadata(id, updates);

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    return NextResponse.json({ clip });
  } catch (error) {
    console.error('Update clip error:', error);
    return NextResponse.json(
      { error: 'Failed to update clip' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const user = await getSessionFromCookies(request.cookies);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete from metadata
    const clip = await deleteClipFromMetadata(id);

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    // Delete video file from R2
    try {
      await deleteFileFromR2(clip.fileKey);
    } catch (err) {
      console.error('Failed to delete file from R2:', err);
      // Continue even if file deletion fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete clip error:', error);
    return NextResponse.json(
      { error: 'Failed to delete clip' },
      { status: 500 }
    );
  }
}
