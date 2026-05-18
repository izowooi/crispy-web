"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CharacterSearch } from "@/components/CharacterSearch";
import { ArtistPicker } from "@/components/ArtistPicker";
import { PresetSelector } from "@/components/PresetSelector";
import { BatchGrid, type BatchSlot } from "@/components/BatchGrid";
import { History, type HistoryBatch } from "@/components/History";
import { RESOLUTIONS, DEFAULT_RESOLUTION, SAMPLERS } from "@/lib/resolutions";
import {
  QUALITY_PRESETS,
  DEFAULT_QUALITY_PRESET_ID,
} from "@/lib/quality-presets";
import {
  NEGATIVE_PRESETS,
  DEFAULT_NEGATIVE_PRESET_ID,
} from "@/lib/negative-presets";
import { composeFinalPrompt } from "@/lib/prompt-composer";
import type {
  ArtistSelection,
  CharacterRow,
  GenerateInput,
  JobStatus,
  SamplerId,
} from "@/lib/types";

type Subject = "1girl" | "1boy";

const BATCH_SIZE = 4;

const DEFAULTS = {
  resolutionId: DEFAULT_RESOLUTION.id,
  steps: 28,
  guidance: 5,
  sampler: "euler_ancestral" as SamplerId,
};

function initialQuality() {
  const p = QUALITY_PRESETS.find((x) => x.id === DEFAULT_QUALITY_PRESET_ID);
  return p ? { id: p.id, body: p.body } : { id: QUALITY_PRESETS[0].id, body: QUALITY_PRESETS[0].body };
}
function initialNegative() {
  const p = NEGATIVE_PRESETS.find((x) => x.id === DEFAULT_NEGATIVE_PRESET_ID);
  return p ? { id: p.id, body: p.body } : { id: NEGATIVE_PRESETS[0].id, body: NEGATIVE_PRESETS[0].body };
}

export default function Page() {
  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [artists, setArtists] = useState<ArtistSelection[]>([]);
  const [subject, setSubject] = useState<Subject>("1girl");

  const initQ = useMemo(() => initialQuality(), []);
  const initN = useMemo(() => initialNegative(), []);
  const [qualityPresetId, setQualityPresetId] = useState(initQ.id);
  const [qualityBody, setQualityBody] = useState(initQ.body);
  const [negativePresetId, setNegativePresetId] = useState(initN.id);
  const [negativeBody, setNegativeBody] = useState(initN.body);

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

  const finalPrompt = useMemo(
    () =>
      composeFinalPrompt({
        artists,
        characters,
        subject,
        qualityBody,
      }),
    [artists, characters, subject, qualityBody],
  );

  // 폴링
  const pollingRefs = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    for (const batch of batches) {
      const sample = batch.slots[0];
      if (sample.status === "done" || sample.status === "failed") continue;
      if (pollingRefs.current.has(batch.jobId)) continue;
      pollingRefs.current.set(batch.jobId, true);
      void pollJob(batch.id, batch.jobId);
    }
    async function pollJob(batchId: string, jobId: string) {
      try {
        while (true) {
          await new Promise((r) => setTimeout(r, 1500));
          const r = await fetch(`/api/job/${encodeURIComponent(jobId)}`);
          if (!r.ok) continue;
          const j = (await r.json()) as JobStatus;
          let stopped = false;
          setBatches((prev) =>
            prev.map((b) => {
              if (b.id !== batchId) return b;
              if (j.status === "queued") {
                return { ...b, slots: b.slots.map((s) => ({ ...s, status: "queued", position: j.position })) };
              }
              if (j.status === "processing") {
                return { ...b, slots: b.slots.map((s) => ({ ...s, status: "processing" })) };
              }
              if (j.status === "done") {
                stopped = true;
                return {
                  ...b,
                  slots: b.slots.map((s, i) => ({ ...s, status: "done", imageKey: j.imageKeys[i] })),
                };
              }
              if (j.status === "failed") {
                stopped = true;
                return { ...b, slots: b.slots.map((s) => ({ ...s, status: "failed", error: j.error })) };
              }
              return b;
            }),
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

  function selectQualityPreset(id: string) {
    const p = QUALITY_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setQualityPresetId(id);
    setQualityBody(p.body);
  }
  function selectNegativePreset(id: string) {
    const p = NEGATIVE_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setNegativePresetId(id);
    setNegativeBody(p.body);
  }
  const randomQuality = useCallback(() => {
    const others = QUALITY_PRESETS.filter((p) => p.id !== qualityPresetId);
    const pick = others[Math.floor(Math.random() * others.length)] ?? QUALITY_PRESETS[0];
    selectQualityPreset(pick.id);
  }, [qualityPresetId]);
  const randomNegative = useCallback(() => {
    const others = NEGATIVE_PRESETS.filter((p) => p.id !== negativePresetId);
    const pick = others[Math.floor(Math.random() * others.length)] ?? NEGATIVE_PRESETS[0];
    selectNegativePreset(pick.id);
  }, [negativePresetId]);

  async function shuffleArtists() {
    try {
      const r = await fetch("/artist-presets.json");
      const all = (await r.json()) as Array<{ name: string; defaultWeight: number; usage: number }>;
      // 상위 80개 안에서 3~5명 무작위 추출 — 인기 작가 위주
      const pool = all.slice(0, 80);
      const n = 3 + Math.floor(Math.random() * 3); // 3~5
      const picked: ArtistSelection[] = [];
      const used = new Set<string>();
      while (picked.length < n && used.size < pool.length) {
        const a = pool[Math.floor(Math.random() * pool.length)];
        if (used.has(a.name)) continue;
        used.add(a.name);
        picked.push({ name: a.name, weight: a.defaultWeight });
      }
      setArtists(picked);
    } catch {}
  }

  async function generate() {
    if (submitting || finalPrompt.trim() === "") return;
    setError(null);
    setSubmitting(true);
    try {
      const res = RESOLUTIONS.find((r) => r.id === resolutionId) ?? DEFAULT_RESOLUTION;
      const seed =
        seedInput.trim() === "" ? undefined : Math.max(0, Number(seedInput.trim()) || 0);

      const payload: GenerateInput = {
        prompt: finalPrompt,
        negativePrompt: negativeBody.trim(),
        width: res.width,
        height: res.height,
        steps,
        guidance,
        seed,
        sampler,
      };
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(e.error ?? `HTTP ${r.status}`);
      }
      const { jobId, position } = (await r.json()) as { jobId: string; position: number };
      const slots: BatchSlot[] = Array.from({ length: BATCH_SIZE }, (_, i) => ({
        slotIndex: i,
        jobId,
        status: "queued",
        position,
      }));
      const batch: HistoryBatch = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        jobId,
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
    <main className="mx-auto grid min-h-[100dvh] max-w-[1800px] grid-cols-1 gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:h-[100dvh] lg:grid-cols-[400px_minmax(0,1fr)_240px]">
      {/* LEFT */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] lg:h-full">
        <header className="border-b border-[var(--color-border)] px-4 py-3">
          <h1 className="text-lg font-bold tracking-tight">gen-nai</h1>
          <p className="text-xs text-[var(--color-fg-mute)]">
            NovelAI 4.5 Full · 가입 없이 체험
          </p>
        </header>

        <div className="space-y-5 px-4 py-4 lg:flex-1 lg:overflow-auto">
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

          {/* Artists */}
          <div className="space-y-1.5">
            <ArtistPicker selected={artists} onChange={setArtists} />
            <button
              type="button"
              onClick={shuffleArtists}
              className="w-full rounded-md bg-[var(--color-accent-soft)] py-1.5 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)]"
            >
              🎲 인기 작가 3~5명 랜덤 픽
            </button>
          </div>

          {/* Quality */}
          <PresetSelector
            label="Quality"
            presets={QUALITY_PRESETS}
            selectedId={qualityPresetId}
            body={qualityBody}
            onSelectPreset={selectQualityPreset}
            onBodyChange={setQualityBody}
            showRandom
            onRandom={randomQuality}
            rows={4}
          />

          {/* Negative — 더 이상 Advanced 가 아닌 메인 영역 */}
          <PresetSelector
            label="Negative"
            presets={NEGATIVE_PRESETS}
            selectedId={negativePresetId}
            body={negativeBody}
            onSelectPreset={selectNegativePreset}
            onBodyChange={setNegativeBody}
            showRandom
            onRandom={randomNegative}
            rows={4}
          />

          {/* Advanced (해상도/Steps/Guidance/Seed/Sampler) */}
          <details
            open={advancedOpen}
            onToggle={(e) => setAdvancedOpen((e.currentTarget as HTMLDetailsElement).open)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
          >
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-[var(--color-fg-dim)]">
              Advanced
            </summary>
            <div className="space-y-3 border-t border-[var(--color-border)] px-3 py-3">
              <Field label="Resolution">
                <select
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
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Steps · ${steps}`}>
                  <input type="range" min={10} max={50} value={steps} onChange={(e) => setSteps(+e.target.value)} className="w-full accent-[var(--color-accent)]" />
                </Field>
                <Field label={`Guidance · ${guidance}`}>
                  <input type="range" min={1} max={10} step={0.5} value={guidance} onChange={(e) => setGuidance(+e.target.value)} className="w-full accent-[var(--color-accent)]" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Seed">
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
            </div>
          </details>

          <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-[var(--color-fg-dim)]">
              실제로 보내는 프롬프트
            </summary>
            <pre className="overflow-auto border-t border-[var(--color-border)] px-3 py-2 font-mono text-[10px] leading-relaxed text-[var(--color-fg-dim)]">
{finalPrompt || "(비어있음)"}
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
          {error && <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>}
        </footer>
      </section>

      {/* CENTER */}
      <section className="overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4 lg:h-full">
        <BatchGrid slots={selectedBatch?.slots ?? []} />
      </section>

      {/* RIGHT */}
      <section className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] lg:h-full">
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
