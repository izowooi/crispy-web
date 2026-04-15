import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Places",
  description: "내가 다녀온 장소를 지도 위에 기록합니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
