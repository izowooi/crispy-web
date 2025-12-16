'use client';

import { formatDuration } from '@/lib/r2/client';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  showTime?: boolean;
  className?: string;
}

export function ProgressBar({
  currentTime,
  duration,
  onSeek,
  showTime = true,
  className = '',
}: ProgressBarProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeek(percentage * duration);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = duration * 0.05; // 5% step
    if (e.key === 'ArrowLeft') {
      onSeek(Math.max(0, currentTime - step));
    } else if (e.key === 'ArrowRight') {
      onSeek(Math.min(duration, currentTime + step));
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showTime && (
        <span className="text-sm text-foreground/70 min-w-[40px] text-right">
          {formatDuration(currentTime)}
        </span>
      )}

      <div
        className="flex-1 h-2 bg-card-border rounded-full cursor-pointer group"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="재생 진행률"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="relative h-full">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>
      </div>

      {showTime && (
        <span className="text-sm text-foreground/70 min-w-[40px]">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}
