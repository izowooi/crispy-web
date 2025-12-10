"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  generateWifiString,
  validateWifiData,
  type WifiQRData,
  type EncryptionType,
} from "@/lib/qr/wifi-format";
import {
  generateQRDataURL,
  generateQRToCanvas,
  canvasToWebPBlob,
} from "@/lib/qr/generator";
import type { TestCase } from "@/types";

export default function QRTestPage() {
  const [ssid, setSSID] = useState("MyWiFi");
  const [password, setPassword] = useState("mypassword123");
  const [encryptionType, setEncryptionType] = useState<EncryptionType>("WPA2");
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: "wifi-string",
      name: "WiFi 문자열 생성",
      description: "SSID와 비밀번호로 WiFi QR 포맷 문자열 생성",
      status: "pending",
    },
    {
      id: "validation",
      name: "입력값 유효성 검사",
      description: "SSID (1-32자), 비밀번호 (8-63자) 검증",
      status: "pending",
    },
    {
      id: "qr-dataurl",
      name: "QR Data URL 생성",
      description: "QR 코드를 Base64 Data URL로 생성",
      status: "pending",
    },
    {
      id: "qr-canvas",
      name: "QR Canvas 렌더링",
      description: "QR 코드를 Canvas 요소에 렌더링",
      status: "pending",
    },
    {
      id: "webp-convert",
      name: "WebP 변환",
      description: "Canvas를 WebP Blob으로 변환",
      status: "pending",
    },
  ]);
  const [wifiString, setWifiString] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [webpBlobSize, setWebpBlobSize] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const updateTestCase = (
    id: string,
    updates: Partial<TestCase>
  ) => {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, ...updates } : tc))
    );
  };

  const getWifiData = (): WifiQRData => ({
    ssid,
    password,
    encryptionType,
  });

  const runTest = async (testId: string) => {
    const startTime = Date.now();
    updateTestCase(testId, { status: "running", error: undefined });

    try {
      const wifiData = getWifiData();

      switch (testId) {
        case "wifi-string": {
          const result = generateWifiString(wifiData);
          setWifiString(result);
          break;
        }
        case "validation": {
          const result = validateWifiData(wifiData);
          if (!result.valid) {
            throw new Error(result.errors.join(", "));
          }
          break;
        }
        case "qr-dataurl": {
          const validation = validateWifiData(wifiData);
          if (!validation.valid) {
            throw new Error(validation.errors.join(", "));
          }
          const dataUrl = await generateQRDataURL(wifiData);
          setQrDataUrl(dataUrl);
          break;
        }
        case "qr-canvas": {
          if (!canvasRef.current) {
            throw new Error("Canvas 요소를 찾을 수 없습니다.");
          }
          const validation = validateWifiData(wifiData);
          if (!validation.valid) {
            throw new Error(validation.errors.join(", "));
          }
          await generateQRToCanvas(canvasRef.current, wifiData);
          break;
        }
        case "webp-convert": {
          if (!canvasRef.current) {
            throw new Error("Canvas 요소를 찾을 수 없습니다. 먼저 Canvas 렌더링 테스트를 실행하세요.");
          }
          const ctx = canvasRef.current.getContext("2d");
          if (!ctx || canvasRef.current.width === 0) {
            throw new Error("Canvas에 QR 코드가 없습니다. 먼저 Canvas 렌더링 테스트를 실행하세요.");
          }
          const blob = await canvasToWebPBlob(canvasRef.current);
          setWebpBlobSize(blob.size);
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

  const runAllTests = async () => {
    for (const tc of testCases) {
      await runTest(tc.id);
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
    setWifiString("");
    setQrDataUrl("");
    setWebpBlobSize(0);
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
          <h1 className="text-3xl font-bold mt-4">QR 코드 생성 테스트</h1>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">테스트 입력값</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">SSID</label>
              <input
                type="text"
                value={ssid}
                onChange={(e) => setSSID(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">비밀번호</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">암호화</label>
              <select
                value={encryptionType}
                onChange={(e) => setEncryptionType(e.target.value as EncryptionType)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="WPA">WPA</option>
                <option value="WPA2">WPA2</option>
              </select>
            </div>
          </div>
        </div>

        {/* 테스트 컨트롤 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={runAllTests}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            모든 테스트 실행
          </button>
          <button
            onClick={resetTests}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            초기화
          </button>
        </div>

        {/* 테스트 케이스 목록 */}
        <div className="space-y-4 mb-6">
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
                    <span className="text-sm text-gray-500">
                      {tc.duration}ms
                    </span>
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

        {/* 결과 표시 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WiFi 문자열 */}
          {wifiString && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-medium mb-2">WiFi 문자열</h3>
              <code className="block p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm break-all">
                {wifiString}
              </code>
            </div>
          )}

          {/* QR Data URL 이미지 */}
          {qrDataUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-medium mb-2">QR Data URL 이미지</h3>
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="border rounded"
              />
            </div>
          )}

          {/* Canvas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-medium mb-2">Canvas 렌더링</h3>
            <canvas
              ref={canvasRef}
              className="border rounded bg-white"
            />
          </div>

          {/* WebP 정보 */}
          {webpBlobSize > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-medium mb-2">WebP 변환 결과</h3>
              <p className="text-sm">
                파일 크기: <strong>{(webpBlobSize / 1024).toFixed(2)} KB</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
