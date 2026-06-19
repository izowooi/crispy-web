# AGENTS.md — photokeep (Layer 3)

이 문서는 `photokeep` 프로젝트에 적용되는 Layer 3 작업 지침이다.
상위 Layer 2 지침은 `../AGENTS.md`를 따른다.

## 프로젝트 개요

PhotoKeep은 가족 사진 공유용 비공개 갤러리다. 업로더가 사진을 등록하면 가족이 피드·앨범·추억 화면에서 열람하며, 공개 SNS 기능은 제공하지 않는다.

## 실행과 검증

```bash
npm run dev
npm run lint
npm run test
npm run build
```

## 아키텍처

```text
React 19 + Tailwind CSS 4 client
  → Next.js 16 App Router + middleware
  → Cloudflare Pages Edge Runtime
  → Cloudflare R2: 원본 사진과 thumbnail
  → Supabase PostgreSQL: metadata
  → Google OAuth 2.0 + 7일 HttpOnly JWT session
```

## 주요 경로

- `src/app/`: App Router 페이지와 API route.
- `src/app/api/auth/`: Google OAuth flow.
- `src/app/api/admin/`: presign, upload, post·album CRUD 등 보호 API.
- `src/app/admin/`: 보호된 관리 화면.
- `src/components/`: feed, photo, album, 공통 UI.
- `src/hooks/`: 인증, post, theme hook.
- `src/lib/`: OAuth, R2 signer, Supabase client.
- `src/types/`: TypeScript interface.

## 데이터

- Supabase는 `posts`, `photos`, `albums`, `album_posts`, `allowed_uploaders`, `app_settings` metadata를 관리한다.
- R2는 `photos/` 원본과 `thumbnails/` WebP를 저장한다.
- 한 post에는 최대 10장의 사진을 연결한다.
- schema 변경 시 필요한 SQL과 적용 순서를 명시하고, 미적용 상태의 graceful fallback을 고려한다.

## 주요 화면

- `/`: 무한 스크롤 feed.
- `/album`: 이벤트·날짜별 album grid.
- `/memories`: 날짜·월·연도별 사진 모음.

## 환경 변수

브라우저 공개 값:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_R2_PUBLIC_URL`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

서버 전용 값:

- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `SUPABASE_SERVICE_ROLE_KEY`

실제 값은 출력하거나 커밋하지 않는다.

## 배포

`@cloudflare/next-on-pages` 기반 Cloudflare Pages 앱이다. 배포 전 로컬 lint, test, build와 Cloudflare 변환 빌드를 확인한다.
