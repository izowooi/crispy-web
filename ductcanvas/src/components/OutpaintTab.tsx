"use client";

import { useState, useRef } from "react";
import Image from "next/image";

const OUTPAINT_PRESETS = [
  { label: "가로 확장 (1:1 → 3:2)", ratio: "3:2", direction: "horizontal" },
  { label: "세로 확장 (1:1 → 2:3)", ratio: "2:3", direction: "vertical" },
  { label: "가로로 2배 (1:1 → 2:1)", ratio: "custom-2:1", direction: "horizontal" },
  { label: "세로로 2배 (1:1 → 1:2)", ratio: "custom-1:2", direction: "vertical" },
] as const;

export function OutpaintTab() {
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customPrompt, setCustomPrompt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setInputImage(e.target?.result as string);
      setOutputImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  };

  const outpaint = async () => {
    if (!inputImage) return;
    setLoading(true);
    setError("");
    setOutputImage(null);

    const preset = OUTPAINT_PRESETS[selectedPreset];

    try {
      const res = await fetch("/api/outpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: inputImage,
          direction: preset.direction,
          ratio: preset.ratio,
          custom_prompt: customPrompt,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "아웃페인팅 실패");
      }

      const data = await res.json();
      setOutputImage(data.image);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent transition-colors"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {inputImage ? (
          <div className="relative max-h-64 overflow-hidden rounded-lg">
            <Image
              src={inputImage}
              alt="Input"
              width={800}
              height={600}
              className="w-full h-auto max-h-64 object-contain"
            />
          </div>
        ) : (
          <div className="py-4">
            <p className="text-4xl mb-3">🖼️</p>
            <p className="font-medium">이미지를 드래그하거나 클릭하여 업로드</p>
            <p className="text-sm text-muted mt-1">PNG, JPG, WebP 지원</p>
          </div>
        )}
      </div>

      {inputImage && (
        <>
          {/* Presets */}
          <div>
            <label className="block text-sm font-medium mb-3">확장 방향</label>
            <div className="grid grid-cols-2 gap-2">
              {OUTPAINT_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPreset(i)}
                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors text-left ${
                    selectedPreset === i
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border hover:border-accent"
                  }`}
                >
                  <span className="mr-2">
                    {preset.direction === "horizontal" ? "↔️" : "↕️"}
                  </span>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          <div>
            <label className="block text-sm font-medium mb-2">
              추가 지침{" "}
              <span className="text-muted font-normal">(선택 — 확장 영역 스타일 지정)</span>
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="예: 맑은 하늘, 녹색 잔디밭으로 자연스럽게 확장"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <button
            onClick={outpaint}
            disabled={loading}
            className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "아웃페인팅 중... (30–60초 소요)" : "아웃페인팅"}
          </button>
        </>
      )}

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      {/* Results */}
      {outputImage && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted text-center">결과</p>
          <div className="relative group rounded-xl overflow-hidden border border-border">
            <Image
              src={outputImage}
              alt="Outpainted"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
            <a
              href={outputImage}
              download="ductcanvas-outpaint.webp"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm">
                다운로드
              </span>
            </a>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs text-muted mb-2 text-center">원본</p>
              <div className="rounded-xl overflow-hidden border border-border">
                <Image
                  src={inputImage!}
                  alt="Original"
                  width={600}
                  height={600}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
