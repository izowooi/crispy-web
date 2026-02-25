'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useRef, useState, useCallback, type ReactNode } from 'react';

const THRESHOLD = 80;

export default function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pullDistance, setPullDistance] = useState(0);
  const pulling = useRef(false);
  const startY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY <= 0 && !isPending) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [isPending]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || isPending) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.4, 120));
    }
  }, [isPending]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= THRESHOLD && !isPending) {
      startTransition(() => {
        router.refresh();
      });
    }
    setPullDistance(0);
    pulling.current = false;
  }, [pullDistance, isPending, router, startTransition]);

  const showIndicator = isPending || pullDistance > 0;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: isPending ? 48 : pullDistance > 0 ? pullDistance : 0 }}
      >
        {showIndicator && (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-muted ${isPending ? 'animate-spin' : ''}`}
            style={
              isPending
                ? undefined
                : { transform: `rotate(${Math.min((pullDistance / THRESHOLD) * 360, 360)}deg)` }
            }
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        )}
      </div>

      {children}
    </div>
  );
}
