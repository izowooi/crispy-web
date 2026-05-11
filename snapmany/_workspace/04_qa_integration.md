# Phase 4 — 통합 QA 결과 (snapmany)

생성일: 2026-05-12 (Phase 4)
검증자: qa 서브 에이전트 (model: opus)
선행 산출물:
- `_workspace/00_architect_decisions.md` §3 (15 스타일), §5 (RC 8키), §6 (API 계약), §8 (보안)
- `_workspace/02_qa_gate.md` (Phase 2 게이트)
- `_workspace/03_R1_qa.md` / `03_R2_qa.md` / `03_R3_qa.md` (모듈별 incremental)
- `_workspace/03_R{1,2,3}_{backend,frontend}_done.md`

---

## A. 풀 파이프라인 (재실행 — Phase 4 종합 게이트)

| # | 명령 | 결과 | 비고 |
|---|------|------|------|
| 1 | `npm run typecheck` | **PASS** (exit 0) | tsc --noEmit, 출력 없음 |
| 2 | `npm run lint` | **PASS** (exit 0) | eslint flat config, 출력 없음 |
| 3 | `npm run test` | **PASS** | **12 files / 116 tests / 0 fail / 993ms** — R3 qa의 116과 정확히 일치 |
| 4 | `npm run build` | **PASS** | Next 15.5.2, `○ /` 21.8 kB · `ƒ /api/generate` edge dynamic |
| 5 | `npm run pages:build` | **PASS** | @cloudflare/next-on-pages v1.13.16. Edge Function 1(`/api/generate`) + Prerendered 4. `_worker.js/index.js` 생성. |

**5/5 PASS.** 116 테스트 회귀 0.

---

## B. 5개 교차 검증

### B1. 요청 body 키 ↔ route handler 읽기
- `src/app/page.tsx:136` → `body: JSON.stringify({ image: imageDataUrl, styleId })`
- `src/app/api/generate/route.ts:88-89` → `(body as Record<string, unknown>).image` / `.styleId`
- → **`image` / `styleId` 두 키 완전 일치. PASS.**

### B2. 응답 필드 ↔ page.tsx 응답 처리
- route.ts 반환: `{ ok, styleId, imageUrl }` (200) / `{ ok, styleId, error }` (4xx/5xx) — line 7-8 타입 + line 134/137/141/145 반환부 일치.
- page.tsx 소비: `json.ok` 분기 (line 143) → `json.imageUrl` (line 150) / `json.error` (line 162).
- `styleId` echo는 클라이언트가 itemId/styleId를 보유하므로 미사용이지만 무해.
- → **shape 정합 PASS.**

### B3. styleId 집합 교차 (STYLES ↔ STYLE_PROMPTS ↔ enabled_styles ↔ style_order ↔ architect)
- `src/config/styles.ts` STYLES: **15개** (id_photo_basic, passport, business_profile, watercolor, oil_painting, 3d_character, chibi_sticker, anime_pastel, manga_inking, bw_studio, marble_bust, kbeauty_glow, editorial_glam, pixel_8bit, lowpoly_geo).
- `src/lib/stylePrompts.ts` STYLE_PROMPTS keys: **15개 동일 집합** (diff 0).
- `src/lib/remoteConfig.ts` `enabled_styles` / `style_order` 기본값 = `STYLE_IDS` (`= STYLES.map(s => s.id)`) — 단일 소스 import.
- backend route.ts `isKnownStyleId` = `STYLES` 기반 `STYLE_ID_SET.has(id)` — 단일 소스.
- architect decisions §3 "15개" 명세와 정합.
- 주의: 카테고리 ID 7개(`id_photo`, `illust_paint`, `character_figure`, `anime_manga`, `bw_sculpture`, `glamour_beauty`, `art_experimental`)와 스타일 ID 15개는 별도 네임스페이스이며 충돌·중복 없음(`StyleCategoryId` 유니언 타입으로 분리).
- → **3-way 집합 일치 PASS.**

### B4. RC 키 교차 (DEFAULT_CONFIG ↔ getValue 호출 ↔ 사용처)
- `DEFAULT_CONFIG` 8개 키 (line 23-37): `enabled_styles`, `default_style_count`, `max_upload_size_mb`, `maintenance_mode`, `replicate_model_by_style`, `show_beta_styles`, `ui_copy`, `style_order`.
- `getValue(rc, "...")` 호출 8개 (line 94-113): 위 8개 모두 호출됨. asString×4(JSON 필드), asNumber×2, asBoolean×2.
- 활성 소비처 (page.tsx + StylePicker + UploadPanel): `enabled_styles`(StylePicker), `style_order`(StylePicker), `maintenance_mode`(배너+CTA disable), `max_upload_size_mb`(UploadPanel), `ui_copy.{title,subtitle,generateButton}`(헤더+CTA).
- 의도적 미소비 3개: `default_style_count`, `show_beta_styles`, `replicate_model_by_style` — architect §5 / R2 backend §6 / R3 frontend §5에 모두 명시된 MVP 미사용. RC 인프라는 갖추되 UI/서버 wire-up은 보류 — v1.1 확장 포인트.
- → **8/8 wire-up + 의도적 미소비 정합 PASS.**

### B5. env 키 교차 (.env.example ↔ process.env.*)
- `.env.example` 키 6개: `REPLICATE_API_TOKEN`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_APP_ENV`.
- 코드 `process.env.*` 참조 5개: 위 첫 5개와 정확히 일치.
- 차집합: example only = `NEXT_PUBLIC_APP_ENV` (메타/문서용, 코드 미참조 — 무해). code only = **없음**.
- → **드리프트 0건. PASS.**

---

## C. 보안 grep 최종 (R1+R2+R3 합본)

| # | 항목 | 결과 |
|---|------|------|
| C1 | 클라이언트(`src/components`/`src/app/{page,layout}.tsx`)에서 `replicate` import / `@/lib/replicate` / `@/lib/stylePrompts` | **매칭 0건** |
| C2 | `NEXT_PUBLIC_REPLICATE*` 어떤 변형이든 src/ 전수 | **매칭 0건** |
| C3 | `process.env.REPLICATE_API_TOKEN` 위치 | 1건만: `src/lib/replicate.ts:27` (server-only, route.ts에서만 import) |
| C4 | 평문 시크릿 (`r8_…`/`AIza…`/`sk-…`/`sk_live_…`/`sk_test_…`) src/ 전수 | **매칭 0건** |
| C5 | `firebase-admin` import | **매칭 0건** (edge 호환 클라이언트 SDK만) |
| C6 | `export const runtime = 'edge'` in `src/app/api/**/route.ts` | **1건** `src/app/api/generate/route.ts:1` (정확히 1개 route handler에 정확히 1번) |

**6/6 PASS.** R3와 동일 결과 유지.

---

## D. Playwright E2E (mock fetch flow)

Playwright MCP가 sub-agent에 노출됨 확인. dev 서버를 `PORT=3010 npm run dev` 백그라운드로 부팅(998ms ready) → 브라우저 navigate → fetch monkey-patch → 시나리오 수행.

### D-1. 시나리오 A — 단일 스타일 + mock 성공
- File upload (4×4 PNG, 74B → canvas 재인코딩 후 614B WEBP) → `business_profile` 선택 → "생성하기" 클릭.
- mockCalls = `[{ styleId: "business_profile" }]`, 응답 ok:true + imageUrl.
- UI: 결과 카드 1개에 완성 이미지(alt="비즈니스 프로필"), 다운로드 + 복사 버튼 노출.
- → **PASS** (요청 body 키 정합, 응답 매핑, 완료 UI 렌더).

### D-2. 시나리오 B — 3 스타일 혼합 (passport는 실패 mock)
- 동일 업로드 → `id_photo_basic` + `passport` + `business_profile` 선택 (3개 선택됨 확인) → 생성.
- mockCalls = 3건 (`id_photo_basic`, `passport`, `business_profile`) — **1요청 = 1스타일** 정확.
- UI 결과:
  - 일반 증명사진: 완료, 미리보기 이미지 + 다운로드/복사 버튼.
  - 여권사진: **실패** ("잘못된 이미지 형식입니다" + "다시 생성" 버튼).
  - 비즈니스 프로필: 완료, 미리보기 + 다운로드/복사.
- downloadBtns=2, retryBtns=1, completed img(alt 스타일 라벨)=2.
- → **실패 비전파 검증 PASS.** 한 스타일의 4xx가 다른 카드에 영향 없음. `Promise.allSettled` 시맨틱 실제로 동작.

스크린샷: `_workspace/04_qa_screenshots/e2e_mixed_result.png`.

E2E 결과: **SUCCESS.**

dev 서버 정리: `pkill -f "next dev"` 실행, `ps aux | grep next dev` 빈 결과 확인.

운영 메모(차단 아님): Next.js Fast Refresh가 첫 시도에서 fetch patch를 무효화한 사례 1건. 두 번째 시도에서 `Object.defineProperty(globalThis, 'fetch', …)` + `Object.defineProperty(window, 'fetch', …)` 양면 patch로 안정화. Phase 5에서는 정적 빌드 산출물(`wrangler pages dev`)로 검증하므로 HMR 영향 없음.

---

## E. 결함 목록 + 책임 에이전트

**없음.** A~D 모든 게이트 PASS, 회귀 0, mismatch 0.

검토 중 발견한 가짜 경보 1건(qa 자체 — 보고용):
- 초기 grep 패턴 `id: ['\"][a-z0-9_-]+['\"]`이 `category: "id_photo"` 같은 카테고리 필드도 잡아서 styleId 22개로 오인. 정밀 grep(`^    id: "..."`)으로 재검증한 결과 styleId = 15개로 STYLE_PROMPTS와 정합 확인. **실제 결함 아님, 책임 에이전트 없음.**

R3 qa 보고서가 "15개"라 명시한 것이 정확. 본 검증으로 재확인.

---

## F. 모노레포 일관성 (보너스)

| 항목 | ductcanvas | mojipop | snapmany | 비고 |
|------|-----------|---------|----------|------|
| next | 15.5.2 | 15.5.2 | 15.5.2 | 정합 (Cloudflare next-on-pages peer 제약) |
| react / react-dom | 19.2.4 | 19.2.4 | 19.2.4 | 정합 |
| replicate | ^1.4.0 | ^1.4.0 | ^1.4.0 | 정합 |
| edge runtime | api/* | api/* | api/generate | 모두 동일 패턴 |
| ESLint | FlatCompat | FlatCompat | FlatCompat | mojipop 패턴으로 정렬 |
| Tailwind | v4 `@import "tailwindcss"` | v4 | v4 | 정합 |

의문 사항: 없음. snapmany는 ductcanvas/mojipop와 핀·구조·보안 패턴 모두 일관.

---

## 최종 판정

| 게이트 | 결과 |
|--------|------|
| A. 풀 파이프라인 5/5 (pages:build 포함) | PASS — 116 tests |
| B. 5개 교차 검증 (body·response·styleId·RC·env) | PASS — 0 mismatch |
| C. 보안 grep 6/6 | PASS — 클라이언트 위험 노출 0, edge runtime 1건 정상 |
| D. Playwright E2E (mock flow) | SUCCESS — 3 스타일 혼합 시나리오, 실패 비전파 검증 |
| E. 결함 목록 | 없음 |
| F. 모노레포 일관성 | 정합 |

### **Phase 5 진입 허가.**

Phase 5에서 architect/qa가 진행할 작업:
- `npx wrangler pages dev .vercel/output/static` 로컬 부팅 검증.
- README 배포 절차(.env 세팅 + Cloudflare 대시보드 가이드) 검증.
- 최종 시크릿 grep + 커밋·푸시 직전 가드.
- 운영 메모 (Phase 4 D-2에서 관찰): MVP에서 `default_style_count` / `show_beta_styles` / `replicate_model_by_style` 3개 RC 키는 의도적 미소비 상태로 유지. v1.1 확장 포인트로 문서화.

---

## 변경 이력

| 일시 | 변경자 | 변경 내용 |
|------|--------|----------|
| 2026-05-12 | qa (Phase 4 통합 QA) | 최초 작성. 5/5 파이프라인 + 6/6 보안 + 5/5 교차 검증 + Playwright E2E mock flow SUCCESS(3 스타일 혼합 + 실패 비전파). 결함 0건. Phase 5 진입 허가. |
