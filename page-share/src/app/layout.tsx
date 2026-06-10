import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page Share — 웹 아카이브",
  description: "웹 페이지를 저장하고 팀원과 공유하는 아카이브 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <header className="border-b border-gray-800 px-6 py-4">
          <a href="/" className="text-lg font-semibold tracking-tight hover:text-white">
            📄 Page Share
          </a>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
