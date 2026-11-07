import { Clip } from '@/types';

/**
 * Filter clips by search query (title + description), hiding private clips.
 */
export function filterClips(clips: Clip[], searchQuery: string): Clip[] {
  const query = searchQuery.trim().toLowerCase();
  return clips.filter((clip) => {
    // undefined/true = public
    if (clip.isPublic === false) return false;
    if (!query) return true;
    return (
      clip.title.toLowerCase().includes(query) ||
      (clip.description?.toLowerCase().includes(query) ?? false)
    );
  });
}

/**
 * Same-origin URL for a stored media key (videos/..., thumbnails/...).
 * `version` busts the CDN cache for files that are overwritten in place (thumbnails).
 */
export function getMediaUrl(key: string, version?: string): string {
  const path = `/media/${key.replace(/^\/+/, '')}`;
  return version ? `${path}?v=${encodeURIComponent(version)}` : path;
}

export function getVideoUrl(clip: Pick<Clip, 'fileKey'>): string {
  return getMediaUrl(clip.fileKey);
}

export function getThumbnailUrl(clip: Pick<Clip, 'thumbnailKey' | 'updatedAt'>): string | null {
  return clip.thumbnailKey ? getMediaUrl(clip.thumbnailKey, clip.updatedAt) : null;
}

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
