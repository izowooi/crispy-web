'use client';

import Link from 'next/link';
import { Clip } from '@/types';

interface GridCardProps {
  clip: Clip & { thumbnailKey?: string };
}

export function GridCard({ clip }: GridCardProps) {
  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const thumbnailUrl = clip.thumbnailKey && r2Url
    ? `${r2Url}/${clip.thumbnailKey}`
    : null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Link
      href={`/clip/${clip.id}`}
      className="block relative aspect-[9/16] rounded-xl overflow-hidden bg-card-bg border border-card-border hover:border-primary/50 transition-all hover:scale-[1.02] hover:shadow-lg group"
    >
      {/* Thumbnail or Emoji Fallback */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={clip.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-card-bg to-card-border/30">
          <span className="text-5xl">{clip.emoji}</span>
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Duration Badge */}
      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white font-medium">
        {formatDuration(clip.duration)}
      </div>

      {/* Title & Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm">{clip.emoji}</span>
          <h3 className="text-sm font-medium text-white line-clamp-2">
            {clip.title}
          </h3>
        </div>
        {clip.description && (
          <p className="text-xs text-white/70 line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {clip.description}
          </p>
        )}
      </div>
    </Link>
  );
}
