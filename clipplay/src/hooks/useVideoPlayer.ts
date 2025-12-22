'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Clip, PlayerState, PlayerActions } from '@/types';
import { getVideoUrl } from '@/lib/r2/client';

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

interface UseVideoPlayerReturn {
  state: PlayerState;
  actions: PlayerActions;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useVideoPlayer(): UseVideoPlayerReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [state, setState] = useState<PlayerState>({
    currentClip: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isMuted: false,
    isLoading: false,
    error: null,
  });

  // Update video element properties when state changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = state.isMuted;
    }
  }, [state.isMuted]);

  const play = useCallback((clip?: Clip) => {
    if (clip) {
      // New clip
      const isSameClip = state.currentClip?.id === clip.id;

      if (!isSameClip) {
        // Load new clip
        setState((prev) => ({
          ...prev,
          currentClip: clip,
          currentTime: 0,
          isLoading: true,
          error: null,
        }));

        if (videoRef.current) {
          videoRef.current.src = getVideoUrl(R2_PUBLIC_URL, clip.fileKey);
          videoRef.current.load();
        }
      }

      setState((prev) => ({ ...prev, isPlaying: true }));
      videoRef.current?.play().catch((err) => {
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          error: err.message,
        }));
      });
    } else {
      // Resume current clip
      if (state.currentClip) {
        setState((prev) => ({ ...prev, isPlaying: true }));
        videoRef.current?.play().catch((err) => {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            error: err.message,
          }));
        });
      }
    }
  }, [state.currentClip]);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
    videoRef.current?.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, state.duration));
    setState((prev) => ({ ...prev, currentTime: clampedTime }));
    if (videoRef.current) {
      videoRef.current.currentTime = clampedTime;
    }
  }, [state.duration]);

  const toggleMute = useCallback(() => {
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setState((prev) => ({
        ...prev,
        currentTime: videoRef.current!.currentTime,
      }));
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setState((prev) => ({
        ...prev,
        duration: videoRef.current!.duration,
        isLoading: false,
      }));
    }
  }, []);

  const handleEnded = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
    }));
  }, []);

  const handleError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isLoading: false,
      error: '동영상을 재생할 수 없습니다.',
    }));
  }, []);

  // Setup video element event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [handleTimeUpdate, handleLoadedMetadata, handleEnded, handleError]);

  return {
    state,
    actions: {
      play,
      pause,
      seek,
      toggleMute,
    },
    videoRef,
  };
}
