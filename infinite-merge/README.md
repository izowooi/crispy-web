# 인피니티 머지 · 五行 Alchemy

나무(木)·불(火)·흙(土)·금속(金)·물(水) 다섯 원소에서 시작하는 단어 연금술 게임입니다. 원소 두 개를 겹치면 AI가 새 원소를 만들어 내고, 한 번 발견된 조합은 모든 플레이어가 공유하는 레시피 책에 남습니다.

- **호스팅:** https://merge.zowoo.uk (Cloudflare Workers + D1). 로그인 없이 바로 시작하며, 연성은 운영자의 Claude Haiku 크레딧으로 처리합니다.
- **내 PC에서 실행:** **Sign in with ChatGPT**로 로그인하면 내 ChatGPT Plus/Pro 플랜 사용량으로 연성합니다. 개발자의 API 키가 필요 없습니다.

> 이 프로젝트는 두 가지를 실험합니다. (1) API 키 없이 구독자의 사용량으로 AI 서비스를 만들 수 있는가, (2) Cloudflare 무료 플랜만으로 공개 AI 게임을 안전하게 운영할 수 있는가. Cloudflare 학습 교재는 [`docs/learn/`](docs/learn/README.md)에 있습니다.

## 빠른 시작

### 처음 클론했다면 (Cloudflare 계정 없이)

```bash
npm install
npm run dev:local    # 로컬 D1(.wrangler/state)에 테이블을 만들고 http://127.0.0.1:3000 실행
```

1. **http://127.0.0.1:3000**을 엽니다(`localhost`로 열면 127.0.0.1로 이동합니다).
2. **Continue with ChatGPT**를 누르고 OpenAI 화면에서 로그인 → 워크스페이스 선택 → 에이전트 이름(기본값 `Infinite Merge`)과 권한(*ChatGPT 플랜 사용* 포함)을 승인합니다.
3. 게임으로 돌아오면 원소를 끌어다 겹치면 됩니다.

AI 없이 UI만 보려면 `npm run dev:mock`을 쓰세요(오프라인 가짜 연성).

### 운영자 (호스팅과 같은 DB 사용)

```bash
npx wrangler login   # 최초 1회
npm run dev          # 원격 D1(운영 DB)에 붙어서 http://127.0.0.1:3000 실행
```

`npm run dev`에서 만든 레시피는 merge.zowoo.uk에도 바로 보입니다. 원격 DB는 운영 데이터이므로 위험한 실험은 `npm run dev:local`에서 하세요.

### 내 Cloudflare 계정으로 호스팅하려면 (fork)

1. `npx wrangler d1 create infinite-merge` → 출력된 `database_id`를 `wrangler.jsonc`에 넣습니다.
2. `wrangler.jsonc`의 `routes`(도메인)와 `TURNSTILE_SITE_KEY`를 내 것으로 바꾸거나 지웁니다.
3. `npm run db:migrate:remote` → `npm run deploy`
4. `npx wrangler secret put ANTHROPIC_API_KEY` (게스트 모드용, 선택)

자세한 내용은 [docs/HOSTING.md](docs/HOSTING.md)와 [교재 2장](docs/learn/02-workers-stack.md)을 보세요.

## 게스트 모드 (로그인 없이, Claude Haiku 5.5)

ChatGPT 구독이 없는 사람도 플레이할 수 있게 **"로그인 없이 바로 시작"** 버튼을 두었습니다. 호스팅에서는 이것이 유일한 입장 방법입니다. 게스트의 연성은 운영자의 Anthropic API 크레딧으로 `claude-haiku-5-5`가 처리합니다(`effort: low`, JSON 스키마 구조화 출력).

- 로컬: `.env.local`에 `ANTHROPIC_API_KEY=sk-ant-...`를 넣고 재시작합니다. 키가 없거나 `sk-ant-`로 시작하지 않으면 버튼이 비활성화되고 서버 로그에 경고가 찍힙니다.
- 호스팅: `npx wrangler secret put ANTHROPIC_API_KEY` ([교재 3장](docs/learn/03-secrets.md))

| 한도 (한국 시간 자정 초기화) | 기본값 | 설정 |
| --- | --- | --- |
| 게스트 1명당 모델 호출 | 60 | `INFINITE_MERGE_GUEST_DAILY` |
| IP 1개당 모델 호출 | 150 | `INFINITE_MERGE_GUEST_IP_DAILY` |
| IP 1개당 새 게스트 수 | 20 | `INFINITE_MERGE_GUEST_JOIN_IP_DAILY` |
| 전체 게스트 합계 | 1,500 | `INFINITE_MERGE_GUEST_GLOBAL_DAILY` |
| 즉시 끄기 | — | `INFINITE_MERGE_GUEST=off` 또는 키 제거 |

| 항목 | 동작 |
| --- | --- |
| 레시피 캐시 | 전체 플레이어가 공유합니다. 이미 발견된 조합은 모델을 호출하지 않아 횟수와 크레딧을 쓰지 않습니다 |
| 호스팅 방어 | same-origin 검사, Rate Limiting binding, Turnstile, IP 해시별 일일 쿼터 ([교재 4장](docs/learn/04-defense.md)) |
| 게스트 → ChatGPT 로그인 (로컬) | 게스트로 발견한 원소를 ChatGPT 계정으로 옮깁니다 |
| 비용 | 연성 1회에 입력 약 1,300토큰, 출력 약 50토큰. Haiku 5.5 기준 약 $0.00016, 전체 한도 1,500회는 약 $0.25/일 |

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

따라서 ChatGPT 로그인만 쓴다면 `.env`도 필요 없습니다. 선택 옵션은 `.env.example`에 정리되어 있습니다.

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
  host id(urn:uuid) 준비, state·nonce·PKCE 생성 → D1 im_oauth_pending에 저장
  ──302──▶ auth.openai.com/api/accounts/authorize?client_id=dynamic_agent_client&agent_name_hint=Infinite Merge&…
사용자 로그인·동의
  ──302──▶ http://127.0.0.1:3000/auth/callback?code&state&client_id=oaiapp_…
/auth/callback
  state 검증 → 코드 교환(PKCE) → ID 토큰 JWKS 서명·iss·aud·nonce 검증
  → 권한 범위에 chatgpt.tokens.use.direct가 있는지 확인
  → .data/credentials/<client_id>.json (0600) 저장 → D1 im_sessions + 세션 쿠키 발급
게임 /api/combine
  레시피 캐시에 있으면 즉시 반환
  없으면 access token(만료 2분 전 자동 refresh) → /v1/responses 스트리밍
  → JSON 파싱 → D1 저장
```

## 검증 결과

| 항목 | 상태 |
| --- | --- |
| 실제 `auth.openai.com`이 동적 등록 authorize 요청을 받아들이는지 | ✅ 거절 없이 OpenAI 로그인 화면(`/log-in`)으로 이동 |
| 로그인 → 콜백 → 토큰 교환 → ID 토큰 검증 → 세션 → 스트리밍 연성 → 로그아웃(revoke) → 재로그인 | ✅ 가짜 OpenAI 서버로 브라우저 E2E 통과 |
| `reasoning` 파라미터 거절 시 자동 제외 후 재시도, 스트림 중 `usage_limit` → 한도 모달 | ✅ 가짜 서버로 확인 |
| **실제 ChatGPT 계정으로 끝까지 연성** | ✅ 2026-10-13 확인 (`oaiapp_…` 발급 → 연성 성공, 사용 모델 기록됨) |
| 일시 과부하(`server_is_overloaded`) | ✅ 실계정에서 1회 관측 → 자동 재시도로 대응 (아래 참고) |
| 호스팅(merge.zowoo.uk): Turnstile → 게스트 입장 → Haiku 연성 → D1 기록 | ✅ 2026-10-14 실제 브라우저로 확인 (연성 28회, 서울 placement로 HKG 403 없음) |
| 로컬 `npm run dev`와 호스팅이 같은 D1을 공유 | ✅ 로컬에서 만든 레시피가 원격 `im_recipes`에 기록됨 |

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

## 호스팅과 Sign in with ChatGPT

- **plan usage를 자유롭게 쓸 수 있는 범위는 "오픈소스·로컬 실행 앱"입니다.** 원격 호스팅이 사용자의 플랜을 쓰려면 [interest form](https://openai.com/form/sign-in-with-chatgpt-interest/)으로 승인을 받아야 합니다.
- 그래서 merge.zowoo.uk에서는 SIWC를 끕니다. `/auth/chatgpt`와 `/auth/callback`은 루프백(127.0.0.1)이 아닌 호스트에서 404를 돌려주고, 화면에서도 ChatGPT 버튼을 숨깁니다(`StateResponse.siwc`). `INFINITE_MERGE_SIWC=off`로 로컬에서도 끌 수 있습니다.
- 웹사이트용 경로(`/siwc/website`)는 현재 identity-only라 플랜 사용을 할 수 없습니다.

## 데이터

게임 데이터는 Cloudflare **D1**(`infinite-merge`)에 있고, 모든 테이블 이름은 `im_`으로 시작합니다. 스키마는 [`migrations/`](migrations/)에 있습니다.

| 테이블 | 내용 |
| --- | --- |
| `im_elements` | 세계의 모든 원소 (기본 5원소는 migration이 넣음) |
| `im_recipes` | 전 세계 공용 레시피 캐시 |
| `im_discoveries` | 플레이어별 보유 원소 |
| `im_accounts`, `im_sessions` | 게스트·ChatGPT 계정, 로그인 세션 |
| `im_oauth_pending` | SIWC 진행 중 상태 (로컬 전용) |
| `im_guest_usage` | 게스트 일일 사용량 (방어 카운터) |
| `im_counters` | trigger가 유지하는 원소 수 |

| 실행 방법 | 바라보는 D1 |
| --- | --- |
| merge.zowoo.uk, `npm run dev` | 원격(운영) D1 |
| `npm run dev:local`, `dev:mock`, `preview` | 로컬 사본 `.wrangler/state/` |

SIWC 토큰은 DB에 넣지 않고 로컬 `.data/credentials/<client_id>.json`(0600)에, 설치 ID는 `.data/host.json`에 둡니다. `.data/`와 `.wrangler/`는 gitignore 대상입니다.

## 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (127.0.0.1:3000, **원격 D1**) |
| `npm run dev:local` | 개발 서버 (로컬 D1, Cloudflare 계정 불필요) |
| `npm run dev:mock` | 로그인 없는 오프라인 mock 연성 (로컬 D1) |
| `npm test` | vitest (D1 shim, 쿼터, 가드, PKCE, SSE 파서, 조합 로직) |
| `npm run lint` / `npm run typecheck` | 정적 검사 |
| `npm run db:migrate:local` / `db:migrate:remote` | D1 migration 적용 |
| `npm run preview` | Cloudflare 빌드 후 workerd(실제 Workers 런타임)로 로컬 실행 (127.0.0.1:8787, 로컬 D1) |
| `npm run deploy` | Cloudflare 빌드(정적 페이지 승격, 시크릿 scrub/verify) 후 배포 |
| `npm run lab:d1` · `lab:size` · `lab:clone-remote` · `lab:hammer` | 학습 실습 도구 ([docs/learn](docs/learn/README.md)) |

`npx tsc --noEmit`은 `npm run dev`나 `npm run build`를 한 번 실행한 뒤에 돌리세요. Next가 `LayoutProps` 같은 타입을 그때 생성합니다.

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
