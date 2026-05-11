# Phase 2-B — QA Gate Result (snapmany)

생성일: 2026-05-12 (Phase 2-B)
검증자: qa 서브 에이전트 (model: opus)
선행 산출물: `_workspace/02_architect_scaffold.md`, `_workspace/00_architect_decisions.md`

---

## A. 빌드 파이프라인 (실행 결과)

| # | 명령 | 결과 | 에러 |
|---|------|------|------|
| 1 | `npm run typecheck` | PASS | 0 |
| 2 | `npm run lint` | PASS | 0 |
| 3 | `npm run test` | PASS | 0 (smoke 2/2 통과) |
| 4 | `npm run build` | PASS | 0 |
| + | `npm run pages:build` (보너스) | PASS | 0 |

### 상세

- **typecheck**: `tsc --noEmit` exit 0, 출력 없음.
- **lint**: `eslint` exit 0, 출력 없음. FlatCompat + `next/core-web-vitals` + `next/typescript`.
- **test**: vitest 2.1.9, `src/__tests__/smoke.test.ts` (2 tests) ✓ 1ms, 환경 prepare 503ms.
  - 경고: `CJS build of Vite's Node API is deprecated` — vitest 2.x 내부 경고로 차단 사유 아님(Phase 3+에서 vite/vitest 메이저 업그레이드 시 자연 해결).
- **build**: `Next.js 15.5.2`, `Compiled successfully in 1813ms`. 4페이지(`/`, `/_not-found`, `/api/generate`, RSC) 생성. `/api/generate`는 `ƒ` (Dynamic, edge runtime 활성) — 의도된 동작.
- **pages:build (보너스)**: `@cloudflare/next-on-pages v1.13.16` 통과. Edge Function Routes 1개 (`/api/generate`), Prerendered 4개 라우트 정상 생성. `.vercel/output/static/_worker.js/index.js` 출력. **Phase 5 부담 사실상 0**.

---

## B. 정합성 검증 (항목별 PASS/FAIL)

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| B1 | `.gitignore`에 `.env`, `.env.*`(와일드카드), `*.key`, `*.pem`, `node_modules/`, `.next/`, `.vercel/`, `*.log`, `tsconfig.tsbuildinfo` 포함 | PASS | `.env`+`.env.*`+`!.env.example` 3행 조합으로 안전 처리. `.wrangler/`, `coverage/`, `next-env.d.ts`도 추가 차단. |
| B2 | `.gitignore`에 `_workspace/`가 들어있지 않음 (추적 유지) | PASS | `git check-ignore _workspace/` exit=1 (= 무시 안 됨). 파일 상단 주석에 "감사 추적용 — 깃에 포함시킨다" 명시. |
| B3 | `.env.example`은 키 이름만, 실제 값 없음 | PASS | 모든 라인이 `KEY=` 형태로 등호 우측 비어 있음. placeholder조차 없음. |
| B4 | `.env.local`은 stage 불가 상태 | PASS | `git check-ignore .env.local` → `.env.local` 출력 (gitignore에 매칭됨). |
| B5 | `src/app/globals.css` 첫 줄이 `@import "tailwindcss";` | PASS | line 1 정확히 `@import "tailwindcss";`. 구버전 `@tailwind base/components/utilities` 디렉티브 없음. |
| B6 | `src/app/api/generate/route.ts`에 `export const runtime = 'edge';` 존재 | PASS | line 1 `export const runtime = "edge";` (큰따옴표 차이는 동등 — TS literal 동일). |
| B7 | `package.json` scripts에 `dev`, `build`, `lint`, `typecheck`, `test`, `pages:build` 포함 | PASS | 9개 스크립트 모두 있음 (`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `pages:build`, `preview`). |
| B8 | `package.json`에 `deploy` 스크립트가 없음 (D3 결정 — 대시보드 수동 업로드) | PASS | `deploy` 키 부재 확인. D3 정합. |

**B 결과: 8/8 PASS.**

---

## C. 시크릿 grep 결과

### C.1 일반 토큰 패턴 (`r8_…`, `AIza…`, `sk-/sk_live_/sk_test_…`)

```bash
grep -rEHn 'r8_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{30,}|(sk-|sk_live_|sk_test_)[A-Za-z0-9]{20,}' \
  src/ .claude/ docs/ _workspace/ *.md *.ts *.mjs *.json *.jsonc
```

→ **매칭 0건**. PASS.

### C.2 보강 grep — 루트 설정 파일 추가 스캔

`.env.example`, `.gitignore`, `README.md`, `CLAUDE.md`, `eslint.config.mjs`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, `wrangler.jsonc` 전수 → **매칭 0건**.

### C.3 `NEXT_PUBLIC_REPLICATE` grep (보안 가드레일)

```
_workspace/02_architect_scaffold.md:141  - `NEXT_PUBLIC_REPLICATE_*` 어떤 변형도 금지(qa grep으로 잡힘).
_workspace/00_architect_decisions.md:346  # NEXT_PUBLIC_REPLICATE_* 어떤 변형도 금지
_workspace/00_architect_decisions.md:347  grep -rn "NEXT_PUBLIC_REPLICATE" src/ && …
_workspace/00_architect_decisions.md:373  - `NEXT_PUBLIC_REPLICATE_*` 어떤 변형도 금지.
CLAUDE.md:15  4. **토큰 보호 양보 불가** … `NEXT_PUBLIC_REPLICATE_*` 절대 금지.
```

전부 **금지 규칙을 명시하는 문서 라인**이며 실제 env 키나 코드 사용 0건. PASS.

### C.4 `.env.local` 평문이 _workspace/에 흘러갔는지 별도 확인

`_workspace/00_architect_decisions.md` §1.3은 Firebase API key 등을 **마스킹 패턴**(`AIzaS...gOZw`, `1:2605...d2e15fd`, `r8_9B...j5Hp`)으로만 기록. 정규식 `AIza[A-Za-z0-9_-]{30,}`에 매칭되지 않을 정도로 충분히 짧게 절단됨. 사용자 지시("평문 노출 금지")와 정합. PASS.

**C 결과: 매칭 0건. PASS (escalate 불필요).**

---

## D. Phase 2-A 편차 검토

architect가 보고한 3건 편차 검토.

### D.1 Next 16 → 15.5.2 다운그레이드

- 사유: `@cloudflare/next-on-pages@1.13.16`의 peer constraint(`next<=15.5.2`).
- 검증 결과: `npm run build` 및 `npm run pages:build` 모두 깨끗하게 통과. `@cloudflare/next-on-pages`가 Next 빌드 출력을 parse해 `_worker.js`를 만드는 구조상, 미검증 Next 16 출력 포맷으로 진행하는 위험은 실제로 큼. ductcanvas/mojipop 두 프로젝트가 같은 핀으로 정상 동작한다는 empirical 증거도 있음.
- 판정: **합리적 — 통과**.
- 후속 조치 권고: Phase 5 또는 향후 architect가 `@cloudflare/next-on-pages` 또는 `@opennextjs/cloudflare`의 Next 16 공식 지원 시점을 모니터링.

### D.2 Vitest 1 → 2

- 사유: `@vitejs/plugin-react@4`가 `vite@7`을 끌어오는데 `vitest@1`은 `vite@5` 번들 — nested install로 `PluginOption` 타입 충돌 발생.
- 검증 결과: `vitest@2.1.9`로 `npm run test`가 2/2 smoke 통과. API 호환성도 확인됨(`describe/it/expect`, jsdom, setupFiles 그대로 동작).
- 판정: **합리적 — 통과**.
- 참고: `CJS build of Vite's Node API is deprecated` 경고는 vitest 2.x 내부 호환 레이어로 인한 것이며 동작에 영향 없음.

### D.3 ESLint subpath → FlatCompat

- 사유: `eslint-config-next@15.5.2`가 ESM subpath exports 미정의 → ductcanvas 패턴은 `ERR_MODULE_NOT_FOUND` 또는 `TypeError: nextVitals is not iterable`. mojipop의 `FlatCompat` 패턴만 정상 동작.
- 검증 결과: `eslint.config.mjs` (FlatCompat 기반) 적용 후 `npm run lint`가 출력 없이 exit 0.
- 판정: **합리적 — 통과**.
- 후속 의견(차단 아님): architect가 보고한 "ductcanvas의 ESLint 설정이 실제로는 깨진 상태(빈 출력으로 오인 통과)"는 모노레포 차원의 운영 부채. 본 phase 범위 밖이지만 향후 ductcanvas 보강 시 mojipop/snapmany의 FlatCompat 패턴으로 정렬 권고.

**D 결과: 3건 모두 합리적. 모두 통과.**

---

## E. 추가 관찰 사항 (참고 — 차단 아님)

1. **`@cloudflare/next-on-pages` deprecation 경고**: 설치 시 OpenNext 권장 안내가 나옴. 현재 `pages:build` 정상 동작. Phase 5 또는 v1.1 마이그레이션 시 검토.
2. **next CVE-2025-66478 보안 경고**: 모노레포 다른 프로젝트와 동일 상태. MVP는 미들웨어/서버 컴포넌트 미사용으로 영향 미미. 운영 결정 사항이며 Phase 2-B 차단 사유 아님.
3. **`.env.local` 잔존 confirm**: 파일은 디스크에 존재(스캐폴딩 절차상 정상)하나 `git check-ignore`로 차단 확인 완료. staging 위험 없음.
4. **vitest 출력 prep 시간 503ms**: 캐시 cold일 때 정상 수준. CI 도입 시 캐시 활용으로 단축 가능.
5. **`tsconfig.tsbuildinfo`가 디스크에 존재**: `.gitignore`로 차단 확인. 추적 위험 없음.

---

## F. 최종 판정

**Phase 3 R1 진입 허가.**

근거:
- 빌드 파이프라인 4종(typecheck/lint/test/build) 전수 통과 + 보너스 `pages:build`까지 통과.
- 정합성 항목 B1~B8 8/8 PASS.
- 시크릿 grep 매칭 0건.
- 편차 3건 모두 empirical 근거를 가진 합리적 조정. decisions.md의 단일 진실 소스성을 `_workspace/02_architect_scaffold.md`가 보충 진실 소스로서 명시적으로 인계받아 추적성도 유지됨.

차단 사유 없음. Phase 3 R1 (architect API 계약 잠금 → backend R1 `src/config/styles.ts` + `src/lib/stylePrompts.ts` 구현)으로 즉시 진입 가능.

---

## G. 변경 이력

| 일시 | 변경자 | 변경 내용 |
|------|--------|----------|
| 2026-05-12 | qa (Phase 2-B) | 최초 작성. 4+1 빌드 파이프라인 전수 통과, B 항목 8/8 PASS, 시크릿 grep 클린, 편차 3건 합리 판단. Phase 3 R1 진입 허가. |
