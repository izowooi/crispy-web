import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const themeScript = `
  (function () {
    try {
      var saved = localStorage.getItem("theme");
      document.documentElement.classList.toggle("dark", saved === "dark");
      document.documentElement.style.colorScheme = saved === "dark" ? "dark" : "light";
    } catch (_) {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  })();
`;

export const metadata: Metadata = {
  title: "Curry Shot — 게임 아트를 실사 영화의 한 장면으로",
  description:
    "게임 일러스트, 스크린샷, 표지 이미지를 원본 구도에 충실한 실사 이미지와 짧은 영상으로 변환합니다.",
  applicationName: "Curry Shot",
  openGraph: {
    title: "Curry Shot",
    description: "게임 아트를 원본에 충실한 실사 장면으로 변환하세요.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
