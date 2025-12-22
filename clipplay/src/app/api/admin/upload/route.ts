import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/google';
import {
  uploadFileToR2,
  addClipToMetadata,
  generateClipId,
} from '@/lib/r2/upload';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionFromCookies(request.cookies);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const emoji = formData.get('emoji') as string || '🎬';

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Only video files are allowed' }, { status: 400 });
    }

    // Validate file size (200MB)
    if (file.size > 200 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 200MB limit' }, { status: 400 });
    }

    // Generate unique ID and file key
    const clipId = generateClipId();
    const fileExtension = file.name.split('.').pop() || 'mp4';
    const fileKey = `videos/${clipId}.${fileExtension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    await uploadFileToR2(buffer, fileKey, file.type);

    // Get video duration from client (measured via Video API)
    // Falls back to estimate if not provided
    const durationStr = formData.get('duration') as string;
    const duration = durationStr ? parseInt(durationStr, 10) : 60;

    // Create clip entry
    const clip = {
      id: clipId,
      title: title.trim(),
      description: description.trim(),
      emoji,
      fileKey,
      fileSize: file.size,
      duration,
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
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
