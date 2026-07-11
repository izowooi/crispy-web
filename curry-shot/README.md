# Curry Shot

게임 일러스트·스크린샷·패키지 표지를 원본 구도에 충실한 실사 이미지로 변환하고, 선택한 결과 한 장을 짧은 영상으로 만드는 개인 작업실형 Next.js 앱입니다.

기본 이미지 엔진은 OpenAI `gpt-image-2`의 Images edit API입니다. Replicate 대안으로 FLUX.2 Flex, Seedream 4.5, Nano Banana 2를 제공하고, 영상은 Seedance 2.0 또는 저비용 Grok Imagine Video 1.5를 사용합니다.

## 주요 흐름

1. JPG/PNG/WebP 한 장을 업로드하거나 샘플을 선택합니다.
2. `장면 그대로`, `표지 아트만`, `대사 화면` 중 소스 해석을 고릅니다.
3. 기본값인 OpenAI Image 2, 원본 충실, 1장으로 실사화합니다.
4. 결과를 원본과 슬라이더로 비교하고 저장합니다.
5. 원할 때만 결과 한 장을 선택해 비용 확인 후 5초·720p 영상 한 개를 만듭니다.

기본 화면에는 핵심 설정만 표시합니다. 모델·품질·출력 비율·추가 지시는 접힌 `고급 설정` 안에 있습니다. Replicate 이미지 모델은 각 모델의 고정 해상도와 원본 비율을 사용하므로 적용되지 않는 OpenAI 옵션을 보여주지 않습니다.

## 표지와 대사 처리

- 패키지·CD 모드는 jewel case, 테이블, 반사, 배지와 제작사 문구를 제거하고 안쪽 일러스트를 full-bleed로 재구성하도록 지시합니다. 가려진 원화는 복원이 아니라 AI 재구성이므로 완전한 원본 복원을 보장하지 않습니다.
- 게임 타이틀은 사용자가 확인한 문자열을 생성 결과 위에 별도 레이어로 합성해 AI 글자 왜곡을 줄입니다.
- 대사 화면은 장면과 인물 초상화를 실사화하되 대사 패널을 비웁니다. 사용자가 확인한 화자·대사를 브라우저에서 결정적으로 합성하므로 불필요한 워터마크가 다시 붙지 않습니다.
- 영상 입력에는 정적 타이틀·대사 레이어를 넣지 않습니다. 영상 모델에서 글자가 흔들리는 현상을 줄이기 위한 선택입니다.
- OpenAI에서 원본과 다른 출력 비율을 고르면 원본을 자르거나 늘리지 않고 새 캔버스 영역만 자연스럽게 확장하도록 지시합니다.

## 로컬 실행

요구 사항: Node.js 22+, npm

```bash
npm install
cp .env.example .env.local
npm run dev
```

기존 `.env.local`이 있으면 덮어쓰지 마세요. 환경 변수는 모두 server route에서만 읽습니다.

```dotenv
OPENAI_API_KEY=...
REPLICATE_API_KEY=...
# 또는 REPLICATE_API_TOKEN=...

# 운영 환경에서는 필수. 임의의 12자 이상 비공개 값
CURRY_SHOT_ACCESS_CODE=...
```

개발 환경은 접근 코드 없이 실행할 수 있습니다. 코드가 설정된 환경에서는 브라우저가 작업실 코드를 요구하고 해당 탭의 `sessionStorage`에만 보관합니다. API provider 키는 브라우저 번들 또는 저장소에 포함하지 않습니다.

## 비용 보호

운영 환경은 `CURRY_SHOT_ACCESS_CODE`가 없으면 모든 생성·polling·결과 proxy 요청을 503으로 차단합니다. 보호된 요청에는 같은 출처 확인을 적용하고, 생성 요청에는 재전송 방지 ID를 요구합니다. Worker 메모리에서 클라이언트별 이미지 8장/10분과 영상 1건/시간 제한도 적용하지만, 이 제한은 isolate별 best-effort입니다.

공개 hostname으로 운영한다면 Cloudflare Access와 계정 단위 Rate Limiting rule도 함께 적용하세요. 앱의 접근 코드는 공개 서비스용 회원 인증이나 영구 quota 저장소를 대체하지 않습니다.

## 검증

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run cloudflare:build
```

`npm run pages:build`는 모노레포 공통 검증 명령과의 호환 alias이며 실제 결과는 Cloudflare Workers용 `.open-next`입니다. 실제 이미지·영상 생성은 비용이 발생하므로 자동 테스트는 provider `fetch`를 mock하고 live generation을 실행하지 않습니다.

## Cloudflare Workers

처음 배포하거나 운영 secret·Access·Rate Limiting·롤백을 설정할 때는 [Cloudflare Workers 배포 가이드](docs/cloudflare-workers.md)를 순서대로 따르세요.

Next.js 16과 `@opennextjs/cloudflare`를 사용합니다. OpenNext가 `.open-next/worker.js`와 공개 assets를 만들고, `wrangler.jsonc`의 `nodejs_compat` Worker에서 실행합니다. OpenNext Cloudflare가 Next.js Edge Runtime route bundle을 지원하지 않으므로 API route는 명시적으로 `runtime = "nodejs"`를 사용합니다.

빌드는 먼저 과거 `.pages-out` 정적 assembly를 삭제합니다. 이어 OpenNext가 로컬 env를 fallback 모듈에 넣더라도 모든 민감 binding을 제거하고, 실제 로컬 credential 값이 deploy artifact에 남지 않았는지 검사합니다. secret은 build-time env가 아니라 Cloudflare runtime binding으로 설정합니다.

로컬 Workers preview는 ignored `.dev.vars`를 사용합니다. 기존 파일이 있으면 덮어쓰지 마세요.

```bash
cp .dev.vars.example .dev.vars
npm run preview
```

운영 Worker에는 대화형 Wrangler 명령으로 runtime secret을 등록한 뒤 배포합니다.

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put REPLICATE_API_KEY
npx wrangler secret put CURRY_SHOT_ACCESS_CODE

npm run deploy
```

`REPLICATE_API_TOKEN`을 대신 등록해도 됩니다. `deploy`는 운영 변경이므로 명시적인 승인 없이 실행하지 않습니다.

## API 구조

```mermaid
flowchart LR
  B[Browser] -->|access code + multipart| I[/api/images]
  I -->|default, synchronous| O[OpenAI Images edits]
  I -->|alternative, async| R[Replicate predictions]
  B -->|protected poll| P[/api/predictions/:id]
  P --> R
  B -->|one still + cost confirmation| V[/api/video]
  V --> R
  B -->|protected result fetch| M[/api/media]
  M --> R
```

- `GET /api/access`: 접근 코드 필요 여부와 운영 설정 오류 여부만 반환합니다.
- `POST /api/images`: 파일·옵션을 검증하고 OpenAI 결과 또는 Replicate prediction IDs를 반환합니다.
- `GET /api/predictions/[id]`: Replicate 상태와 결과 URL을 안전한 공통 형태로 정규화합니다.
- `POST /api/predictions/[id]/cancel`: 실행 중 작업 취소를 요청합니다. 취소가 환불을 보장하지는 않습니다.
- `POST /api/video`: `confirmed=true`와 정확히 하나의 이미지 입력이 있을 때만 5초 영상 prediction 하나를 만듭니다.
- `GET /api/media`: 허용된 `*.replicate.delivery` 이미지·영상만 보호된 same-origin 응답으로 전달합니다.

## 비용 기본값

2026-07-11 문서 기준이며 공급자 가격은 바뀔 수 있습니다.

- OpenAI: `medium`, 원본 비율, 1장. UI에서 최대 4장과 `high`를 선택할 수 있습니다.
- Replicate FLUX.2 Flex: 1 MP, 30 steps, guidance 4.5, prompt upsampling 끔.
- Seedance 2.0 영상: 5초, 720p, adaptive 비율, audio 선택. audio 사용 시 예상 약 `$0.90`.
- Grok Imagine Video 1.5: 5초, 720p, audio 자동. 예상 약 `$0.40`.

참조: [OpenAI GPT Image 2](https://developers.openai.com/api/docs/models/gpt-image-2), [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation), [Replicate prediction API](https://replicate.com/docs/topics/predictions/create-a-prediction). 세부 provider schema는 `docs/images/`, `docs/video/`에 보관합니다.

## 데이터 보존

Curry Shot 자체 DB나 사용자 계정은 없습니다. OpenAI 결과는 브라우저에 base64로 전달되고 앱 서버에 저장하지 않습니다. Replicate prediction ID와 영상 진행 상태는 새로고침 후 추적을 이어가기 위해 브라우저에 저장될 수 있습니다. Replicate 결과 URL은 provider 정책에 따라 만료될 수 있으므로 완성 직후 저장하세요. 본인이 변환·공유할 권리가 있는 이미지만 사용해야 합니다.
