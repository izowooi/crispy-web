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
| `GET /api/archives/[id]` | `edge` | DB 읽기만 수행 |
| `GET /api/archives/[id]/raw` | `nodejs` | 파일 읽기 필요 |

**Cloudflare Pages 배포 시:** LocalAdapter를 R2Adapter로 교체하고 모든 라우트를 `edge`로 변경.
`src/lib/storage/types.ts`의 `StorageAdapter` 인터페이스를 준수해 구현하면 된다.

## DB 스키마

테이블: `ps_archives` (Supabase, `fresh-mint` 프로젝트)

```sql
id           UUID  PK default gen_random_uuid()
title        TEXT  NOT NULL
original_url TEXT  NOT NULL
storage_path TEXT  NOT NULL   -- /api/archives/{id}/raw
file_size    INT   default 0
created_at   TIMESTAMPTZ default now()
```

RLS 활성화. anon은 SELECT만 허용. INSERT/UPDATE/DELETE는 서비스 롤 키 전용.

## 보안

- **인제스트 시 sanitize**: `src/lib/sanitize.ts`에서 `<script>`, `on*` 핸들러, `javascript:` URI 제거
- **렌더링**: `/archive/[id]` 페이지에서 iframe `sandbox="allow-same-origin allow-forms"` 적용
- **CSP 헤더**: `/api/archives/[id]/raw` 라우트에서 `default-src 'none'` 설정
- **익스텐션 CORS**: `POST /api/archives`에서 `chrome-extension://` origin 허용

## 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # anon key (클라이언트 목록 조회)
SUPABASE_SERVICE_ROLE_KEY=      # service role key (서버 전용 write)
NEXT_PUBLIC_BASE_URL=           # 공유 URL 생성 기준 (default: http://localhost:3000)
PS_ARCHIVES_DIR=                # HTML 저장 경로 (default: ./ps_archives)
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
│   ├── page.tsx                    # 아카이브 목록
│   ├── archive/[id]/page.tsx       # 아카이브 뷰어 (sandboxed iframe)
│   └── api/archives/               # REST API
├── lib/
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
