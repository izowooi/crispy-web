"use client";

import { useState, useEffect } from "react";

const ACCESS_PASSWORD = process.env.NEXT_PUBLIC_ACCESS_PASSWORD ?? "";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [hasError, setHasError] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem("auth");
    setAuthenticated(auth === "true");
  }, []);

  if (authenticated === null) return null;

  if (authenticated) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ACCESS_PASSWORD || input === ACCESS_PASSWORD) {
      sessionStorage.setItem("auth", "true");
      setAuthenticated(true);
    } else {
      setHasError(true);
      setShaking(true);
      setInput("");
      setTimeout(() => setShaking(false), 450);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div
        className={`w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl ${shaking ? "animate-shake" : ""}`}
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎬</div>
          <h1 className="text-2xl font-bold text-foreground">Seedance Studio</h1>
          <p className="text-sm text-muted mt-2">입장 비밀번호를 입력해주세요</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setHasError(false);
            }}
            placeholder="비밀번호"
            autoFocus
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder-muted focus:border-accent focus:outline-none transition-colors"
          />
          {hasError && (
            <p className="text-sm text-red-500 text-center">
              비밀번호가 올바르지 않습니다
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-accent py-3 text-white font-semibold hover:bg-accent-hover transition-colors"
          >
            입장하기
          </button>
        </form>
      </div>
    </div>
  );
}
