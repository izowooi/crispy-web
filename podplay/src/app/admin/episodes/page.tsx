'use client';

import { useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { usePodcasts } from '@/hooks/usePodcasts';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { formatDuration, formatFileSize } from '@/lib/r2/client';

export default function AdminEpisodesPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuthContext();
  const { podcasts, isLoading: podcastsLoading, refetch } = usePodcasts();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 에피소드를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/podcasts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '삭제에 실패했습니다.');
      }

      // Refetch podcasts list
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
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
          <h1 className="text-xl font-bold text-foreground">에피소드 관리</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-screen-xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
            {error}
          </div>
        )}

        {podcasts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground/60 mb-4">등록된 에피소드가 없습니다.</p>
            <Link
              href="/admin/upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              새 에피소드 업로드
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {podcasts.map((podcast) => (
              <div
                key={podcast.id}
                className="bg-card-bg border border-card-border rounded-xl p-4 flex items-center gap-4"
              >
                {/* Emoji */}
                <span className="text-4xl">{podcast.emoji}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{podcast.title}</h3>
                  <p className="text-sm text-foreground/60 truncate">{podcast.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-foreground/50">
                    <span>{podcast.category}</span>
                    <span>•</span>
                    <span>{formatDuration(podcast.duration)}</span>
                    <span>•</span>
                    <span>{formatFileSize(podcast.fileSize)}</span>
                    <span>•</span>
                    <span>{new Date(podcast.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/episodes/${podcast.id}`}
                    className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                  >
                    수정
                  </Link>
                  <button
                    onClick={() => handleDelete(podcast.id, podcast.title)}
                    disabled={deletingId === podcast.id}
                    className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {deletingId === podcast.id ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
