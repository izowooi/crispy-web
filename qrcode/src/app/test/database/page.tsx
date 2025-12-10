"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { TestCase, WifiQRCodeRecord } from "@/types";

export default function DatabaseTestPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: "db-connect",
      name: "데이터베이스 연결",
      description: "Supabase 데이터베이스 연결 테스트",
      status: "pending",
    },
    {
      id: "check-table",
      name: "테이블 존재 확인",
      description: "wifi_qr_codes 테이블 확인",
      status: "pending",
    },
    {
      id: "rls-insert",
      name: "RLS INSERT 테스트",
      description: "로그인 사용자로 데이터 삽입",
      status: "pending",
    },
    {
      id: "rls-select",
      name: "RLS SELECT 테스트",
      description: "자신의 데이터만 조회되는지 확인",
      status: "pending",
    },
    {
      id: "cleanup",
      name: "테스트 데이터 정리",
      description: "테스트용 데이터 삭제",
      status: "pending",
    },
  ]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [records, setRecords] = useState<WifiQRCodeRecord[]>([]);
  const [testRecordId, setTestRecordId] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<"checking" | "ok" | "missing">("checking");

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    setConfigStatus(url && key ? "ok" : "missing");

    if (url && key) {
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
      const supabase = createClient();

      switch (testId) {
        case "db-connect": {
          // 간단한 쿼리로 연결 테스트
          const { error } = await supabase.from("wifi_qr_codes").select("count");
          if (error && error.code !== "PGRST116") {
            // PGRST116 = 테이블이 없음 (다음 테스트에서 확인)
            if (error.code === "42P01") {
              // 테이블이 없어도 연결은 성공
              break;
            }
            throw error;
          }
          break;
        }
        case "check-table": {
          const { error } = await supabase.from("wifi_qr_codes").select("id").limit(1);
          if (error) {
            if (error.code === "42P01") {
              throw new Error(
                "wifi_qr_codes 테이블이 없습니다. Supabase SQL Editor에서 테이블을 생성하세요."
              );
            }
            throw error;
          }
          break;
        }
        case "rls-insert": {
          if (!isLoggedIn || !userId) {
            throw new Error("로그인이 필요합니다. /test/auth에서 먼저 로그인하세요.");
          }

          const testData = {
            user_id: userId,
            ssid: `Test_${Date.now()}`,
            encryption_type: "WPA2" as const,
            r2_object_key: `test/${userId}/test-${Date.now()}.webp`,
          };

          const { data, error } = await supabase
            .from("wifi_qr_codes")
            .insert(testData)
            .select()
            .single();

          if (error) {
            if (error.code === "42501") {
              throw new Error("RLS 정책에 의해 삽입이 거부되었습니다.");
            }
            throw error;
          }

          setTestRecordId(data.id);
          break;
        }
        case "rls-select": {
          if (!isLoggedIn) {
            throw new Error("로그인이 필요합니다.");
          }

          const { data, error } = await supabase
            .from("wifi_qr_codes")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);

          if (error) throw error;

          setRecords(data || []);

          // 모든 레코드가 현재 사용자의 것인지 확인
          const allMine = data?.every((r) => r.user_id === userId);
          if (!allMine && data && data.length > 0) {
            throw new Error("다른 사용자의 데이터가 조회되었습니다. RLS 정책을 확인하세요.");
          }
          break;
        }
        case "cleanup": {
          if (!testRecordId) {
            throw new Error("삭제할 테스트 데이터가 없습니다.");
          }

          const { error } = await supabase
            .from("wifi_qr_codes")
            .delete()
            .eq("id", testRecordId);

          if (error) throw error;

          setTestRecordId(null);
          // 레코드 목록 새로고침
          const { data } = await supabase
            .from("wifi_qr_codes")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);
          setRecords(data || []);
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
    setRecords([]);
    setTestRecordId(null);
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
          <h1 className="text-3xl font-bold mt-4">데이터베이스 테스트</h1>
        </div>

        {/* 설정 상태 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div
            className={`p-4 rounded-lg ${
              configStatus === "ok"
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"
            }`}
          >
            <p className="font-medium">
              {configStatus === "ok" ? "✅ Supabase 설정됨" : "⚠️ Supabase 미설정"}
            </p>
          </div>
          <div
            className={`p-4 rounded-lg ${
              isLoggedIn
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300"
            }`}
          >
            <p className="font-medium">
              {isLoggedIn ? "✅ 로그인됨" : "⚠️ 로그인 필요 (RLS 테스트용)"}
            </p>
          </div>
        </div>

        {/* 테이블 생성 SQL */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-2">테이블 생성 SQL (Supabase SQL Editor에서 실행)</h3>
          <pre className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto">
{`CREATE TABLE wifi_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ssid TEXT NOT NULL,
    encryption_type TEXT DEFAULT 'WPA' CHECK (encryption_type IN ('WPA', 'WPA2')),
    r2_object_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wifi_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own QR codes" ON wifi_qr_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own QR codes" ON wifi_qr_codes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own QR codes" ON wifi_qr_codes
    FOR DELETE USING (auth.uid() = user_id);`}
          </pre>
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

        {/* 조회된 레코드 */}
        {records.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-medium mb-2">조회된 레코드 ({records.length}개)</h3>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">SSID</th>
                    <th className="text-left p-2">암호화</th>
                    <th className="text-left p-2">생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className={`border-b dark:border-gray-700 ${
                        record.id === testRecordId ? "bg-yellow-50 dark:bg-yellow-900/20" : ""
                      }`}
                    >
                      <td className="p-2 font-mono text-xs">{record.id.slice(0, 8)}...</td>
                      <td className="p-2">{record.ssid}</td>
                      <td className="p-2">{record.encryption_type}</td>
                      <td className="p-2">{new Date(record.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
