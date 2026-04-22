import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ductcanvas.pages.dev"),
  title: "DuctCanvas",
  description: "GPT Image 2로 이미지 생성, 업스케일, 아웃페인팅을 한 번에",
  openGraph: {
    title: "DuctCanvas",
    description: "GPT Image 2로 이미지 생성, 업스케일, 아웃페인팅을 한 번에",
    url: "https://ductcanvas.pages.dev",
    siteName: "DuctCanvas",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DuctCanvas",
    description: "GPT Image 2로 이미지 생성, 업스케일, 아웃페인팅을 한 번에",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(_){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
