import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "쿠팡 소비 대시보드",
  description: "쿠팡 메일 가져오기로 적재된 구매 내역을 시각화하는 개인용 대시보드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
