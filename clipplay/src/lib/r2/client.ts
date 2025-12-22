import { Metadata, Clip } from '@/types';

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

/**
 * Parse and validate metadata.json content
 */
export function parseMetadata(jsonString: string): Metadata {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON format');
  }

  // Validate required fields
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid metadata format');
  }

  const data = parsed as Record<string, unknown>;

  if (!Array.isArray(data.clips)) {
    throw new Error('Missing or invalid clips array');
  }

  if (!Array.isArray(data.allowedUploaders)) {
    throw new Error('Missing or invalid allowedUploaders array');
  }

  return data as unknown as Metadata;
}

/**
 * Filter clips by search query (title only)
 */
export function filterClips(clips: Clip[], searchQuery: string): Clip[] {
  return clips.filter((clip) => {
    // Search filter (case-insensitive, title only)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleMatch = clip.title.toLowerCase().includes(query);
      const descriptionMatch = clip.description?.toLowerCase().includes(query) || false;

      if (!titleMatch && !descriptionMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Construct video file URL from R2 base URL and file key
 */
export function getVideoUrl(baseUrl: string, fileKey: string): string {
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/${fileKey}`;
}

/**
 * Fetch metadata.json from R2 public URL
 */
export async function fetchMetadata(): Promise<Metadata> {
  if (!R2_PUBLIC_URL) {
    throw new Error('R2_PUBLIC_URL is not configured');
  }

  const response = await fetch(`${R2_PUBLIC_URL}/metadata.json`, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.status}`);
  }

  const jsonString = await response.text();
  return parseMetadata(jsonString);
}

/**
 * Get a single clip by ID
 */
export function getClipById(clips: Clip[], id: string): Clip | undefined {
  return clips.find((clip) => clip.id === id);
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
