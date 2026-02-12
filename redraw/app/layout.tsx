import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Redraw - AI 이미지 스타일 변형',
  description: 'Replicate API를 활용한 이미지 스타일 변형 웹앱',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
