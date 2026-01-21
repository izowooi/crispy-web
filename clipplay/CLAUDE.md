# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClipPlay is a private family video streaming platform - a Next.js 16 web application for sharing vertical videos in a TikTok-style interface. Videos are stored in Cloudflare R2, with admin access controlled via Google OAuth email whitelist.

## Build & Development Commands

```bash
npm run dev              # Development server (port 3000)
npm run build            # Production build
npm run lint             # ESLint checks
npm run test             # Run Vitest suite
npm run test:ui          # Vitest UI dashboard
npm run test:coverage    # Coverage report
```

## Architecture

```
Client (React 19.2 + Tailwind 4)
        ↓
Next.js 16 App Router + Middleware
        ↓
Cloudflare Pages Edge Runtime
        ↓
Cloudflare R2 Storage (videos & metadata.json)
        ↓
Google OAuth 2.0 + JWT Sessions (7-day HttpOnly cookies)
```

### Key Directories

- `src/app/` - Next.js App Router pages and API routes
- `src/app/api/auth/` - Google OAuth flow (login, callback, logout, me)
- `src/app/api/admin/` - Protected APIs (presign, upload, clips CRUD)
- `src/app/admin/` - Protected admin pages (upload, clips management)
- `src/components/` - React components (player, clip UI, common UI)
- `src/hooks/` - Custom hooks (useAuth, useClips, useTheme, useVideoPlayer)
- `src/lib/` - Utilities (auth/google.ts, r2/client.ts, clips/filter.ts)
- `src/types/` - TypeScript interfaces

### Data Flow

- All video metadata stored in `metadata.json` in R2 bucket
- Videos uploaded via presigned URLs (1-hour expiration)
- Admin access controlled by `allowedUploaders` email array in metadata
- Middleware in `src/middleware.ts` protects `/admin/*` routes

### Key Data Model

```typescript
interface Clip {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  fileKey: string;        // videos/uuid.mp4
  fileSize: number;
  duration: number;
  thumbnailKey?: string;
  filmingDate?: string;   // ISO 8601
  createdAt: string;
  updatedAt: string;
}
```

## Environment Variables

Public (browser-accessible):
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - OAuth client ID
- `NEXT_PUBLIC_R2_PUBLIC_URL` - R2 bucket URL
- `NEXT_PUBLIC_BASE_URL` - Site URL for OAuth callback

Private (server-only):
- `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

## Testing

Tests use Vitest + React Testing Library + MSW for API mocking. Test files are in `__tests__/` directory with subdirectories for components, hooks, and utils.

## Deployment

Deploys to Cloudflare Pages using `@cloudflare/next-on-pages`. Configuration in `wrangler.toml`. Server Actions body limit set to 500MB for video uploads.
