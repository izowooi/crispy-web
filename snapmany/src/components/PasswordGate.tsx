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

      if (res.status === 401) {
        setError("암호가 올바르지 않습니다.");
      } else if (res.status === 500) {
        setError("서버 설정 오류입니다. 관리자에게 문의해주세요.");
      } else {
        setError("확인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
      setPassword("");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-testid="password-gate"
      className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground"
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">SnapMany</h1>
          <p className="text-muted text-sm">한 장의 사진으로 여러 스타일을</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-6 space-y-4"
          aria-label="접근 암호 입력"
        >
          <div>
            <label htmlFor="snapmany-access-password" className="block text-sm font-medium mb-2">
              접근 암호
            </label>
            <input
              id="snapmany-access-password"
              data-testid="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="암호를 입력하세요"
              autoFocus
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {error !== null && (
            <p data-testid="password-error" role="alert" className="text-red-500 text-sm text-center">
              {error}
            </p>
          )}

          <button
            data-testid="password-submit"
            type="submit"
            disabled={loading || password.length === 0}
            className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "확인 중..." : "입장"}
          </button>
        </form>
      </div>
    </div>
  );
}
