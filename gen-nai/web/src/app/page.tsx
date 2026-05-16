"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CharacterSearch } from "@/components/CharacterSearch";
import { BatchGrid, type BatchSlot } from "@/components/BatchGrid";
import { History, type HistoryBatch } from "@/components/History";
import { RESOLUTIONS, DEFAULT_RESOLUTION, SAMPLERS } from "@/lib/resolutions";
import { randomScene, DEFAULT_NEGATIVE } from "@/lib/random-prompt";
import type { CharacterRow, GenerateInput, JobStatus, SamplerId } from "@/lib/types";

type Subject = "1girl" | "1boy";

const BATCH_SIZE = 4;

const DEFAULTS = {
  resolutionId: DEFAULT_RESOLUTION.id,
  steps: 28,
  guidance: 5,
  sampler: "euler_ancestral" as SamplerId,
};

export default function Page() {
  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [subject, setSubject] = useState<Subject>("1girl");
  const [scene, setScene] = useState(() => randomScene());
  const [negativePrompt, setNegativePrompt] = useState(DEFAULT_NEGATIVE);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [resolutionId, setResolutionId] = useState(DEFAULTS.resolutionId);
  const [steps, setSteps] = useState(DEFAULTS.steps);
  const [guidance, setGuidance] = useState(DEFAULTS.guidance);
  const [seedInput, setSeedInput] = useState<string>("");
  const [sampler, setSampler] = useState<SamplerId>(DEFAULTS.sampler);

  const [batches, setBatches] = useState<HistoryBatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedId) ?? null,
    [batches, selectedId],
  );

  const finalPrompt = useMemo(() => {
    const parts: string[] = [];
    if (characters.length > 0) parts.push(characters.map((c) => c.eng).join(", "));
    parts.push(subject);
    if (scene.trim()) parts.push(scene.trim());
    return parts.filter(Boolean).join(", ");
  }, [characters, subject, scene]);

  // 폴링 — pending이 있는 배치마다 jobId별로 별도 폴 루프
  const pollingRefs = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    for (const batch of batches) {
      for (const slot of batch.slots) {
        if (slot.status === "done" || slot.status === "failed") continue;
        if (pollingRefs.current.has(slot.jobId)) continue;
        pollingRefs.current.set(slot.jobId, true);
        void pollJob(slot.jobId);
      }
    }
    async function pollJob(jobId: string) {
      try {
        while (true) {
          await new Promise((r) => setTimeout(r, 1500));
          const r = await fetch(`/api/job/${encodeURIComponent(jobId)}`);
          if (!r.ok) continue;
          const j = (await r.json()) as JobStatus;
          let stopped = false;
          setBatches((prev) =>
            prev.map((b) => ({
              ...b,
              slots: b.slots.map((s) => {
                if (s.jobId !== jobId) return s;
                if (j.status === "queued") return { ...s, status: "queued", position: j.position };
                if (j.status === "processing") return { ...s, status: "processing" };
                if (j.status === "done") {
                  stopped = true;
                  return { ...s, status: "done", imageB64: j.imageB64 };
                }
                if (j.status === "failed") {
                  stopped = true;
                  return { ...s, status: "failed", error: j.error };
                }
                return s;
              }),
            })),
          );
          if (stopped) {
            pollingRefs.current.delete(jobId);
            return;
          }
        }
      } catch {
        pollingRefs.current.delete(jobId);
      }
    }
  }, [batches]);

  const rollScene = useCallback(() => setScene(randomScene()), []);

  async function generate() {
    if (submitting || finalPrompt.trim() === "") return;
    setError(null);
    setSubmitting(true);
    try {
      const res = RESOLUTIONS.find((r) => r.id === resolutionId) ?? DEFAULT_RESOLUTION;
      const seedBase =
        seedInput.trim() === "" ? undefined : Math.max(0, Number(seedInput.trim()) || 0);

      const payloads: GenerateInput[] = [];
      for (let i = 0; i < BATCH_SIZE; i++) {
        payloads.push({
          prompt: finalPrompt,
          negativePrompt,
          width: res.width,
          height: res.height,
          steps,
          guidance,
          seed: seedBase === undefined ? undefined : seedBase + i,
          sampler,
        });
      }

      const slots: BatchSlot[] = [];
      for (const p of payloads) {
        const r = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
        if (!r.ok) {
          const e = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(e.error ?? `HTTP ${r.status}`);
        }
        const { jobId, position } = (await r.json()) as { jobId: string; position: number };
        slots.push({ jobId, status: "queued", position });
      }

      const batch: HistoryBatch = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        slots,
        characters: characters.map((c) => c.kor),
      };
      setBatches((prev) => [batch, ...prev]);
      setSelectedId(batch.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid h-[100dvh] max-w-[1800px] grid-cols-[380px_minmax(0,1fr)_240px] gap-4 px-4 py-4">
      {/* ─── LEFT: 입력 ─── */}
      <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <header className="border-b border-[var(--color-border)] px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight">gen-nai</h1>
          <p className="text-xs text-[var(--color-fg-mute)]">
            NovelAI 4.5 Full · 가입 없이 체험
          </p>
        </header>

        <div className="flex-1 space-y-5 overflow-auto px-4 py-4">
          {/* Subject */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-dim)]">
              Subject
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["1girl", "1boy"] as Subject[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubject(s)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    subject === s
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-fg)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Character */}
          <CharacterSearch selected={characters} onChange={setCharacters} />

          {/* Scene */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="scene" className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-dim)]">
                Scene / Pose
              </label>
              <button
                type="button"
                onClick={rollScene}
                className="rounded-md bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)]"
              >
                🎲 Random
              </button>
            </div>
            <textarea
              id="scene"
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              rows={4}
              placeholder="sitting by the window, soft afternoon light, ..."
              className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-fg-mute)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-[var(--color-fg-mute)]">
              외모는 캐릭터 태그에 들어있으므로 여기서는 장소/포즈/분위기만 설명하세요. Random 버튼이 알아서 채워줍니다.
            </p>
          </div>

          {/* Advanced — 펼침 */}
          <details
            open={advancedOpen}
            onToggle={(e) => setAdvancedOpen((e.currentTarget as HTMLDetailsElement).open)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
          >
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-[var(--color-fg-dim)]">
              Advanced
            </summary>
            <div className="space-y-3 border-t border-[var(--color-border)] px-3 py-3">
              <div>
                <label htmlFor="res" className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--color-fg-dim)]">
                  Resolution
                </label>
                <select
                  id="res"
                  value={resolutionId}
                  onChange={(e) => setResolutionId(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 text-sm focus:border-[var(--color-accent)] focus:outline-none"
                >
                  {(["Normal", "Large"] as const).map((g) => (
                    <optgroup label={g} key={g}>
                      {RESOLUTIONS.filter((r) => r.group === g).map((r) => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={`Steps · ${steps}`}>
                  <input type="range" min={10} max={50} value={steps} onChange={(e) => setSteps(+e.target.value)} className="w-full accent-[var(--color-accent)]" />
                </Field>
                <Field label={`Guidance · ${guidance}`}>
                  <input type="range" min={1} max={10} step={0.5} value={guidance} onChange={(e) => setGuidance(+e.target.value)} className="w-full accent-[var(--color-accent)]" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Seed (4장 +0~+3)">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="비우면 랜덤"
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value)}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 text-sm focus:border-[var(--color-accent)] focus:outline-none"
                  />
                </Field>
                <Field label="Sampler">
                  <select
                    value={sampler}
                    onChange={(e) => setSampler(e.target.value as SamplerId)}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 text-sm focus:border-[var(--color-accent)] focus:outline-none"
                  >
                    {SAMPLERS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}{s.recommended ? " ★" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Undesired Content">
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 text-xs focus:border-[var(--color-accent)] focus:outline-none"
                />
              </Field>
            </div>
          </details>

          {/* 보낼 프롬프트 미리보기 (작게) */}
          <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-[var(--color-fg-dim)]">
              실제로 보내는 프롬프트
            </summary>
            <pre className="overflow-auto border-t border-[var(--color-border)] px-3 py-2 font-mono text-[11px] leading-relaxed text-[var(--color-fg-dim)]">
{finalPrompt || "(비어있음 — 캐릭터를 선택하거나 Scene을 입력하세요)"}
            </pre>
          </details>
        </div>

        <footer className="border-t border-[var(--color-border)] p-4">
          <button
            type="button"
            onClick={generate}
            disabled={submitting || finalPrompt.trim() === ""}
            className="block w-full rounded-xl bg-[var(--color-accent)] py-3 text-base font-semibold text-[var(--color-accent-fg)] shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:bg-[var(--color-bg-elev-2)] disabled:text-[var(--color-fg-mute)]"
          >
            {submitting ? "요청 중…" : `Generate · 4장`}
          </button>
          {error && (
            <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>
          )}
        </footer>
      </section>

      {/* ─── CENTER: 프리뷰 ─── */}
      <section className="h-full overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
        <BatchGrid slots={selectedBatch?.slots ?? []} />
      </section>

      {/* ─── RIGHT: 히스토리 ─── */}
      <section className="h-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <History
          batches={batches}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onClear={() => {
            setBatches([]);
            setSelectedId(null);
          }}
        />
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--color-fg-dim)]">
        {label}
      </span>
      {children}
    </label>
  );
}
