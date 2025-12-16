'use client';

import { usePlayer } from '@/context/PlayerContext';
import { PlayButton } from './PlayButton';
import { ProgressBar } from './ProgressBar';

interface MiniPlayerProps {
  onExpand?: () => void;
}

export function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const { state, actions } = usePlayer();
  const { currentPodcast, isPlaying, currentTime, duration, isLoading } = state;

  if (!currentPodcast) {
    return null;
  }

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      actions.pause();
    } else {
      actions.play();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-card-border shadow-lg z-50">
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={actions.seek}
        showTime={false}
        className="px-0"
      />

      <div className="flex items-center gap-4 px-4 py-3 max-w-screen-xl mx-auto">
        {/* Podcast info */}
        <button
          onClick={onExpand}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <span className="text-2xl flex-shrink-0">{currentPodcast.emoji}</span>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{currentPodcast.title}</p>
            <p className="text-sm text-foreground/60 truncate">
              {currentPodcast.category}
            </p>
          </div>
        </button>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="w-12 h-12 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <PlayButton isPlaying={isPlaying} onClick={handlePlayPause} size="md" />
          )}
        </div>
      </div>
    </div>
  );
}
