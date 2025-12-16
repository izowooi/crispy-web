import { describe, it, expect } from 'vitest';
import { parseMetadata, filterPodcasts, getAudioUrl } from '@/lib/r2/client';
import { Metadata, Podcast } from '@/types';

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
      description: '오늘 하루 이야기',
      emoji: '☕',
      category: '일상',
      tags: ['일상'],
      fileKey: 'audio/2.mp3',
      fileSize: 10000000,
      duration: 480,
      createdAt: '2025-01-14T10:00:00Z',
      updatedAt: '2025-01-14T10:00:00Z',
    },
    {
      id: '3',
      title: '오늘의 뉴스',
      emoji: '📰',
      category: '뉴스',
      tags: ['뉴스', '시사'],
      fileKey: 'audio/3.mp3',
      fileSize: 12000000,
      duration: 540,
      createdAt: '2025-01-13T10:00:00Z',
      updatedAt: '2025-01-13T10:00:00Z',
    },
  ],
  categories: ['기술', '일상', '뉴스'],
  allowedUploaders: ['admin@gmail.com'],
};

describe('parseMetadata', () => {
  it('should parse valid metadata JSON', () => {
    const jsonString = JSON.stringify(mockMetadata);
    const result = parseMetadata(jsonString);
    expect(result.podcasts).toHaveLength(3);
    expect(result.categories).toContain('기술');
  });

  it('should throw on invalid JSON', () => {
    expect(() => parseMetadata('invalid json')).toThrow();
  });

  it('should throw on missing required fields', () => {
    const invalidMetadata = { podcasts: [] };
    expect(() => parseMetadata(JSON.stringify(invalidMetadata))).toThrow();
  });
});

describe('filterPodcasts', () => {
  const podcasts = mockMetadata.podcasts;

  it('should return all podcasts when category is "all" and no search query', () => {
    const result = filterPodcasts(podcasts, 'all', '');
    expect(result).toHaveLength(3);
  });

  it('should filter by category', () => {
    const result = filterPodcasts(podcasts, '기술', '');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('AI 기술 트렌드');
  });

  it('should filter by search text in title', () => {
    const result = filterPodcasts(podcasts, 'all', 'AI');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by search text in description', () => {
    const result = filterPodcasts(podcasts, 'all', '하루');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('should combine category and search filters', () => {
    const result = filterPodcasts(podcasts, '기술', 'AI');
    expect(result).toHaveLength(1);
  });

  it('should return empty array when no matches', () => {
    const result = filterPodcasts(podcasts, 'all', 'nonexistent');
    expect(result).toHaveLength(0);
  });

  it('should be case-insensitive for search', () => {
    const result = filterPodcasts(podcasts, 'all', 'ai');
    expect(result).toHaveLength(1);
  });
});

describe('getAudioUrl', () => {
  it('should construct correct audio URL', () => {
    const baseUrl = 'https://r2.example.com';
    const fileKey = 'audio/1.mp3';
    const result = getAudioUrl(baseUrl, fileKey);
    expect(result).toBe('https://r2.example.com/audio/1.mp3');
  });

  it('should handle trailing slash in base URL', () => {
    const baseUrl = 'https://r2.example.com/';
    const fileKey = 'audio/1.mp3';
    const result = getAudioUrl(baseUrl, fileKey);
    expect(result).toBe('https://r2.example.com/audio/1.mp3');
  });
});
