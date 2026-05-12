import type { Metadata } from "next";
import "./globals.css";
import { AuthGate } from "@/components/AuthGate";

export const metadata: Metadata = {
  metadataBase: new URL("https://snapmany.pages.dev"),
  title: "SnapMany",
  description: "한 장의 사진으로 여러 스타일을 한 번에",
  openGraph: {
    title: "SnapMany",
    description: "한 장의 사진으로 여러 스타일을 한 번에",
    url: "https://snapmany.pages.dev",
    siteName: "SnapMany",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapMany",
    description: "한 장의 사진으로 여러 스타일을 한 번에",
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
            __html: `try{const t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(_){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthGate>{children}</AuthGate>
        <footer
          data-testid="site-footer"
          className="border-t border-border mt-8 py-6 text-center text-sm text-muted"
        >
          <div className="max-w-3xl mx-auto px-4 flex flex-col gap-2 items-center">
            <p>
              개인정보를 소중히 여깁니다. 업로드된 사진은 서버에 저장되지 않으며, Replicate API 통신에만 사용됩니다.
            </p>
            <a
              href="https://github.com/izowooi/crispy-web/tree/main/snapmany"
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
