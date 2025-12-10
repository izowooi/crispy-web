import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WiFi QR Generator",
  description: "WiFi QR 코드를 생성하고 저장하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
