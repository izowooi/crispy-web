# Phase 3 — Round 2 (Backend) DONE

생성일: 2026-05-12 (Phase 3 R2)
작성자: backend 서브 에이전트 (model: opus)
선행 산출물:
- `_workspace/00_architect_decisions.md` (§6 API 계약, §5 RC 8키 default, §8 보안)
- `_workspace/03_R1_backend_done.md` (R1 wrapper API, §5 노트 6 — 재시도는 route handler가 담당)
- `_workspace/03_R1_qa.md` (R1 회귀 게이트)
- `_workspace/03_R1_frontend_done.md` (UploadPanel — backend 미접촉)

---

## 0. 요약

R2에서 backend가 소유하는 3개 모듈 (RC wrapper + Firebase init + Route handler) 신규 작성 + 2개 단위 테스트 신규 작성. **TDD 사이클(RED → GREEN → REFACTOR) 엄수.** 풀 파이프라인 4종 게이트 0 에러 통과 (101 tests 통과). **Replicate 실호출 0회**, 토큰 클라이언트 누출 0건.

---

## 1. 생성/수정 파일

### 신규 (소스 3)
| 파일 | 역할 |
|------|------|
| `src/lib/firebase.ts` | Firebase 클라이언트 SDK 초기화 격리 모듈. 모듈 로드 시 부수효과 0건 (edge SSR 번들 안전). `getClientApp()`/`readClientConfigFromEnv()` lazy factory만 export. |
| `src/lib/remoteConfig.ts` | Remote Config wrapper. `DEFAULT_CONFIG: AppConfig` 8개 키 default 명세, `loadConfig(): Promise<AppConfig>` 캐싱·SSR-safe 진입점. 모든 실패 경로에서 `console.warn` + DEFAULT 반환. JSON 파싱 실패 시 키 단위 fallback. |
| `src/app/api/generate/route.ts` | POST 핸들러 본문 구현 (`runtime = 'edge'` 유지). JSON 파싱 / image 형식 / 크기 / styleId 검증 → `generateStyledImage` 1회 재시도(timeout·config-error 제외) → HTTP 코드 매핑. GET은 405. |

### 신규 (테스트 2)
| 파일 | 케이스 수 |
|------|----------|
| `src/__tests__/remoteConfig.test.ts` | **9** |
| `src/__tests__/api.generate.test.ts` | **15** |

### 미변경 (확인만)
- `next.config.ts` — `images.remotePatterns`에 `replicate.delivery` + `pbxt.replicate.delivery` **이미 둘 다 포함** (qa R1 권고 충족 상태). 보강 불필요.
- `src/lib/replicate.ts`, `src/lib/stylePrompts.ts`, `src/config/styles.ts` — R1 동결분 그대로, import만.
- `.env.local` — 미접촉.

---

## 2. 테스트 케이스 + 통과

### `remoteConfig.test.ts` (9/9)
1. DEFAULT_CONFIG가 8개 키 모두 안전한 타입/값을 갖는다
2. DEFAULT_CONFIG `enabled_styles` & `style_order` ↔ `STYLE_IDS`(15개) 완전 일치
3. SSR(window 미정의) → DEFAULT, `initializeApp`/`fetchAndActivate` 미호출
4. `fetchAndActivate` throw → DEFAULT (앱 죽지 않음)
5. `initializeApp` throw → DEFAULT
6. fetch 성공 시 RC 값을 AppConfig로 정확히 파싱 (8개 키 전부 검증)
7. RC 값이 malformed JSON일 때 키 단위 default fallback
8. `loadConfig` 결과 캐싱 — fetchAndActivate 1회만 호출
9. `getApps`가 기존 app 보고 시 `initializeApp` 미호출

### `api.generate.test.ts` (15/15)
1. `export const runtime === 'edge'`
2. 정상 입력 → 200 + `{ ok: true, styleId, imageUrl }`
3. PNG / WEBP mime 둘 다 200 통과
4. malformed JSON 본문 → 400
5. image 누락 → 400
6. styleId 누락 → 400 (`ERROR_UNKNOWN_STYLE`)
7. gif mime → 400
8. `data:` 접두 아님 (https URL 등) → 400
9. 미지의 styleId → 400, wrapper 미호출
10. 10MB 초과 base64 → 413
11. wrapper 일반 throw → 1회 재시도 후 502, 토큰/키 이름 비노출
12. wrapper "timed out" throw → 504, 재시도 없음 (wrapper 1회 호출)
13. wrapper "not configured" throw → 500 (`ERROR_SERVER_CONFIG`), 토큰 키 이름 비노출, 재시도 없음
14. wrapper 첫 호출 실패 + 두 번째 성공 → 200 (1회 재시도)
15. GET → 405

**Replicate wrapper는 `vi.mock('@/lib/replicate')`로 완전 모킹. 실호출 0회.**

---

## 3. 풀 파이프라인 게이트 결과

| # | 명령 | 결과 | 비고 |
|---|------|------|------|
| 1 | `npm run typecheck` | **PASS** (exit 0) | tsc --noEmit, 출력 없음 |
| 2 | `npm run lint` | **PASS** (exit 0) | eslint, 출력 없음 |
| 3 | `npm run test` | **PASS** | 10 files / **101 tests** (smoke 2 + uploadProcessor 14 + styles 13 + stylePrompts 8 + replicate 8 + UploadPanel 11 + StylePicker 10 + GenerationCard 11 + **remoteConfig 9 + api.generate 15**) |
| 4 | `npm run build` | **PASS** (Next 15.5.2) | `/api/generate` edge dynamic 유지 (`ƒ /api/generate`) |

보안 grep 셀프체크: 4/4 항목 모두 매칭 0건 (`process.env.REPLICATE_API_TOKEN` in `src/__tests__`; `from 'replicate'` in `src/components|app/page.tsx|layout.tsx`; `NEXT_PUBLIC_REPLICATE`; `@/lib/stylePrompts` in client).

---

## 4. API 계약 최종 (R3가 그대로 소비)

### 요청
```ts
type GenerateRequest = {
  image: string;   // data:image/(jpeg|png|webp);base64,...
  styleId: string; // STYLE_IDS에 포함된 값
};
```

### 응답
```ts
type GenerateResponseOk  = { ok: true;  styleId: string; imageUrl: string };
type GenerateResponseErr = { ok: false; styleId: string; error: string };
```

### HTTP 상태 매핑

| 상황 | HTTP | error 메시지 |
|------|------|--------------|
| 정상 | 200 | (없음) |
| JSON 파싱 실패 / body 비-object | 400 | `잘못된 요청입니다` |
| `image` 누락·타입 불일치·prefix 불일치(mime 미허용) | 400 | `잘못된 이미지 형식입니다` |
| `styleId` 누락 / 미지의 ID | 400 | `알 수 없는 스타일입니다` |
| base64 디코딩 후 > 10MB | 413 | `파일이 너무 큽니다` |
| wrapper "timed out" throw | 504 | `시간이 초과되었습니다` |
| wrapper "not configured" / `REPLICATE_API_TOKEN` 메시지 | 500 | `서버 설정 오류입니다` |
| wrapper 그 외 throw (Replicate 5xx 등) | 502 | `생성에 실패했습니다` |
| GET 메서드 | 405 | `Method Not Allowed` |

- **모든 경로에서 JSON 응답 보장.** `Content-Type: application/json`.
- **재시도 정책:** wrapper의 throw가 timeout 또는 server-config 류면 재시도 X. 그 외 1회 재시도 (총 최대 2회 wrapper 호출). 두 번째도 실패 시 위 매핑 그대로.
- **사용자 노출 메시지 정책:** 키 이름(`REPLICATE_API_TOKEN`), 토큰 평문(`r8_…`), 내부 스택은 절대 노출 X. 한국어 짧은 카피만.

---

## 5. next.config.ts 보강 여부

**미보강 (불필요).** 확인 결과 `images.remotePatterns`에 `replicate.delivery` + `pbxt.replicate.delivery` 두 호스트가 **이미 등록**되어 있음 (`pathname: "/**"`, `protocol: "https"`). R1 qa 권고 사항은 R1 시점에 이미 충족된 상태.

---

## 6. 설계 결정 / R3가 알아야 할 점

1. **`max_upload_size_mb`는 서버에서 RC를 조회하지 않는다.** edge runtime에서 Firebase SDK init은 무겁고, 1요청당 비용이 발생한다. MVP에서는 route handler에 **상수 10MB**로 박아둠 (PRD/architect 명세와 동일). 운영자가 RC에서 이 값을 8MB로 낮춰도 클라이언트(UploadPanel)는 거기에 따라 거부할 수 있다 — 서버는 그보다 큰 한도까지만 받는다(클라이언트가 사전 차단).

2. **`enabled_styles` / `maintenance_mode`도 서버에서 재검증하지 않는다.** 클라이언트가 RC에서 읽어 fetch 자체를 막고, 서버는 단순히 `STYLE_IDS` 허용 목록만 검사한다 (즉, RC에서 비활성화된 스타일도 styleId가 STYLE_IDS에 있으면 서버는 처리한다). 이는 의도된 동작 — RC는 UX 토글, 서버 검증은 코드의 진실 소스(`src/config/styles.ts`).

3. **재시도 정책 결정.** R1 wrapper는 plain `Error` throw + HTTP 코드 metadata 없음. 따라서 retry 분류는 메시지 기반 heuristic: `timed out|timeout` → 재시도 X (이미 60s 대기), `not configured|REPLICATE_API_TOKEN` → 재시도 X (환경 문제), 그 외 → 1회 재시도. 결과적으로 Replicate 4xx도 1회 재시도된다 (식별 불가). MVP에서는 단순성 우선 — 422 같은 결정적 거절을 다시 보내도 추가 비용은 1회 호출 정도로 허용 가능. 향후 wrapper가 HTTP 코드를 노출하도록 리팩터하면 retry 정책을 좁힐 수 있음.

4. **504 감지는 `err.name === 'AbortError'`가 아니다.** R1 wrapper는 `Promise.race` 기반 `setTimeout`을 사용하므로 throw하는 객체는 `new Error('Replicate request timed out after 60000ms')`. `isTimeoutError`는 `err.name === 'AbortError'` **또는** `/timed out|timeout/i.test(err.message)` 두 경로 모두 인식. SDK 업그레이드로 AbortController가 도입되면 첫 분기가 살아남는다.

5. **GET 405 핸들러 명시.** Next.js가 자동으로 405 처리할 수 있지만, R3 frontend가 `Method Not Allowed`를 명시적으로 받기 원할 가능성 + Cloudflare edge의 일관성 위해 명시 핸들러 작성.

6. **R3 응답 매핑 가이드:**
   - 200 / `ok: true`: `<img src={imageUrl}>` 또는 `<Image src={imageUrl}>` 즉시 표시. 다운로드 버튼은 단순 `<a href={imageUrl} download>` 폴백 권장 (R1 backend §5 노트 7 — CORS 가능성).
   - 400/413 (검증 실패): 에러 카드에 `error` 문자열 그대로 노출. 이미 한국어 짧은 카피.
   - 502 (생성 실패): 동일하게 노출 + 재시도 버튼 권장(이미 서버가 1회 재시도했으므로 즉시 동일 결과 가능성 있음 — UX적으로는 사용자가 명시적으로 누르도록).
   - 504 (타임아웃): 동일 노출 + 재시도 버튼. wrapper의 60s 한도가 만료된 것이므로 백엔드 자원은 일단 풀려있음.
   - 500 (서버 설정): 운영자 에러. 사용자에게 "서버 설정 오류입니다"만 표시. 재시도해도 동일.

7. **`firebase.ts` 분리 이유.** `loadConfig` 본체와 SDK init을 한 파일에 두면 import 시점에 init이 일어날 위험(import 순서/번들 분할에 따라). 격리 모듈로 빼고 `getClientApp()`을 명시 호출 시점에만 실행 — edge SSR 번들 + jsdom 테스트 모두 안전.

8. **RC `defaultConfig` 주입.** `rc.defaultConfig`에 8개 키 default를 string-encoded로 주입한다. 그래야 `fetchAndActivate`가 실패해도 `getValue`가 default를 반환한다. 하지만 try/catch가 더 바깥에 있어 fetchAndActivate가 throw하면 어차피 코드의 DEFAULT_CONFIG로 폴백 — 이중 안전.

---

## 7. R3 진입 가능 여부

**R3 (`src/app/page.tsx`, `src/components/ResultGallery.tsx`, frontend의 sticky CTA 등) 즉시 진입 가능.**

체크포인트:
- API 계약 §4 동결 — R3 frontend는 `fetch('/api/generate', { method: 'POST', body: JSON.stringify({ image, styleId }) })`만 호출.
- `loadConfig()`/`DEFAULT_CONFIG`/`AppConfig` export 안정. R3가 `useEffect`에서 `loadConfig().then(setConfig)`, 첫 렌더는 `DEFAULT_CONFIG`로.
- `enabled_styles`/`style_order`/`maintenance_mode`/`ui_copy`는 R3가 클라이언트에서 소비, 서버는 추가 검증 X (§6.2).
- frontend R2 산출물(`StylePicker`, `GenerationCard`)은 backend 영역 미접촉이므로 충돌 없음 (테스트 21건 별도 PASS).

R3 후 qa가 재호출되면 다음을 추가 검증할 것:
- 4 게이트 회귀.
- 보안 grep 4종 매칭 0건 유지.
- API 계약 §4 ↔ R3의 fetch 호출 시그니처 일치.
- `loadConfig()` 호출이 컴포넌트 mount 후 1회만 일어남(`useEffect` 의존성 빈 배열).
- `AppConfig.enabled_styles` 필터링이 styleId set과 일관.

---

## 8. 변경 이력

| 일시 | 변경자 | 변경 내용 |
|------|--------|----------|
| 2026-05-12 | backend (Phase 3 R2) | 최초 작성. `firebase.ts`/`remoteConfig.ts`/`route.ts` 신규. 24 테스트 신규. 풀 파이프라인 4/4 PASS, 보안 grep 4/4 0건. API 계약 §4 동결. next.config.ts 보강 불필요 확인. |
