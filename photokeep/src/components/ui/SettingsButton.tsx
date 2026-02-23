'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  email: string;
  name: string;
  picture: string;
}

const ADMIN_EMAILS = ['izowooi85@gmail.com', 'ansaemi0@gmail.com'];

export default function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');

  useEffect(() => {
    // Load saved theme
    const saved = localStorage.getItem('photokeep-theme') as 'system' | 'light' | 'dark' | null;
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    }

    // Fetch user
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  function applyTheme(t: 'system' | 'light' | 'dark') {
    const root = document.documentElement;
    if (t === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', t);
    }
  }

  function changeTheme(t: 'system' | 'light' | 'dark') {
    setTheme(t);
    applyTheme(t);
    localStorage.setItem('photokeep-theme', t);
  }

  const isAdminUser = user && ADMIN_EMAILS.includes(user.email);

  return (
    <>
      {/* Floating gear button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-18 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-sm transition-colors hover:bg-foreground/20"
        aria-label="설정"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>

      {/* Backdrop + Drawer */}
      {open && (
        <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Bottom sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto max-w-lg rounded-t-2xl bg-background p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="mb-4 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-foreground/20" />
            </div>

            <h2 className="mb-4 text-base font-semibold">설정</h2>

            {/* User section */}
            <div className="mb-4 border-b border-border pb-4">
              {user ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-10 w-10 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                  </div>
                  <a
                    href="/api/auth/logout"
                    className="text-xs text-muted hover:text-foreground"
                  >
                    로그아웃
                  </a>
                </div>
              ) : (
                <a
                  href="/api/auth/login"
                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium hover:bg-foreground/5"
                >
                  <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Google로 로그인
                </a>
              )}
            </div>

            {/* Theme section */}
            <div className="mb-4 border-b border-border pb-4">
              <p className="mb-2 text-xs font-medium text-muted">테마</p>
              <div className="flex gap-2">
                {(['system', 'light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => changeTheme(t)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      theme === t
                        ? 'border-foreground bg-foreground/10 font-semibold'
                        : 'border-border hover:bg-foreground/5'
                    }`}
                  >
                    {t === 'system' ? '시스템' : t === 'light' ? '라이트' : '다크'}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin section */}
            {isAdminUser && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted">관리자</p>
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-foreground/5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  관리자 페이지
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
