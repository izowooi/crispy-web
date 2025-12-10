"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { TestCase } from "@/types";
import type { User, Session } from "@supabase/supabase-js";

export default function AuthTestPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: "supabase-init",
      name: "Supabase 클라이언트 초기화",
      description: "환경변수로 Supabase 클라이언트 생성",
      status: "pending",
    },
    {
      id: "check-session",
      name: "세션 확인",
      description: "현재 로그인 세션 상태 확인",
      status: "pending",
    },
    {
      id: "google-login",
      name: "Google 로그인",
      description: "Google OAuth로 로그인 시도",
      status: "pending",
    },
    {
      id: "get-user",
      name: "사용자 정보 조회",
      description: "로그인된 사용자 정보 가져오기",
      status: "pending",
    },
    {
      id: "logout",
      name: "로그아웃",
      description: "현재 세션에서 로그아웃",
      status: "pending",
    },
  ]);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [configStatus, setConfigStatus] = useState<"checking" | "ok" | "missing">("checking");

  useEffect(() => {
    // 환경변수 확인
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    setConfigStatus(url && key ? "ok" : "missing");

    // 세션 변경 구독
    if (url && key) {
      const supabase = createClient();
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      });

      // 초기 세션 확인
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      });
    }
  }, []);

  const updateTestCase = (id: string, updates: Partial<TestCase>) => {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, ...updates } : tc))
    );
  };

  const runTest = async (testId: string) => {
    const startTime = Date.now();
    updateTestCase(testId, { status: "running", error: undefined });

    try {
      const supabase = createClient();

      switch (testId) {
        case "supabase-init": {
          if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            throw new Error("NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
          }
          if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.");
          }
          // 클라이언트 생성 테스트
          const client = createClient();
          if (!client) {
            throw new Error("Supabase 클라이언트 생성 실패");
          }
          break;
        }
        case "check-session": {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          setSession(data.session);
          setUser(data.session?.user ?? null);
          break;
        }
        case "google-login": {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/test/auth`,
            },
          });
          if (error) throw error;
          // OAuth는 리다이렉트되므로 여기서 성공 처리
          break;
        }
        case "get-user": {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          if (!data.user) {
            throw new Error("로그인되지 않았습니다.");
          }
          setUser(data.user);
          break;
        }
        case "logout": {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          setUser(null);
          setSession(null);
          break;
        }
      }

      updateTestCase(testId, {
        status: "passed",
        duration: Date.now() - startTime,
      });
    } catch (error) {
      updateTestCase(testId, {
        status: "failed",
        error: error instanceof Error ? error.message : "알 수 없는 오류",
        duration: Date.now() - startTime,
      });
    }
  };

  const resetTests = () => {
    setTestCases((prev) =>
      prev.map((tc) => ({
        ...tc,
        status: "pending",
        error: undefined,
        duration: undefined,
      }))
    );
  };

  const statusIcon = {
    pending: "⏳",
    running: "🔄",
    passed: "✅",
    failed: "❌",
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/test"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← 테스트 대시보드
          </Link>
          <h1 className="text-3xl font-bold mt-4">인증 테스트 (Supabase Auth)</h1>
        </div>

        {/* 설정 상태 */}
        <div
          className={`p-4 rounded-lg mb-6 ${
            configStatus === "ok"
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
              : configStatus === "missing"
              ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"
              : "bg-gray-50 dark:bg-gray-800"
          }`}
        >
          {configStatus === "checking" && "환경변수 확인 중..."}
          {configStatus === "ok" && "✅ Supabase 환경변수가 설정되어 있습니다."}
          {configStatus === "missing" && (
            <>
              ⚠️ Supabase 환경변수가 설정되지 않았습니다.
              <code className="ml-2 bg-red-100 dark:bg-red-800 px-1 rounded text-sm">
                .env.local
              </code>
              파일을 확인하세요.
            </>
          )}
        </div>

        {/* 현재 세션 정보 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">현재 세션 상태</h2>
          {user ? (
            <div className="flex items-center gap-4">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">
                  {user.user_metadata?.full_name || user.email}
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
                <p className="text-xs text-gray-400">ID: {user.id}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">로그인되지 않음</p>
          )}
        </div>

        {/* 테스트 컨트롤 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={resetTests}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            초기화
          </button>
        </div>

        {/* 테스트 케이스 목록 */}
        <div className="space-y-4">
          {testCases.map((tc) => (
            <div
              key={tc.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{statusIcon[tc.status]}</span>
                  <div>
                    <h3 className="font-medium">{tc.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {tc.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {tc.duration !== undefined && (
                    <span className="text-sm text-gray-500">{tc.duration}ms</span>
                  )}
                  <button
                    onClick={() => runTest(tc.id)}
                    disabled={tc.status === "running" || configStatus !== "ok"}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50"
                  >
                    실행
                  </button>
                </div>
              </div>
              {tc.error && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded">
                  {tc.error}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 세션 상세 정보 */}
        {session && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-medium mb-2">세션 상세 정보</h3>
            <pre className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(
                {
                  access_token: session.access_token?.slice(0, 20) + "...",
                  expires_at: session.expires_at,
                  user: {
                    id: session.user?.id,
                    email: session.user?.email,
                    provider: session.user?.app_metadata?.provider,
                  },
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
