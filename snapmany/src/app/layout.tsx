import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnapMany",
  description: "한 장의 사진으로 여러 스타일을 한 번에",
  openGraph: {
    title: "SnapMany",
    description: "한 장의 사진으로 여러 스타일을 한 번에",
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
        {children}
      </body>
    </html>
  );
}
