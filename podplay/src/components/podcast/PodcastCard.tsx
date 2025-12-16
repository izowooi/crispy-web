'use client';

import Link from 'next/link';
import { Podcast } from '@/types';
import { formatDuration } from '@/lib/r2/client';
import { usePlayer } from '@/context/PlayerContext';
import { PlayButton } from '@/components/player/PlayButton';

interface PodcastCardProps {
  podcast: Podcast;
}

export function PodcastCard({ podcast }: PodcastCardProps) {
  const { state, actions } = usePlayer();
  const isCurrentPodcast = state.currentPodcast?.id === podcast.id;
  const isPlaying = isCurrentPodcast && state.isPlaying;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPlaying) {
      actions.pause();
    } else {
      actions.play(podcast);
    }
  };

  return (
    <Link
      href={`/episode/${podcast.id}`}
      className={`
        block p-4 rounded-xl border transition-all duration-200
        bg-card-bg border-card-border
        hover:shadow-lg hover:scale-[1.02]
        ${isCurrentPodcast ? 'ring-2 ring-primary' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Emoji thumbnail */}
        <div className="text-4xl flex-shrink-0">{podcast.emoji}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate mb-1">
            {podcast.title}
          </h3>

          {podcast.description && (
            <p className="text-sm text-foreground/60 line-clamp-2 mb-2">
              {podcast.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-foreground/50">
            <span className="bg-card-border px-2 py-0.5 rounded">
              {podcast.category}
            </span>
            <span>{formatDuration(podcast.duration)}</span>
          </div>
        </div>

        {/* Play button */}
        <div className="flex-shrink-0">
          <PlayButton
            isPlaying={isPlaying}
            onClick={handlePlayClick}
            size="sm"
          />
        </div>
      </div>
    </Link>
  );
}
