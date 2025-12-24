import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Metadata, Clip } from '@/types';

// R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

// Create S3 client for R2
function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Upload file to R2
 */
export async function uploadFileToR2(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string
): Promise<void> {
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );
}

/**
 * Delete file from R2
 */
export async function deleteFileFromR2(key: string): Promise<void> {
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Get metadata.json from R2
 */
export async function getMetadataFromR2(): Promise<Metadata> {
  const client = getR2Client();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: 'metadata.json',
      })
    );

    const body = await response.Body?.transformToString();
    if (!body) {
      throw new Error('Empty metadata');
    }

    return JSON.parse(body);
  } catch (error) {
    // Return default metadata if file doesn't exist
    if ((error as { name?: string }).name === 'NoSuchKey') {
      return {
        clips: [],
        allowedUploaders: [],
      };
    }
    throw error;
  }
}

/**
 * Save metadata.json to R2
 */
export async function saveMetadataToR2(metadata: Metadata): Promise<void> {
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: 'metadata.json',
      Body: JSON.stringify(metadata, null, 2),
      ContentType: 'application/json',
    })
  );
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
