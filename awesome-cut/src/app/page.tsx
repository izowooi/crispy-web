"use client";

import { useCallback, useRef, useState } from "react";
import JSZip from "jszip";

// ─── 타입 ─────────────────────────────────────────────────────────────────

type GeneratedImage = { base64: string; mimeType: string };
type AppState = "idle" | "generating" | "done" | "upscaling";

// ─── 상수 ─────────────────────────────────────────────────────────────────

const STYLES = [
  { id: "realistic_cinematic", label: "실사 시네마틱", desc: "영화 같은 실사 촬영 느낌" },
  { id: "animated_cinematic", label: "애니메이션 시네마틱", desc: "애니메이션 영화 스타일" },
  { id: "webtoon", label: "웹툰 스타일", desc: "한국 웹툰 그림체" },
  { id: "watercolor", label: "수채화 일러스트", desc: "감성적인 수채화 느낌" },
  { id: "3d_cgi", label: "3D CGI 렌더링", desc: "3D 그래픽 렌더링 스타일" },
];

const MAX_CHARACTERS = 4;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── 캐릭터 슬롯 컴포넌트 ───────────────────────────────────────────────

function CharacterSlot({
  index,
  file,
  preview,
  onFile,
  onRemove,
  disabled,
}: {
  index: number;
  file: File | null;
  preview: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped && ALLOWED_TYPES.includes(dropped.type)) onFile(dropped);
    },
    [onFile]
  );

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer aspect-[3/4] flex flex-col items-center justify-center overflow-hidden
        ${dragging ? "border-indigo-400 bg-indigo-950" : preview ? "border-indigo-600 bg-gray-900" : "border-gray-700 bg-gray-900 hover:border-gray-500"}
        ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />

      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={`캐릭터 ${index + 1}`} className="w-full h-full object-cover" />
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
          >
            ✕
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-xs py-1 text-gray-300">
            캐릭터 {index + 1}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-500 select-none">
          <span className="text-3xl">+</span>
          <span className="text-xs text-center px-2">캐릭터 {index + 1}<br />드래그 또는 클릭</span>
        </div>
      )}
    </div>
  );
}

// ─── 결과 이미지 카드 ───────────────────────────────────────────────────

function ResultCard({
  image,
  index,
  selected,
  isUpscaling,
  upscaledImage,
  onSelect,
  onDownloadUpscaled,
}: {
  image: GeneratedImage;
  index: number;
  selected: boolean;
  isUpscaling: boolean;
  upscaledImage: GeneratedImage | null;
  onSelect: () => void;
  onDownloadUpscaled: () => void;
}) {
  const src = `data:${image.mimeType};base64,${image.base64}`;

  return (
    <div
      className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer group
        ${selected ? "border-indigo-400 ring-2 ring-indigo-400/50" : "border-gray-700 hover:border-gray-500"}`}
      onClick={onSelect}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`생성 이미지 ${index + 1}`} className="w-full h-auto block" />

      {/* 선택 오버레이 */}
      <div className={`absolute inset-0 bg-indigo-500/10 transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />

      {/* 번호 배지 */}
      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
        #{index + 1}
      </div>

      {/* 개별 다운로드 (1K) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const blob = base64ToBlob(image.base64, image.mimeType);
          const ext = image.mimeType.split("/")[1] || "png";
          downloadBlob(blob, `sequence_${index + 1}.${ext}`);
        }}
        className="absolute bottom-2 left-2 bg-black/70 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100"
      >
        1K 저장
      </button>

      {/* 업스케일 버튼 */}
      {selected && (
        <div className="absolute bottom-2 right-2">
          {upscaledImage ? (
            <button
              onClick={(e) => { e.stopPropagation(); onDownloadUpscaled(); }}
              className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              2K 다운로드
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              disabled={isUpscaling}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              {isUpscaling ? "업스케일 중..." : "2K 업스케일"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 메인 페이지 ────────────────────────────────────────────────────────

export default function Page() {
  const [characters, setCharacters] = useState<(File | null)[]>([null, null, null, null]);
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null, null]);
  const [storyline, setStoryline] = useState("");
  const [style, setStyle] = useState("realistic_cinematic");
  const [appState, setAppState] = useState<AppState>("idle");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [upscaledImage, setUpscaledImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGenerating = appState === "generating";
  const isUpscaling = appState === "upscaling";
  const busy = isGenerating || isUpscaling;

  // 캐릭터 파일 설정
  const handleCharacterFile = useCallback(async (index: number, file: File) => {
    const url = await fileToDataUrl(file);
    setCharacters((prev) => { const next = [...prev]; next[index] = file; return next; });
    setPreviews((prev) => { const next = [...prev]; next[index] = url; return next; });
  }, []);

  const handleCharacterRemove = useCallback((index: number) => {
    setCharacters((prev) => { const next = [...prev]; next[index] = null; return next; });
    setPreviews((prev) => { const next = [...prev]; next[index] = null; return next; });
  }, []);

  // 이미지 생성
  const handleGenerate = async () => {
    const validChars = characters.filter(Boolean) as File[];
    if (validChars.length === 0) {
      setError("캐릭터 시트를 최소 1장 업로드해주세요.");
      return;
    }
    if (!storyline.trim()) {
      setError("스토리라인을 입력해주세요.");
      return;
    }

    setError(null);
    setAppState("generating");
    setImages([]);
    setSelectedIdx(null);
    setUpscaledImage(null);

    try {
      const formData = new FormData();
      validChars.forEach((f) => formData.append("characters[]", f));
      formData.append("storyline", storyline.trim());
      formData.append("style", style);

      const res = await fetch("/api/generate", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "알 수 없는 오류");
      }

      setImages(data.images);
      setAppState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 중 오류가 발생했습니다.");
      setAppState("idle");
    }
  };

  // 업스케일
  const handleUpscale = async (idx: number) => {
    const img = images[idx];
    if (!img) return;

    setAppState("upscaling");
    setUpscaledImage(null);

    try {
      const blob = base64ToBlob(img.base64, img.mimeType);
      const ext = img.mimeType.split("/")[1] || "png";
      const file = new File([blob], `image_${idx + 1}.${ext}`, { type: img.mimeType });

      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upscale", { method: "POST", body: formData });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "업스케일 오류");
      }

      const upscaledBlob = await res.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(upscaledBlob);
      });

      setUpscaledImage({ base64, mimeType: upscaledBlob.type || "image/png" });
      setAppState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "업스케일 중 오류가 발생했습니다.");
      setAppState("done");
    }
  };

  // 업스케일 이미지 다운로드
  const handleDownloadUpscaled = () => {
    if (!upscaledImage) return;
    const blob = base64ToBlob(upscaledImage.base64, upscaledImage.mimeType);
    downloadBlob(blob, "upscaled_2k.png");
  };

  // 이미지 카드 클릭 (선택 + 업스케일 트리거)
  const handleSelectImage = (idx: number) => {
    if (busy) return;
    if (selectedIdx === idx) {
      // 이미 선택된 경우 업스케일 실행 (업스케일 결과 없을 때)
      if (!upscaledImage && !isUpscaling) {
        handleUpscale(idx);
      }
      return;
    }
    setSelectedIdx(idx);
    setUpscaledImage(null);
  };

  // ZIP 다운로드
  const handleDownloadZip = async () => {
    if (images.length === 0) return;
    const zip = new JSZip();
    images.forEach((img, i) => {
      const blob = base64ToBlob(img.base64, img.mimeType);
      const ext = img.mimeType.split("/")[1] || "png";
      zip.file(`sequence_${i + 1}.${ext}`, blob);
    });
    const content = await zip.generateAsync({ type: "blob" });
    downloadBlob(content, "awesome-cut_sequences.zip");
  };

  // 재생성
  const handleRegenerate = () => {
    setImages([]);
    setSelectedIdx(null);
    setUpscaledImage(null);
    setError(null);
    setAppState("idle");
    handleGenerate();
  };

  const characterCount = characters.filter(Boolean).length;

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* 헤더 */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">awesome-cut</h1>
        <p className="text-gray-400 text-sm">
          캐릭터 시트 + 스토리라인으로 3×3 시네마틱 시퀀스를 생성합니다
        </p>
      </div>

      {/* 1. 캐릭터 슬롯 */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          캐릭터 시트 <span className="text-gray-600 normal-case font-normal">({characterCount}/{MAX_CHARACTERS})</span>
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: MAX_CHARACTERS }, (_, i) => (
            <CharacterSlot
              key={i}
              index={i}
              file={characters[i]}
              preview={previews[i]}
              onFile={(f) => handleCharacterFile(i, f)}
              onRemove={() => handleCharacterRemove(i)}
              disabled={busy}
            />
          ))}
        </div>
      </section>

      {/* 2. 스토리라인 */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          스토리라인
        </h2>
        <textarea
          value={storyline}
          onChange={(e) => setStoryline(e.target.value)}
          disabled={busy}
          maxLength={500}
          rows={4}
          placeholder="예시: 바리스타이자 카페 사장인 남자주인공과 아르바이트생인 여자주인공 사이에 벌어지는 로맨스의 설레는 시작"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
        />
        <div className="text-right text-xs text-gray-600 mt-1">{storyline.length}/500</div>
      </section>

      {/* 3. 스타일 선택 */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          시네마틱 스타일
        </h2>
        <div className="flex flex-col gap-2">
          {STYLES.map((s) => (
            <label
              key={s.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors
                ${style === s.id ? "border-indigo-500 bg-indigo-950/50" : "border-gray-700 bg-gray-900 hover:border-gray-500"}
                ${busy ? "opacity-50 pointer-events-none" : ""}`}
            >
              <input
                type="radio"
                name="style"
                value={s.id}
                checked={style === s.id}
                onChange={() => setStyle(s.id)}
                className="accent-indigo-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-100">{s.label}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* 오류 메시지 */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 생성 버튼 */}
      {appState !== "done" && (
        <button
          onClick={handleGenerate}
          disabled={busy || characterCount === 0 || !storyline.trim()}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold rounded-xl transition-colors text-base"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              4장 생성 중... (최대 2분 소요)
            </span>
          ) : (
            "시퀀스 생성하기"
          )}
        </button>
      )}

      {/* 결과 영역 */}
      {images.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              생성 결과
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadZip}
                disabled={busy}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
              >
                ZIP 다운로드
              </button>
              <button
                onClick={handleRegenerate}
                disabled={busy}
                className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
              >
                재생성
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            이미지를 클릭해서 선택 → 한 번 더 클릭하면 2K 업스케일이 시작됩니다.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {images.map((img, i) => (
              <ResultCard
                key={i}
                image={img}
                index={i}
                selected={selectedIdx === i}
                isUpscaling={isUpscaling && selectedIdx === i}
                upscaledImage={selectedIdx === i ? upscaledImage : null}
                onSelect={() => handleSelectImage(i)}
                onDownloadUpscaled={handleDownloadUpscaled}
              />
            ))}
          </div>

          {isUpscaling && (
            <div className="mt-4 text-center text-sm text-indigo-400 flex items-center justify-center gap-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full" />
              2K 업스케일 진행 중...
            </div>
          )}

          {upscaledImage && (
            <div className="mt-4 px-4 py-3 bg-green-950 border border-green-800 rounded-xl text-green-300 text-sm text-center">
              2K 업스케일 완료! 이미지 위의 &ldquo;2K 다운로드&rdquo; 버튼을 눌러 저장하세요.
            </div>
          )}

          {/* 수정 후 새 생성 */}
          <button
            onClick={() => {
              setImages([]);
              setSelectedIdx(null);
              setUpscaledImage(null);
              setAppState("idle");
              setError(null);
            }}
            className="mt-6 w-full py-3 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 rounded-xl transition-colors text-sm"
          >
            처음으로 돌아가기 (캐릭터/스토리 수정)
          </button>
        </section>
      )}

      {/* 푸터 */}
      <footer className="mt-16 text-center text-xs text-gray-700">
        Powered by Nano Banana 2 (Gemini 3.1 Flash Image)
      </footer>
    </main>
  );
}
