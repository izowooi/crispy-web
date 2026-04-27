"use client";

import { useState } from "react";

interface PasswordGateProps {
  onSuccess: () => void;
}

export function PasswordGate({ onSuccess }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      onSuccess();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎭</div>
          <h1 className="text-3xl font-bold mb-2">MojiPop</h1>
          <p className="text-muted text-sm">AI 이모티콘 생성기</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-2">접근 암호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="암호를 입력하세요"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">암호가 올바르지 않습니다.</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "확인 중..." : "입장"}
          </button>
        </form>
      </div>
    </div>
  );
}
