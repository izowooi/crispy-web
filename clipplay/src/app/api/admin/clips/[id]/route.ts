import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getAdminFromCookies } from '@/lib/auth/google';
import { updateClip, deleteClip } from '@/lib/storage/metadata';
import { deleteMediaFile } from '@/lib/storage/files';
import { resolveMediaPath } from '@/lib/storage/paths';


interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    if (!(await getAdminFromCookies(request.cookies))) {
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
        const thumbnailKey = `thumbnails/${id}.jpg`;
        const thumbnailPath = resolveMediaPath(thumbnailKey);
        if (!thumbnailPath) {
          return NextResponse.json({ error: 'Invalid clip id' }, { status: 400 });
        }
        await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
        const tmp = `${thumbnailPath}.tmp`;
        await fs.writeFile(tmp, new Uint8Array(await thumbnail.arrayBuffer()));
        await fs.rename(tmp, thumbnailPath);
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

    const clip = await updateClip(id, updates);

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
    if (!(await getAdminFromCookies(request.cookies))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete from metadata
    const clip = await deleteClip(id);

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    try {
      await deleteMediaFile(clip.fileKey);
      await deleteMediaFile(clip.thumbnailKey);
    } catch (err) {
      console.error('Failed to delete media files:', err);
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
