# 체스 한 판 — chess.zowoo.uk

가입 없이 바로 두는 무료 온라인 체스입니다. lichess와 Duolingo 체스에서 영감을 받았습니다.

- **사람과 대국**: 익명으로 방을 만들고 로비에 공개하거나 링크로 초대합니다. 다른 사람이 들어오면 바로 시작합니다. 관전도 됩니다.
- **AI와 대국 / AI vs AI**: TypeSafe **Jev**, OpenAI **Decisions**, Anthropic **Claude Haiku 5.5**(Medium/High) 중에서 골라 대국하거나, AI끼리 붙여 실력과 API 비용을 비교합니다.
- **감정 표현**: 사람 대 사람 대국에서 6가지 감정 표현을 보냅니다(하스스톤 방식). 채팅은 없습니다.
- 무승부 제안, 재대결(색 교대), 기권, 첫 수 전 취소, 기보 되돌려 보기, PGN 복사, 효과음, 다크 모드를 지원합니다.

## 구조

```mermaid
flowchart LR
  B[브라우저 SPA<br/>React + Vite] -- "HTTP /api/*" --> W[Worker<br/>Hono]
  B -- "WebSocket /api/games/:id/ws" --> DO
  W -- "RPC init/join/view" --> DO[Durable Object<br/>GameRoom<br/>대국 1판 = 1개]
  W --> D1[(D1 chess<br/>로비·기록·통계·AI 한도)]
  DO -- "lifecycle 저장" --> D1
  DO -- "alarm: 시간 패 / AI 턴" --> AI[OpenRouter · OpenAI · Anthropic]
```

| 경로 | 설명 |
| --- | --- |
| `worker/index.ts` | Worker 엔트리. Hono API, 한도 검사, DO 라우팅 |
| `worker/room.ts` | `GameRoom` Durable Object. 상태 저장, WebSocket hibernation, alarm |
| `worker/game.ts` | 규칙·시계·좌석 토큰 권한(런타임 독립, 단위 테스트 대상) |
| `worker/ai/` | AI 어댑터(`engines.ts`), 프롬프트용 포지션(`position.ts`), AI 턴 실행(`turn.ts`) |
| `worker/store.ts`, `quota.ts` | D1 로비/기록/통계, 일일 AI 한도 |
| `shared/types.ts` | 서버·클라이언트 공용 타입, 엔진 메타데이터, 감정 표현, 한도 |
| `src/` | React UI (모바일 세로: Duolingo 스타일, 가로: lichess 스타일) |
| `migrations/` | D1 스키마 |

익명 신원: 브라우저가 무작위 토큰(localStorage `chess.token`)과 닉네임을 만듭니다. 토큰이 곧 좌석 권한이며 서버 밖으로 노출되지 않습니다.

## AI 비용 보호

| 한도 | 값 | 위치 |
| --- | --- | --- |
| 방문자(IP 해시)당 하루 AI 대국 | 10판, 한국 시간 자정 초기화 | `wrangler.jsonc` `AI_DAILY_LIMIT` |
| 전체 하루 AI 대국 | 600판 | `AI_GLOBAL_DAILY_LIMIT` |
| 방문자당 동시 AI 대국 | 2판 | `worker/index.ts` |
| AI 대국 시간 | 최대 30분 + 수당 10초 | `shared/types.ts` `LIMITS` |
| API 요청 | IP당 분당 60회(대국 생성·참가) | `ratelimits` |

사람 대 사람 대국은 무제한입니다. AI 대국 한 판의 비용은 보통 $0.001~0.01입니다.

## 로컬 실행

```bash
npm ci
cp .env.example .env.local     # OPENROUTER_KEY, OPENAI_API_KEY, CLAUDE_API_KEY
npm run db:migrate:local
npm run dev                    # web http://localhost:5173 · worker http://localhost:8787
API_PORT=8788 npm run dev      # 8787이 사용 중일 때
```

| 명령 | 설명 |
| --- | --- |
| `npm run typecheck` | 앱 / Worker / 테스트 tsconfig 3개 타입 검사 |
| `npm test` | 규칙·시계·권한·AI 턴·통계 단위 테스트 (`node:test`) |
| `npm run build` | 타입 검사 + Vite 빌드(`dist/`) |
| `npm run deploy` | 빌드 후 `wrangler deploy` (chess.zowoo.uk) |
| `npm run db:migrate` | 운영 D1에 마이그레이션 적용 |
| `npm run types` | `wrangler.jsonc` 변경 후 `worker-configuration.d.ts` 재생성 |
| `npm run probe` | 4개 AI 구성을 실제 API로 한 번씩 호출 (소액 과금) |

## 배포

```bash
npx wrangler d1 migrations apply chess --remote
npm run deploy
# 키는 최초 1회 (값을 화면에 찍지 않도록 파이프로)
grep '^CLAUDE_API_KEY=' .env.local | cut -d= -f2- | tr -d '\n' | npx wrangler secret put CLAUDE_API_KEY
curl -sI https://chess.zowoo.uk/api/quota | grep cf-placement   # remote-ICN 이어야 함
```

한국 트래픽은 Cloudflare HKG colo로 들어가는데 Anthropic/OpenAI가 홍콩 요청을 403으로 막습니다. 그래서 `placement`를 `aws:ap-northeast-2`(서울)로 고정했고, DO도 이 Worker에서 생성되므로 서울 근처에 만들어집니다.

## AI 구성 (4종)

| AI | API | 변형 |
| --- | --- | --- |
| Jev | OpenRouter `POST /api/alpha/decisions`, `~typesafe/jev-latest`, choice 질문 | 없음 |
| Decisions | OpenAI `POST /v1/decisions`, `gpt-6-luna`, choice 질문 | 없음 |
| Haiku 5.5 Medium | Anthropic Messages, `claude-haiku-5-5`, structured output(합법 수 enum) | `effort: medium` |
| Haiku 5.5 High | 위와 동일 | `effort: high` |

모든 AI는 같은 입력(FEN, 보드 그림, 기보, 합법 수 목록)과 같은 한 줄 지시문만 받습니다. API 대기 시간도 해당 AI의 시계에서 빠지고, API 오류가 3번 이어지면 무작위 합법 수로 대체합니다.
