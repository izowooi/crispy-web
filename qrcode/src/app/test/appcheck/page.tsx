"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  initializeFirebase,
  initializeFirebaseAppCheck,
  getAppCheckToken,
} from "@/lib/firebase/client";
import type { TestCase } from "@/types";

export default function AppCheckTestPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: "firebase-init",
      name: "Firebase 초기화",
      description: "Firebase 앱 인스턴스 생성",
      status: "pending",
    },
    {
      id: "appcheck-init",
      name: "App Check 초기화",
      description: "Firebase App Check 활성화",
      status: "pending",
    },
    {
      id: "get-token",
      name: "App Check 토큰 획득",
      description: "reCAPTCHA Enterprise 토큰 발급",
      status: "pending",
    },
    {
      id: "verify-token",
      name: "서버 토큰 검증 (API)",
      description: "Next.js API Route에서 토큰 검증",
      status: "pending",
    },
  ]);
  const [token, setToken] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<"checking" | "ok" | "missing">("checking");

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    setConfigStatus(apiKey && projectId ? "ok" : "missing");
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
      switch (testId) {
        case "firebase-init": {
          if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
            throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY가 설정되지 않았습니다.");
          }
          if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
            throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID가 설정되지 않았습니다.");
          }
          const app = initializeFirebase();
          if (!app) {
            throw new Error("Firebase 앱 초기화 실패");
          }
          break;
        }
        case "appcheck-init": {
          const appCheck = initializeFirebaseAppCheck();
          if (!appCheck) {
            throw new Error(
              "App Check 초기화 실패. reCAPTCHA 사이트 키를 확인하세요."
            );
          }
          break;
        }
        case "get-token": {
          const appCheckToken = await getAppCheckToken();
          if (!appCheckToken) {
            throw new Error("App Check 토큰 획득 실패");
          }
          setToken(appCheckToken);
          break;
        }
        case "verify-token": {
          if (!token) {
            throw new Error("먼저 토큰을 획득하세요.");
          }
          const response = await fetch("/api/appcheck/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Firebase-AppCheck": token,
            },
          });
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "서버 검증 실패");
          }
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
    setToken(null);
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
          <h1 className="text-3xl font-bold mt-4">Firebase App Check 테스트</h1>
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
          {configStatus === "ok" && "✅ Firebase 환경변수가 설정되어 있습니다."}
          {configStatus === "missing" && (
            <>
              ⚠️ Firebase 환경변수가 설정되지 않았습니다.
              <code className="ml-2 bg-red-100 dark:bg-red-800 px-1 rounded text-sm">
                .env.local
              </code>
              파일을 확인하세요.
            </>
          )}
        </div>

        {/* 설정 가이드 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
            App Check 설정 순서
          </h3>
          <ol className="list-decimal list-inside text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>Firebase Console에서 프로젝트 생성</li>
            <li>웹 앱 등록 후 config 값 복사</li>
            <li>App Check 활성화 (reCAPTCHA Enterprise 선택)</li>
            <li>Google Cloud Console에서 reCAPTCHA Enterprise 키 생성</li>
            <li>Firebase에 reCAPTCHA 사이트 키 등록</li>
            <li>환경변수에 NEXT_PUBLIC_RECAPTCHA_SITE_KEY 추가</li>
          </ol>
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

        {/* 토큰 정보 */}
        {token && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-medium mb-2">App Check 토큰</h3>
            <pre className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto max-h-32">
              {token.slice(0, 100)}...
            </pre>
            <p className="mt-2 text-xs text-gray-500">
              토큰 길이: {token.length}자
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
