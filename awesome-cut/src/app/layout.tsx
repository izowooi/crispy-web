import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://awesome-cut.pages.dev"),
  title: "컷 메이커 - awesome-cut",
  description: "캐릭터 시트와 스토리라인으로 3×3 시네마틱 시퀀스 이미지를 Nano Banana 2로 생성합니다",
  manifest: "/manifest.json",
  openGraph: {
    title: "컷 메이커 - awesome-cut",
    description: "캐릭터 시트와 스토리라인으로 3×3 시네마틱 시퀀스 이미지를 Nano Banana 2로 생성합니다",
    siteName: "awesome-cut",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "컷 메이커 - awesome-cut",
    description: "캐릭터 시트와 스토리라인으로 3×3 시네마틱 시퀀스 이미지를 Nano Banana 2로 생성합니다",
  },
};

export const viewport: Viewport = {
  themeColor: "#f1f5f9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t!=='light')document.documentElement.classList.add('dark');})()`,
          }}
        />
      </head>
      <body className="bg-gradient-to-br from-slate-100 via-white to-indigo-50 text-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 dark:text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
