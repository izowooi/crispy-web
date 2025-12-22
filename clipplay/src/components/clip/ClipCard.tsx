'use client';

import Link from 'next/link';
import { Clip } from '@/types';
import { formatDuration } from '@/lib/r2/client';

interface ClipCardProps {
  clip: Clip;
}

export function ClipCard({ clip }: ClipCardProps) {
  return (
    <Link
      href={`/clip/${clip.id}`}
      className="
        block p-4 rounded-xl border transition-all duration-200
        bg-card-bg border-card-border
        hover:shadow-lg hover:scale-[1.02]
      "
    >
      <div className="flex items-start gap-4">
        {/* Emoji thumbnail */}
        <div className="text-4xl flex-shrink-0">{clip.emoji}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate mb-1">
            {clip.title}
          </h3>

          {clip.description && (
            <p className="text-sm text-foreground/60 line-clamp-2 mb-2">
              {clip.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-foreground/50">
            <span>{formatDuration(clip.duration)}</span>
          </div>
        </div>

        {/* Play icon */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary ml-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
