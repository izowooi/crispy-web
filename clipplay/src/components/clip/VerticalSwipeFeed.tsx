'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Clip } from '@/types';
import { getVideoUrl, formatDuration } from '@/lib/r2/client';
import Link from 'next/link';

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

interface VerticalSwipeFeedProps {
  clips: Clip[];
  initialIndex?: number;
}

export function VerticalSwipeFeed({ clips, initialIndex = 0 }: VerticalSwipeFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  const currentClip = clips[currentIndex];

  // Handle video play/pause
  const togglePlay = useCallback(() => {
    const video = videoRefs.current[currentIndex];
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [currentIndex]);

  // Handle mute toggle
  const toggleMute = useCallback(() => {
    const video = videoRefs.current[currentIndex];
    if (video) {
      video.muted = !video.muted;
      setIsMuted(!isMuted);
    }
  }, [currentIndex, isMuted]);

  // Navigate to next/prev clip
  const goToClip = useCallback((index: number) => {
    if (index < 0 || index >= clips.length) return;

    // Pause current video
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.pause();
      currentVideo.currentTime = 0;
    }

    setCurrentIndex(index);
    setProgress(0);
    setIsPlaying(false);
  }, [clips.length, currentIndex]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diff = touchStartY.current - touchEndY.current;
    const threshold = 50;

    if (diff > threshold) {
      // Swipe up - next clip
      goToClip(currentIndex + 1);
    } else if (diff < -threshold) {
      // Swipe down - previous clip
      goToClip(currentIndex - 1);
    }
  };

  // Wheel handler for desktop
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      goToClip(currentIndex + 1);
    } else if (e.deltaY < 0) {
      goToClip(currentIndex - 1);
    }
  }, [currentIndex, goToClip]);

  // Add wheel event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Auto-play current video
  useEffect(() => {
    const video = videoRefs.current[currentIndex];
    if (video) {
      video.muted = isMuted;
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay blocked, stay paused
        setIsPlaying(false);
      });
    }
  }, [currentIndex, isMuted]);

  // Update progress
  useEffect(() => {
    const video = videoRefs.current[currentIndex];
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Optionally auto-advance to next clip
      // goToClip(currentIndex + 1);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex]);

  if (clips.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center text-foreground/50">
        <div className="text-center">
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
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen w-full overflow-hidden bg-black relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video container */}
      <div
        className="h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateY(-${currentIndex * 100}%)` }}
      >
        {clips.map((clip, index) => (
          <div
            key={clip.id}
            className="h-screen w-full flex items-center justify-center relative"
          >
            <video
              ref={(el) => { videoRefs.current[index] = el; }}
              src={getVideoUrl(R2_PUBLIC_URL, clip.fileKey)}
              className="max-h-full max-w-full object-contain"
              playsInline
              loop
              muted={isMuted}
              preload={Math.abs(index - currentIndex) <= 1 ? 'auto' : 'none'}
              onClick={togglePlay}
            />

            {/* Overlay info */}
            {index === currentIndex && (
              <>
                {/* Progress bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
                  <div
                    className="h-full bg-white transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Clip info */}
                <div className="absolute bottom-20 left-4 right-16 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{clip.emoji}</span>
                    <h2 className="text-lg font-semibold drop-shadow-lg">
                      {clip.title}
                    </h2>
                  </div>
                  {clip.description && (
                    <p className="text-sm text-white/80 line-clamp-2 drop-shadow-lg">
                      {clip.description}
                    </p>
                  )}
                  <p className="text-xs text-white/60 mt-2">
                    {formatDuration(clip.duration)}
                  </p>
                </div>

                {/* Right side actions */}
                <div className="absolute bottom-24 right-4 flex flex-col gap-4">
                  {/* Mute toggle */}
                  <button
                    onClick={toggleMute}
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
                  >
                    {isMuted ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </button>

                  {/* Share / Link to detail */}
                  <Link
                    href={`/clip/${clip.id}`}
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </Link>
                </div>

                {/* Play/Pause indicator */}
                {!isPlaying && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    onClick={togglePlay}
                  >
                    <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                      <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Clip counter */}
      <div className="absolute top-4 right-4 text-white/60 text-sm bg-black/30 px-2 py-1 rounded">
        {currentIndex + 1} / {clips.length}
      </div>

      {/* Navigation hints */}
      {currentIndex > 0 && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-white/40">
          <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>
      )}
      {currentIndex < clips.length - 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40">
          <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}
    </div>
  );
}
