'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/context/AuthContext';

export const runtime = 'edge';

interface UploadResult {
  success?: boolean;
  clip?: {
    id: string;
    title: string;
    fileKey: string;
    fileSize: number;
  };
  error?: string;
}

export default function UploadTestPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuthContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎬');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill title from filename
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      setResult({ error: 'File and title are required' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim());
      formData.append('emoji', emoji);
      formData.append('description', 'Test upload');

      // Get video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(selectedFile);
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });
      formData.append('duration', String(Math.floor(video.duration)));
      URL.revokeObjectURL(video.src);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setSelectedFile(null);
        setTitle('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/test" className="text-foreground/60 hover:text-foreground">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Upload Test</h1>
        </div>

        {/* Auth Check */}
        <div className="bg-card-bg border border-card-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Authentication Check</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-foreground/60">Auth Loading:</span>
              <span className="text-foreground">{String(authLoading)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-foreground/60">Authenticated:</span>
              <span className={isAuthenticated ? 'text-green-500' : 'text-red-500'}>
                {String(isAuthenticated)}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-foreground/60">Admin:</span>
              <span className={isAdmin ? 'text-green-500' : 'text-red-500'}>
                {String(isAdmin)}
              </span>
            </div>
          </div>

          {!isAuthenticated && !authLoading && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-400">
              You must be logged in as an admin to upload files.{' '}
              <Link href="/test/auth" className="underline">
                Go to login test
              </Link>
            </div>
          )}
        </div>

        {/* Upload Form */}
        <div className="bg-card-bg border border-card-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Upload Form</h2>

          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Video File (max 200MB)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                disabled={!isAdmin || isUploading}
                className="w-full px-4 py-3 bg-background border border-card-border rounded-lg text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer disabled:opacity-50"
              />
            </div>

            {/* File Info */}
            {selectedFile && (
              <div className="p-4 bg-background rounded-lg border border-card-border">
                <h3 className="text-sm font-medium text-foreground mb-2">Selected File</h3>
                <div className="text-xs font-mono text-foreground/60 space-y-1">
                  <div>Name: {selectedFile.name}</div>
                  <div>Size: {formatFileSize(selectedFile.size)}</div>
                  <div>Type: {selectedFile.type}</div>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!isAdmin || isUploading}
                placeholder="Enter clip title"
                className="w-full px-4 py-3 bg-background border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>

            {/* Emoji */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Emoji
              </label>
              <div className="flex gap-2">
                {['🎬', '🎥', '📹', '🌟', '💕', '🎉'].map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    disabled={!isAdmin || isUploading}
                    className={`w-12 h-12 text-2xl rounded-lg border transition-colors ${
                      emoji === e
                        ? 'border-primary bg-primary/10'
                        : 'border-card-border bg-background hover:border-primary/50'
                    } disabled:opacity-50`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-foreground/60">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!isAdmin || !selectedFile || !title.trim() || isUploading}
              className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-card-bg border border-card-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Upload Result</h2>

            {result.error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
                Error: {result.error}
              </div>
            )}

            {result.success && result.clip && (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
                  Upload successful!
                </div>
                <pre className="p-4 bg-background rounded-lg overflow-x-auto text-xs font-mono text-foreground/80">
                  {JSON.stringify(result.clip, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
