"use client";

import { useState } from "react";
import type { SessionUser } from "@/lib/session";

interface AuthFooterProps {
  user?: SessionUser | null;
}

export function AuthFooter({ user }: AuthFooterProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center pointer-events-none z-40">
      {/* 펼쳐진 패널 */}
      {open && (
        <div className="pointer-events-auto w-full max-w-xs mb-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg px-5 py-4 flex flex-col items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2.5">
                {user.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
              </div>
              <a
                href="/auth/logout"
                className="w-full text-center px-4 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                로그아웃
              </a>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400 dark:text-gray-500">관리자 로그인</p>
              <a
                href="/auth/login"
                className="w-full text-center px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google로 로그인
              </a>
            </>
          )}
        </div>
      )}

      {/* 역삼각형 토글 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "관리자 메뉴 닫기" : "관리자 메뉴 열기"}
        className="pointer-events-auto mb-2 flex items-center justify-center w-7 h-4 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 10 6"
          fill="currentColor"
        >
          <path d="M0 0l5 6 5-6z" />
        </svg>
      </button>
    </div>
  );
}
