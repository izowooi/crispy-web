# Phase 3 R1 — Frontend Done (snapmany)

생성일: 2026-05-12 (Phase 3 R1, backend와 병렬)
작성자: frontend 서브 에이전트 (model: opus)
선행 산출물: `_workspace/00_architect_decisions.md`, `_workspace/02_architect_scaffold.md`, `_workspace/02_qa_gate.md`

---

## 0. 요약

`UploadPanel` 컴포넌트 + 순수 함수 헬퍼 `uploadProcessor`를 TDD(RED → GREEN → REFACTOR)로 구현 완료. 풀 파이프라인 게이트 4종(typecheck/lint/test/build) 모두 통과. 14 + 11 = **25개** 단위 테스트 작성, 모두 통과(기존 smoke 2 + backend R1 29 포함 총 56/56 PASS).

## 1. 생성한 파일 목록 (4개)

| # | 파일 | 역할 | 라인 수 |
|---|------|------|---------|
| 1 | `src/components/uploadProcessor.ts` | 순수 함수 헬퍼 — `validateFile(file, maxSizeBytes)` MIME/크기 검증, `processImage(file, maxDim)` EXIF 제거 + canvas 재인코딩(`image/webp`, q=0.9, max-dim 2048), `computeDownscaledSize` 비율 유지 다운스케일. `ERROR_MESSAGES` 상수 export. | 142 |
| 2 | `src/components/UploadPanel.tsx` | `"use client"` 컴포넌트. 드래그앤드롭 + `<label>`-바인딩 파일 input(네이티브 클릭/키보드 처리). 검증 통과 시 processor 호출 → `onImageReady(dataUrl, meta)`. 실패 시 `onError?(message)`. 미리보기 `<img>` + 크기·치수 표시. Tailwind v4 토큰(`text-foreground` / `text-muted` / `border-border` / `border-accent` / `bg-accent/5`)으로 다크모드 친화. | 192 |
| 3 | `src/__tests__/components.uploadProcessor.test.ts` | 14 테스트. MIME 매트릭스(허용 3종 + 거부 7종), 크기 경계(=max 통과, max+1 거부), 커스텀 max 존중, MIME 우선순위 검증. | 75 |
| 4 | `src/__tests__/components.UploadPanel.test.tsx` | 11 테스트. 렌더링(2), 검증 분기(4 — gif 거부, 11MB 거부, 커스텀 max, optional onError), 해피 패스(3 — onImageReady 인자, 미리보기 렌더, processor reject 전파), 드래그앤드롭(2 — drop 처리, gif drop 거부). | 247 |

테스트 위치는 `src/__tests__/`로 통일(vitest.config.ts `include` 패턴 준수, scaffold §4.2 명시).

## 2. 테스트 케이스 수 + 통과

- `components.uploadProcessor.test.ts`: **14/14 통과**
- `components.UploadPanel.test.tsx`: **11/11 통과**
- 합계: **25/25** (전체 프로젝트 56/56)

## 3. 풀 파이프라인 게이트 결과

| # | 명령 | 결과 |
|---|------|------|
| 1 | `npm run typecheck` | PASS (출력 없음) |
| 2 | `npm run lint` | PASS (출력 없음) |
| 3 | `npm run test` | PASS (6 파일 / 56 테스트) |
| 4 | `npm run build` | PASS (Compiled successfully, 4 라우트, `/api/generate`는 edge dynamic) |

## 4. jsdom 처리 방식 (한 줄)

**헬퍼 분리 + 컴포넌트 테스트에서 `vi.mock` 패턴.** `processImage`를 `uploadProcessor.ts`에 순수 함수로 분리해 `validateFile`만 단위 테스트하고, `UploadPanel.test.tsx`는 `vi.mock("@/components/uploadProcessor")`로 `processImage`를 stub해서 jsdom의 `HTMLCanvasElement.toDataURL` / `Image.onload` 한계를 우회. `<input type="file">`은 `Object.defineProperty(input, "files", …)` + `fireEvent.change`로 시뮬레이션(RTL 표준 워크어라운드).

## 5. 알려진 한계

1. **`processImage` 자체는 단위 테스트되지 않음** — jsdom canvas/Image 한계로 실제 픽셀 인코딩 검증은 E2E(Playwright MCP, Phase 4)로 미룸. `validateFile`/`computeDownscaledSize`는 순수 함수라 단위 테스트로 커버.
2. **모바일 카메라 직접 캡처 미지원** — `<input>`에 `capture` 속성 미지정. MVP 범위 밖. 추가 시 카메라/갤러리 선택 UX가 운영체제별로 달라 별도 검증 필요.
3. **HEIC/HEIF 미지원** — iOS 기본 포맷. PRD 명시 3종(JPG/PNG/WEBP)만 허용. 사용자가 HEIC를 올리면 명확한 에러 메시지 노출.
4. **클립보드 붙여넣기 미지원** — MVP 범위 밖. 추후 `paste` 이벤트 핸들러 추가 가능.
5. **재인코딩 손실** — 모든 입력이 webp q=0.9로 재인코딩되므로 원본 jpg/png에 비해 미세한 품질 손실 + EXIF/메타데이터 완전 제거(보안상 의도된 동작).
6. **`accept` 속성은 hint일 뿐** — 일부 OS 다이얼로그가 다른 형식도 허용함. 따라서 `validateFile`이 진실의 원천. (테스트로 검증됨)

## 6. R2 / R3에서 사용할 import 경로

```ts
// 컴포넌트
import { UploadPanel } from "@/components/UploadPanel";
import type { UploadPanelProps } from "@/components/UploadPanel";

// 헬퍼 (page.tsx에서 직접 쓸 일은 거의 없지만, 타입 재사용 가능)
import type { ImageMeta, ProcessedImage } from "@/components/uploadProcessor";
import { ERROR_MESSAGES } from "@/components/uploadProcessor";
```

### 사용 예시 (R3 page.tsx 통합용 스니펫)

```tsx
const [image, setImage] = useState<{ dataUrl: string; meta: ImageMeta } | null>(null);
const [uploadError, setUploadError] = useState<string | null>(null);

<UploadPanel
  onImageReady={(dataUrl, meta) => {
    setImage({ dataUrl, meta });
    setUploadError(null);
  }}
  onError={setUploadError}
  // maxSizeBytes는 RC max_upload_size_mb로 오버라이드 가능
  // maxSizeBytes={config.max_upload_size_mb * 1024 * 1024}
/>
```

### Props 인터페이스 (확정)

```ts
type UploadPanelProps = {
  onImageReady: (dataUrl: string, meta: {
    width: number; height: number; sizeBytes: number; type: string;
  }) => void;
  onError?: (message: string) => void;
  maxSizeBytes?: number; // 기본 10 * 1024 * 1024
  className?: string;
};
```

## 7. backend R1과의 비충돌 확인

- `src/config/**`, `src/lib/**`, `src/app/api/**` — 만지지 않음.
- `replicate`, `REPLICATE_API_TOKEN`, `NEXT_PUBLIC_REPLICATE_*` — 어떤 형태로도 import/참조하지 않음.
- `.env.local` — 만지지 않음.
- 풀 테스트 실행 시 backend가 만든 `styles.test.ts` (13), `stylePrompts.test.ts` (8), `replicate.test.ts` (8) 모두 정상 통과 → backend R1 산출물과 정합.

## 8. 후속 라운드 권고 사항 (참고)

- **R2 (`CategoryTabs`, `StylePicker`, `GenerationCard`, `ThemeToggle`, `MaintenanceBanner`)**: `StylePicker`는 backend가 만든 `@/config/styles`의 `STYLES`/`CATEGORIES`를 사용하고 RC의 `enabled_styles`로 필터. `GenerationCard`는 `GenerationItem`(R3에서 정의 예정) 상태별 분기 렌더.
- **R3 (`page.tsx` + `ResultGallery`)**: `useReducer`로 `GenerationItem[]` 관리, `Promise.allSettled(styleIds.map(id => fetch('/api/generate', …)))`로 병렬 호출. UploadPanel은 이미 안정됨 — props만 wire-up.
- **Phase 4 E2E**: `processImage`의 실제 canvas 재인코딩은 Playwright 실제 브라우저에서 한 번 smoke 검증 권고(특히 큰 이미지 다운스케일 동작).

## 9. 변경 이력

| 일시 | 변경자 | 변경 내용 |
|------|--------|----------|
| 2026-05-12 | frontend (Phase 3 R1) | 최초 작성. `UploadPanel` + `uploadProcessor` TDD 구현 완료. 25 테스트 작성·통과, 풀 파이프라인 4/4 PASS. label-input 네이티브 바인딩 사용(triple-click 회피, advisor 권고). |
