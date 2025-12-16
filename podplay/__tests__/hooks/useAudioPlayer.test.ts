import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { Podcast } from '@/types';

const mockPodcast: Podcast = {
  id: '1',
  title: 'Test Podcast',
  description: 'Test description',
  emoji: '🎙️',
  category: '기술',
  tags: ['test'],
  fileKey: 'audio/1.mp3',
  fileSize: 15000000,
  duration: 600,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
};

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAudioPlayer());

    expect(result.current.state.currentPodcast).toBeNull();
    expect(result.current.state.isPlaying).toBe(false);
    expect(result.current.state.currentTime).toBe(0);
    expect(result.current.state.duration).toBe(0);
    expect(result.current.state.volume).toBe(1);
    expect(result.current.state.playbackRate).toBe(1);
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('should set current podcast on play', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current.actions.play(mockPodcast);
    });

    expect(result.current.state.currentPodcast).toEqual(mockPodcast);
  });

  it('should toggle isPlaying state', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current.actions.play(mockPodcast);
    });

    expect(result.current.state.isPlaying).toBe(true);

    act(() => {
      result.current.actions.pause();
    });

    expect(result.current.state.isPlaying).toBe(false);
  });

  it('should update volume', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current.actions.setVolume(0.5);
    });

    expect(result.current.state.volume).toBe(0.5);
  });

  it('should clamp volume between 0 and 1', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current.actions.setVolume(1.5);
    });
    expect(result.current.state.volume).toBe(1);

    act(() => {
      result.current.actions.setVolume(-0.5);
    });
    expect(result.current.state.volume).toBe(0);
  });

  it('should update playback rate', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current.actions.setPlaybackRate(1.5);
    });

    expect(result.current.state.playbackRate).toBe(1.5);
  });

  it('should clamp playback rate between 0.5 and 2', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current.actions.setPlaybackRate(3);
    });
    expect(result.current.state.playbackRate).toBe(2);

    act(() => {
      result.current.actions.setPlaybackRate(0.1);
    });
    expect(result.current.state.playbackRate).toBe(0.5);
  });

  it('should resume playback of same podcast', () => {
    const { result } = renderHook(() => useAudioPlayer());

    // First play
    act(() => {
      result.current.actions.play(mockPodcast);
    });
    expect(result.current.state.isPlaying).toBe(true);

    // Pause
    act(() => {
      result.current.actions.pause();
    });
    expect(result.current.state.isPlaying).toBe(false);

    // Resume (play without new podcast)
    act(() => {
      result.current.actions.play();
    });
    expect(result.current.state.isPlaying).toBe(true);
    expect(result.current.state.currentPodcast).toEqual(mockPodcast);
  });

  it('should switch to new podcast when different podcast is played', () => {
    const { result } = renderHook(() => useAudioPlayer());
    const anotherPodcast: Podcast = { ...mockPodcast, id: '2', title: 'Another Podcast' };

    act(() => {
      result.current.actions.play(mockPodcast);
    });

    act(() => {
      result.current.actions.play(anotherPodcast);
    });

    expect(result.current.state.currentPodcast?.id).toBe('2');
    expect(result.current.state.currentTime).toBe(0);
  });
});
