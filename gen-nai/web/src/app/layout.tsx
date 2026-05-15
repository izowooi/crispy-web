import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gen-nai",
  description: "NovelAI 이미지 생성 체험 — 가입 없이",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
