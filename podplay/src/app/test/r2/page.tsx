'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePodcasts } from '@/hooks/usePodcasts';
import { getAudioUrl } from '@/lib/r2/client';

export default function R2TestPage() {
  const { podcasts, categories, isLoading, error, refetch } = usePodcasts();
  const [testAudioUrl, setTestAudioUrl] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);

  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

  const handleTestAudio = (fileKey: string) => {
    const url = getAudioUrl(r2Url, fileKey);
    setTestAudioUrl(url);
    setAudioError(null);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-screen-md mx-auto">
        <Link href="/test" className="text-primary hover:underline mb-4 inline-block">
          ← 테스트 대시보드
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">R2 연결 테스트</h1>

        {/* R2 URL */}
        <div className="mb-8 p-4 bg-card-bg border border-card-border rounded-xl">
          <h2 className="text-lg font-semibold text-foreground mb-2">R2 Public URL</h2>
          <p className="text-foreground/70 font-mono text-sm break-all">
            {r2Url || '(설정되지 않음 - NEXT_PUBLIC_R2_PUBLIC_URL)'}
          </p>
        </div>

        {/* Fetch metadata */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">metadata.json</h2>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              다시 불러오기
            </button>
          </div>

          {isLoading && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500">
              로딩 중...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
              에러: {error}
            </div>
          )}

          {!isLoading && !error && (
            <div className="space-y-4">
              {/* Categories */}
              <div className="p-4 bg-card-bg border border-card-border rounded-lg">
                <h3 className="font-medium text-foreground mb-2">
                  카테고리 ({categories.length}개)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Podcasts */}
              <div className="p-4 bg-card-bg border border-card-border rounded-lg">
                <h3 className="font-medium text-foreground mb-2">
                  에피소드 ({podcasts.length}개)
                </h3>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {podcasts.map((podcast) => (
                    <div
                      key={podcast.id}
                      className="flex items-center justify-between p-2 bg-background rounded"
                    >
                      <span className="text-foreground">
                        {podcast.emoji} {podcast.title}
                      </span>
                      <button
                        onClick={() => handleTestAudio(podcast.fileKey)}
                        className="text-sm text-primary hover:underline"
                      >
                        오디오 테스트
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audio streaming test */}
        {testAudioUrl && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">오디오 스트리밍 테스트</h2>
            <div className="p-4 bg-card-bg border border-card-border rounded-xl">
              <p className="text-sm text-foreground/60 mb-2 break-all">URL: {testAudioUrl}</p>
              <audio
                src={testAudioUrl}
                controls
                className="w-full"
                onError={() => setAudioError('오디오를 불러올 수 없습니다.')}
                onCanPlay={() => setAudioError(null)}
              />
              {audioError && (
                <p className="mt-2 text-red-500 text-sm">{audioError}</p>
              )}
            </div>
          </div>
        )}

        {/* Raw JSON */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Raw Data</h2>
          <pre className="p-4 bg-card-bg border border-card-border rounded-lg text-sm overflow-auto max-h-96">
            {JSON.stringify({ podcasts, categories }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
