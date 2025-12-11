import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WiFi QR Generator",
  description: "WiFi QR 코드를 생성하고 저장하세요",
  openGraph: {
    title: "WiFi QR Generator",
    description: "WiFi QR 코드를 생성하고 저장하세요",
    url: "https://qrcodei.vercel.app",
    siteName: "WiFi QR Generator",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WiFi QR Generator",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WiFi QR Generator",
    description: "WiFi QR 코드를 생성하고 저장하세요",
    images: ["/og-image.png"],
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
                const theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
