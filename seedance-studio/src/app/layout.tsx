import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seedance Studio",
  description:
    "AI 비디오 생성 스튜디오 - Seedance 2.0으로 나만의 영상을 만들어보세요",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
