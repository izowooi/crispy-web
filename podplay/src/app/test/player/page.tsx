'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { AudioPlayer } from '@/components/player';
import { Podcast } from '@/types';

// Sample podcasts for testing
const samplePodcasts: Podcast[] = [
  {
    id: 'sample-1',
    title: '테스트 에피소드 1',
    description: '이것은 테스트용 에피소드입니다.',
    emoji: '🎙️',
    category: '기술',
    tags: ['테스트'],
    fileKey: 'audio/sample-1.mp3',
    fileSize: 1000000,
    duration: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sample-2',
    title: '테스트 에피소드 2',
    description: '두 번째 테스트 에피소드입니다.',
    emoji: '🎵',
    category: '일상',
    tags: ['샘플'],
    fileKey: 'audio/sample-2.mp3',
    fileSize: 2000000,
    duration: 120,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function PlayerTestPage() {
  const { state, actions } = usePlayer();
  const [customUrl, setCustomUrl] = useState('');

  const handlePlaySample = (podcast: Podcast) => {
    actions.play(podcast);
  };

  const handlePlayCustomUrl = () => {
    if (!customUrl) return;

    const customPodcast: Podcast = {
      id: 'custom',
      title: '커스텀 오디오',
      emoji: '🎧',
      category: '기타',
      tags: [],
      fileKey: customUrl,
      fileSize: 0,
      duration: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    actions.play(customPodcast);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-screen-md mx-auto">
        <Link href="/test" className="text-primary hover:underline mb-4 inline-block">
          ← 테스트 대시보드
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">오디오 플레이어 테스트</h1>

        {/* Player component */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">플레이어</h2>
          <AudioPlayer />
        </div>

        {/* Sample podcasts */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">샘플 에피소드</h2>
          <div className="space-y-2">
            {samplePodcasts.map((podcast) => (
              <button
                key={podcast.id}
                onClick={() => handlePlaySample(podcast)}
                className={`
                  w-full p-4 text-left rounded-lg border transition-colors
                  ${state.currentPodcast?.id === podcast.id
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card-bg border-card-border hover:border-primary'
                  }
                `}
              >
                <span className="mr-2">{podcast.emoji}</span>
                {podcast.title}
              </button>
            ))}
          </div>
        </div>

        {/* Custom URL */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">커스텀 오디오 URL</h2>
          <div className="flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/audio.mp3"
              className="flex-1 px-4 py-2 bg-card-bg border border-card-border rounded-lg text-foreground"
            />
            <button
              onClick={handlePlayCustomUrl}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              재생
            </button>
          </div>
        </div>

        {/* State display */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">현재 상태</h2>
          <pre className="p-4 bg-card-bg border border-card-border rounded-lg text-sm overflow-auto">
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>

        {/* Controls test */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">컨트롤 테스트</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => actions.play()}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              재생
            </button>
            <button
              onClick={() => actions.pause()}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              일시정지
            </button>
            <button
              onClick={() => actions.seek(0)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              처음으로
            </button>
            <button
              onClick={() => actions.setVolume(0)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              음소거
            </button>
            <button
              onClick={() => actions.setVolume(1)}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              최대 볼륨
            </button>
            <button
              onClick={() => actions.setPlaybackRate(1.5)}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              1.5x 속도
            </button>
            <button
              onClick={() => actions.setPlaybackRate(1)}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              1x 속도
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
