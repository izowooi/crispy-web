# SnapMany

한 장의 사진으로 7개 카테고리 15개 스타일을 한 번에.

## 개요

- 사진 한 장을 업로드하면 **7 카테고리 × 약 15 스타일**로 동시에 변환한다.
- 이미지 생성은 Replicate의 `openai/gpt-image-2`를 사용한다.
- **MVP**다. 결제, 계정, DB가 없다.
- **사용자 사진은 저장하지 않는다.** 업로드된 이미지는 Replicate API 호출에만 사용되며, 어떤 데이터베이스에도 기록되지 않는다 (PRD 원칙).

## 기능 (MVP)

- 이미지 업로드 (드래그앤드롭 + 클릭 양쪽, 클라이언트 canvas 재인코딩으로 EXIF 자동 제거)
- 7 카테고리에서 다중 스타일 선택
- `Promise.allSettled` 기반 병렬 생성 — 실패한 스타일만 격리되어 카드별로 표시
- 결과 카드별 다운로드 / 클립보드 복사 / 다시 생성
- 다크모드 + 모바일 반응형 (sticky 생성 버튼 포함)
- Firebase Remote Config로 유지보수 모드, 활성 스타일, UI 카피를 코드 변경 없이 토글

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | **Next.js 15.5.2** (15 → 16으로 올리지 않은 이유: `@cloudflare/next-on-pages@1.13.16`의 peer dependency 상한이 `next@<=15.5.2`이며, 모노레포의 ductcanvas/mojipop도 동일 핀에서 안정 빌드 확인됨) |
| 런타임 | React 19.2.4 |
| 언어 | TypeScript 5 (strict) |
| 스타일 | Tailwind CSS v4 (`@import "tailwindcss";` + `@theme inline`) |
| 이미지 생성 | Replicate SDK 1.4 (`openai/gpt-image-2`, 1 요청 = 1 스타일) |
| Remote Config | Firebase 11 (클라이언트 SDK만, `firebase-admin` 미사용) |
| 배포 타깃 | Cloudflare Pages (`@cloudflare/next-on-pages`, edge runtime) |
| 단위 테스트 | Vitest 2 + React Testing Library + jsdom |
| E2E | Playwright MCP (mock fetch flow) |

## 개발

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 세팅
cp .env.example .env.local
# .env.local에 다음 값을 채워 넣는다:
#   REPLICATE_API_TOKEN          (Replicate 대시보드에서 발급: https://replicate.com/account/api-tokens)
#   NEXT_PUBLIC_FIREBASE_API_KEY (Firebase Console → 프로젝트 설정 → 일반 → SDK 설정 및 구성)
#   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
#   NEXT_PUBLIC_FIREBASE_PROJECT_ID
#   NEXT_PUBLIC_FIREBASE_APP_ID

# 3. 개발 서버
npm run dev
# → http://localhost:3000

# 4. 테스트 / 빌드 (커밋 전 풀 파이프라인)
npm run typecheck
npm run lint
npm run test
npm run build
npm run pages:build
```

## 배포 (Cloudflare Pages — 수동 대시보드 업로드)

본 MVP는 GitHub Actions / `wrangler pages deploy` 같은 자동 배포 파이프라인을 사용하지 않는다 (architect 결정 D3). 변경마다 아래 절차를 반복한다.

### 1) 빌드

```bash
npm run pages:build
```

성공 시 `.vercel/output/static/`이 생성된다. 이 폴더 전체가 업로드 대상이다.

### 2) Cloudflare Pages 콘솔 업로드

1. https://dash.cloudflare.com/ → **Workers & Pages** → **Create application** → **Pages** 탭 → **Upload assets** 선택.
2. **Project name**: `snapmany` (이름 충돌 시 `snap-many`로 폴백).
3. `.vercel/output/static/` 디렉터리 전체를 드래그앤드롭 (또는 폴더를 zip으로 압축 후 업로드).
4. **Deploy site** 클릭.

### 3) 환경변수 주입

대시보드의 프로젝트 **Settings → Environment variables**에서 Production + Preview 두 환경 **모두**에 아래 값을 추가한다:

| 키 | 값 출처 | 비고 |
|----|---------|------|
| `REPLICATE_API_TOKEN` | https://replicate.com/account/api-tokens | **서버 전용** — `NEXT_PUBLIC_*` 접두어 절대 금지 |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → 프로젝트 설정 → SDK 설정 | |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | 동일 | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | 동일 | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | 동일 | |
| `NEXT_PUBLIC_APP_ENV` | `production` (선택) | 클라이언트 환경 분기용 |

### 4) Redeploy

환경변수를 주입한 후 **Deployments → 최신 배포 → Retry deployment**로 다시 배포한다 (환경변수는 빌드 시점에 inline 되지 않고 런타임에 주입되지만, Edge Function이 새 환경을 픽업하려면 redeploy 1회 권장).

### 5) (선택) Custom Domain

**Custom domains → Set up a custom domain**에서 도메인 연결.

### 자동화하지 않는 이유

자동 배포(`wrangler pages deploy`, GitHub Actions)는 MVP 범위에서 제외했다. `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN`은 본 프로젝트에서 사용하지 않는다.

## 환경변수

| 키 | 필수 | 노출 범위 | 발급처 |
|----|------|----------|--------|
| `REPLICATE_API_TOKEN` | 예 | **서버 전용** | https://replicate.com/account/api-tokens |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | 예 | 클라이언트 | Firebase Console → `crispy-web` → 프로젝트 설정 → 일반 → SDK 설정 |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | 예 | 클라이언트 | 동일 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | 예 | 클라이언트 | 동일 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | 예 | 클라이언트 | 동일 |
| `NEXT_PUBLIC_APP_ENV` | 아니오 | 클라이언트 | (수동 지정) `development` / `production` |

`.env.local`은 `.gitignore`로 보호된다. 절대 커밋하지 않는다.

## 보안 원칙

- Replicate 토큰은 서버에서만 읽는다. 코드 grep 가드:
  - `NEXT_PUBLIC_REPLICATE_*` 어떤 변형도 금지.
  - `'use client'` 파일에서 `import Replicate` 금지.
  - `process.env.REPLICATE_API_TOKEN`은 `src/app/api/**` + `src/lib/replicate.ts`에서만 등장해야 한다.
- 클라이언트는 `/api/generate` 프록시만 호출한다. Replicate API를 브라우저에서 직접 부르지 않는다.
- 서버에서 다음을 **재검증**한다:
  - 파일 타입 (jpg / png / webp)
  - 파일 크기 (≤ 10MB, RC `max_upload_size_mb`로 조정 가능)
  - `styleId`는 서버 화이트리스트(`STYLES`)에만 일치해야 한다.
- 사용자 사진은 어떤 데이터베이스에도 저장하지 않는다. Replicate API 통신용으로만 사용된다.

## 디렉터리 구조 (간략)

```
snapmany/
├── src/
│   ├── app/
│   │   ├── api/generate/route.ts    # 얇은 Replicate 프록시 (edge runtime, 1 요청 = 1 스타일)
│   │   ├── layout.tsx               # 다크모드 초기화 + metadata
│   │   ├── page.tsx                 # 메인 페이지 (업로드 + 스타일 선택 + 갤러리)
│   │   └── globals.css              # Tailwind v4 + 오렌지 액센트 토큰
│   ├── components/                  # UploadPanel, CategoryTabs, StylePicker,
│   │                                # GenerationCard, ResultGallery,
│   │                                # ThemeToggle, MaintenanceBanner
│   ├── config/
│   │   └── styles.ts                # 클라이언트 노출용 메타데이터 (id, label, category, description, aspectRatio)
│   ├── lib/
│   │   ├── replicate.ts             # Replicate 래퍼 (server-only)
│   │   ├── stylePrompts.ts          # gpt-image-2 prompt 사전 (server-only)
│   │   ├── remoteConfig.ts          # Firebase RC 래퍼 + DEFAULT_CONFIG fallback
│   │   └── firebase.ts              # Firebase app 초기화 (client SDK only)
│   └── __tests__/                   # Vitest 단위 테스트 (116 tests)
├── _workspace/                      # 하네스 산출물 (Phase별 결정·QA 증거 — 감사 추적용)
├── docs/
│   ├── prd.md                       # 제품 요구사항
│   └── llms-gpt-image2.txt          # 모델 레퍼런스
├── .claude/                         # 하네스 (agents + skills)
└── README.md                        # 본 문서
```

## 라이선스 / 기여

본 프로젝트는 사용자(craft.wmp@gmail.com)의 모노레포 `crispy-web`의 일부다. 라이선스는 별도 지정되지 않은 private 상태이며, 외부 기여는 받지 않는다. 변경은 사용자 본인이 하네스 에이전트(architect / frontend / backend / qa)를 통해 수행한다.
