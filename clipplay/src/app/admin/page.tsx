'use client';

import { useAuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card-bg border-b border-card-border">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">관리자 대시보드</h1>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm text-foreground">{user.name}</span>
              </div>
            )}
            <button
              onClick={logout}
              className="text-sm text-foreground/60 hover:text-foreground transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-screen-xl mx-auto px-4 py-8">
        {!isAdmin ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 text-center">
            <p className="text-yellow-600 dark:text-yellow-400 font-medium">
              업로드 권한이 없습니다.
            </p>
            <p className="text-foreground/60 text-sm mt-2">
              관리자에게 {user?.email} 이메일의 권한 추가를 요청하세요.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Upload card */}
            <Link
              href="/admin/upload"
              className="bg-card-bg border border-card-border rounded-2xl p-6 hover:border-primary/50 transition-colors group"
            >
              <div className="text-4xl mb-4">📤</div>
              <h2 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                새 클립 업로드
              </h2>
              <p className="text-foreground/60 text-sm">
                새로운 동영상 클립을 업로드합니다.
              </p>
            </Link>

            {/* Clips card */}
            <Link
              href="/admin/clips"
              className="bg-card-bg border border-card-border rounded-2xl p-6 hover:border-primary/50 transition-colors group"
            >
              <div className="text-4xl mb-4">📋</div>
              <h2 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                클립 관리
              </h2>
              <p className="text-foreground/60 text-sm">
                기존 클립을 수정하거나 삭제합니다.
              </p>
            </Link>

            {/* Home link */}
            <Link
              href="/"
              className="bg-card-bg border border-card-border rounded-2xl p-6 hover:border-primary/50 transition-colors group"
            >
              <div className="text-4xl mb-4">🏠</div>
              <h2 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                홈으로 이동
              </h2>
              <p className="text-foreground/60 text-sm">
                메인 피드로 이동합니다.
              </p>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
