import { Podcast } from '@/types';

interface MediaSessionHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
  onSeekTo?: (seekTime: number) => void;
}

/**
 * Initialize Media Session API for lock screen controls
 */
export function initMediaSession(
  podcast: Podcast,
  handlers: MediaSessionHandlers
): void {
  if (!('mediaSession' in navigator)) {
    return;
  }

  // Set metadata
  navigator.mediaSession.metadata = new MediaMetadata({
    title: podcast.title,
    artist: 'Podplay',
    album: podcast.category,
    artwork: [
      {
        src: `/icons/icon-192x192.svg`,
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: `/icons/icon-512x512.svg`,
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  });

  // Set action handlers
  if (handlers.onPlay) {
    navigator.mediaSession.setActionHandler('play', handlers.onPlay);
  }

  if (handlers.onPause) {
    navigator.mediaSession.setActionHandler('pause', handlers.onPause);
  }

  if (handlers.onSeekBackward) {
    navigator.mediaSession.setActionHandler('seekbackward', handlers.onSeekBackward);
  }

  if (handlers.onSeekForward) {
    navigator.mediaSession.setActionHandler('seekforward', handlers.onSeekForward);
  }

  if (handlers.onSeekTo) {
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        handlers.onSeekTo!(details.seekTime);
      }
    });
  }
}

/**
 * Update playback state
 */
export function updatePlaybackState(state: 'playing' | 'paused' | 'none'): void {
  if (!('mediaSession' in navigator)) {
    return;
  }

  navigator.mediaSession.playbackState = state;
}

/**
 * Update position state for progress bar on lock screen
 */
export function updatePositionState(
  duration: number,
  position: number,
  playbackRate: number = 1
): void {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) {
    return;
  }

  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate,
      position,
    });
  } catch {
    // Ignore errors (can happen if duration is 0 or invalid)
  }
}

/**
 * Clear media session
 */
export function clearMediaSession(): void {
  if (!('mediaSession' in navigator)) {
    return;
  }

  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = 'none';

  // Remove action handlers
  navigator.mediaSession.setActionHandler('play', null);
  navigator.mediaSession.setActionHandler('pause', null);
  navigator.mediaSession.setActionHandler('seekbackward', null);
  navigator.mediaSession.setActionHandler('seekforward', null);
  navigator.mediaSession.setActionHandler('seekto', null);
}
