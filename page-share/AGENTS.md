# AGENTS.md — page-share (L4)

이 문서는 `crispy-web/page-share` 앱의 L4 작업 지침입니다.
상위 L3 지침은 `crispy-web/AGENTS.md`, 전역 L1 지침은 `$HOME/git/AGENTS.md`를 따릅니다.

## 앱 개요

웹 페이지 아카이브 뷰어. Chrome 익스텐션(`page-share-ext`)과 함께 동작하며,
익스텐션이 캡처한 HTML을 받아 저장하고 공유 URL을 생성하는 서비스입니다.

익스텐션에서 R2를 설정하면 HTML은 Cloudflare R2에 직접 저장되고,
이 웹 앱은 DB에 메타데이터(제목, 원본 URL, R2 공개 URL)만 기록합니다.
R2 미설정 시에는 HTML 전체를 이 서버에서 받아 로컬 파일로 저장합니다.

## 기술 스택

- Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- Supabase (`elufbvcnhitoksoofbir` 프로젝트, `fresh-mint`)
- LocalAdapter: 로컬 `ps_archives/` 폴더에 HTML 저장 (legacy 모드)
- 배포 목표: Cloudflare Pages (R2Adapter 교체 후)

## 핵심 제약: 런타임 분리

| 라우트 | Runtime | 이유 |
|--------|---------|------|
| `GET /api/archives` | `nodejs` | Supabase client (서비스 롤) |
| `POST /api/archives` | `nodejs` | LocalAdapter 파일 쓰기 (legacy 모드) |
| `GET /api/archives/[id]` | `edge` | DB 읽기 + admin 체크 |
| `DELETE /api/archives/[id]` | `edge` | soft delete (deleted_at). admin 필수 |
| `PATCH /api/archives/[id]` | `edge` | is_private 토글. admin 필수 |
| `GET /api/archives/[id]/raw` | `nodejs` | 파일 읽기 필요. **로컬 저장 시 아카이브 뷰 URL.** |
| `POST /api/admin/login` | `nodejs` | 비밀번호 검증, `ps_admin` 쿠키 설정 |
| `POST /api/admin/logout` | `nodejs` | `ps_admin` 쿠키 삭제 |

`/archive/[id]` 페이지: DB에서 `storage_path` 조회 후 redirect.
- R2 모드: `https://pub-xxx.r2.dev/{key}.html`로 직접 리다이렉트 (서버 불필요)
- 로컬 모드: `/api/archives/{id}/raw`로 리다이렉트

## POST /api/archives — 두 가지 업로드 모드

### R2 직접 업로드 (storage_path 제공)

익스텐션이 R2에 HTML을 업로드한 뒤, 공개 URL을 이 엔드포인트에 등록합니다.

```json
POST /api/archives
{
  "title": "페이지 제목",
  "original_url": "https://example.com",
  "storage_path": "https://pub-xxx.r2.dev/uuid.html",
  "file_size": 12345
}
```

- `storage_path`는 반드시 `https://`로 시작해야 합니다.
- HTML sanitize를 서버에서 수행하지 않습니다. 익스텐션의 `removeScripts()`만 적용됩니다.

### 서버 업로드 (html 제공, legacy)

```json
POST /api/archives
{
  "title": "페이지 제목",
  "original_url": "https://example.com",
  "html": "<!DOCTYPE html>..."
}
```

서버에서 `sanitizeHtml()` 후 `LocalAdapter`로 파일 저장. `storage_path`는 자동으로 `/api/archives/{id}/raw` 형태로 설정됩니다.

## API 키 인증 (업로드 보호)

- `API_KEY` 환경변수(서버 전용)로 업로드 엔드포인트를 보호한다.
- **미설정 시(로컬 dev)**: 키 없이 업로드 가능
- **설정 시(운영)**: 요청에 `X-Api-Key: <값>` 헤더가 있어야 함. 불일치 → 401
- 적용 범위: `POST /api/archives`. `GET /api/archives`(목록 조회)는 인증 없이 허용.
- 익스텐션에서 API Key 설정: 팝업 하단 "API Key" 필드에 입력 후 "설정 저장"
- `src/lib/apikey.ts`: `isValidApiKey(key)`, `extractApiKey(request)`
- 테스트: `src/__tests__/apikey.test.ts` (6개)

## 운영 환경 (Cloudflare Tunnel)

- Mac mini에서 `npm run dev` → Cloudflare Tunnel → `https://pageshare.zowoo.uk`
- `.env.local`에서 `NEXT_PUBLIC_BASE_URL=https://pageshare.zowoo.uk` 설정
- 익스텐션 팝업에서 API URL을 `https://pageshare.zowoo.uk`로 변경
- Cloudflare Tunnel 설정: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

## 관리자(Admin) 인증

- `ADMIN_PASSWORD` 환경변수(서버 전용)로 관리. 미설정 시 관리자 기능 비활성화.
- `POST /api/admin/login` → 비밀번호 일치 시 `httpOnly` 쿠키 `ps_admin` 설정 (7일)
- `src/lib/admin.ts`: `isAdminSession()` (Server Component/Action용), `isAdminRequest()` (Route Handler용)
- 관리자 미인증 상태: 비공개 아카이브 목록에서 숨김, 삭제/비공개 버튼 미노출
- 관리자 인증 상태: 전체 목록(공개+비공개) 표시, 삭제·비공개 토글 버튼 노출

**비공개(is_private) 플래그의 범위:** 목록 노출만 제어합니다.
- 로컬 저장 모드: `/archive/{id}` URL을 알면 누구나 접근 가능 (URL 기반 접근 제어 없음)
- R2 저장 모드: R2 Public URL(`https://pub-xxx.r2.dev/uuid.html`)은 URL을 아는 사람은 누구나 접근 가능

## DB 스키마

테이블: `ps_archives`

```sql
id           UUID  PK default gen_random_uuid()
title        TEXT  NOT NULL
original_url TEXT  NOT NULL
storage_path TEXT  NOT NULL   -- /api/archives/{id}/raw  OR  https://pub-xxx.r2.dev/{key}.html
file_size    INT   default 0
created_at   TIMESTAMPTZ default now()
deleted_at   TIMESTAMPTZ default NULL   -- soft delete
is_private   BOOLEAN NOT NULL default FALSE
```

RLS 활성화. anon은 SELECT만 허용. INSERT/UPDATE/DELETE는 서비스 롤 키 전용.

## 보안

- **Legacy 인제스트 시 sanitize**: `src/lib/sanitize.ts`에서 `<script>`, `on*` 핸들러, `javascript:` URI 제거
- **R2 모드**: 서버 sanitize 없음. 익스텐션 `removeScripts()`만 적용.
- **렌더링**: `/api/archives/[id]/raw`에서 CSP `script-src 'none'; object-src 'none'` 적용 (로컬 저장 시)
- **익스텐션 CORS**: `POST /api/archives`에서 `chrome-extension://` origin 허용

## 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # anon key (클라이언트 목록 조회)
SUPABASE_SERVICE_ROLE_KEY=      # service role key (서버 전용 write)
NEXT_PUBLIC_BASE_URL=           # 공유 URL 생성 기준 (default: http://localhost:52741)
PS_ARCHIVES_DIR=                # HTML 저장 경로 (default: ./ps_archives, legacy 모드)
ADMIN_PASSWORD=                 # 관리자 비밀번호 (서버 전용, NEXT_PUBLIC_ 절대 금지)
API_KEY=                        # 업로드 API 키 (서버 전용). 미설정 시 로컬 dev 모드
```

`.env.local`에만 관리. 커밋 금지.

## 로컬 실행

```bash
cd page-share
npm install
# .env.local 설정 필요 (.env.example 참조)
npm run dev       # http://localhost:52741
npm run test      # vitest 테스트
npm run build     # 프로덕션 빌드 확인
```

## 테스트

- `src/__tests__/sanitize.test.ts`: HTML sanitizer 단위 테스트
- `src/__tests__/local-adapter.test.ts`: 파일 읽기/쓰기/삭제 테스트
- `src/__tests__/apikey.test.ts`: API key 검증 테스트 (6개)

## 주요 파일

```
src/
├── app/
│   ├── layout.tsx                  # 헤더 + AdminBar 클라이언트 컴포넌트
│   ├── page.tsx                    # 아카이브 목록 (admin 여부에 따라 관리 열 노출)
│   ├── actions.ts                  # Server Actions: deleteArchive, setPrivate
│   ├── archive/[id]/page.tsx       # DB에서 storage_path 조회 → redirect (R2 URL 또는 /raw)
│   └── api/
│       ├── admin/login/route.ts    # POST: 비밀번호 검증 + 쿠키 설정
│       ├── admin/logout/route.ts   # POST: 쿠키 삭제
│       └── archives/               # REST API
│           ├── route.ts            # GET: 목록, POST: 업로드(R2 또는 legacy)
│           └── [id]/
│               ├── route.ts        # GET/DELETE/PATCH
│               └── raw/route.ts    # GET: 로컬 저장 HTML 서빙 (legacy)
├── components/
│   ├── admin-bar.tsx               # 관리자 로그인/로그아웃 UI
│   └── archive-row-actions.tsx     # 삭제·비공개 토글 버튼
├── lib/
│   ├── admin.ts                    # isAdminSession / isAdminRequest / isAdminToken
│   ├── supabase.ts                 # DB 클라이언트
│   ├── sanitize.ts                 # HTML 정제 (legacy 업로드 시 사용)
│   ├── apikey.ts                   # API key 검증
│   └── storage/
│       ├── types.ts                # StorageAdapter 인터페이스
│       └── local-adapter.ts        # 로컬 파일 구현 (legacy 모드)
└── types/archive.ts                # Archive 타입 정의
```

## Cloudflare Pages 배포 시 (추후)

`POST /api/archives`의 legacy 경로는 LocalAdapter(파일 시스템) 의존으로 edge에서 실행 불가.
R2 직접 업로드 모드만 사용한다면 이미 edge 호환. legacy 모드 지원이 필요하면:

1. `src/lib/storage/r2-adapter.ts` 작성 (StorageAdapter 구현)
2. `POST /api/archives`와 `GET .../raw`에서 LocalAdapter → R2Adapter 교체
3. `export const runtime = 'edge'`로 변경
4. `.env.local`에 R2 크레덴셜 추가 (서버 측)
5. `wrangler.jsonc`에 R2 바인딩 추가
