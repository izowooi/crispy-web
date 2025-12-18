'use client';

import { useState, useRef } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Category, CATEGORIES } from '@/types';
const EMOJI_OPTIONS = ['🎙️', '💡', '🚀', '🎯', '💻', '🌟', '🎵', '📚', '🎬', '🌈'];

export default function AdminUploadPage() {
  const { isAuthenticated, isAdmin, isLoading } = useAuthContext();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    emoji: '🎙️',
    category: '기술' as Category,
    tags: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 70 * 1024 * 1024) {
        setError('파일 크기는 70MB를 초과할 수 없습니다.');
        return;
      }
      if (!selectedFile.type.startsWith('audio/')) {
        setError('오디오 파일만 업로드할 수 있습니다.');
        return;
      }
      setFile(selectedFile);
      setError(null);

      // Get actual duration using Audio API
      const audio = new Audio();
      audio.src = URL.createObjectURL(selectedFile);
      audio.onloadedmetadata = () => {
        setDuration(Math.round(audio.duration));
        URL.revokeObjectURL(audio.src);
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('오디오 파일을 선택해주세요.');
      return;
    }

    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('emoji', formData.emoji);
      uploadFormData.append('category', formData.category);
      uploadFormData.append('tags', formData.tags);
      if (duration !== null) {
        uploadFormData.append('duration', duration.toString());
      }

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '업로드에 실패했습니다.');
      }

      setSuccess(true);
      setFormData({
        title: '',
        description: '',
        emoji: '🎙️',
        category: '기술',
        tags: '',
      });
      setFile(null);
      setDuration(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card-bg border-b border-card-border">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/admin"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            ← 뒤로
          </Link>
          <h1 className="text-xl font-bold text-foreground">새 에피소드 업로드</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
            에피소드가 성공적으로 업로드되었습니다!
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File upload */}
          <div className="bg-card-bg border border-card-border rounded-2xl p-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              오디오 파일 *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="w-full text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer hover:file:bg-primary/90"
            />
            {file && (
              <p className="mt-2 text-sm text-foreground/60">
                선택됨: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
            <p className="mt-2 text-xs text-foreground/40">
              최대 70MB, 오디오 파일만 가능
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              제목 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              placeholder="에피소드 제목을 입력하세요"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="에피소드에 대한 설명을 입력하세요"
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              이모지
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, emoji })}
                  className={`w-12 h-12 text-2xl rounded-lg border transition-colors ${
                    formData.emoji === emoji
                      ? 'border-primary bg-primary/10'
                      : 'border-card-border bg-card-bg hover:border-primary/50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              카테고리
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
              className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              태그
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              placeholder="쉼표로 구분하여 입력 (예: AI, 기술, 트렌드)"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={uploading}
            className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                업로드 중... {uploadProgress > 0 && `(${uploadProgress}%)`}
              </span>
            ) : (
              '업로드'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
