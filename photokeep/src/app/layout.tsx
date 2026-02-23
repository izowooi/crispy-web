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
