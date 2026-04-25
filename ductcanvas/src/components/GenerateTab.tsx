"use client";

import { useState, useEffect } from "react";

const ASPECT_RATIOS = ["1:1", "3:2", "2:3"] as const;
const QUALITIES = ["auto", "low", "medium", "high"] as const;
const OUTPUT_FORMATS = ["webp", "png", "jpeg"] as const;

const LOADING_MESSAGES = [
  { emoji: "🖌️", text: "AI가 붓을 들었습니다" },
  { emoji: "🐝", text: "픽셀들이 열심히 모이는 중" },
  { emoji: "✨", text: "상상력을 현실로 변환 중" },
  { emoji: "🔥", text: "GPU가 땀 흘리는 소리 들리시나요?" },
  { emoji: "🤔", text: "AI 화가가 구도를 고민 중" },
  { emoji: "🌌", text: "우주에서 영감을 받아오는 중" },
  { emoji: "🎨", text: "색깔들이 캔버스로 달려가고 있어요" },
  { emoji: "☕", text: "커피 한 잔 마시고 오세요" },
  { emoji: "🏆", text: "마스터피스 완성까지 조금만 더" },
  { emoji: "😅", text: "이 정도면 직접 그리는 게 더 빠를 것 같기도..." },
  { emoji: "🎭", text: "완벽한 작품을 위해 최선을 다하고 있어요" },
  { emoji: "🚀", text: "빠른 AI도 예술 앞에선 잠시 멈춥니다" },
];

async function downloadBlob(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

async function pollPrediction(id: string): Promise<string[]> {
  while (true) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`/api/status?id=${id}`);
    const data = await res.json();
    if (data.status === "succeeded") {
      const output = Array.isArray(data.output) ? data.output : [data.output];
      return output.map(String);
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error || "생성 실패");
    }
  }
}

export function GenerateTab() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<(typeof ASPECT_RATIOS)[number]>("1:1");
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("auto");
  const [numImages, setNumImages] = useState(1);
  const [outputFormat, setOutputFormat] = useState<(typeof OUTPUT_FORMATS)[number]>("webp");
  const [loading, setLoading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading) { setMsgIndex(0); return; }
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setImages([]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          quality,
          number_of_images: numImages,
          output_format: outputFormat,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "생성 실패");
      }

      const { id } = await res.json();
      const imageUrls = await pollPrediction(id);
      setImages(imageUrls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <div>
        <label className="block text-sm font-medium mb-2">프롬프트</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="생성할 이미지를 설명하세요..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:border-accent transition-colors resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
          }}
        />
        <p className="text-xs text-muted mt-1">Cmd/Ctrl + Enter로 생성</p>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1 text-muted">비율</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-accent"
          >
            {ASPECT_RATIOS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-muted">품질</label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as typeof quality)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-accent"
          >
            {QUALITIES.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-muted">개수 (1–4)</label>
          <input
            type="number"
            min={1}
            max={4}
            value={numImages}
            onChange={(e) => setNumImages(Math.min(4, Math.max(1, Number(e.target.value))))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-muted">포맷</label>
          <select
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as typeof outputFormat)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-accent"
          >
            {OUTPUT_FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={loading || !prompt.trim()}
        className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        이미지 생성
      </button>

      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-5 py-10">
          <div className="w-12 h-12 rounded-full border-4 border-border border-t-accent animate-spin" />

          <div key={msgIndex} className="animate-msg-in text-center px-4">
            <div className="text-4xl mb-2">{LOADING_MESSAGES[msgIndex].emoji}</div>
            <p className="text-sm text-muted">{LOADING_MESSAGES[msgIndex].text}</p>
          </div>

          <div className="flex gap-1.5">
            {LOADING_MESSAGES.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                  i === msgIndex ? "bg-accent" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && images.length > 0 && (
        <div className={`grid gap-4 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {images.map((url, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border border-border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Generated ${i + 1}`}
                className="w-full h-auto block"
              />
              <button
                onClick={() => downloadBlob(url, `ductcanvas-${i + 1}.${outputFormat}`)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <span className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm">
                  다운로드
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
