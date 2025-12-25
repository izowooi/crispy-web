'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useClips } from '@/hooks/useClips';
import { VerticalSwipeFeed, SearchBar, GridView } from '@/components/clip';
import { BottomTabNav } from '@/components/ui/BottomTabNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { InstallPrompt } from '@/components/ui/InstallPrompt';

export default function Home() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const {
    filteredClips,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refresh,
  } = useClips();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen pb-16">
      {viewMode === 'grid' ? (
        // Grid view with header
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
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 text-foreground/60 hover:text-foreground transition-colors disabled:opacity-50"
                    title="새로고침"
                  >
                    <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowAdmin(!showAdmin)}
                    className="p-2 text-foreground/60 hover:text-foreground transition-colors"
                    title="설정"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Search */}
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          </header>

          {/* Settings panel */}
          {showAdmin && (
            <div className="fixed top-20 right-4 z-50 bg-card-bg border border-card-border rounded-lg p-3 shadow-lg">
              <div className="flex items-center justify-between gap-4 mb-2 pb-2 border-b border-card-border">
                <span className="text-sm text-foreground/80">테마</span>
                <ThemeToggle />
              </div>
              <Link
                href="/admin"
                className="flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors"
              >
                관리자 페이지
              </Link>
            </div>
          )}

          {/* Main content */}
          <main className="max-w-screen-xl mx-auto">
            {/* Error message */}
            {error && (
              <div className="mx-4 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
                {error}
              </div>
            )}

            {/* Grid view */}
            <GridView clips={filteredClips} isLoading={isLoading} />
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
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-white/80 hover:text-white transition-colors bg-black/30 rounded-full backdrop-blur disabled:opacity-50"
                title="새로고침"
              >
                <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="p-2 text-white/80 hover:text-white transition-colors bg-black/30 rounded-full backdrop-blur"
                title="설정"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </header>

          {/* Settings panel */}
          {showAdmin && (
            <div className="fixed top-16 right-4 z-50 bg-card-bg border border-card-border rounded-lg p-3 shadow-lg">
              <div className="flex items-center justify-between gap-4 mb-2 pb-2 border-b border-card-border">
                <span className="text-sm text-foreground/80">테마</span>
                <ThemeToggle />
              </div>
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

      {/* Bottom Tab Navigation */}
      <BottomTabNav activeTab={viewMode} onTabChange={setViewMode} />

      {/* PWA Install prompt */}
      <InstallPrompt />
    </div>
  );
}
