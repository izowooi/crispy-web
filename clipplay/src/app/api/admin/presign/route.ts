import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/google';
import { generatePresignedUploadUrl, generateClipId, getMetadataFromR2 } from '@/lib/r2/upload';
import { DEFAULT_SETTINGS } from '@/types';

export const runtime = 'edge';

interface PresignRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
  thumbnailContentType?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionFromCookies(request.cookies);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PresignRequest = await request.json();
    const { fileName, contentType, fileSize, thumbnailContentType } = body;

    // Validate required fields
    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    // Validate file type
    if (!contentType.startsWith('video/')) {
      return NextResponse.json({ error: 'Only video files are allowed' }, { status: 400 });
    }

    // Get max file size from settings
    const metadata = await getMetadataFromR2();
    const maxFileSizeMB = metadata.settings?.maxFileSizeMB ?? DEFAULT_SETTINGS.maxFileSizeMB;

    // Validate file size
    if (fileSize > maxFileSizeMB * 1024 * 1024) {
      return NextResponse.json({ error: `File size exceeds ${maxFileSizeMB}MB limit` }, { status: 400 });
    }

    // Generate unique clip ID
    const clipId = generateClipId();
    const fileExtension = fileName.split('.').pop() || 'mp4';
    const videoKey = `videos/${clipId}.${fileExtension}`;

    // Generate presigned URL for video
    const videoUploadUrl = await generatePresignedUploadUrl(videoKey, contentType, 3600);

    // Generate presigned URL for thumbnail if requested
    let thumbnailUploadUrl: string | null = null;
    let thumbnailKey: string | null = null;
    if (thumbnailContentType) {
      thumbnailKey = `thumbnails/${clipId}.jpg`;
      thumbnailUploadUrl = await generatePresignedUploadUrl(thumbnailKey, thumbnailContentType, 3600);
    }

    return NextResponse.json({
      clipId,
      videoKey,
      videoUploadUrl,
      thumbnailKey,
      thumbnailUploadUrl,
    });
  } catch (error) {
    console.error('Presign error:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}
