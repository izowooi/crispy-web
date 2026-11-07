'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Clip } from '@/types';
import { filterClips, getClipById } from '@/lib/clips/catalog';

interface UseClipsReturn {
  clips: Clip[];
  filteredClips: Clip[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getClipById: (id: string) => Clip | undefined;
  refetch: (skipCache?: boolean) => Promise<void>;
  refresh: () => Promise<void>; // Force refresh (skip cache)
}

export function useClips(): UseClipsReturn {
  const [clips, setClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async (skipCache: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/clips', skipCache ? { cache: 'no-store' } : undefined);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data: { clips: Clip[] } = await response.json();
      setClips(Array.isArray(data.clips) ? data.clips : []);
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

  const filteredClips = useMemo(() => {
    return filterClips(clips, searchQuery);
  }, [clips, searchQuery]);

  const getClipByIdFn = useCallback(
    (id: string) => {
      return getClipById(clips, id);
    },
    [clips]
  );

  // Refresh function that always skips cache
  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return {
    clips,
    filteredClips,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    getClipById: getClipByIdFn,
    refetch: fetchData,
    refresh, // Force refresh (skip cache)
  };
}
