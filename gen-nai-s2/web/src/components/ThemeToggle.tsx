"use client";

export function ThemeToggle() {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }
  return <button type="button" onClick={toggle} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-700">Theme</button>;
}
