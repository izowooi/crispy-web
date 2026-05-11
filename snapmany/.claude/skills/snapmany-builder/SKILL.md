---
name: snapmany-builder
description: snapmany 웹앱(사진 → 다중 스타일 AI 변환)을 만들거나 확장하는 메인 오케스트레이터. 4-에이전트 하이브리드 팀(architect/frontend/backend/qa)을 Phase 0~5로 운영하며 TDD를 강제한다. "snapmany 만들어줘", "스타일 추가", "API 수정", "재실행", "업데이트", "보완", "부분 수정", "다시 빌드", "테스트 추가", "버그 픽스", "배포 준비", "/api/generate", "Replicate 프록시", "Firebase RC 변경", "스타일 프리셋", "결과 갤러리" 등 snapmany 도메인 작업 요청 시 무조건 이 스킬을 트리거한다.
---

# SnapMany Builder

snapmany 도메인의 모든 빌드·확장·수정 작업을 조율하는 메인 오케스트레이터. 4명의 에이전트(architect, frontend, backend, qa)를 Phase별로 다른 모드(서브/팀)로 호출한다.

## 실행 모드: 하이브리드 (파일 기반 조율)

이 환경은 `TeamCreate`/`SendMessage` 같은 팀 통신 도구를 제공하지 않는다. 따라서 "팀 모드"는 **`_workspace/` 파일을 공유 작업판으로 사용하는 병렬 서브 에이전트** 패턴으로 구현한다. 에이전트끼리 메시지를 주고받는 대신, 각자 자기 산출물을 약속된 경로에 기록하고 후속 에이전트가 그 파일을 읽어 작업을 잇는다.

| Phase | 모드 | 참여자 | 조율 방식 |
|-------|------|------|---------|
| 0. 컨텍스트 확인 | 오케스트레이터 단독 | — | — |
| 1. 분석 + 결정 잠금 | 단일 서브 | architect | — |
| 2. 스캐폴딩 + 1차 게이트 | 순차 서브 | architect → qa | 파일 |
| 3. 구현 | 병렬 서브 + incremental QA 라운드 | frontend, backend, qa | `_workspace/` 파일 |
| 4. 통합 QA | 순차 서브 (qa 단독, 결함 시 구현자 재호출) | qa, frontend/backend | 파일 |
| 5. 배포 + 커밋 | 순차 서브 | architect → qa → verify-and-commit | 파일 |

**왜 하이브리드인가:** Phase 1·2·5는 단일 책임자가 처리하면 충분. Phase 3은 frontend/backend가 진정으로 병렬(서로 다른 파일 트리)이라 `run_in_background: true`로 동시에 진행 가능. Phase 4는 qa가 모든 산출물을 읽고 결함을 잡는 단독 라운드.

## 데이터 핸드오프 규칙

- 모든 중간 산출물은 `_workspace/{phase}_{agent}_{artifact}.md`로 저장.
- Phase 종료 전 산출물 파일 작성 → 다음 Phase가 파일을 읽어 시작. 메모리·반환 메시지에만 의존하지 않는다 (서브 에이전트는 호출자에게만 결과를 돌려주므로, 다른 에이전트와는 파일로 통신).
- 최종 코드 산출물은 `src/`, `package.json` 등 프로젝트 루트로. `_workspace/`는 감사 추적용으로 보존.
- 에이전트 정의(`.md`)의 "팀 통신 프로토콜" 섹션은 "누가 어떤 파일을 읽고 쓰는지"의 개념적 역할로 해석한다 — 실제 라우팅은 오케스트레이터가 파일 경로로 처리.

## Phase 0 — 컨텍스트 확인

오케스트레이터의 첫 행동. 사용자 요청이 초기 구축인지, 후속 수정인지, 부분 재실행인지 판별한다.

```bash
ls _workspace 2>/dev/null
ls package.json src 2>/dev/null
```

분기:

| 상태 | 실행 모드 |
|------|---------|
| `_workspace/` 없음 + `package.json` 없음 | **초기 실행** — Phase 1부터 전체 |
| `_workspace/` 없음 + `package.json` 있음 | **외부 작업 흡수** — architect가 현 상태 감사 후 `_workspace/00_architect_decisions.md` 생성 (Phase 1만 실행 후 사용자 확인) |
| `_workspace/` 있음 + 사용자가 "재실행/처음부터" | **새 실행** — `_workspace/`를 `_workspace_prev_$(date +%s)/`로 이동 후 Phase 1부터 |
| `_workspace/` 있음 + 사용자가 "스타일 추가 / API 수정 / UI 변경 / 테스트 추가" 등 부분 요청 | **부분 재실행** — 영향받는 에이전트만 호출 (예: 스타일 추가 → backend + qa; UI 변경 → frontend + qa; 테스트 추가 → qa) |
| `_workspace/` 있음 + 사용자 입력 없이 호출 | **상태 보고** — `_workspace/` 안의 최신 산출물 요약 후 다음 작업 제안 |

## Phase 1 — 분석 + 결정 잠금 (서브, architect)

architect를 `model: "opus"` Agent로 호출:

```
Agent(
  description: "snapmany Phase 1 — 분석 및 결정 잠금",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: """
.claude/agents/architect.md 정의에 따라 Phase 1을 수행하라.

읽을 것:
- docs/prd.md
- docs/llms-gpt-image2.txt
- ../ductcanvas/AGENTS.md
- ../ductcanvas/package.json
- ../ductcanvas/src 구조
- ../ductcanvas/.env.local (REPLICATE_API_TOKEN 복사 출처)

확정된 결정값 (D1~D4, 사용자 승인 완료 — 변경 금지, 그대로 적용):
  - D1 테스트: Vitest(단위) + Playwright MCP(E2E). Phase 1 시작 시 `claude mcp list | grep playwright`로 가용성 검증.
  - D2 스타일: 7 카테고리 × ~2-3개 = 약 15개. 카테고리는 증명사진/일러스트·페인팅/캐릭터·피규어/애니메이션·만화/흑백·조각/글래머·뷰티/예술·실험.
  - D3 배포: 사용자가 Cloudflare 대시보드에서 수동 업로드. wrangler login·CLOUDFLARE_* env 키 사용 안 함. PRD의 §환경변수에서 Cloudflare 키를 "선택"으로 강등.
  - D4 Firebase: Firebase MCP로 `crispy-web` 프로젝트에 snapmany web app 자동 생성 시도. firebase_list_projects → firebase_list_apps → 없으면 firebase_create_app → firebase_get_sdk_config로 4개 키 추출 → .env.local 기록. MCP 실패 시 placeholder + 진행(사용자가 추후 수정).

산출물: _workspace/00_architect_decisions.md (architect.md의 "Phase 1 산출물 명세" 표 전 항목 채워 기록)

추가 작업: docs/prd.md 보강
  - §스타일 트리: 7 카테고리 × ~15개 명시 (각 카테고리별 세부 스타일 ID + label + description, prompt는 제외)
  - §MVP vs v2 스코프: MVP는 클립보드 복사·sticky 버튼·반응형까지. v2는 검색·즐겨찾기·셔플·비교 슬라이더·콜라주 등.
  - §환경변수: Cloudflare 키를 "선택"으로 강등하고 사유 명시(D3).

.claude/skills/nextjs-cloudflare-edge/SKILL.md, replicate-proxy/SKILL.md, firebase-remote-config/SKILL.md를 참고하라.

작업 종료 후 _workspace/00_architect_decisions.md 경로 + PRD 보강 완료 + Firebase MCP 호출 결과(성공/placeholder)를 한 묶음으로 보고.
  """
)
```

## Phase 2 — 스캐polding + 1차 게이트

### 2-A. architect 호출 (서브)

```
Agent(
  description: "snapmany Phase 2 — 스캐폴딩",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: """
.claude/agents/architect.md의 Phase 2 체크리스트를 따라 보일러플레이트를 생성하라.

먼저 _workspace/00_architect_decisions.md를 읽어라. 결정값을 그대로 적용.

생성할 파일:
- package.json (dev/build/lint/typecheck/test/pages:build/preview/deploy 스크립트)
- tsconfig.json (strict, paths @/*→./src/*)
- next.config.ts (Replicate 도메인 images.remotePatterns)
- postcss.config.mjs (@tailwindcss/postcss)
- wrangler.jsonc (compatibility_date, nodejs_compat, pages_build_output_dir)
- eslint.config.mjs (next/core-web-vitals 기반)
- src/app/layout.tsx, src/app/page.tsx (최소 뼈대)
- src/app/globals.css (@import "tailwindcss";)
- src/app/api/generate/route.ts (스텁 + export const runtime = 'edge')
- .env.example (PRD의 모든 키 + 주석)
- .gitignore (.env*, node_modules, .next, .vercel, *.log, tsconfig.tsbuildinfo)
- README.md (개발/빌드/배포 절차 골격)

Vitest 설정: vitest.config.ts + setup 파일.

산출물 요약: _workspace/02_architect_scaffold.md
  """
)
```

### 2-B. qa 1차 게이트 (서브)

```
Agent(
  description: "snapmany Phase 2 — 1차 게이트",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: """
.claude/agents/qa.md의 "Phase 2 게이트" 체크리스트를 실행하라.

실행할 명령:
  npm install
  npm run typecheck
  npm run lint

검증할 정합성:
  - .gitignore에 .env*, *.key, *.pem 포함
  - .env.example에 실제 값 없음
  - src/app/globals.css 첫 줄 @import "tailwindcss";
  - src/app/api/generate/route.ts에 export const runtime = 'edge';

산출물: _workspace/02_qa_gate.md
모든 항목 통과 → "Phase 3 진입 허가"
실패 → 어떤 항목이 왜 실패했는지 + architect에게 escalate
  """
)
```

게이트 통과 시 Phase 3로. 실패 시 architect 재호출 (1회 한정, 재실패 시 사용자에게 보고).

## Phase 3 — 구현 (병렬 서브 + 라운드별 incremental QA)

팀 통신 도구가 없으므로, 모듈을 **2~3개씩 묶은 라운드**로 나눠 frontend/backend를 병렬 호출하고, 각 라운드 종료 후 qa가 그 라운드의 산출물을 일괄 검증한다. 라운드 단위로 빨리 실패하게 함으로써 incremental QA의 핵심(빌드 끝나고 한 번이 아닌 부분 검증)을 달성한다.

### 3-A. API 계약 선잠금 (architect)

frontend/backend가 병렬로 시작하기 전에 architect가 한 번 더 호출되어 API 계약을 명문화한다. `_workspace/03_api_contract.md`:

```ts
// Request
{ image: string /* data:image/(jpeg|png|webp);base64,... */, styleId: string }
// Response (ok)
{ ok: true, styleId: string, imageUrl: string }
// Response (err)
{ ok: false, styleId: string, error: string }
```

이 파일은 라운드 1부터 모든 에이전트가 첫 행동으로 읽는다.

### 3-B. 모듈 라운드

| 라운드 | Backend 작업 | Frontend 작업 | QA 검증 |
|-------|------------|-------------|--------|
| R1 | `src/config/styles.ts`, `src/lib/replicate.ts` | `src/components/UploadPanel.tsx` | 단위 테스트 + 보안 grep |
| R2 | `src/lib/remoteConfig.ts`, `src/app/api/generate/route.ts` | `src/components/StylePicker.tsx`, `src/components/GenerationCard.tsx` | 단위 테스트 + edge runtime + 토큰 보호 grep |
| R3 | (정리/리팩터링) | `src/components/ResultGallery.tsx`, `src/app/page.tsx` | 통합 단위 테스트 + API 계약 일치 |

의존: `src/config/styles.ts`가 다른 모듈의 prerequisite이므로 R1에 둠. frontend는 R1 동안 styles.ts 결과를 기다리지 않고 독립적인 UploadPanel부터.

### 3-C. 라운드 실행 (병렬 서브)

각 라운드는 다음 단계로 실행:

1. **병렬 호출** — frontend와 backend를 `Agent` 도구로 동시에 호출, 둘 다 `run_in_background: true`. 각 prompt에 명시:
   - "tdd-workflow 스킬을 따라 RED → GREEN → REFACTOR (풀 파이프라인 게이트) 사이클로 작업"
   - "`_workspace/00_architect_decisions.md`와 `_workspace/03_api_contract.md`를 먼저 읽기"
   - "이 라운드의 담당 모듈 목록 (위 표 참조)"
   - "라운드 종료 시 `_workspace/03_R{N}_{agent}_done.md`에 완성 모듈 목록 + 알려진 한계 기록"

2. **둘 다 완료 대기** — 백그라운드 완료 알림을 받으면 두 산출물 파일 존재를 확인.

3. **qa 호출 (순차)** — `Agent` 호출, prompt에:
   - "이 라운드는 R{N}. 검증 대상은 `_workspace/03_R{N}_*_done.md`의 모듈"
   - "보안 grep 실행 (NEXT_PUBLIC_REPLICATE, components 내 replicate import, edge runtime export)"
   - "각 모듈의 풀 파이프라인 4개 명령이 통과하는지 직접 실행"
   - "결과를 `_workspace/03_R{N}_qa.md`에 기록. 통과 시 'R{N+1} 진입 허가', 실패 시 책임 에이전트와 결함 위치 명시"

4. **재작업** — qa 실패 시 해당 에이전트만 다시 호출. 1회 재호출 한도, 재실패 시 architect escalate.

### 3-D. Phase 3 종료

모든 라운드 통과 후 `_workspace/03_done.md` 작성 (오케스트레이터가 직접 작성, 라운드 요약). Phase 4 진입.

## Phase 4 — 통합 QA (순차 서브, qa 단독)

qa를 단독 서브로 호출, 모든 `_workspace/03_*` 산출물과 `src/` 코드를 읽고 교차 검증을 수행. 결함 발견 시 해당 책임자(frontend 또는 backend)를 1회 재호출하여 수정 → qa가 재검증.

### 4-A. 교차 검증

- 요청 body 키 (frontend) ↔ `request.json()` 파싱 (backend)
- 응답 필드 (backend) ↔ 클라이언트 응답 처리 (frontend)
- styleId 집합 — config/styles.ts ↔ StylePicker 렌더 ↔ route handler 검증
- RC `defaultConfig` 키 ↔ `getValue/asString` 키
- `.env.example` 키 ↔ `process.env.*` 참조

### 4-B. Playwright mock flow

- 이미지 업로드 → 스타일 3개 선택 → 생성 → 결과 카드 3개 렌더 (mock으로 imageUrl 주입)
- 실패 케이스 1개: 한 스타일이 4xx 응답 → 해당 카드만 failed UI

### 4-C. 산출물

- `_workspace/04_qa_integration.md`: 모든 교차 검증 통과 / 발견된 결함 + 수정 위치
- 결함 수정 후 재검증. Phase 5로.

## Phase 5 — 배포 + 커밋 (서브)

### 5-A. architect 최종 빌드 (D3: 수동 대시보드 업로드)

```
Agent(
  description: "snapmany Phase 5 — 배포 빌드",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: """
README.md를 완성하라:
  - 개발 절차 (npm install, npm run dev)
  - 빌드 절차 (npm run pages:build)
  - **배포 절차 (수동 대시보드 업로드)**:
    1) https://dash.cloudflare.com → Workers & Pages → Create application → Pages → Upload assets
    2) 프로젝트 이름: snapmany (충돌 시 snap-many)
    3) 빌드 결과 폴더 `.vercel/output/static`을 그대로 업로드 (또는 zip)
    4) Settings → Environment variables에 주입:
       - REPLICATE_API_TOKEN (Production + Preview)
       - NEXT_PUBLIC_FIREBASE_API_KEY
       - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
       - NEXT_PUBLIC_FIREBASE_PROJECT_ID
       - NEXT_PUBLIC_FIREBASE_APP_ID
    5) Redeploy
  - 환경변수 발급 가이드 (Firebase Console URL, Replicate URL)

실행:
  npm run pages:build
  npx wrangler pages dev .vercel/output/static  (백그라운드, 부팅 확인 후 종료. wrangler login 불필요한 dev 모드)

**금지:** wrangler login, npm run deploy (D3: 자동 배포 안 함)

산출물: _workspace/05_architect_deploy.md
  - 빌드 결과 (성공/실패, 출력 폴더 크기)
  - 사용자가 대시보드에서 처리할 작업 체크리스트 (위 1~5)
  - 주입할 환경변수 4개 + REPLICATE_API_TOKEN 명세
  """
)
```

### 5-B. qa 최종 게이트

```
Agent(
  description: "snapmany Phase 5 — 최종 게이트",
  subagent_type: "general-purpose",
  model: "opus",
  prompt: """
.claude/agents/qa.md의 "Phase 5 최종 게이트" 체크리스트.

실행:
  npm run typecheck && npm run lint && npm run test && npm run build && npm run pages:build

산출물: _workspace/05_qa_final.md
모두 통과 → "verify-and-commit 스킬 실행 가능"
실패 → 원인 + 책임 에이전트 명시
  """
)
```

### 5-C. verify-and-commit (최종)

`.claude/skills/verify-and-commit/SKILL.md`를 따라 시크릿 grep → 스테이징 → 커밋 → 푸시.

커밋 메시지:
- 초기 구축: `snapmany: 사진 다중 스타일 변환 MVP 초기 구현 (배포 가능 상태)`
- 부분 수정: `snapmany: <변경 의도 한 줄>`

## 커밋 정책 (incremental — 단계마다 자주 커밋)

사용자 정책: **동작 가능한 상태마다 커밋·푸시**. 깨진 상태 커밋 금지. verify-and-commit의 풀 파이프라인 게이트(typecheck/lint/test/build)를 통과한 시점에만 커밋한다. 초기 구축 시 다음 6개 시점에서 incremental 커밋:

| 시점 | 커밋 메시지 (예시) | 검증 게이트 |
|------|------------------|------------|
| Phase 2 통과 직후 (스캐폴딩 + 1차 게이트) | `snapmany: Next.js + Tailwind v4 + Cloudflare Pages 스캐폴딩` | typecheck + lint |
| Phase 3 R1 통과 직후 (styles.ts, replicate.ts, UploadPanel) | `snapmany: 스타일 config + Replicate wrapper + 업로드 컴포넌트` | typecheck + lint + test |
| Phase 3 R2 통과 직후 (route.ts, remoteConfig.ts, StylePicker, GenerationCard) | `snapmany: /api/generate 프록시 + Firebase RC + 스타일 선택 UI` | typecheck + lint + test + build |
| Phase 3 R3 통과 직후 (ResultGallery, page.tsx) | `snapmany: 결과 갤러리 + 메인 페이지 통합` | 풀 파이프라인 |
| Phase 4 통합 QA 통과 직후 | `snapmany: 통합 정합성 검증 통과 + E2E 시나리오` | 풀 파이프라인 + Playwright E2E |
| Phase 5 최종 게이트 통과 직후 | `snapmany: 사진 다중 스타일 변환 MVP 초기 구현 (배포 가능 상태)` | 풀 파이프라인 + pages:build |

**금지:**
- 풀 파이프라인 통과 전 커밋
- `.env.local` 같은 시크릿 파일 staging (verify-and-commit의 grep으로 차단)
- 새 브랜치/저장소 생성 (모노레포 main 직접 푸시)
- `--no-verify`, `--amend`, force push

## 에러 핸들링

| 단계 | 실패 유형 | 대처 |
|------|---------|------|
| Phase 1 | architect가 PRD 해석 실패 | 사용자에게 모호한 항목 명시 후 질문 |
| Phase 2 | 환경변수 발급 불가 | 작업 중단, 사용자에게 발급처 + 권한 안내 |
| Phase 2 | typecheck/lint 실패 | architect 1회 재호출, 재실패 시 사용자 |
| Phase 3 | API 계약 합의 실패 | architect escalate |
| Phase 3 | 보안 위반 grep 매칭 | **즉시 차단**, 해당 모듈 거부, 담당자 재작업 |
| Phase 3 | 모듈 테스트 실패 | 담당자 1회 재호출, 재실패 시 architect |
| Phase 4 | 교차 검증 결함 | 결함 위치를 명시하고 양쪽 모두 수정 요청 |
| Phase 5 | pages:build 실패 | nextjs-cloudflare-edge 스킬 디버깅 체크리스트 적용 |
| Phase 5 | 시크릿 grep 매칭 | **커밋 중단**, 사용자에게 보고 |

재시도 정책: 동일 에이전트에 동일 작업은 최대 1회 재호출. 재실패 시 architect escalate 또는 사용자 호출.

## 테스트 시나리오

### 정상 흐름 — 초기 구축
1. 사용자: "snapmany 웹앱을 만들어줘"
2. Phase 0 → `_workspace/` 없음 + `package.json` 없음 → 초기 실행
3. Phase 1 architect → `_workspace/00_architect_decisions.md`
4. Phase 2 architect 스캐폴딩 → qa 1차 게이트 통과
5. Phase 3 팀 모드, 모듈별 incremental QA. 9개 모듈 모두 통과
6. Phase 4 qa 통합 검증 통과
7. Phase 5 architect 배포 빌드 + qa 최종 게이트 + verify-and-commit
8. 사용자에게 `_workspace/`와 README, 배포 절차 보고

### 에러 흐름 — 보안 위반
1. backend가 실수로 `src/components/StylePicker.tsx`에서 `import Replicate`를 사용
2. Phase 3 incremental QA에서 grep 매칭 → 차단
3. qa가 backend/frontend 양쪽에 메시지로 위반 위치 통보
4. frontend가 StylePicker 수정, backend가 안전한 server-side 경로로 변경
5. 재검증 후 다음 모듈로

### 부분 재실행 — 스타일 추가
1. 사용자: "고양이 변신 스타일을 추가해줘"
2. Phase 0 → `_workspace/` 있음 + 부분 요청 → 부분 재실행
3. backend만 호출: `src/config/styles.ts`에 신규 프리셋 추가 + 테스트
4. qa incremental: styleId 집합 정합성 재검증
5. verify-and-commit

### 후속 수정 — UI 변경
1. 사용자: "결과 카드에 다운로드 진행률을 표시해줘"
2. Phase 0 → 부분 재실행 (frontend + qa)
3. frontend가 `ResultGallery`/`GenerationCard` 수정 + 테스트
4. qa incremental → verify-and-commit

## 후속 작업 트리거 키워드 (description과 동기화)

이 description 변경 시 다음 표현이 모두 트리거 가능해야 한다:
- "snapmany 만들어줘", "사진 변환 앱 만들어줘"
- "스타일 추가/삭제/변경", "스타일 프리셋"
- "API 수정", "/api/generate 변경", "Replicate 프록시"
- "UI 변경", "결과 갤러리 수정", "업로드 컴포넌트"
- "Firebase RC", "원격 설정 키 추가"
- "테스트 추가", "버그 픽스"
- "재실행", "업데이트", "보완", "부분 수정", "다시"
- "배포 준비", "Cloudflare 배포"
