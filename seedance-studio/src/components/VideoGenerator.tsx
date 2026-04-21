"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { GuidedPromptBuilder } from "./GuidedPromptBuilder";
import { ThemeToggle } from "./ThemeToggle";
import { buildPrompt } from "@/lib/prompt";
import { PRESETS } from "@/lib/presets";
import type { Preset, GuidedPromptState, VideoSettings } from "@/lib/types";

type GenStatus = "idle" | "loading" | "polling" | "succeeded" | "failed";

const DEFAULT_SETTINGS: VideoSettings = {
  duration: 7,
  resolution: "720p",
  aspectRatio: "16:9",
  generateAudio: true,
};

const DEFAULT_GUIDED: GuidedPromptState = {
  subject: "",
  action: "",
  setting: "",
  cameraShot: "",
  lighting: "",
  mood: "",
  visualStyle: "",
};

export function VideoGenerator() {
  const [loadedPreset, setLoadedPreset] = useState<Preset | null>(null);
  const [guided, setGuided] = useState<GuidedPromptState>(DEFAULT_GUIDED);
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_SETTINGS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [status, setStatus] = useState<GenStatus>("idle");
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activePrompt = useMemo(() => buildPrompt(guided), [guided]);

  const handleLoadPreset = useCallback((preset: Preset) => {
    setLoadedPreset(preset);
    setSettings(preset.settings);
    setGuided({
      subject: preset.subject ?? "",
      action: preset.action ?? "",
      setting: preset.setting ?? "",
      cameraShot: preset.cameraShot ?? "",
      lighting: preset.lighting ?? "",
      mood: preset.mood ?? "",
      visualStyle: preset.visualStyle ?? "",
    });
    setDrawerOpen(false);
    setStatus("idle");
    setVideoUrl(null);
    setPredictionId(null);
    setError(null);
  }, []);

  const handleClearPreset = () => {
    setLoadedPreset(null);
    setGuided(DEFAULT_GUIDED);
    setSettings(DEFAULT_SETTINGS);
  };

  useEffect(() => {
    if (status !== "polling" || !predictionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/predictions/${predictionId}`);
        const data = await res.json();
        if (data.status === "succeeded") {
          setVideoUrl(data.output);
          setStatus("succeeded");
        } else if (data.status === "failed" || data.status === "canceled") {
          setError(data.error ?? "비디오 생성에 실패했습니다.");
          setStatus("failed");
        }
      } catch {
        setError("상태 확인 중 오류가 발생했습니다.");
        setStatus("failed");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [status, predictionId]);

  const handleGenerate = async () => {
    if (!activePrompt.trim()) {
      setError("주제 또는 행동을 입력해주세요.");
      return;
    }
    setError(null);
    setVideoUrl(null);
    setPredictionId(null);
    setStatus("loading");
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: activePrompt,
          duration: settings.duration,
          resolution: settings.resolution,
          aspect_ratio: settings.aspectRatio,
          generate_audio: settings.generateAudio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "요청 실패");
      setPredictionId(data.id);
      setStatus("polling");
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message ?? "비디오 생성 요청 중 오류가 발생했습니다.");
      setStatus("failed");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setVideoUrl(null);
    setPredictionId(null);
    setError(null);
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `seedance-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const isGenerating = status === "loading" || status === "polling";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card z-20">
        <div className="p-4 border-b border-border">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            프리셋
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleLoadPreset(preset)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2.5 text-sm ${
                loadedPreset?.id === preset.id
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-foreground/70 hover:bg-border hover:text-foreground"
              }`}
            >
              <span className="text-base leading-none shrink-0">{preset.emoji}</span>
              <span className="leading-tight">{preset.title}</span>
              {loadedPreset?.id === preset.id && (
                <span className="ml-auto text-xs shrink-0">✓</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
          <h1 className="text-xl font-bold text-foreground">🎬 Seedance Studio</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden rounded-lg border border-border px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground hover:border-accent transition-colors"
            >
              🎨 프리셋
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
          {/* Loaded preset badge */}
          {loadedPreset ? (
            <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-lg border border-accent/30 bg-accent/8">
              <span className="text-lg">{loadedPreset.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-accent">{loadedPreset.title}</span>
                <span className="text-xs text-muted ml-2 hidden sm:inline">— 로드됨. 아래 내용을 자유롭게 수정하세요.</span>
              </div>
              <button
                onClick={handleClearPreset}
                className="shrink-0 text-xs text-muted hover:text-foreground px-2 py-1 rounded hover:bg-border transition-colors"
              >
                ✕ 초기화
              </button>
            </div>
          ) : (
            <div className="mb-5 px-4 py-3 rounded-lg border border-dashed border-border text-sm text-muted text-center">
              좌측 사이드바에서 프리셋을 선택하거나, 아래에 직접 내용을 입력하세요.
            </div>
          )}

          {/* Edit form */}
          <div className="rounded-xl border border-border bg-card/40 p-5 mb-5">
            <GuidedPromptBuilder
              guided={guided}
              settings={settings}
              onGuidedChange={(updates) =>
                setGuided((prev) => ({ ...prev, ...updates }))
              }
              onSettingsChange={(updates) =>
                setSettings((prev) => ({ ...prev, ...updates }))
              }
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Generate button */}
          {status !== "succeeded" && (
            <div className="flex justify-center mb-6">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !activePrompt.trim()}
                className="rounded-xl bg-accent px-10 py-4 text-lg font-bold text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-accent/20"
              >
                {isGenerating ? "⏳ 생성 중..." : "🎬 영상 생성하기"}
              </button>
            </div>
          )}

          {/* Generating spinner */}
          {isGenerating && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent" />
              <p className="text-foreground/70">생성 중... (약 30~60초 소요)</p>
              <p className="text-xs text-muted">Seedance 2.0이 영상을 만들고 있습니다</p>
            </div>
          )}

          {/* Result */}
          {status === "succeeded" && videoUrl && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">✅ 생성 완료!</h2>
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className="w-full rounded-lg mb-4"
              />
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDownload}
                  className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                >
                  ⬇️ 다운로드
                </button>
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-border px-6 py-2 text-sm font-medium text-foreground/70 hover:border-accent hover:text-foreground"
                >
                  🔄 다시 만들기
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-2xl max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-foreground">프리셋 선택</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-muted hover:text-foreground text-xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-border transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleLoadPreset(preset)}
                    className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                      loadedPreset?.id === preset.id
                        ? "border-accent bg-accent/10"
                        : "border-border bg-background hover:border-accent/50"
                    }`}
                  >
                    <div className="text-3xl mb-2 text-center">{preset.emoji}</div>
                    <h3 className="font-bold text-xs mb-1 text-foreground text-center leading-tight">
                      {preset.title}
                    </h3>
                    <p className="text-xs text-muted text-center line-clamp-2 leading-tight">
                      {preset.description}
                    </p>
                    {loadedPreset?.id === preset.id && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
