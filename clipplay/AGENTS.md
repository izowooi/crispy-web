# AGENTS.md — clipplay (Layer 3)

이 문서는 `clipplay` 프로젝트에 적용되는 Layer 3 작업 지침이다.
상위 Layer 2 지침은 `../AGENTS.md`를 따른다.

## 프로젝트 개요

ClipPlay는 가족용 비공개 세로형 동영상 스트리밍 앱이다. Next.js 16 기반 TikTok 형태의 UI를 제공하고, 동영상은 Cloudflare R2에 저장하며 Google OAuth 이메일 allowlist로 관리자 접근을 제한한다.

## 실행과 검증

```bash
npm run dev
npm run lint
npm run test
npm run build
```

추가 테스트 명령은 다음과 같다.

```bash
npm run test:ui
npm run test:coverage
```

## 아키텍처

```text
React 19 + Tailwind CSS 4 client
  → Next.js 16 App Router + middleware
  → Cloudflare Pages Edge Runtime
  → Cloudflare R2
  → Google OAuth 2.0 + 7일 HttpOnly JWT session
```

## 주요 경로

- `src/app/`: App Router 페이지와 API route.
- `src/app/api/auth/`: Google OAuth login, callback, logout, 사용자 조회.
- `src/app/api/admin/`: presign, upload, clip CRUD 등 보호 API.
- `src/app/admin/`: 보호된 관리 화면.
- `src/components/`: player, clip, 공통 UI.
- `src/hooks/`: 인증, clip, theme, video player hook.
- `src/lib/`: OAuth, R2, clip 처리 utility.
- `src/types/`: TypeScript interface.
- `__tests__/`: Vitest, React Testing Library, MSW 테스트.

## 데이터와 인증

- 모든 동영상 metadata는 R2의 `metadata.json`에 저장한다.
- 동영상은 만료 시간이 있는 presigned URL로 업로드한다.
- 관리자 이메일 allowlist는 metadata의 `allowedUploaders`로 관리한다.
- `src/middleware.ts`가 `/admin/*` 경로를 보호한다.

## 환경 변수

브라우저 공개 값:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_R2_PUBLIC_URL`
- `NEXT_PUBLIC_BASE_URL`

서버 전용 값:

- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

실제 값은 출력하거나 커밋하지 않는다.

## 배포

`@cloudflare/next-on-pages` 기반 Cloudflare Pages 앱이다. 설정은 `wrangler.toml`을 따른다. 배포 전 로컬 lint, test, build와 Cloudflare 변환 빌드를 확인한다.
