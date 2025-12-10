"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import { generateQRDataURL } from "@/lib/qr/generator";
import type { TestCase } from "@/types";

export default function PrintTestPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: "generate-qr",
      name: "QR 코드 생성",
      description: "테스트용 WiFi QR 코드 생성",
      status: "pending",
    },
    {
      id: "print",
      name: "프린터 출력",
      description: "window.print() 호출",
      status: "pending",
    },
    {
      id: "pdf",
      name: "PDF 생성",
      description: "jsPDF로 PDF 파일 생성 및 다운로드",
      status: "pending",
    },
    {
      id: "webp-download",
      name: "WebP 다운로드",
      description: "QR 코드 이미지 파일 다운로드",
      status: "pending",
    },
  ]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [ssid, setSSID] = useState("MyWiFi");
  const printRef = useRef<HTMLDivElement>(null);

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
        case "generate-qr": {
          const dataUrl = await generateQRDataURL({
            ssid,
            password: "mypassword123",
            encryptionType: "WPA2",
          });
          setQrDataUrl(dataUrl);
          break;
        }
        case "print": {
          if (!qrDataUrl) {
            throw new Error("먼저 QR 코드를 생성하세요.");
          }
          // 프린트 영역만 출력하기 위한 스타일 적용
          const printContent = printRef.current;
          if (!printContent) {
            throw new Error("프린트 영역을 찾을 수 없습니다.");
          }

          const printWindow = window.open("", "_blank");
          if (!printWindow) {
            throw new Error("팝업이 차단되었습니다.");
          }

          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>WiFi QR Code - ${ssid}</title>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 40px;
                  }
                  img { max-width: 300px; }
                  h2 { margin-top: 20px; }
                </style>
              </head>
              <body>
                <img src="${qrDataUrl}" alt="WiFi QR Code" />
                <h2>WiFi: ${ssid}</h2>
                <p>스마트폰 카메라로 QR 코드를 스캔하세요</p>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
          break;
        }
        case "pdf": {
          if (!qrDataUrl) {
            throw new Error("먼저 QR 코드를 생성하세요.");
          }

          const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
          });

          // A4 중앙에 QR 코드 배치
          const pageWidth = pdf.internal.pageSize.getWidth();
          const qrSize = 80; // mm
          const x = (pageWidth - qrSize) / 2;

          // 제목
          pdf.setFontSize(24);
          pdf.text("WiFi QR Code", pageWidth / 2, 40, { align: "center" });

          // QR 코드 이미지
          pdf.addImage(qrDataUrl, "PNG", x, 60, qrSize, qrSize);

          // SSID
          pdf.setFontSize(18);
          pdf.text(`WiFi: ${ssid}`, pageWidth / 2, 160, { align: "center" });

          // 안내 문구
          pdf.setFontSize(12);
          pdf.text(
            "스마트폰 카메라로 QR 코드를 스캔하세요",
            pageWidth / 2,
            175,
            { align: "center" }
          );

          // 다운로드
          pdf.save(`wifi-qr-${ssid}.pdf`);
          break;
        }
        case "webp-download": {
          if (!qrDataUrl) {
            throw new Error("먼저 QR 코드를 생성하세요.");
          }

          // PNG Data URL을 WebP로 변환
          const img = new Image();
          img.src = qrDataUrl;
          await new Promise((resolve) => (img.onload = resolve));

          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas context 생성 실패");

          ctx.drawImage(img, 0, 0);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                throw new Error("WebP 변환 실패");
              }

              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `wifi-qr-${ssid}.webp`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            },
            "image/webp",
            0.9
          );
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
    setQrDataUrl("");
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
          <h1 className="text-3xl font-bold mt-4">출력 기능 테스트</h1>
        </div>

        {/* 입력 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">테스트 설정</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">SSID (파일명에 사용)</label>
              <input
                type="text"
                value={ssid}
                onChange={(e) => setSSID(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <button
              onClick={resetTests}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              초기화
            </button>
          </div>
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

        {/* QR 코드 미리보기 */}
        {qrDataUrl && (
          <div
            ref={printRef}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center"
          >
            <h3 className="font-medium mb-4">QR 코드 미리보기</h3>
            <img
              src={qrDataUrl}
              alt="WiFi QR Code"
              className="mx-auto border rounded"
            />
            <p className="mt-4 text-lg font-medium">WiFi: {ssid}</p>
            <p className="text-sm text-gray-500">스마트폰 카메라로 QR 코드를 스캔하세요</p>
          </div>
        )}
      </div>
    </main>
  );
}
