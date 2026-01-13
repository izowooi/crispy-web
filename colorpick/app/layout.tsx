import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://colorpick.pages.dev/"),
  title: "ColorPick - Image Color Analyzer",
  description: "Analyze color proportions in images. Upload an image to extract dominant colors and see their percentages.",
  keywords: ["color", "image", "analyzer", "palette", "extractor"],
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    shortcut: "/icon-192.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ColorPick",
  },
  openGraph: {
    title: "ColorPick - Image Color Analyzer",
    description: "Analyze color proportions in images. Upload an image to extract dominant colors and see their percentages.",
    url: "https://colorpick.pages.dev/",
    siteName: "ColorPick",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ColorPick App Interface",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
