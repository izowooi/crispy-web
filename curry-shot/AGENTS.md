# AGENTS.md — Curry Shot (Layer 3)

이 문서는 `crispy-web` 모노레포의 직속 단일 프로젝트인 `curry-shot`에 적용되는 Layer 3 작업 지침이다.
상위 `../AGENTS.md`의 공통 운영 규칙을 상속하며, 이 문서에서는 Curry Shot의 생성 품질, 비용, 보안, Cloudflare Workers 제약만 구체화한다.

## 프로젝트 목적

Curry Shot은 게임 일러스트·스크린샷·패키지 표지를 원본 구도에 충실한 photorealistic live-action 이미지로 변환하고, 사용자가 선택한 결과 한 장을 선택적으로 5초 sound video로 만드는 한국어 웹앱이다.

- 기본 image provider는 OpenAI `gpt-image-2` Images edit다.
- Replicate image alternatives는 FLUX.2 Flex, Seedream 4.5, Nano Banana 2다.
- Replicate video alternatives는 Seedance 2.0과 Grok Imagine Video 1.5다.
- 계정, 자체 database, 영구 결과 저장소는 두지 않는다.
- 기본 흐름은 이미지 한 장 생성이며, image는 최대 4장, video는 한 번에 정확히 한 작업만 허용한다.

## 기술 스택과 구조

- Next.js 16 App Router, React 19, TypeScript strict mode
- Tailwind CSS 4, ESLint 9, Vitest 4
- npm과 project-local `package-lock.json`
- `@opennextjs/cloudflare`, Wrangler, Cloudflare Workers

주요 폴더의 책임은 다음과 같다.

- `src/app/`: page, layout, global style, server API routes
- `src/components/`: upload studio, result gallery, deterministic overlay, video sheet, theme UI
- `src/lib/server/`: upload validation, prompt policy, provider payload, credential·HTTP·access guard
- `src/__tests__/`: provider 호출 없이 실행하는 unit/contract tests
- `scripts/`: Workers build 준비, secret scrub, deploy artifact verification
- `docs/images/`, `docs/video/`: 조사한 provider schema reference
- `docs/qa.md`: 실행한 검증과 남은 gap의 증거 기록
- `docs/cloudflare-workers.md`: Cloudflare Workers 설정·secret·배포·rollback 가이드
- `example/`: 표지, 대사 화면, cinematic scene 검증용 원본 자산

`curry-shot` 아래에 별도 앱이나 shared package를 만들지 않는다. 독립 프로젝트가 필요하면 상위 모노레포의 직속 앱으로 검토한다.

## 작업 흐름

1. `README.md`, 이 문서, 변경 영역과 관련된 provider reference를 읽는다.
2. model/API schema가 관련되면 local reference와 provider의 최신 공식 문서를 함께 확인한다.
3. 먼저 현재 contract를 test로 재현하고, server/client 책임 경계를 유지한 최소 변경을 한다.
4. 비용 없는 자동 검증을 작은 범위부터 전체 gate 순서로 실행한다.
5. UI 변경은 local app에서 desktop/mobile과 light/dark를 실제 browser로 확인한다.
6. 지원 모델, 가격 전제, payload 또는 배포 절차가 바뀌면 관련 문서를 함께 갱신한다.

기존 `.env.local`과 `.dev.vars`는 덮어쓰거나 내용을 출력하지 않는다. 설치와 개발 실행은 다음 명령을 사용한다.

```bash
npm install
npm run dev
```

## 검증 명령과 완료 기준

코드 변경의 기본 gate는 다음 순서다.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run cloudflare:build
```

- `npm run cloudflare:build`는 OpenNext Worker 생성, build-time secret scrub, deploy artifact 검사를 포함한다.
- `npm run pages:build`는 상위 모노레포 명령과의 compatibility alias일 뿐이며 결과물은 Pages가 아니라 Workers용 `.open-next`다.
- dependency 변경 시 `npm audit --audit-level=moderate`도 실행한다.
- API route 변경은 비용 없는 validation, access-code, same-origin HTTP contract를 local Workers preview에서 확인한다.
- UI 변경은 desktop/mobile, light/dark, upload·paste, 접힌 advanced controls, loading/error/partial success, overlay, video cost confirmation을 확인한다.
- browser 검증을 실행할 수 없으면 이를 성공으로 간주하지 말고 `docs/qa.md`에 원인과 미검증 범위를 기록한다.
- live provider smoke를 실행했다면 provider, model, 호출 수, 결과와 비용 관련 제한을 기록하되 prediction ID, URL, credential은 남기지 않는다.

## Server와 Client 경계

- prompt policy, model slug, provider payload builder, credential access는 `src/lib/server/`에 둔다.
- `src/lib/server/` module을 Client Component에서 import하지 않는다.
- Client는 사용자 입력과 normalized app response만 다루며 provider token, 내부 prompt, raw provider error body를 받지 않는다.
- Route handler는 `authorize → parse/validate → provider request → safe normalized response`의 얇은 orchestration layer로 유지한다.
- upload type·size, enum, text length, source dimensions, prediction ID, remote output URL은 server에서 다시 검증한다.
- Replicate 결과 fetch는 허용된 HTTPS host와 보호된 same-origin media proxy를 통한다.
- 새로운 provider error는 사용자에게 안전한 code/message로 정규화하고 upstream response body를 그대로 노출하지 않는다.

## Secret과 비용 보호

- `OPENAI_API_KEY`, Replicate token, `CURRY_SHOT_ACCESS_CODE`는 server-only runtime secret이다.
- 실제 credential은 env example, source, test fixture, log, 문서, browser bundle, build artifact에 넣지 않는다.
- 운영 환경은 유효한 `CURRY_SHOT_ACCESS_CODE`가 없으면 생성·polling·media proxy를 fail closed해야 한다.
- same-origin 검증, request ID replay 방지, image budget, 단일 video reservation을 우회하거나 약화하지 않는다.
- Worker memory의 budget은 isolate별 best-effort다. 공개 배포에는 Cloudflare Access와 account-level Rate Limiting을 함께 사용한다.
- unit test에서는 mocked `fetch`와 synthetic `File`을 사용한다. live image/video generation과 외부 upload는 비용과 외부 상태 변경이므로 명시적 사용자 의도와 호출 한도가 있을 때만 수행한다.
- image는 요청당 `1 | 2 | 4`장만 허용하고, video는 비용 확인 후 5초·720p prediction 한 개만 queue한다.
- 배포 전 key rotation 요구가 `docs/qa.md`에 남아 있으면 기존 key를 사용해 배포하지 않는다.
- build security script를 제거하거나 verifier를 건너뛰는 deploy script를 만들지 않는다.

## Image prompt와 overlay 불변조건

입력 이미지는 loose inspiration이 아니라 composition blueprint다. 실사화는 rendering medium만 바꾸며 다음 요소를 최우선으로 잠근다.

- camera angle, framing, crop, perspective, spatial hierarchy
- character identity, count, pose, gaze, wardrobe
- object count, props, relative position, narrative beat

모드별 계약을 유지한다.

- `scene`: letterbox, watermark, 불필요한 UI를 제거하고 비워진 주변부만 자연스럽게 확장한다.
- `cover`: disc·case·box·종이·테이블·손·glare·badge·publisher text를 제거하고 insert art를 full-bleed scene으로 재구성한다.
- `dialogue`: portrait zone과 scene zone을 함께 실사화하되 dialogue panel은 깨끗하고 비어 있게 둔다.

Title과 dialogue는 image model의 text rendering에 맡기지 않는다. 사용자가 확인한 title, speaker, dialogue를 browser에서 deterministic overlay로 합성하며 preview와 download canvas의 위치·크기·줄바꿈을 일치시킨다. Static overlay는 text wobble을 피하기 위해 video source에서 제외한다.

사용자 custom prompt는 composition lock과 mode cleanup보다 낮은 우선순위다. 이 순서를 바꾸거나 example별 특수 처리를 일반 규칙으로 추가할 때는 `example/` 세 유형과 prompt tests를 함께 검증한다.

## Replicate async와 video 안전성

- Replicate multi-image는 prediction별 상태를 독립 관리하고 `Promise.allSettled` 기반 partial failure와 card별 retry를 보존한다.
- 하나의 image failure가 성공한 다른 결과를 폐기하면 안 된다.
- polling은 일시적인 network error 뒤에도 제한적으로 재시도하며 `succeeded`, `failed`, `canceled`, `aborted`를 모두 terminal state로 처리한다.
- 429 `Retry-After`는 해석하되 대기 시간과 재시도 횟수를 제한한다.
- video job은 starting/processing 동안 입력과 provider 변경을 잠그고, 새로고침 후에도 중복 생성되지 않도록 추적 상태를 복원한다.
- cancel response를 확인하고 공통 status로 반영한다. Cancel은 환불을 보장하지 않는다는 안내를 유지한다.
- Seedance audio option과 Grok의 automatic audio schema 차이를 payload와 UI label 양쪽에 반영한다.
- provider output URL은 만료될 수 있으므로 성공 후 즉시 save할 수 있는 흐름을 유지한다.

## UI와 접근성

- 첫 화면에는 upload, source mode, provider, fidelity, count와 생성 action만 명확히 노출한다.
- model, quality, output ratio, custom prompt는 기본적으로 닫힌 `고급 설정` 안에 둔다.
- 기본 theme는 light다. dark 선택은 `localStorage`에 저장하고 first paint 전 class 적용으로 FOUC를 방지한다.
- mobile sticky action, desktop 2-column workspace, responsive video bottom sheet를 유지한다.
- touch target, keyboard focus, semantic button/dialog, loading announcement, readable contrast를 확인한다.
- 생성 중 또는 active video가 있을 때 비용이 중복될 수 있는 입력과 action은 비활성화한다.
- 실패는 복구 가능한 문구와 retry action으로 보여주고 provider 내부 정보는 노출하지 않는다.

## Cloudflare Workers runtime과 배포

이 앱의 배포 target은 Cloudflare Pages가 아니라 공식 OpenNext Cloudflare Workers output이다.

- Worker entrypoint는 `.open-next/worker.js`, asset directory는 `.open-next/assets`다.
- `wrangler.jsonc`의 `nodejs_compat`와 현재 compatibility flags를 임의로 제거하지 않는다.
- OpenNext Cloudflare는 Next.js Edge Runtime route bundle을 지원하지 않으므로 모든 API route는 `export const runtime = "nodejs"`를 유지한다.
- 상위 저장소의 일반 Edge 권고나 sibling app 관례를 복사해 `runtime = "edge"`로 바꾸지 않는다.
- `.pages-out`은 폐기된 legacy artifact다. build 전 삭제와 build 후 부재 검사를 유지한다.
- runtime secret은 Wrangler/Cloudflare binding으로 등록하며 build-time env에 의존하지 않는다.
- local Workers 검증은 ignored `.dev.vars`와 `npm run preview`를 사용한다.
- 실제 설정, secret 등록, 배포, post-deploy smoke, rollback은 `docs/cloudflare-workers.md`를 따른다.
- `npm run deploy`는 운영 상태를 바꾸므로 사용자의 명시적 요청 범위에서만 실행한다.

## 설정 변경 기준

다음 파일은 앱 전체 runtime 또는 deploy artifact에 영향을 준다. 수정할 때 Next build와 Workers build를 모두 확인한다.

- `package.json`, `package-lock.json`
- `next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`
- `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.ts`
- `scripts/prepare-cloudflare-build.mjs`, `scripts/scrub-build-secrets.mjs`, `scripts/verify-build-secrets.mjs`

두 곳 이상의 실제 소비자가 생기기 전에는 shared abstraction을 만들지 않는다. 특히 provider마다 다른 schema를 무리하게 하나의 범용 payload로 합치지 않는다.

## 문서와 QA 동기화

- 지원 model, default, price estimate, output limit, payload가 바뀌면 `README.md`와 해당 `docs/images/` 또는 `docs/video/` reference를 갱신한다.
- 가격과 외부 API 사실에는 확인 날짜와 공식 source를 남긴다.
- Workers command, binding, compatibility flag, secret 또는 rollback 절차가 바뀌면 `docs/cloudflare-workers.md`와 README 요약을 함께 갱신한다.
- 중요한 workaround와 security incident 후속 조치는 code comment만 남기지 말고 운영 문서에도 기록한다.
- `docs/qa.md`에는 실제 실행한 명령과 결과만 기록한다. 비용 때문에 생략한 live test와 도구 문제로 생략한 visual QA를 명확히 구분한다.
- `example/` 자산은 prompt와 UI 회귀 검증 기준이므로 임의 삭제·교체·재압축하지 않는다.
