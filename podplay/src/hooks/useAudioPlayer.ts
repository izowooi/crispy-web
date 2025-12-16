'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Podcast, PlayerState, PlayerActions } from '@/types';
import { getAudioUrl } from '@/lib/r2/client';

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

interface UseAudioPlayerReturn {
  state: PlayerState;
  actions: PlayerActions;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [state, setState] = useState<PlayerState>({
    currentPodcast: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isLoading: false,
    error: null,
  });

  // Update audio element properties when state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
      audioRef.current.playbackRate = state.playbackRate;
    }
  }, [state.volume, state.playbackRate]);

  const play = useCallback((podcast?: Podcast) => {
    if (podcast) {
      // New podcast
      const isSamePodcast = state.currentPodcast?.id === podcast.id;

      if (!isSamePodcast) {
        // Load new podcast
        setState((prev) => ({
          ...prev,
          currentPodcast: podcast,
          currentTime: 0,
          isLoading: true,
          error: null,
        }));

        if (audioRef.current) {
          audioRef.current.src = getAudioUrl(R2_PUBLIC_URL, podcast.fileKey);
          audioRef.current.load();
        }
      }

      setState((prev) => ({ ...prev, isPlaying: true }));
      audioRef.current?.play().catch((err) => {
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          error: err.message,
        }));
      });
    } else {
      // Resume current podcast
      if (state.currentPodcast) {
        setState((prev) => ({ ...prev, isPlaying: true }));
        audioRef.current?.play().catch((err) => {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            error: err.message,
          }));
        });
      }
    }
  }, [state.currentPodcast]);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
    audioRef.current?.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, state.duration));
    setState((prev) => ({ ...prev, currentTime: clampedTime }));
    if (audioRef.current) {
      audioRef.current.currentTime = clampedTime;
    }
  }, [state.duration]);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setState((prev) => ({ ...prev, volume: clampedVolume }));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.5, Math.min(2, rate));
    setState((prev) => ({ ...prev, playbackRate: clampedRate }));
  }, []);

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setState((prev) => ({
        ...prev,
        currentTime: audioRef.current!.currentTime,
      }));
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setState((prev) => ({
        ...prev,
        duration: audioRef.current!.duration,
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
      error: '오디오를 재생할 수 없습니다.',
    }));
  }, []);

  // Setup audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [handleTimeUpdate, handleLoadedMetadata, handleEnded, handleError]);

  return {
    state,
    actions: {
      play,
      pause,
      seek,
      setVolume,
      setPlaybackRate,
    },
    audioRef,
  };
}
