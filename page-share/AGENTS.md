# AGENTS.md — page-share (Layer 3)

이 문서는 `page-share` 앱에 적용되는 Layer 3 작업 지침입니다.
상위 Layer 2 지침은 `../AGENTS.md`를 따릅니다.

## 앱 개요

웹 페이지 아카이브 뷰어. Chrome 익스텐션(`page-share-ext`)과 함께 동작합니다.
익스텐션이 R2에 HTML을 직접 업로드한 뒤, 공개 URL을 이 서버에 등록합니다.
이 앱은 DB 메타데이터(제목, 원본 URL, R2 공개 URL)만 관리하고, 뷰어는 R2 URL로 직접 리다이렉트합니다.

배포: **Cloudflare Pages** (`<PROJECT_DOMAIN>`)

## 기술 스택

- Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- Supabase (`ps_archives` 테이블) — 메타데이터 저장
- Cloudflare Pages (`@cloudflare/next-on-pages@1`)
- 모든 라우트 **Edge Runtime** (`export const runtime = "edge"`)

## 런타임 — 전체 Edge

| 라우트 | 종류 | 비고 |
|--------|------|------|
| `/` | Edge Page | 아카이브 목록, admin 여부에 따라 관리 열 |
| `/archive/[id]` | Edge Page | 비공개면 admin만(`canViewArchive`), 아니면 404. 통과 시 storage_path → R2 URL 리다이렉트 |
| `/_not-found` | Static | Next.js 특수 파일, runtime 선언 무시됨 |
| `POST /api/archives` | Edge API | R2 직접 업로드 등록만 허용 (legacy html 경로 제거). `is_private` 수용(기본 false) |
| `GET /api/archives/[id]` | Edge API | 단건 조회 |
| `DELETE/PATCH /api/archives/[id]` | Edge API | soft delete, is_private 토글. admin 필수 |
| `GET /api/archives/[id]/raw` | Edge API | 410 Gone (legacy 로컬 저장 폐기) |
| `POST /api/admin/login` | Edge API | 비밀번호 검증 + `ps_admin` httpOnly 쿠키 |
| `POST /api/admin/logout` | Edge API | 쿠키 삭제 |
| `GET /api/admin/status` | Edge API | 클라이언트에서 admin 여부 확인용 |

### Edge 런타임 주의사항

- `not-found.tsx`에 `export const runtime = "edge"` 선언을 넣어도 Next.js가 무시한다.
  `_not-found`가 Edge로 컴파일되게 하려면 `layout.tsx`를 **non-async**로 유지해야 한다.
  layout에 async가 붙으면 `_not-found.func`가 Node.js로 컴파일되어 Cloudflare Pages 빌드 실패.
- `createClient()` 등 모듈 수준 Supabase 초기화는 금지.
  빌드 시 env가 없으면 즉시 throw. 반드시 factory 함수(`createServerClient()`) 안에서 호출.

## AdminBar 패턴

- `layout.tsx`는 async 불가 → admin 상태를 SSR로 읽을 수 없음.
- `AdminBarWrapper` (`"use client"`)가 마운트 후 `/api/admin/status`를 fetch해서 admin 여부 확인.
- `AdminBar`는 props로 `isAdmin: boolean`을 받아 UI만 담당.

```
layout.tsx (non-async, Edge)
  └── AdminBarWrapper (Client, useEffect → /api/admin/status)
        └── AdminBar (Client, isAdmin prop)
```

## 업로드 API

### POST /api/archives

익스텐션이 R2에 HTML을 저장한 뒤 메타데이터만 등록합니다.

```json
{
  "title": "페이지 제목",
  "original_url": "https://example.com",
  "storage_path": "https://pub-xxx.r2.dev/uuid.html",
  "file_size": 12345
}
```

- `storage_path`는 반드시 `https://`로 시작해야 합니다.
- html 필드(legacy 로컬 저장)는 지원하지 않습니다.
- `API_KEY` 환경변수 설정 시: `X-Api-Key: <값>` 헤더 필수. 불일치 → 401.
- 미설정 시: 인증 없이 허용 (로컬 dev).

## 라이트/다크 모드

- Tailwind CSS v4 dark variant: `@variant dark (&:where(.dark, .dark *));` in `globals.css`
- 기본값: **라이트**. localStorage `theme` 키로 유지.
- FOUC 방지: `layout.tsx` `<head>`에 인라인 `<script>`로 렌더 전에 `dark` 클래스 적용.
- `ThemeToggle` 컴포넌트: `"use client"`, localStorage + `document.documentElement.classList.toggle('dark')`.

## 관리자(Admin) 인증

- `ADMIN_PASSWORD` 환경변수(서버 전용, NEXT_PUBLIC_ 절대 금지).
- 미설정 시 관리자 기능 비활성화.
- 인증 쿠키: `ps_admin` (httpOnly, 7일).
- `src/lib/admin.ts`: `isAdminSession()` (Server Component/Action), `isAdminRequest()` (Route Handler).
- 관리자 인증 시: 비공개 아카이브 포함 전체 목록, 삭제·비공개 토글 버튼 노출.

**비공개(is_private)**: 익스텐션 저장 시(체크박스) 또는 목록 토글로 설정. 목록·`GET /api/archives[/id]`·`/archive/[id]` 상세 페이지 모두 비admin에게 비공개를 숨긴다(`src/lib/visibility.ts`의 `canViewArchive`로 규칙 통일). 익스텐션은 비공개 저장 시 raw R2 URL이 아닌 `/archive/{id}`(게이트 경유)를 share URL로 반환. **한계**: R2 객체 자체는 여전히 public URL(UUID 난수)에 있어, 그 URL을 직접 아는 사람은 접근 가능. 진짜 at-rest 비공개는 비public 버킷/프록시가 필요(미적용).

## DB 스키마

테이블: `ps_archives`

```sql
id           UUID  PK default gen_random_uuid()
title        TEXT  NOT NULL
original_url TEXT  NOT NULL
storage_path TEXT  NOT NULL   -- https://pub-xxx.r2.dev/{key}.html
file_size    INT   default 0
created_at   TIMESTAMPTZ default now()
deleted_at   TIMESTAMPTZ default NULL   -- soft delete
is_private   BOOLEAN NOT NULL default FALSE
```

RLS 활성화. anon은 SELECT만. INSERT/UPDATE/DELETE는 서비스 롤 키 전용.

## 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # anon key
SUPABASE_SERVICE_ROLE_KEY=      # service role key (서버 전용)
ADMIN_PASSWORD=                 # 관리자 비밀번호 (서버 전용)
API_KEY=                        # 업로드 API 키 (서버 전용). 미설정 시 로컬 dev 모드
```

Cloudflare Pages Dashboard → Settings → Environment variables 에서 설정.
`NEXT_PUBLIC_*` 값은 빌드 시 인라인되므로 변경 후 반드시 재빌드.

## 로컬 실행

```bash
cd page-share
npm install
cp .env.local.example .env.local   # 값 채우기
npm run dev        # http://localhost:52741
npm run lint
npm run build      # Next.js 빌드
npm run pages:build  # Cloudflare Pages 빌드 검증
```

## 주요 파일

```
src/
├── app/
│   ├── globals.css                    # @variant dark 선언 포함
│   ├── layout.tsx                     # non-async, Edge, ThemeToggle + AdminBarWrapper
│   ├── not-found.tsx                  # static 프리렌더 (runtime 선언 무시됨)
│   ├── page.tsx                       # 아카이브 목록
│   ├── actions.ts                     # Server Actions: deleteArchive, setPrivate
│   ├── archive/[id]/page.tsx          # storage_path → R2 URL redirect
│   └── api/
│       ├── admin/login/route.ts
│       ├── admin/logout/route.ts
│       ├── admin/status/route.ts      # 클라이언트 admin 상태 확인
│       └── archives/
│           ├── route.ts               # GET: 목록, POST: R2 등록
│           └── [id]/
│               ├── route.ts           # GET/DELETE/PATCH
│               └── raw/route.ts       # 410 Gone (legacy 폐기)
├── components/
│   ├── admin-bar.tsx                  # isAdmin prop 받아 UI만 담당
│   ├── admin-bar-wrapper.tsx          # "use client", /api/admin/status fetch
│   ├── archive-row-actions.tsx        # 삭제·비공개 토글
│   └── theme-toggle.tsx               # 라이트/다크 전환 버튼
├── lib/
│   ├── admin.ts                       # isAdminSession / isAdminRequest
│   ├── supabase.ts                    # createServerClient() factory만
│   └── apikey.ts                      # isValidApiKey, extractApiKey
└── types/archive.ts
```
