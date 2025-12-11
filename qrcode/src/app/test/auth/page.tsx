"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  signInWithGoogle,
  signOut,
  getUser,
} from "@/lib/supabase/client";

export default function AuthTestPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 초기 사용자 상태 확인
    checkUser();

    // 인증 상태 변경 리스너
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
    }
  }

  async function handleSignOut() {
    setError(null);
    try {
      await signOut();
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그아웃 중 오류가 발생했습니다.");
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/test"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← 테스트 대시보드
          </Link>
          <h1 className="text-3xl font-bold mt-4">Google 로그인 테스트</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Supabase Auth를 사용한 Google OAuth 로그인
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* 로딩 상태 */}
        {loading ? (
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : user ? (
          /* 로그인된 상태 */
          <div className="space-y-6">
            <div className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h2 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-4">
                로그인됨
              </h2>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">이메일:</span>{" "}
                  {user.email}
                </p>
                <p>
                  <span className="font-medium">사용자 ID:</span>{" "}
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">
                    {user.id}
                  </code>
                </p>
                {user.user_metadata?.full_name && (
                  <p>
                    <span className="font-medium">이름:</span>{" "}
                    {user.user_metadata.full_name}
                  </p>
                )}
                {user.user_metadata?.avatar_url && (
                  <div className="mt-4">
                    <span className="font-medium">프로필 이미지:</span>
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="mt-2 w-16 h-16 rounded-full"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              로그아웃
            </button>
          </div>
        ) : (
          /* 로그인되지 않은 상태 */
          <div className="space-y-6">
            <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">로그인 필요</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Google 계정으로 로그인하여 인증 기능을 테스트하세요.
              </p>
            </div>

            <button
              onClick={handleSignIn}
              className="w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-lg border border-gray-300 transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 로그인
            </button>
          </div>
        )}

        {/* 환경변수 상태 */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
            환경변수 상태
          </h3>
          <ul className="text-sm space-y-1">
            <li className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  process.env.NEXT_PUBLIC_SUPABASE_URL
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
              NEXT_PUBLIC_SUPABASE_URL
            </li>
            <li className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
