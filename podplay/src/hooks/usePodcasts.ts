'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Metadata, Podcast, Category } from '@/types';
import { parseMetadata, filterPodcasts, getPodcastById } from '@/lib/r2/client';

interface UsePodcastsReturn {
  podcasts: Podcast[];
  filteredPodcasts: Podcast[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  category: Category | 'all';
  searchQuery: string;
  setCategory: (category: Category | 'all') => void;
  setSearchQuery: (query: string) => void;
  getPodcastById: (id: string) => Podcast | undefined;
  refetch: () => Promise<void>;
}

export function usePodcasts(): UsePodcastsReturn {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    if (!r2Url) {
      setError('R2 URL이 설정되지 않았습니다.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${r2Url}/metadata.json`);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const jsonString = await response.text();
      const parsed = parseMetadata(jsonString);
      setMetadata(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const podcasts = metadata?.podcasts ?? [];
  const categories = (metadata?.categories ?? []) as Category[];

  const filteredPodcasts = useMemo(() => {
    return filterPodcasts(podcasts, category, searchQuery);
  }, [podcasts, category, searchQuery]);

  const getPodcastByIdFn = useCallback(
    (id: string) => {
      return getPodcastById(podcasts, id);
    },
    [podcasts]
  );

  return {
    podcasts,
    filteredPodcasts,
    categories,
    isLoading,
    error,
    category,
    searchQuery,
    setCategory,
    setSearchQuery,
    getPodcastById: getPodcastByIdFn,
    refetch: fetchData,
  };
}
