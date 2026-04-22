"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

const LOADING_MESSAGES = [
  { emoji: "💄", text: "AI 배우들이 화장을 고치고 있어요" },
  { emoji: "🖌️", text: "픽셀 하나하나를 손으로 그리는 중..." },
  { emoji: "🎬", text: "감독님이 NG를 연발하고 계세요" },
  { emoji: "🌙", text: "CG팀이 야근 중입니다" },
  { emoji: "💡", text: "빛의 굴절 각도를 계산하는 중..." },
  { emoji: "☕", text: "AI가 잠시 커피 한 잔 하고 있어요" },
  { emoji: "🧠", text: "뉴런들이 격렬하게 토론 중" },
  { emoji: "🎥", text: "스필버그도 깜짝 놀랄 퀄리티를 위해..." },
  { emoji: "🏆", text: "영화제 수상을 노리는 중" },
  { emoji: "⏳", text: "타임라인에 프레임을 채우는 중..." },
  { emoji: "🎨", text: "배경 화가가 열심히 붓질 중" },
  { emoji: "🌀", text: "물리 법칙을 잠시 무시하는 중" },
  { emoji: "🌈", text: "색감 튜닝 중..." },
  { emoji: "⚡", text: "VFX팀이 특수효과 작업 중" },
  { emoji: "📷", text: "완벽한 카메라 앵글 고민 중..." },
  { emoji: "💡", text: "조명 스태프가 조명 세팅 중" },
  { emoji: "📜", text: "AI 배우들이 대사를 외우는 중" },
  { emoji: "🎞️", text: "초당 24프레임의 마법 시전 중" },
  { emoji: "👀", text: "아카데미 심사위원 눈치 보는 중" },
  { emoji: "🌌", text: "현실과 상상의 경계를 허무는 중" },
  { emoji: "😴", text: "AI가 슬그머니 낮잠을... 아니 열심히 일하는 중" },
  { emoji: "🚀", text: "거의 다 왔어요! (이 말을 한 지 좀 됐네요)" },
  { emoji: "🔬", text: "영상미 최적화 중..." },
  { emoji: "🎭", text: "클라이맥스 장면을 연출 중" },
  { emoji: "✨", text: "영감의 신을 기다리는 중" },
  { emoji: "🔧", text: "보이지 않는 곳에서 열심히 작업 중" },
  { emoji: "🖼️", text: "마지막 터치 중... (아마도)" },
  { emoji: "🤖", text: "Seedance 2.0이 최선을 다하고 있어요" },
  { emoji: "🎉", text: "잠시 후 멋진 영상이 등장합니다" },
  { emoji: "⏰", text: "기다림도 창작의 일부랍니다" },
];

export function VideoGenerator() {
  const [loadedPreset, setLoadedPreset] = useState<Preset | null>(null);
  const [guided, setGuided] = useState<GuidedPromptState>(DEFAULT_GUIDED);
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_SETTINGS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 프롬프트 텍스트 (최종 편집 가능)
  const [promptText, setPromptText] = useState("");
  const [promptEdited, setPromptEdited] = useState(false);

  const [status, setStatus] = useState<GenStatus>("idle");
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 로딩 메시지 순환
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgKey, setMsgKey] = useState(0);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isGenerating = status === "loading" || status === "polling";

  // guided 필드 변경 시 프롬프트 자동 재생성 (사용자가 직접 편집하지 않은 경우)
  useEffect(() => {
    if (!promptEdited) {
      setPromptText(buildPrompt(guided));
    }
  }, [guided, promptEdited]);

  // 로딩 메시지 타이머
  useEffect(() => {
    if (isGenerating) {
      setMsgIndex(0);
      setMsgKey((k) => k + 1);
      msgIntervalRef.current = setInterval(() => {
        setMsgIndex((i) => {
          const next = (i + 1) % LOADING_MESSAGES.length;
          setMsgKey((k) => k + 1);
          return next;
        });
      }, 3500);
    } else {
      if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
    }
    return () => {
      if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
    };
  }, [isGenerating]);

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
    setPromptEdited(false); // guided 변경 시 effect가 자동 재생성
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
    setPromptEdited(false);
  };

  const resetPrompt = () => {
    setPromptEdited(false);
    setPromptText(buildPrompt(guided));
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
    if (!promptText.trim()) {
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
          prompt: promptText,
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

  const currentMsg = LOADING_MESSAGES[msgIndex];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card z-20 overflow-y-auto">
        <div className="p-4 border-b border-border sticky top-0 bg-card">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            프리셋
          </span>
        </div>
        <nav className="p-2 space-y-0.5">
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
          {/* Preset badge */}
          {loadedPreset ? (
            <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-lg border border-accent/30 bg-accent/8">
              <span className="text-lg">{loadedPreset.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-accent">{loadedPreset.title}</span>
                <span className="text-xs text-muted ml-2 hidden sm:inline">
                  — 로드됨. 아래 내용을 자유롭게 수정하세요.
                </span>
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
          <div className="rounded-xl border border-border bg-card/40 p-5 mb-4">
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

          {/* 편집 가능한 최종 프롬프트 */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-foreground/70">
                최종 프롬프트
                {promptEdited && (
                  <span className="ml-2 text-xs font-normal text-amber-500">● 직접 편집됨</span>
                )}
              </label>
              {promptEdited && (
                <button
                  onClick={resetPrompt}
                  className="text-xs text-accent hover:underline transition-colors"
                >
                  ↩ 필드에서 재생성
                </button>
              )}
            </div>
            <textarea
              value={promptText}
              onChange={(e) => {
                setPromptText(e.target.value);
                setPromptEdited(true);
              }}
              rows={3}
              placeholder="프롬프트를 직접 입력하거나, 위 필드를 채워 자동 생성하세요."
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted focus:border-accent focus:outline-none resize-none transition-colors"
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
                disabled={isGenerating || !promptText.trim()}
                className="rounded-xl bg-accent px-10 py-4 text-lg font-bold text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-accent/20"
              >
                {isGenerating ? "⏳ 생성 중..." : "🎬 영상 생성하기"}
              </button>
            </div>
          )}

          {/* 재치있는 로딩 섹션 */}
          {isGenerating && (
            <div className="flex flex-col items-center gap-6 py-10">
              {/* 스피너 + 펄스 링 */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full border-2 border-accent/30 animate-pulse-ring" />
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent" />
              </div>

              {/* 메시지 카드 */}
              <div className="text-center max-w-xs">
                <div
                  key={`emoji-${msgKey}`}
                  className="animate-fade-in-up text-5xl mb-3"
                >
                  {currentMsg.emoji}
                </div>
                <p
                  key={`text-${msgKey}`}
                  className="animate-fade-in-up text-base font-medium text-foreground/80"
                >
                  {currentMsg.text}
                </p>
                <p className="mt-3 text-xs text-muted">약 30~60초 소요됩니다</p>
              </div>

              {/* 진행 점 */}
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-accent/40"
                    style={{ animation: `pulse-ring 1.2s ease-in-out ${i * 0.4}s infinite` }}
                  />
                ))}
              </div>
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
                className="text-muted hover:text-foreground w-8 h-8 flex items-center justify-center rounded hover:bg-border transition-colors"
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
