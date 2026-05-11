# Phase 5-B — QA 최종 게이트 (커밋·푸시 직전)

생성일: 2026-05-12 (Phase 5-B)
검증자: qa 서브 에이전트 (model: opus)
선행 산출물:
- `_workspace/04_qa_integration.md` (Phase 4 5/5 PASS)
- `_workspace/05_architect_deploy.md` (Phase 5-A: .gitignore 보강 + README 9 섹션 + pages:build 1.8MB/37 files)

---

## A. 풀 파이프라인 + pages:build (재실행)

| # | 명령 | 결과 | 비고 |
|---|------|------|------|
| 1 | `npm run typecheck` | **PASS** (exit 0) | tsc --noEmit, 출력 없음 |
| 2 | `npm run lint` | **PASS** (exit 0) | eslint flat config, 출력 없음 |
| 3 | `npm run test` | **PASS** (exit 0) | **12 files / 116 tests / 0 fail / 909ms** — R3·Phase4의 116과 정확히 일치 |
| 4 | `npm run build` | **PASS** (exit 0) | Next 15.5.2, `○ /` 21.8 kB · `○ /_not-found` 993 B · `ƒ /api/generate` 123 B edge dynamic |
| 5 | `npm run pages:build` | **PASS** (exit 0) | @cloudflare/next-on-pages v1.13.16. Edge Function 1(`/api/generate`) + Prerendered 4(`/`, `/_not-found`, `/_not-found.rsc`, `/index.rsc`) + Static 24. `_worker.js/index.js` 생성. |

**5/5 PASS.** Phase 4 결과와 비트 단위로 동일 (회귀 0).

---

## B. 시크릿 종합 grep

명령:
```
grep -rEHn 'r8_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{30,}|(sk-|sk_live_|sk_test_)[A-Za-z0-9]{20,}' \
  src/ .claude/ docs/ _workspace/ README.md *.ts *.mjs *.json *.jsonc .env.example .gitignore
```

결과: **매칭 0건** (exit=1).

- `r8_…` Replicate 토큰 패턴: 0
- `AIza…` Firebase API key 패턴: 0
- `sk-` / `sk_live_` / `sk_test_` OpenAI/Stripe 패턴: 0

소스 코드·문서·하네스 산출물·환경변수 템플릿·gitignore 어느 곳에도 평문 시크릿이 없다. **B PASS.**

---

## C. `.gitignore` 정합성

| 요구 | 결과 | 위치/패턴 |
|------|------|----------|
| `.env`, `.env.local`, `.env.production` 차단 | **OK** | line 5 `.env` + line 6 `.env.*` (와일드카드로 `.env.local`/`.env.production`/`.env.development` 모두 커버), line 7 `!.env.example` 예외 |
| `.playwright-mcp/` | **OK** | line 25 (Phase 5-A 추가 확인) |
| `_workspace/` 미포함 (추적 유지) | **OK** | gitignore 본문에는 패턴 없음. line 2 주석에 "감사 추적용 — 깃에 포함시킨다"만 명시 |
| `node_modules/`, `.next/`, `.vercel/`, `*.log` | **OK** | line 16, 17, 18, 35 |
| `firebase-debug.log` | **OK** | line 36 `firebase-debug.log` + line 37 `firebase-debug.*.log` (이미 line 35 `*.log`로도 커버) |
| `.wrangler/` (Cloudflare 워커 캐시) | **OK** | line 19 (보너스 — 향후 wrangler 사용 시 안전) |
| `tsconfig.tsbuildinfo`, `next-env.d.ts` | **OK** | line 31-32 |

추가 검증: `git check-ignore snapmany/firebase-debug.log snapmany/.playwright-mcp snapmany/.next snapmany/.vercel snapmany/node_modules` — 모두 매칭(차단됨). **C PASS.**

---

## D. README 검증

| 요구 | 결과 |
|------|------|
| 개발 절차 (npm install ~ npm run dev) 정확성 | **OK** — L35-60에 (1) `npm install`, (2) `cp .env.example .env.local` + 채울 키 5개 명시, (3) `npm run dev` → localhost:3000, (4) 커밋 전 풀 파이프라인 5단계 |
| 배포 절차 (대시보드 업로드 5단계) | **OK** — L62-104에 (1) `npm run pages:build` 산출물 `.vercel/output/static/`, (2) Workers & Pages → Pages → Upload assets, project name `snapmany`(폴백 `snap-many`), 드래그앤드롭/zip, (3) 환경변수 6개 표, (4) Retry deployment, (5) Custom Domain |
| 환경변수 표 누락 여부 | **OK** — `.env.example` 키 6개(REPLICATE_API_TOKEN + Firebase 4개 + NEXT_PUBLIC_APP_ENV)가 README L106-117 표와 1:1 일치. 노출 범위(서버 전용/클라이언트) + 발급처 모두 명시 |
| 보안 원칙 (NEXT_PUBLIC_REPLICATE 금지) | **OK** — L119-130에 (1) `NEXT_PUBLIC_REPLICATE_*` 어떤 변형도 금지, (2) `'use client'` 파일에서 `import Replicate` 금지, (3) `process.env.REPLICATE_API_TOKEN`은 `src/app/api/**` + `src/lib/replicate.ts`만, (4) 서버 재검증(mime/size/styleId), (5) 사진 미저장 — 5개 항목 모두 명시 |
| 한국어 카피 자연스러움 | **OK** — 평이하고 군더더기 없음. 표/코드블럭/체크리스트 markdown 표준 |

**D PASS.**

---

## E. 사용자 다음 단계 안내 명확성

README만 보고 사용자가 Cloudflare Pages 대시보드에서 배포를 완성할 수 있는지 검토:

- 빌드 → 산출물 폴더 경로(`/Users/izowooi/git/crispy-web/snapmany/.vercel/output/static/`)는 README L72에 명시.
- 대시보드 메뉴 경로(Workers & Pages → Create application → Pages 탭 → Upload assets)는 L76에 명시.
- 프로젝트 이름 충돌 폴백(`snap-many`) 까지 L77에 안내.
- 환경변수 6개 모두 표(L85-92)로 정리, 노출 범위·발급 URL 포함.
- Redeploy 사유(Edge Function이 새 env 픽업)까지 L96에 설명.
- 자동화하지 않는 이유(L102-104)도 명시 — 사용자가 "왜 GitHub Actions 안 쓰지?" 의문 없이 진행 가능.

**E PASS.** 추가 보완 사항 없음. (`_workspace/05_architect_deploy.md` §4 체크리스트가 더 상세하지만, README 만으로도 완성 가능.)

---

## F. `.env.local` 안전성 (커밋 절대 금지)

```
$ git status --short snapmany | grep -E '\.env\.(local|production)'
(매칭 0건)

$ git check-ignore snapmany/.env.local
snapmany/.env.local
(exit 0 — gitignored)
```

`git status` 상의 snapmany 변경 파일은 다음 3개만:
- `M snapmany/.gitignore` (Phase 5-A: `.playwright-mcp/` 추가)
- `M snapmany/README.md` (Phase 5-A: 9 섹션 완성본)
- `?? snapmany/_workspace/05_architect_deploy.md` (Phase 5-A 신규)

`.env.local`은 한 번도 등장하지 않으며 .gitignore가 차단. **F PASS.**

---

## G. 모듈 단위 회귀 (마지막 안전망)

| 항목 | R3 기준 | Phase 5-B 측정 | 결과 |
|------|---------|---------------|------|
| vitest 통과 카운트 | 116 | **116** (12 files) | **일치** |
| pages:build Edge Function 수 | 1 (`/api/generate`) | **1** (`/api/generate`) | **일치** |
| `npm run build` routes 수 | 3 (`/`, `/_not-found`, `/api/generate`) | **3** (동일) | **일치** |
| `/` First Load JS | 123 kB | **123 kB** | **일치** |
| `/_not-found` size | 993 B | **993 B** | **일치** |
| `/api/generate` size | 123 B | **123 B** | **일치** |

**G PASS.** 코드 무수정 → 모든 메트릭이 비트 단위로 동일.

---

## 최종 판정

| 게이트 | 결과 |
|--------|------|
| A. 풀 파이프라인 + pages:build (5/5) | PASS — 116 tests / Edge 1 / Prerendered 4 / Static 24 |
| B. 시크릿 종합 grep | PASS — 매칭 0건 |
| C. .gitignore 정합성 | PASS — env/playwright-mcp/firebase-debug.log 모두 차단, _workspace는 추적 유지 |
| D. README 검증 | PASS — 개발/배포/환경변수/보안/한국어 카피 모두 충족 |
| E. 사용자 다음 단계 안내 | PASS — README 단독으로 대시보드 배포 완성 가능 |
| F. .env.local 안전성 | PASS — git status에 없음, check-ignore 매칭 |
| G. 모듈 단위 회귀 | PASS — R3/Phase4 메트릭과 비트 단위 일치 |

### **verify-and-commit 실행 가능.**

권장 커밋 메시지:
```
snapmany: 사진 다중 스타일 변환 MVP 초기 구현 (배포 가능 상태)
```

권장 스테이징 대상 (커밋 후 `git status --short` 기준):
- `snapmany/.gitignore` (M, Phase 5-A: `.playwright-mcp/` 추가)
- `snapmany/README.md` (M, Phase 5-A: 9 섹션 완성)
- `snapmany/_workspace/05_architect_deploy.md` (??, Phase 5-A 신규)
- `snapmany/_workspace/05_qa_final.md` (??, 본 산출물 신규)

오케스트레이터가 verify-and-commit 스킬 절차 4(스테이징 — 특정 파일만) 기준으로 `git add` 시 위 4개 파일만 명시.

---

## 변경 이력

| 일시 | 변경자 | 변경 내용 |
|------|--------|----------|
| 2026-05-12 | qa (Phase 5-B 최종 게이트) | 최초 작성. A 5/5 PASS (116 tests + pages:build) + B 시크릿 0건 + C gitignore 정합 + D README 5/5 + E 사용자 안내 충족 + F .env.local 안전 + G 회귀 0. **verify-and-commit 실행 가능.** 권장 커밋 메시지: "snapmany: 사진 다중 스타일 변환 MVP 초기 구현 (배포 가능 상태)". |
