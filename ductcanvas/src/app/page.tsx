"use client";

import { useState, useEffect } from "react";
import { PasswordGate } from "@/components/PasswordGate";
import { GenerateTab } from "@/components/GenerateTab";
import { UpscaleTab } from "@/components/UpscaleTab";
import { OutpaintTab } from "@/components/OutpaintTab";
import { ThemeToggle } from "@/components/ThemeToggle";

type Tab = "generate" | "upscale" | "outpaint";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "generate", label: "이미지 생성", icon: "✨" },
  { id: "upscale", label: "업스케일", icon: "🔍" },
  { id: "outpaint", label: "아웃페인팅", icon: "↔️" },
];

const AUTH_KEY = "ductcanvas-auth";

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("generate");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(AUTH_KEY) === "1") {
      setAuthed(true);
    }
  }, []);

  const handleAuth = () => {
    sessionStorage.setItem(AUTH_KEY, "1");
    setAuthed(true);
  };

  if (!authed) {
    return <PasswordGate onSuccess={handleAuth} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🩹</span>
            <span className="font-bold text-lg">DuctCanvas</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {tab === "generate" && <GenerateTab />}
        {tab === "upscale" && <UpscaleTab />}
        {tab === "outpaint" && <OutpaintTab />}
      </main>
    </div>
  );
}
