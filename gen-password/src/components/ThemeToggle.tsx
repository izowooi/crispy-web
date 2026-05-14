"use client";

import { Dictionary } from "@/lib/i18n";

export type Theme = "light" | "dark";

interface Props {
  theme: Theme;
  onToggle: () => void;
  dict: Dictionary;
}

export function ThemeToggle({ theme, onToggle, dict }: Props) {
  const isDark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      aria-label={isDark ? dict.themeLight : dict.themeDark}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 bg-white text-lg hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
