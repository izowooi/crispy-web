# AGENTS.md — chess (crispy-web L3)

`crispy-web` 모노레포의 `chess/` 앱 지침이다. 상위 L2(`crispy-web/AGENTS.md`)와 L1을 따르고, 이 프로젝트에 관해서는 이 문서가 우선한다.
서비스: https://chess.zowoo.uk — 익명 온라인 대국(사람 대 사람), 사람 대 AI, AI 대 AI.
작업 시작 전 `HANDOFF.md`(현재 상태·결정 이력·다음 할 일)와 `README.md`(실행 방법·구조)를 읽는다.

## 응답·작업 스타일

- 사용자와의 대화는 한국어. 코드 식별자·명령어·라이브러리명은 영문 그대로.
- CLI에 익숙한 사용자를 전제로, 핵심 명령과 변경 요약을 먼저 제시하고 영향 범위·리스크를 함께 짚는다. 장식적 문장, 과도한 사과·반복은 피한다.
- 전체 관점을 우선한다. 단순한 구조를 선호하고 과도한 abstraction, 성급한 공통화를 피한다(명확한 중복이 낫다).
- TDD를 우선하되 기존 코드 스타일과 관례를 더 우선한다. 테스트가 어려운 영역(UI, 실제 API 호출)은 수동 검증 절차를 응답에 적는다.
- 새 dependency는 보수적으로. 표준 라이브러리와 기존 의존성을 먼저 쓰고, 추가가 필요하면 이유와 대안을 설명한 뒤 진행한다. 버전은 정확히 고정한다(`^` 없이).
- 주석은 비자명한 WHY만. README는 사용자가 요청하거나 외부 진입자가 있을 때만 갱신한다.
- 요청 범위 안에서만 수정한다. 발견한 별도 이슈는 제안만 한다.
- 실패 시 근본 원인을 고친다. `--no-verify`, 테스트 스킵 같은 우회 금지. 환경 문제로 의심되면 사용자에게 먼저 확인한다.

## 자율성 수준

코드 수정·테스트·빌드·커밋·push까지 자율 수행한다. 아래는 사용자 승인 후에만 한다.

- force push
- secret, token, API key의 수정 또는 출력 / `.env*` 덮어쓰기
- 운영 배포(`npm run deploy`) — 단, 사용자가 배포까지 맡긴 작업이면 검증 후 진행한다
- 외부 서비스로 데이터 업로드, 유료 리소스 생성·결제
- 대량 삭제·`rm -rf` 류 비가역 삭제 (운영 D1 `chess` 대국 기록 삭제 포함)
- 시스템 설정 변경

실제 AI API 호출(`npm run probe`, AI vs AI 대국)은 소액 과금이 발생한다. 검증 목적의 소량 호출은 진행해도 되지만, 대량 반복 대국은 먼저 묻는다.

## 보안 절대 규칙

- `.env.local` 등 `.env*`(`.env.example` 제외)과 API key가 든 파일은 출력·스테이징·커밋·압축·외부 업로드하지 않는다. 키 값을 로그나 응답에 찍지 않는다.
- 민감 정보가 대화나 로그에 노출되면 재출력하지 말고 키 폐기·재발급을 권고한다.
- 키는 Worker `env`(운영: `wrangler secret`, 로컬: `.env.local`)에서만 읽는다. 클라이언트 번들(`src/`)에 키나 공급자 URL을 넣지 않는다.

## Git 규칙

- 작업 전후 `git status` 확인. 원격보다 뒤처져 있으면 `git fetch` 후 fast-forward. 충돌 시 중단하고 사용자에게 요청한다.
- staging은 파일을 명시적으로 지정한다(`git add .` 금지).
- 커밋 전 `git diff --cached --name-only`와 staged diff로 민감 파일·범위 밖 변경이 없는지 확인한다.
- 커밋 메시지는 모노레포 관례 `chess: 변경 요약`(짧은 한국어)을 따른다.
- 생성물(`node_modules/`, `dist/`, `.wrangler/`, `.playwright-mcp/`), 로컬 환경 파일, OS 메타데이터는 커밋하지 않는다.
- 새 저장소·브랜치는 사용자가 요청할 때만 만든다. 문서만 바꾼 경우 테스트·빌드 생략 가능(사유 한 줄).

## 프로젝트 규칙

- 스택: Vite + React SPA(`src/`) + Cloudflare Worker(`worker/`, Hono) + Durable Object `GameRoom`(대국 1판 = DO 1개) + D1 `chess`(로비·기록·통계·AI 한도). 설정은 `wrangler.jsonc`.
- `worker/game.ts`는 런타임 독립 순수 로직(규칙·시계·좌석 토큰 권한)이다. DO(`worker/room.ts`)는 저장·WebSocket·alarm만 감싼다. 규칙 변경은 `game.ts`와 `tests/game.test.ts`에서 한다.
- DO의 단일 alarm이 시간 패 판정과 AI 턴 실행을 모두 맡는다. AI 호출은 alarm 핸들러 안에서 await한다(퇴출되면 alarm이 재시도).
- `placement: aws:ap-northeast-2`를 지운다면 반드시 다시 검증한다. 한국 트래픽은 HKG colo로 가고 Anthropic/OpenAI가 HKG를 403으로 막는다. 배포 후 `curl -sI https://chess.zowoo.uk/api/quota | grep cf-placement`가 `remote-ICN`이어야 한다.
- 권한은 좌석 토큰(브라우저 localStorage `chess.token`)으로만 판단한다. 요청 body의 color를 믿지 않는다. 토큰은 스냅샷이나 D1에 노출하지 않는다.
- AI 비용 보호: IP(해시)당 KST 하루 10판(`AI_DAILY_LIMIT`), 전체 하루 600판(`AI_GLOBAL_DAILY_LIMIT`), IP당 동시 2판, AI 대국 시간 최대 30분+10초. 바꾸면 `wrangler.jsonc` vars와 `shared/types.ts`의 `LIMITS`를 함께 본다.
- 테스트는 `node:test` + `tsx` (`npm test`). vitest(및 `@cloudflare/vitest-pool-workers`)는 npm 10.9.x 설치 오류로 쓰지 않는다.
- 타입체크는 tsconfig 3개(앱 DOM / worker 런타임 / 테스트 node)로 나뉜다. `wrangler.jsonc`를 바꾸면 `npm run types`로 `worker-configuration.d.ts`를 다시 만든다.
- 검증 순서: `npm run typecheck` → `npm test` → `npm run build`. UI 변경은 모바일 세로(390×844)와 데스크톱 가로(1440×900)를 둘 다 브라우저로 확인한다.
- `npm run probe`는 사내 TLS 프록시 대응으로 `--use-system-ca`를 유지한다. TLS 검증을 끄는 방식은 쓰지 않는다.
- **공정 비교 원칙**: 모든 AI는 같은 입력(FEN, 보드 그림, 기보, 합법 수 목록, 한 줄 지시문)만 받는다. 우리 쪽에서 계산한 평가·힌트·전술 주석을 프롬프트에 넣지 않는다. 사용자가 명시적으로 결정한 사항이다.
- AI 구성은 4종: Jev, Decisions, Haiku 5.5 Medium, Haiku 5.5 High. effort는 Haiku에만 있다. 선택 가능 값은 `shared/types.ts`의 `SELECTABLE_EFFORTS`.
- 시계는 서버(DO) 권위. API 대기 시간도 그 AI의 시계에서 빠진다. 시간 초과로 끊긴 호출은 API 오류로 세지 않는다. 양쪽이 첫 수를 두기 전 시간이 끝나면 점수 없이 취소한다.
- 감정 표현은 사람 대 사람 대국에서만, 6종 고정(`EMOTES`), 서버에서 2.5초 쿨다운. 채팅은 넣지 않는다.
- 디자인: 모바일 세로는 Duolingo 체스 스타일(플랫, 둥근 회색 기물, 점 힌트, 3D 버튼), 가로(≥900px, 5:4 이상)는 lichess 레이아웃. 색·간격은 `src/styles.css`의 CSS 변수를 쓴다. 다크 모드(시스템 설정)와 `prefers-reduced-motion`을 지원한다.
