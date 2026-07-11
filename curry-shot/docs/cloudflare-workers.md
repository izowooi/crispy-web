# Cloudflare Workers 배포 가이드

이 문서는 Curry Shot을 현재 저장소의 OpenNext 설정 그대로 Cloudflare Workers에 배포하는 절차입니다. Cloudflare Pages용 절차가 아닙니다. 프로젝트 루트(`curry-shot/`)에서 명령을 실행하세요.

현재 배포 구성은 다음과 같습니다.

- Worker 이름: `curry-shot`
- Next.js 런타임: Node.js (`nodejs_compat`)
- Worker 진입점: `.open-next/worker.js`
- 정적 assets: `.open-next/assets`
- 배포 명령: `npm run deploy`
- 필수 운영 secret: `OPENAI_API_KEY`, Replicate key 한 종류, `CURRY_SHOT_ACCESS_CODE`

> [!CAUTION]
> **기존 OpenAI 및 Replicate key로 배포하지 마세요.** 초기 로컬 QA 중 폐기된 Pages 산출물의 server env fallback이 도구 실행 trace에 한 번 노출되었습니다. 외부 배포는 없었지만 두 provider key를 모두 회전하고, 이전 key를 폐기한 뒤 새 key만 사용해야 합니다. 값은 이 문서, Git, 명령 인자 또는 shell history에 기록하지 마세요.

## 1. 준비 사항

- Node.js 22 이상과 npm
- Cloudflare 계정과 Workers 사용 권한
- 회전한 새 OpenAI API key
- 회전한 새 Replicate API token
- 본인만 아는 12자 이상의 작업실 접근 코드

설치 버전을 확인합니다.

```bash
node --version
npm --version
```

의존성은 lockfile 기준으로 설치합니다.

```bash
npm ci
```

## 2. 배포 전에 provider key 회전

이 단계가 끝날 때까지 Cloudflare에 배포하지 않습니다.

1. OpenAI 프로젝트에서 기존 key를 폐기하고 새 key를 만듭니다.
2. Replicate 계정에서 기존 token을 폐기하고 새 token을 만듭니다.
3. 로컬 개발이 필요하면 무시되는 `.env.local`에 새 값만 반영합니다.
4. 이전 key가 비활성화됐는지 각 provider 화면에서 확인합니다.

관련 화면: [OpenAI API keys](https://platform.openai.com/api-keys), [Replicate API tokens](https://replicate.com/account/api-tokens)

저장소에는 secret을 절대 추가하지 않습니다. `.env.local`과 `.dev.vars`는 `.gitignore` 대상이며, `.env.example`과 `.dev.vars.example`에는 변수 이름만 있습니다.

## 3. Cloudflare 로그인

브라우저 OAuth로 로그인한 뒤 현재 계정을 확인합니다.

```bash
npx wrangler login
npx wrangler whoami
```

여러 Cloudflare 계정을 쓴다면 `whoami` 출력의 계정이 실제 배포 대상인지 먼저 확인하세요. 이 프로젝트는 `wrangler.jsonc`의 이름에 따라 `curry-shot` Worker를 사용합니다.

## 4. 로컬 Workers preview

`npm run dev`는 Next.js 개발 서버와 `.env.local`을 사용합니다. 실제 Workers 런타임에 가까운 검증은 `.dev.vars`와 `npm run preview`를 사용합니다.

기존 `.dev.vars`가 있으면 덮어쓰지 않고, 없을 때만 예제 파일을 복사합니다.

```bash
test -f .dev.vars || cp .dev.vars.example .dev.vars
```

`.dev.vars`에 회전한 새 값과 별도로 만든 접근 코드를 직접 입력합니다. 아래는 **변수 이름만을 보여주는 형식**이며 실제 값으로 문서화하지 않습니다.

```dotenv
OPENAI_API_KEY=<ROTATED_OPENAI_KEY>
REPLICATE_API_KEY=<ROTATED_REPLICATE_TOKEN>
CURRY_SHOT_ACCESS_CODE=<PRIVATE_RANDOM_CODE_AT_LEAST_12_CHARS>
```

Replicate는 `REPLICATE_API_KEY` 대신 `REPLICATE_API_TOKEN`을 사용할 수 있습니다. 둘 다 설정하면 앱은 `REPLICATE_API_KEY`를 우선하므로 한 종류만 두는 편이 명확합니다.

preview를 시작합니다.

```bash
npm run preview
```

터미널에 표시된 로컬 URL을 브라우저로 열어 다음을 확인합니다.

- 홈 화면과 이미지 업로드 영역이 정상적으로 보인다.
- 작업실 접근 코드 입력란이 표시된다.
- 올바른 접근 코드를 입력하면 생성 화면을 사용할 수 있다.
- 라이트/다크 토글과 모바일 폭 레이아웃이 깨지지 않는다.

비용 없는 HTTP 확인도 가능합니다. URL은 preview 출력에 맞게 바꾸세요.

```bash
curl -i http://localhost:8787/
curl -i http://localhost:8787/api/access
```

`/api/access`는 secret 값이 아니라 `required`와 `misconfigured` 상태만 반환합니다. 실제 이미지·영상 생성은 provider 비용이 발생하므로 의도적으로 확인할 때만 실행하세요. 종료는 preview 터미널에서 `Ctrl+C`를 누릅니다.

## 5. 배포 전 품질·보안 gate

아래 명령이 모두 성공해야 합니다.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run cloudflare:build
```

`cloudflare:build`는 다음을 한 번에 수행합니다.

1. 폐기된 `.pages-out`을 삭제합니다.
2. OpenNext Workers 산출물 `.open-next`를 생성합니다.
3. build-time env fallback에서 민감 binding을 제거합니다.
4. 로컬에 설정된 실제 credential 값이 deploy artifact에 남았는지 검사합니다.
5. 공개 assets에 민감한 변수 이름이 들어갔는지 검사합니다.

검사가 실패하면 verifier를 끄거나 우회하지 마세요. 출력된 **파일 경로만** 조사하고, credential 값이 새 위치에 노출됐을 가능성이 있으면 해당 key를 다시 회전합니다.

`npm run pages:build`는 모노레포 공통 gate와의 호환 alias일 뿐이며 결과는 Workers용 `.open-next`입니다.

## 6. 운영 runtime secret 등록

secret은 `wrangler.jsonc`의 일반 `vars`나 Git 파일에 넣지 않습니다. 아래 명령을 하나씩 실행하고 Wrangler의 대화형 입력에 값을 붙여 넣습니다. 명령줄 인자에는 secret 값을 쓰지 않습니다.

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put REPLICATE_API_KEY
npx wrangler secret put CURRY_SHOT_ACCESS_CODE
```

Replicate 변수는 필요하면 다음 명령으로 대체합니다.

```bash
npx wrangler secret put REPLICATE_API_TOKEN
```

`CURRY_SHOT_ACCESS_CODE`는 최소 12자이며 provider key와 다른 임의의 값을 사용합니다. 비밀번호 관리자에서 충분히 긴 값을 생성하는 것을 권장합니다.

등록된 **이름만** 확인합니다. 이 명령은 secret 값을 표시하지 않습니다.

```bash
npx wrangler secret list
```

다음 세 종류가 보여야 합니다.

- `OPENAI_API_KEY`
- `REPLICATE_API_KEY` 또는 `REPLICATE_API_TOKEN`
- `CURRY_SHOT_ACCESS_CODE`

`wrangler secret put`은 Worker의 새 version을 즉시 배포하는 명령입니다. 처음 등록하는 동안 일시적으로 일부 binding만 있는 version이 생길 수 있으므로, 모든 secret을 연속해서 등록한 뒤 바로 다음 단계의 최종 앱 배포를 수행하세요.

## 7. Workers 배포

다음 명령이 OpenNext build를 다시 수행하고 결과를 100% production traffic에 배포합니다.

```bash
npm run deploy
```

배포 성공 시 터미널에 `workers.dev` URL과 version 정보가 표시됩니다. OpenNext 앱은 `wrangler deploy`를 직접 호출하지 말고 저장소의 `npm run deploy`를 사용합니다.

배포 내역을 확인합니다.

```bash
npx wrangler deployments status
npx wrangler deployments list --name curry-shot
```

## 8. 배포 직후 smoke check

배포 출력의 실제 URL을 설정합니다. 아래 placeholder를 그대로 사용하지 마세요.

```bash
export APP_URL="https://curry-shot.<YOUR_WORKERS_SUBDOMAIN>.workers.dev"
```

비용이 발생하지 않는 경로부터 확인합니다.

```bash
curl -i "$APP_URL/"
curl -i "$APP_URL/api/access"
curl -I "$APP_URL/cloudflare/next-env.mjs"
curl -I "$APP_URL/worker.js"
```

기대 결과는 다음과 같습니다.

- `/`: HTTP 200
- `/api/access`: HTTP 200, `required: true`, `misconfigured: false`
- server module 경로 두 개: HTTP 404

그다음 브라우저에서 전체 흐름을 확인합니다.

1. 작업실 접근 코드로 입장합니다.
2. 권리가 있는 작은 테스트 이미지 한 장을 업로드합니다.
3. 기본 OpenAI·medium·1장으로 이미지 한 번만 생성합니다.
4. 결과 비교와 저장을 확인합니다.
5. Replicate 이미지와 영상은 비용을 수락한 경우에만 각각 확인합니다. 영상은 한 번에 하나만 생성합니다.

로그에 request body, 접근 코드, provider key를 남기지 마세요.

## 9. Custom Domain과 Cloudflare Access 권장 설정

앱 자체 접근 코드는 운영 fail-closed와 기본 비용 보호를 제공하지만 공개 서비스용 인증을 대체하지 않습니다. 개인 작업실이라면 Cloudflare Access도 함께 적용하는 것을 강하게 권장합니다.

가장 안전한 구성은 다음과 같습니다.

1. Cloudflare Dashboard에서 `curry-shot` Worker에 전용 custom domain을 연결합니다.
2. Zero Trust > Access controls > Applications에서 self-hosted application을 만듭니다.
3. 지원되는 화면에서는 hostname보다 **Worker `curry-shot` 자체**를 destination으로 선택해 모든 route와 preview를 보호합니다.
4. 본인 이메일 또는 본인이 속한 IdP group만 허용하는 `Allow` policy를 추가합니다.
5. 짧지 않은 session duration과 필요하면 MFA를 설정합니다.
6. Access 로그인 뒤에도 앱의 `CURRY_SHOT_ACCESS_CODE`를 유지합니다. 두 보호 계층은 목적이 다릅니다.

custom hostname만 Access로 보호하면 `workers.dev` 주소가 우회 경로로 남을 수 있습니다. Worker 전체를 보호하거나, 별도로 `workers.dev` 경로도 보호·비활성화하세요. 보호되지 않은 공개 hostname을 남기지 않는 것이 핵심입니다.

Curry Shot의 페이지와 API가 같은 origin에 있으므로, 전체 hostname/Worker를 Access로 보호하면 브라우저 API 요청에도 Access session cookie가 함께 적용됩니다.

참조: [Cloudflare Access application 유형](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/choose-application-type/), [self-hosted application 설정](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)

## 10. Rate Limiting 권장 설정

앱 내부 제한은 Worker isolate별 메모리에 저장되는 best-effort 보호입니다. 전 세계에서 공유되는 영구 quota가 아니므로 Cloudflare WAF Rate Limiting rule을 추가하세요. 사용 가능한 rule 수·기간·조건은 Cloudflare 요금제에 따라 다릅니다.

우선순위는 다음과 같습니다.

| 우선순위 | 대상 | 시작 권장값 | 이유 |
| --- | --- | --- | --- |
| 1 | `POST /api/video` | IP당 1회/지원되는 가장 긴 짧은 기간 | 단일 요청 비용이 가장 큼 |
| 2 | `POST /api/images` | IP당 2~4회/분 | 요청당 최대 4장 생성 가능 |
| 3 | `/api/media` | IP당 60~120회/분 | 큰 결과 파일 proxy 남용 완화 |

`/api/predictions/*`는 영상·이미지 상태 polling에 사용하므로 생성 endpoint와 같은 낮은 한도를 적용하면 정상 UI가 멈춥니다. 별도 rule을 만들더라도 충분히 높은 한도를 사용하세요.

Dashboard의 Security > WAF > Rate limiting rules에서 custom domain zone에 rule을 만듭니다. 요금제가 HTTP method 조건을 지원한다면 생성 endpoint는 `POST`만 계산합니다. 초기에 Block 또는 Managed Challenge를 적용하고, 정상 사용량과 429 로그를 본 뒤 조정하세요.

참조: [Cloudflare Rate Limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/), [Dashboard 설정 절차](https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/)

## 11. 업데이트 배포

코드 변경을 pull한 뒤 다음 순서로 반복합니다.

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run cloudflare:build
npm run deploy
```

코드만 업데이트할 때 기존 runtime secret은 유지됩니다. provider key나 접근 코드를 바꿀 때만 해당 `wrangler secret put` 명령을 다시 실행합니다.

## 12. 로그 확인과 롤백

`wrangler.jsonc`에서 observability가 활성화되어 있으므로 Cloudflare Dashboard의 Worker > Observability > Logs에서 invocation·error를 확인할 수 있습니다. 실시간 tail은 다음 명령을 사용합니다.

```bash
npx wrangler tail curry-shot --format pretty
```

오류 invocation만 보려면 다음과 같이 필터링합니다.

```bash
npx wrangler tail curry-shot --format pretty --status error
```

문제가 있는 배포를 되돌릴 때 먼저 안정 version ID를 확인합니다.

```bash
npx wrangler deployments list --name curry-shot
```

그 version으로 즉시 롤백합니다.

```bash
npx wrangler rollback <STABLE_VERSION_ID> --name curry-shot
```

rollback은 선택한 version을 곧바로 100% traffic에 적용합니다. Worker version은 code·assets·bindings를 함께 기록하므로 **노출 전 또는 key 회전 전 version으로 롤백하지 않는 것**이 안전합니다. 불가피하게 이전 version으로 롤백했다면 즉시 회전된 현재 secret 세 종류를 다시 `secret put`하고 smoke check를 반복하세요. 폐기한 provider key는 어떤 version에서도 다시 활성화하지 않습니다.

참조: [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), [Workers rollback](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)

## 13. 문제 해결

### `/api/access`가 `misconfigured: true`

운영의 `CURRY_SHOT_ACCESS_CODE`가 없거나 12자 미만입니다. 올바른 새 값을 대화형으로 다시 등록합니다.

```bash
npx wrangler secret put CURRY_SHOT_ACCESS_CODE
```

### 생성 요청이 401

브라우저의 작업실 코드가 없거나 Cloudflare secret과 다릅니다. 탭을 새로 열어 정확한 코드를 다시 입력하세요. 코드는 탭의 `sessionStorage`에만 저장됩니다.

### 생성 요청이 403

보호 API는 same-origin 요청만 허용합니다. 다른 도메인의 API client에서 직접 호출하지 말고 배포된 Curry Shot UI를 사용하세요. Cloudflare Access를 추가했다면 Access session이 유효한지도 확인합니다.

### provider key가 없다는 오류

등록된 변수 이름을 확인합니다.

```bash
npx wrangler secret list
```

값은 확인할 수 없으므로 의심되면 해당 새 key를 `secret put`으로 다시 등록합니다. OpenAI는 `OPENAI_API_KEY`, Replicate는 `REPLICATE_API_KEY` 또는 `REPLICATE_API_TOKEN`이어야 합니다.

### build가 민감 artifact를 발견해 실패

보안 gate가 정상 작동한 것입니다. verifier를 제거하거나 검사 대상을 예외 처리하지 마세요. 출력된 경로에서 값이 유입된 원인을 제거하고, 노출 가능성이 있는 key를 회전한 뒤 다시 빌드합니다.

```bash
npm run cloudflare:build
```

### 배포 후 500 또는 provider 429

실시간 로그와 provider dashboard를 함께 확인합니다.

```bash
npx wrangler tail curry-shot --format pretty --status error
```

- provider quota·billing·rate limit을 확인합니다.
- OpenAI와 Replicate 모델 접근 권한을 확인합니다.
- 같은 생성 버튼을 반복해서 누르지 않습니다. 앱 request ID 재전송 방지는 중복 비용을 줄이기 위한 보호입니다.
- 영상은 async prediction이므로 생성 응답 직후 완성되지 않는 것이 정상입니다.

### Worker bundle size 제한 오류

배포 출력의 gzip 크기가 현재 Cloudflare 요금제 제한을 넘는지 확인합니다. OpenNext 문서 기준으로 Free plan과 Paid plan의 Worker 크기 제한이 다릅니다. 필요하면 Workers plan과 bundle 의존성을 검토하되 `.open-next` 파일을 수동으로 삭제해 기능을 훼손하지 마세요.

참조: [OpenNext Cloudflare 시작하기](https://opennext.js.org/cloudflare/get-started), [OpenNext Cloudflare CLI](https://opennext.js.org/cloudflare/cli)

## 최종 체크리스트

- [ ] 기존 OpenAI key 폐기 및 새 key 발급
- [ ] 기존 Replicate token 폐기 및 새 token 발급
- [ ] `.env.local`과 `.dev.vars`가 Git에 포함되지 않음
- [ ] 로컬 Workers preview 확인
- [ ] typecheck, lint, test, Next build, Cloudflare build 통과
- [ ] Cloudflare 로그인 계정 확인
- [ ] runtime secret 세 종류 등록
- [ ] `npm run deploy` 성공
- [ ] `/api/access`가 `required: true`, `misconfigured: false`
- [ ] server module URL이 404
- [ ] 비용을 제한한 production smoke check 완료
- [ ] Cloudflare Access 적용 및 우회 hostname 제거
- [ ] 요금제에 맞는 Rate Limiting rule 적용
- [ ] 로그 확인과 롤백 절차 숙지
