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
        <footer className="border-t border-border mt-8 py-6 text-center text-sm text-muted">
          <div className="max-w-3xl mx-auto px-4 flex flex-col gap-2 items-center">
            <p>🔒 개인정보를 소중히 여깁니다. 업로드된 이미지와 입력값은 서버에 저장되지 않습니다.</p>
            <a
              href="https://github.com/izowooi/crispy-web/tree/main/ductcanvas"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors underline underline-offset-2"
            >
              소스 코드
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
