'use client';

import Link from 'next/link';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function ThemeTestPage() {
  const { theme, resolvedTheme, setTheme, mounted } = useTheme();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-screen-md mx-auto">
        <Link href="/test" className="text-primary hover:underline mb-4 inline-block">
          ← 테스트 대시보드
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">다크모드 테스트</h1>

        {/* Theme toggle */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">테마 토글 버튼</h2>
          <ThemeToggle />
        </div>

        {/* Current state */}
        <div className="mb-8 p-4 bg-card-bg border border-card-border rounded-xl">
          <h2 className="text-lg font-semibold text-foreground mb-4">현재 상태</h2>
          <div className="space-y-2 text-foreground/70">
            <p>
              <span className="font-medium">저장된 테마:</span> {theme}
            </p>
            <p>
              <span className="font-medium">적용된 테마:</span> {resolvedTheme}
            </p>
            <p>
              <span className="font-medium">마운트 상태:</span> {mounted ? '완료' : '진행 중'}
            </p>
          </div>
        </div>

        {/* Theme selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">테마 선택</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`
                px-4 py-2 rounded-lg transition-colors
                ${theme === 'light'
                  ? 'bg-primary text-white'
                  : 'bg-card-bg border border-card-border text-foreground hover:border-primary'
                }
              `}
            >
              라이트
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`
                px-4 py-2 rounded-lg transition-colors
                ${theme === 'dark'
                  ? 'bg-primary text-white'
                  : 'bg-card-bg border border-card-border text-foreground hover:border-primary'
                }
              `}
            >
              다크
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`
                px-4 py-2 rounded-lg transition-colors
                ${theme === 'system'
                  ? 'bg-primary text-white'
                  : 'bg-card-bg border border-card-border text-foreground hover:border-primary'
                }
              `}
            >
              시스템
            </button>
          </div>
        </div>

        {/* Color preview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">색상 미리보기</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-background border border-card-border rounded-lg">
              <p className="text-foreground font-medium">배경 (background)</p>
              <p className="text-foreground/60 text-sm">var(--background)</p>
            </div>
            <div className="p-4 bg-card-bg border border-card-border rounded-lg">
              <p className="text-foreground font-medium">카드 배경 (card-bg)</p>
              <p className="text-foreground/60 text-sm">var(--card-bg)</p>
            </div>
            <div className="p-4 bg-primary rounded-lg">
              <p className="text-white font-medium">Primary</p>
              <p className="text-white/60 text-sm">var(--primary)</p>
            </div>
            <div className="p-4 bg-primary-hover rounded-lg">
              <p className="text-white font-medium">Primary Hover</p>
              <p className="text-white/60 text-sm">var(--primary-hover)</p>
            </div>
          </div>
        </div>

        {/* localStorage */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">localStorage</h2>
          <pre className="p-4 bg-card-bg border border-card-border rounded-lg text-sm">
            podplay-theme: {mounted ? localStorage.getItem('podplay-theme') || '(없음)' : '...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
