'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Metadata, Clip } from '@/types';

export default function R2TestPage() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  const fetchMetadata = async () => {
    if (!r2Url) {
      setError('R2 Public URL is not configured');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRawResponse(null);

    try {
      const response = await fetch(`${r2Url}/metadata.json`, {
        cache: 'no-store',
      });

      const text = await response.text();
      setRawResponse(text);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = JSON.parse(text);
      setMetadata(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metadata');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (r2Url) {
      fetchMetadata();
    }
  }, [r2Url]);

  const getVideoUrl = (clip: Clip) => {
    return `${r2Url}/${clip.fileKey}`;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/test" className="text-foreground/60 hover:text-foreground">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-foreground">R2 Connection Test</h1>
        </div>

        {/* R2 Configuration */}
        <div className="bg-card-bg border border-card-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">R2 Configuration</h2>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex gap-2">
              <span className="text-foreground/60">R2 Public URL:</span>
              <span className="text-foreground break-all">{r2Url || '(not set)'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-foreground/60">Metadata URL:</span>
              <span className="text-primary break-all">
                {r2Url ? `${r2Url}/metadata.json` : '(not set)'}
              </span>
            </div>
          </div>
        </div>

        {/* Fetch Test */}
        <div className="bg-card-bg border border-card-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Metadata Fetch Test</h2>
            <button
              onClick={fetchMetadata}
              disabled={isLoading || !r2Url}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 mb-4">
              Error: {error}
            </div>
          )}

          {metadata && (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
                Successfully fetched metadata.json
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-foreground/60">Clips Count:</span>
                  <span className="text-foreground font-semibold">{metadata.clips?.length || 0}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-foreground/60">Allowed Uploaders:</span>
                  <span className="text-foreground">
                    {metadata.allowedUploaders?.join(', ') || '(none)'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clips List */}
        {metadata?.clips && metadata.clips.length > 0 && (
          <div className="bg-card-bg border border-card-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Clips ({metadata.clips.length})</h2>
            <div className="space-y-3">
              {metadata.clips.map((clip) => (
                <div
                  key={clip.id}
                  className="p-4 bg-background rounded-lg border border-card-border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{clip.emoji}</span>
                    <span className="font-medium text-foreground">{clip.title}</span>
                  </div>
                  <div className="text-xs font-mono text-foreground/60 space-y-1">
                    <div>ID: {clip.id}</div>
                    <div>File Key: {clip.fileKey}</div>
                    <div>Size: {(clip.fileSize / (1024 * 1024)).toFixed(2)} MB</div>
                    <div>Duration: {clip.duration}s</div>
                    <div className="break-all">
                      Video URL:{' '}
                      <a
                        href={getVideoUrl(clip)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {getVideoUrl(clip)}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw Response */}
        {rawResponse && (
          <div className="bg-card-bg border border-card-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Raw Response</h2>
            <pre className="p-4 bg-background rounded-lg overflow-x-auto text-xs font-mono text-foreground/80">
              {rawResponse}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
