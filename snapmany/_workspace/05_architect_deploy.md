# Phase 5-A — Architect 배포 빌드 결과 (snapmany)

생성일: 2026-05-12 (Phase 5-A)
작성자: architect 서브 에이전트 (model: opus)
선행 산출물: `_workspace/00_architect_decisions.md` (D3 = 수동 대시보드 업로드), `_workspace/02_architect_scaffold.md`, `_workspace/04_qa_integration.md` (Phase 4 5/5 PASS)

---

## 0. 작업 요약

Phase 4 통합 QA가 "Phase 5 진입 허가"를 발급한 상태에서, architect는 (1) `.gitignore` 정리, (2) `README.md` 완성, (3) `npm run pages:build` 최종 실행 + 산출물 검증을 수행했다. `src/` 코드는 1줄도 수정하지 않았다 (빌드 PASS 상태 유지).

| 항목 | 결과 |
|------|------|
| `.gitignore` 정리 | **DONE** (`.playwright-mcp/` 추가) |
| `README.md` 완성 | **DONE** (한국어, 9개 섹션) |
| `npm run pages:build` | **PASS** (exit 0, 6초) |
| 산출물 폴더 | `.vercel/output/static/`, **1.8MB**, **37 files** |
| Edge Function | 1개 (`/api/generate`) |
| Prerendered Routes | 4개 (`/`, `/_not-found`, `/_not-found.rsc`, `/index.rsc`) |
| Static Assets | 24개 (chunks, html, rsc.json, _headers, _routes.json) |
| 회귀 | 0 (코드 변경 없음) |

---

## 1. `.gitignore` 변경

추가된 항목:

```
# Playwright MCP cache (모노레포 공통 패턴 — 다른 프로젝트와 동일)
.playwright-mcp/
```

- 위치: `.gitignore` 의 "node / build artifacts" 블록 직후.
- 사유: Phase 4 E2E 실행 시 `.playwright-mcp/` 디렉터리가 자동 생성됨(브라우저 캐시·session). 다른 모노레포 프로젝트(`../mojipop/`, `../seedance-studio/` 등)도 동일하게 추적 제외 패턴 적용.
- **`_workspace/04_qa_screenshots/`는 그대로 추적**(감사 증거).
- 기존 `firebase-debug.log` 패턴은 이미 존재 → 추가 작업 없음.

---

## 2. `README.md` 변경

기존 골격(74줄)을 완전 교체해 9개 섹션을 갖춘 한국어 완성본을 작성:

1. **# SnapMany** — 캐치프레이즈 "한 장의 사진으로 7개 카테고리 15개 스타일을 한 번에."
2. **## 개요** — Replicate `openai/gpt-image-2`, MVP(결제·계정·DB 없음), 사진 미저장 원칙.
3. **## 기능 (MVP)** — 업로드/EXIF 제거/병렬 생성/다운로드·복사/다크모드/RC 토글.
4. **## 기술 스택** — 표 형식. **Next.js 15.5.2 핀 사유**(@cloudflare/next-on-pages peer 상한)를 명시.
5. **## 개발** — `npm install`, `.env.local` 세팅, dev/test/build 명령.
6. **## 배포 (Cloudflare Pages — 수동 대시보드 업로드)** — 5단계 (빌드 → 콘솔 업로드 → 환경변수 → Redeploy → Custom Domain). 자동화를 사용하지 않는 이유 명시.
7. **## 환경변수** — 표 형식 (필수 / 노출 범위 / 발급처).
8. **## 보안 원칙** — Replicate 토큰 가드, 클라이언트 프록시 패턴, 서버 재검증, 사진 미저장.
9. **## 디렉터리 구조** — 트리 표시 (src/app, components, config, lib, __tests__ + _workspace + docs + .claude).
10. **## 라이선스 / 기여** — private 모노레포 일부, 외부 기여 미수용.

설계 노트:
- **영문 README_EN.md는 생성하지 않음** — 사용자 지시에 "옵션"이라 명시되어 있고, 모노레포의 다른 프로젝트도 한국어 단일 README 위주(`../seedance-studio/README_EN.md`만 예외) → MVP 범위 일관성 유지.
- 표/코드 블록은 깃허브 markdown 표준에 맞춰 작성. 모바일 가독성 고려해 표 컬럼 4개 이하로 제한.

---

## 3. `npm run pages:build` 결과

### 3.1 실행 명령

```bash
rm -rf .vercel/output && npm run pages:build
```

`.vercel/output`을 사전 정리한 뒤 클린 빌드. exit code = 0.

### 3.2 Next 빌드 단계

```
▲  ✓ Compiled successfully in 780ms
▲  Linting and checking validity of types ...
▲  Collecting page data ...
▲  ⚠ Using edge runtime on a page currently disables static generation for that page
▲  ✓ Generating static pages (4/4)
▲
▲  Route (app)                                 Size  First Load JS
▲  ┌ ○ /                                    21.8 kB         123 kB
▲  ├ ○ /_not-found                            993 B         103 kB
▲  └ ƒ /api/generate                          123 B         102 kB
```

- `/` 정적 페이지(21.8 kB / First Load 123 kB).
- `/api/generate`는 edge dynamic — 의도된 동작 (architect §6 API 계약 + R2 backend 구현).
- "Using edge runtime on a page currently disables static generation" 경고는 `/api/generate`(route handler)에 대한 정보 메시지로 차단 아님.

### 3.3 `@cloudflare/next-on-pages` 단계

```
⚡️ Build Summary (@cloudflare/next-on-pages v1.13.16)
⚡️
⚡️ Edge Function Routes (1)
⚡️   - /api/generate
⚡️
⚡️ Prerendered Routes (4)
⚡️   ┌ /
⚡️   ├ /_not-found
⚡️   ├ /_not-found.rsc
⚡️   └ /index.rsc
⚡️
⚡️ Other Static Assets (24)
⚡️
⚡️ Generated '.vercel/output/static/_worker.js/index.js'.
⚡️ Build completed in 0.12s
```

- Edge Function: **1개** (`/api/generate`) — Cloudflare Workers Runtime에서 실행될 핸들러.
- Prerendered: **4개** — `/` + 3개 RSC 메타 파일.
- Static Assets: **24개** — chunks(js/css), 404/500 html, `_headers`, `_routes.json`, cdn-cgi.
- `_worker.js/index.js` 정상 생성 → Cloudflare가 이 파일을 워커 진입점으로 사용.

### 3.4 산출물 폴더

```
.vercel/output/static/   1.8M, 37 files
├── 404.html
├── 500.html
├── _app.rsc.json
├── _document.rsc.json
├── _error.rsc.json
├── _headers              # Cloudflare 헤더 규칙
├── _next/                # chunks + static assets
├── _not-found.html
├── _not-found.rsc
├── _routes.json          # Cloudflare 라우팅 매니페스트
├── _worker.js/           # 워커 진입점
│   └── index.js
├── 404.rsc.json
├── cdn-cgi/
├── index.html
└── index.rsc
```

업로드 대상 = 이 폴더 **전체**. 폴더 통째로 드래그앤드롭하거나 zip 압축 후 업로드.

### 3.5 `wrangler pages dev` 로컬 부팅

본 Phase에서는 시도하지 않음 (사용자 지시: "옵션. 시도해서 로컬 부팅 확인되면 좋고, 안 되면 SKIP"). Phase 5-B qa가 필요 시 수행하거나, 사용자가 대시보드 업로드 전 로컬 검증을 원하면 `npm run preview` 직접 실행 가능.

---

## 4. 사용자 대시보드 작업 체크리스트

사용자가 https://dash.cloudflare.com 에서 진행할 단계:

- [ ] **(1) 프로젝트 생성**: Workers & Pages → Create application → **Pages 탭** → **Upload assets**. Project name = `snapmany` (충돌 시 `snap-many`).
- [ ] **(2) 폴더 업로드**: 로컬 `/Users/izowooi/git/crispy-web/snapmany/.vercel/output/static/` 폴더 전체를 드래그앤드롭 또는 zip 업로드.
- [ ] **(3) Deploy site** 클릭. 임시 도메인(`*.pages.dev`) 확인.
- [ ] **(4) 환경변수 주입**: Settings → Environment variables → **Production + Preview 둘 다** 아래 5개(+옵션 1개) 추가.
- [ ] **(5) Redeploy**: Deployments → 최신 → Retry deployment. Edge Function이 새 env를 픽업.
- [ ] **(6) (선택) Custom domain** 연결.
- [ ] **(7) 임시 도메인에서 sanity check**: 이미지 업로드 → 1 스타일 생성 → 결과 카드 렌더 → 다운로드.

---

## 5. 주입할 환경변수 (5개 + 옵션 1개)

| # | 키 | 값 | 노출 | 발급/참조처 |
|---|----|-----|------|-------------|
| 1 | `REPLICATE_API_TOKEN` | `r8_…` 40자 | **server-only** (`NEXT_PUBLIC_*` 절대 금지) | https://replicate.com/account/api-tokens (또는 `../ductcanvas/.env.local`과 동일 키 — PRD §최종 결과물에 공유 허용 명시) |
| 2 | `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIza…` 39자 | client | https://console.firebase.google.com/u/1/project/crispy-web/settings/general → snapmany web app → SDK 설정 및 구성 |
| 3 | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `crispy-web.firebaseapp.com` | client | 동일 |
| 4 | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `crispy-web` | client | 동일 |
| 5 | `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:260542533832:web:…` 37자 | client | 동일 |
| 6 | `NEXT_PUBLIC_APP_ENV` (선택) | `production` | client | — (수동 지정, 클라이언트 환경 분기용) |

값은 `/Users/izowooi/git/crispy-web/snapmany/.env.local`에 이미 모두 채워져 있다 (Phase 1 architect가 작성, `.gitignore`로 보호). 대시보드 입력 시 이 파일에서 복붙.

**보안 가드:**
- `REPLICATE_API_TOKEN`은 절대로 `NEXT_PUBLIC_*` 접두어를 붙이지 말 것. Cloudflare 대시보드의 환경변수 추가 폼에서 키 이름을 그대로 `REPLICATE_API_TOKEN`으로 입력.
- Cloudflare는 환경변수에 "Encrypt" 옵션을 제공. `REPLICATE_API_TOKEN`은 반드시 Encrypted로 저장 권장.

---

## 6. 잠재 이슈 / 운영 메모

### 6.1 Edge runtime 제약 (현재 미문제, 향후 작업 시 주의)
- `src/app/api/generate/route.ts`는 `export const runtime = 'edge';`로 고정. Node 빌트인(`fs`, `path`, `crypto.createHash`, `Buffer`) 사용 불가.
- 현재 코드(Phase 3 R2 backend)는 이 제약을 준수 — base64 디코딩은 `atob`/`Uint8Array` 사용, Replicate SDK는 edge 호환.
- Phase 6 또는 향후 기능 추가 시 이 제약을 깨면 `pages:build`는 통과해도 런타임에서 500.

### 6.2 Cloudflare 무료 플랜 제한
- Workers 무료 플랜: 100,000 requests/day, 10ms CPU time per request (burst).
- **주의**: `/api/generate`는 Replicate API 호출(외부 fetch)로 평균 5~30초 소요. Cloudflare Workers의 **CPU time**은 동기 작업만 카운트되고 외부 fetch 대기는 wall time(50ms~30s 가능)이라 무료 플랜으로도 동작 가능하지만, 동시 연결 1000개 제한이 있으므로 burst 사용자 동시 폭발 시 502 가능.
- MVP는 트래픽 미미 예상 → 무료 플랜으로 시작. 운영 중 한계 도달 시 Paid 플랜($5/month) 전환.

### 6.3 next-on-pages deprecated 경고
- Phase 2에서 관찰된 `@cloudflare/next-on-pages@1.13.16` deprecation 경고는 빌드 차단 아님. Cloudflare가 OpenNext로 이행 권장 중. 모노레포 다른 프로젝트도 동일 상태이므로 일관성 유지를 위해 현재 버전 유지.
- 향후 마이그레이션 옵션: `@opennextjs/cloudflare`. Phase 2 architect §2.1에 기록.

### 6.4 Next.js 15.5.2 CVE-2025-66478
- Phase 2에서 관찰. 미들웨어 미사용·서버 컴포넌트 미사용이라 영향 미미. 모노레포 표준 핀과 일관성 유지를 위해 현재 버전 유지. 패치 버전 마이그레이션은 사용자 결정.

### 6.5 Firebase Remote Config 콘솔 입력 (선택)
- 코드는 `DEFAULT_CONFIG`(`src/lib/remoteConfig.ts`)를 fallback으로 사용하므로 RC 콘솔이 비어 있어도 정상 동작.
- 사용자가 운영 중 활성 스타일이나 maintenance mode를 조작하고 싶을 때만 Firebase Console → crispy-web → Remote Config에서 8개 키를 추가:
  - `enabled_styles`, `default_style_count`, `max_upload_size_mb`, `maintenance_mode`, `replicate_model_by_style`, `show_beta_styles`, `ui_copy`, `style_order`
  - 정확한 default 값과 타입은 `_workspace/00_architect_decisions.md` §5 참조.

### 6.6 차단 이슈
**없음.** 빌드 PASS, 산출물 정상, 코드 무수정, 회귀 0.

---

## 7. Phase 5-B qa로 전달

- Phase 5-B qa는 이 산출물을 받아 **최종 시크릿 grep + 커밋·푸시 직전 가드**를 수행한다.
- 검증 포인트:
  - (1) `.env.local` / `.env.*` 가 `git status`에 절대 등장하지 않을 것.
  - (2) `_workspace/`는 추적 유지(감사 증거), 단 평문 시크릿 포함 금지.
  - (3) `.vercel/output/` 은 `.gitignore`로 차단되어 있어 커밋 대상 아님.
  - (4) `.playwright-mcp/`는 본 Phase에서 추가된 `.gitignore` 패턴으로 차단되어 있어 커밋 대상 아님.
  - (5) README의 환경변수 표가 `.env.example`과 일치.
- qa 통과 시 오케스트레이터가 `git add` / `git commit` / `git push` 수행.

---

## 8. 변경 이력

| 일시 | 변경자 | 변경 내용 |
|------|--------|----------|
| 2026-05-12 | architect (Phase 5-A) | 최초 작성. `.gitignore`에 `.playwright-mcp/` 추가. README 9 섹션 완성본 작성(74줄 → 약 165줄). `npm run pages:build` 클린 재실행 — 1.8MB / 37 files / Edge Function 1 / Prerendered 4 / Static 24. 코드 무수정. 회귀 0. |
