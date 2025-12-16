import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/google';
import {
  uploadFileToR2,
  addPodcastToMetadata,
  generatePodcastId,
} from '@/lib/r2/upload';
import { Category } from '@/types';

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
    const emoji = formData.get('emoji') as string || '🎙️';
    const category = formData.get('category') as Category || '기술';
    const tagsStr = formData.get('tags') as string || '';

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'Only audio files are allowed' }, { status: 400 });
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    // Generate unique ID and file key
    const podcastId = generatePodcastId();
    const fileExtension = file.name.split('.').pop() || 'mp3';
    const fileKey = `audio/${podcastId}.${fileExtension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    await uploadFileToR2(buffer, fileKey, file.type);

    // Parse tags
    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // Get audio duration (approximate based on file size for now)
    // In production, you'd want to use a proper audio parsing library
    const duration = Math.round(file.size / 16000); // Rough estimate

    // Create podcast entry
    const podcast = {
      id: podcastId,
      title: title.trim(),
      description: description.trim(),
      emoji,
      category,
      tags,
      fileKey,
      fileSize: file.size,
      duration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to metadata
    await addPodcastToMetadata(podcast);

    return NextResponse.json({
      success: true,
      podcast,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
