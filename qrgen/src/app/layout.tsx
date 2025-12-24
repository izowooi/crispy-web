import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WiFi QR 코드 생성기",
  description: "WiFi 정보를 QR 코드로 변환하여 쉽게 공유하세요. 스마트폰으로 스캔하면 바로 WiFi에 연결됩니다.",
  keywords: ["WiFi", "QR코드", "QR", "와이파이", "공유", "연결"],
  openGraph: {
    title: "WiFi QR 코드 생성기",
    description: "WiFi 정보를 QR 코드로 변환하여 쉽게 공유하세요.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
