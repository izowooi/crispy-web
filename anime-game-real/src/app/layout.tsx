import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  icons: { icon: "/favicon.svg" },
  title: "Another Take — Anime to Real",
  description:
    "한 장의 상상, 세 가지 현실. 최신 이미지 모델로 실사화하고 비교하세요.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.classList.toggle('dark',localStorage.getItem('theme')==='dark')}catch{}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
