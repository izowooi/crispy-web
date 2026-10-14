import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans_KR({
  variable: "--font-sans-kr",
  weight: ["400", "500", "700", "900"],
  preload: false,
});

const serif = Noto_Serif_KR({
  variable: "--font-serif-kr",
  weight: ["600", "900"],
  preload: false,
});

export const metadata: Metadata = {
  title: "인피니티 머지 · 오행 연금술",
  description: "나무·불·흙·금속·물. 다섯 원소를 합쳐 무한한 세계를 연성하는 단어 연금술 게임.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#07080c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
