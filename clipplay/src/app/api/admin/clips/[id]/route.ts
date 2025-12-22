import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/google';
import {
  updateClipInMetadata,
  deleteClipFromMetadata,
  deleteFileFromR2,
} from '@/lib/r2/upload';

export const runtime = 'edge';

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
    const updates = await request.json();

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
