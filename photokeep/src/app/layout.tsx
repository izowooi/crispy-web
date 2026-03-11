import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomTabBar from "@/components/ui/BottomTabBar";
import SettingsButton from "@/components/ui/SettingsButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PhotoKeep",
  description: "가족 사진 공유 갤러리",
  icons: {
    apple: "/icons/icon-192x192.png",
  },
  openGraph: {
    title: "PhotoKeep",
    description: "가족 사진 공유 갤러리",
    siteName: "PhotoKeep",
    locale: "ko_KR",
    type: "website",
    url: process.env.NEXT_PUBLIC_BASE_URL ?? "https://photokeep.pages.dev",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "PhotoKeep - 가족 사진 공유 갤러리",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PhotoKeep",
    description: "가족 사진 공유 갤러리",
    images: ["/opengraph-image.png"],
  },
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
            __html: `
              (function() {
                var t = localStorage.getItem('photokeep-theme');
                if (t === 'light' || t === 'dark') {
                  document.documentElement.setAttribute('data-theme', t);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
          <main className="flex-1 pb-14">
            {children}
          </main>
          <BottomTabBar />
          <SettingsButton />
        </div>
      </body>
    </html>
  );
}
