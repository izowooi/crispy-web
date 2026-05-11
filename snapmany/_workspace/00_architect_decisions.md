# Phase 1 — Architect Decisions (snapmany)

> **단일 진실 소스**. 후속 Phase의 모든 에이전트(frontend / backend / qa)는 작업 시작 전 반드시 이 파일을 읽는다. 결정값과 충돌하는 구현은 거부 대상이다.

생성일: 2026-05-11 (Phase 1)
작성자: architect 서브 에이전트 (model: opus)
사용자 사전 승인 결정값: D1~D4 (변경 금지)

---

## 0. 사용자 승인 결정값 (잠금)

| 코드 | 항목 | 결정 |
|------|------|------|
| D1 | 테스트 프레임워크 | Vitest(단위) + Playwright MCP(E2E) |
| D2 | 스타일 스코프 | 7 카테고리 × ~2-3개 = **15개** (50개 풀 비전은 v1.1) |
| D3 | Cloudflare 배포 | **사용자가 대시보드 수동 업로드**. `wrangler login` / `npm run deploy` 미사용. `CLOUDFLARE_*` env 키는 PRD에서 "선택"으로 강등 완료. |
| D4 | Firebase 환경 발급 | **MCP 자동 발급 성공**. snapmany web app 생성 완료, 4개 키 추출 완료. |

---

## 1. 인프라 점검 결과

### 1.1 Node / npm
- Node: `v22.19.0`
- npm: `10.9.3`
- 결과: Next.js 16 + Tailwind v4 요구사항(>= Node 18.18) 충족.

### 1.2 MCP 가용성
| MCP | 상태 | 비고 |
|-----|------|------|
| `playwright` | ✓ Connected | E2E 가용. Phase 4에서 mock flow 사용 |
| `plugin:firebase:firebase` | ✓ Connected | Phase 1에서 활용 완료 |
| `supabase` | ✓ Connected | MVP에서는 미사용(DB 없음). v1.1+ 옵션. |
| `claude.ai Notion` | needs auth | MVP에 불필요 |
| `claude.ai Google Drive` | needs auth | MVP에 불필요 |

**Playwright MCP는 정상 — 사용자 추가 확인 불필요.** Phase 4 통합 QA에서 즉시 사용 가능.

### 1.3 Firebase MCP 호출 결과 (D4)
1. `firebase_list_projects` → 13개 프로젝트 반환, `crispy-web` (projectId: `crispy-web`, projectNumber: `260542533832`) **존재 확인**.
2. `firebase_update_environment(active_project='crispy-web')` → 성공.
3. `firebase_list_apps(platform='web')` → 기존 web app은 `qrcode` 1개만. snapmany 없음 → 신규 생성 필요.
4. `firebase_create_app(platform='web', display_name='snapmany')` → **성공**.
   - 생성된 appId(마스킹): `1:2605...d2e15fd` (전체 값은 `.env.local` 참조)
5. `firebase_get_sdk_config(app_id=…)` → 성공. 4개 키 + storageBucket/messagingSenderId/measurementId 추출.

**`.env.local`에 박힌 Firebase 키 (값은 마스킹 — 실제 값은 `.env.local` 참조. 복원이 필요하면 Firebase MCP `firebase_get_sdk_config(app_id=…)` 재실행):**
- `NEXT_PUBLIC_FIREBASE_API_KEY` = `AIzaS...gOZw` (39자)
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = `crispy-web.firebaseapp.com` (프로젝트 식별자, 비밀 아님)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `crispy-web` (프로젝트 식별자, 비밀 아님)
- `NEXT_PUBLIC_FIREBASE_APP_ID` = `1:2605...d2e15fd` (37자)

추가 메타데이터(향후 Analytics/Storage 도입 시 사용, 모두 마스킹):
- `storageBucket` = `crispy-web.firebasestorage.app` (프로젝트 식별자, 비밀 아님)
- `messagingSenderId` = `2605...3832` (12자)
- `measurementId` = `G-5PD...VJ3` (12자)

> Firebase web `apiKey`는 클라이언트 노출이 설계상 허용되지만, 본 산출물은 `_workspace/`로 깃에 커밋될 수 있으므로 사용자 지시(평문 노출 금지)에 따라 마스킹한다. 실제 값은 항상 `.env.local`에서 읽는다.

**Remote Config 템플릿 생성**: Phase 1에서는 미수행. RC 키 8개의 default 값은 `src/lib/remoteConfig.ts`의 `DEFAULT_CONFIG`로 관리(local fallback이 진실, RC는 오버레이). Phase 5 또는 사용자가 Firebase Console에서 직접 키를 추가하는 시점에 RC 템플릿이 채워진다.

### 1.4 Replicate 토큰 확보
- 출처: `/Users/izowooi/git/crispy-web/ductcanvas/.env.local`의 `REPLICATE_API_TOKEN`
- 존재 여부: **확인됨**
- 마스킹: `r8_9B...j5Hp` (전체 길이 40자, 본 문서 외부에 평문 노출 금지)
- 복사 대상: snapmany 디렉터리의 `.env.local` (방금 생성됨, `.gitignore`로 차단됨)
- PRD §최종 결과물에 "동일한 키 사용 가능" 명시 — 정당함.

### 1.5 `.gitignore` 사전 작성
Phase 2 architect가 정제할 예정이지만 안전 차원에서 미리 작성:
- `.env`, `.env.*` (단 `.env.example`는 예외)
- `*.key`, `*.pem`, `id_rsa`
- `node_modules/`, `.next/`, `.vercel/`, `.wrangler/`, `dist/`, `out/`
- `tsconfig.tsbuildinfo`
- `*.log`, `firebase-debug.log`
- `.DS_Store`, `Thumbs.db`, `.idea/`, `.vscode/`

---

## 2. Phase 1 산출물 명세 (architect.md 표 채움)

| 항목 | 결정값 |
|------|--------|
| **테스트 프레임워크** | Vitest 1.x (단위) + Playwright MCP (E2E). `vitest.config.ts`는 jsdom env + `setup.ts`. Playwright는 npm 패키지 추가 없이 MCP 도구로 호출. |
| **상태 관리** | React `useState` / `useReducer`만 사용. 갤러리 상태는 `GenerationItem[]` 배열로 `useReducer`. Zustand 도입 금지(MVP 규모 초과). |
| **Replicate 모델 전략** | 단일 모델 `openai/gpt-image-2` + per-style prompt. `StylePrompt.model?`은 확장 포인트로 두되 MVP에서는 모두 비움. |
| **스타일 카테고리 구조** | 7 카테고리 × ~15개. 카테고리 ID: `id_photo` / `illust_paint` / `character_figure` / `anime_manga` / `bw_sculpture` / `glamour_beauty` / `art_experimental`. (PRD §스타일 트리 참조) |
| **스타일 프리셋 분리** | `src/config/styles.ts` (클라이언트, `StyleMeta[]`) + `src/lib/stylePrompts.ts` (서버 전용, `StylePrompt[]`). 분리 이유: 클라이언트 번들에 prompt가 들어가면 카피·abuse 위험. ID 집합은 양쪽이 일치해야 하며 qa가 정합성 검증. |
| **이미지 전송 방식** | 클라이언트에서 canvas 재인코딩(EXIF 제거) → base64 dataURL → JSON `{ image: string, styleId: string }`로 `/api/generate` POST. multipart 사용 X. **1요청 = 1스타일.** |
| **동시 생성 처리** | 클라이언트가 `Promise.allSettled(styleIds.map(id => fetch('/api/generate', { … })))`. 서버는 각각 독립. UI는 `GenerationItem` 배열로 카드별 상태 추적. |
| **환경변수 키 매핑** | `REPLICATE_API_TOKEN`(서버) + `NEXT_PUBLIC_FIREBASE_*` 4개(클라이언트). 모두 `.env.local` 작성 완료. `CLOUDFLARE_*`는 사용 안 함(D3). |
| **Firebase 발급 절차** | 완료. appId `1:260542533832:web:d3254756392c1c0f2e15fd`. |
| **컴포넌트 배치** | `src/components/` 평탄 — `UploadPanel.tsx`, `CategoryTabs.tsx`, `StylePicker.tsx`, `GenerationCard.tsx`, `ResultGallery.tsx`, `ThemeToggle.tsx`, `MaintenanceBanner.tsx`. ductcanvas 컨벤션 + 카테고리 탭 추가. |
| **EXIF 제거 방식** | 클라이언트 `<canvas>` 재인코딩. `UploadPanel`에서 `Image` 로드 → canvas drawImage → `toDataURL('image/webp', 0.9)`로 출력 → 서버 전송. EXIF 자동 소실. |
| **MVP 인터랙션 범위** | 포함: 클립보드 복사 / sticky 모바일 생성 버튼 / 기본 반응형 / 다크모드. 미룸: 검색 / 즐겨찾기 / 셔플 / 비교 슬라이더 / 콜라주 / 한 스타일 재생성. (PRD §MVP vs v2 스코프 참조) |
| **디자인 톤** | 다크모드 (localStorage + `<html class="dark">`) + 오렌지 액센트(`accent: #f97316` 권장) + sticky 헤더(border-b) + 그리드 + group-hover 다운로드 오버레이. ductcanvas의 `ThemeToggle` 패턴 참고. |

---

## 3. 15개 스타일 클라이언트 메타데이터 (`src/config/styles.ts` 초안)

```ts
export type StyleCategoryId =
  | 'id_photo' | 'illust_paint' | 'character_figure'
  | 'anime_manga' | 'bw_sculpture' | 'glamour_beauty' | 'art_experimental';

export type StyleMeta = {
  id: string;
  label: string;
  category: StyleCategoryId;
  description: string;
  aspectRatio?: '1:1' | '3:2' | '2:3';
};

export const CATEGORIES: { id: StyleCategoryId; label: string }[] = [
  { id: 'id_photo',          label: '증명사진' },
  { id: 'illust_paint',      label: '일러스트·페인팅' },
  { id: 'character_figure',  label: '캐릭터·피규어' },
  { id: 'anime_manga',       label: '애니메이션·만화' },
  { id: 'bw_sculpture',      label: '흑백·조각' },
  { id: 'glamour_beauty',    label: '글래머·뷰티' },
  { id: 'art_experimental',  label: '예술·실험' },
];

export const STYLES: StyleMeta[] = [
  // 증명사진 (3)
  { id: 'id_photo_basic',  label: '일반 증명사진',  category: 'id_photo', description: '단정한 정면 구도, 무채색 배경, 자연광 ID 사진.', aspectRatio: '2:3' },
  { id: 'passport',        label: '여권사진',       category: 'id_photo', description: '무표정·정면·흰 배경의 표준 여권 규격 사진.',     aspectRatio: '2:3' },
  { id: 'business_profile',label: '비즈니스 프로필', category: 'id_photo', description: '회사 홈페이지·링크드인용 정장 프로필.',          aspectRatio: '1:1' },
  // 일러스트·페인팅 (2)
  { id: 'watercolor',      label: '수채화 일러스트', category: 'illust_paint', description: '번짐 효과와 부드러운 색감의 손그림 풍.',     aspectRatio: '1:1' },
  { id: 'oil_painting',    label: '유화',           category: 'illust_paint', description: '두꺼운 질감의 클래식 유화 초상화.',          aspectRatio: '2:3' },
  // 캐릭터·피규어 (2)
  { id: '3d_character',    label: '3D 캐릭터',      category: 'character_figure', description: '픽사풍 셀룰로이드 셰이딩의 3D 캐릭터.',  aspectRatio: '1:1' },
  { id: 'chibi_sticker',   label: '치비 스티커',     category: 'character_figure', description: '큰 머리·작은 몸의 귀여운 스티커.',       aspectRatio: '1:1' },
  // 애니메이션·만화 (2)
  { id: 'anime_pastel',    label: '파스텔 애니메이션',category: 'anime_manga', description: '일본 애니풍 부드러운 파스텔 셀.',           aspectRatio: '1:1' },
  { id: 'manga_inking',    label: '흑백 만화',       category: 'anime_manga', description: '잉크 라인과 스크린톤의 흑백 만화 컷.',        aspectRatio: '2:3' },
  // 흑백·조각 (2)
  { id: 'bw_studio',       label: '흑백 스튜디오',    category: 'bw_sculpture', description: '고대비 흑백 스튜디오 포트레이트.',           aspectRatio: '2:3' },
  { id: 'marble_bust',     label: '대리석 흉상',      category: 'bw_sculpture', description: '그리스 조각상 스타일의 대리석 흉상.',         aspectRatio: '2:3' },
  // 글래머·뷰티 (2)
  { id: 'kbeauty_glow',    label: 'K-뷰티 글로우',    category: 'glamour_beauty', description: '윤기 있는 피부와 자연스러운 메이크업의 K-뷰티 룩.', aspectRatio: '1:1' },
  { id: 'editorial_glam',  label: '에디토리얼 글램',  category: 'glamour_beauty', description: '패션지 표지풍 강한 라이팅의 글래머 컷.',     aspectRatio: '2:3' },
  // 예술·실험 (2)
  { id: 'pixel_8bit',      label: '8비트 픽셀',      category: 'art_experimental', description: '레트로 게임 도트풍 픽셀 아바타.',          aspectRatio: '1:1' },
  { id: 'lowpoly_geo',     label: '로우폴리',         category: 'art_experimental', description: '기하학적 면 분할의 로우폴리 3D.',           aspectRatio: '1:1' },
];

export const STYLE_IDS = STYLES.map(s => s.id);
```

---

## 4. 15개 prompt 시드 (`src/lib/stylePrompts.ts` 초안 — 서버 전용)

gpt-image-2가 `input_images`로 들어온 사진의 **인물 정체성(얼굴, 표정, 헤어, 의상 식별 가능성)과 기본 구도를 보존**하면서 스타일만 변환하도록 명시형으로 작성. 모든 prompt는 끝에 공통 가드 문장을 추가하는 패턴으로 조립한다(`replicate-proxy` 스킬의 `buildPrompt()` 참조).

```ts
export type StylePrompt = {
  id: string;
  prompt: string;
  negativePrompt?: string;
  model?: string;
  aspectRatio?: '1:1' | '3:2' | '2:3';
};

const IDENTITY_GUARD =
  ' Preserve the subject\'s facial identity, hairstyle, skin tone, and overall composition. Do not change the person.';

export const STYLE_PROMPTS: Record<string, StylePrompt> = {
  id_photo_basic: {
    id: 'id_photo_basic',
    prompt:
      'Convert this photo into a clean, formal Korean-style ID photograph. Frontal pose, neutral facial expression, plain light-gray background, soft even studio lighting, natural skin tones, head and shoulders framing.' + IDENTITY_GUARD,
    aspectRatio: '2:3',
  },
  passport: {
    id: 'passport',
    prompt:
      'Convert this photo into a standard passport photograph. Strict frontal view, neutral expression with closed mouth, eyes looking directly at camera, plain white background, flat even lighting with no shadows, formal attire.' + IDENTITY_GUARD,
    aspectRatio: '2:3',
  },
  business_profile: {
    id: 'business_profile',
    prompt:
      'Convert this photo into a polished business profile portrait suitable for LinkedIn and corporate websites. Subject wears a dark business suit, slight three-quarter angle, confident gentle smile, soft directional studio lighting, blurred neutral office background.' + IDENTITY_GUARD,
    aspectRatio: '1:1',
  },
  watercolor: {
    id: 'watercolor',
    prompt:
      'Convert this photo into a delicate watercolor illustration. Soft pigment bleeds, visible paper texture, gentle pastel palette, loose outlines, hand-painted brush strokes, light wash background.' + IDENTITY_GUARD,
    aspectRatio: '1:1',
  },
  oil_painting: {
    id: 'oil_painting',
    prompt:
      'Convert this photo into a classical oil painting portrait. Thick impasto brushwork, rich warm color palette, chiaroscuro lighting reminiscent of Rembrandt, textured canvas background, museum-quality finish.' + IDENTITY_GUARD,
    aspectRatio: '2:3',
  },
  '3d_character': {
    id: '3d_character',
    prompt:
      'Convert this photo into a stylized 3D character in the style of a Pixar animated film. Soft subsurface-scattering skin, large expressive eyes, polished cel-shaded materials, cinematic key light with warm rim light, slightly cartoon-proportioned but recognizable.' + IDENTITY_GUARD,
    aspectRatio: '1:1',
  },
  chibi_sticker: {
    id: 'chibi_sticker',
    prompt:
      'Convert this photo into a cute chibi sticker. Oversized head, tiny body, bold black outlines, flat vibrant colors, simple round eyes, glossy sticker finish on a transparent or solid pastel background, die-cut style.' + IDENTITY_GUARD,
    aspectRatio: '1:1',
  },
  anime_pastel: {
    id: 'anime_pastel',
    prompt:
      'Convert this photo into a Japanese anime illustration with soft pastel cel-shading. Crisp line art, expressive eyes with highlights, gentle pastel color palette, light bokeh background, modern slice-of-life anime style.' + IDENTITY_GUARD,
    aspectRatio: '1:1',
  },
  manga_inking: {
    id: 'manga_inking',
    prompt:
      'Convert this photo into a black-and-white Japanese manga panel. Sharp ink linework, screentone shading and crosshatching, dramatic high-contrast composition, motion or speed lines in the background, no color.' + IDENTITY_GUARD,
    aspectRatio: '2:3',
  },
  bw_studio: {
    id: 'bw_studio',
    prompt:
      'Convert this photo into a high-contrast black-and-white studio portrait. Dramatic Rembrandt lighting, deep blacks and bright highlights, fine grain, plain dark background, professional fashion-photography aesthetic.' + IDENTITY_GUARD,
    aspectRatio: '2:3',
  },
  marble_bust: {
    id: 'marble_bust',
    prompt:
      'Convert this photo into a classical Greco-Roman marble bust sculpture. Carved white Carrara marble, smooth polished surface, subtle veining, museum gallery lighting, gray stone pedestal, monochrome rendering with realistic stone material.' + IDENTITY_GUARD,
    aspectRatio: '2:3',
  },
  kbeauty_glow: {
    id: 'kbeauty_glow',
    prompt:
      'Convert this photo into a luminous K-beauty portrait. Glass-skin glow with healthy dewy finish, soft pink and peach makeup, natural feathered brows, glossy lips, soft diffused beauty lighting, clean minimal background.' + IDENTITY_GUARD,
    aspectRatio: '1:1',
  },
  editorial_glam: {
    id: 'editorial_glam',
    prompt:
      'Convert this photo into a high-fashion editorial cover portrait. Bold dramatic lighting with hard rim light, glossy magazine retouching, striking makeup, fashion-forward styling, clean studio backdrop in a bold accent color.' + IDENTITY_GUARD,
    aspectRatio: '2:3',
  },
  pixel_8bit: {
    id: 'pixel_8bit',
    prompt:
      'Convert this photo into a retro 8-bit pixel-art portrait. Limited 32-color palette, blocky chunky pixels, dithered shading, clear silhouette readable at small size, plain single-color background in the style of late-80s console RPGs.' + IDENTITY_GUARD,
    aspectRatio: '1:1',
  },
  lowpoly_geo: {
    id: 'lowpoly_geo',
    prompt:
      'Convert this photo into a low-poly 3D portrait. Faceted triangular geometry, flat-shaded planes, vibrant gradient color palette, gentle studio lighting, plain gradient background, modern geometric design poster style.' + IDENTITY_GUARD,
    aspectRatio: '1:1',
  },
};
```

> **운영 노트:** prompt 튜닝은 Phase 3 backend가 R1에서 1차 작성하고, Phase 5 직전 사용자 1회 샘플 생성으로 보정한다. prompt 변경은 RC가 아니라 코드 PR로만 — RC는 *toggle/order*만 담당.

---

## 5. Firebase Remote Config 8개 키 default 명세

`src/lib/remoteConfig.ts`의 `DEFAULT_CONFIG`. 15개 스타일과 정합.

| 키 | 타입 | 기본값 |
|----|------|--------|
| `enabled_styles` | `string[]` | 15개 스타일 ID 전체 |
| `default_style_count` | `number` | `3` |
| `max_upload_size_mb` | `number` | `10` |
| `maintenance_mode` | `boolean` | `false` |
| `replicate_model_by_style` | `Record<string,string>` | `{}` |
| `show_beta_styles` | `boolean` | `false` |
| `ui_copy` | `Record<string,string>` | `{ title: 'SnapMany', subtitle: '한 장의 사진으로 여러 스타일을', generateButton: '생성하기', uploadHint: 'JPG·PNG·WEBP, 최대 10MB' }` |
| `style_order` | `string[]` | `STYLE_IDS`와 동일 순서 (PRD §스타일 트리 순서) |

기본값 정의 위치:
```ts
export const DEFAULT_CONFIG: AppConfig = {
  enabled_styles: ['id_photo_basic','passport','business_profile','watercolor','oil_painting',
                   '3d_character','chibi_sticker','anime_pastel','manga_inking','bw_studio',
                   'marble_bust','kbeauty_glow','editorial_glam','pixel_8bit','lowpoly_geo'],
  default_style_count: 3,
  max_upload_size_mb: 10,
  maintenance_mode: false,
  replicate_model_by_style: {},
  show_beta_styles: false,
  ui_copy: {
    title: 'SnapMany',
    subtitle: '한 장의 사진으로 여러 스타일을',
    generateButton: '생성하기',
    uploadHint: 'JPG·PNG·WEBP, 최대 10MB',
  },
  style_order: ['id_photo_basic','passport','business_profile','watercolor','oil_painting',
                '3d_character','chibi_sticker','anime_pastel','manga_inking','bw_studio',
                'marble_bust','kbeauty_glow','editorial_glam','pixel_8bit','lowpoly_geo'],
};
```

QA 검증: `STYLE_IDS` ↔ `DEFAULT_CONFIG.enabled_styles` ↔ `DEFAULT_CONFIG.style_order`의 ID 집합이 완전 일치해야 함.

---

## 6. API 계약 (Phase 3-A에서 architect가 다시 잠금. 여기서 미리 명시)

```ts
// POST /api/generate
// Request body
type GenerateRequest = {
  image: string;    // data:image/(jpeg|png|webp);base64,...
  styleId: string;  // STYLE_IDS에 포함된 값
};

// Response (200 ok)
type GenerateResponseOk  = { ok: true;  styleId: string; imageUrl: string };
// Response (4xx/5xx)
type GenerateResponseErr = { ok: false; styleId: string; error: string };
```

- 1요청 = 1스타일. 클라이언트가 N개 스타일을 선택하면 N개의 병렬 fetch.
- `runtime = 'edge'` 필수.
- 검증 순서는 `replicate-proxy` 스킬 §"서버측 입력 검증" 4단계 그대로.

---

## 7. 테스트 실행 규칙 (qa 강제)

### 7.1 단위 테스트(Vitest)
- 위치: `src/__tests__/**/*.test.ts(x)`
- 환경: `jsdom`
- **Replicate 실호출 금지.** 모든 단위 테스트는 `replicate` 모듈을 mock한다. mock helper는 `src/__tests__/helpers/mockReplicate.ts`로 분리.
- **금지 grep**(qa가 매번 실행):
  ```bash
  # 단위 테스트가 실제 토큰을 참조하면 즉시 실패 처리
  grep -rn "process.env.REPLICATE_API_TOKEN" src/__tests__ && echo "FAIL: tests must not read REPLICATE_API_TOKEN"
  # 클라이언트 코드에 Replicate import 금지
  grep -rn "from 'replicate'" src/components src/app/page.tsx src/app/layout.tsx 2>/dev/null && echo "FAIL: replicate import outside server"
  # NEXT_PUBLIC_REPLICATE_* 어떤 변형도 금지
  grep -rn "NEXT_PUBLIC_REPLICATE" src/ && echo "FAIL: replicate must not be exposed to client"
  ```

### 7.2 E2E (Playwright MCP)
- Phase 4 통합 QA에서 mock flow 1개:
  - 이미지 업로드 → 스타일 3개 선택 → 생성 클릭 → 결과 카드 3개 렌더 (mock으로 imageUrl 주입)
  - 실패 케이스 1개: 한 스타일이 4xx 응답 → 해당 카드만 failed UI

### 7.3 Replicate 실호출 정책
- Phase 5 architect 빌드 게이트에서 **smoke 1회만** 직접 호출 가능 (사용자 확인 절차 거쳐). MVP CI/CD에는 실호출 없음.
- 비용 가드: 1 smoke = 1 스타일 = ~$0.05.

### 7.4 풀 파이프라인 게이트 (커밋 직전마다)
```bash
npm run typecheck && npm run lint && npm run test && npm run build && npm run pages:build
```
하나라도 실패 시 커밋 차단.

---

## 8. 보안 규칙 (양보 불가)

PRD §중요한 보안 조건과 `replicate-proxy` 스킬을 그대로 채택:

- `process.env.REPLICATE_API_TOKEN`은 `src/app/api/**`와 `src/lib/replicate.ts`에서만 읽는다.
- `'use client'` 파일 어디에서도 `import Replicate` 금지.
- `NEXT_PUBLIC_REPLICATE_*` 어떤 변형도 금지.
- 디버그 로그에 토큰 echo 금지.
- 입력 파일은 클라이언트 검증 후 **서버에서 재검증** (타입 / 크기 / styleId 허용 목록).

---

## 9. 컴포넌트 / 모듈 트리 (Phase 2 architect 스캐폴딩 청사진)

```
snapmany/
├── .env.local                    # 작성 완료 (gitignored)
├── .env.example                  # Phase 2에서 architect가 생성
├── .gitignore                    # 작성 완료
├── README.md                     # Phase 2/Phase 5에서 채움
├── package.json                  # Phase 2
├── tsconfig.json                 # Phase 2
├── next.config.ts                # Phase 2 (images.remotePatterns: replicate.delivery)
├── postcss.config.mjs            # Phase 2
├── eslint.config.mjs             # Phase 2
├── wrangler.jsonc                # Phase 2 (name: snapmany)
├── vitest.config.ts              # Phase 2
├── docs/
│   ├── prd.md                    # 보강 완료
│   └── llms-gpt-image2.txt
├── _workspace/                   # 감사 추적
│   ├── 00_architect_decisions.md # 본 파일
│   ├── 02_architect_scaffold.md  # Phase 2
│   ├── 02_qa_gate.md             # Phase 2
│   ├── 03_api_contract.md        # Phase 3-A
│   ├── 03_R{1,2,3}_{frontend,backend,qa}_*.md
│   ├── 04_qa_integration.md      # Phase 4
│   └── 05_{architect_deploy,qa_final}.md
└── src/
    ├── app/
    │   ├── layout.tsx            # Phase 2 (뼈대만)
    │   ├── page.tsx              # Phase 3 R3 frontend
    │   ├── globals.css           # Phase 2 (첫 줄 @import "tailwindcss";)
    │   └── api/
    │       └── generate/
    │           └── route.ts      # Phase 2 스텁 → Phase 3 R2 backend
    ├── components/               # Phase 3 frontend
    │   ├── UploadPanel.tsx       # R1
    │   ├── CategoryTabs.tsx      # R2
    │   ├── StylePicker.tsx       # R2
    │   ├── GenerationCard.tsx    # R2
    │   ├── ResultGallery.tsx     # R3
    │   ├── ThemeToggle.tsx       # R2 (ductcanvas 패턴)
    │   └── MaintenanceBanner.tsx # R2
    ├── config/
    │   └── styles.ts             # Phase 3 R1 backend (클라이언트 노출)
    ├── lib/                      # 서버 전용
    │   ├── replicate.ts          # Phase 3 R1 backend
    │   ├── stylePrompts.ts       # Phase 3 R1 backend (server-only)
    │   └── remoteConfig.ts       # Phase 3 R2 backend (client에서도 사용 가능, fetch 실패 시 fallback)
    └── __tests__/
        ├── helpers/
        │   └── mockReplicate.ts
        ├── config.styles.test.ts
        ├── lib.replicate.test.ts
        ├── api.generate.test.ts
        ├── lib.remoteConfig.test.ts
        └── components.*.test.tsx
```

---

## 10. Phase 2 스캐폴딩 입력 (다음 Phase가 따를 명세)

- `package.json` 의존성 (참조: ductcanvas, 단 버전 최신화):
  - dependencies: `next@^16`, `react@^19`, `react-dom@^19`, `replicate@^1.4.0`, `firebase@^10` (또는 `^11`)
  - devDependencies: `@cloudflare/next-on-pages@^1`, `@tailwindcss/postcss@^4`, `tailwindcss@^4`, `typescript@^5`, `@types/node@^22`, `@types/react@^19`, `@types/react-dom@^19`, `eslint@^9`, `eslint-config-next@^16`, `vitest@^1`, `@vitejs/plugin-react@^4`, `jsdom`, `@testing-library/react@^16`, `@testing-library/jest-dom@^6`
- `scripts`: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `pages:build`, `preview`. **`deploy` 스크립트는 작성하되 README에서 "MVP에서는 사용하지 않음(D3)"으로 표기.**
- `wrangler.jsonc`: `{ name: "snapmany", compatibility_date: "2025-04-01", compatibility_flags: ["nodejs_compat"], pages_build_output_dir: ".vercel/output/static" }`
- `next.config.ts`: `images.remotePatterns: [{ protocol: 'https', hostname: 'replicate.delivery' }]`
- `src/app/globals.css`: 첫 줄 `@import "tailwindcss";` (구 `@tailwind` 디렉티브 금지)
- `src/app/api/generate/route.ts`: `export const runtime = 'edge';` + 405 스텁(Phase 3에서 채움)

---

## 11. 사용자 확인 필요 항목

**현재 시점 차단 항목: 없음. Phase 2 즉시 진입 가능.**

(참고용 정보 전달):
- Firebase Console에서 Remote Config 키 8개를 사용자가 직접 입력하는 것은 **선택사항**. MVP는 local `DEFAULT_CONFIG`로도 정상 동작한다. RC 콘솔 작업이 필요해지면 Phase 5 직전 또는 운영 단계에서 사용자에게 별도 가이드 제공.
- Replicate 토큰은 ductcanvas와 동일한 키를 공유한다. 별도 키 분리가 필요하면 사용자에게 알려달라(현재는 PRD §최종 결과물에 "동일한 키 사용 가능" 명시되어 있어 그대로 진행).
- Cloudflare Pages 프로젝트 이름 충돌 시 `snap-many`로 폴백. (Phase 5에서 architect가 README에 명시.)

---

## 12. 변경 이력

| 일시 | 변경자 | 변경 내용 |
|------|--------|----------|
| 2026-05-11 | architect (Phase 1) | 최초 작성. D1~D4 적용. Firebase MCP로 snapmany app 생성 + SDK 키 추출. Replicate 토큰 ductcanvas에서 복사. `.env.local`/`.gitignore` 생성. PRD §스타일 트리 / §MVP vs v2 스코프 / §환경변수 보강. |
