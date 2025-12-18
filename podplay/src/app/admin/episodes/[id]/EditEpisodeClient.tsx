'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { usePodcasts } from '@/hooks/usePodcasts';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Category, CATEGORIES } from '@/types';

const EMOJI_OPTIONS = ['🎙️', '💡', '🚀', '🎯', '💻', '🌟', '🎵', '📚', '🎬', '🌈'];

// 단일 이모지 검증 함수
function isValidSingleEmoji(str: string): boolean {
  if (!str) return false;
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;
  return emojiRegex.test(str);
}

// 문자열에서 첫 번째 이모지만 추출
function extractFirstEmoji(str: string): string | null {
  const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/u;
  const match = str.match(emojiRegex);
  return match ? match[0] : null;
}

interface EditEpisodeClientProps {
  id: string;
}

export function EditEpisodeClient({ id }: EditEpisodeClientProps) {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuthContext();
  const { getPodcastById, isLoading: podcastsLoading, refetch } = usePodcasts();
  const router = useRouter();

  const podcast = getPodcastById(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    emoji: '🎙️',
    category: '기술' as Category,
    tags: '',
    duration: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCustomEmoji, setShowCustomEmoji] = useState(false);
  const [customEmojiInput, setCustomEmojiInput] = useState('');

  // Load podcast data into form
  useEffect(() => {
    if (podcast) {
      setFormData({
        title: podcast.title,
        description: podcast.description || '',
        emoji: podcast.emoji,
        category: podcast.category,
        tags: podcast.tags.join(', '),
        duration: podcast.duration,
      });
    }
  }, [podcast]);

  // Auth check
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/admin/login');
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  if (authLoading || podcastsLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">에피소드를 찾을 수 없습니다</h1>
        <Link
          href="/admin/episodes"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);

      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const response = await fetch(`/api/admin/podcasts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          emoji: formData.emoji,
          category: formData.category,
          tags,
          duration: formData.duration,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '저장에 실패했습니다.');
      }

      setSuccess(true);
      await refetch();

      setTimeout(() => {
        setSuccess(false);
        router.push('/admin/episodes');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const formatDurationInput = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseDurationInput = (value: string) => {
    const parts = value.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10) || 0;
      const secs = parseInt(parts[1], 10) || 0;
      return mins * 60 + secs;
    }
    return parseInt(value, 10) || 0;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card-bg border-b border-card-border">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/admin/episodes"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            ← 뒤로
          </Link>
          <h1 className="text-xl font-bold text-foreground">에피소드 수정</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
            저장되었습니다!
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
              설명 (Markdown 지원)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="에피소드에 대한 설명을 입력하세요. 링크: [텍스트](URL)"
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              이모지
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, emoji });
                    setShowCustomEmoji(false);
                    setCustomEmojiInput('');
                  }}
                  className={`w-12 h-12 text-2xl rounded-lg border transition-colors ${
                    formData.emoji === emoji && !showCustomEmoji
                      ? 'border-primary bg-primary/10'
                      : 'border-card-border bg-card-bg hover:border-primary/50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
              {/* Custom emoji button */}
              <button
                type="button"
                onClick={() => setShowCustomEmoji(!showCustomEmoji)}
                className={`w-12 h-12 text-lg rounded-lg border transition-colors ${
                  showCustomEmoji
                    ? 'border-primary bg-primary/10'
                    : 'border-card-border bg-card-bg hover:border-primary/50'
                }`}
                title="직접 입력"
              >
                ✏️
              </button>
            </div>
            {/* Custom emoji input */}
            {showCustomEmoji && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customEmojiInput}
                  onChange={(e) => {
                    const input = e.target.value;
                    const emoji = extractFirstEmoji(input);
                    if (emoji) {
                      setCustomEmojiInput(emoji);
                      setFormData({ ...formData, emoji });
                    } else if (input === '') {
                      setCustomEmojiInput('');
                    }
                  }}
                  className="w-20 h-12 text-2xl text-center bg-card-bg border border-card-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="🎉"
                  maxLength={4}
                />
                {customEmojiInput && isValidSingleEmoji(customEmojiInput) && (
                  <span className="text-green-500 text-sm">✓ 유효한 이모지</span>
                )}
                <span className="text-xs text-foreground/50">이모지 1개만 입력</span>
              </div>
            )}
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

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              재생시간 (분:초)
            </label>
            <input
              type="text"
              value={formatDurationInput(formData.duration)}
              onChange={(e) => setFormData({ ...formData, duration: parseDurationInput(e.target.value) })}
              className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              placeholder="예: 15:30"
            />
            <p className="mt-1 text-xs text-foreground/50">
              총 {formData.duration}초
            </p>
          </div>

          {/* File info (read-only) */}
          <div className="bg-card-bg border border-card-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">파일 정보 (수정 불가)</h3>
            <div className="text-sm text-foreground/60 space-y-1">
              <p>파일 키: {podcast.fileKey}</p>
              <p>파일 크기: {(podcast.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
              <p>생성일: {new Date(podcast.createdAt).toLocaleString('ko-KR')}</p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </span>
              ) : (
                '저장'
              )}
            </button>
            <Link
              href="/admin/episodes"
              className="px-6 py-3 bg-card-bg border border-card-border text-foreground rounded-lg font-medium hover:bg-card-border transition-colors text-center"
            >
              취소
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
