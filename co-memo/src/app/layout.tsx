import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Co-memo | 협업 메모 보드",
  description: "팀원들과 포스트잇 메모를 공유하는 협업 보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <a href="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-700">
            📝 Co-memo
          </a>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
