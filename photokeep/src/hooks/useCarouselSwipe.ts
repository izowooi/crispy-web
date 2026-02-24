'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useCarouselSensitivity } from './useCarouselSettings';

interface UseCarouselSwipeOptions {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  itemCount: number;
  onIndexChange?: (index: number) => void;
}

export function useCarouselSwipe({
  scrollRef,
  itemCount,
  onIndexChange,
}: UseCarouselSwipeOptions) {
  const { sensitivity } = useCarouselSensitivity();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const currentIdx = useRef(0);
  const isSwiping = useRef(false);
  const isVertical = useRef(false);
  const startScrollLeft = useRef(0);

  const goToIndex = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(itemCount - 1, index));
      currentIdx.current = clamped;
      el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
      onIndexChange?.(clamped);
    },
    [scrollRef, itemCount, onIndexChange]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || itemCount <= 1) return;

    function handleTouchStart(e: TouchEvent) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
      isVertical.current = false;
      startScrollLeft.current = el!.scrollLeft;
      // Sync current index from actual scroll position
      currentIdx.current = Math.round(el!.scrollLeft / el!.clientWidth);
    }

    function handleTouchMove(e: TouchEvent) {
      if (isVertical.current) return;

      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Not enough movement to decide yet
      if (!isSwiping.current && absDx < 8 && absDy < 8) return;

      // Vertical scroll detected - don't interfere
      if (!isSwiping.current && absDy > absDx) {
        isVertical.current = true;
        return;
      }

      // Horizontal swipe - take control
      isSwiping.current = true;
      e.preventDefault();

      // Follow finger by adjusting scrollLeft
      const maxScroll = (itemCount - 1) * el!.clientWidth;
      const target = startScrollLeft.current - dx;
      el!.scrollLeft = Math.max(0, Math.min(maxScroll, target));
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!isSwiping.current) return;

      const dx = e.changedTouches[0].clientX - touchStartX.current;

      if (Math.abs(dx) >= sensitivity) {
        if (dx < 0) {
          goToIndex(currentIdx.current + 1);
        } else {
          goToIndex(currentIdx.current - 1);
        }
      } else {
        // Snap back
        goToIndex(currentIdx.current);
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollRef, itemCount, sensitivity, goToIndex]);

  const syncIndex = useCallback((index: number) => {
    currentIdx.current = index;
  }, []);

  return { goToIndex, syncIndex };
}
