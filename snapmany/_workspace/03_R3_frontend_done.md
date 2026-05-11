# Phase 3 R3 — Frontend Done (snapmany)

생성일: 2026-05-12 (Phase 3 R3)
작성자: frontend 서브 에이전트 (model: opus)
선행 산출물:
- `_workspace/00_architect_decisions.md` (§디자인 톤, §UI 인터랙션 범위, §6 API 계약)
- `_workspace/03_R1_backend_done.md` (STYLES, isKnownStyleId)
- `_workspace/03_R1_frontend_done.md` (UploadPanel + uploadProcessor)
- `_workspace/03_R2_backend_done.md` (RC wrapper · API 계약 §4 · 응답 매핑 §6.6)
- `_workspace/03_R2_frontend_done.md` (StylePicker · GenerationCard API)
- `_workspace/03_R2_qa.md` (R2 검증 결과 — R3 진입 허가)

---

## 0. 요약

R3 frontend가 소유하는 2개 모듈 (`ResultGallery` 신규 + `page.tsx` 완전 구현) + 대응 단위테스트 2개 작성 완료. TDD 사이클(RED → GREEN → REFACTOR) 엄수. 풀 파이프라인 4종 게이트(typecheck / lint / test / build) 0 에러 + 보너스 `pages:build` 성공. **R1 · R2 산출물(`UploadPanel`, `uploadProcessor`, `StylePicker`, `GenerationCard`, `remoteConfig`, `styles`) 무수정.**

---

## 1. 생성/수정 파일

### 신규 (소스 1)
| 파일 | 역할 |
|------|------|
| `src/components/ResultGallery.tsx` | `GenerationItem[]`을 받아 카드 그리드(`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3`) 렌더링. items가 비면 placeholder("이미지를 업로드하고 스타일을 선택해주세요"). 각 아이템에 R2의 `GenerationCard` 매핑. 콜백 3종(`onRetry`/`onCopy`/`onDownload`) 패스스루. testid `result-gallery` / `result-gallery-empty`. |

### 수정 (소스 1)
| 파일 | 역할 |
|------|------|
| `src/app/page.tsx` | 메인 페이지 완전 구현. `'use client'` + `useReducer` 상태 관리(`State = { image, selectedIds, items, config }` / `Action` 6종) + `useEffect`에서 `loadConfig()` 1회 호출 + sticky 헤더(타이틀 + 인라인 `ThemeToggle`) + maintenance 배너(`maintenance-banner` testid, `data-role="alert"`) + `UploadPanel` → `image` state + `StylePicker`(spread로 readonly 제거: `[...config.enabled_styles]` / `[...config.style_order]`) + 모바일 sticky bottom CTA + 데스크탑 inline CTA + `ResultGallery` + 푸터. `handleGenerate`는 `selectedIds.map`으로 `GenerationItem` 발급 → `start_generation` dispatch → `Promise.allSettled` 병렬 `fetch('/api/generate', POST JSON {image, styleId})` → 응답마다 `update_item` dispatch. download/copy/retry 핸들러 각각 구현. |

### 신규 (테스트 2)
| 파일 | 케이스 수 |
|------|----------|
| `src/__tests__/components.ResultGallery.test.tsx` | **9** |
| `src/__tests__/page.test.tsx` | **6** |

### 미변경 (R1 · R2 동결분 확인만)
- `src/config/styles.ts`, `src/lib/{stylePrompts,replicate,firebase,remoteConfig}.ts`, `src/app/api/generate/route.ts`, `next.config.ts`, `.env.local`
- `src/components/{UploadPanel,StylePicker,GenerationCard,uploadProcessor}.{tsx,ts}` 및 그 11/10/11/14 + 25개 단위 테스트 모두 무수정

---

## 2. 테스트 케이스 + 통과

### `components.ResultGallery.test.tsx` (9/9)
1. items 비어있으면 placeholder 문구 노출
2. items 비어있지 않으면 placeholder 미노출
3. items 3개일 때 testid `generation-card-${id}` 3개 렌더
4. completed + failed 혼합 렌더 (`<img>` + 에러 메시지 양쪽 노출 — 한 실패가 다른 성공을 전파하지 않음)
5. `onDownload(id)` 패스스루
6. `onCopy(id)` 패스스루
7. `onRetry(id)` 패스스루
8. failed + `onRetry` 미지정 → retry 버튼 숨김 (GenerationCard 동작 확인)
9. responsive grid wrapper class + custom `className` 합쳐짐

### `page.test.tsx` (6/6)
1. 헤더의 SnapMany 타이틀 렌더
2. 첫 렌더 시 empty-state placeholder 노출
3. 이미지 없음 + 선택 없음 → 생성 버튼 disabled
4. 이미지 업로드 + 스타일 2개 선택 → 버튼 활성 → 클릭 시 fetch 2회(styleId별 정확히) → 두 카드 모두 완료(`<img src=https://replicate.delivery/...>` 2개)
5. 일부 실패(`passport`만 ok:false) → 그 카드만 failed (에러 메시지 노출), 다른 카드는 completed (실패가 전체로 전파되지 않음)
6. `maintenance_mode: true` → maintenance 배너 노출 + "점검 중" 카피 + 생성 버튼 disabled

**합계 신규 15 테스트. 프로젝트 전체 116/116 PASS.**

---

## 3. 풀 파이프라인 + 보너스 게이트 결과

| # | 명령 | 결과 | 비고 |
|---|------|------|------|
| 1 | `npm run typecheck` | **PASS** (exit 0) | tsc --noEmit, 출력 없음 |
| 2 | `npm run lint` | **PASS** (exit 0) | eslint, 출력 없음 |
| 3 | `npm run test` | **PASS** | 12 files / **116 tests** (R2 시점 101 + R3 신규 15) |
| 4 | `npm run build` | **PASS** (Next 15.5.2) | `○ /` 21.8 kB · `ƒ /api/generate` edge dynamic 유지 |
| 5 | `npm run pages:build` (보너스) | **PASS** (@cloudflare/next-on-pages 1.13.16) | Edge Function Routes 1개(`/api/generate`) + Prerendered Routes 4개. `.vercel/output/static/_worker.js/index.js` 생성. Cloudflare 호환성 사전 확인 OK. |

**보안 grep 셀프체크 4/4 매칭 0건** (replicate import in client / stylePrompts·replicate in client / NEXT_PUBLIC_REPLICATE / token in client).

---

## 4. 핸들러 한 줄 설명

- **`handleDownload(id)`**: `fetch(imageUrl) → blob() → URL.createObjectURL → <a download>.click() → revokeObjectURL`. CORS 등 실패 시 `window.open(imageUrl, '_blank', 'noopener')` 폴백.
- **`handleCopy(id)`**: `ClipboardItem` 가용성 가드 후 `fetch → blob → new ClipboardItem({[blob.type]: blob}) → navigator.clipboard.write([item])`. jsdom·미지원 브라우저 안전(try/catch + console.warn).
- **`handleRetry(id)`**: 해당 item을 `status: 'generating'` + `error/imageUrl: undefined`로 패치 → 동일 styleId · 동일 image dataUrl로 `runGeneration` 재호출.

---

## 5. RC 키 ↔ 컴포넌트 매핑 (Phase 4 통합 QA 참고)

| RC 키 | 소비 컴포넌트 | 적용 위치 |
|-------|--------------|-----------|
| `enabled_styles` | `StylePicker` | `enabledStyleIds={[...config.enabled_styles]}` — readonly 회피용 spread |
| `style_order` | `StylePicker` | `styleOrder={[...config.style_order]}` |
| `maintenance_mode` | `page.tsx` | 배너 + 생성 버튼 `disabled` |
| `max_upload_size_mb` | `UploadPanel` | `maxSizeBytes={config.max_upload_size_mb * 1024 * 1024}` |
| `ui_copy.title` / `ui_copy.subtitle` / `ui_copy.generateButton` | `page.tsx` (header / footer / CTA) | optional chain + fallback 상수 |
| `default_style_count` / `replicate_model_by_style` / `show_beta_styles` | (R3에서 미소비) | MVP는 사용 안 함. backend route는 코드 진실 소스 기반(R2 §6 참조). |

**`loadConfig()` 호출 위치**: `page.tsx`의 첫 `useEffect`(의존성 `[]`) — mount 후 1회만. 첫 렌더는 `DEFAULT_CONFIG`(remoteConfig.ts에서 export)로 시작 → RC 응답 도착 시 `dispatch({ type: 'set_config', payload })`로 swap.

---

## 6. fetch 요청/응답 ↔ backend 정합

### 요청 (`page.tsx` line ~120 부근, `runGeneration`)
```ts
fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image: imageDataUrl, styleId }),
});
```
- 키 이름: `image` / `styleId`. backend `route.ts` (R2 §4) 명세와 1:1 일치.
- `image`는 `UploadPanel.processImage`가 만든 `data:image/webp;base64,...` dataURL. EXIF는 canvas 재인코딩으로 사전 제거(R1 frontend §1.5).

### 응답 매핑
- `json.ok === true` → `update_item({ status: 'completed', imageUrl: json.imageUrl, error: undefined })`
- `json.ok === false` → `update_item({ status: 'failed', error: json.error ?? '생성에 실패했습니다' })`
- `fetch` 자체 throw (네트워크 오류) → `update_item({ status: 'failed', error: '네트워크 오류' })`
- HTTP 상태 코드는 `json.ok` 분기로 흡수 — backend R2가 400/413/422/500/502/504 모두 JSON 응답으로 반환하므로 status 코드를 별도로 분기할 필요 없음(R2 §4).

---

## 7. 테스트 인프라 / jsdom mock 패턴

### `vi.hoisted` 패턴 (Phase 4 QA가 참고할 정확한 구문)
`page.test.tsx`는 `vi.mock` 팩토리가 외부 변수를 참조해야 하므로 `vi.hoisted`로 mock 함수를 끌어올린다. (그렇지 않으면 `ReferenceError: Cannot access ... before initialization`).
```ts
const { DEFAULT_TEST_CONFIG, mockLoadConfig } = vi.hoisted(() => ({ /* … */ }));
vi.mock('@/lib/remoteConfig', () => ({
  DEFAULT_CONFIG: DEFAULT_TEST_CONFIG,
  loadConfig: () => mockLoadConfig(),
}));
```

### fetch mock
```ts
global.fetch = vi.fn(async (_url, options) => {
  const { styleId } = JSON.parse(String(options?.body));
  return {
    ok: true,
    status: 200,
    json: async () => ({ ok: true, styleId, imageUrl: `https://replicate.delivery/${styleId}.webp` }),
  } as Response;
});
```
스타일별 응답 커스터마이즈는 `installFetchMock((styleId) => ...)` 패턴.

### `uploadProcessor` mock
`UploadPanel` 테스트와 동일하게 `processImage`만 stub해서 jsdom canvas/Image 한계를 우회.

### `waitFor` 타이밍
- `useEffect`에서 `loadConfig().then(dispatch)`가 두 단계 마이크로태스크에 걸쳐 적용되므로, **maintenance test는 `await waitFor(() => expect(mockLoadConfig).toHaveBeenCalled())` 후 다시 `await waitFor(() => screen.getByTestId('maintenance-banner'))`** 로 두 단계 폴링이 안전.

---

## 8. 알려진 한계 / Phase 4 QA가 알아야 할 점

1. **`navigator.clipboard.write` / `<a download>.click()`은 단위 테스트로 검증 안 됨.** jsdom의 `ClipboardItem` 미지원. `handleCopy`는 try/catch로 실패를 console.warn으로 흡수 — Playwright MCP에서 실제 검증 필요(Phase 4).
2. **`crypto.randomUUID()`** 는 jsdom 25 + node 22에 있어 정상. SSR(edge)에는 도달하지 않음(`'use client'`).
3. **`ResultGallery`의 grid는 sm/lg 브레이크포인트 사용** — `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`. 모바일 2열, sm 3열, lg 4열. spec의 "모바일 2열, sm+ 3-4열"과 일치.
4. **다크모드 토글은 별도 컴포넌트 파일 만들지 않고 `page.tsx` 안에 인라인** (`ThemeToggle` 함수). architect §디자인 톤 + ductcanvas 패턴 + R3 spec의 "가벼운 인라인" 권고 부합. localStorage + `<html class="dark">` 토글.
5. **Sticky 모바일 생성 버튼은 `sticky bottom-0 sm:hidden`** (sm 이상에선 본문 흐름 안의 데스크탑 버튼 사용). `fixed`보다 안전 — body 스크롤 위에 안 떠다님.
6. **`start_generation` action은 items를 _덮어쓴다_** (append 아님). 매번 새 batch이므로 이전 결과는 사라진다. 만약 누적이 필요해지면 action 분리 필요(현재 spec은 명시적으로 "items overwrite").
7. **재시도는 새 batch가 아니라 단일 item만 패치** — `start_generation` 대신 `update_item`으로 status 전환 후 동일 fetch 재호출. styleId · image dataUrl는 변하지 않음.
8. **`config.enabled_styles` / `style_order`는 `readonly string[]`** (R2 backend의 `AppConfig` 타입). `StylePicker`의 props는 mutable `string[]`이라 spread(`[...]`)로 복사해서 전달 — TS 호환을 위해 필요. R2 frontend를 수정하지 않는다는 제약 하에 R3 페이지에서만 흡수.
9. **`useReducer`의 selectedIds는 `string[]`** (mutable) — `StylePicker`의 `onChange: (next: string[]) => void` 시그니처와 정합. dispatch wrapper(`handleSelectionChange`)로 콜백을 reducer로 패스.
10. **응답 JSON에 `imageUrl` 없을 때**: `update_item({ patch: { imageUrl: json.imageUrl } })` — `json.imageUrl`가 undefined면 patch에 undefined가 들어가 status는 completed로 가도 imageUrl이 없는 카드가 됨. backend R2는 ok:true 응답에 imageUrl을 항상 포함하므로 실무에서는 발생하지 않으나, 방어적으로 `GenerationCard`가 `if (status === 'completed' && imageUrl)`로 가드 중이므로 결국 스피너 분기로 폴백.

---

## 9. R1 · R2 무수정 확인

- `src/lib/**`, `src/app/api/**`, `src/config/**`, `next.config.ts`, `.env.local` — **만지지 않음**.
- `src/components/UploadPanel.tsx`, `src/components/uploadProcessor.ts`, `src/components/StylePicker.tsx`, `src/components/GenerationCard.tsx` — **만지지 않음** (import만).
- 신규 영역: `src/components/ResultGallery.tsx`, `src/app/page.tsx`(스텁 → 본 구현), `src/__tests__/components.ResultGallery.test.tsx`, `src/__tests__/page.test.tsx`.
- `replicate` import / `REPLICATE_API_TOKEN` / `NEXT_PUBLIC_REPLICATE_*` 참조 — **0건** (보안 grep 4/4 매칭 0건).

---

## 10. Phase 4 진입 가능 여부

**Phase 4 (통합 QA + Playwright MCP) 즉시 진입 가능.**

체크포인트:
- 풀 파이프라인 4종 + 보너스 `pages:build`까지 모두 PASS.
- 116/116 단위 테스트 통과 (R1 회귀 0건 + R2 회귀 0건).
- API 계약 R2 backend §4 ↔ R3 frontend fetch shape **완전 정합** (키 이름 `image`/`styleId` 일치, 응답 분기 `ok: true/false` ↔ status 매핑 무누락).
- RC 키 5개(enabled_styles/style_order/maintenance_mode/max_upload_size_mb/ui_copy)를 R3가 클라이언트에서 소비 — 본 문서 §5 매핑 표 참조.
- 보안 grep 4/4 매칭 0건.

Phase 4 QA가 추가 검증할 권고 항목:
- Playwright MCP mock flow: 이미지 업로드 → 스타일 3개 선택 → 생성 클릭 → 결과 카드 3개 렌더 (mock으로 imageUrl 주입).
- Playwright MCP 실패 케이스: 한 스타일이 4xx 응답 → 해당 카드만 failed UI.
- 모바일 viewport(`375x812`)에서 sticky bottom CTA 노출 + 스타일 그리드 2열 확인.
- 다크모드 토글 동작 + localStorage 저장.
- 클립보드 복사 실제 동작(navigator.clipboard.write — Playwright 컨텍스트 권한 필요).

---

## 11. 변경 이력

| 일시 | 변경자 | 변경 내용 |
|------|--------|----------|
| 2026-05-12 | frontend (Phase 3 R3) | 최초 작성. `ResultGallery.tsx` 신규 + `page.tsx` 완전 구현. 15 테스트 신규(9 + 6). 풀 파이프라인 4/4 + 보너스 `pages:build` PASS. 보안 grep 4/4 매칭 0건. R1·R2 동결분 무수정. RC 5키 wire-up 확인. fetch shape backend R2 §4와 완전 정합. |
