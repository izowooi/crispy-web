# Phase 2 — Architect Scaffolding (snapmany)

생성일: 2026-05-12 (Phase 2)
작성자: architect 서브 에이전트 (model: opus)
선행 산출물: `_workspace/00_architect_decisions.md`

---

## 0. 작업 요약

Next.js + Tailwind v4 + TypeScript + Vitest + Cloudflare Pages(edge runtime) 보일러플레이트 생성 완료. 빌드 가능한 최소 뼈대만 작성. 컴포넌트/비즈니스 로직은 Phase 3에서 구현.

검증 게이트:
- `npm install` → 성공 (859 패키지, peer deps 경고만 있고 차단 없음)
- `npm run typecheck` → **PASS** (exit 0, 출력 없음)
- `npm run lint` → **PASS** (exit 0, 출력 없음)

`npm run test`와 `npm run build` / `npm run pages:build`는 본 Phase의 게이트가 아님 — Phase 2-B qa가 확인.

---

## 1. 생성/수정 파일 목록

### 루트 설정 파일

| 파일 | 역할 |
|------|------|
| `package.json` | 의존성 + 9개 npm 스크립트(dev/build/start/lint/typecheck/test/test:watch/pages:build/preview). **deploy 스크립트 미포함**(D3 결정: 대시보드 수동 업로드). |
| `tsconfig.json` | strict, paths `@/*` → `./src/*`, vitest globals + jest-dom 타입 포함, moduleResolution bundler. ductcanvas와 동일 톤. |
| `next.config.ts` | `images.remotePatterns`에 `replicate.delivery` 및 `pbxt.replicate.delivery` 등록 + `unoptimized: true`(edge runtime용). |
| `postcss.config.mjs` | `@tailwindcss/postcss` 단일 플러그인 (Tailwind v4). |
| `wrangler.jsonc` | `name: "snapmany"`, `compatibility_date: "2025-04-01"`, `compatibility_flags: ["nodejs_compat"]`, `pages_build_output_dir: ".vercel/output/static"`. |
| `eslint.config.mjs` | `FlatCompat` 기반(`next/core-web-vitals` + `next/typescript` extend). mojipop 동일 패턴. ductcanvas의 subpath import 방식은 ESM resolution 실패로 사용 불가 확인. |
| `vitest.config.ts` | `environment: jsdom`, globals, `setupFiles: ['./vitest.setup.ts']`, `include: ['src/__tests__/**/*.test.{ts,tsx}']`, alias `@` → `./src`, `@vitejs/plugin-react` 적용(JSX 테스트용). |
| `vitest.setup.ts` | `import '@testing-library/jest-dom/vitest';` 한 줄. |
| `.env.example` | Replicate 1개 + Firebase 4개 + APP_ENV. Cloudflare 키 2개는 주석 처리(MVP 미사용). |
| `.gitignore` | Phase 1 사전 작성본 정제: `coverage/`, `next-env.d.ts` 추가. `_workspace/`는 **추적 유지**(감사용). |
| `README.md` | 최소 골격: 개발 절차, 환경변수 표, 빌드(`pages:build`), Cloudflare 대시보드 수동 업로드 절차(4단계). 자동 배포 비사용 명시. |

### 소스 파일

| 파일 | 역할 |
|------|------|
| `src/app/layout.tsx` | 다크모드 초기화 스크립트(`localStorage.theme === 'dark'` OR `prefers-color-scheme: dark`), metadata(title/description/OG), system font. Phase 3에서 footer 등 확장. |
| `src/app/page.tsx` | `'use client'` + sticky header(SnapMany 타이틀) + 메인 컨테이너에 "UI 구현 중" 플레이스홀더. Phase 3 R3 frontend가 채움. |
| `src/app/globals.css` | **첫 줄 `@import "tailwindcss";`**. light/dark CSS 변수(오렌지 액센트 `#f97316`/`#fb923c`). `@theme inline` 블록으로 v4 토큰 정의(`--color-background`, `--color-foreground`, `--color-accent` 등). |
| `src/app/api/generate/route.ts` | **첫 줄 `export const runtime = "edge";`**. POST 핸들러는 `501 not_implemented` 반환 스텁. Phase 3 R2 backend가 구현. |
| `src/__tests__/smoke.test.ts` | Vitest 환경 검증용 스모크 테스트 2개(truthy + jsdom DOM 확인). Phase 2-B qa의 `npm run test` 게이트 통과용 최소 보증. |

---

## 2. Phase 1 결정값과의 편차 (deviations)

> Phase 1 `_workspace/00_architect_decisions.md`는 단일 진실 소스이나, Phase 2 빌드 실행 중 발견된 empirical 제약으로 인해 다음 항목들이 조정되었다. 본 문서가 보충 진실 소스로 동작한다(decisions.md는 architect 정책상 본 Phase에서 수정 금지).

### 2.1 Next.js 버전: `^16` → `15.5.2` (pinned)

- **decisions §10**: `next@^16`, `eslint-config-next@^16`
- **실제 적용**: `next@15.5.2`, `eslint-config-next@15.5.2` (ductcanvas/mojipop과 동일하게 정확한 핀)
- **사유**: `@cloudflare/next-on-pages@1.13.16`의 peer dependency 상한이 `next@<=15.5.2`. Next 16 설치 시 `ERESOLVE` 차단. `--legacy-peer-deps`로 우회 가능하나, `@cloudflare/next-on-pages`는 Next 빌드 출력을 parse해 edge 번들을 만들기 때문에 미검증 출력 포맷으로 진행하면 `pages:build` 단계에서 깨질 위험이 매우 높음. ductcanvas와 mojipop이 모두 15.5.2로 정상 빌드/배포되는 empirical 증거 우선.
- **후속 조치**: Phase 5 architect 또는 향후 마이그레이션 시 `@cloudflare/next-on-pages`(혹은 후속 `@opennextjs/cloudflare`)가 Next 16을 공식 지원할 때 재시도. 사용자 메모리의 "Next.js 16.x" 일반 표준은 인지하나, snapmany의 **배포 타깃(Cloudflare Pages) 제약이 더 강한 constraint**.

### 2.2 React 버전: `^19` → `19.2.4` (pinned)

- `react@19.2.4`, `react-dom@19.2.4` — ductcanvas/mojipop과 동일 핀.

### 2.3 Vitest 버전: `^1` → `^2` (`vitest@2.1.9`)

- **decisions §10**: `vitest@^1`
- **실제 적용**: `vitest@^2`, `@vitest/coverage-v8@^2`
- **사유**: `@vitejs/plugin-react@^4`는 `vite@^7`을 가져오는데 `vitest@^1`은 내부적으로 `vite@^5`를 번들. 두 vite 버전이 nested install되어 TypeScript에서 `PluginOption` 타입 충돌 발생(`vitest.config.ts(6,13): error TS2769`). `vitest@^2`로 올리면 plugin-react가 vite@5로 자동 deduped되어 해결. `vitest@^2`는 vitest 1.x와 API 호환(`describe/it/expect`, jsdom env, setup files 모두 동일) — 단위 테스트 작성에 영향 없음.

### 2.4 ESLint 설정 패턴: subpath import → FlatCompat

- **decisions §10**: ductcanvas 톤(`import nextVitals from "eslint-config-next/core-web-vitals"`)
- **실제 적용**: mojipop의 `FlatCompat` 패턴
- **사유**: `eslint-config-next@15.5.2`는 ESM subpath exports를 정의하지 않아 Node가 `.js` 확장자 없이 import 불가(`ERR_MODULE_NOT_FOUND`). `.js`를 붙여도 모듈이 객체(legacy `.eslintrc` 포맷)라 spread 불가(`TypeError: nextVitals is not iterable`). **ductcanvas의 eslint.config.mjs도 실제로는 깨진 상태**(빈 출력만 보고 통과로 오인). mojipop의 `FlatCompat` 패턴은 정상 동작 확인. 이것이 모노레포 표준이 되어야 함.

### 2.5 `firebase` 버전

- **decisions §10**: `firebase@^10` 또는 `^11`
- **실제 적용**: `firebase@^11.0.0` (Remote Config v11)

### 2.6 `@types/node` 버전

- **decisions §10**: `@types/node@^22`
- **실제 적용**: `@types/node@^22` (Node 22.19.0 환경과 일치)

---

## 3. 검증 결과 상세

### 3.1 `npm install`

```
added 859 packages, and audited 860 packages in ~30-53s
27-28 vulnerabilities (2 low, 16-17 moderate, 7 high, 2 critical)
```

- npm warn: `@cloudflare/next-on-pages` deprecated 안내(OpenNext 권장) → MVP에서는 무시. Phase 5에서 검토 가능.
- `next@15.5.2` CVE-2025-66478 보안 경고 존재. 모노레포 다른 프로젝트도 동일 상태. 미들웨어 미사용·서버 컴포넌트 없음 → MVP 범위 영향 미미. 추후 사용자 결정으로 패치 버전 마이그레이션.
- peer deps 차단 0건(다운그레이드 후).

### 3.2 `npm run typecheck`

```
> snapmany@0.1.0 typecheck
> tsc --noEmit
```

exit 0, 출력 없음 → **PASS**.

### 3.3 `npm run lint`

```
> snapmany@0.1.0 lint
> eslint
```

exit 0, 출력 없음 → **PASS**. (FlatCompat + `next/core-web-vitals` + `next/typescript` 적용. `.next`, `.vercel`, `coverage` ignore.)

---

## 4. Phase 3 (R1) 진입자가 알아야 할 점

### 4.1 Path alias 매핑

- `@/*` → `./src/*` (tsconfig + vitest 양쪽 모두). `import { STYLES } from '@/config/styles';` 같은 형태 사용 가능.

### 4.2 Vitest 환경

- 테스트 파일은 **반드시** `src/__tests__/**/*.test.{ts,tsx}` 경로에 둘 것. include 패턴 외 위치는 무시됨.
- `globals: true`이므로 `import { describe, it, expect } from 'vitest'`는 선택사항. 단 명시적 import가 더 안전.
- jest-dom 매처(`.toBeInTheDocument()` 등)는 setup에서 자동 등록됨.
- JSX/TSX 테스트는 `@vitejs/plugin-react`로 변환됨 — 별도 설정 불필요.

### 4.3 환경변수 사용 규칙

- 서버 전용: `process.env.REPLICATE_API_TOKEN`을 `src/app/api/**` 또는 `src/lib/` 서버 모듈에서만 읽기. 클라이언트 컴포넌트(`'use client'`)에서 절대 import 금지.
- 클라이언트 노출: `process.env.NEXT_PUBLIC_FIREBASE_*` 4개는 어디서나 가능.
- `NEXT_PUBLIC_REPLICATE_*` 어떤 변형도 금지(qa grep으로 잡힘).

### 4.4 Edge runtime 가드레일

- `src/app/api/generate/route.ts` 최상단 `export const runtime = "edge";` **절대 삭제 금지**. Phase 3 R2 backend가 본문을 채울 때도 이 한 줄은 보존.
- Node 빌트인(`fs`, `path`, `crypto.createHash`, `Buffer.from(...,'base64')`) 사용 금지. base64는 `atob`/`Uint8Array` 사용.

### 4.5 Tailwind v4 토큰

- `globals.css`의 `@theme inline`에 정의된 토큰만 Tailwind 유틸로 자동 노출. 예: `bg-background`, `text-foreground`, `border-border`, `text-muted`, `bg-card`, `text-accent`.
- 추가 색상이 필요하면 `--color-*` 변수를 light/dark 양쪽 + `@theme inline` 3곳에 모두 추가해야 함.
- 오렌지 액센트: light `#f97316`, dark `#fb923c`.

### 4.6 ESLint 환경

- `FlatCompat` 기반이므로 새로운 룰 추가 시 `compat.extends(...)` 다음 plain object로 push.
- ignore 패턴은 마지막 객체의 `ignores` 배열로 통일.

### 4.7 Cloudflare 빌드 사전 점검

- Phase 2-B qa가 `npm run pages:build`로 검증 예정. `@cloudflare/next-on-pages`는 `next build`를 먼저 실행하므로 Next 빌드 자체가 깨지면 거기서 실패. 현재 스텁만 있어 통과해야 정상.
- `pages_build_output_dir = .vercel/output/static`은 next-on-pages가 생성하는 표준 경로. 변경 금지.

---

## 5. Phase 2-B qa 진입 가능 여부

**즉시 진입 가능.**

- typecheck/lint 둘 다 통과 — qa는 `npm run test` + `npm run build` + `npm run pages:build` 게이트 검증만 추가 수행.
- 스모크 테스트가 이미 1개 있어 vitest 환경이 동작함을 보장.
- 코드는 뼈대만 존재(컴포넌트 0개, API는 501 스텁). 빌드는 컴파일 차원에서 무조건 통과해야 함.

잠재적 위험:
- `@cloudflare/next-on-pages@1`의 deprecation 경고가 있으나 정상 동작. `pages:build` 실패 시 OpenNext 마이그레이션 검토 필요(Phase 5 또는 사용자 협의).
- 보안 vulnerabilities(특히 next CVE)는 운영 결정 사항으로 Phase 2-B 차단 사유 아님.

---

## 6. 변경 이력

| 일시 | 변경자 | 변경 내용 |
|------|--------|----------|
| 2026-05-12 | architect (Phase 2) | 최초 작성. 15개 보일러플레이트 파일 생성. Next 16→15.5.2 / Vitest 1→2 / ESLint subpath→FlatCompat 편차 발생. typecheck/lint PASS. |
