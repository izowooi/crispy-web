import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Qwen Image Edit',
  description: 'AI 이미지 편집 웹앱',
  openGraph: {
    title: 'Qwen Image Edit',
    description: 'AI 이미지 편집 웹앱',
    url: 'https://imgblend.pages.dev',
    siteName: 'Qwen Image Edit',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Qwen Image Edit OpenGraph Image',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qwen Image Edit',
    description: 'AI 이미지 편집 웹앱',
    images: ['/og-image.png'],
  },
  metadataBase: new URL('https://imgblend.pages.dev'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
