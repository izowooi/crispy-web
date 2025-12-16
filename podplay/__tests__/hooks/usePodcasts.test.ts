import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePodcasts } from '@/hooks/usePodcasts';
import { Metadata } from '@/types';

const mockMetadata: Metadata = {
  podcasts: [
    {
      id: '1',
      title: 'AI 기술 트렌드',
      description: '최신 AI 기술 동향',
      emoji: '🤖',
      category: '기술',
      tags: ['AI', '개발'],
      fileKey: 'audio/1.mp3',
      fileSize: 15000000,
      duration: 600,
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z',
    },
    {
      id: '2',
      title: '일상 이야기',
      emoji: '☕',
      category: '일상',
      tags: ['일상'],
      fileKey: 'audio/2.mp3',
      fileSize: 10000000,
      duration: 480,
      createdAt: '2025-01-14T10:00:00Z',
      updatedAt: '2025-01-14T10:00:00Z',
    },
  ],
  categories: ['기술', '일상', '뉴스'],
  allowedUploaders: ['admin@gmail.com'],
};

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('usePodcasts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Set environment variable
    vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://r2.example.com');
  });

  it('should start with loading state', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockMetadata)),
    });

    const { result } = renderHook(() => usePodcasts());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.podcasts).toEqual([]);
  });

  it('should fetch and return podcasts', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockMetadata)),
    });

    const { result } = renderHook(() => usePodcasts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.podcasts).toHaveLength(2);
    expect(result.current.categories).toContain('기술');
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePodcasts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.podcasts).toEqual([]);
  });

  it('should filter podcasts by category', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockMetadata)),
    });

    const { result } = renderHook(() => usePodcasts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.setCategory('기술');

    await waitFor(() => {
      expect(result.current.filteredPodcasts).toHaveLength(1);
      expect(result.current.filteredPodcasts[0].title).toBe('AI 기술 트렌드');
    });
  });

  it('should filter podcasts by search query', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockMetadata)),
    });

    const { result } = renderHook(() => usePodcasts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.setSearchQuery('AI');

    await waitFor(() => {
      expect(result.current.filteredPodcasts).toHaveLength(1);
    });
  });

  it('should get podcast by ID', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockMetadata)),
    });

    const { result } = renderHook(() => usePodcasts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const podcast = result.current.getPodcastById('1');
    expect(podcast?.title).toBe('AI 기술 트렌드');
  });

  it('should return undefined for non-existent podcast ID', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockMetadata)),
    });

    const { result } = renderHook(() => usePodcasts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const podcast = result.current.getPodcastById('nonexistent');
    expect(podcast).toBeUndefined();
  });
});
