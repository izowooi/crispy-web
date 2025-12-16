'use client';

import { usePlayer } from '@/context/PlayerContext';
import { PlayButton } from './PlayButton';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { SpeedControl } from './SpeedControl';

interface AudioPlayerProps {
  className?: string;
}

export function AudioPlayer({ className = '' }: AudioPlayerProps) {
  const { state, actions } = usePlayer();
  const {
    currentPodcast,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    isLoading,
    error,
  } = state;

  if (!currentPodcast) {
    return (
      <div className={`p-8 text-center text-foreground/50 ${className}`}>
        재생할 에피소드를 선택해주세요.
      </div>
    );
  }

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      actions.pause();
    } else {
      actions.play();
    }
  };

  // Skip backward/forward 10 seconds
  const skipBackward = () => actions.seek(Math.max(0, currentTime - 10));
  const skipForward = () => actions.seek(Math.min(duration, currentTime + 10));

  return (
    <div className={`bg-card-bg rounded-2xl p-6 ${className}`}>
      {/* Podcast info */}
      <div className="text-center mb-6">
        <span className="text-6xl mb-4 block">{currentPodcast.emoji}</span>
        <h2 className="text-xl font-bold text-foreground mb-1">{currentPodcast.title}</h2>
        <p className="text-foreground/60">{currentPodcast.category}</p>
        {currentPodcast.description && (
          <p className="text-sm text-foreground/50 mt-2 line-clamp-2">
            {currentPodcast.description}
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
          {error}
        </div>
      )}

      {/* Progress bar */}
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={actions.seek}
        className="mb-6"
      />

      {/* Main controls */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {/* Skip backward */}
        <button
          onClick={skipBackward}
          className="p-2 text-foreground/70 hover:text-foreground transition-colors"
          aria-label="10초 뒤로"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            <text x="12" y="15" textAnchor="middle" fontSize="6" fill="currentColor">10</text>
          </svg>
        </button>

        {/* Play/Pause */}
        {isLoading ? (
          <div className="w-16 h-16 flex items-center justify-center">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <PlayButton isPlaying={isPlaying} onClick={handlePlayPause} size="lg" />
        )}

        {/* Skip forward */}
        <button
          onClick={skipForward}
          className="p-2 text-foreground/70 hover:text-foreground transition-colors"
          aria-label="10초 앞으로"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
            <text x="12" y="15" textAnchor="middle" fontSize="6" fill="currentColor">10</text>
          </svg>
        </button>
      </div>

      {/* Secondary controls */}
      <div className="flex items-center justify-between">
        <VolumeControl
          volume={volume}
          onVolumeChange={actions.setVolume}
        />

        <SpeedControl
          playbackRate={playbackRate}
          onPlaybackRateChange={actions.setPlaybackRate}
        />
      </div>
    </div>
  );
}
