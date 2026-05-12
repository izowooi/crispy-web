# Phase 6 — Cloudflare 첫 production 배포의 `/api/generate` 502 fix

**일시:** 2026-05-12
**보고자:** 사용자 (Cloudflare Pages Functions Real-time Log)
**증상:** `POST /api/generate` → **502 in 3336 ms**, `cpuTime` 9 ms, `exceptions: []`, `logs: []`

## 진단

- `wallTime ≈ 3.3 s` → wrapper의 120 s timeout과 무관. **즉시 reject**.
- `outcome: "ok"` + `exceptions: []` → Worker 자체는 정상 종료, 우리 catch 분기가 502를 반환한 결과.
- `logs: []` → smoke test 후 제거된 `console.error` 진단이 없는 상태로 배포되어 stderr가 비었음.
- **가설:** Replicate SDK 1.x의 `client.run()`이 내부 streaming/long-polling을 사용하는데, Cloudflare Workers edge runtime의 outbound fetch / stream lifecycle 제약과 충돌해 즉시 reject.
- **방증:** R1 backend §5 note 4가 정확히 이 위험을 예측. ductcanvas는 동일 모델·동일 SDK를 사용하면서도 `predictions.create + predictions.get` 분리 패턴을 채택해 우회.

## Fix

### 1) `src/lib/replicate.ts` — 폴링 패턴 전환

`client.run()` 호출 1개 → `client.predictions.create()` + `client.predictions.get()` 폴링으로 전환.

```ts
// 1) prediction 생성 (짧은 단일 fetch — edge에서 안정적)
let prediction = await client.predictions.create({ model, input });

// 2) terminal status까지 polling (POLL_INTERVAL_MS = 1.5 s, total cap = DEFAULT_TIMEOUT_MS = 120 s)
while (!isTerminal(prediction.status)) {
  if (Date.now() - start > DEFAULT_TIMEOUT_MS) throw new Error("Replicate request timed out after 120000ms");
  await sleep(POLL_INTERVAL_MS);
  prediction = await client.predictions.get(prediction.id);
}

if (prediction.status !== "succeeded") throw ...;
return { imageUrl: extractFirstUrl(prediction.output) };
```

- 외부 API(`generateStyledImage`)는 동일 — route handler / 테스트 인터페이스 변경 없음.
- `extractFirstUrl`은 그대로 유지 — `prediction.output`이 string · string[] · FileOutput 어떤 shape든 동일 처리.
- `Promise.race` 기반 `withTimeout` 제거 — 폴링 루프 자체가 `Date.now() - start` 비교로 timeout 검사.

### 2) `src/app/api/generate/route.ts` — `console.error` 영구 추가

```ts
} catch (err) {
  const detail = err instanceof Error
    ? `${err.name}: ${err.message}`
    : typeof err === "string" ? err : JSON.stringify(err);
  console.error("[/api/generate] caught error:", detail);
  // ... existing 504/500/502 분기
}
```

- Cloudflare Real-time Logs와 Next dev stdout 양쪽에서 정확한 원인이 보이도록.
- 토큰을 포함하지 않으므로(에러 메시지는 SDK가 만든 일반 메시지) 안전.

### 3) `src/__tests__/replicate.test.ts` — mock 전면 재작성

기존 `mockRun` 단일 → `mockCreate` + `mockGet`로 분리. 16 케이스(기존 12 + polling 3 + 회귀 — `predictions.get`이 호출되어야 하는 fail/cancel/polled-success):

- 정상 succeeded 즉시 반환 (1회 폴링 없이)
- starting → processing → succeeded 흐름
- processing → failed → throw
- processing → canceled → throw
- predictions.create reject 전파
- aspect_ratio 메타데이터 반영
- FileOutput · string · array · plain url 응답 shape 모두

## 풀 파이프라인 게이트

| 명령 | 결과 |
|------|------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test` | **143/143** PASS (R3 140 + replicate 3 신규 polling 케이스). polling 케이스는 실 sleep 사용으로 약 4 s × 3 |
| `npm run build` | PASS — 3 routes (`/`, `/api/auth ƒ`, `/api/generate ƒ`) |
| `npm run pages:build` | PASS — Edge Function 1 + Prerendered 4 + Static 24 |

## 사용자 액션 (재배포 1회)

1. `npm run pages:build` (이미 완료 — 새 `.vercel/output/static/` 갱신됨)
2. Cloudflare Dashboard → Pages → snapmany → 이번 빌드된 `.vercel/output/static/` 폴더를 다시 업로드 (또는 zip)
3. **Redeploy** (Settings의 ACCESS_PASSWORD / REPLICATE_API_TOKEN / NEXT_PUBLIC_FIREBASE_* 는 그대로 유지)
4. 같은 시나리오(사진 업로드 → 스타일 선택 → 생성) 재실행 후 결과 확인

## 다음 단계가 또 fail이면

새 `console.error`가 Cloudflare Real-time Logs의 `logs` 배열에 잡힌다. 그 메시지를 그대로 공유해 주시면 정확한 원인을 즉시 식별 가능.

## 잠재 후속 (지금 안 함)

- `vi.useFakeTimers()` 도입으로 polling 테스트 4 s × 3 → 즉시. 테스트 9 s 단축. 트레이드오프: setup 복잡도 ↑.
- 폴링 간격을 모델별 RTT에 맞춰 어댑티브하게 (start: 1.5 s, after 30 s: 3 s 등). 현재 고정 1.5 s.
- `/api/status?id=...` 분리 endpoint 도입 — 클라이언트 직접 폴링. 현재 서버에서 통합 폴링이라 동시성 cap는 Cloudflare Function timeout 영향.
