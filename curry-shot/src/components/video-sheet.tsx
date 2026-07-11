"use client";

import {
  Check,
  Film,
  LoaderCircle,
  Music2,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { accessRequestHeaders, createClientRequestId } from "./client-api";
import type { ResultAsset, VideoJob, VideoModel } from "./studio-types";

const MOTION_PRESETS = {
  subtle:
    "Maintain the exact face, outfit, body proportions, scene layout and first-frame composition. Subtle natural breathing, tiny eye movement, hair and foliage moving gently in the wind, restrained cloth motion, and a slow 5% camera push-in. Preserve identity and geometry throughout. AUDIO: quiet location ambience, soft wind, subtle fabric and armor movement; no spoken dialogue.",
  heroic:
    "Maintain identity, costume, props and scene geometry. The main character slowly raises their gaze with restrained confidence while hair and fabric respond to a gentle wind. A subtle cinematic dolly-in, natural body motion, no large pose change. AUDIO: environmental ambience and a restrained cinematic swell; no dialogue.",
  camera:
    "Keep every character and object anchored to the first frame. Add only atmospheric motion: drifting dust, foliage and cloth in a light breeze, realistic blinking and breathing. The camera performs a slow lateral parallax move with no reframing. AUDIO: natural ambience and subtle environmental sounds; no dialogue.",
} as const;

type MotionPreset = keyof typeof MOTION_PRESETS;

function isActive(job: VideoJob | null): boolean {
  return job?.status === "starting" || job?.status === "processing";
}

export function VideoSheet({
  open,
  source,
  sourceName,
  job,
  accessCode,
  accessAllowed,
  onJobChange,
  onClose,
}: {
  open: boolean;
  source: ResultAsset | null;
  sourceName: string;
  job: VideoJob | null;
  accessCode: string;
  accessAllowed: boolean;
  onJobChange: (job: VideoJob | null) => void;
  onClose: () => void;
}) {
  const [model, setModel] = useState<VideoModel>("seedance");
  const [preset, setPreset] = useState<MotionPreset>("subtle");
  const [customMotion, setCustomMotion] = useState("");
  const [audio, setAudio] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consecutivePollErrors = useRef(0);
  const createRequestInFlight = useRef(false);

  const motionPrompt = useMemo(
    () => (customMotion.trim() ? `${MOTION_PRESETS[preset]} Additional direction: ${customMotion.trim()}` : MOTION_PRESETS[preset]),
    [customMotion, preset],
  );

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, submitting]);

  useEffect(() => {
    if (!job || !isActive(job)) {
      consecutivePollErrors.current = 0;
      return;
    }

    let canceled = false;
    let timer: number | undefined;

    const schedulePoll = (delay: number) => {
      timer = window.setTimeout(async () => {
        try {
          const response = await fetch(`/api/predictions/${encodeURIComponent(job.predictionId)}`, {
            cache: "no-store",
            headers: accessRequestHeaders(accessCode),
          });
          const body = (await response.json()) as {
            id?: string;
            status?: VideoJob["status"];
            outputs?: string[];
            error?: string;
          };
          if (canceled) return;
          if (!response.ok || !body.status) {
            throw new Error(body.error || "영상 상태를 확인하지 못했습니다.");
          }

          consecutivePollErrors.current = 0;
          setError(null);
          onJobChange({
            ...job,
            status: body.status,
            output: body.outputs?.[0] ?? job.output,
            error: body.error,
          });
        } catch (pollError) {
          if (canceled) return;
          consecutivePollErrors.current += 1;
          const attempts = consecutivePollErrors.current;
          const message = pollError instanceof Error ? pollError.message : "영상 상태 확인에 실패했습니다.";
          setError(`${message} 자동으로 다시 연결하고 있어요. (${attempts}회)`);
          schedulePoll(Math.min(12_000, 2_500 + attempts * 1_500));
        }
      }, delay);
    };

    schedulePoll(job.status === "starting" ? 2_000 : 3_500);
    return () => {
      canceled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [accessCode, job, onJobChange]);

  async function createVideo() {
    if (!source?.url || !confirmed || job || !accessAllowed || createRequestInFlight.current) return;
    createRequestInFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      if (source.url.startsWith("data:")) {
        const response = await fetch(source.url);
        const blob = await response.blob();
        form.append("image", new File([blob], "live-action.webp", { type: blob.type || "image/webp" }));
      } else {
        form.append("sourceUrl", source.url);
      }
      form.append("model", model);
      form.append("motionPrompt", motionPrompt.slice(0, 1_000));
      form.append("audio", String(model === "grok" ? true : audio));
      form.append("confirmed", "true");

      const requestedAudio = model === "grok" ? true : audio;
      const response = await fetch("/api/video", {
        method: "POST",
        body: form,
        headers: accessRequestHeaders(accessCode, createClientRequestId()),
      });
      const body = (await response.json()) as {
        prediction?: { id: string; status: "starting" | "processing" };
        error?: string;
      };
      if (!response.ok || !body.prediction) {
        throw new Error(body.error || "영상 요청을 시작하지 못했습니다.");
      }
      onJobChange({
        predictionId: body.prediction.id,
        status: body.prediction.status,
        model,
        audio: requestedAudio,
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "영상 생성 요청에 실패했습니다.");
    } finally {
      createRequestInFlight.current = false;
      setSubmitting(false);
    }
  }

  async function cancelVideo() {
    if (!job || !isActive(job)) return;
    try {
      const response = await fetch(`/api/predictions/${encodeURIComponent(job.predictionId)}/cancel`, {
        method: "POST",
        headers: accessRequestHeaders(accessCode),
      });
      const body = (await response.json()) as { status?: VideoJob["status"]; error?: string };
      if (!response.ok || !body.status) {
        throw new Error(body.error || "취소 요청을 확인하지 못했습니다.");
      }
      onJobChange({ ...job, status: body.status, error: body.error });
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? `${cancelError.message} 생성은 계속될 수 있어요.`
          : "취소 요청을 보내지 못했습니다. 생성은 계속될 수 있어요.",
      );
    }
  }

  if (!open) return null;

  const price = model === "seedance" ? "$0.90" : "$0.40";
  const active = isActive(job);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" onClick={submitting ? undefined : onClose} aria-label="영상 설정 닫기" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-sheet-title"
        className="relative z-10 max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-lg)] sm:rounded-[28px]"
      >
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-[var(--line-soft)] bg-[color:var(--panel)]/95 px-5 py-4 backdrop-blur-xl sm:px-7 sm:py-5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--accent-ink)] uppercase">Optional · one clip only</p>
            <h2 id="video-sheet-title" className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
              한 장면에 움직임 더하기
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)] transition hover:bg-[var(--panel-muted)] hover:text-[var(--ink)]"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          {job ? (
            <div className="space-y-5">
              {active ? (
                <div>
                  <div className="shimmer flex min-h-64 flex-col items-center justify-center rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] p-8 text-center">
                    <LoaderCircle size={30} className="mb-4 animate-spin text-[var(--accent-ink)]" />
                    <h3 className="text-base font-bold text-[var(--ink)]">5초짜리 장면을 촬영하고 있어요</h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
                      표정과 구도를 유지하면서 움직임과 소리를 맞추는 중입니다. 보통 몇 분 정도 걸려요.
                    </p>
                    <button type="button" onClick={cancelVideo} className="mt-6 text-xs font-semibold text-[var(--muted)] underline underline-offset-4">
                      생성 취소 요청
                    </button>
                  </div>
                  {error ? (
                    <div role="status" className="mt-3 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] px-4 py-3 text-xs leading-5 text-[var(--accent-ink)]">
                      {error}
                    </div>
                  ) : null}
                </div>
              ) : job.status === "succeeded" && job.output ? (
                <div>
                  <div className="overflow-hidden rounded-2xl bg-black shadow-[var(--shadow-sm)]">
                    <video src={job.output} controls playsInline className="aspect-video w-full object-contain" />
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--success)]">
                      <Check size={17} /> {job.audio ? "사운드가 포함된" : "무음"} 영상 1개를 완성했어요
                    </div>
                    <a
                      href={job.output}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-4 text-xs font-bold text-[var(--canvas)]"
                    >
                      <Film size={14} /> 영상 열기
                    </a>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-6 text-center">
                  <p className="font-semibold text-[var(--ink)]">영상을 완성하지 못했어요</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{job.error || "이미지 결과는 그대로 보존되어 있습니다."}</p>
                  {job.status === "failed" || job.status === "canceled" || job.status === "aborted" ? (
                    <button
                      type="button"
                      onClick={() => {
                        onJobChange(null);
                        setConfirmed(false);
                        setError(null);
                      }}
                      className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 text-xs font-bold text-[var(--ink)] transition hover:border-[var(--accent)]"
                    >
                      설정으로 돌아가 한 번 다시 시도
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setModel("seedance")}
                  className={`rounded-2xl border p-4 text-left transition ${model === "seedance" ? "border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent-halo)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[var(--ink)]">Seedance 2.0</span>
                    <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[9px] font-bold text-[var(--canvas)]">추천</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">구도 유지 · 네이티브 오디오 · 5초 720p</p>
                </button>
                <button
                  type="button"
                  onClick={() => setModel("grok")}
                  className={`rounded-2xl border p-4 text-left transition ${model === "grok" ? "border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent-halo)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[var(--ink)]">Grok Imagine 1.5</span>
                    <span className="text-[10px] font-semibold text-[var(--success)]">저비용</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Preview · 자동 오디오 · 5초 720p</p>
                </button>
              </div>

              <fieldset>
                <legend className="mb-3 text-xs font-bold text-[var(--ink)]">움직임</legend>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["subtle", "미세한 생동감"],
                    ["heroic", "인물 중심"],
                    ["camera", "카메라 무브"],
                  ] as const).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setPreset(value)}
                      className={`min-h-11 rounded-xl border px-2 text-[11px] font-bold transition sm:text-xs ${preset === value ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="motion-direction" className="mb-2 block text-xs font-bold text-[var(--ink)]">
                  추가 연출 <span className="font-normal text-[var(--muted)]">(선택)</span>
                </label>
                <textarea
                  id="motion-direction"
                  value={customMotion}
                  onChange={(event) => setCustomMotion(event.target.value.slice(0, 300))}
                  rows={3}
                  className="field-control resize-none px-3.5 py-3 text-sm leading-6"
                  placeholder="예: 달빛이 천천히 밝아지고 갑옷에 반사되게"
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel-muted)] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--panel)] text-[var(--accent-ink)]">
                    {model === "grok" ? <Music2 size={17} /> : <Volume2 size={17} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--ink)]">사운드 포함</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">대사 대신 장면의 환경음과 절제된 음악을 만듭니다.</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={model === "grok" ? true : audio}
                  disabled={model === "grok"}
                  onClick={() => setAudio((value) => !value)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${model === "grok" || audio ? "bg-[var(--accent)]" : "bg-[var(--line-strong)]"} disabled:opacity-70`}
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${model === "grok" || audio ? "left-6" : "left-1"}`} />
                </button>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] p-4">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                />
                <span>
                  <span className="block text-sm font-bold text-[var(--ink)]">유료 영상 1개 생성을 확인합니다</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                    5초 · 720p · 예상 약 {price}. 실제 비용은 Replicate 정책에 따라 달라질 수 있습니다. 정적 대사·타이틀은 흔들림 방지를 위해 영상에서 제외됩니다.
                  </span>
                </span>
              </label>

              {error ? (
                <div role="alert" className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              ) : null}

              {!accessAllowed ? (
                <p className="text-center text-xs leading-5 text-[var(--danger)]">
                  유료 생성을 시작하려면 작업실의 접근 코드를 먼저 확인해 주세요.
                </p>
              ) : null}

              <button
                type="button"
                onClick={createVideo}
                disabled={!confirmed || submitting || !source?.url || !accessAllowed}
                className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-5 text-sm font-bold text-[var(--canvas)] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-40"
              >
                {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}
                {submitting ? "요청을 보내는 중…" : `${sourceName || "선택한 장면"}으로 영상 1개 생성`}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
