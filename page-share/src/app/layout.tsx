export const runtime = "edge";

import type { Metadata } from "next";
import "./globals.css";
import AdminBarWrapper from "@/components/admin-bar-wrapper";
import ThemeToggle from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Page Share — 웹 아카이브",
  description: "웹 페이지를 저장하고 팀원과 공유하는 아카이브 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      {/* FOUC 방지: 렌더 전 테마 클래스 적용 */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme')||'light';if(t==='dark')document.documentElement.classList.add('dark');})();` }} />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
        <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between dark:border-gray-800">
          <a href="/" className="text-lg font-semibold tracking-tight hover:text-gray-950 dark:hover:text-white">
            📄 Page Share
          </a>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AdminBarWrapper />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
