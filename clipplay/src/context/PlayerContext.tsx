'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import { PlayerState, PlayerActions } from '@/types';

interface PlayerContextValue {
  state: PlayerState;
  actions: PlayerActions;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const { state, actions, videoRef } = useVideoPlayer();

  return (
    <PlayerContext.Provider value={{ state, actions, videoRef }}>
      {children}
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
