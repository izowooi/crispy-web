import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/auth/google';
import { generateClipId, readMetadata } from '@/lib/storage/metadata';
import { DEFAULT_SETTINGS } from '@/types';

interface PresignRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
  thumbnailContentType?: string;
}

const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'mov', 'webm', 'mkv'];

/** Reserves keys for a new clip and returns where to upload them (chunked PUT). */
export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminFromCookies(request.cookies))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, contentType, fileSize, thumbnailContentType }: PresignRequest = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }
    if (!contentType.startsWith('video/')) {
      return NextResponse.json({ error: 'Only video files are allowed' }, { status: 400 });
    }

    const metadata = await readMetadata();
    const maxFileSizeMB = metadata.settings?.maxFileSizeMB ?? DEFAULT_SETTINGS.maxFileSizeMB;
    if (fileSize > maxFileSizeMB * 1024 * 1024) {
      return NextResponse.json({ error: `File size exceeds ${maxFileSizeMB}MB limit` }, { status: 400 });
    }

    const clipId = generateClipId();
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const videoKey = `videos/${clipId}.${VIDEO_EXTENSIONS.includes(ext) ? ext : 'mp4'}`;
    const thumbnailKey = thumbnailContentType ? `thumbnails/${clipId}.jpg` : null;

    return NextResponse.json({
      clipId,
      videoKey,
      videoUploadUrl: `/api/admin/files/${videoKey}`,
      thumbnailKey,
      thumbnailUploadUrl: thumbnailKey ? `/api/admin/files/${thumbnailKey}` : null,
    });
  } catch (error) {
    console.error('Presign error:', error);
    return NextResponse.json({ error: 'Failed to prepare upload' }, { status: 500 });
  }
}
