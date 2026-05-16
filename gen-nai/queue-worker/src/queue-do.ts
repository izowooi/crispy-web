/**
 * NovelAI 전역 큐 매니저 — Cloudflare Durable Object.
 *
 * 이미지는 NAI v4.5의 n_samples=4 로 1요청에 4장을 한꺼번에 받고,
 * R2 버킷(IMAGES)에 각각 저장한다. DO 행에는 R2 키 배열만 둔다.
 * (DO SQLite 행 한도 ~2MB를 우회 — SQLITE_TOOBIG 방지)
 */
import type { Env, GenerateInput } from "./types";
import { callNai } from "./nai-payload";

type StoredJob =
  | { id: string; status: "queued"; input: GenerateInput; createdAt: number }
  | { id: string; status: "processing"; input: GenerateInput; createdAt: number }
  | {
      id: string;
      status: "done";
      input: GenerateInput;
      createdAt: number;
      completedAt: number;
      imageKeys: string[];
    }
  | {
      id: string;
      status: "failed";
      input: GenerateInput;
      createdAt: number;
      completedAt: number;
      error: string;
    };

export class NovelAiQueueDO implements DurableObject {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/enqueue") return this.enqueue(req);
    if (req.method === "GET" && url.pathname.startsWith("/job/")) {
      const id = decodeURIComponent(url.pathname.slice("/job/".length));
      return this.jobStatus(id);
    }
    return new Response("not found", { status: 404 });
  }

  private async enqueue(req: Request): Promise<Response> {
    const body = (await req.json()) as GenerateInput;
    const jobId = crypto.randomUUID();
    const now = Date.now();
    const job: StoredJob = { id: jobId, status: "queued", input: body, createdAt: now };
    await this.state.storage.put(`job:${jobId}`, job);
    const queue = ((await this.state.storage.get<string[]>("queue")) ?? []).slice();
    queue.push(jobId);
    await this.state.storage.put("queue", queue);
    await this.kick();
    return Response.json({ jobId, position: queue.length });
  }

  private async jobStatus(id: string): Promise<Response> {
    const job = await this.state.storage.get<StoredJob>(`job:${id}`);
    if (!job) return Response.json({ id, status: "unknown" });
    if (job.status === "queued") {
      const queue = (await this.state.storage.get<string[]>("queue")) ?? [];
      const position = queue.indexOf(id) + 1;
      return Response.json({
        id,
        status: "queued",
        position: position > 0 ? position : queue.length + 1,
        createdAt: job.createdAt,
      });
    }
    if (job.status === "processing") {
      return Response.json({ id, status: "processing", createdAt: job.createdAt });
    }
    if (job.status === "done") {
      return Response.json({
        id,
        status: "done",
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        imageKeys: job.imageKeys,
      });
    }
    return Response.json({
      id,
      status: "failed",
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error,
    });
  }

  private async kick(): Promise<void> {
    const inProgress = (await this.state.storage.get<boolean>("inProgress")) ?? false;
    const alarm = await this.state.storage.getAlarm();
    if (!inProgress && alarm === null) {
      await this.state.storage.setAlarm(Date.now());
    }
  }

  async alarm(): Promise<void> {
    if ((await this.state.storage.get<boolean>("inProgress")) ?? false) return;
    const queue = ((await this.state.storage.get<string[]>("queue")) ?? []).slice();
    const jobId = queue.shift();
    if (!jobId) {
      await this.state.storage.put("inProgress", false);
      return;
    }
    await this.state.storage.put("queue", queue);
    await this.state.storage.put("inProgress", true);

    const job = await this.state.storage.get<StoredJob>(`job:${jobId}`);
    if (!job) {
      await this.state.storage.put("inProgress", false);
      await this.scheduleNext();
      return;
    }

    try {
      await this.state.storage.put(`job:${jobId}`, { ...job, status: "processing" });
      const images = await callNai(job.input, this.env.NAI_TOKEN);
      const imageKeys: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const key = `${jobId}-${i}.png`;
        await this.env.IMAGES.put(key, images[i], {
          httpMetadata: { contentType: "image/png" },
        });
        imageKeys.push(key);
      }
      await this.state.storage.put(`job:${jobId}`, {
        ...job,
        status: "done",
        completedAt: Date.now(),
        imageKeys,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const safe = msg.replace(/pst-[A-Za-z0-9]+/g, "pst-***");
      await this.state.storage.put(`job:${jobId}`, {
        ...job,
        status: "failed",
        completedAt: Date.now(),
        error: safe,
      });
    } finally {
      await this.state.storage.put("inProgress", false);
      await this.scheduleNext();
    }
  }

  private async scheduleNext(): Promise<void> {
    const queue = (await this.state.storage.get<string[]>("queue")) ?? [];
    if (queue.length > 0) {
      const interval = Number(this.env.MIN_INTERVAL_MS ?? "2000");
      await this.state.storage.setAlarm(Date.now() + interval);
    } else {
      await this.state.storage.deleteAlarm();
    }
  }
}
