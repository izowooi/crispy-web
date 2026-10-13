"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggleTheme() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // The visual toggle still works when storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-panel px-3 text-xs font-semibold text-ink transition hover:bg-panel-muted"
      aria-label="라이트 또는 다크 테마로 전환"
      title="테마 전환"
    >
      <Moon size={15} className="dark:hidden" />
      <Sun size={15} className="hidden dark:block" />
      <span className="hidden sm:block dark:sm:hidden">Dark</span>
      <span className="hidden dark:sm:block">Light</span>
    </button>
  );
}
