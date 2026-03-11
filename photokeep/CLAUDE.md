# CLAUDE.md

## Project Overview

PhotoKeep은 가족 사진 공유 웹앱입니다. 엄마/아빠가 사진을 업로드하면 할아버지, 할머니, 이모 등 가족 모두가 볼 수 있는 프라이빗 갤러리입니다. 인스타그램과 유사한 UX이지만 SNS 기능 없이 순수 열람 목적입니다.

## Build & Development Commands

```bash
npm run dev              # Development server (port 3000)
npm run build            # Production build
npm run lint             # ESLint checks
npm run test             # Run Vitest suite
```

## Architecture

```
Client (React 19.2 + Tailwind 4)
        ↓
Next.js 16 App Router + Middleware
        ↓
Cloudflare Pages Edge Runtime
        ↓
┌─────────────────────────────────┐
│  Cloudflare R2 (photos/thumbnails)  │
│  Supabase PostgreSQL (metadata)      │
└─────────────────────────────────┘
        ↓
Google OAuth 2.0 + JWT Sessions (7-day HttpOnly cookies)
```

### Key Directories

- `src/app/` - Next.js App Router pages and API routes
- `src/app/api/auth/` - Google OAuth flow (login, callback, logout, me)
- `src/app/api/admin/` - Protected APIs (presign, upload, posts CRUD, albums CRUD)
- `src/app/admin/` - Protected admin pages (upload, posts, albums management)
- `src/components/` - React components (feed, photo, album, ui)
- `src/hooks/` - Custom hooks (useAuth, usePosts, useTheme)
- `src/lib/` - Utilities (auth/google.ts, r2/signer.ts, supabase/client.ts)
- `src/types/` - TypeScript interfaces

### Data Storage

- **Supabase PostgreSQL**: posts, photos, albums, album_posts, allowed_uploaders, app_settings
- **Cloudflare R2**: 원본 사진 (photos/uuid.jpg) + 썸네일 (thumbnails/uuid.webp)
- 포스트당 최대 10장 사진 (캐러셀)

### 3-Tab Navigation

| Tab | Route | Description |
|-----|-------|-------------|
| 피드 | `/` | 인스타그램 스타일 무한 스크롤 피드 |
| 앨범 | `/album` | 이벤트/날짜별 앨범 그리드 |
| 추억 | `/memories` | 날짜/월/연도별 사진 모아보기 |

## Environment Variables

Public (browser-accessible):
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - OAuth client ID
- `NEXT_PUBLIC_R2_PUBLIC_URL` - R2 bucket public URL
- `NEXT_PUBLIC_BASE_URL` - Site URL for OAuth callback
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

Private (server-only):
- `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `SUPABASE_SERVICE_ROLE_KEY`

## Deployment

Deploys to Cloudflare Pages using `@cloudflare/next-on-pages`.
