'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Metadata, Clip } from '@/types';
import { parseMetadata, filterClips, getClipById } from '@/lib/r2/client';

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
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async (skipCache: boolean = false) => {
    const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    if (!r2Url) {
      setError('R2 URL이 설정되지 않았습니다.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Add cache-busting parameter when skipping cache
      const url = skipCache
        ? `${r2Url}/metadata.json?t=${Date.now()}`
        : `${r2Url}/metadata.json`;

      const response = await fetch(url, {
        ...(skipCache && { cache: 'no-store' }),
      });

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

  const clips = metadata?.clips ?? [];

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
