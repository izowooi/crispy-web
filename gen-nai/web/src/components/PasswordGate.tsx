"use client";

import { useState } from "react";

export type PasswordGateProps = {
  onSuccess: () => void;
};

export function PasswordGate({ onSuccess }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || password.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        onSuccess();
        return;
      }

      setError(res.status === 401 ? "암호가 올바르지 않습니다." : "확인에 실패했습니다.");
      setPassword("");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      data-testid="password-gate"
      className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-bg)] px-4 py-8 text-[var(--color-fg)]"
    >
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">gen-nai</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-mute)]">
            접근 암호를 입력해 주세요
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          aria-label="접근 암호 입력"
          className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 shadow-sm"
        >
          <div>
            <label
              htmlFor="gennai-access-password"
              className="mb-2 block text-sm font-medium text-[var(--color-fg-dim)]"
            >
              접근 암호
            </label>
            <input
              id="gennai-access-password"
              data-testid="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="암호를 입력하세요"
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-base outline-none transition-colors focus:border-[var(--color-accent)]"
            />
          </div>

          {error !== null && (
            <p data-testid="password-error" role="alert" className="text-center text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <button
            data-testid="password-submit"
            type="submit"
            disabled={loading || password.length === 0}
            className="w-full rounded-xl bg-[var(--color-accent)] py-3 text-base font-semibold text-[var(--color-accent-fg)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:bg-[var(--color-bg-elev-2)] disabled:text-[var(--color-fg-mute)]"
          >
            {loading ? "확인 중..." : "입장"}
          </button>
        </form>
      </div>
    </main>
  );
}
