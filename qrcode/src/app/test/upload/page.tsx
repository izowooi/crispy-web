"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateQRAsWebP } from "@/lib/qr/generator";
import { getAppCheckToken } from "@/lib/firebase/client";
import type { TestCase } from "@/types";

export default function UploadTestPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: "check-auth",
      name: "인증 상태 확인",
      description: "Supabase 로그인 여부 확인",
      status: "pending",
    },
    {
      id: "generate-qr",
      name: "QR 코드 생성",
      description: "테스트용 WiFi QR 코드 WebP 생성",
      status: "pending",
    },
    {
      id: "get-appcheck",
      name: "App Check 토큰 획득",
      description: "Firebase App Check 토큰 발급",
      status: "pending",
    },
    {
      id: "upload-api",
      name: "업로드 API 호출",
      description: "QR 코드를 Next.js API로 전송",
      status: "pending",
    },
  ]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [qrBlob, setQrBlob] = useState<Blob | null>(null);
  const [appCheckToken, setAppCheckToken] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    objectKey?: string;
    error?: string;
  } | null>(null);
  const [configStatus, setConfigStatus] = useState<"checking" | "ok" | "partial" | "missing">("checking");

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL;

    if (supabaseUrl && workerUrl) {
      setConfigStatus("ok");
    } else if (supabaseUrl || workerUrl) {
      setConfigStatus("partial");
    } else {
      setConfigStatus("missing");
    }

    // 로그인 상태 확인
    if (supabaseUrl) {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }) => {
        setIsLoggedIn(!!data.session);
        setUserId(data.session?.user?.id ?? null);
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
      switch (testId) {
        case "check-auth": {
          const supabase = createClient();
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error("로그인되지 않았습니다. 먼저 /test/auth에서 로그인하세요.");
          }
          setIsLoggedIn(true);
          setUserId(data.session.user.id);
          break;
        }
        case "generate-qr": {
          const blob = await generateQRAsWebP({
            ssid: "TestWiFi",
            password: "testpassword123",
            encryptionType: "WPA2",
          });
          setQrBlob(blob);
          break;
        }
        case "get-appcheck": {
          const token = await getAppCheckToken();
          if (!token) {
            throw new Error("App Check 토큰 획득 실패. Firebase 설정을 확인하세요.");
          }
          setAppCheckToken(token);
          break;
        }
        case "upload-api": {
          if (!isLoggedIn) {
            throw new Error("로그인이 필요합니다.");
          }
          if (!qrBlob) {
            throw new Error("먼저 QR 코드를 생성하세요.");
          }

          const supabase = createClient();
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            throw new Error("세션이 만료되었습니다.");
          }

          const formData = new FormData();
          formData.append("file", qrBlob, "qr.webp");
          formData.append("ssid", "TestWiFi");
          formData.append("encryptionType", "WPA2");

          const headers: HeadersInit = {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          };
          if (appCheckToken) {
            headers["X-Firebase-AppCheck"] = appCheckToken;
          }

          const response = await fetch("/api/qr/generate", {
            method: "POST",
            headers,
            body: formData,
          });

          const result = await response.json();
          setUploadResult(result);

          if (!result.success) {
            throw new Error(result.error?.message || "업로드 실패");
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
    setQrBlob(null);
    setAppCheckToken(null);
    setUploadResult(null);
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
          <h1 className="text-3xl font-bold mt-4">R2 업로드 테스트</h1>
        </div>

        {/* 상태 표시 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            className={`p-4 rounded-lg ${
              isLoggedIn
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300"
            }`}
          >
            <p className="font-medium">
              {isLoggedIn ? "✅ 로그인됨" : "⚠️ 로그인 필요"}
            </p>
            {userId && (
              <p className="text-xs mt-1 truncate">ID: {userId}</p>
            )}
          </div>
          <div
            className={`p-4 rounded-lg ${
              qrBlob
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                : "bg-gray-50 dark:bg-gray-800"
            }`}
          >
            <p className="font-medium">
              {qrBlob ? `✅ QR 생성됨 (${(qrBlob.size / 1024).toFixed(1)}KB)` : "QR 미생성"}
            </p>
          </div>
          <div
            className={`p-4 rounded-lg ${
              appCheckToken
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                : "bg-gray-50 dark:bg-gray-800"
            }`}
          >
            <p className="font-medium">
              {appCheckToken ? "✅ App Check 준비" : "App Check 미설정"}
            </p>
          </div>
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
                    disabled={tc.status === "running"}
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

        {/* 업로드 결과 */}
        {uploadResult && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-medium mb-2">업로드 결과</h3>
            <pre className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm overflow-auto">
              {JSON.stringify(uploadResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
