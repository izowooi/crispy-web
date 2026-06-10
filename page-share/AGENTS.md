# AGENTS.md — page-share (L4)

이 문서는 `crispy-web/page-share` 앱의 L4 작업 지침입니다.
상위 L3 지침은 `crispy-web/AGENTS.md`, 전역 L1 지침은 `$HOME/git/AGENTS.md`를 따릅니다.

## 앱 개요

웹 페이지 아카이브 뷰어. Chrome 익스텐션(`page-share-ext`)과 함께 동작하며,
익스텐션이 캡처한 HTML을 받아 저장하고 공유 URL을 생성하는 서비스입니다.

## 기술 스택

- Next.js 15.5 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- Supabase (`elufbvcnhitoksoofbir` 프로젝트, `fresh-mint`)
- LocalAdapter: 로컬 `ps_archives/` 폴더에 HTML 저장 (MVP)
- 배포 목표: Cloudflare Pages (R2Adapter 교체 후)

## 핵심 제약: 런타임 분리

| 라우트 | Runtime | 이유 |
|--------|---------|------|
| `GET /api/archives` | `nodejs` | Supabase client (서비스 롤) |
| `POST /api/archives` | `nodejs` | LocalAdapter 파일 쓰기 필요 |
| `GET /api/archives/[id]` | `edge` | DB 읽기 + admin 체크 |
| `DELETE /api/archives/[id]` | `edge` | soft delete (deleted_at). admin 필수 |
| `PATCH /api/archives/[id]` | `edge` | is_private 토글. admin 필수 |
| `GET /api/archives/[id]/raw` | `nodejs` | 파일 읽기 필요. **이것이 실제 아카이브 뷰 URL.** |
| `POST /api/admin/login` | `nodejs` | 비밀번호 검증, `ps_admin` 쿠키 설정 |
| `POST /api/admin/logout` | `nodejs` | `ps_admin` 쿠키 삭제 |

`/archive/[id]` 페이지는 `/api/archives/[id]/raw`로 302 리다이렉트한다. 목록에서 제목 클릭 시 원본 HTML이 바로 표시된다.

## API 키 인증 (업로드 보호)

- `API_KEY` 환경변수(서버 전용)로 업로드 엔드포인트를 보호한다.
- **미설정 시(로컬 dev)**: 키 없이 업로드 가능
- **설정 시(운영)**: 요청에 `X-Api-Key: <값>` 헤더가 있어야 함. 불일치 → 401
- 적용 범위: `POST /api/archives`만. `GET /api/archives`(목록 조회)는 인증 없이 허용.
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

## DB 스키마 (updated)

테이블: `ps_archives`

```sql
id           UUID  PK default gen_random_uuid()
title        TEXT  NOT NULL
original_url TEXT  NOT NULL
storage_path TEXT  NOT NULL
file_size    INT   default 0
created_at   TIMESTAMPTZ default now()
deleted_at   TIMESTAMPTZ default NULL   -- soft delete
is_private   BOOLEAN NOT NULL default FALSE
```

**Cloudflare Pages 배포 시:** LocalAdapter를 R2Adapter로 교체하고 모든 라우트를 `edge`로 변경.
`src/lib/storage/types.ts`의 `StorageAdapter` 인터페이스를 준수해 구현하면 된다.


RLS 활성화. anon은 SELECT만 허용. INSERT/UPDATE/DELETE는 서비스 롤 키 전용.

## 보안

- **인제스트 시 sanitize**: `src/lib/sanitize.ts`에서 `<script>`, `on*` 핸들러, `javascript:` URI 제거
- **렌더링**: `/api/archives/[id]/raw`에서 CSP `script-src 'none'; object-src 'none'` 적용 (스크립트 실행 차단, 외부 CSS·폰트·이미지 로딩은 허용)
- **익스텐션 CORS**: `POST /api/archives`에서 `chrome-extension://` origin 허용

## 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # anon key (클라이언트 목록 조회)
SUPABASE_SERVICE_ROLE_KEY=      # service role key (서버 전용 write)
NEXT_PUBLIC_BASE_URL=           # 공유 URL 생성 기준 (default: http://localhost:3000)
PS_ARCHIVES_DIR=                # HTML 저장 경로 (default: ./ps_archives)
ADMIN_PASSWORD=                 # 관리자 비밀번호 (서버 전용, NEXT_PUBLIC_ 절대 금지)
API_KEY=                        # 업로드 API 키 (서버 전용). 미설정 시 로컬 dev 모드
```

`.env.local`에만 관리. 커밋 금지.

## 로컬 실행

```bash
cd page-share
npm install
# .env.local 설정 필요 (.env.example 참조)
npm run dev       # http://localhost:3000
npm run test      # vitest 테스트
npm run build     # 프로덕션 빌드 확인
```

## 테스트

- `src/__tests__/sanitize.test.ts`: HTML sanitizer 단위 테스트
- `src/__tests__/local-adapter.test.ts`: 파일 읽기/쓰기/삭제 테스트
- API 라우트 테스트: Supabase mock 후 추가 예정

## 주요 파일

```
src/
├── app/
│   ├── layout.tsx                  # 헤더 + AdminBar 클라이언트 컴포넌트
│   ├── page.tsx                    # 아카이브 목록 (admin 여부에 따라 관리 열 노출)
│   ├── actions.ts                  # Server Actions: deleteArchive, setPrivate
│   ├── archive/[id]/page.tsx       # /api/archives/[id]/raw 로 302 리다이렉트
│   └── api/
│       ├── admin/login/route.ts    # POST: 비밀번호 검증 + 쿠키 설정
│       ├── admin/logout/route.ts   # POST: 쿠키 삭제
│       └── archives/               # REST API
├── components/
│   ├── admin-bar.tsx               # 관리자 로그인/로그아웃 UI
│   └── archive-row-actions.tsx     # 삭제·비공개 토글 버튼
├── lib/
│   ├── admin.ts                    # isAdminSession / isAdminRequest / isAdminToken
│   ├── supabase.ts                 # DB 클라이언트
│   ├── sanitize.ts                 # HTML 정제
│   └── storage/
│       ├── types.ts                # StorageAdapter 인터페이스
│       └── local-adapter.ts        # 로컬 파일 구현 (MVP)
└── types/archive.ts                # Archive 타입 정의
```

## R2 마이그레이션 가이드 (추후)

1. `src/lib/storage/r2-adapter.ts` 작성 (StorageAdapter 구현)
2. `src/app/api/archives/route.ts`와 `raw/route.ts`에서 LocalAdapter → R2Adapter 교체
3. `export const runtime = 'edge'`로 변경
4. `.env.local`에 R2 크레덴셜 추가
5. `wrangler.jsonc`에 R2 바인딩 추가
