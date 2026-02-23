'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { Photo } from '@/types/database';

interface PhotoCarouselProps {
  photos: Photo[];
}

// 전체화면 라이트박스 컴포넌트
function Lightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // 초기 인덱스로 스크롤 이동 (애니메이션 없이)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = initialIndex * el.clientWidth;
  }, [initialIndex]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentIndex(index);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 배경 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* 상단 바: 카운터 + 닫기 버튼 */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-white/70">
          {currentIndex + 1} / {photos.length}
        </span>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="닫기"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* 사진 스와이프 영역 - 클릭하면 닫기 */}
      <div
        ref={scrollRef}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onClick={onClose}
      >
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="flex w-screen flex-shrink-0 snap-start items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt=""
              className="max-h-full max-w-full object-contain"
              style={{ maxHeight: 'calc(100dvh - 60px)' }}
              draggable={false}
              // 이미지 자체 클릭은 닫히지 않게 (스와이프와 구분)
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ))}
      </div>

      {/* 하단 dot 인디케이터 */}
      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-8 pt-3">
          {photos.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === currentIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 피드용 캐러셀 컴포넌트
export default function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentIndex(index);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (photos.length === 0) return null;

  // 사진 1장
  if (photos.length === 1) {
    return (
      <>
        <button
          className="relative aspect-[3/4] w-full overflow-hidden bg-black"
          onClick={() => setLightboxIndex(0)}
          aria-label="사진 크게 보기"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[0].url}
            alt=""
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </button>

        {lightboxIndex !== null && (
          <Lightbox
            photos={photos}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </>
    );
  }

  // 사진 여러 장 캐러셀
  return (
    <>
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              className="aspect-[3/4] w-full flex-shrink-0 snap-start overflow-hidden bg-black"
              onClick={() => setLightboxIndex(i)}
              aria-label={`사진 ${i + 1} 크게 보기`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>

        {/* 카운터 배지 */}
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          {currentIndex + 1}/{photos.length}
        </span>

        {/* Dot 인디케이터 */}
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {photos.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === currentIndex ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
