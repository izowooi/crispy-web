"use client";

import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggle}
      className="rounded-lg border border-border p-2 text-muted hover:text-foreground hover:border-accent transition-colors"
      title={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
