"use client";

import { useCallback, useState } from "react";
import { PromptEditor } from "@/components/PromptEditor";
import { CharacterSearch } from "@/components/CharacterSearch";
import { ImageSettings, type SettingsState } from "@/components/ImageSettings";
import { QueueStatus } from "@/components/QueueStatus";
import { Gallery, type GalleryImage } from "@/components/Gallery";
import { RESOLUTIONS, DEFAULT_RESOLUTION } from "@/lib/resolutions";
import { makeRandomSuggestion } from "@/lib/random-prompt";
import type { CharacterRow, GenerateInput, JobStatus } from "@/lib/types";

export default function Page() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(
    "lowres, bad anatomy, bad hands, missing fingers, blurry, signature, watermark, jpeg artifacts",
  );
  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [settings, setSettings] = useState<SettingsState>({
    resolutionId: DEFAULT_RESOLUTION.id,
    count: 1,
    steps: 28,
    guidance: 5,
    seed: "",
    sampler: "euler_ancestral",
  });
  const [pendingJobIds, setPendingJobIds] = useState<string[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSurprise = useCallback(async () => {
    // 캐릭터 데이터는 검색기에서도 로드되지만, 여기서 한 번 더 페치
    let pool: CharacterRow[] = characters;
    if (pool.length === 0) {
      try {
        const r = await fetch("/characters.json");
        const all = (await r.json()) as CharacterRow[];
        // 인기 시리즈 위주로 좁히기
        pool = all.filter((c) =>
          ["원신", "장송의 프리렌", "블루 아카이브", "원피스", "보컬로이드", "체인소맨"].includes(c.work),
        );
        if (pool.length === 0) pool = all;
      } catch {
        pool = [];
      }
    }
    const s = makeRandomSuggestion(pool);
    setPrompt(s.prompt);
    setNegativePrompt(s.negativePrompt);
  }, [characters]);

  async function generate() {
    setError(null);
    setSubmitting(true);
    try {
      const res = RESOLUTIONS.find((r) => r.id === settings.resolutionId) ?? DEFAULT_RESOLUTION;
      const payloads: GenerateInput[] = [];
      // 캐릭터를 추가 프롬프트로 합치기
      const fullPrompt =
        characters.length > 0
          ? [prompt, ...characters.map((c) => c.eng)].filter(Boolean).join(", ")
          : prompt;

      for (let i = 0; i < settings.count; i++) {
        payloads.push({
          prompt: fullPrompt,
          negativePrompt,
          width: res.width,
          height: res.height,
          steps: settings.steps,
          guidance: settings.guidance,
          seed:
            settings.seed === "" || settings.seed === null
              ? undefined
              : Number(settings.seed),
          sampler: settings.sampler,
        });
      }

      const ids: string[] = [];
      // 순차 enqueue (DO 가 직렬화하지만 클라이언트 측에서 진행 표시를 위해 응답 대기)
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
        const { jobId } = (await r.json()) as { jobId: string; position: number };
        ids.push(jobId);
      }
      setPendingJobIds((prev) => [...prev, ...ids]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const onDone = useCallback(
    (job: Extract<JobStatus, { status: "done" }>) => {
      const src = `data:image/png;base64,${job.imageB64}`;
      setImages((prev) => [
        ...prev,
        { id: job.id, src, prompt },
      ]);
      setPendingJobIds((prev) => prev.filter((id) => id !== job.id));
    },
    [prompt],
  );

  const onFailed = useCallback(
    (job: Extract<JobStatus, { status: "failed" }>) => {
      setError(`작업 ${job.id} 실패: ${job.error}`);
      setPendingJobIds((prev) => prev.filter((id) => id !== job.id));
    },
    [],
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-fg)]">gen-nai</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-dim)]">
            NovelAI 이미지 생성 체험 · v4.5 Full · 가입 없이 친구들과 함께
          </p>
        </div>
        <a
          href="https://github.com/izowooi/crispy-web"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-[var(--color-fg-dim)] hover:text-[var(--color-accent)]"
        >
          source
        </a>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <section className="space-y-6">
          <PromptEditor
            prompt={prompt}
            negativePrompt={negativePrompt}
            onPromptChange={setPrompt}
            onNegativeChange={setNegativePrompt}
            onSurprise={onSurprise}
          />
          <CharacterSearch selected={characters} onChange={setCharacters} />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={submitting || prompt.trim() === ""}
              className="rounded-lg bg-[var(--color-accent)] px-5 py-3 font-semibold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "요청 중..." : `Generate · ${settings.count}장`}
            </button>
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>

          <div className="space-y-2">
            {pendingJobIds.map((id) => (
              <QueueStatus key={id} jobId={id} onDone={onDone} onFailed={onFailed} />
            ))}
          </div>

          <Gallery images={images} />
        </section>

        <aside className="space-y-4">
          <ImageSettings state={settings} onChange={setSettings} />
        </aside>
      </div>
    </main>
  );
}
