---
name: gen-nai-orchestrator
description: gen-nai NovelAI 웹앱 개발·테스트·배포·확장을 위한 마스터 오케스트레이터. "gen-nai", "novelai 웹앱", "nai 이미지 생성", "gennai.pages.dev", "큐잉", "캐릭터 검색", "프롬프트 에디터", "다시 실행", "재배포", "버그 수정", "기능 추가" 같은 요청이 들어오면 반드시 이 스킬을 사용해서 6명의 전문 에이전트 팀(nai-researcher, architect, tdd-runner, backend-builder, frontend-builder, qa-deploy)을 조율한다. 단순 정보 질문은 직접 응답해도 됨.
---

# gen-nai-orchestrator

NovelAI 이미지 생성 웹앱(`gen-nai/web`)의 전체 개발 수명주기를 6명 에이전트 팀으로 진행하는 오케스트레이터.

## 워크플로우 개요

```
Phase 0  컨텍스트 확인 (초기/후속/부분 재실행 판별)
Phase 1  리서치 (nai-researcher 단독)
Phase 2  아키텍처 (architect 단독)
Phase 3  TDD RED 작성 (tdd-runner)
Phase 4  GREEN 구현 (backend-builder + frontend-builder 팀, 병렬)
Phase 5  점진적 QA (qa-deploy, 모듈 단위)
Phase 6  Cloudflare Pages 배포 (qa-deploy)
Phase 7  사용자 피드백 → 진화 루프
```

실행 모드: **하이브리드** — 리서치/아키텍처는 서브 에이전트 단독, 구현 Phase는 에이전트 팀, QA/배포는 서브.

## Phase 0: 컨텍스트 확인

워크플로우 시작 시 다음을 확인하여 실행 모드를 결정한다:

| 상태 | 액션 |
|------|------|
| `gen-nai/web/package.json` 없음 | **초기 실행** — Phase 1부터 |
| `_workspace/` 존재 + 사용자가 "다시"/"수정"/"버그" 언급 | **부분 재실행** — 해당 Phase의 에이전트만 재호출, 기존 산출물 입력으로 사용 |
| `_workspace/` 존재 + 사용자가 신규 기능 요청 | **확장 실행** — 기존 산출물을 읽고 추가 분량만 Phase 3부터 |
| `_workspace_prev/`가 없고 새 입력 | 기존 `_workspace/`를 `_workspace_prev/`로 보존 후 새 실행 |

`_workspace/`는 `gen-nai/web/_workspace/` 아래에 둔다 (Git에서 .gitignore 처리).

## Phase 1: 리서치

**실행자:** `nai-researcher` (서브 에이전트, opus)

지시 사항:
- `gen-nai/docs/queueing.md` 정독
- `/Users/izowooi/git/NAIA2.0_origiin/core/api_service.py` 정독해서 NAI v4.5 페이로드 추출
- `gen-nai/docs/NovelAI_Characters.csv` 컬럼/규모 파악
- `gen-nai/docs/NovelAI.xlsx`의 한글 태그 사전 분석

산출물: `_workspace/research/nai-api-spec.md`, `prompt-syntax.md`, `dataset-shape.md`

## Phase 2: 아키텍처

**실행자:** `architect` (서브 에이전트, opus)

지시 사항:
- Phase 1 산출물 + `docs/queueing.md`를 입력으로
- 디렉토리 트리, 라우팅, DO 인터페이스, TDD 레이어, env, wrangler 설계
- Cloudflare Pages에서 DO 사용 가능성: `@cloudflare/next-on-pages` 또는 Workers 별도 분리 결정

산출물: `_workspace/architecture/system-design.md`, `do-queue-spec.md`, `tdd-plan.md`, `env-and-deploy.md`

## Phase 3: TDD RED

**실행자:** `tdd-runner` (서브 에이전트, opus)

지시 사항:
- 아키텍처의 `tdd-plan.md` 따라 모든 핵심 모듈에 대해 실패 테스트 작성
- 작성 순서: `nai-payload` 단위 → `character-search` 단위 → DO `enqueue/alarm` 단위 → API 라우트 통합 → e2e 골든 패스
- MSW 또는 `vi.mock`으로 NAI 외부 호출 격리
- Fixture: `tests/fixtures/nai-response.zip` (작은 1px PNG zip), `tests/fixtures/characters-sample.json`

산출물: `gen-nai/web/tests/**`, `_workspace/test-status.md`

## Phase 4: GREEN 구현 (에이전트 팀)

**실행 모드:** 에이전트 팀

**팀 구성:** `backend-builder`, `frontend-builder` (둘 다 opus)

**리더:** 오케스트레이터(이 스킬). `TeamCreate`로 팀을 만들고 `TaskCreate`로 작업을 분배.

지시 사항:
- 두 빌더가 합의된 API 계약을 `_workspace/api-contract.md`에 작성 (1차 합의 후 구현 시작)
- backend-builder: `lib/nai-payload`, `lib/nai-client`, `lib/queue/NovelAiQueueDO`, `app/api/generate`, `app/api/job/[id]`, `wrangler.jsonc`
- frontend-builder: 프롬프트 에디터, 캐릭터 검색, 이미지 설정 패널, 큐 상태/갤러리, 빌드타임 CSV→JSON 변환 스크립트
- 두 빌더는 `SendMessage`로 계약 변경·blocker를 즉시 통보

완료 기준: 모든 RED 테스트가 GREEN, `npm run test` + `npm run test:e2e` 통과

## Phase 5: 점진적 QA

**실행자:** `qa-deploy` (서브 에이전트, opus)

지시 사항:
- 모듈 완성 직후마다 호출 — 전체 끝나고 한 번이 아니라 점진적
- `_workspace/api-contract.md` ↔ 실제 코드 두 파일 동시 read로 shape 비교
- 동시 요청 시나리오: `for i in {1..3}; do curl ... & done` 으로 3개 동시 전송 → 큐 직렬화 + 10초 인터벌 검증
- 발견된 결함은 SendMessage로 해당 에이전트에 회부

산출물: `_workspace/qa/boundary-check.md`, `concurrency-report.md`

## Phase 6: 배포

**실행자:** `qa-deploy` (서브 에이전트, opus)

지시 사항:
- `wrangler.jsonc` 검증 → `wrangler pages deploy` 또는 `@cloudflare/next-on-pages` 빌드 후 배포
- `wrangler pages secret put NAI_TOKEN --project-name=gennai` — **사용자에게 토큰 주입 명령 안내하거나 사용자가 미리 설정**
- `gennai.pages.dev` 스모크 테스트: 실제 1회 생성 (NAI 토큰 1회 실제 호출 허용)
- 토큰 노출 검사: 빌드 산출물에 `pst-` 시작 문자열 grep — 0건이어야 함

산출물: `_workspace/qa/deploy-log.md`, 사용자에게 URL 보고

## Phase 7: 진화 루프

배포 후 사용자 피드백 수집:
- "결과에서 개선할 부분이 있나요?"
- "에이전트/스킬 변경이 필요한가요?"

피드백 분류:
| 유형 | 수정 대상 |
|------|----------|
| 결과물 품질 | 해당 에이전트의 스킬 (예: `nai-api-client`) |
| 누락된 기능 | `frontend-builder` 또는 `backend-builder` 정의 갱신 |
| 워크플로우 순서 | 이 오케스트레이터 스킬 |
| 트리거 누락 | description에 키워드 추가 |

모든 변경은 `gen-nai/CLAUDE.md`의 변경 이력 테이블에 1행 추가.

## 데이터 전달 프로토콜

- **파일 기반**: `_workspace/{phase}/*.md` — 모든 산출물
- **메시지 기반**: 에이전트 팀 통신 — 계약 변경, blocker, 검증 요청
- **반환값 기반**: 서브 에이전트 Phase는 반환 메시지로 결과 요약

## 에러 핸들링

| 에러 | 대응 |
|------|-----|
| 외부 API 차단 (Danbooru 등) | 1회 재시도 후 차단된 채로 진행 + 리포트에 명시 |
| 테스트 일관성 깨짐 | 테스트 약화 금지. 명세 의심되면 architect에게 회부 |
| DO 로컬 실행 불가 | 통합 테스트는 Workers 모의 환경으로, e2e는 배포 후 환경에서 |
| 배포 시크릿 누락 | 배포 중단 + 사용자에게 명령 안내, 자동 진행 금지 |

## 테스트 시나리오

**정상 흐름:** 사용자가 "원신 호두 캐릭터로 이미지 생성해줘" 요청 → 캐릭터 검색이 `hu_tao_(genshin_impact)` 제안 → 사용자가 받아들임 → 큐에 enqueue → DO가 NAI 호출 → 이미지 PNG 수신 → 갤러리 표시.

**에러 흐름:** 두 사용자가 동시에 생성 → 두 번째 사용자는 "대기 중 1번" 표시 → 첫 번째 완료 후 10초 뒤 두 번째 시작 → 정상 완료.

## 참조 스킬

- `nai-api-client` — NAI v4.5 페이로드와 ZIP 응답 처리
- `durable-object-queue` — DO 큐 패턴 (queueing.md 요약)
- `nextjs-cf-pages` — Next.js + Cloudflare Pages + DO 결합 노하우
- `tdd-nextjs` — Vitest/Playwright + Workers TDD 셋업
