---
name: durable-object-queue
description: Cloudflare Durable Object 글로벌 큐 매니저 패턴. NovelAI 약관 준수를 위한 "전역 단일 직렬화"를 enqueue→alarm→processNext 사이클로 구현. DO 큐 관련 코드를 작성하거나 동시성 버그를 디버깅할 때 이 스킬을 사용한다.
---

# durable-object-queue

`gen-nai/docs/queueing.md`를 코드 작성에 직접 쓰기 좋게 요약·확장한 스킬.

## 핵심 아이디어

- Durable Object는 **이름 기반 싱글톤** — `idFromName("global")`이면 전 세계 단 하나의 인스턴스
- 모든 사용자의 enqueue가 같은 DO로 모임 → 큐 상태 공유 자동 보장
- `alarm` API로 "다음 작업을 N초 후에 실행"을 서버리스 환경에서 구현

## 클래스 스켈레톤

```ts
// src/lib/queue/NovelAiQueueDO.ts
export class NovelAiQueueDO {
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
      const id = url.pathname.slice("/job/".length);
      return Response.json(await this.state.storage.get(`job:${id}`) ?? { status: "unknown" });
    }
    return new Response("not found", { status: 404 });
  }

  async enqueue(req: Request) {
    const body = await req.json<JobInput>();
    const jobId = crypto.randomUUID();
    const job: JobRecord = {
      id: jobId, status: "queued", input: body, createdAt: Date.now(),
    };
    await this.state.storage.put(`job:${jobId}`, job);

    const queue = (await this.state.storage.get<string[]>("queue")) ?? [];
    queue.push(jobId);
    await this.state.storage.put("queue", queue);

    await this.kick();
    return Response.json({ jobId, position: queue.length });
  }

  async kick() {
    const inProgress = await this.state.storage.get<boolean>("inProgress");
    const alarmAt = await this.state.storage.getAlarm();
    if (!inProgress && alarmAt === null) {
      await this.state.storage.setAlarm(Date.now()); // 즉시 처리
    }
  }

  async alarm() {
    if (await this.state.storage.get<boolean>("inProgress")) return;
    const queue = (await this.state.storage.get<string[]>("queue")) ?? [];
    const jobId = queue.shift();
    if (!jobId) return;
    await this.state.storage.put("queue", queue);
    await this.state.storage.put("inProgress", true);

    const job = await this.state.storage.get<JobRecord>(`job:${jobId}`);
    if (!job) {
      await this.state.storage.put("inProgress", false);
      return this.scheduleNext();
    }

    try {
      await this.state.storage.put(`job:${jobId}`, { ...job, status: "processing" });
      const images = await callNai(job.input, this.env.NAI_TOKEN);
      const imageB64 = btoa(String.fromCharCode(...images[0]));
      await this.state.storage.put(`job:${jobId}`, {
        ...job, status: "done", imageB64, completedAt: Date.now(),
      });
    } catch (e) {
      await this.state.storage.put(`job:${jobId}`, {
        ...job, status: "failed", error: String(e), completedAt: Date.now(),
      });
    } finally {
      await this.state.storage.put("inProgress", false);
      await this.scheduleNext();
    }
  }

  async scheduleNext() {
    const queue = (await this.state.storage.get<string[]>("queue")) ?? [];
    if (queue.length > 0) {
      const interval = Number(this.env.MIN_INTERVAL_MS ?? "10000");
      await this.state.storage.setAlarm(Date.now() + interval);
    }
  }
}
```

## 라우트에서 DO 접근

```ts
// app/api/generate/route.ts (Edge runtime)
export const runtime = "edge";
export async function POST(req: Request, { env }: { env: Env }) {
  const id = env.NOVELAI_QUEUE.idFromName("global");
  const stub = env.NOVELAI_QUEUE.get(id);
  return stub.fetch(new Request("https://do/enqueue", { method: "POST", body: req.body }));
}
```

## wrangler 바인딩

```jsonc
// wrangler.jsonc
{
  "name": "gennai",
  "compatibility_date": "2026-01-01",
  "main": "src/worker.ts",            // 또는 next-on-pages 출력
  "durable_objects": {
    "bindings": [{ "name": "NOVELAI_QUEUE", "class_name": "NovelAiQueueDO" }]
  },
  "migrations": [{ "tag": "v1", "new_classes": ["NovelAiQueueDO"] }],
  "vars": { "MIN_INTERVAL_MS": "10000" }
  // NAI_TOKEN은 wrangler pages secret put 으로 별도 주입
}
```

## 상태 머신

```
queued ──(alarm fires, dequeue)──▶ processing ──(NAI ok)──▶ done
                                       │
                                       └──(NAI error)──▶ failed

processing 동안 inProgress=true ⇒ 다른 alarm은 즉시 return
finally에서 inProgress=false + scheduleNext()
```

## 동시 enqueue 안전성

- DO 안에서는 모든 요청이 직렬 실행됨 (input gates) — race condition 없음
- 따라서 `queue.push`/`storage.put`는 lock 없이 안전
- 클라이언트가 5개를 동시에 보내도 5번의 enqueue가 순차 실행, 5개 jobId 발급

## 폴링 측 (브라우저)

```ts
const { jobId } = await fetch("/api/generate", { method: "POST", body }).then(r => r.json());
while (true) {
  const job = await fetch(`/api/job/${jobId}`).then(r => r.json());
  if (job.status === "done" || job.status === "failed") return job;
  await new Promise(r => setTimeout(r, 1500));
}
```

위치 표시:
- 응답의 `position`을 그대로 "대기 N번째"로 표시
- 폴링 응답에서 `queueLength`를 보내주면 실시간 갱신 가능 (필요 시 status에 포함)

## 테스트 전략

- 단위: `vi.mock`으로 `callNai`를 stub, `storage`는 `MapStorage` 클래스로 in-memory
- 통합: `@cloudflare/vitest-pool-workers` + `wrangler dev --persist-to`
- 동시성: 3개 `fetch` 병렬 발사 → jobId 3개 + 직렬화 검증

## 함정

- **Pages Functions 단독으로는 DO 사용 불가**: DO는 Workers 전용. `@cloudflare/next-on-pages`로 빌드해 Worker로 실행해야 한다
- **alarm은 동시 1개만 예약**: `setAlarm`은 기존 알람을 덮어쓴다. 큐 비었을 때 알람 해제 안 해도 무방
- **DO storage 용량**: 키당 128KB 제한 — 큰 이미지는 R2/KV 권장, 작은 PNG는 base64로 직접 저장 가능
