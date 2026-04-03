"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface HeroNavigationProps {
  heroName: string;
  prevId: string | null;
  nextId: string | null;
}

export function HeroNavigation({ heroName, prevId, nextId }: HeroNavigationProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && prevId) router.push(`/heroes/${prevId}`);
      if (e.key === "ArrowRight" && nextId) router.push(`/heroes/${nextId}`);
      if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prevId, nextId, router]);

  return (
    <div className="flex items-center gap-3 mb-6">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mr-auto"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        목록
      </Link>

      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-xs hidden sm:block">
        {heroName}
      </span>

      <div className="flex items-center gap-2">
        {prevId ? (
          <Link
            href={`/heroes/${prevId}`}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            이전
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            이전
          </span>
        )}
        {nextId ? (
          <Link
            href={`/heroes/${nextId}`}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
          >
            다음
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed">
            다음
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>

      <span className="text-xs text-gray-400 dark:text-gray-500 hidden md:block">
        ← → 키로 이동, ESC로 목록 복귀
      </span>
    </div>
  );
}
