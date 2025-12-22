'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useClips } from '@/hooks/useClips';
import { Clip } from '@/types';

export default function VideoTestPage() {
  const { clips, isLoading, error, refetch } = useClips();
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  const getVideoUrl = (clip: Clip) => {
    return `${r2Url}/${clip.fileKey}`;
  };

  const handleSelectClip = (clip: Clip) => {
    setSelectedClip(clip);
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/test" className="text-foreground/60 hover:text-foreground">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Video Player Test</h1>
        </div>

        {/* Video Player */}
        <div className="bg-card-bg border border-card-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Video Player</h2>
            <button
              onClick={refetch}
              disabled={isLoading}
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

          {selectedClip ? (
            <div className="space-y-4">
              {/* Video Element */}
              <div className="aspect-[9/16] max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={getVideoUrl(selectedClip)}
                  className="w-full h-full object-contain"
                  playsInline
                  muted={isMuted}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  onClick={handlePlayPause}
                />
              </div>

              {/* Controls */}
              <div className="space-y-4">
                {/* Progress */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-card-border rounded-full appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-foreground/60">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handlePlayPause}
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="px-6 py-3 bg-card-border text-foreground rounded-lg hover:bg-card-border/80"
                  >
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>

                {/* Info */}
                <div className="p-4 bg-background rounded-lg border border-card-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{selectedClip.emoji}</span>
                    <span className="font-medium text-foreground">{selectedClip.title}</span>
                  </div>
                  <div className="text-xs font-mono text-foreground/60 space-y-1">
                    <div>ID: {selectedClip.id}</div>
                    <div className="break-all">URL: {getVideoUrl(selectedClip)}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-foreground/60">
              Select a clip from the list below to play
            </div>
          )}
        </div>

        {/* Clips List */}
        <div className="bg-card-bg border border-card-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Available Clips ({clips.length})
          </h2>

          {isLoading ? (
            <div className="text-center py-8 text-foreground/60">Loading...</div>
          ) : clips.length === 0 ? (
            <div className="text-center py-8 text-foreground/60">
              No clips available.{' '}
              <Link href="/test/upload" className="text-primary hover:underline">
                Upload a clip
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {clips.map((clip) => (
                <button
                  key={clip.id}
                  onClick={() => handleSelectClip(clip)}
                  className={`w-full p-4 text-left rounded-lg border transition-colors ${
                    selectedClip?.id === clip.id
                      ? 'border-primary bg-primary/10'
                      : 'border-card-border bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{clip.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {clip.title}
                      </div>
                      <div className="text-xs text-foreground/60">
                        {formatTime(clip.duration)} • {(clip.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                    <span className="text-primary">▶</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
