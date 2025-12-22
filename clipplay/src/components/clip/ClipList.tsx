'use client';

import { Clip } from '@/types';
import { ClipCard } from './ClipCard';

interface ClipListProps {
  clips: Clip[];
  isLoading?: boolean;
}

export function ClipList({ clips, isLoading = false }: ClipListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
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

  if (clips.length === 0) {
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
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <p>클립이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {clips.map((clip) => (
        <ClipCard key={clip.id} clip={clip} />
      ))}
    </div>
  );
}
