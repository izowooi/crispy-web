import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "awesome-cut — AI 시네마틱 시퀀스 생성기",
  description: "캐릭터 시트와 스토리라인으로 3×3 시네마틱 시퀀스 이미지를 Nano Banana 2로 생성합니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-gray-950 text-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
