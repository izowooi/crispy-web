import { z } from "zod";
import { callNai } from "./nai";
import { persistCampaign, markFailed, persistImages, persistRunStart } from "./persistence";
import { randomPrompt } from "./random-prompt";
import type { Campaign, EnqueueInput, Env, StoredRun } from "./types";

const inputSchema = z.object({
  prompt: z.string().trim().min(1).max(20000), negativePrompt: z.string().max(20000),
  count: z.number().int().min(1).max(500), bulkMode: z.enum(["fixed", "reroll"]),
  sourceMode: z.enum(["manual", "random", "inspector"]),
  randomRecipe: z.object({ locked: z.record(z.string(), z.string()), includeSensitive: z.boolean(), includeArtist: z.boolean(), extraPrompt: z.string().max(10000).optional() }).optional(),
  settings: z.object({
    width: z.number().int().min(256).max(2048), height: z.number().int().min(256).max(2048),
    steps: z.number().int().min(1).max(50), cfgScale: z.number().min(0).max(20), cfgRescale: z.number().min(0).max(1),
    sampler: z.string().min(1), noiseSchedule: z.string().min(1), seed: z.number().int().min(0).max(0xffffffff).optional(),
    qualityToggle: z.boolean(), ucPreset: z.number().int().min(0).max(4),
  }),
});

export class GenerationQueueDO implements DurableObject {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/enqueue") return this.enqueue(request);
    if (request.method === "GET" && url.pathname.startsWith("/campaign/")) return this.campaign(url.pathname.slice(10));
    if (request.method === "DELETE" && url.pathname.startsWith("/campaign/")) return this.cancelCampaign(url.pathname.slice(10));
    if (url.pathname === "/config" && request.method === "GET") return this.getConfig();
    if (url.pathname === "/config" && request.method === "PUT") return this.setConfig(request);
    return new Response("not found", { status: 404 });
  }

  private async enqueue(request: Request): Promise<Response> {
    const parsed = inputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
    const input = parsed.data as EnqueueInput;
    const existing = (await this.state.storage.get<string[]>("queue")) ?? [];
    if (existing.length + input.count > 500) return Response.json({ error: "큐는 최대 500개 작업을 보관합니다." }, { status: 429 });
    const campaignId = crypto.randomUUID();
    const runs: StoredRun[] = Array.from({ length: input.count }, () => ({
      id: crypto.randomUUID(), campaignId, status: "queued",
      prompt: input.bulkMode === "reroll" ? randomPrompt(input.randomRecipe) : input.prompt,
      negativePrompt: input.negativePrompt,
      settings: { ...input.settings, seed: input.settings.seed ?? Math.floor(Math.random() * 0x100000000) },
      createdAt: Date.now(),
    }));
    await persistCampaign(this.env, campaignId, input);
    const campaign: Campaign = { id: campaignId, runIds: runs.map((run) => run.id), createdAt: Date.now() };
    await this.state.storage.put(`campaign:${campaignId}`, campaign);
    await this.state.storage.put(Object.fromEntries(runs.map((run) => [`run:${run.id}`, run])));
    await this.state.storage.put("queue", [...existing, ...campaign.runIds]);
    await this.kick();
    return Response.json({ campaignId, total: runs.length, position: existing.length + 1 });
  }

  private async campaign(id: string): Promise<Response> {
    const campaign = await this.state.storage.get<Campaign>(`campaign:${decodeURIComponent(id)}`);
    if (!campaign) return Response.json({ error: "campaign not found" }, { status: 404 });
    const stored = await this.state.storage.get<StoredRun>(campaign.runIds.map((runId) => `run:${runId}`));
    const runs = campaign.runIds.map((runId) => stored.get(`run:${runId}`)).filter((run): run is StoredRun => Boolean(run));
    const queue = (await this.state.storage.get<string[]>("queue")) ?? [];
    const counts = { queued: 0, processing: 0, done: 0, failed: 0, canceled: 0 };
    for (const run of runs) counts[run.status]++;
    return Response.json({
      id: campaign.id, total: runs.length, ...counts,
      runs: runs.map((run) => ({
        id: run.id, status: run.status, prompt: run.prompt,
        position: run.status === "queued" ? Math.max(1, queue.indexOf(run.id) + 1) : undefined,
        imageKeys: run.imageKeys, error: run.error,
      })),
    });
  }

  private async cancelCampaign(id: string): Promise<Response> {
    const campaign = await this.state.storage.get<Campaign>(`campaign:${decodeURIComponent(id)}`);
    if (!campaign) return Response.json({ error: "campaign not found" }, { status: 404 });
    const queue = (await this.state.storage.get<string[]>("queue")) ?? [];
    const queuedSet = new Set(queue);
    const cancelIds = campaign.runIds.filter((runId) => queuedSet.has(runId));
    await this.state.storage.put("queue", queue.filter((runId) => !cancelIds.includes(runId)));
    for (const runId of cancelIds) {
      const run = await this.state.storage.get<StoredRun>(`run:${runId}`);
      if (run) await this.state.storage.put(`run:${runId}`, { ...run, status: "canceled" });
    }
    return Response.json({ canceled: cancelIds.length });
  }

  private async getConfig(): Promise<Response> {
    return Response.json({ intervalMs: await this.intervalMs() });
  }

  private async setConfig(request: Request): Promise<Response> {
    const body = await request.json().catch(() => null) as { intervalMs?: number } | null;
    const value = Math.round(Number(body?.intervalMs));
    if (!Number.isFinite(value) || value < 10_000 || value > 600_000) {
      return Response.json({ error: "intervalMs must be between 10000 and 600000" }, { status: 400 });
    }
    await this.state.storage.put("intervalMs", value);
    return Response.json({ intervalMs: value });
  }

  private async intervalMs(): Promise<number> {
    const stored = await this.state.storage.get<number>("intervalMs");
    const configured = Number(this.env.MIN_INTERVAL_MS ?? "15000");
    return Math.max(10_000, Math.min(600_000, stored ?? (Number.isFinite(configured) ? configured : 15_000)));
  }

  private async kick(): Promise<void> {
    if (!(await this.state.storage.get<boolean>("processing")) && await this.state.storage.getAlarm() === null) {
      await this.state.storage.setAlarm(Date.now());
    }
  }

  async alarm(): Promise<void> {
    if (await this.state.storage.get<boolean>("processing")) return;
    const queue = [...((await this.state.storage.get<string[]>("queue")) ?? [])];
    const runId = queue.shift();
    if (!runId) return;
    await this.state.storage.put("queue", queue);
    await this.state.storage.put("processing", true);
    const run = await this.state.storage.get<StoredRun>(`run:${runId}`);
    let extraDelay = 0;
    if (run) {
      try {
        const processing = { ...run, status: "processing" as const };
        await this.state.storage.put(`run:${runId}`, processing);
        await persistRunStart(this.env, run);
        const images = await callNai(run.prompt, run.negativePrompt, run.settings, this.env.NAI_TOKEN, this.env.NAI_BASE_URL || undefined);
        const imageKeys = await persistImages(this.env, run, images);
        await this.state.storage.put(`run:${runId}`, { ...run, status: "done", imageKeys });
      } catch (error) {
        const raw = error instanceof Error ? error.message : String(error);
        const safe = raw.replace(/pst-[A-Za-z0-9_\-]+/g, "pst-***").slice(0, 1000);
        const retryAfter = Number((error as { retryAfter?: number }).retryAfter);
        if (Number.isFinite(retryAfter)) extraDelay = retryAfter * 1000;
        await markFailed(this.env, runId, safe).catch(() => undefined);
        await this.state.storage.put(`run:${runId}`, { ...run, status: "failed", error: safe });
      }
    }
    await this.state.storage.put("processing", false);
    const remaining = (await this.state.storage.get<string[]>("queue")) ?? [];
    if (remaining.length) await this.state.storage.setAlarm(Date.now() + Math.max(await this.intervalMs(), extraDelay));
    else await this.state.storage.deleteAlarm();
  }
}
