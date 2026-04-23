import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "판교 맛집 추천",
  description: "판교 직장인을 위한 맛집 추천 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-orange-500 text-white shadow-md">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold">🍜 판교 맛집</a>
            <a
              href="/add"
              className="bg-white text-orange-500 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-orange-50 transition-colors"
            >
              + 맛집 추가
            </a>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
