# Phase 5 — Live Smoke Test (실 Replicate 호출 1회)

**일시:** 2026-05-12
**환경:** local `npm run dev` (Next.js 15.5.2 webpack)
**호출자:** Playwright MCP 자동 시나리오
**입력:** `_workspace/.. 외부 파일은 access 거부 → snapmany/.playwright-mcp/sample.png (photokeep icon 512×512 PNG, 14.5 KB)`

## 결과 — SUCCESS

| 항목 | 값 |
|------|----|
| HTTP 상태 | **200** |
| 응답 시간 | **54.7 s** (timeout 한도 120 s 내) |
| 응답 shape | `{ ok: true, styleId: "id_photo_basic", imageUrl: "https://replicate.delivery/..." }` |
| UI 상태 | 결과 카드에 이미지 + "복사"/"다운로드" 버튼 정상 렌더 |
| Replicate 모델 | `openai/gpt-image-2` |
| 스크린샷 | `_workspace/05_smoke_screenshots/smoke_success_completed.png` |

## 발견한 결함과 fix

### 결함 #1 — SDK 응답 shape 불일치 (R1 backend §5 note 4가 예측한 케이스)

- **증상:** `POST /api/generate 502 in ~106 s` × 2회 (1회 + retry 1회). `error: "생성에 실패했습니다"`.
- **dev stdout 진단 로깅:** `[replicate.run] typeof=object array=true ctor=n/a keys="array(len=1)" firstCtor=FileOutput`
- **원인:** Replicate SDK 1.x가 `openai/gpt-image-2` 모델에서 `client.run()`이 `string[]` 또는 `string`이 아니라 `FileOutput[]`을 반환. wrapper의 `extractFirstUrl`이 string/string[]만 처리하여 null을 반환 → "Replicate returned no usable image URL." throw → 502.
- **Fix:** `src/lib/replicate.ts`의 `extractFirstUrl`을 다음 4단계로 보강:
  1. 평문 string (기존)
  2. 배열 → 첫 원소를 재귀 처리 (기존 + 비-string 원소 처리)
  3. 객체 `.url()` 메서드 (URL 또는 string 반환) — **FileOutput 케이스**
  4. 객체 `.url: string` 속성 또는 toString이 http(s) URL

### 결함 #2 — wrapper timeout이 60 s로 너무 빡빡

- **증상:** fix #1 적용 후 `POST /api/generate 504 in 60.2 s` (`isTimeoutError` 정상 매칭). `error: "시간이 초과되었습니다"`.
- **원인:** `gpt-image-2`는 통상 30–90 s 걸림. 60 s timeout은 정상 응답도 잘림.
- **Fix:** `src/lib/replicate.ts`의 `DEFAULT_TIMEOUT_MS`를 60 000 → 120 000으로 변경.

## 추가된 테스트 (TDD, RED → GREEN)

`src/__tests__/replicate.test.ts`에 FileOutput 케이스 4개 추가:

1. `FileOutput[]` whose `.url()` returns a URL object
2. `FileOutput[]` whose `.url()` returns a string
3. Single FileOutput-like object (no array wrapper)
4. Plain object with `url: string` property

전체 테스트 수 116 → **120** (4 추가).

## 풀 파이프라인 게이트 (fix 후)

| 명령 | 결과 |
|------|------|
| `npm run typecheck` | PASS (0) |
| `npm run lint` | PASS (0) |
| `npm run test` | PASS (12 files / **120 tests** / 0 fail) |
| `npm run build` | PASS (3 routes, `/api/generate` edge dynamic) |
| `npm run pages:build` | PASS (Edge Function 1 + Prerendered 4 + Static 24) |

## 진단 로깅 정리

smoke test 중 추가했던 임시 진단 로깅(`console.error` 2곳)은 fix 확정 후 **모두 제거**됨:
- `src/app/api/generate/route.ts` catch 안의 `[/api/generate] caught error: ...`
- `src/lib/replicate.ts`의 `[replicate.run] typeof=... firstCtor=...`

## 배포 전 확신도

- 적절한 사진 입력에 대해 **실제 Replicate 호출이 정상 작동**.
- 응답 shape 변동(FileOutput·string·string[]·plain `url`)에 모두 견고.
- timeout이 120 s로 충분, 1회 재시도 포함 최대 240 s. 클라이언트가 `Promise.allSettled`로 부분 실패 격리.

## 잠재 후속 (지금 안 함)

- Cloudflare Pages edge 환경에서 첫 실 호출 시 동일 shape인지 확인 (배포 직후 동일 sample로 1회 smoke 권장).
- Replicate가 4xx (예: moderation reject)를 던지면 사용자 메시지가 "생성에 실패했습니다"로 일률. 모더레이션 사유 노출을 v1.1에서 검토.
- gpt-image-2가 가끔 120 s 초과 시 504 → 사용자가 "다시 생성" 1회로 회복.
