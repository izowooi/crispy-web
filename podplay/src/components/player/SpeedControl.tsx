'use client';

import { useState } from 'react';

interface SpeedControlProps {
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  className?: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function SpeedControl({
  playbackRate,
  onPlaybackRateChange,
  className = '',
}: SpeedControlProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-2 py-1 text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-card-bg rounded transition-colors"
        aria-label="재생 속도"
      >
        {playbackRate}x
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-background border border-card-border rounded-lg shadow-lg z-20 overflow-hidden">
            {SPEED_OPTIONS.map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  onPlaybackRateChange(speed);
                  setShowMenu(false);
                }}
                className={`
                  block w-full px-4 py-2 text-sm text-left whitespace-nowrap
                  hover:bg-card-bg transition-colors
                  ${playbackRate === speed ? 'text-primary font-medium' : 'text-foreground'}
                `}
              >
                {speed}x
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
