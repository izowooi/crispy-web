'use client';

import Link from 'next/link';
import { usePodcasts } from '@/hooks/usePodcasts';
import { PodcastGrid, CategoryFilter, SearchBar } from '@/components/podcast';
import { MiniPlayer } from '@/components/player';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function Home() {
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
            <div className="flex items-center gap-2">
              <Link
                href="/test"
                className="px-3 py-1.5 text-sm text-foreground/60 hover:text-foreground transition-colors"
              >
                테스트
              </Link>
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
      </main>

      {/* Mini player */}
      <MiniPlayer />
    </div>
  );
}
