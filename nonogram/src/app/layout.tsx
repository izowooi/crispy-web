import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '노노그램 문제지',
  description: '노노그램 문제를 인쇄할 수 있는 웹앱',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
