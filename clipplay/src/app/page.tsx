'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useClips } from '@/hooks/useClips';
import { VerticalSwipeFeed, SearchBar, ClipList } from '@/components/clip';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { InstallPrompt } from '@/components/ui/InstallPrompt';

export default function Home() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'feed' | 'list'>('feed');
  const {
    filteredClips,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
  } = useClips();

  // Show list view when searching
  const showListView = viewMode === 'list' || searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen">
      {showListView ? (
        // List view with header
        <>
          {/* Header */}
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-card-border">
            <div className="max-w-screen-xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-foreground">
                  ClipPlay
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setViewMode('feed');
                      setSearchQuery('');
                    }}
                    className="p-2 text-foreground/60 hover:text-foreground transition-colors"
                    title="피드로 보기"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <ThemeToggle />
                </div>
              </div>

              {/* Search */}
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          </header>

          {/* Main content */}
          <main className="max-w-screen-xl mx-auto px-4 py-6">
            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
                {error}
              </div>
            )}

            {/* Clip list */}
            <ClipList clips={filteredClips} isLoading={isLoading} />

            {/* Hidden admin section */}
            <div className="mt-12 pt-8 border-t border-card-border">
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="flex items-center gap-2 text-xs text-foreground/30 hover:text-foreground/50 transition-colors"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${showAdmin ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                관리자
              </button>
              {showAdmin && (
                <div className="mt-3 pl-5">
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-card-bg border border-card-border rounded-lg text-foreground/60 hover:text-foreground hover:border-primary/50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    관리자 페이지
                  </Link>
                </div>
              )}
            </div>
          </main>
        </>
      ) : (
        // Full screen feed view
        <>
          {/* Floating header */}
          <header className="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between pointer-events-none">
            <h1 className="text-xl font-bold text-white drop-shadow-lg pointer-events-auto">
              ClipPlay
            </h1>
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setViewMode('list')}
                className="p-2 text-white/80 hover:text-white transition-colors bg-black/30 rounded-full backdrop-blur"
                title="목록으로 보기"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="p-2 text-white/80 hover:text-white transition-colors bg-black/30 rounded-full backdrop-blur"
                title="관리자"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </header>

          {/* Admin panel */}
          {showAdmin && (
            <div className="fixed top-16 right-4 z-50 bg-card-bg border border-card-border rounded-lg p-3 shadow-lg">
              <Link
                href="/admin"
                className="flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors"
              >
                관리자 페이지
              </Link>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="fixed top-16 left-4 right-4 z-50 p-4 bg-red-500/90 rounded-lg text-white">
              {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading ? (
            <div className="h-screen flex items-center justify-center bg-black">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <VerticalSwipeFeed clips={filteredClips} />
          )}
        </>
      )}

      {/* PWA Install prompt */}
      <InstallPrompt />
    </div>
  );
}
