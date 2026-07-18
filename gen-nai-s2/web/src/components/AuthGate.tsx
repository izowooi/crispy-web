"use client";

import { useEffect, useState, type ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "guest" | "ready">("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/auth").then((r) => r.json()).then((data) => setState(data.authenticated ? "ready" : "guest")).catch(() => setState("guest"));
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    if (response.ok) setState("ready");
    else setError("비밀번호를 확인해주세요.");
  }

  if (state === "loading") return <main className="grid min-h-screen place-items-center text-sm text-gray-500">세션 확인 중…</main>;
  if (state === "guest") return (
    <main className="grid min-h-screen place-items-center p-5">
      <form onSubmit={login} className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-7 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">Private studio</p>
        <h1 className="mt-2 text-2xl font-bold">gen-nai-s2</h1>
        <p className="mt-2 text-sm text-gray-500">NovelAI 생성 큐에 접근하려면 비밀번호를 입력하세요.</p>
        <input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-6 w-full rounded-xl border border-gray-200 bg-transparent px-4 py-3 outline-none focus:border-violet-500 dark:border-gray-700" placeholder="Access password" />
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <button className="mt-4 w-full rounded-xl bg-violet-600 py-3 font-semibold text-white hover:bg-violet-500">입장</button>
      </form>
    </main>
  );
  return children;
}
