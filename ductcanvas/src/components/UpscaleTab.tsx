"use client";

import { useState, useRef } from "react";
import Image from "next/image";

export function UpscaleTab() {
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("Upscale to maximum resolution, preserve all details");
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

  const upscale = async () => {
    if (!inputImage) return;
    setLoading(true);
    setError("");
    setOutputImage(null);

    try {
      const res = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: inputImage, prompt }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "업스케일 실패");
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
            <p className="text-4xl mb-3">📷</p>
            <p className="font-medium">이미지를 드래그하거나 클릭하여 업로드</p>
            <p className="text-sm text-muted mt-1">PNG, JPG, WebP 지원</p>
          </div>
        )}
      </div>

      {inputImage && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">업스케일 지침 (선택)</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <button
            onClick={upscale}
            disabled={loading}
            className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "업스케일 중... (30–60초 소요)" : "업스케일"}
          </button>
        </>
      )}

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      {/* Before / After */}
      {outputImage && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted mb-2 text-center font-medium">원본</p>
            <div className="rounded-xl overflow-hidden border border-border">
              <Image
                src={inputImage!}
                alt="Before"
                width={800}
                height={600}
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted mb-2 text-center font-medium">업스케일</p>
            <div className="relative group rounded-xl overflow-hidden border border-border">
              <Image
                src={outputImage}
                alt="After"
                width={800}
                height={600}
                className="w-full h-auto object-contain"
              />
              <a
                href={outputImage}
                download="ductcanvas-upscale.webp"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm">
                  다운로드
                </span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
