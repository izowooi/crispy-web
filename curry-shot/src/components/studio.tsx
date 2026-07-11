"use client";

import {
  Aperture,
  ArrowRight,
  Check,
  ChevronDown,
  Clapperboard,
  CloudUpload,
  Crop,
  Film,
  ImageIcon,
  KeyRound,
  Layers3,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ACCESS_CODE_STORAGE_KEY,
  VIDEO_JOB_STORAGE_KEY,
  accessRequestHeaders,
  createClientRequestId,
} from "./client-api";
import {
  formatBytes,
  getImageDimensions,
  renderImageWithOverlay,
  safeDownloadName,
  triggerBlobDownload,
  validateImageFile,
} from "./image-client";
import { ResultGallery } from "./result-gallery";
import type {
  OverlayConfig,
  Provider,
  ReplicateModel,
  ResultAsset,
  SourceMode,
  Treatment,
  VideoJob,
} from "./studio-types";
import { VideoSheet } from "./video-sheet";

type ImageDimensions = { width: number; height: number };
type Count = 1 | 2 | 4;
type Quality = "medium" | "high";
type OutputRatio = "source" | "landscape" | "portrait" | "square";

type QueuedPrediction = {
  id: string;
  status: string;
  index: number;
};

type ImageApiResponse =
  | { kind: "complete"; images: string[]; missingCount?: number; requestId?: string }
  | {
      kind: "queued";
      predictions: QueuedPrediction[];
      queueErrors?: Array<{ index: number; message: string }>;
      model?: string;
    };

type AccessState = {
  required: boolean;
  misconfigured: boolean;
};

const VIDEO_STATUSES: VideoJob["status"][] = [
  "starting",
  "processing",
  "succeeded",
  "failed",
  "canceled",
  "aborted",
];

function restoreVideoJob(value: string | null): VideoJob | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<VideoJob>;
    if (
      typeof parsed.predictionId !== "string" ||
      !VIDEO_STATUSES.includes(parsed.status as VideoJob["status"]) ||
      (parsed.model !== "seedance" && parsed.model !== "grok") ||
      typeof parsed.audio !== "boolean"
    ) {
      return null;
    }
    return {
      predictionId: parsed.predictionId,
      status: parsed.status as VideoJob["status"],
      model: parsed.model,
      audio: parsed.audio,
      ...(typeof parsed.output === "string" ? { output: parsed.output } : {}),
      ...(typeof parsed.error === "string" ? { error: parsed.error } : {}),
    };
  } catch {
    return null;
  }
}

const REPLICATE_LABELS: Record<ReplicateModel, string> = {
  flux: "Replicate · FLUX.2 Flex",
  seedream: "Replicate · Seedream 4.5",
  nano: "Replicate · Nano Banana 2",
};

const POLL_DELAYS = [2_000, 2_500, 3_000, 4_000, 5_000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clientId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function asBoolean(value: boolean): string {
  return value ? "true" : "false";
}

function providerLabel(provider: Provider, replicateModel: ReplicateModel): string {
  return provider === "openai" ? "OpenAI · GPT Image 2" : REPLICATE_LABELS[replicateModel];
}

function costCopy(provider: Provider, replicateModel: ReplicateModel, quality: Quality, count: Count): string {
  if (provider === "openai") {
    const perImage = quality === "high" ? "$0.17–0.21" : "$0.04–0.05";
    return `출력 ${count}장 · 장당 약 ${perImage} + 입력 비용`;
  }
  if (replicateModel === "flux") return `출력 ${count}장 · 약 $${(0.12 * count).toFixed(2)} 예상`;
  if (replicateModel === "seedream") return `출력 ${count}장 · 약 $${(0.04 * count).toFixed(2)} 예상`;
  return `출력 ${count}장 · 해상도별 과금`;
}

function requestedDimensions(dimensions: ImageDimensions, ratio: OutputRatio): ImageDimensions {
  if (ratio === "landscape") return { width: 1536, height: 1024 };
  if (ratio === "portrait") return { width: 1024, height: 1536 };
  if (ratio === "square") return { width: 1024, height: 1024 };
  return dimensions;
}

export function Studio() {
  const [accessState, setAccessState] = useState<AccessState | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sourceMode, setSourceMode] = useState<SourceMode>("scene");
  const [treatment, setTreatment] = useState<Treatment>("faithful");
  const [provider, setProvider] = useState<Provider>("openai");
  const [replicateModel, setReplicateModel] = useState<ReplicateModel>("flux");
  const [count, setCount] = useState<Count>(1);
  const [quality, setQuality] = useState<Quality>("medium");
  const [outputRatio, setOutputRatio] = useState<OutputRatio>("source");
  const [customPrompt, setCustomPrompt] = useState("");
  const [keepTitle, setKeepTitle] = useState(false);
  const [preservedTitle, setPreservedTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [dialogue, setDialogue] = useState("");

  const [results, setResults] = useState<ResultAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [videoSource, setVideoSource] = useState<ResultAsset | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoJob, setVideoJob] = useState<VideoJob | null>(null);
  const [videoHydrated, setVideoHydrated] = useState(false);

  const previewRef = useRef<string | null>(null);
  const runRef = useRef(0);
  const paidRequestRef = useRef(false);

  const overlay = useMemo<OverlayConfig>(
    () => ({
      title: sourceMode === "cover" && keepTitle ? preservedTitle.trim() || undefined : undefined,
      speaker: sourceMode === "dialogue" ? speaker.trim() || undefined : undefined,
      dialogue: sourceMode === "dialogue" ? dialogue.trim() || undefined : undefined,
    }),
    [dialogue, keepTitle, preservedTitle, sourceMode, speaker],
  );

  const displayAspectRatio = useMemo(() => {
    if (!dimensions) return "4 / 3";
    const requested = requestedDimensions(
      dimensions,
      provider === "replicate" ? "source" : outputRatio,
    );
    return `${requested.width} / ${requested.height}`;
  }, [dimensions, outputRatio, provider]);

  const pending = submitting || results.some((result) => result.status === "queued");
  const videoActive = videoJob?.status === "starting" || videoJob?.status === "processing";
  const controlsLocked = pending || videoActive;
  const accessAllowed = Boolean(
    accessState &&
      !accessState.misconfigured &&
      (!accessState.required || accessCode.trim()),
  );
  useEffect(() => {
    let canceled = false;
    try {
      const storedAccessCode = window.sessionStorage.getItem(ACCESS_CODE_STORAGE_KEY) ?? "";
      queueMicrotask(() => {
        if (!canceled) setAccessCode(storedAccessCode);
      });
    } catch {
      queueMicrotask(() => {
        if (!canceled) setAccessError("이 브라우저에서는 세션 접근 코드를 저장할 수 없습니다.");
      });
    }

    void fetch("/api/access", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as Partial<AccessState> & { error?: string };
        if (!response.ok || typeof body.required !== "boolean" || typeof body.misconfigured !== "boolean") {
          throw new Error(body.error || "접근 보호 상태를 확인하지 못했습니다.");
        }
        if (!canceled) {
          setAccessState({ required: body.required, misconfigured: body.misconfigured });
          setAccessError(null);
        }
      })
      .catch((error: unknown) => {
        if (!canceled) {
          setAccessState(null);
          setAccessError(error instanceof Error ? error.message : "접근 보호 상태를 확인하지 못했습니다.");
        }
      });

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    let canceled = false;
    let restored: VideoJob | null = null;
    try {
      restored = restoreVideoJob(window.localStorage.getItem(VIDEO_JOB_STORAGE_KEY));
    } catch {
      // Unavailable localStorage should not prevent static image generation.
    }
    queueMicrotask(() => {
      if (canceled) return;
      if (restored) setVideoJob(restored);
      setVideoHydrated(true);
    });
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (!videoHydrated) return;
    try {
      if (videoJob) {
        window.localStorage.setItem(VIDEO_JOB_STORAGE_KEY, JSON.stringify(videoJob));
      } else {
        window.localStorage.removeItem(VIDEO_JOB_STORAGE_KEY);
      }
    } catch {
      // The server-side video budget remains the authoritative fallback lock.
    }
  }, [videoHydrated, videoJob]);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      runRef.current += 1;
    };
  }, []);

  const resetOutput = useCallback(() => {
    runRef.current += 1;
    setResults([]);
    setGenerationError(null);
    setDownloadError(null);
    setVideoOpen(false);
  }, []);

  const acceptFile = useCallback(
    async (nextFile: File) => {
      const validationError = validateImageFile(nextFile);
      if (validationError) {
        setFileError(validationError);
        return;
      }

      try {
        const nextDimensions = await getImageDimensions(nextFile);
        const nextPreview = URL.createObjectURL(nextFile);
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = nextPreview;
        setPreviewUrl(nextPreview);
        setFile(nextFile);
        setDimensions(nextDimensions);
        setFileError(null);
        setSourceMode("scene");
        setKeepTitle(false);
        setPreservedTitle("");
        setSpeaker("");
        setDialogue("");
        setOutputRatio("source");
        resetOutput();
      } catch {
        setFileError("이미지 파일을 열지 못했습니다. 다른 파일로 시도해 주세요.");
      }
    },
    [resetOutput],
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (controlsLocked) return;
    const nextFile = event.target.files?.[0];
    if (nextFile) void acceptFile(nextFile);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (controlsLocked) return;
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) void acceptFile(nextFile);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    if (controlsLocked) return;
    const pastedImage = [...event.clipboardData.items]
      .find((item) => item.type.startsWith("image/"))
      ?.getAsFile();
    if (pastedImage) {
      event.preventDefault();
      void acceptFile(pastedImage);
    }
  }

  function removeFile() {
    if (controlsLocked) return;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreviewUrl(null);
    setFile(null);
    setDimensions(null);
    setFileError(null);
    resetOutput();
  }

  function updateAccessCode(value: string) {
    setAccessCode(value);
    setAccessError(null);
    try {
      if (value) window.sessionStorage.setItem(ACCESS_CODE_STORAGE_KEY, value);
      else window.sessionStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
    } catch {
      setAccessError("접근 코드를 이 탭의 세션에 저장하지 못했습니다.");
    }
  }

  function buildImageForm(requestCount: Count): FormData {
    if (!file || !dimensions) throw new Error("먼저 이미지를 선택해 주세요.");
    const effectiveRatio = provider === "replicate" ? "source" : outputRatio;
    const target = requestedDimensions(dimensions, effectiveRatio);
    const form = new FormData();
    form.append("image", file);
    form.append("provider", provider);
    form.append("sourceMode", sourceMode);
    form.append("treatment", treatment);
    form.append("count", String(requestCount));
    form.append("quality", provider === "openai" ? quality : "medium");
    form.append("replicateModel", replicateModel);
    form.append("keepTitle", asBoolean(keepTitle));
    form.append("preservedTitle", preservedTitle.trim());
    form.append("speaker", speaker.trim());
    form.append("dialogue", dialogue.trim());
    form.append("customPrompt", customPrompt.trim());
    form.append("width", String(target.width));
    form.append("height", String(target.height));
    form.append("outputRatio", effectiveRatio);
    form.append("sourceWidth", String(dimensions.width));
    form.append("sourceHeight", String(dimensions.height));
    return form;
  }

  async function requestImages(requestCount: Count): Promise<ImageApiResponse> {
    const response = await fetch("/api/images", {
      method: "POST",
      body: buildImageForm(requestCount),
      headers: accessRequestHeaders(accessCode, createClientRequestId()),
    });
    const body = (await response.json()) as ImageApiResponse & { error?: string };
    if (!response.ok || !body.kind) {
      throw new Error(body.error || "실사화 요청을 시작하지 못했습니다.");
    }
    return body;
  }

  const updateAsset = useCallback((assetId: string, update: Partial<ResultAsset>) => {
    setResults((current) =>
      current.map((asset) => (asset.clientId === assetId ? { ...asset, ...update } : asset)),
    );
  }, []);

  const pollImagePrediction = useCallback(
    async (asset: ResultAsset, runId: number) => {
      if (!asset.predictionId) return;
      let consecutiveErrors = 0;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        await sleep(POLL_DELAYS[Math.min(attempt, POLL_DELAYS.length - 1)]);
        if (runRef.current !== runId) return;
        try {
          const response = await fetch(`/api/predictions/${encodeURIComponent(asset.predictionId)}`, {
            cache: "no-store",
            headers: accessRequestHeaders(accessCode),
          });
          const body = (await response.json()) as {
            status?: string;
            terminal?: boolean;
            outputs?: string[];
            error?: string;
          };
          if (!response.ok || !body.status) {
            throw new Error(body.error || "결과 상태를 확인하지 못했습니다.");
          }
          consecutiveErrors = 0;
          if (body.status === "succeeded" && body.outputs?.[0]) {
            updateAsset(asset.clientId, { status: "ready", url: body.outputs[0] });
            return;
          }
          if (body.terminal) {
            updateAsset(asset.clientId, {
              status: "failed",
              error: body.error || "AI 제공자가 이 변형을 완성하지 못했습니다.",
            });
            return;
          }
        } catch (pollError) {
          consecutiveErrors += 1;
          if (consecutiveErrors >= 4) {
            updateAsset(asset.clientId, {
              status: "failed",
              error: pollError instanceof Error ? pollError.message : "상태 확인에 실패했습니다.",
            });
            return;
          }
        }
      }
      updateAsset(asset.clientId, { status: "failed", error: "생성 시간이 너무 길어졌습니다. 다시 시도해 주세요." });
    },
    [accessCode, updateAsset],
  );

  function assetsFromResponse(body: ImageApiResponse, requestCount: Count): ResultAsset[] {
    const label = providerLabel(provider, replicateModel);
    if (body.kind === "complete") {
      const ready = body.images.slice(0, requestCount).map((url, index) => ({
        clientId: clientId(),
        status: "ready" as const,
        url,
        provider,
        modelLabel: label,
        index,
      }));
      const missingCount = Math.max(
        body.missingCount ?? 0,
        requestCount - ready.length,
      );
      const failed = Array.from(
        { length: Math.min(missingCount, requestCount - ready.length) },
        (_, offset) => ({
          clientId: clientId(),
          status: "failed" as const,
          error: "OpenAI가 이 변형의 이미지 데이터를 반환하지 않았습니다. 이 결과만 다시 시도해 주세요.",
          provider,
          modelLabel: label,
          index: ready.length + offset,
        }),
      );
      return [...ready, ...failed];
    }

    const queued = body.predictions.map((prediction) => ({
      clientId: clientId(),
      status: "queued" as const,
      predictionId: prediction.id,
      provider,
      modelLabel: label,
      index: prediction.index,
    }));
    const failed = (body.queueErrors ?? []).map((queueError) => ({
      clientId: clientId(),
      status: "failed" as const,
      error: queueError.message,
      provider,
      modelLabel: label,
      index: queueError.index,
    }));
    const usedIndices = new Set([...queued, ...failed].map((asset) => asset.index));
    for (let index = 0; index < requestCount; index += 1) {
      if (!usedIndices.has(index)) {
        failed.push({
          clientId: clientId(),
          status: "failed",
          error: "이 변형을 대기열에 추가하지 못했습니다.",
          provider,
          modelLabel: label,
          index,
        });
      }
    }
    return [...queued, ...failed].sort((left, right) => left.index - right.index);
  }

  async function handleGenerate(event?: FormEvent) {
    event?.preventDefault();
    if (!file || !dimensions || controlsLocked || !accessAllowed || paidRequestRef.current) return;
    if (sourceMode === "cover" && keepTitle && !preservedTitle.trim()) {
      setGenerationError("정확히 유지할 게임 타이틀을 입력해 주세요.");
      return;
    }
    if (sourceMode === "dialogue" && !dialogue.trim()) {
      setGenerationError("정확히 합성할 대사를 확인해 입력해 주세요.");
      return;
    }

    paidRequestRef.current = true;
    resetOutput();
    const runId = runRef.current;
    setSubmitting(true);
    setGenerationError(null);
    try {
      const body = await requestImages(count);
      if (runRef.current !== runId) return;
      const nextAssets = assetsFromResponse(body, count);
      setResults(nextAssets);
      nextAssets.forEach((asset) => {
        if (asset.status === "queued") void pollImagePrediction(asset, runId);
      });
    } catch (requestError) {
      if (runRef.current === runId) {
        setGenerationError(requestError instanceof Error ? requestError.message : "실사화에 실패했습니다.");
      }
    } finally {
      paidRequestRef.current = false;
      if (runRef.current === runId) setSubmitting(false);
    }
  }

  async function retryResult(asset: ResultAsset) {
    if (controlsLocked || !accessAllowed || paidRequestRef.current) return;
    paidRequestRef.current = true;
    const runId = runRef.current;
    updateAsset(asset.clientId, { status: "queued", error: undefined, url: undefined });
    try {
      const body = await requestImages(1);
      const [replacement] = assetsFromResponse(body, 1);
      if (!replacement || runRef.current !== runId) throw new Error("재시도 결과를 받지 못했습니다.");
      const normalized = { ...replacement, clientId: asset.clientId, index: asset.index };
      updateAsset(asset.clientId, normalized);
      if (normalized.status === "queued") void pollImagePrediction(normalized, runId);
    } catch (retryError) {
      updateAsset(asset.clientId, {
        status: "failed",
        error: retryError instanceof Error ? retryError.message : "재시도에 실패했습니다.",
      });
    } finally {
      paidRequestRef.current = false;
    }
  }

  async function downloadResult(asset: ResultAsset) {
    if (!asset.url || !file) return;
    setDownloadError(null);
    try {
      const proxyUrl = asset.url.startsWith("data:")
        ? undefined
        : `/api/media?url=${encodeURIComponent(asset.url)}`;
      const blob = await renderImageWithOverlay(asset.url, overlay, {
        proxyUrl,
        accessCode,
      });
      triggerBlobDownload(blob, safeDownloadName(file.name, `live-action-${asset.index + 1}`));
    } catch (downloadFailure) {
      const hasOverlay = Boolean(overlay.title || overlay.speaker || overlay.dialogue);
      if (!hasOverlay && asset.url.startsWith("data:")) {
        const response = await fetch(asset.url);
        triggerBlobDownload(await response.blob(), safeDownloadName(file.name, `live-action-${asset.index + 1}`));
      } else if (!hasOverlay) {
        window.open(asset.url, "_blank", "noopener,noreferrer");
        setDownloadError("제공자 원본을 새 탭에서 열었습니다. 길게 누르거나 브라우저 메뉴로 저장해 주세요.");
      } else {
        setDownloadError(
          downloadFailure instanceof Error
            ? `대사·타이틀 합성본을 저장하지 못했습니다: ${downloadFailure.message}`
            : "대사·타이틀 합성본을 저장하지 못했습니다. 접근 코드를 확인한 뒤 다시 시도해 주세요.",
        );
      }
    }
  }

  function openVideo(asset: ResultAsset) {
    if (controlsLocked || videoJob) return;
    setVideoSource(asset);
    setVideoOpen(true);
  }

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8" onPaste={handlePaste}>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(350px,410px)_minmax(0,1fr)] lg:gap-5">
        <form onSubmit={handleGenerate} className="studio-panel rounded-[22px] p-4 sm:p-5 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
          {accessState?.required || accessError ? (
            <div className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-3.5">
              <label htmlFor="studio-access-code" className="flex items-center gap-2 text-[11px] font-bold text-[var(--ink)]">
                <KeyRound size={14} className="text-[var(--accent-ink)]" /> 개인 작업실 접근 코드
              </label>
              {accessState?.misconfigured ? (
                <p role="alert" className="mt-2 text-[10px] leading-4 text-[var(--danger)]">
                  운영 환경에 접근 코드가 설정되지 않아 유료 생성을 잠갔습니다.
                </p>
              ) : (
                <input
                  id="studio-access-code"
                  type="password"
                  value={accessCode}
                  disabled={controlsLocked}
                  onChange={(event) => updateAccessCode(event.target.value.slice(0, 256))}
                  autoComplete="off"
                  className="field-control mt-2 h-10 px-3 text-xs"
                  placeholder="이 탭을 닫으면 자동으로 지워집니다"
                  aria-describedby={accessError ? "studio-access-error" : undefined}
                />
              )}
              {accessError ? (
                <p id="studio-access-error" role="alert" className="mt-2 text-[10px] leading-4 text-[var(--danger)]">
                  {accessError}
                </p>
              ) : (
                <p className="mt-2 text-[9px] leading-4 text-[var(--muted)]">코드는 이 브라우저 탭의 sessionStorage에만 보관합니다.</p>
              )}
            </div>
          ) : null}

          <fieldset disabled={controlsLocked} className="contents" aria-busy={controlsLocked}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-sm font-bold tracking-[-0.02em] text-[var(--ink)]">원본 이미지</h2>
            {file ? (
              <button
                type="button"
                onClick={removeFile}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-[11px] font-semibold text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
              >
                <RotateCcw size={12} /> 교체
              </button>
            ) : null}
          </div>

          {!file || !previewUrl ? (
            <div>
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false);
                }}
                onDrop={handleDrop}
                className={`group relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed p-6 text-center transition ${
                  isDragging
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] ring-4 ring-[var(--accent-halo)]"
                    : "border-[var(--line-strong)] bg-[var(--canvas-raised)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
                }`}
              >
                <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--panel)] text-[var(--accent-ink)] shadow-[var(--shadow-xs)] transition group-hover:-translate-y-1 group-hover:rotate-[-2deg]">
                  <CloudUpload size={23} />
                </div>
                <p className="text-sm font-bold text-[var(--ink)]">이미지를 놓거나 파일을 선택하세요</p>
                <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">JPG · PNG · WebP · 최대 10MB · 붙여넣기 가능</p>
                <label
                  htmlFor="studio-file-input"
                  className="mt-5 inline-flex h-10 cursor-pointer items-center rounded-full bg-[var(--ink)] px-5 text-xs font-bold text-[var(--canvas)] transition hover:-translate-y-0.5"
                >
                  파일 고르기
                </label>
                <input
                  id="studio-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)]">
              <div className="relative aspect-[4/3] bg-black">
                <Image src={previewUrl} alt="선택한 원본 미리보기" fill unoptimized className="object-contain" sizes="430px" />
              </div>
              <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[var(--ink)]">{file.name}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                    {dimensions?.width} × {dimensions?.height} · {formatBytes(file.size)}
                  </p>
                </div>
                <ShieldCheck size={16} className="shrink-0 text-[var(--success)]" aria-label="파일 검증 완료" />
              </div>
            </div>
          )}

          {fileError ? (
            <div role="alert" className="mt-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3.5 py-3 text-xs leading-5 text-[var(--danger)]">
              {fileError}
            </div>
          ) : null}
          {file ? (
            <div className="mt-5 space-y-5">
              <div role="group" aria-label="원본 해석 방식">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["scene", ImageIcon, "장면 그대로", "구도 고정"],
                    ["cover", Crop, "표지 아트만", "케이스 제거"],
                    ["dialogue", MessageSquareText, "대사 화면", "문자 합성"],
                  ] as const).map(([value, Icon, label, hint]) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={sourceMode === value}
                      onClick={() => {
                        if (sourceMode === value) return;
                        setSourceMode(value);
                        setGenerationError(null);
                        resetOutput();
                      }}
                      className={`min-h-[86px] rounded-xl border px-2 py-3 text-center transition ${sourceMode === value ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)] ring-2 ring-[var(--accent-halo)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"}`}
                    >
                      <Icon size={16} className="mx-auto mb-2" />
                      <span className="block text-[11px] font-bold sm:text-xs">{label}</span>
                      <span className="mt-0.5 block text-[9px] opacity-75">{hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {sourceMode === "cover" ? (
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-[var(--ink)]">표지 정리</p>
                      <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">케이스·테이블·반사·로고는 제거하고 안쪽 아트를 화면 가득 재구성합니다.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={keepTitle}
                      onClick={() => setKeepTitle((value) => !value)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${keepTitle ? "bg-[var(--accent)]" : "bg-[var(--line-strong)]"}`}
                    >
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${keepTitle ? "left-6" : "left-1"}`} />
                    </button>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-[var(--ink)]">
                    <span>{keepTitle ? "타이틀 유지" : "모든 글자 제거"}</span>
                  </label>
                  {keepTitle ? (
                    <input
                      value={preservedTitle}
                      onChange={(event) => setPreservedTitle(event.target.value.slice(0, 100))}
                      className="field-control mt-2 h-10 px-3 text-xs"
                      placeholder="정확히 표시할 타이틀"
                      aria-label="보존할 게임 타이틀"
                    />
                  ) : null}
                </div>
              ) : null}

              {sourceMode === "dialogue" ? (
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                  <div className="flex items-start gap-3">
                    <Layers3 size={17} className="mt-0.5 shrink-0 text-[var(--accent-ink)]" />
                    <div>
                      <p className="text-xs font-bold text-[var(--ink)]">대사는 마지막에 정확히 합성</p>
                      <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">장면과 초상화만 먼저 실사화한 뒤, 확인한 문장을 별도 레이어로 올려 AI 글자 왜곡을 막습니다.</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[0.36fr_1fr]">
                    <input
                      value={speaker}
                      onChange={(event) => setSpeaker(event.target.value.slice(0, 40))}
                      className="field-control h-10 px-3 text-xs"
                      placeholder="화자 (선택)"
                      aria-label="대사 화자"
                    />
                    <input
                      value={dialogue}
                      onChange={(event) => setDialogue(event.target.value.slice(0, 300))}
                      className="field-control h-10 px-3 text-xs"
                      placeholder="원본을 보고 대사를 정확히 입력"
                      aria-label="보존할 대사"
                    />
                  </div>
                  <p className="mt-2 text-[9px] leading-4 text-[var(--muted)]">우측 하단 워터마크 같은 불필요한 문구는 합성하지 않습니다.</p>
                </div>
              ) : null}

              <div className="space-y-4">
                <div role="group" aria-label="이미지 엔진">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--panel-muted)] p-1.5">
                    <button
                      type="button"
                      aria-pressed={provider === "openai"}
                      onClick={() => {
                        if (provider === "openai") return;
                        setProvider("openai");
                        setOutputRatio("source");
                        resetOutput();
                      }}
                      className={`min-h-14 rounded-xl px-3 text-left transition ${provider === "openai" ? "bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-xs)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold"><Aperture size={14} /> OpenAI Image 2</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={provider === "replicate"}
                      onClick={() => {
                        if (provider === "replicate") return;
                        setProvider("replicate");
                        setOutputRatio("source");
                        resetOutput();
                      }}
                      className={`min-h-14 rounded-xl px-3 text-left transition ${provider === "replicate" ? "bg-[var(--panel)] text-[var(--ink)] shadow-[var(--shadow-xs)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold"><WandSparkles size={14} /> Replicate</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div role="group" aria-label="이미지 처리 방식">
                    <div className="flex rounded-xl border border-[var(--line)] p-1">
                      {([
                        ["faithful", "원본 충실"],
                        ["cinematic", "영화적"],
                      ] as const).map(([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          onClick={() => setTreatment(value)}
                          className={`h-9 flex-1 rounded-lg px-2 text-[10px] font-bold transition ${treatment === value ? "bg-[var(--ink)] text-[var(--canvas)]" : "text-[var(--muted)]"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div role="group" aria-label="생성할 이미지 수">
                    <div className="flex rounded-xl border border-[var(--line)] p-1">
                      {([1, 2, 4] as const).map((value) => (
                        <button
                          type="button"
                          key={value}
                          onClick={() => setCount(value)}
                          className={`h-9 flex-1 rounded-lg text-[10px] font-bold transition ${count === value ? "bg-[var(--ink)] text-[var(--canvas)]" : "text-[var(--muted)]"}`}
                        >
                          {value}장
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <details className="group rounded-2xl border border-[var(--line)] bg-[var(--canvas-raised)]">
                <summary className="flex min-h-12 list-none items-center justify-between gap-3 px-4 text-xs font-bold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                  고급 설정
                  <ChevronDown size={15} className="text-[var(--muted)] transition group-open:rotate-180" />
                </summary>
                <div className="space-y-4 border-t border-[var(--line-soft)] px-4 pt-4 pb-5">
                  {provider === "replicate" ? (
                    <div>
                      <label htmlFor="replicate-model" className="mb-2 block text-[11px] font-bold text-[var(--ink)]">Replicate 모델</label>
                      <select
                        id="replicate-model"
                        value={replicateModel}
                        onChange={(event) => setReplicateModel(event.target.value as ReplicateModel)}
                        className="field-control h-10 px-3 text-xs"
                      >
                        <option value="flux">FLUX.2 Flex — 구도 제어 추천</option>
                        <option value="seedream">Seedream 4.5 — 영화적 2K</option>
                        <option value="nano">Nano Banana 2 — 다국어 텍스트</option>
                      </select>
                    </div>
                  ) : null}

                  {provider === "openai" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="quality" className="mb-2 block text-[11px] font-bold text-[var(--ink)]">품질</label>
                        <select id="quality" value={quality} onChange={(event) => setQuality(event.target.value as Quality)} className="field-control h-10 px-3 text-xs">
                          <option value="medium">Medium · 권장</option>
                          <option value="high">High · 고비용</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="ratio" className="mb-2 block text-[11px] font-bold text-[var(--ink)]">출력 비율</label>
                        <select
                          id="ratio"
                          value={outputRatio}
                          onChange={(event) => {
                            const nextRatio = event.target.value as OutputRatio;
                            if (nextRatio === outputRatio) return;
                            setOutputRatio(nextRatio);
                            resetOutput();
                          }}
                          className="field-control h-10 px-3 text-xs"
                        >
                          <option value="source">원본 유지</option>
                          <option value="landscape">가로 3:2</option>
                          <option value="portrait">세로 2:3</option>
                          <option value="square">정사각형</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-muted)] px-3.5 py-3">
                      <p className="text-[11px] font-bold text-[var(--ink)]">모델별 고정 설정 · 원본 비율 맞춤</p>
                      <p className="mt-1 text-[9px] leading-4 text-[var(--muted)]">
                        Replicate는 각 모델의 권장 해상도와 품질을 사용하고, 결과 프레임은 원본 비율에 맞춥니다.
                      </p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="custom-direction" className="mb-2 block text-[11px] font-bold text-[var(--ink)]">추가 디렉션</label>
                    <textarea
                      id="custom-direction"
                      value={customPrompt}
                      onChange={(event) => setCustomPrompt(event.target.value.slice(0, 1_000))}
                      rows={3}
                      className="field-control resize-none px-3 py-2.5 text-xs leading-5"
                      placeholder="예: 새벽 안개가 옅게 깔린 차가운 색감. 구도와 인물은 바꾸지 않기."
                    />
                    <p className="mt-1.5 text-[9px] leading-4 text-[var(--muted)]">추가 지시는 원본 구도·인물 수·포즈 잠금보다 우선하지 않습니다.</p>
                  </div>
                </div>
              </details>

              {generationError ? (
                <div role="alert" className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3.5 py-3 text-xs leading-5 text-[var(--danger)]">
                  {generationError}
                </div>
              ) : null}

              <div className="sticky bottom-3 z-20 rounded-2xl border border-[var(--line)] bg-[color:var(--panel)]/92 p-2 shadow-[var(--shadow-sm)] backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
                <button
                  type="submit"
                  disabled={controlsLocked || !accessAllowed}
                  className="group inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-5 text-sm font-bold text-[var(--canvas)] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-45"
                >
                  {pending ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}
                  {submitting ? "요청을 준비하는 중…" : pending ? `${results.filter((result) => result.status === "queued").length}개 장면을 만드는 중…` : "실사 이미지 만들기"}
                  {!pending ? <ArrowRight size={15} className="transition group-hover:translate-x-1" /> : null}
                </button>
                <p className="mt-2 text-center text-[9px] leading-4 text-[var(--muted)]">
                  {costCopy(provider, replicateModel, quality, count)} · 중복 생성 방지
                </p>
              </div>
            </div>
          ) : null}
          </fieldset>
        </form>

        <div className="min-w-0 space-y-4">
          {results.length > 0 && previewUrl ? (
            <>
              {pending ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] px-4 py-3" role="status" aria-live="polite">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--panel)] text-[var(--accent-ink)]">
                    <LoaderCircle size={17} className="animate-spin" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--ink)]">성공한 변형부터 바로 보여드릴게요</p>
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">여러 장 중 하나가 실패해도 나머지는 그대로 남습니다.</p>
                  </div>
                </div>
              ) : null}
              <ResultGallery
                results={results}
                originalUrl={previewUrl}
                overlay={overlay}
                aspectRatio={displayAspectRatio}
                onDownload={(asset) => void downloadResult(asset)}
                onVideo={openVideo}
                onRetry={(asset) => void retryResult(asset)}
                videoLocked={Boolean(videoJob)}
                generationLocked={controlsLocked || !accessAllowed}
              />
              {downloadError ? (
                <div role="status" className="rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] px-4 py-3 text-xs text-[var(--accent-ink)]">
                  {downloadError}
                </div>
              ) : null}
              {videoJob ? (
                <button
                  type="button"
                  onClick={() => setVideoOpen(true)}
                  className="studio-panel flex w-full items-center justify-between gap-4 rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                      {videoJob.status === "succeeded" ? <Check size={18} /> : <Clapperboard size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--ink)]">
                        {videoJob.status === "succeeded" ? "영상이 완성됐어요" : videoJob.status === "failed" ? "영상 생성 결과 확인" : "영상 생성이 진행 중이에요"}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">눌러서 상태와 결과를 확인하세요</p>
                    </div>
                  </div>
                  <Film size={17} className="shrink-0 text-[var(--muted)]" />
                </button>
              ) : null}
            </>
          ) : (
            <div className="studio-panel relative min-h-[360px] overflow-hidden rounded-[22px] p-3 sm:min-h-[440px] sm:p-4 lg:min-h-[500px]">
              {previewUrl && dimensions ? (
                <div className="flex h-full min-h-[334px] flex-col sm:min-h-[406px] lg:min-h-[466px]">
                  <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[17px] bg-[#081728] shadow-[var(--shadow-sm)]">
                    <div className="absolute inset-0 opacity-45 [background:radial-gradient(circle_at_center,rgba(101,204,255,.25),transparent_58%)]" />
                    <Image src={previewUrl} alt="실사화할 원본" fill unoptimized className="object-contain" sizes="(max-width: 1024px) 100vw, 62vw" />
                  </div>
                  <div className="flex items-center justify-between px-1 pt-2.5 text-[11px] text-[var(--muted)]">
                    <span>원본 미리보기</span>
                    <span>{dimensions.width} × {dimensions.height}</span>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[334px] flex-col items-center justify-center px-5 text-center sm:min-h-[406px] lg:min-h-[466px]">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent-ink)] shadow-[var(--shadow-xs)]">
                    <ImageIcon size={19} />
                  </div>
                  <h2 className="text-base font-bold tracking-[-0.03em] text-[var(--ink)]">결과 미리보기</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">이미지를 선택하면 여기에 표시됩니다.</p>
                </div>
              )}
            </div>
          )}

          {videoJob && results.length === 0 ? (
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="studio-panel flex w-full items-center justify-between gap-4 rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                  {videoJob.status === "succeeded" ? <Check size={18} /> : <Clapperboard size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--ink)]">
                    {videoJob.status === "succeeded" ? "저장된 영상 결과" : videoActive ? "영상 생성을 이어서 확인 중" : "영상 생성 결과 확인"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">새로고침 전 작업을 눌러서 확인하세요</p>
                </div>
              </div>
              <Film size={17} className="shrink-0 text-[var(--muted)]" />
            </button>
          ) : null}
        </div>
      </div>

      <VideoSheet
        open={videoOpen}
        source={videoSource}
        sourceName={file?.name.replace(/\.[^.]+$/, "") ?? "선택한 장면"}
        job={videoJob}
        accessCode={accessCode}
        accessAllowed={accessAllowed}
        onJobChange={setVideoJob}
        onClose={() => setVideoOpen(false)}
      />
    </section>
  );
}
