"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function AdminBar({ isAdmin, onAuthChange }: { isAdmin: boolean; onAuthChange: () => Promise<void> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setOpen(false);
      setPassword("");
      await onAuthChange();
      startTransition(() => router.refresh());
    } else {
      setError("비밀번호가 틀렸습니다.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    await onAuthChange();
    startTransition(() => router.refresh());
  }

  if (isAdmin) {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
          관리자 모드
        </span>
        <button
          onClick={handleLogout}
          disabled={pending}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 transition-colors"
        >
          관리자
        </button>
      ) : (
        <form onSubmit={handleLogin} className="flex items-center gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoFocus
            className="w-32 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-gray-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          >
            확인
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setError(""); }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
          >
            취소
          </button>
          {error && <span className="text-xs text-red-500 dark:text-red-400">{error}</span>}
        </form>
      )}
    </div>
  );
}
