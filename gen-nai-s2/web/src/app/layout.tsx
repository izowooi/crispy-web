import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import "./globals.css";

export const metadata: Metadata = { title: "gen-nai-s2", description: "NovelAI prompt atlas generator" };

const themeScript = `try{const t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t==='dark')}catch{}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><AuthGate>{children}</AuthGate></body></html>;
}
