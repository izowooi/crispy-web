"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { inspectNaiPng } from "@/lib/nai-inspector";
import { countTokens } from "@/lib/tokenizer";
import { createRandomSelection, DEFAULT_NEGATIVE, RANDOM_BUCKETS, selectionToPrompt, type RandomSelection, type RandomSlot } from "@/lib/random-prompt";
import type { BulkMode, CampaignStatus, GenerationSettings, SourceMode } from "@/lib/types";
import { TagEditor } from "./TagEditor";
import { ThemeToggle } from "./ThemeToggle";

const slots = Object.keys(RANDOM_BUCKETS) as RandomSlot[];
const slotLabels: Record<RandomSlot, string> = {
  subject: "Subject", framing: "Framing", pose: "Pose", expression: "Expression", appearance: "Appearance",
  outfit: "Outfit", setting: "Setting", lighting: "Lighting", quality: "Quality",
};
const initialSettings: GenerationSettings = {
  width: 832, height: 1216, steps: 28, cfgScale: 5, cfgRescale: 0.4,
  sampler: "k_euler_ancestral", noiseSchedule: "native", qualityToggle: true, ucPreset: 0,
};

export function GeneratorApp() {
  const [mode, setMode] = useState<SourceMode>("random");
  const [selection, setSelection] = useState<RandomSelection>(() => createRandomSelection());
  const [locked, setLocked] = useState<Set<RandomSlot>>(new Set());
  const [prompt, setPrompt] = useState(() => selectionToPrompt(selection));
  const [negative, setNegative] = useState(DEFAULT_NEGATIVE);
  const [extraPrompt, setExtraPrompt] = useState("");
  const [settings, setSettings] = useState(initialSettings);
  const [count, setCount] = useState(1);
  const [bulkMode, setBulkMode] = useState<BulkMode>("fixed");
  const [intervalMs, setIntervalMs] = useState(15000);
  const [tokens, setTokens] = useState({ prompt: 0, negative: 0 });
  const [campaigns, setCampaigns] = useState<CampaignStatus[]>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inspectMessage, setInspectMessage] = useState("");

  const refreshHistory = useCallback(() => {
    void fetch("/api/history?limit=20").then((r) => r.ok ? r.json() : Promise.reject()).then((data) => setHistory(data.items ?? [])).catch(() => undefined);
  }, []);

  useEffect(() => {
    void fetch("/api/queue-config").then((r) => r.json()).then((data) => data.intervalMs && setIntervalMs(data.intervalMs)).catch(() => undefined);
    refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void Promise.all([countTokens(prompt), countTokens(negative)]).then(([positive, neg]) => {
        if (!cancelled) setTokens({ prompt: positive, negative: neg });
      }).catch(() => undefined);
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [prompt, negative]);

  useEffect(() => {
    const active = campaigns.some((campaign) => campaign.queued + campaign.processing > 0);
    if (!active) return;
    const timer = window.setInterval(() => {
      campaigns.forEach((campaign) => {
        if (campaign.queued + campaign.processing === 0) return;
        void fetch(`/api/jobs/${campaign.id}`).then((r) => r.json()).then((next) => {
          setCampaigns((all) => all.map((item) => item.id === next.id ? next : item));
          if (next.queued + next.processing === 0) refreshHistory();
        });
      });
    }, 1800);
    return () => clearInterval(timer);
  }, [campaigns, refreshHistory]);

  function reroll() {
    const lockMap = Object.fromEntries(Array.from(locked).map((slot) => [slot, selection[slot][0]]));
    const next = createRandomSelection({ locked: lockMap });
    setSelection(next);
    setPrompt(selectionToPrompt(next));
    setMode("random");
  }

  async function inspect(file?: File) {
    if (!file) return;
    setInspectMessage("분석 중…");
    try {
      const result = await inspectNaiPng(file);
      setPrompt(result.prompt); setNegative(result.negativePrompt); setMode("inspector");
      setInspectMessage("NAI 메타데이터의 positive/negative prompt를 불러왔습니다.");
    } catch (cause) { setInspectMessage(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function saveInterval() {
    const response = await fetch("/api/queue-config", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ intervalMs }) });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "대기 시간 저장 실패");
    else setIntervalMs(data.intervalMs);
  }

  async function generate() {
    if (busy || tokens.prompt > 512 || tokens.negative > 512) return;
    setBusy(true); setError("");
    try {
      const lockMap = Object.fromEntries(Array.from(locked).map((slot) => [slot, selection[slot][0]]));
      const response = await fetch("/api/generate", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: extraPrompt.trim() && bulkMode === "fixed" ? `${prompt}, ${extraPrompt.trim()}` : prompt,
          negativePrompt: negative, settings, count, bulkMode, sourceMode: mode,
          randomRecipe: mode === "random" ? { locked: lockMap, includeSensitive: false, includeArtist: false, extraPrompt } : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      const status = await fetch(`/api/jobs/${data.campaignId}`).then((r) => r.json());
      setCampaigns((all) => [status, ...all]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }

  async function cancelCampaign(id: string) {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    const next = await fetch(`/api/jobs/${id}`).then((r) => r.json());
    setCampaigns((all) => all.map((item) => item.id === id ? next : item));
  }

  const allImages = useMemo(() => campaigns.flatMap((campaign) => campaign.runs.flatMap((run) => (run.imageKeys ?? []).map((key) => ({ key, prompt: run.prompt, runId: run.id })))), [campaigns]);

  return <main className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
      <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1"><h1 className="font-bold tracking-tight">gen-nai-s2</h1><p className="truncate text-[11px] text-gray-500">Prompt atlas · 4 images per run · persistent queue</p></div>
        <ThemeToggle />
      </div>
    </header>

    <div className="mx-auto grid max-w-[1800px] gap-4 p-4 xl:grid-cols-[430px_minmax(0,1fr)_300px]">
      <section className="space-y-4">
        <div className="card">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-900">
            {(["manual", "random", "inspector"] as SourceMode[]).map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-lg px-2 py-2 text-xs font-semibold ${mode === item ? "bg-white shadow dark:bg-gray-800" : "text-gray-500"}`}>{item === "manual" ? "직접 작성" : item === "random" ? "랜덤" : "Inspector"}</button>)}
          </div>

          {mode === "random" && <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">랜덤 태그 정보</h2><button type="button" onClick={reroll} className="button-secondary">다시 뽑기</button></div>
            <div className="space-y-2">{slots.map((slot) => <div key={slot} className="flex items-start gap-2"><span className="w-20 pt-1 text-[10px] font-semibold uppercase text-gray-400">{slotLabels[slot]}</span><div className="flex min-w-0 flex-1 flex-wrap gap-1">{selection[slot].map((tag) => <span key={tag} className="rounded-md bg-violet-50 px-2 py-1 font-mono text-[11px] text-violet-700 dark:bg-violet-950 dark:text-violet-300">{tag}</span>)}</div><button type="button" onClick={() => setLocked((current) => { const next = new Set(current); if (next.has(slot)) next.delete(slot); else next.add(slot); return next; })} className={`rounded px-1.5 py-1 text-[10px] ${locked.has(slot) ? "bg-amber-100 text-amber-700 dark:bg-amber-950" : "text-gray-400"}`}>{locked.has(slot) ? "LOCK" : "lock"}</button></div>)}</div>
          </div>}

          {mode === "inspector" && <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-4 text-center dark:border-gray-700">
            <input type="file" accept="image/png" onChange={(e) => void inspect(e.target.files?.[0])} className="block w-full text-xs" />
            <p className="mt-2 text-[11px] text-gray-500">NAI PNG metadata만 읽습니다. Vision AI는 사용하지 않습니다.</p>
            {inspectMessage && <p className="mt-2 text-xs text-violet-600">{inspectMessage}</p>}
          </div>}
        </div>

        <div className="card space-y-4">
          <TagEditor label={`Positive · ${tokens.prompt}/512 tokens`} value={prompt} onChange={setPrompt} />
          <TagEditor label={`Negative · ${tokens.negative}/512 tokens`} value={negative} onChange={setNegative} rows={4} />
          {(tokens.prompt > 512 || tokens.negative > 512) && <p className="text-xs text-red-500">512 token을 넘는 프롬프트는 생성할 수 없습니다.</p>}
          <details className="rounded-xl border border-gray-200 p-3 dark:border-gray-700" open>
            <summary className="cursor-pointer text-xs font-semibold">Advanced · full prompt 추가/생성 설정</summary>
            <div className="mt-3 space-y-3">
              <label className="field"><span>매 작업에 덧붙일 태그</span><textarea value={extraPrompt} onChange={(e) => setExtraPrompt(e.target.value)} rows={2} placeholder="artist tag, style, extra details..." /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="field"><span>Width</span><select value={settings.width} onChange={(e) => setSettings({ ...settings, width: +e.target.value })}><option>832</option><option>1024</option><option>1216</option></select></label>
                <label className="field"><span>Height</span><select value={settings.height} onChange={(e) => setSettings({ ...settings, height: +e.target.value })}><option>832</option><option>1024</option><option>1216</option></select></label>
                <label className="field"><span>Steps · {settings.steps}</span><input type="range" min="10" max="50" value={settings.steps} onChange={(e) => setSettings({ ...settings, steps: +e.target.value })} /></label>
                <label className="field"><span>CFG · {settings.cfgScale}</span><input type="range" min="1" max="10" step="0.5" value={settings.cfgScale} onChange={(e) => setSettings({ ...settings, cfgScale: +e.target.value })} /></label>
                <label className="field"><span>Seed</span><input type="number" placeholder="random" value={settings.seed ?? ""} onChange={(e) => setSettings({ ...settings, seed: e.target.value ? +e.target.value : undefined })} /></label>
                <label className="field"><span>Sampler</span><select value={settings.sampler} onChange={(e) => setSettings({ ...settings, sampler: e.target.value as GenerationSettings["sampler"] })}><option value="k_euler_ancestral">Euler Ancestral</option><option value="k_euler">Euler</option><option value="k_dpmpp_2s_ancestral">DPM++ 2S A</option><option value="k_dpmpp_2m_sde">DPM++ 2M SDE</option></select></label>
              </div>
            </div>
          </details>
        </div>

        <div className="card space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="field"><span>4장 묶음 횟수 · 1~500</span><input type="number" min="1" max="500" value={count} onChange={(e) => setCount(Math.max(1, Math.min(500, +e.target.value || 1)))} /></label>
            <label className="field"><span>대량 프롬프트</span><select value={bulkMode} onChange={(e) => setBulkMode(e.target.value as BulkMode)}><option value="fixed">현재 prompt 반복</option><option value="reroll" disabled={mode !== "random"}>매회 새 랜덤</option></select></label>
          </div>
          <div className="flex items-end gap-2"><label className="field flex-1"><span>작업 간 대기 시간 · 최소 10초</span><input type="number" min="10" max="600" value={Math.round(intervalMs / 1000)} onChange={(e) => setIntervalMs(Math.max(10, +e.target.value || 10) * 1000)} /></label><button type="button" onClick={() => void saveInterval()} className="button-secondary mb-px">저장</button></div>
          <button type="button" disabled={busy || !prompt.trim() || tokens.prompt > 512 || tokens.negative > 512} onClick={() => void generate()} className="w-full rounded-xl bg-violet-600 py-3 font-bold text-white hover:bg-violet-500 disabled:opacity-40">{busy ? "큐 등록 중…" : `${count}회 × 4장 생성`}</button>
          <p className="text-[10px] leading-relaxed text-gray-500">각 작업은 4장을 한 번에 생성합니다. 다음 작업은 이전 NAI 응답이 끝난 뒤 설정한 시간만큼 대기합니다.</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </section>

      <section className="min-h-[70vh] rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Generated atlas</h2><span className="text-xs text-gray-500">{allImages.length} images</span></div>
        {allImages.length === 0 ? <div className="grid min-h-[50vh] place-items-center rounded-xl border border-dashed border-gray-200 text-center text-sm text-gray-400 dark:border-gray-700">프롬프트를 확정하고 첫 4장을 생성하세요.</div> : <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{allImages.map((image) => <figure key={image.key} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950"><Image unoptimized width={832} height={1216} src={`/api/images/${image.key.split("/").map(encodeURIComponent).join("/")}`} alt={image.prompt} className="aspect-[2/3] w-full object-cover" /><figcaption className="p-2"><p className="line-clamp-2 font-mono text-[10px] text-gray-500" title={image.prompt}>{image.prompt}</p></figcaption></figure>)}</div>}
      </section>

      <aside className="space-y-4">
        <div className="card"><h2 className="mb-3 text-sm font-semibold">Queue</h2><div className="space-y-3">{campaigns.length === 0 ? <p className="text-xs text-gray-400">등록된 캠페인이 없습니다.</p> : campaigns.map((campaign) => <div key={campaign.id} className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-gray-950"><div className="flex justify-between"><span className="font-mono">{campaign.id.slice(0, 8)}</span><span>{campaign.done + campaign.failed + campaign.canceled}/{campaign.total}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"><div className="h-full bg-violet-500" style={{ width: `${((campaign.done + campaign.failed + campaign.canceled) / campaign.total) * 100}%` }} /></div><div className="mt-2 flex items-center justify-between gap-2"><p className="text-[10px] text-gray-500">queued {campaign.queued} · processing {campaign.processing} · failed {campaign.failed} · canceled {campaign.canceled}</p>{campaign.queued > 0 && <button type="button" onClick={() => void cancelCampaign(campaign.id)} className="text-[10px] font-semibold text-red-500">대기 취소</button>}</div></div>)}</div></div>
        <div className="card"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">DB history</h2><button type="button" onClick={refreshHistory} className="text-[10px] text-violet-500">새로고침</button></div><div className="space-y-2">{history.length === 0 ? <p className="text-xs text-gray-400">완료된 DB 기록이 없습니다.</p> : history.map((row) => <div key={String(row.id)} className="rounded-lg border border-gray-100 p-2 dark:border-gray-800"><p className="line-clamp-3 font-mono text-[10px]">{String(row.positive)}</p><p className="mt-1 text-[9px] text-gray-400">{String(row.status)} · {String(row.promptId).slice(0, 10)}</p></div>)}</div></div>
      </aside>
    </div>
  </main>;
}
