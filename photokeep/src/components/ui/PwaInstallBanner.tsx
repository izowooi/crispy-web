'use client';

import { useState, useEffect } from 'react';

type Platform = 'android' | 'ios' | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'photokeep-pwa-install-dismissed';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return null;
}

function isAlreadyInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return false;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isAlreadyInstalled()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const detected = detectPlatform();

    if (detected === 'ios') {
      setPlatform('ios');
      setVisible(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform('android');
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-[70] mx-auto max-w-lg px-4 pb-2">
      <div className="rounded-2xl border border-border bg-background p-4 shadow-xl shadow-black/10">
        {platform === 'android' && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192x192.png"
              alt="PhotoKeep"
              className="h-11 w-11 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-foreground">
                홈 화면에 추가
              </p>
              <p className="mt-0.5 text-xs text-muted">앱처럼 빠르게 열 수 있어요</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={install}
                className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-opacity active:opacity-70"
              >
                설치
              </button>
              <button
                onClick={dismiss}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground"
                aria-label="닫기"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {platform === 'ios' && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">홈 화면에 추가하기</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Safari 하단의{' '}
                  <span className="inline-flex items-center gap-0.5 align-middle">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </span>{' '}
                  공유 버튼 →{' '}
                  <strong className="font-medium text-foreground">홈 화면에 추가</strong>
                </p>
              </div>
              <button
                onClick={dismiss}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground"
                aria-label="닫기"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
