# HANDOFF — chess (chess.zowoo.uk)

## 0. 현재 상태 (2026-10-20, Cloudflare 이전 완료)

- 운영: https://chess.zowoo.uk — Worker `chess` + Durable Object `GameRoom` + D1 `chess`(id `72289746-…`) + ratelimit `4101`. `cf-placement: remote-ICN` 확인.
- 새 기능: 익명 사람 대 사람 대국(로비/링크 초대/관전), 감정 표현 6종, 무승부 제안, 재대결(색 교대), 첫 수 전 취소, AI 일일 한도(IP당 10판·전체 600판·동시 2판).
- Node 서버(`server/`, Hono node-server, `node:sqlite`, SSE)는 삭제했다. 로직은 `worker/game.ts`(순수) + `worker/room.ts`(DO)로 옮겼다.
- 검증: 단위 테스트 12개, 로컬/운영 스크립트 PvP 시나리오 15항목, 운영에서 4개 AI 구성 실제 호출, 모바일 390×844·데스크톱 1440×900 화면 확인.
- 남은 후보: Elo/레이팅, 연결 끊김 시 상대 승리 청구(lichess식), 수 되돌리기 요청, 방 비밀번호, 운영 테스트 대국 기록 정리(D1).

아래는 Cloudflare 이전 전 로컬 버전의 인수인계 기록이다. 결정 이력(4~6절)은 여전히 유효하다.

---

작성 2026-10-20. 이전 작업 세션(Claude Code)은 새 작업 공간으로 넘어오지 않는다. 이 문서와 `AGENTS.md`가 그 대화를 대신한다.

## 1. 목적

널리 알려진 게임인 체스로 세 가지 API의 실력과 비용을 직접 체감하고 비교한다.

- **Jev**: TypeSafe, OpenRouter 경유
- **OpenAI Decisions API**
- **Claude Haiku 5.5**: Anthropic

1차 목표는 사람 vs AI 대국과 AI vs AI 대국이다. 사람끼리 두는 멀티플레이는 나중이다.

## 2. 사용자 원 요구사항 (요약)

- **디자인**
  - 현대적이고 플랫·심플한 디자인
  - 모바일 세로는 Duolingo 체스 스타일, 가로는 lichess 스타일
  - 모션은 prompt-motion.com, 세부 기능은 lichess.com을 참고
- **대국 방식**: 사람이 각 AI와 대국할 수 있다. AI끼리도 대국할 수 있다.
- **시간 제한**
  - 기본 10분이고, 대국을 열 때 조절할 수 있다.
  - 먼저 시간이 다 된 쪽이 패배한다.
  - AI가 API 응답을 기다리는 시간도 그 AI의 시계에서 똑같이 빠진다.
- **비용 표시**: 대국이 끝나면 총 토큰과 달러 비용을 보여 준다.
- **API별 두 가지 버전**: 가능하면 준비한다.
  - Claude는 effort로 가능하다.
  - Jev와 Decisions에는 effort 같은 파라미터가 없어서 한 가지뿐이다.
- **인프라**
  - 지금은 DB까지 모두 자체 해결한다.
  - 나중에 Cloudflare Workers + Durable Objects + D1으로 배포한다.
- API 키는 `.env.local`에 있다.

## 3. 현재 상태 — 동작 완료

- **기능**: 다음이 모두 구현되어 있다.
  - 사람 vs AI, AI vs AI
  - 서버 권위 시계(초기 시간 1~60분, 수당 추가 시간 0/2/5/10초)
  - 시간 패, 기권, 중단
  - 결과 시트: 총 비용·토큰, 양쪽 비교표
  - 대국 기록, 엔진 순위(승률·비용·응답 속도, 상대 전적)
  - 기보 되돌려 보기, PGN 복사, 효과음, 다크 모드
- **AI 4종**: Jev, Decisions, Haiku 5.5 Medium, Haiku 5.5 High. 상세는 README의 "AI 구성".
- **검증**
  - 테스트 6개 통과, 빌드 정상
  - 4종 모두 실제 API 호출로 확인했다(`npm run probe`, 같은 포지션에서 모두 Qxf7# 발견).
  - UI는 모바일 세로 390×844와 데스크톱 1440×900에서 확인했다.
- **DB**: 2026-10-20 구버전 테스트 기록을 전부 지워서 비어 있다. DB 파일(`data/`)은 압축에 넣지 않았다. 첫 실행 시 새로 만들어진다.

## 4. 결정 이력 (왜 이렇게 되어 있나)

1. **Standard/Pro 단계 제거 → AI 4종**
   - 처음에는 Jev와 Decisions에 "Pro" 단계를 두었다. Pro는 effort가 아니라, 우리 쪽에서 계산한 전술 힌트(잡을 수 있는 기물, 체크, 반복 위험 등)를 프롬프트에 넣은 버전이었다.
   - 사용자가 "순수한 모델 실력 비교"를 원해서 힌트 코드를 통째로 지웠다.
   - 지금은 모든 AI가 같은 순수 입력을 받는다. 이 원칙은 `AGENTS.md`에 박아 두었다.
2. **Haiku effort는 medium / high**
   - 문서상 Haiku 5.5 effort는 `low`/`medium`/`high`/`xhigh`/`max` 다섯 단계이고 기본값은 `medium`이다.
   - 문서 권장: 대부분은 medium으로 시작하고, 엄격한 지시 수행이나 어려운 작업은 high, `xhigh`/`max`는 평가에서 이득이 확인될 때만 쓴다.
   - 그래서 medium/high를 골랐다. 처음 버전은 low/high였다.
   - effort는 행동 신호이지 고정 토큰 예산이 아니다. probe에서 high(3.7s, $0.00039)가 medium(5.0s, $0.00044)보다 빠른 경우도 있었다.
3. **Haiku 응답 형식**
   - structured output(`output_config.format` json_schema)으로 받는다. `move`는 합법 수 enum이라 불법 수가 원천 차단된다.
   - `comment`는 한국어 한 줄 코멘트다. Haiku 응답의 일부이며 출력 토큰 비용에 포함된다. 화면에는 말풍선으로 보인다.
4. **실패 처리**
   - API 오류 시 남은 시간 안에서 최대 3회 다시 시도한다. 그래도 실패하면 무작위 합법 수를 두고 "대체 수"로 집계한다.
   - 시간 초과로 끊긴 호출은 오류가 아니라 시간 패로 처리한다.
5. **`--use-system-ca`**
   - 사내 TLS 검사 프록시 때문에 OpenRouter 호출이 `SELF_SIGNED_CERT_IN_CHAIN`으로 실패했다.
   - macOS 키체인 CA를 신뢰하도록 모든 서버 스크립트에 넣었다. 프록시가 없는 환경에서도 해롭지 않다.
6. **vitest 제거**: npm 10.9.2에서 `Cannot read properties of null (reading 'edgesOut')` 설치 오류가 나서 `node:test`로 바꿨다.
7. **DB**: `node:sqlite`(Node 내장, 의존성 없음)를 쓴다. SQL은 D1 호환이다.

## 5. API 메모 (구현 시 확인한 실제 형태)

| AI | 엔드포인트 / 모델 | 요청 핵심 | 응답 핵심 | 비용 계산 |
| --- | --- | --- | --- | --- |
| Jev | `POST https://openrouter.ai/api/alpha/decisions`, `~typesafe/jev-latest` (당시 jev-1.14로 해석) | `state`, `questions.move = {type:"choice", instructions, criteria:{SAN: 설명}}` | `answers.move.choice`, `probabilities`(객체) | `usage.cost`(USD) 그대로 |
| Decisions | `POST https://api.openai.com/v1/decisions`, `gpt-6-luna` | `input`, `questions:[{name, type:"choice", instructions, choices:[{value, description}]}]` | `answers[]`, `probabilities`(배열), `type:"refusal"` 가능 | (입력 − 캐시) × $0.10/M, 출력 무과금 |
| Haiku 5.5 | Anthropic Messages, `claude-haiku-5-5`, `@anthropic-ai/sdk` | `output_config: {effort, format}`, max_tokens 8000(high는 16000) | text 블록의 JSON `{move, comment}` | 입력 $0.10/M, 출력 $0.50/M |

환경 변수는 `OPENROUTER_KEY`, `OPENAI_API_KEY`, `CLAUDE_API_KEY`이다(`.env.example` 참고). 단가가 바뀌면 `server/ai/engines.ts`의 `PRICE`와 `shared/types.ts`의 `pricing` 문구를 함께 고친다.

## 6. 관찰된 경향 (구버전 포함 테스트 대국 기준, 표본 적음)

- Jev와 Decisions끼리 두면 3회 반복 무승부로 끝나는 경우가 많았다.
- Haiku는 생각 시간이 길어서 10분 대국에서 시간 패가 나왔다(수당 평균 약 8.6s). AI vs AI로 Haiku를 볼 때는 15분 이상이나 수당 추가 시간을 권장한다.
- 대국당 비용은 대략 $0.001~0.01 수준이다.

## 7. 알려진 한계

- 진행 중 대국(`GameRoom`)은 서버 메모리에만 있다. 서버를 재시작하면 진행 중이던 대국은 "중단"으로 저장된다(`abortOrphans`). `npm run dev`의 서버 watch 재시작도 마찬가지다.
- 인증, 사용자 구분, 요청 한도가 없다. 로컬 전용이며 공개 배포 전에 반드시 필요하다.
- 실시간 갱신은 SSE이다. Cloudflare로 옮길 때 WebSocket hibernation으로 바꿀 예정이다.
- 클라이언트 시계는 서버 스냅샷(`serverNow`) 기준으로 보간한다. 네트워크 지연만큼 오차가 있을 수 있지만 판정은 서버가 한다.

## 8. 다음 할 일 후보

1. **Cloudflare 이전**: README "Cloudflare 이전 시 매핑" 참고.
   - `GameRoom` → Durable Object. 시계 만료는 DO alarm으로 처리한다.
   - `GameStore` → D1, `app.ts` → Workers 엔트리. 키는 `wrangler secret`으로 넣는다.
2. **멀티플레이**: `PlayerConfig`에 원격 사람 플레이어를 추가하고, DO가 양쪽 연결을 중계한다.
3. **모바일 앱 배포 시 아키텍처**: 이전 세션에서 합의했다.
   - 앱에는 공급자 키를 절대 넣지 않는다. 모든 AI 호출은 Workers/DO가 대신한다.
   - 범용 프록시가 아니라 "이 대국에서 수 하나 요청" 같은 좁은 API만 연다.
   - App Attest / Play Integrity와 사용자 인증을 붙인다.
   - 사용자별 요청 한도와 지출 상한을 둔다.
   - 과금은 IAP로 하고, 실시간 갱신은 WebSocket으로 한다.
4. **비교 기능 보강(선택)**
   - 같은 대진을 N판 자동 반복하는 배치 아레나(비용 상한 필수)
   - 색 교대 매치, Elo 추정
5. **effort 확장(선택)**: 평가가 필요하면 `SELECTABLE_EFFORTS`에 `low`나 `xhigh`를 추가한다. 이때 `Effort` 타입, `EFFORT_TEXT`, `PlayerBar`의 `BADGE`를 함께 고친다.

## 9. 새 작업 공간에서 시작하기

```bash
unzip chess-ai-arena-*.zip && cd chess
cp .env.example .env.local    # 키 3개를 직접 채운다 (압축에는 키가 없다)
npm ci
npm test && npm run build     # 정상 확인
npm run probe                 # 선택: 실제 API 4종 1회씩 호출 (약 $0.002)
npm run dev                   # http://localhost:5173
```

git 이력은 압축에 들어 있지 않다. 원본은 `craft` 저장소의 `workspace-claude/chess`에 있다. 최신 커밋은 "구버전 호환 코드 제거 + 인수인계 문서" 커밋이다.
