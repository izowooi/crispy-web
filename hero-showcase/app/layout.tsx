import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { AuthFooter } from "@/components/AuthFooter";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

export const metadata: Metadata = {
  title: "Hero Showcase",
  description: "판타지 영웅 카드 갤러리",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = token ? await decodeSession(token) : null;

  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <AuthFooter user={user} />
        </ThemeProvider>
      </body>
    </html>
  );
}
