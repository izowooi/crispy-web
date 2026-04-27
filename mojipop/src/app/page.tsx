"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CONCEPTS, DEFAULT_CONCEPT_IDS, type Quality } from "@/lib/concepts";

interface GenerationSlot {
  conceptId: number;
  predictionId: string | null;
  status: "pending" | "polling" | "succeeded" | "failed";
  imageUrl?: string;
  error?: string;
}

const LOADING_MESSAGES = [
  { emoji: "🎨", text: "AI 이모티콘 장인이 작업 중..." },
  { emoji: "✨", text: "귀여움을 조합하는 중..." },
  { emoji: "🐾", text: "나만의 캐릭터 탄생 직전!" },
  { emoji: "🖌️", text: "윤곽선을 하나씩 그리는 중..." },
  { emoji: "😄", text: "표정 하나하나 정성껏 제작 중" },
  { emoji: "⏳", text: "조금만 기다려주세요..." },
  { emoji: "🌟", text: "이모티콘이 하나씩 완성되고 있어요" },
  { emoji: "📱", text: "카카오톡에 쓸 수 있는 이모티콘 완성 임박!" },
];

async function downloadBlob(url: string, filename: string) {
  try {
    const blob = await fetch(url).then((r) => r.blob());
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objUrl);
  } catch {
    window.open(url, "_blank");
  }
}

export default function Home() {
  const [refImages, setRefImages] = useState<string[]>([]);
  const [quality, setQuality] = useState<Quality>("low");
  const [slots, setSlots] = useState<GenerationSlot[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [msgIndex, setMsgIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isGenerating) return;
    const id = setInterval(
      () => setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length),
      1800
    );
    return () => clearInterval(id);
  }, [isGenerating]);

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const remaining = 3 - refImages.length;
      if (remaining <= 0) return;
      const toProcess = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, remaining);

      toProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setRefImages((prev) =>
            prev.length < 3 ? [...prev, result] : prev
          );
        };
        reader.readAsDataURL(file);
      });
    },
    [refImages.length]
  );

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const removeImage = (idx: number) => {
    setRefImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSlot = useCallback(
    (conceptId: number, patch: Partial<GenerationSlot>) => {
      setSlots((prev) =>
        prev.map((s) => (s.conceptId === conceptId ? { ...s, ...patch } : s))
      );
    },
    []
  );

  const pollSlot = useCallback(
    async (conceptId: number, predictionId: string) => {
      while (true) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const res = await fetch(`/api/status?id=${predictionId}`);
          const data = await res.json();
          if (data.status === "succeeded") {
            const output = Array.isArray(data.output)
              ? data.output
              : [data.output];
            updateSlot(conceptId, {
              status: "succeeded",
              imageUrl: String(output[0]),
            });
            return;
          }
          if (data.status === "failed" || data.status === "canceled") {
            updateSlot(conceptId, {
              status: "failed",
              error: data.error || "생성 실패",
            });
            return;
          }
        } catch {
          updateSlot(conceptId, { status: "failed", error: "네트워크 오류" });
          return;
        }
      }
    },
    [updateSlot]
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGlobalError("");
    setMsgIndex(0);

    setSlots(
      DEFAULT_CONCEPT_IDS.map((id) => ({
        conceptId: id,
        predictionId: null,
        status: "pending",
      }))
    );

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: refImages, quality }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error || "생성 요청 실패");
        setSlots([]);
        setIsGenerating(false);
        return;
      }

      const { results } = data as {
        results: Array<{
          conceptId: number;
          predictionId: string | null;
          error?: string;
        }>;
      };

      setSlots(
        results.map((r) => ({
          conceptId: r.conceptId,
          predictionId: r.predictionId,
          status: r.predictionId ? "polling" : "failed",
          error: r.error,
        }))
      );

      await Promise.allSettled(
        results
          .filter((r) => r.predictionId)
          .map((r) => pollSlot(r.conceptId, r.predictionId!))
      );
    } catch {
      setGlobalError("네트워크 오류가 발생했습니다");
      setSlots([]);
    }

    setIsGenerating(false);
  };

  const succeededSlots = slots.filter((s) => s.status === "succeeded");

  const downloadAll = async () => {
    for (const slot of succeededSlots) {
      const concept = CONCEPTS.find((c) => c.id === slot.conceptId);
      await downloadBlob(
        slot.imageUrl!,
        `mojipop-${concept?.labelKo ?? slot.conceptId}-${Date.now()}.webp`
      );
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-3xl">🎭</span>
          <div>
            <h1 className="text-xl font-bold leading-none">MojiPop</h1>
            <p className="text-xs text-muted mt-0.5">AI 이모티콘 생성기</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Step 1: Image Upload */}
        <section>
          <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">
            STEP 1 — 참고 이미지 업로드 (최대 3장)
          </h2>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (refImages.length < 3) fileInputRef.current?.click();
            }}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-colors min-h-[130px] ${
              refImages.length < 3 ? "cursor-pointer" : "cursor-default"
            } ${
              isDragging
                ? "border-accent bg-orange-50"
                : "border-border hover:border-accent"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />

            {refImages.length === 0 ? (
              <>
                <span className="text-4xl mb-2">📸</span>
                <p className="text-sm text-muted text-center">
                  사진을 드래그하거나 클릭해서 업로드
                  <br />
                  <span className="text-xs">
                    반려동물, 셀카 등 최대 3장 · 여러 장 넣으면 더 잘 나와요
                  </span>
                </p>
              </>
            ) : (
              <div className="flex gap-3 flex-wrap justify-center">
                {refImages.map((uri, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uri}
                      alt={`참고 이미지 ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-xl border border-border"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(i);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {refImages.length < 3 && (
                  <div className="w-20 h-20 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-2xl text-muted hover:border-accent transition-colors">
                    +
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Step 2: Quality */}
        <section>
          <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">
            STEP 2 — 이미지 품질
          </h2>
          <div className="flex gap-2">
            {(
              [
                { value: "low", label: "저화질", desc: "빠름 · 저비용" },
                { value: "medium", label: "중화질", desc: "보통" },
                { value: "high", label: "고화질", desc: "느림 · 고비용" },
              ] as { value: Quality; label: string; desc: string }[]
            ).map((q) => (
              <button
                key={q.value}
                onClick={() => setQuality(q.value)}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors flex flex-col items-center gap-0.5 ${
                  quality === q.value
                    ? "bg-accent text-white border-accent"
                    : "bg-background border-border text-foreground hover:border-accent"
                }`}
              >
                <span>{q.label}</span>
                <span
                  className={`text-xs font-normal ${quality === q.value ? "text-orange-100" : "text-muted"}`}
                >
                  {q.desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={refImages.length === 0 || isGenerating}
          className="w-full py-4 bg-accent hover:bg-accent-hover text-white font-bold rounded-2xl text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating
            ? "생성 중..."
            : `이모티콘 ${DEFAULT_CONCEPT_IDS.length}개 생성하기 ✨`}
        </button>

        {globalError && (
          <p className="text-red-500 text-sm text-center bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {globalError}
          </p>
        )}

        {/* Loading message */}
        {isGenerating && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div key={msgIndex} className="animate-msg-in text-center">
              <div className="text-3xl mb-1">{LOADING_MESSAGES[msgIndex].emoji}</div>
              <p className="text-sm text-muted">{LOADING_MESSAGES[msgIndex].text}</p>
            </div>
          </div>
        )}

        {/* Results grid */}
        {slots.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
                생성 결과
              </h2>
              {succeededSlots.length > 0 && !isGenerating && (
                <button
                  onClick={downloadAll}
                  className="text-sm px-3 py-1.5 border border-accent text-accent rounded-lg hover:bg-accent hover:text-white transition-colors"
                >
                  모두 다운로드
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {slots.map((slot) => {
                const concept = CONCEPTS.find((c) => c.id === slot.conceptId);
                return (
                  <div
                    key={slot.conceptId}
                    className="relative aspect-square rounded-xl overflow-hidden border border-border bg-card"
                  >
                    {slot.status === "succeeded" && slot.imageUrl ? (
                      <div className="group relative w-full h-full animate-pop-in">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slot.imageUrl}
                          alt={concept?.labelKo}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() =>
                            downloadBlob(
                              slot.imageUrl!,
                              `mojipop-${concept?.labelKo ?? slot.conceptId}-${Date.now()}.webp`
                            )
                          }
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="px-3 py-1.5 bg-white text-black rounded-lg text-sm font-medium">
                            다운로드
                          </span>
                        </button>
                        <span className="absolute bottom-0 left-0 right-0 text-center text-white text-xs font-medium py-1 bg-black/30">
                          {concept?.labelKo}
                        </span>
                      </div>
                    ) : slot.status === "failed" ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                        <span className="text-2xl">❌</span>
                        <p className="text-xs text-foreground text-center font-medium">
                          {concept?.labelKo}
                        </p>
                        <p className="text-xs text-muted text-center line-clamp-2">
                          {slot.error}
                        </p>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 rounded-full border-[3px] border-border border-t-accent animate-spin" />
                        <p className="text-xs text-muted">{concept?.labelKo}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
