"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PresetGrid } from "./PresetGrid";
import { GuidedPromptBuilder } from "./GuidedPromptBuilder";
import { buildPrompt } from "@/lib/prompt";
import type { Preset, GuidedPromptState, VideoSettings } from "@/lib/types";

type Tab = "preset" | "custom";
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
  const [tab, setTab] = useState<Tab>("preset");
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [guided, setGuided] = useState<GuidedPromptState>(DEFAULT_GUIDED);
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_SETTINGS);

  const [status, setStatus] = useState<GenStatus>("idle");
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activePrompt = useMemo(() => {
    if (tab === "preset" && selectedPreset) return selectedPreset.prompt;
    return buildPrompt(guided);
  }, [tab, selectedPreset, guided]);

  const handlePresetSelect = useCallback((preset: Preset) => {
    setSelectedPreset(preset);
    setSettings(preset.settings);
  }, []);

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
      setError(
        tab === "preset"
          ? "프리셋을 선택해주세요."
          : "주제 또는 행동을 입력해주세요."
      );
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

      if (!res.ok) {
        throw new Error(data.error ?? "요청 실패");
      }

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
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold text-foreground mb-2">🎬 Seedance Studio</h1>
        <p className="text-foreground/60">Seedance 2.0 AI로 나만의 영상을 만들어보세요</p>
      </header>

      {/* 탭 스위처 */}
      <div className="flex rounded-xl border border-border bg-card/50 p-1 mb-8 max-w-xs mx-auto">
        {(["preset", "custom"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-accent text-white"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {t === "preset" ? "🎨 프리셋" : "✏️ 자유 제작"}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="mb-8">
        {tab === "preset" ? (
          <PresetGrid
            onSelect={handlePresetSelect}
            selectedId={selectedPreset?.id ?? null}
          />
        ) : (
          <div className="rounded-xl border border-border bg-card/30 p-6">
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
        )}
      </div>

      {/* 프리셋 선택 시 설정 미리보기 */}
      {tab === "preset" && selectedPreset && (
        <div className="mb-6 rounded-xl border border-border bg-card/30 p-4">
          <p className="text-xs text-foreground/50 mb-2">선택된 프리셋 설정</p>
          <div className="flex flex-wrap gap-2">
            {[
              settings.duration === -1 ? "자동" : `${settings.duration}초`,
              settings.resolution,
              settings.aspectRatio,
              settings.generateAudio ? "🔊 오디오" : "🔇 무음",
            ].map((label) => (
              <span
                key={label}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground/70"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* 생성 버튼 */}
      {status !== "succeeded" && (
        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !activePrompt.trim()}
            className="rounded-xl bg-accent px-10 py-4 text-lg font-bold text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-accent/30"
          >
            {isGenerating ? "⏳ 생성 중..." : "🎬 영상 생성하기"}
          </button>
        </div>
      )}

      {/* 생성 중 스피너 */}
      {isGenerating && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent" />
          <p className="text-foreground/70">생성 중... (약 30~60초 소요)</p>
          <p className="text-xs text-foreground/40">Seedance 2.0이 영상을 만들고 있습니다</p>
        </div>
      )}

      {/* 결과 */}
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
    </div>
  );
}
