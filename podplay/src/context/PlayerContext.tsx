'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { PlayerState, PlayerActions } from '@/types';
import {
  initMediaSession,
  updatePlaybackState,
  updatePositionState,
  clearMediaSession,
} from '@/lib/media/session';

interface PlayerContextValue {
  state: PlayerState;
  actions: PlayerActions;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const { state, actions, audioRef } = useAudioPlayer();

  // Media Session integration
  useEffect(() => {
    if (state.currentPodcast) {
      initMediaSession(state.currentPodcast, {
        onPlay: actions.play,
        onPause: actions.pause,
        onSeekBackward: () => actions.seek(Math.max(0, state.currentTime - 10)),
        onSeekForward: () => actions.seek(Math.min(state.duration, state.currentTime + 10)),
        onSeekTo: actions.seek,
      });
    } else {
      clearMediaSession();
    }
  }, [state.currentPodcast, actions]);

  // Update playback state
  useEffect(() => {
    updatePlaybackState(state.isPlaying ? 'playing' : 'paused');
  }, [state.isPlaying]);

  // Update position state
  useEffect(() => {
    if (state.duration > 0) {
      updatePositionState(state.duration, state.currentTime, state.playbackRate);
    }
  }, [state.currentTime, state.duration, state.playbackRate]);

  return (
    <PlayerContext.Provider value={{ state, actions }}>
      {children}
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
