'use client';

import { Podcast } from '@/types';
import { PodcastCard } from './PodcastCard';

interface PodcastGridProps {
  podcasts: Podcast[];
  isLoading?: boolean;
}

export function PodcastGrid({ podcasts, isLoading = false }: PodcastGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl border bg-card-bg border-card-border animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-card-border rounded-lg" />
              <div className="flex-1">
                <div className="h-5 bg-card-border rounded w-3/4 mb-2" />
                <div className="h-4 bg-card-border rounded w-full mb-2" />
                <div className="h-3 bg-card-border rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (podcasts.length === 0) {
    return (
      <div className="text-center py-12 text-foreground/50">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-foreground/20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
        <p>에피소드가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {podcasts.map((podcast) => (
        <PodcastCard key={podcast.id} podcast={podcast} />
      ))}
    </div>
  );
}
