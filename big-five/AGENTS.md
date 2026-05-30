# Project AGENTS.md

이 문서는 `big-five` 하위 프로젝트에만 적용되는 작업 지침이다.
공통 규칙(npm 사용, lint→test→build 순서, TDD, Cloudflare 일반론, 비밀값 금지, 커밋 스타일, 워크트리 안전)은 상위 모노레포 `AGENTS.md`/`CLAUDE.md`를 따른다. 여기서는 big-five 고유 사항만 적는다.

## 프로젝트 목적

Big Five 성격 검사(자기보고)를 수행하는 정적 웹앱이다.
180문항 / 30 세부척도 / 5요인 구조이며, 응답을 받아 점수를 채점하고 결과를 보여 준다.
채점 이론과 척도 정의는 `docs/PLAN.md`에 위임한다. 이 문서에서는 운영·동기화 규칙만 다룬다.

## 기술 스택

- Node.js / TypeScript 5
- Next.js 16.2.6 (App Router, `src/app` 구조), React 19.2.4
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- Vitest 4 (`vitest.config.ts`, `environment: "node"`, `@` alias → `./src`)
- ESLint 9 (`eslint-config-next`)
- 정적 export 빌드: `next.config.ts`의 `output: "export"` → `out/`

## 주요 파일

- `src/components/BigFiveAssessment.tsx`: 검사 진행 UI 컴포넌트 (문항 표시·응답 수집)
- `src/lib/scoring.ts`: 채점 로직. 변경 시 반드시 테스트로 검증한다
- `src/lib/scoring.test.ts`: 채점 로직 Vitest 테스트
- `src/data/questionnaire.json`: 문항 원본 데이터 (단일 출처)
- `src/data/questionnaire.ts`: 문항 데이터 로더/타입
- `scripts/generate-questionnaire-doc.mjs`: `questionnaire.json`에서 `docs/QUESTIONNAIRE.md`를 생성하는 스크립트
- `docs/PLAN.md`: 검사 설계·채점 이론·척도 정의
- `docs/QUESTIONNAIRE.md`: 생성물 문서(180문항·채점 규칙). 직접 손으로 수정하지 않고 스크립트로 재생성한다

## 실행

```bash
npm install
npm run dev
```

`output: "export"` 정적 앱이라 `npm run start`는 사용하지 않는다.

## 테스트

```bash
npm run test
npm run test:watch
```

채점 로직(`src/lib/scoring.ts`) 변경 시 `npm run test`로 `scoring.test.ts`를 통과시킨다.
이 프로젝트에는 `typecheck` 스크립트가 없다. 타입 검증은 `npm run build`로 대신한다.

## 빌드

```bash
npm run lint
npm run build
npm run pages:build
```

`pages:build`는 `build`와 동일하다(정적 export 출력 `out/`를 그대로 사용).

## 배포

`out/`을 Cloudflare Pages로 배포한다. 프로젝트명은 `big-five`, 설정은 `wrangler.jsonc`다.

```bash
npm run preview
npm run deploy
```

- `preview`: `next build` 후 `wrangler pages dev out`으로 로컬 미리보기.
- `deploy`: `next build` 후 `wrangler pages deploy out --project-name big-five`로 수동 배포한다.
- big-five 전용 CI 워크플로는 없다. 배포는 위 `npm run deploy`로 수동 수행한다.

## 작업 규칙

- `output: "export"` 정적 사이트다. `src/app/**/api/**/route.ts`나 server route handler, `export const runtime = "edge"` 선언을 추가하지 않는다. 정적 export가 깨진다.
- 외부 API/백엔드 호출이 없는 순수 정적 자기보고 검사다. 서버 호출·외부 fetch를 새로 도입하지 않는다.
- 문항 데이터(`src/data/questionnaire.json`)를 수정하면 반드시 `npm run docs:questionnaire`로 `docs/QUESTIONNAIRE.md`를 재생성하고, `npm run test`로 `scoring.test.ts` 채점을 검증한다.
- 문항 문구는 IPIP 원문을 복사·직역하지 않고 새로 작성한다(README 정책). 출처 참고는 가능하되 원문 그대로 옮기지 않는다.
- Firebase를 사용하지 않는다. 루트의 `firebase-debug.log`는 떠돌이 산출물이며 커밋하지 않는다.
- 실제 배포(`npm run deploy`)는 사용자 승인 후 진행한다.

## 도메인 동기화 규칙

`questionnaire.json`이 단일 출처(source of truth)다. 아래 순서로 동기화 무결성을 유지한다.

```bash
# 1. 문항 데이터 수정
#    src/data/questionnaire.json

# 2. 문서 재생성 (QUESTIONNAIRE.md는 손으로 고치지 않음)
npm run docs:questionnaire

# 3. 채점 검증
npm run test
```

## 환경 변수

외부 서비스를 사용하지 않으므로 필요한 환경 변수가 없다.
`.gitignore`에 `.env*.local`이 등록되어 있으나 실제 키 파일은 두지 않는다.

## 자주 깨지는 부분

- API route나 `runtime = "edge"` 선언을 추가하면 `output: "export"` 빌드가 실패한다.
- `questionnaire.json`만 고치고 `docs:questionnaire`를 돌리지 않으면 `QUESTIONNAIRE.md`가 어긋난다.
- 채점 로직 수정 후 `scoring.test.ts`를 갱신하지 않으면 점수 회귀가 검출되지 않는다.
- `next.config.ts`의 `images.unoptimized: true`를 풀면 정적 export에서 이미지 최적화가 깨진다.
