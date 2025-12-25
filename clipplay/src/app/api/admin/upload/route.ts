import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/google';
import { addClipToMetadata } from '@/lib/r2/upload';
import { Clip } from '@/types';

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

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
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionFromCookies(request.cookies);
    if (!user || !user.isAdmin) {
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
    } = body;

    // Validate required fields
    if (!clipId || !videoKey) {
      return NextResponse.json({ error: 'clipId and videoKey are required' }, { status: 400 });
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create clip entry
    const clip: Clip = {
      id: clipId,
      title: title.trim(),
      description: description.trim(),
      emoji,
      fileKey: videoKey,
      fileSize,
      duration,
      filmingDate: filmingDate || undefined,
      thumbnailKey: thumbnailKey || undefined,
      thumbnailTimestamp: thumbnailTimestamp || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to metadata
    await addClipToMetadata(clip);

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
