'use client';

import { Clip } from '@/types';
import { GridCard } from './GridCard';

interface GridViewProps {
  clips: (Clip & { thumbnailKey?: string })[];
  isLoading?: boolean;
  columns?: 2 | 3 | 4;
}

const gridClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2 sm:grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-3 sm:grid-cols-4',
};

export function GridView({ clips, isLoading, columns = 4 }: GridViewProps) {
  const gridClass = gridClasses[columns];

  if (isLoading) {
    return (
      <div className={`grid ${gridClass} gap-3 p-4`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[9/16] rounded-xl bg-card-bg border border-card-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-foreground/60">
        <svg
          className="w-16 h-16 mb-4 opacity-50"
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
        <p className="text-lg font-medium">아직 클립이 없습니다</p>
        <p className="text-sm mt-1">새로운 영상을 업로드해보세요</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridClass} gap-3 p-4`}>
      {clips.map((clip) => (
        <GridCard key={clip.id} clip={clip} />
      ))}
    </div>
  );
}
