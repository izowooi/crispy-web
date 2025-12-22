'use client';

import Link from 'next/link';
import { useClips } from '@/hooks/useClips';
import { VideoPlayer } from '@/components/player';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { formatDuration, formatFileSize } from '@/lib/r2/client';

interface ClipClientProps {
  id: string;
}

export function ClipClient({ id }: ClipClientProps) {
  const { getClipById, isLoading } = useClips();

  const clip = getClipById(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">클립을 찾을 수 없습니다</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-card-border">
        <div className="max-w-screen-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              돌아가기
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-screen-md mx-auto px-4 py-8">
        {/* Video Player */}
        <VideoPlayer clip={clip} className="mb-6" />

        {/* Metadata */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 text-sm text-foreground/50 mb-6">
            <span>{formatDuration(clip.duration)}</span>
            <span>•</span>
            <span>{formatFileSize(clip.fileSize)}</span>
            <span>•</span>
            <span>{new Date(clip.createdAt).toLocaleDateString('ko-KR')}</span>
          </div>

          {/* Share button */}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: clip.title,
                  text: clip.description || clip.title,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('링크가 복사되었습니다!');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-card-bg border border-card-border rounded-lg text-foreground/70 hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            공유하기
          </button>
        </div>
      </main>
    </div>
  );
}
