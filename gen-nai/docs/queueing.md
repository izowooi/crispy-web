# NovelAI Queueing Architecture with Cloudflare Durable Objects

## 목표

Next.js 기반 웹앱에서 여러 사용자가 동시에 이미지 생성 요청을 보내더라도,  
NovelAI API 약관에 맞춰 **동시에 하나의 요청만 처리**하도록 만드는 구조를 구현한다.

추가 조건:

- 프론트엔드는 Next.js 사용
- Cloudflare Pages 배포 선호
- 서버리스 환경 유지
- 중앙 서버(Mac mini 등)를 두지 않는 방향 선호
- 요청은 큐(Queue) 방식으로 순차 처리
- 이미지 생성 시간은 평균 2~5초, 최악의 경우 10초
- API 호출 완료 후 최소 10초 간격 유지 가능해야 함

---

# 핵심 결론

## 중요한 포인트

문제는 "서버가 있냐 없냐"가 아니라:

> 전역(Global)에서 딱 하나만 실행되는 큐 관리자가 존재하느냐

이다.

Cloudflare Durable Object를 사용하면 서버리스 환경에서도  
"전역 단일 큐 관리자"를 만들 수 있다.

즉:

- Mac mini 서버 필요 없음
- Cloud Run 단일 인스턴스 유지 불필요
- 별도 Redis 서버 필요 없음

---

# 최종 추천 구조

```txt
Frontend (Next.js)
        ↓
Cloudflare Pages Function / Worker API
        ↓
Durable Object (Global Queue Manager)
        ↓
NovelAI API
        ↓
R2 / D1 / KV 저장
        ↓
Frontend polling
```

---

# 왜 Durable Object가 적합한가?

## 일반적인 서버리스 문제점

일반적인 Edge Runtime / Serverless 환경은:

- 여러 인스턴스가 동시에 생성됨
- 메모리 공유 불가능
- 큐 상태 공유 불가능

즉:

```txt
Request A → 인스턴스 1
Request B → 인스턴스 2
```

이렇게 되므로 "동시에 하나만 실행" 제어가 어렵다.

---

# Durable Object의 장점

Durable Object는:

- 특정 이름(name)에 대해 단 하나의 인스턴스만 존재
- 상태(state)를 유지 가능
- queue 배열 저장 가능
- inProgress 상태 저장 가능
- alarm 기반 예약 가능

즉 사실상:

```txt
전역 싱글톤 큐 관리자
```

처럼 동작한다.

---

# 추천 구현 방식

## Queue 이름 고정

```ts
const id = env.NOVELAI_QUEUE.idFromName("global");
const stub = env.NOVELAI_QUEUE.get(id);
```

이렇게 하면:

- 모든 사용자의 요청이
- 동일한 Durable Object로 들어감

즉:

```txt
global queue 1개
```

가 된다.

---

# API 흐름

## 1. 이미지 생성 요청

```http
POST /api/generate
```

Frontend:

```json
{
  "prompt": "cute anime girl"
}
```

---

## 2. Worker 처리

Worker는:

- Durable Object에 enqueue 요청
- jobId 생성
- queue에 추가

응답:

```json
{
  "jobId": "abc-123"
}
```

---

## 3. Frontend Polling

```http
GET /api/job/:id
```

응답 예시:

```json
{
  "status": "queued"
}
```

또는:

```json
{
  "status": "processing"
}
```

또는:

```json
{
  "status": "done",
  "imageUrl": "https://..."
}
```

---

# Durable Object 내부 설계

## 저장 데이터

```txt
queue: string[]
inProgress: boolean
lastRequestTime: number
job:{id}
```

---

# 처리 흐름

## enqueue()

1. job 생성
2. queue에 push
3. processing 중이 아니면 kick()

---

## processNext()

1. queue에서 하나 pop
2. inProgress=true
3. NovelAI API 호출
4. 결과 저장
5. inProgress=false
6. 다음 작업이 있다면 10초 후 alarm 등록

---

# 의사 코드 예시

```ts
class NovelAiQueueDO {
  async enqueue(request) {
    const job = await request.json();

    const jobId = crypto.randomUUID();

    await this.ctx.storage.put(`job:${jobId}`, {
      status: "queued",
      ...job,
      createdAt: Date.now(),
    });

    const queue =
      (await this.ctx.storage.get("queue")) ?? [];

    queue.push(jobId);

    await this.ctx.storage.put("queue", queue);

    await this.kick();

    return Response.json({ jobId });
  }

  async kick() {
    const inProgress =
      await this.ctx.storage.get("inProgress");

    const alarm =
      await this.ctx.storage.getAlarm();

    if (!inProgress && alarm === null) {
      await this.ctx.storage.setAlarm(Date.now());
    }
  }

  async alarm() {
    const inProgress =
      await this.ctx.storage.get("inProgress");

    if (inProgress) return;

    const queue =
      (await this.ctx.storage.get("queue")) ?? [];

    const jobId = queue.shift();

    if (!jobId) return;

    await this.ctx.storage.put("queue", queue);

    await this.ctx.storage.put("inProgress", true);

    try {
      await this.ctx.storage.put(
        `job:${jobId}:status`,
        "processing"
      );

      // NovelAI API 호출

      // 결과 저장

      await this.ctx.storage.put(
        `job:${jobId}:status`,
        "done"
      );

    } catch (e) {

      await this.ctx.storage.put(
        `job:${jobId}:status`,
        "failed"
      );

    } finally {

      await this.ctx.storage.put(
        "inProgress",
        false
      );

      const nextQueue =
        (await this.ctx.storage.get("queue")) ?? [];

      if (nextQueue.length > 0) {
        await this.ctx.storage.setAlarm(
          Date.now() + 10000
        );
      }
    }
  }
}
```

---

# 결과 저장 추천

## 이미지 저장

추천:

- Cloudflare R2

이유:

- 이미지 저장에 적합
- 비용 저렴
- CDN 연동 쉬움

---

## 메타데이터 저장

추천:

- D1 또는 Durable Object Storage

저장 예시:

```json
{
  "jobId": "...",
  "status": "done",
  "createdAt": "...",
  "prompt": "...",
  "imageUrl": "..."
}
```

---

# 왜 Cloudflare Queue 단독 사용은 애매한가?

Cloudflare Queue도 가능은 하지만:

- 단순 메시지 큐에 가까움
- 세밀한 "10초 후 다음 실행" 제어가 어려움
- 상태 관리가 불편함

반면 Durable Object는:

- 상태 유지
- alarm 지원
- 전역 단일 인스턴스 보장

이 가능하므로 더 적합하다.

---

# 중앙 서버(Mac mini)를 쓰는 방법은?

가능은 하다.

예시:

```txt
Cloudflare Tunnel
        ↓
Mac mini FastAPI
        ↓
local queue
        ↓
NovelAI API
```

하지만 단점:

- Mac mini 항상 켜져 있어야 함
- 장애 대응 필요
- 인터넷 문제 영향 받음
- 운영 부담 증가

따라서 이번 경우에는 권장하지 않음.

---

# Cloud Run 단일 인스턴스는?

가능하다.

예시:

```txt
Cloud Run
min instances = 1
max instances = 1
concurrency = 1
```

하지만 단점:

- 항상 비용 발생 가능
- cold start 고려 필요
- queue 직접 구현 필요

이번 요구사항에서는 Durable Object가 더 자연스럽다.

---

# 최종 추천 스택

## 추천

```txt
Frontend:
- Next.js

Deploy:
- Cloudflare Pages

Backend:
- Pages Functions / Workers

Queue:
- Durable Object

Storage:
- R2
- D1(optional)

Secret:
- Cloudflare Environment Variables
```

---

# API Key 보안

절대 프론트 번들에 넣지 않는다.

반드시:

```txt
Cloudflare Environment Variables
```

또는:

```txt
Worker Secrets
```

로 저장한다.

---

# 최종 결론

이번 프로젝트의 핵심은:

```txt
전역에서 단 하나만 NovelAI API를 호출하게 만드는 것
```

이다.

이를 위해 가장 적합한 구조는:

```txt
Cloudflare Durable Object 기반 글로벌 큐 관리자
```

이다.

이 구조를 사용하면:

- 서버리스 유지 가능
- 중앙 서버 불필요
- 동시 요청 제어 가능
- NovelAI 약관 대응 가능
- 운영 비용 낮음
- 확장성 확보 가능

까지 모두 해결할 수 있다.