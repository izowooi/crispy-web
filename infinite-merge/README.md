# 인피니티 머지 · 五行 Alchemy

나무(木)·불(火)·흙(土)·금속(金)·물(水) 다섯 원소에서 시작하는 단어 연금술 게임입니다. 원소 두 개를 겹치면 AI가 새 원소를 만들어 내고, 그 AI 호출은 **Sign in with ChatGPT로 로그인한 사용자의 ChatGPT Plus/Pro 플랜 사용량**으로 처리됩니다. 개발자의 API 키는 쓰지 않습니다.

> 이 프로젝트의 목적은 "API 키 없이, 구독 사용자의 사용량으로 AI 서비스를 만들 수 있는가"를 검증하는 것입니다. 결론과 제약 조건은 아래 [검증 결과](#검증-결과)를 참고하세요.

## 빠른 시작

```bash
npm install
npm run dev          # http://127.0.0.1:3000  (localhost 말고 127.0.0.1)
```

1. 브라우저에서 **http://127.0.0.1:3000**을 엽니다. `localhost`로 열면 자동으로 127.0.0.1로 이동합니다.
2. **Continue with ChatGPT**를 누릅니다.
3. OpenAI 화면에서 다음 순서로 진행합니다.
   1. ChatGPT 계정으로 로그인합니다.
   2. 워크스페이스를 고릅니다.
   3. 에이전트 이름(기본값 `Infinite Merge`, 수정 가능)과 권한을 확인한 뒤 승인합니다. 이 권한에는 *ChatGPT 플랜 사용*이 포함되어야 합니다.
4. 게임으로 돌아오면 "ChatGPT 플랜을 사용하고 있어요" 안내가 한 번 나옵니다. 이후 원소를 끌어다 겹치면 됩니다.

로그인 없이 UI만 확인하려면 `npm run dev:mock`을 실행하세요. 오프라인 가짜 연성 엔진으로 동작합니다.

## 게스트 모드 (로그인 없이, Claude Haiku 5.5)

ChatGPT 구독이 없는 사람도 플레이할 수 있게 첫 화면에 **"로그인 없이 바로 시작"** 버튼을 두었습니다. 게스트의 연성은 운영자의 Anthropic API 크레딧으로 `claude-haiku-5-5`가 처리합니다(`effort: low`, JSON 스키마 구조화 출력).

1. `.env.local`에 `ANTHROPIC_API_KEY=sk-ant-...`를 넣고 개발 서버를 재시작합니다. 키가 없거나 `sk-ant-`로 시작하지 않으면(예: `==`, 따옴표 오타) 버튼이 비활성화되고 서버 로그에 `[guest] ANTHROPIC_API_KEY does not start with "sk-ant-"` 경고가 찍힙니다.
2. 한도를 정합니다. 둘 다 한국 시간 자정에 초기화됩니다.
   - `INFINITE_MERGE_GUEST_DAILY`: 게스트 한 명당 하루 모델 호출 수 (기본 60)
   - `INFINITE_MERGE_GUEST_GLOBAL_DAILY`: 모든 게스트를 합친 하루 모델 호출 수 (기본 1500)
3. 즉시 끄려면 `INFINITE_MERGE_GUEST=off`로 설정하거나 키를 제거합니다.

| 항목 | 동작 |
| --- | --- |
| 레시피 캐시 | 전체 플레이어가 공유합니다. 이미 누군가 발견한 조합은 모델을 호출하지 않아 횟수와 크레딧을 쓰지 않습니다 |
| 게스트 한도 소진 | "오늘의 게스트 연성 횟수를 모두 썼어요" 안내와 함께 Continue with ChatGPT 버튼을 보여 줍니다 |
| 전체 한도 소진·크레딧 부족·키 오류 | 게스트 모드를 일시 중단하고 ChatGPT 로그인을 권합니다 |
| 게스트 → ChatGPT 로그인 | 게스트로 발견한 원소를 ChatGPT 계정으로 옮깁니다 |
| 크레딧 비용 감 | 연성 한 번에 입력 약 600토큰, 출력 수십 토큰입니다. Haiku 5.5 단가($0.10/$0.50 per MTok) 기준 1,500회에 약 0.1~0.2달러로 추정합니다(실측 아님) |

> 게스트 한도는 브라우저 쿠키 단위라서, 쿠키를 지우면 새 게스트가 됩니다. 전체 일일 한도가 크레딧의 최종 상한 역할을 합니다. 호스팅할 때는 IP 단위 제한이나 Cloudflare Turnstile 추가를 권장합니다.

## Sign in with ChatGPT 설정 가이드 (처음 하는 경우)

### 개발자 콘솔에 등록할 것이 없습니다

이 앱은 OpenAI 문서의 **"ChatGPT plan usage in your open-source app"** 경로를 사용합니다. 이 경로는 동적 클라이언트 등록 방식입니다.

| 항목 | 값 |
| --- | --- |
| client_id | 첫 로그인 때 `dynamic_agent_client`를 보내면 OpenAI가 `oaiapp_…` 형식의 사용자별 client_id를 발급해 줍니다 |
| client secret / API 키 | **필요 없음** (PKCE public client) |
| redirect URI | `http://127.0.0.1:<port>/auth/callback` (루프백만 허용, `localhost` 불가) |
| scope | `openid profile email offline_access resource.invoke chatgpt.tokens.use.direct` |
| resource | `https://api.openai.com/v1` |
| 추론 호출 | `POST https://api.openai.com/v1/responses` + `Authorization: Bearer <access_token>`, `store:false`, `stream:true` 필수 |

따라서 `.env`도 필요 없습니다. 선택 옵션은 `.env.example`에 정리되어 있습니다.

### 사용자 쪽 조건

- **ChatGPT Plus 또는 Pro** 구독이 있어야 합니다. Free 계정은 로그인은 되지만 플랜 사용이 거부됩니다(`not_eligible`).
- 사용량과 앱 연결은 [chatgpt.com/settings/usage](https://chatgpt.com/settings/usage)에서 관리합니다.
  - 앱별 주간 한도를 10~100%로 정할 수 있습니다.
  - 한도 초과 시 크레딧을 쓸지 정할 수 있습니다.
  - 앱 연결을 해제할 수 있습니다.
- Plus의 5시간 사용 한도는 이 앱을 포함해 플랜을 쓰는 모든 앱이 **공유**합니다. 이 앱만의 별도 한도는 없습니다.

### 흐름

```
브라우저 ──Continue with ChatGPT──▶ /auth/chatgpt
  host id(urn:uuid) 준비, state·nonce·PKCE 생성 → oauth_pending 테이블에 저장
  ──302──▶ auth.openai.com/api/accounts/authorize?client_id=dynamic_agent_client&agent_name_hint=Infinite Merge&…
사용자 로그인·동의
  ──302──▶ http://127.0.0.1:3000/auth/callback?code&state&client_id=oaiapp_…
/auth/callback
  state 검증 → 코드 교환(PKCE) → ID 토큰 JWKS 서명·iss·aud·nonce 검증
  → 권한 범위에 chatgpt.tokens.use.direct가 있는지 확인
  → .data/credentials/<client_id>.json (0600) 저장 → 세션 쿠키 발급
게임 /api/combine
  레시피 캐시에 있으면 즉시 반환
  없으면 access token(만료 2분 전 자동 refresh) → /v1/responses 스트리밍
  → JSON 파싱 → DB 저장
```

## 검증 결과

| 항목 | 상태 |
| --- | --- |
| 실제 `auth.openai.com`이 동적 등록 authorize 요청을 받아들이는지 | ✅ 거절 없이 OpenAI 로그인 화면(`/log-in`)으로 이동 |
| 로그인 → 콜백 → 토큰 교환 → ID 토큰 검증 → 세션 → 스트리밍 연성 → 로그아웃(revoke) → 재로그인 | ✅ 가짜 OpenAI 서버로 브라우저 E2E 통과 |
| `reasoning` 파라미터 거절 시 자동 제외 후 재시도, 스트림 중 `usage_limit` → 한도 모달 | ✅ 가짜 서버로 확인 |
| **실제 ChatGPT 계정으로 끝까지 연성** | ✅ 2026-10-13 확인 (`oaiapp_…` 발급 → 연성 성공, 사용 모델 기록됨) |
| 일시 과부하(`server_is_overloaded`) | ✅ 실계정에서 1회 관측 → 자동 재시도로 대응 (아래 참고) |

### 실제 계정 수동 검증 체크리스트

1. `npm run dev`를 실행하고 http://127.0.0.1:3000 → Continue with ChatGPT → 승인합니다.
   - 터미널에 `[siwc] sign-in failed`가 없어야 합니다.
   - `.data/credentials/oaiapp_*.json` 파일이 생기고 권한이 `-rw-------`이어야 합니다.
2. 오른쪽 위 칩에 **Using ChatGPT plan**이 표시되는지 확인합니다. 계정 메뉴의 "연성 모델"에 내 계정의 모델 목록이 나와야 합니다.
3. 불 + 물을 겹쳐 결과가 나오는지 확인합니다.
   - 터미널에 `POST /api/combine 200`이 찍혀야 합니다.
   - `[siwc] api error`가 있다면 `code`와 `request_id`를 기록합니다.
4. 같은 조합을 다시 해 보면 즉시 결과가 나와야 합니다(캐시, 사용량 차감 없음).
5. chatgpt.com/settings/usage에 **Infinite Merge** 앱이 보이는지 확인합니다.
6. 계정 메뉴에서 로그아웃합니다. 로그아웃 토스트에 "원격 세션 해제를 확인하지 못했어요"가 없어야 합니다.

## 모델과 재시도

- 연성 모델은 다음 순서로 정합니다.
  1. 계정 메뉴에서 직접 고른 모델
  2. `INFINITE_MERGE_MODEL` 환경변수
  3. 자동 선택: 계정 모델 목록에서 경량 모델(`luna`·`mini`·`nano` 등)을 먼저 찾고, 없으면 목록의 첫 번째 모델
- 두 단어를 합쳐 명사 하나를 짓는 작업이라 경량 모델로 충분합니다. 경량 모델이 더 빠르고 사용자 플랜도 덜 소모합니다. 자동 선택된 모델과 목록은 서버 로그 `[alchemy] auto model=`에서 확인할 수 있습니다.
- 일시 장애는 서버가 조용히 최대 2회 재시도합니다.
  - 대상: `server_is_overloaded`, 5xx, `*_unavailable`, 스트림 중단
  - 대기 시간: 약 0.8초 → 2.5초(±20% 지터). `Retry-After` 헤더가 오면 그 값을 따릅니다(최대 5초).
  - 전체 15초 예산을 넘길 것 같으면 재시도하지 않고 바로 사용자에게 넘깁니다.
- 사용 한도 초과, 자격 없음, 인증 만료, 지원하지 않는 기능 오류는 **재시도하지 않습니다**. 재시도해도 성공할 수 없고 사용자 플랜만 소모하기 때문입니다.

## 배포 전에 알아야 할 제약 (중요)

- **plan usage를 자유롭게 쓸 수 있는 범위는 "오픈소스·로컬 실행 앱"입니다.** 원격으로 호스팅하는 웹사이트나 유료 앱이 사용자의 플랜을 쓰려면 [interest form](https://openai.com/form/sign-in-with-chatgpt-interest/)으로 신청해 승인을 받아야 합니다.
- 웹사이트용 경로(`/siwc/website`)는 현재 **identity-only**입니다. 이름·이메일·사진만 받을 수 있고, 미리 등록한 client_id가 필요하며, 선택된 파트너에게만 제공됩니다.
- 루프백 콜백(127.0.0.1)은 브라우저를 띄운 컴퓨터로만 돌아옵니다. 그래서 지금 구조는 "각 사용자가 자기 컴퓨터에서 실행하는 앱"입니다. 모바일이나 원격 배포로 가려면 OpenAI의 승인을 받은 client_id와 HTTPS 콜백 방식으로 바꿔야 합니다.

## 데이터 (로컬)

`.data/`는 gitignore 대상입니다.

| 파일 | 내용 |
| --- | --- |
| `infinite-merge.db` | `node:sqlite` DB. 테이블: `elements`, `recipes`(전 세계 공용 레시피 캐시), `discoveries`(사용자별 보유), `accounts`, `sessions`, `oauth_pending`. Cloudflare D1과 호환되는 SQLite 문법입니다 |
| `host.json` | 이 설치본의 `ext_agent_host_id` (`urn:uuid:…`) |
| `credentials/<client_id>.json` | 토큰 (0600, 원자적 쓰기). 브라우저에는 저장하지 않습니다 |

Supabase나 D1로 옮길 때는 `lib/server/db.ts`의 스키마와 쿼리를 그대로 가져가면 됩니다. 단, 토큰은 DB가 아닌 별도의 비밀 저장소에 두는 것을 권장합니다.

## 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (127.0.0.1:3000) |
| `npm run dev:mock` | 로그인 없는 오프라인 mock 연성 |
| `npm test` | vitest 단위 테스트 (PKCE, authorize URL, SSE 파서, 에러 매핑, 출력 파싱, 조합 로직) |
| `npm run lint` / `npx tsc --noEmit` | 정적 검사 |
| `npm run build && npm start` | 프로덕션 빌드와 실행 (127.0.0.1:3000) |

## 문제 해결

| 증상 (`/?auth_error=…`) | 원인과 조치 |
| --- | --- |
| `access_denied` | 동의 화면에서 취소한 경우입니다. 다시 Continue with ChatGPT를 누르세요 |
| 로그인했는데 "플랜 미허용" | `chatgpt.tokens.use.direct`가 허용되지 않은 경우입니다. 배너의 버튼으로 다시 허용하세요 |
| `invalid_state` | 10분 이상 지났거나 다른 호스트(localhost)에서 시작한 경우입니다. 127.0.0.1에서 다시 시도하세요 |
| `registration_incomplete` | 콜백에 발급된 client_id가 없는 경우입니다. 다시 시도하세요 |
| 연성 시 "ChatGPT 플랜 사용 한도에 도달" | Settings → Usage에서 한도를 확인하세요. 이미 발견한 조합은 계속 만들 수 있습니다 |
| 연성 시 "지원하지 않는 기능" | 터미널 `[siwc] api error … param=` 값을 확인하세요 |

## 참고

- OpenAI 문서: [Sign in with ChatGPT](https://developers.openai.com/siwc/quickstart), [Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference), [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations), [Errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery), [UI/UX guidelines](https://developers.openai.com/siwc/ui-ux-guidelines)
- 게임 메커니즘 참고: [Infinite Craft](https://neal.fun/infinite-craft/)
