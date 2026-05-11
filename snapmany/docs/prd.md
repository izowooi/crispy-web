이 앱은 Next.js 웹앱으로 만든다.
단, Replicate API Token은 브라우저에 노출하면 안 되므로 Cloudflare Worker 또는 Next.js Route Handler를 “얇은 보안 프록시”로만 사용한다.

## 아키텍처

- Next.js App Router
- TypeScript
- Tailwind CSS
- Replicate API
- Cloudflare 배포
- Firebase Remote Config
- 데이터베이스가 필요하다면 supabase db
- 사용자 계정은 현재 없으나 추후 개발
- 사용자의 사진은 저장하지 않습니다. ( 개인정보를 중요하게 여깁니다. 오로지 api 통신에만 쓰입니다. )
- MVP에서는 결제 없음
- 생성 결과는 브라우저 상태에서만 관리
- 필요 시 localStorage/sessionStorage 정도만 사용

## 서버/프록시 원칙

서버 API를 앱의 핵심 구조로 만들지 않는다.
다만 Replicate API 키 보호를 위해 최소한의 endpoint 는 만듭니다.

POST /api/generate

역할:
- 클라이언트에서 받은 이미지와 선택한 styleIds를 검증한다.
- Replicate API Token을 서버 환경변수에서 읽는다.
- 선택된 스타일별로 Replicate prediction을 생성한다.
- 결과 URL 또는 prediction 정보를 클라이언트에 반환한다.

금지:
- DB 저장은 생략합니다.
- jobs 테이블 금지
- 사용자 계정은 현재 생략합니다.
- 복잡한 webhook 구조보다는 되도록 단순하게 관리합니다.

## 상태 관리

생성 상태는 클라이언트에서 관리한다.

예:
type GenerationItem = {
  id: string;
  styleId: string;
  status: "idle" | "uploading" | "generating" | "completed" | "failed";
  imageUrl?: string;
  error?: string;
};

React state 또는 Zustand를 사용해도 된다.

## 이미지 처리

이미지를 영구 저장하지 않는다.

가능한 방식:
1. 브라우저에서 이미지를 base64 또는 File로 받는다.
2. /api/generate로 전달한다.
3. 프록시가 Replicate에 전달한다.
4. 결과 URL을 프론트에 반환한다.
5. 사용자는 결과 이미지를 즉시 다운로드한다.

주의:
- 파일 크기 제한: 기본 10MB
- jpg/png/webp만 허용
- 클라이언트에서 미리보기 제공
- EXIF 제거는 가능하면 브라우저에서 canvas 재인코딩으로 처리
- 생성 결과는 새로고침하면 사라져도 괜찮다.

## 환경변수
필요한 토큰이나 엑세스 정보는 모두 알아서 발급하세요.
만일 mcp 로도 발급이 불가능하다면 거기서 작업은 일시 정지 하고, 제게 어디서 발급 받을 수 있는 지 알려주세요.
제가 발급하면 그 때 이어서 진행합니다.

필수:
REPLICATE_API_TOKEN=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

선택 (자동 배포 시에만 사용. 본 MVP는 Cloudflare 대시보드 수동 업로드이므로 불필요):
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

> **사유 (D3 결정, 사용자 승인):** 배포는 사용자가 Cloudflare 대시보드에서 `.vercel/output/static`을 직접 업로드하고 환경변수를 주입하는 방식으로 진행한다. `wrangler login`을 사용한 자동 `npm run deploy`는 사용하지 않으므로 `CLOUDFLARE_*` 환경변수는 본 MVP에서 발급·주입할 필요가 없다. v1.1 이후 자동 배포를 도입하면 그 때 필수로 승격한다.

선택 (운영/관측):
NEXT_PUBLIC_APP_ENV=
SENTRY_DSN=

## Firebase Remote Config 사용

Remote Config는 서버 상태 저장용이 아니다.
다음 설정값을 원격으로 바꾸는 용도로만 사용한다.

- enabled_styles
- default_style_count
- max_upload_size_mb
- maintenance_mode
- replicate_model_by_style
- show_beta_styles
- ui_copy
- style_order

Remote Config fetch 실패 시 기본 local config로 동작해야 한다.

## 스타일 프리셋

스타일 프리셋은 config로 분리한다. **클라이언트 노출 메타데이터**(id/label/category/description/thumb)와 **서버 전용 prompt**를 분리한다.

```ts
// src/config/styles.ts (클라이언트 노출 가능)
export type StyleMeta = {
  id: string;
  label: string;
  category: StyleCategoryId;
  description: string;
  thumb?: string;
};

// src/lib/stylePrompts.ts (서버 전용, 절대 클라이언트 번들 금지)
export type StylePrompt = {
  id: string;
  prompt: string;
  negativePrompt?: string;
  model?: string;          // 기본은 openai/gpt-image-2
  aspectRatio?: '1:1' | '3:2' | '2:3';
};
```

## 스타일 트리 (D2 결정: 7 카테고리 × ~2-3개 = 15개)

v1.0 MVP에서 노출하는 스타일은 아래 15개로 잠근다. 50개 풀 비전은 v1.1에서 RC `show_beta_styles` 토글로 확장한다.

| 카테고리 ID | 카테고리 라벨 | 포함 스타일 ID |
|------------|--------------|---------------|
| `id_photo` | 증명사진 | `id_photo_basic`, `passport`, `business_profile` |
| `illust_paint` | 일러스트·페인팅 | `watercolor`, `oil_painting` |
| `character_figure` | 캐릭터·피규어 | `3d_character`, `chibi_sticker` |
| `anime_manga` | 애니메이션·만화 | `anime_pastel`, `manga_inking` |
| `bw_sculpture` | 흑백·조각 | `bw_studio`, `marble_bust` |
| `glamour_beauty` | 글래머·뷰티 | `kbeauty_glow`, `editorial_glam` |
| `art_experimental` | 예술·실험 | `pixel_8bit`, `lowpoly_geo` |

세부 스타일 (id / label / description) — `prompt`는 서버 전용 `src/lib/stylePrompts.ts`에 분리:

증명사진 (3):
- `id_photo_basic` — 일반 증명사진 — 단정한 정면 구도, 무채색 배경, 자연광 ID 사진.
- `passport` — 여권사진 — 무표정·정면·흰 배경의 표준 여권 규격 사진.
- `business_profile` — 비즈니스 프로필 — 회사 홈페이지/링크드인용 정장 프로필.

일러스트·페인팅 (2):
- `watercolor` — 수채화 일러스트 — 번짐 효과와 부드러운 색감의 손그림 풍.
- `oil_painting` — 유화 — 두꺼운 질감의 클래식 유화 초상화.

캐릭터·피규어 (2):
- `3d_character` — 3D 캐릭터 — 픽사풍 셀룰로이드 셰이딩의 3D 캐릭터.
- `chibi_sticker` — 치비 스티커 — 큰 머리·작은 몸의 귀여운 스티커.

애니메이션·만화 (2):
- `anime_pastel` — 파스텔 애니메이션 — 일본 애니풍 부드러운 파스텔 셀.
- `manga_inking` — 흑백 만화 — 잉크 라인과 스크린톤의 흑백 만화 컷.

흑백·조각 (2):
- `bw_studio` — 흑백 스튜디오 — 고대비 흑백 스튜디오 포트레이트.
- `marble_bust` — 대리석 흉상 — 그리스 조각상 스타일의 대리석 흉상.

글래머·뷰티 (2):
- `kbeauty_glow` — K-뷰티 글로우 — 윤기 있는 피부와 자연스러운 메이크업의 K-뷰티 룩.
- `editorial_glam` — 에디토리얼 글램 — 패션지 표지풍 강한 라이팅의 글래머 컷.

예술·실험 (2):
- `pixel_8bit` — 8비트 픽셀 — 레트로 게임 도트풍 픽셀 아바타.
- `lowpoly_geo` — 로우폴리 — 기하학적 면 분할의 로우폴리 3D.

## MVP vs v2 스코프

v1.0 MVP에 **포함**:
- 단일 이미지 업로드 + 미리보기 (jpg/png/webp, 최대 10MB)
- 7카테고리 탭 + 카테고리별 다중 스타일 선택
- 다중 스타일 동시 생성 (스타일 수 × 1개 = N개의 병렬 `/api/generate` 호출)
- 결과 갤러리(스타일별 카드, 개별 상태: idle/uploading/generating/completed/failed)
- 결과 이미지 다운로드 (group-hover 오버레이 + sticky 모바일 다운로드 버튼)
- **결과 URL 클립보드 복사 버튼**
- **sticky 모바일 생성 버튼** (스크롤해도 화면 하단에 고정)
- 기본 반응형(모바일 1열 / 태블릿 2열 / 데스크탑 3-4열)
- 다크모드 토글 (localStorage + `<html class="dark">`)
- Firebase Remote Config fetch + 8개 키 정의 + local fallback
- 점검 모드 배너 (`maintenance_mode`)
- Vitest 단위 테스트 + Playwright MCP E2E 1개 (mock flow)

v1.1 이후로 **미룸**:
- 검색·필터 UI (15개에서는 불필요)
- 즐겨찾기·핀 고정
- 랜덤 셔플·자동 다양화
- before/after 비교 슬라이더
- 콜라주 다운로드(여러 결과를 한 장 PNG로 합치기)
- 한 스타일만 재생성 버튼
- 50개 풀 스타일 풀 + `show_beta_styles` 토글 노출
- 사용자 계정·이력·결제
- IP 기반 rate limit
- 비용 추적/사용량 대시보드

## 중요한 보안 조건

절대 하지 말 것:
- Replicate API Token을 NEXT_PUBLIC_ 환경변수에 넣지 말 것
- 클라이언트 코드에서 Replicate API를 직접 호출하지 말 것
- 브라우저에 비밀 키를 숨길 수 있다고 가정하지 말 것

반드시 할 것:
- Replicate 호출은 서버/Worker에서만 한다.
- 클라이언트는 /api/generate만 호출한다.
- 입력 파일 타입과 크기를 서버에서도 검증한다.
- rate limit 구조를 고려한다.

## TDD 요구사항

테스트를 먼저 작성하고 구현한다.

필수 테스트:
- 스타일 config validation
- 파일 타입 validation
- 파일 크기 validation
- /api/generate 입력 검증
- Replicate client mock 테스트
- 스타일 10개 생성 요청 테스트
- 실패한 스타일만 UI에서 failed 표시
- 메인 페이지 렌더링
- 이미지 업로드 미리보기
- 생성 버튼 disabled 조건
- Playwright mock flow

명령어:
npm run test
npm run lint
npm run typecheck
npm run build

## 최종 결과물

다음을 구현해라.

1. Next.js 프로젝트 구조
2. Tailwind 기반 UI
3. 사진 업로드 컴포넌트
4. 스타일 선택 컴포넌트
5. 결과 갤러리
6. 얇은 /api/generate 프록시
7. Replicate client wrapper
8. Firebase Remote Config wrapper
9. 테스트 코드
10. README
11. Cloudflare 배포 설명

중요:
이 프로젝트는 DB 없는 MVP다.
만일 DB 가 필요하면 supabase mcp 를 사용합니다. 그리고 접두어는 snap_ 이라고 붙여주세요.
마찬가지로 firebase console 이 필요하다면 crispy-web 프로젝트에 만들어주시고, snap 이라는 루트에 만들어주세요.
해당 프로젝트는 다른 프로젝트도 사용가능한 모노레포 프로젝트입니다.
가급적 단순하게 만듭니다.
필요하다면 ductcanvas 프로젝트를 참고해주세요. 이 프로젝트 또한 동일하게 ducttape replicate 를 이요한 프로젝트입니다.
동일한 키를 사용해도 됩니다.