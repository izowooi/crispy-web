'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePodcasts } from '@/hooks/usePodcasts';
import { PodcastGrid, CategoryFilter, SearchBar } from '@/components/podcast';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { InstallPrompt } from '@/components/ui/InstallPrompt';

export default function Home() {
  const [showAdmin, setShowAdmin] = useState(false);
  const {
    filteredPodcasts,
    categories,
    isLoading,
    error,
    category,
    searchQuery,
    setCategory,
    setSearchQuery,
  } = usePodcasts();

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-card-border">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">
              Podplay
            </h1>
            <ThemeToggle />
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
        {/* Category filter */}
        <div className="mb-6">
          <CategoryFilter
            selected={category}
            categories={categories}
            onChange={setCategory}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
            {error}
          </div>
        )}

        {/* Podcast grid */}
        <PodcastGrid podcasts={filteredPodcasts} isLoading={isLoading} />

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

      {/* PWA Install prompt */}
      <InstallPrompt />
    </div>
  );
}
