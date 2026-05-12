# Phase 7 — Cloudflare 두번째 fail의 429 rate-limit fix

**일시:** 2026-05-12
**증상:** 첫 fix(Phase 6) 재배포 후에도 `/api/generate` 502. wallTime 2.5 s.
**핵심 로그 (이번엔 진단 logging이 잡힘):**

```
ApiError: Request to https://api.replicate.com/v1/models/openai/gpt-image-2/predictions
  failed with status 429 Too Many Requests:
  {"detail":"Request was throttled. Your rate limit for creating predictions is
    reduced to 6 requests per minute with a burst of 1 requests while you have
    less than $5.0 in credit. Your rate limit resets in ~9s.",
   "status":429, "retry_after":9}
```

## 진단

- SDK/edge 비호환 아님 (Phase 6에서 이미 ductcanvas 패턴으로 전환됨).
- **Replicate 계정 정책**: credit < $5 일 때 burst=1, 6 RPM 강제 throttle.
- **snapmany의 차별점("N 스타일 동시 생성")이 정면 충돌** — 클라이언트가 N개를 한 번에 보내면 첫 1개만 통과, 나머지 N-1개는 429.
- ductcanvas / seedance는 단일 호출 패턴이라 이 충돌이 안 보이지만, snapmany는 본질적으로 다중 호출.
- 사용자 로그 시점은 단일 요청에도 429 — 직전 다른 요청의 throttle 윈도우 안에서 새 요청을 보냈을 가능성.

## Fix (두 갈래, 한 번 커밋)

### A. Server — wrapper에 429 retry_after-aware retry 1회 (`src/lib/replicate.ts`)

- 신규 헬퍼 `parseRateLimit(err)`: ApiError의 `status === 429` 또는 메시지 패턴(`status 429`, `429 Too Many`)으로 인식. 메시지의 `"retry_after": N` JSON 패턴에서 초 추출 (+ 1 s 버퍼, 30 s cap, 못 찾으면 기본 10 s).
- 신규 헬퍼 `createPredictionWithRateLimitRetry(client, options)`: 429만 retry_after 초 sleep 후 1회 재시도. 다른 에러는 즉시 throw (route handler의 일반 retry/timeout 로직이 처리).
- `generateStyledImage`가 `client.predictions.create` 대신 위 헬퍼 호출.

이걸로 단일 요청이 429를 만나도 자동 회복.

### B. Client — 다중 styleId fetch에 1.5 s stagger (`src/app/page.tsx`)

- 상수 `STAGGER_MS = 1500`.
- `handleGenerate`가 `Promise.allSettled`로 fetch를 시작할 때 i번째 요청을 `i * STAGGER_MS` 후에 시작 (i=0은 즉시).
- 응답은 여전히 병렬 — 시작 시점만 분산.
- 1.5 s × (N-1) + 평균 60 s ≈ 9 s + 60 s = **N=7 기준 약 70 s**, wrapper timeout 120 s 안에 들어옴.
- 이걸로 N 동시 호출 시 burst 1 cap을 만족.

A + B 안전망 — A 단독으로도 단일 요청은 회복, B 단독으로도 N 호출은 분산. 두 가지를 함께 두면 운영 상황(다른 프로젝트가 동시 호출, credit 변동 등)에도 견고.

## 추가된 테스트 (replicate.test.ts: 15 → 19)

1. **retry on 429**: 첫 create 429 → retry_after=1s sleep → 두번째 create 성공 → 정상 URL 반환. mockCreate 2회 호출 검증.
2. **두번째도 429 — 무한 루프 방지**: 두 번 다 429 throw → 호출자에게 throw. mockCreate 2회 호출 후 종료.
3. **non-429는 retry 안 함**: 401 error → 즉시 throw, mockCreate 1회만 호출.
4. **`parseRateLimit` 단위 테스트**: status 속성, 메시지 패턴, retry_after JSON 패턴, default 값 모두 검증.

## page.test.tsx — STAGGER 영향 처리

기존 `await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))` 2곳에서 RTL 기본 timeout 1000 ms 초과 → `{ timeout: 4000 }` 옵션 추가.

## 풀 파이프라인

| | |
|---|---|
| typecheck/lint | PASS (0 warnings) |
| test | **147/147** (R3 140 + polling 3 + 429 4) |
| build | PASS — `/api/auth ƒ`, `/api/generate ƒ` |
| `pages:build` | PASS — Edge Function 1 + Prerendered 4 + Static 24 |

## 사용자 액션

`git push` 후 Cloudflare가 GitHub 연동으로 자동 빌드/배포 (사용자 확인). 별도 수동 업로드 불필요. 새 배포 완료 후 동일 시나리오로 한 번 더 시도.

## 만약 다시 fail이면

`logs` 배열에 다시 `[/api/generate] caught error: ...`가 잡힐 것. 다음 케이스 가능:
- 또 429 (retry 후에도) → credit 충전 ($5 이상) 권장 또는 STAGGER_MS를 더 키움
- 401/403 → 토큰 invalid 또는 모델 권한
- 5xx → Replicate 측 일시 장애
- timeout → 모델이 진짜 120 s 초과

## 운영 변화 — README 갱신 보류

사용자가 알려주신 **"커밋 푸시하면 Cloudflare가 자동 빌드"** 정보는 README §배포의 "수동 대시보드 업로드" 절차와 불일치. 별도 변경으로 갱신 필요 (이번 커밋엔 포함 안 함). 추후 사용자 확인 후 README §배포 절차를 "GitHub 연동 자동 빌드"로 갱신.
