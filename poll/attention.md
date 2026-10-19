# attention — 사람이 알아야 할 것

작성: 2026-10-19 (KST)

## 1. 사람이 직접 확인해야 할 것

- [ ] **실제 Google 로그인 1회.** `https://poll.zowoo.uk`에 `@wemadeplay.com` 계정으로 로그인해서 아래를 직접 한 번씩 확인하세요.
  - 목록 → 질문 만들기 → 투표 → 투표 수정 → 질문 수정 → 삭제
  - 자동 검증은 service token으로 API와 UI만 확인했습니다. Google 로그인 화면 자체는 거치지 않았습니다.
- [ ] **관리자 Gmail(`izowooi85@gmail.com`) 로그인 1회.** 도메인 밖 관리자도 Access와 Worker를 통과하는지 확인하세요.
- [ ] **도메인 밖 계정 거부.** 일반 Gmail 같은 비관리자 계정으로 로그인을 시도해 Access 단계에서 막히는지 확인하세요.
- [ ] **OAuth 동의 화면 게시 상태.** Access가 쓰는 Google IdP(`70f7d8de-…`, 이름 "zowoo.uk 접속하기")는 client ID가 `…6t9.apps.googleusercontent.com`으로 끝나는 OAuth 클라이언트를 씁니다.
  - 이 클라이언트가 속한 GCP 프로젝트의 동의 화면이 **Testing**이면 등록된 테스트 사용자만 로그인됩니다.
  - 사내 구성원 전체가 쓰려면 **In production**(External)으로 게시해야 합니다. CLI로는 확인할 수 없습니다.
- [ ] **회사 Google Workspace 정책.** wemadeplay Workspace 관리자가 서드파티 앱 접근(App access control)을 제한하고 있으면 "차단된 앱"으로 막힐 수 있습니다. 첫 로그인 때 확인하세요.
- [ ] **VOTER_SECRET 백업 이동.** 이 Mac의 키체인(서비스 `poll.zowoo.uk-VOTER_SECRET`, 계정 `poll`)에만 있습니다. 비밀번호 관리자로 옮기세요. 잃어버리면 중복 투표 방지가 깨집니다(README 참고).
- [ ] **이번 작업에서 쓰지 않은 Google OAuth 클라이언트 정리**
  - 대상: GCP 프로젝트 `crispy-web`에 새로 만든 OAuth 클라이언트(`…q41.apps.googleusercontent.com`, redirect `/api/auth/callback/google`)
  - 이 앱은 로그인을 Cloudflare Access가 담당하므로 이 클라이언트를 쓰지 않습니다. Access의 콜백은 `https://izowooi.cloudflareaccess.com/cdn-cgi/access/callback`입니다.
  - `poll/.env.local`과 `poll/client_secret_*.json`에 이 클라이언트의 값이 들어 있습니다. 둘 다 `.gitignore`로 커밋에서 제외했고, 내용은 건드리지 않았습니다.
  - 작업 중 `.env.local` 형식을 확인하다가 **Client Secret 뒷부분 일부가 에이전트 도구 출력에 찍혔습니다.** 쓰지 않을 클라이언트라면 삭제하고, 다른 곳에 쓸 거라면 secret을 재발급(rotate)하세요.
- [ ] **커밋 push.** 로컬 커밋만 했고 push는 하지 않았습니다. 지시서가 push를 금지했기 때문입니다. 검토한 뒤 직접 push하세요.

## 2. 내가 임의로 정한 결정

### 인증·보안

- **엣지 vs Worker 403.** JWT 없이 오는 요청은 Access가 먼저 로그인 페이지로 302 보냅니다. 그래서 운영에서 "JWT 없는 `/api/polls` → 403"은 Worker까지 오지 않고 302로 끝납니다. Worker 자체의 403은 아래 두 가지로 확인했습니다.
  - 단위 테스트 (JWT 없음/위조/만료/aud/iss/도메인)
  - 운영에서 Access는 통과하지만 허용 목록에 없는 service token → Worker가 403
- **임시 service token 경로.** service token JWT에는 email이 없습니다. 그래서 `ALLOWED_SERVICE_TOKENS` 변수(기본값 빈 문자열)를 두었습니다.
  - 여기 있는 client id만 `service-token:<id>`라는 일반(비관리자) 사용자로 받아들입니다. 서명·aud·iss·exp 검증은 그대로 거칩니다.
  - 검증 때만 `wrangler deploy --var`로 잠깐 켰고, 끝난 뒤 빈 값으로 다시 배포했습니다. 토큰과 Access 정책도 삭제했습니다.
  - 설정 파일에 값이 들어 있으면 `npm run check:deploy`가 배포를 막습니다.
- **DEV_EMAIL 주입 방식.** `.dev.vars` 파일 대신 `npm run dev`의 `--var` 플래그로 넣습니다. `.dev.vars`가 있으면 테스트 런타임에도 섞여 들어가기 때문입니다.
  - 요청 호스트가 localhost일 때만 동작하게 이중으로 막았습니다.
  - `wrangler dev`가 URL 호스트를 route(`poll.zowoo.uk`)로 바꾸므로 `--local-upstream localhost:8799`를 씁니다.
- **로그.** Workers Logs는 켜 두되 `invocation_logs: false`로 했습니다. 요청 헤더(`Cf-Access-Authenticated-User-Email`, JWT)가 로그에 남지 않게 하기 위해서입니다. 코드는 이메일이나 요청 본문을 로그에 남기지 않습니다.
- **CSP.** `_headers`로 `default-src 'self'`, `frame-ancestors 'none'` 등을 지정했습니다. 그래서 테마 초기화 스크립트도 인라인이 아니라 별도 파일입니다.
- **요청 크기.** 본문은 16KB까지만 받습니다.
- **입력 검증.** 앞뒤 공백을 자르고, 제어문자는 거부합니다(설명의 줄바꿈은 허용). 같은 선택지 중복도 거부합니다.
- **`/api/me`.** 본인 이메일을 돌려주고 화면 하단에 표시합니다. 본인 정보이고 저장하지 않습니다.

### 레이트 리밋

- Cloudflare `ratelimits` 바인딩(120회/분)은 운영에서 400건/3초 버스트를 모두 통과시켰습니다. 문서상 위치별·근사치 동작이라 정확한 상한이 아닙니다.
- 그래서 **쓰기 요청(POST/PUT/DELETE)은 D1 카운터로 사용자당 분당 30회**를 정확히 제한합니다. 운영에서 31번째 요청이 429인 것을 확인했습니다.
  - 키는 `HMAC(VOTER_SECRET, "ratelimit:" + email)`이라 이메일이 남지 않습니다.
  - 지난 분의 행은 매번 정리합니다.
- 읽기는 바인딩만 적용합니다(best effort).

### 기능 해석

- **마감된 질문은 수정할 수 없고 삭제만 됩니다.** 마감 시각을 미래로 바꿔 다시 여는 것을 막기 위해서입니다. `after_close` 결과가 공개된 뒤 재투표되는 상황도 막습니다.
- **투표 후 잠기는 항목.** 선택지·복수 선택 여부에 더해 **결과 공개 방식(`results_mode`)도** 잠갔습니다. 잠그지 않으면 `after_close`를 `live`로 바꿔 마감 전 결과를 볼 수 있습니다.
- **투표 전 선택지 수정**은 전체 교체 방식입니다(선택지 id 새로 발급). 동시에 들어온 투표가 깨지지 않게 "투표 없음" 조건을 SQL에 걸었습니다.
- **투표·마감 원자성.** 투표 batch의 각 문장이 "아직 마감 전인지"를 다시 확인합니다. 마감 경계에서 끼어드는 투표도 서버가 거부합니다.
- **목록 응답에 선택지별 집계 포함.** 디자인 가이드(Polymarket 카드형 % 표시)에 맞추려고 넣었습니다. 공개 규칙은 상세와 같습니다(`after_close` + 마감 전이면 `null`).
- **페이지 범위.** 1~1000 페이지, 20개씩입니다.
- **시간.** 화면 입력·표시는 KST(UTC+9 고정, 서머타임 없음)이고, 저장은 UTC epoch ms입니다. 기본 마감은 지금부터 7일 뒤를 정시로 올린 시각입니다.
- **삭제 확인.** `window.confirm` 대신 "한 번 더 누르면 삭제" 2단계 버튼을 씁니다.

### 운영·배포

- **Access 앱 옵션.** 지시서에 없는 값은 아래처럼 정했습니다.
  - `app_launcher_visible: false`
  - `auto_redirect_to_identity: true` (Google로 바로 이동)
  - `http_only_cookie_attribute: true`, `same_site_cookie_attribute: lax`
- **배포 순서.** Access 앱을 먼저 만들고 배포했습니다. 커스텀 도메인 DNS가 열리는 순간부터 보호가 걸리게 하기 위해서입니다.
  - 그 뒤 `wrangler secret put VOTER_SECRET`을 실행했습니다. 그 사이 약 1분은 API가 500으로 fail-closed였습니다(사용자 없음).
- **VOTER_SECRET 생성.** `openssl rand -hex 32`로 만들어 화면에 출력하지 않고 키체인 → `wrangler secret put` 순서로 넣었습니다.
- **스모크 테스트 데이터.** 운영 D1에서 모두 삭제했습니다. `rate_limits`에는 HMAC 키 행만 남고 1분 뒤 정리됩니다.

### 개발 도구

- **테스트 도구.** `@cloudflare/vitest-pool-workers`는 deprecated라 후속인 `@cloudflare/vitest-plugin@1.4.4`를 썼습니다. 피어 의존성 때문에 vitest는 4.x로 고정했습니다.
- **npm.** 로컬 npm 10.9.3에서 의존성 설치가 `edgesOut` 오류로 실패해 `npx npm@11 install`로 설치했습니다. 이후 설치도 npm 11을 권장합니다.
- **스택은 지시서 그대로 유지했습니다.**

### 디자인·모션 (작업 중 추가 요청)

- **시각.** Polymarket 스크린샷을 기준으로 정했습니다.
  - 밑줄 탭, 둥근 카드, 선택지별 색 밑줄 막대와 % pill, 압축체 큰 숫자(선두 비율)
  - 모바일 하단 중앙의 "+ 새 질문" 플로팅 pill
- **글꼴.** 숫자용 Barlow Condensed(SIL OFL)를 `public/fonts/`에 자체 호스팅합니다. CSP 때문에 외부 폰트 CDN을 쓰지 않습니다. 한글은 시스템 글꼴입니다.
- **모션 출처.** prompt-motion.com 대부분은 영상 생성 프롬프트라 웹 UI에 그대로 쓸 수 없습니다. 그래서 UI 모션 항목인 @twoclipping "Shape morphing through UI states"의 원칙만 옮겼습니다.
  - 넘침이 아주 작은 spring
  - 내용 전환 시 짧은 blur
  - 두 끝이 다른 속도로 움직여 늘어나는 탭 밑줄
  - 스스로 그려지는 막대
  - 하나의 버튼이 라벨 → 로더 → 체크로 바뀌는 morph
  - 같은 출처의 금지 목록(튀는 easing, 글로우, 파티클, UI 크롬 그라데이션)을 따라 Polymarket "Build a Combo"의 그라데이션 pill은 단색으로 바꿨습니다.
- **모션 끄기.** `prefers-reduced-motion`이면 모든 모션을 끕니다.
- **라이트/다크.** 모노레포 UI 표준에 따라 넣었습니다. 기본은 라이트이고 `localStorage.theme`에 저장합니다.

## 3. 검증 증거 요약

- `npm test`: 45/45 통과 (JWT·도메인·DEV 우회·CSRF·voter_hash·중복/수정/마감/복수선택/선택지 수·권한·잠금·after_close·목록·레이트 리밋·이메일 미저장·엔트리 모듈 export)
- 운영 확인 내용:
  - Access 302 로그인 리다이렉트 (`/`, `/api/polls`, 위조 JWT 헤더)
  - `poll.izowooi.workers.dev` → 404(1042), `subdomain.enabled=false`
  - service token 경로: 목록·생성·투표·투표 수정·잠금 409·수정·삭제·CSRF 403·쓰기 429
  - 375px 실기 스크린샷: 가로 스크롤 없음, 콘솔 에러 없음 (`docs/screenshots/`)
  - D1 전 테이블 `SELECT` 결과 `@` 0건
