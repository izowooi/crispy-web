import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mojipop.pages.dev"),
  title: "MojiPop - AI 이모티콘 생성기",
  description:
    "내 사진으로 나만의 이모티콘을 만들어보세요. AI가 귀여운 스티커로 변환해드립니다.",
  openGraph: {
    title: "MojiPop - AI 이모티콘 생성기",
    description: "내 사진으로 나만의 이모티콘을 만들어보세요.",
    url: "https://mojipop.pages.dev",
    siteName: "MojiPop",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MojiPop - AI 이모티콘 생성기",
    description: "내 사진으로 나만의 이모티콘을 만들어보세요.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <footer className="border-t border-border mt-12 py-6 text-center text-sm text-muted">
          <div className="max-w-2xl mx-auto px-4 flex flex-col gap-2 items-center">
            <p>🔒 업로드된 이미지는 서버에 저장되지 않습니다.</p>
            <a
              href="https://github.com/izowooi/crispy-web/tree/main/mojipop"
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
