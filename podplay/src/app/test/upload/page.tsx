'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Category, CATEGORIES } from '@/types';
import { formatFileSize } from '@/lib/r2/client';

interface User {
  email: string;
  name: string;
  picture: string;
  isAdmin: boolean;
}

export default function UploadTestPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🎙️');
  const [category, setCategory] = useState<Category>('기술');
  const [tags, setTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setIsLoadingUser(true);
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } finally {
      setIsLoadingUser(false);
    }
  };

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
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      setError('파일과 제목은 필수입니다.');
      return;
    }

    if (!user?.isAdmin) {
      setError('업로드 권한이 없습니다. 관리자로 로그인하세요.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('emoji', emoji);
      formData.append('category', category);
      formData.append('tags', tags);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '업로드에 실패했습니다.');
      }

      setSuccess(true);
      handleReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setEmoji('🎙️');
    setCategory('기술');
    setTags('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-screen-md mx-auto">
        <Link href="/test" className="text-primary hover:underline mb-4 inline-block">
          ← 테스트 대시보드
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">파일 업로드 테스트</h1>

        {/* Auth status */}
        <div className="mb-8 p-4 bg-card-bg border border-card-border rounded-xl">
          <h2 className="text-lg font-semibold text-foreground mb-2">인증 상태</h2>
          {isLoadingUser ? (
            <p className="text-foreground/60">로딩 중...</p>
          ) : user ? (
            <div className="flex items-center gap-3">
              {user.picture && (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
              )}
              <div>
                <p className="text-foreground">{user.name}</p>
                <p className="text-xs">
                  <span className={`px-2 py-0.5 rounded-full ${
                    user.isAdmin
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                      : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {user.isAdmin ? '관리자 (업로드 가능)' : '일반 사용자 (업로드 불가)'}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-foreground/60 mb-2">로그인이 필요합니다.</p>
              <Link href="/test/auth" className="text-primary hover:underline text-sm">
                로그인 페이지로 이동 →
              </Link>
            </div>
          )}
        </div>

        {/* File input */}
        <div className="mb-6">
          <label className="block text-foreground font-medium mb-2">
            오디오 파일 (필수)
          </label>
          <div
            className="border-2 border-dashed border-card-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? (
              <div>
                <p className="text-foreground font-medium">{file.name}</p>
                <p className="text-foreground/60 text-sm">
                  {formatFileSize(file.size)} • {file.type}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-foreground/60">클릭하여 파일 선택</p>
                <p className="text-foreground/40 text-sm">오디오 파일 (최대 70MB)</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-foreground font-medium mb-2">
            제목 (필수)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="에피소드 제목"
            className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground"
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-foreground font-medium mb-2">
            설명 (선택)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="에피소드 설명"
            rows={3}
            className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground resize-none"
          />
        </div>

        {/* Emoji and Category */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-foreground font-medium mb-2">
              이모지
            </label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground text-center text-2xl"
            />
          </div>
          <div>
            <label className="block text-foreground font-medium mb-2">
              카테고리 (필수)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="block text-foreground font-medium mb-2">
            태그 (선택, 쉼표로 구분)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="AI, 개발, 기술"
            className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500">
            업로드가 완료되었습니다!
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={isUploading || !file || !title || !user?.isAdmin}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                업로드 중...
              </span>
            ) : (
              '업로드'
            )}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-3 bg-card-bg border border-card-border text-foreground rounded-lg hover:bg-card-border transition-colors"
          >
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}
