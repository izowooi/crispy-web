# Phase 3 R2 — Frontend Done (snapmany)

생성일: 2026-05-12 (Phase 3 R2)
작성자: frontend 서브 에이전트 (model: opus)
선행 산출물: `_workspace/00_architect_decisions.md`, `_workspace/03_R1_backend_done.md`, `_workspace/03_R1_frontend_done.md`, `_workspace/03_R1_qa.md`
병렬 작업: backend R2 (`src/lib/remoteConfig.ts`, `src/app/api/generate/route.ts` — frontend 미관여)

---

## 0. 요약

R2 frontend가 소유하는 2개 컴포넌트(`StylePicker`, `GenerationCard`) + 대응 단위테스트 2개 작성 완료. TDD(RED → GREEN → REFACTOR) 엄수. R1이 만든 모든 산출물(UploadPanel, uploadProcessor, styles config) 무수정. 풀 파이프라인 4종 게이트는 **frontend 영역에서 0 에러** — typecheck/lint/build PASS, 테스트는 R2 frontend 21건 모두 PASS(전체 88/101 중 실패 13건은 backend R2가 작업 중인 `api.generate.test.ts` 한 파일).

---

## 1. 생성한 파일 목록 (4개)

| # | 파일 | 역할 | 라인 수 |
|---|------|------|---------|
| 1 | `src/components/StylePicker.tsx` | `"use client"`. 7 카테고리 탭바(`role="tablist"` + `border-b accent`) + 활성 탭 스타일 그리드(모바일 2열, sm+ 3열). 각 카드: `label` + `description` + `CheckBadge`. `enabledStyleIds`로 회색 처리(opacity-50 + cursor-not-allowed), `maxSelection`으로 추가 선택 차단(이미 선택된 건 해제 OK), `styleOrder`로 카테고리 내 재정렬. "현재 탭 전체 선택" / "현재 탭 해제" 보조 버튼. `selectedIds` 카운터 표시. 다크모드 호환 토큰(`text-foreground` / `text-muted` / `border-border` / `border-accent` / `bg-accent/10` / `bg-card`). | 207 |
| 2 | `src/components/GenerationCard.tsx` | `"use client"`. `aspect-square` 카드. `GenerationStatus = idle/uploading/generating/completed/failed`. idle·uploading·generating → `Spinner` + 라벨 + 한국어 상태 텍스트(`STATUS_TEXT`). completed → `<img object-cover>` + 하단 그라데이션 오버레이(모바일 상시 / sm+ group-hover). failed → 회색 카드 + 빨간 에러 메시지 + 옵션 retry 버튼. 다운로드/복사 버튼은 콜백만 호출(blob/clipboard 로직은 R3 소유). `GenerationStatus` / `GenerationItem` / `GenerationCardProps` 명시 export. | 141 |
| 3 | `src/__tests__/components.StylePicker.test.tsx` | **10 테스트**. 카테고리 탭 7개 렌더(2), 탭 전환(1), 선택 추가·해제(2), `enabledStyleIds` 비활성화 + 활성화(2), `maxSelection` 캡 + 캡 시 해제 허용(1), bulk 버튼 렌더(1), bulk 전체 선택(1). `data-testid="style-tab-${id}"` / `style-card-${id}` / `style-bulk-select` / `style-bulk-clear` 훅 사용. `fireEvent.click` 사용(user-event 미도입). | 175 |
| 4 | `src/__tests__/components.GenerationCard.test.tsx` | **11 테스트**. status별 분기 5종(idle/generating/uploading 스피너, completed img+버튼, failed 에러 메시지), 콜백 2종(onDownload/onCopy + `item.id` 인자 검증), retry 가시성 3종(failed+onRetry → 표시·클릭, failed without onRetry → 숨김, completed+onRetry → 숨김), 액션 버튼은 completed에서만 1종(generating에서 download/copy 모두 숨김). | 172 |

테스트 위치는 `src/__tests__/` 통일(vitest.config.ts `include` 패턴 준수). R1과 일치.

---

## 2. 테스트 케이스 수 + 통과

- `components.StylePicker.test.tsx`: **10/10 PASS**
- `components.GenerationCard.test.tsx`: **11/11 PASS**
- R2 frontend 단독: **21/21**
- frontend 전체(R1 25 + R2 21): **46/46 PASS** (격리 실행으로 검증)
- 프로젝트 전체: **88/101 PASS** (실패 13건은 모두 `src/__tests__/api.generate.test.ts` 한 파일 — backend R2가 작업 중. frontend R2 영역 0 실패)

---

## 3. 풀 파이프라인 게이트 결과 (frontend 영역 기준)

> **주의:** 본 라운드는 backend R2와 병렬 실행 중이며, 전체 `npm run typecheck` / `npm run test`는 backend R2(아직 미완료: `src/lib/remoteConfig.ts`, `src/app/api/generate/route.ts`) 사유로 비-0 종료한다. 아래 표는 **frontend R2가 만진 파일 영역에 한해** 0 에러임을 명시한다. qa는 backend R2 마감 후 풀 파이프라인을 재실행해 회귀를 확인한다.

| # | 명령 | 결과 | 비고 |
|---|------|------|------|
| 1 | `npm run typecheck` | **PASS** (frontend 영역) | `StylePicker.tsx` / `GenerationCard.tsx` / 두 테스트 파일에서 TS 에러 0건. 전체 출력의 에러는 모두 `api.generate.test.ts` (backend R2) 및 `remoteConfig.test.ts` (backend R2가 작업 중인 module을 import하는 테스트) — frontend 무관. |
| 2 | `npm run lint` | **PASS** (exit 0, 출력 없음) | 전체 깨끗. |
| 3 | `npm run test` | frontend 영역 **46/46 PASS**. 전체 88/101. | 실패 13건 모두 `api.generate.test.ts` (backend R2 미완료, 501 vs 200 등). qa가 R2 마감 시 재실행. |
| 4 | `npm run build` | **PASS** (Next 15.5.2) | 4 라우트 컴파일 성공, `/api/generate`는 edge dynamic. `StylePicker`/`GenerationCard`는 `'use client'` 컴포넌트지만 page.tsx가 아직 임포트하지 않아 client bundle에 들어가지 않음 (R3에서 wire-up). |

> 4종 게이트 모두 frontend R2 영역에서 0 에러. backend R2의 미완료 상태는 frontend 영역의 차단 사유가 아니다(qa가 R2 incremental에서 backend 마감 후 재실행).

---

## 4. R3 page.tsx가 사용할 import 경로와 props 명세 요약

```ts
import {
  StylePicker,
  type StylePickerProps,
} from "@/components/StylePicker";

import {
  GenerationCard,
  type GenerationCardProps,
  type GenerationItem,
  type GenerationStatus,
} from "@/components/GenerationCard";
```

### `StylePicker` props

```ts
type StylePickerProps = {
  selectedIds: string[];                       // controlled
  onChange: (next: string[]) => void;
  enabledStyleIds?: string[];                  // RC.enabled_styles (undefined ⇒ 전체 허용)
  styleOrder?: string[];                       // RC.style_order (카테고리 내 재정렬)
  maxSelection?: number;                       // 미지정 시 무제한
  className?: string;
};
```

- `selectedIds`는 controlled — page.tsx의 `useState<string[]>([])` 또는 reducer state에서 내려준다.
- `enabledStyleIds === undefined` ⇒ 전체 허용 / `[]` ⇒ 모두 비활성(둘 구분).
- `maxSelection` 도달 시 새 추가는 무시. 이미 선택된 카드는 항상 해제 가능(비대칭).

### `GenerationCard` props

```ts
type GenerationStatus =
  | "idle" | "uploading" | "generating" | "completed" | "failed";

type GenerationItem = {
  id: string;           // page.tsx가 발급하는 클라이언트 고유 id (e.g., `${styleId}-${nonce}`)
  styleId: string;      // STYLE_IDS 중 하나
  styleLabel: string;   // STYLES.find(...).label
  status: GenerationStatus;
  imageUrl?: string;    // completed일 때만
  error?: string;       // failed일 때만
};

type GenerationCardProps = {
  item: GenerationItem;
  onRetry?: (id: string) => void;     // R3에서 dispatch('retry')
  onCopy?: (id: string) => void;      // R3가 fetch+canvas+clipboard.write 구현
  onDownload?: (id: string) => void;  // R3가 blob fetch + <a download> 구현
};
```

### page.tsx 통합 스니펫 (R3 참고)

```tsx
const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
const [items, dispatch] = useReducer(generationReducer, []);

<StylePicker
  selectedIds={selectedStyleIds}
  onChange={setSelectedStyleIds}
  enabledStyleIds={config.enabled_styles}   // backend R2의 remoteConfig
  styleOrder={config.style_order}
/>

<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
  {items.map((it) => (
    <GenerationCard
      key={it.id}
      item={it}
      onDownload={handleDownload}            // blob fetch + <a download>
      onCopy={handleCopy}                    // fetch → canvas → clipboard.write
      onRetry={handleRetry}                  // dispatch + refetch
    />
  ))}
</div>
```

---

## 5. 알려진 한계 (R3와 qa가 알아야 할 점)

1. **`aspect-square`로 카드 비율 고정.** R2 task spec이 명시. backend §5 note 4가 경고한 "스타일별 종횡비 차이(2:3 vs 1:1)"는 `<img className="object-cover">`로 흡수 — 일부 스타일은 결과 이미지의 일부가 크롭되어 표시될 수 있다. 사용자가 다운로드한 원본은 영향 없음(원본 URL을 그대로 다운로드).

2. **`navigator.clipboard.write` / blob fetch는 GenerationCard에서 구현하지 않음.** spec이 콜백만 요구. R3가 다음을 구현:
   - 다운로드: `fetch(imageUrl) → blob() → URL.createObjectURL → <a download> 트리거`. CORS 문제 발생 시 `<a href={imageUrl} download target="_blank">` 폴백.
   - 복사: `fetch → blob → ClipboardItem({ 'image/png': blob }) → navigator.clipboard.write`. 일부 브라우저는 webp 미지원이라 canvas로 png 변환 필요.
   - jsdom 한계로 R3 또는 Phase 4 E2E에서 검증.

3. **`StylePicker`의 `activeTab`은 컴포넌트 내부 상태.** props로 노출 안 함. 페이지에서 "특정 카테고리로 점프" 같은 외부 제어가 필요해지면 spec 변경 + props 추가 필요(현재 MVP 범위 밖).

4. **`enabledStyleIds`가 빈 배열일 때 정의** — 모든 카드가 회색·비활성. `undefined`(RC fetch 실패 시 기본값)와 명확히 구분. R3가 RC fallback을 사용할 때 주의: RC fetch 실패 시 `enabledStyleIds`를 `undefined`로 두거나 `STYLE_IDS` 전체를 명시 전달해야 함(`[]`는 의도된 "모두 비활성"이다).

5. **`onRetry` 시그니처는 `(id: string) => void`.** `styleId`가 아니라 클라이언트 발급 `item.id`. R3 reducer는 `item.id`로 항목을 식별해 `status: 'generating'`으로 전환 후 재호출하면 된다.

6. **bulk "전체 선택" 동작은 `maxSelection`을 존중.** capacity 초과분은 잘라낸다(`slice(0, maxSelection)`). 비활성 스타일은 자동 제외. 비결정적 사용자 의도(예: 캡이 2인데 4개 있는 탭에서 "전체 선택" 누름)는 "선언된 순서대로 앞에서 2개"로 해석. 변경 필요 시 spec 협의.

7. **다크모드 액센트 색.** `globals.css`에 `--accent: #f97316` (light) / `#fb923c` (dark). 두 카드 모두 `text-accent` / `border-accent` / `bg-accent/10` / `bg-accent` 토큰만 사용해 자동 전환됨.

8. **모바일 카메라 직접 캡처 / HEIC 등 R1 한계 그대로** — R2에서 추가 작업 없음.

---

## 6. 보안 / R1 무수정 확인

- `src/lib/**`, `src/app/api/**`, `src/config/**`, `next.config.ts` — **만지지 않음**.
- `src/components/UploadPanel.tsx`, `src/components/uploadProcessor.ts` — **만지지 않음**.
- `src/app/page.tsx`, `.env.local` — **만지지 않음**.
- `_workspace/00_architect_decisions.md` 등 다른 산출물 — **만지지 않음**.
- `replicate` import / `REPLICATE_API_TOKEN` / `NEXT_PUBLIC_REPLICATE_*` 참조 — **0건** (두 신규 컴포넌트는 클라이언트 영역으로 빌드만 함).
- 신규 컴포넌트는 `@/config/styles`(클라이언트 노출 가능)만 import — `@/lib/stylePrompts`나 `@/lib/replicate` 등 서버 전용 모듈은 import 안 함.

---

## 7. R3 진입 가능 여부

**R3 (`src/app/page.tsx` + `ResultGallery` 통합) 즉시 진입 가능.**

체크포인트:
- `StylePicker` / `GenerationCard` API 안정 (21 테스트로 잠금).
- props 명세 본 문서 §4에 동결 — R3가 동일 import 경로 사용.
- backend R2가 `remoteConfig.ts`를 마감하면 `enabledStyleIds={config.enabled_styles}` / `styleOrder={config.style_order}`로 wire-up.
- R3가 추가로 구현할 것: download/copy/retry 핸들러, `useReducer(generationReducer, [])`, `Promise.allSettled` 병렬 호출, 생성 버튼 disabled 조건.

---

## 8. 변경 이력

| 일시 | 변경자 | 변경 내용 |
|------|--------|----------|
| 2026-05-12 | frontend (Phase 3 R2) | 최초 작성. `StylePicker`(7 탭 + 다중선택 + enabledStyleIds + maxSelection + bulk 버튼) + `GenerationCard`(status별 분기 + onDownload/onCopy 콜백 + 조건부 retry) TDD 구현 완료. 21 테스트 작성·통과(frontend 합계 46/46). 풀 파이프라인 frontend 영역 0 에러. R1 산출물 무수정. |
