import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegister } from "@/components/pwa-register";
import { appleWebApp, LEGACY_IOS_WEB_APP_META } from "@/lib/pwa";
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
  title: "우리 아기 식단",
  description: "어린이집 월간 식단표 사진을 올리면 오늘의 간식과 점심을 바로 보여줍니다.",
  applicationName: "우리 아기 식단",
  manifest: "/manifest.webmanifest",
  appleWebApp: appleWebApp("아기 식단"),
  other: LEGACY_IOS_WEB_APP_META,
};

export const viewport: Viewport = {
  themeColor: "#426550",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-canvas text-ink antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
