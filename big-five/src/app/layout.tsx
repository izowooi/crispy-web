import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Big Five 심리 성향 검사",
  description: "180문항 Big Five 성향 검사와 결과 시각화 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
