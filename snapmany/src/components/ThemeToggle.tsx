"use client";

import { useEffect, useState } from "react";

/**
 * 우측 상단 헤더에 들어가는 라이트/다크 모드 토글.
 *
 * 시인성 결정:
 * - 이모지(☀️/🌙)는 OS·폰트에 따라 렌더링이 다르고 작게 보이는 경우가 많아 사용 안 함.
 * - 인라인 SVG (Lucide 톤) — currentColor 상속, 다크/라이트에서 동일하게 또렷.
 * - 현재 모드가 아닌 "전환될 모드"의 아이콘을 표시 (라이트 상태에서는 달, 다크 상태에서는 해).
 * - hydration mismatch 방지를 위해 첫 mount 전에는 동일 크기의 placeholder 버튼 렌더.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (typeof document === "undefined") return;
    if (next) {
      document.documentElement.classList.add("dark");
      try {
        localStorage.setItem("theme", "dark");
      } catch {
        /* ignore — Safari private 등에서 차단 가능 */
      }
    } else {
      document.documentElement.classList.remove("dark");
      try {
        localStorage.setItem("theme", "light");
      } catch {
        /* ignore */
      }
    }
  }

  const baseClass =
    "inline-flex items-center justify-center rounded-full border border-border bg-card/60 w-10 h-10 text-foreground transition-all duration-200 hover:text-accent hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  if (!mounted) {
    // SSR/hydration 동안 같은 크기의 placeholder. 사용자 클릭 입력 받지 않음.
    return (
      <span
        aria-hidden="true"
        className={`${baseClass} pointer-events-none opacity-60`}
      />
    );
  }

  const label = dark ? "라이트 모드로 전환" : "다크 모드로 전환";

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      aria-label={label}
      title={label}
      className={baseClass}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
