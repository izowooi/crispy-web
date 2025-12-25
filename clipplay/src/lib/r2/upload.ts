/**
 * R2 Upload Utilities
 * Uses lightweight AWS Signature V4 implementation (no AWS SDK)
 */
import {
  generatePresignedUploadUrl as generatePresignedUrl,
  uploadToR2,
  getFromR2,
  deleteFromR2,
} from './signer';
import { Metadata, Clip } from '@/types';

/**
 * Generate presigned URL for direct upload to R2
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  return generatePresignedUrl(key, contentType, expiresIn);
}

/**
 * Upload file to R2
 */
export async function uploadFileToR2(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string
): Promise<void> {
  await uploadToR2(key, file, contentType);
}

/**
 * Delete file from R2
 */
export async function deleteFileFromR2(key: string): Promise<void> {
  await deleteFromR2(key);
}

/**
 * Get metadata.json from R2
 */
export async function getMetadataFromR2(): Promise<Metadata> {
  const body = await getFromR2('metadata.json');

  if (!body) {
    // Return default metadata if file doesn't exist
    return {
      clips: [],
      allowedUploaders: [],
    };
  }

  return JSON.parse(body);
}

/**
 * Save metadata.json to R2
 */
export async function saveMetadataToR2(metadata: Metadata): Promise<void> {
  await uploadToR2('metadata.json', JSON.stringify(metadata, null, 2), 'application/json');
}

/**
 * Add clip to metadata
 */
export async function addClipToMetadata(clip: Clip): Promise<void> {
  const metadata = await getMetadataFromR2();
  metadata.clips.unshift(clip); // Add to beginning
  await saveMetadataToR2(metadata);
}

/**
 * Update clip in metadata
 */
export async function updateClipInMetadata(
  id: string,
  updates: Partial<Clip>
): Promise<Clip | null> {
  const metadata = await getMetadataFromR2();
  const index = metadata.clips.findIndex((c) => c.id === id);

  if (index === -1) {
    return null;
  }

  metadata.clips[index] = {
    ...metadata.clips[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveMetadataToR2(metadata);
  return metadata.clips[index];
}

/**
 * Delete clip from metadata
 */
export async function deleteClipFromMetadata(id: string): Promise<Clip | null> {
  const metadata = await getMetadataFromR2();
  const index = metadata.clips.findIndex((c) => c.id === id);

  if (index === -1) {
    return null;
  }

  const [deleted] = metadata.clips.splice(index, 1);
  await saveMetadataToR2(metadata);
  return deleted;
}

/**
 * Generate unique ID
 */
export function generateClipId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
