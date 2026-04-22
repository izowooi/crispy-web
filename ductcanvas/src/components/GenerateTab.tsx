"use client";

import { useState } from "react";
import Image from "next/image";

const ASPECT_RATIOS = ["1:1", "3:2", "2:3"] as const;
const QUALITIES = ["auto", "low", "medium", "high"] as const;
const OUTPUT_FORMATS = ["webp", "png", "jpeg"] as const;

export function GenerateTab() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<(typeof ASPECT_RATIOS)[number]>("1:1");
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]>("auto");
  const [numImages, setNumImages] = useState(1);
  const [outputFormat, setOutputFormat] = useState<(typeof OUTPUT_FORMATS)[number]>("webp");
  const [background, setBackground] = useState<"auto" | "opaque">("auto");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");

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
          background,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "생성 실패");
      }

      const data = await res.json();
      setImages(data.images);
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

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted">배경</label>
        {(["auto", "opaque"] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBackground(b)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              background === b
                ? "border-accent bg-accent text-white"
                : "border-border hover:border-accent"
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={loading || !prompt.trim()}
        className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "생성 중..." : "이미지 생성"}
      </button>

      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}

      {/* Results */}
      {images.length > 0 && (
        <div className={`grid gap-4 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {images.map((url, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border border-border bg-card">
              <Image
                src={url}
                alt={`Generated ${i + 1}`}
                width={1024}
                height={1024}
                className="w-full h-auto"
              />
              <a
                href={url}
                download={`ductcanvas-${i + 1}.${outputFormat}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm">
                  다운로드
                </span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
