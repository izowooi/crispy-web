'use client';

import { useEffect, useState, useMemo } from 'react';
import { useClips } from '@/hooks/useClips';
import { useRouter } from 'next/navigation';
import { VerticalSwipeFeed } from '@/components/clip/VerticalSwipeFeed';
import { Clip } from '@/types';
import Link from 'next/link';

export default function MemoriesPlayPage() {
  const { clips, isLoading } = useClips();
  const router = useRouter();
  const [clipIds, setClipIds] = useState<string[]>([]);

  // Load clip IDs from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('memoryClipIds');
    if (stored) {
      try {
        setClipIds(JSON.parse(stored));
      } catch {
        router.push('/memories');
      }
    } else {
      router.push('/memories');
    }
  }, [router]);

  // Get full clip objects from IDs
  const memoryClips = useMemo(() => {
    if (clips.length === 0 || clipIds.length === 0) return [];

    const clipMap = new Map(clips.map((c) => [c.id, c]));
    return clipIds
      .map((id) => clipMap.get(id))
      .filter((c): c is Clip => c !== undefined);
  }, [clips, clipIds]);

  if (isLoading || clipIds.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (memoryClips.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
        <p className="mb-4">재생할 영상이 없습니다.</p>
        <Link
          href="/memories"
          className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
        >
          뒤로가기
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Back button */}
      <Link
        href="/memories"
        className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-black/50 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Link>

      {/* Memories label */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1 bg-primary/80 backdrop-blur rounded-full text-white text-sm font-medium">
        추억 모음
      </div>

      <VerticalSwipeFeed clips={memoryClips} />
    </div>
  );
}
