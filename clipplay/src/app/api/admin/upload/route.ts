import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import { getAdminFromCookies } from '@/lib/auth/google';
import { addClip } from '@/lib/storage/metadata';
import { resolveMediaPath } from '@/lib/storage/paths';
import { Clip } from '@/types';


interface MetadataRequest {
  clipId: string;
  videoKey: string;
  title: string;
  description?: string;
  emoji?: string;
  duration: number;
  fileSize: number;
  filmingDate?: string;
  thumbnailKey?: string;
  thumbnailTimestamp?: number;
  isPublic?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    if (!(await getAdminFromCookies(request.cookies))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse JSON body
    const body: MetadataRequest = await request.json();
    const {
      clipId,
      videoKey,
      title,
      description = '',
      emoji = '🎬',
      duration,
      fileSize,
      filmingDate,
      thumbnailKey,
      thumbnailTimestamp,
      isPublic = true,
    } = body;

    // Validate required fields
    if (!clipId || !videoKey) {
      return NextResponse.json({ error: 'clipId and videoKey are required' }, { status: 400 });
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const videoPath = resolveMediaPath(videoKey);
    const videoStat = videoPath ? await fs.stat(videoPath).catch(() => null) : null;
    if (!videoStat || !videoKey.startsWith(`videos/${clipId}.`)) {
      return NextResponse.json({ error: 'Uploaded video not found' }, { status: 400 });
    }
    const thumbnailPath = thumbnailKey ? resolveMediaPath(thumbnailKey) : null;
    const hasThumbnail = !!thumbnailPath && !!(await fs.stat(thumbnailPath).catch(() => null));

    // Create clip entry
    const clip: Clip = {
      id: clipId,
      title: title.trim(),
      description: description.trim(),
      emoji,
      fileKey: videoKey,
      fileSize: videoStat.size || fileSize,
      duration,
      filmingDate: filmingDate || undefined,
      thumbnailKey: hasThumbnail ? thumbnailKey : undefined,
      thumbnailTimestamp: thumbnailTimestamp || undefined,
      isPublic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to metadata
    await addClip(clip);

    return NextResponse.json({
      success: true,
      clip,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to save metadata' },
      { status: 500 }
    );
  }
}
