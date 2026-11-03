# Another Take — Anime to Real

애니메이션·게임 이미지 1~4장을 실사화하고 원본/모델 결과를 슬라이더 또는 나란히 비교하는 웹앱입니다. 기본은 Flare, Sunburst, Nano Banana 2.1 모두 사용하며 모델 선택을 펼쳐 1~2개만 사용할 수 있습니다.

## 실행과 검증

Node.js 24와 npm을 사용합니다. ZIP 호환성 테스트는 Python 3 표준 라이브러리도 사용합니다.

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

`npm run dev`는 UI만 실행합니다. API까지 로컬에서 실행하려면 빌드 후 `npx wrangler pages dev out`을 사용하고 로컬 D1에 `schema.sql`을 적용합니다. 로컬 비밀값은 Wrangler의 `.dev.vars`에 직접 설정하거나 Cloudflare 환경변수로 주입합니다. 실제 비밀값 파일은 추적하지 않습니다.

## 배포

Next.js 정적 export + Tailwind v4 프런트엔드와 Cloudflare Pages Functions API입니다. 사용자 이미지의 영속 저장소는 없으며 D1에는 요청 식별자·브라우저 식별자·날짜·모델별 사용 비용만 기록합니다.

```sh
npx wrangler d1 execute anime-to-real-usage --remote --file=schema.sql
npx wrangler pages secret put OPENAI_API_KEY --project-name anime-to-real
npx wrangler pages secret put GEMINI_API_KEY --project-name anime-to-real
npx wrangler pages secret put SESSION_SECRET --project-name anime-to-real
npm run deploy
```

`SESSION_SECRET`은 임의의 강한 비밀값으로 설정합니다. 재설정하면 기존 브라우저 쿠키 및 진행 중 배치 조회 토큰이 무효화됩니다. 기존 D1 바인딩은 `wrangler.jsonc`에 있습니다. 도메인은 Cloudflare Pages의 Custom domains에 추가한 뒤 해당 호스트의 CNAME을 Pages 프로젝트 호스트로 연결합니다.

## 이미지와 즉시 생성

- 업로드는 JPG/PNG/WebP, 파일당 30MB, 최대 4장입니다.
- 브라우저에서 방향을 적용해 디코딩하고 긴 변을 2048px 이하로 축소한 PNG만 전송합니다. 서버에서도 PNG 헤더와 요청 크기를 검사합니다.
- 2K 이하 이미지는 원본의 정확한 가로·세로 픽셀을 유지합니다. API의 지원 크기가 다르면 결과를 브라우저 canvas로 목표 크기에 맞춥니다. 모델이 구도나 인물까지 완벽하게 보존하는 것을 보장하지는 않습니다.
- 모든 입력은 일반 실시간 API로 처리합니다. 브라우저에서 이미지·모델별 요청을 최대 3개씩 동시에 보내며 도착하는 결과부터 표시합니다. 4장 × 3모델은 결과 12장입니다. Batch API를 새로 제출하지 않으며 배치 할인도 적용되지 않습니다.
- 생성 중에는 탭을 열어둡니다. 이미지와 결과는 현재 탭의 메모리에만 존재합니다. 새로고침하면 사라집니다. 진행 수, 경과 시간, 회전하는 문구로 처리 상태를 표시합니다.
- API 키는 Pages Secret에만 존재합니다. 클라이언트는 모델 별칭만 선택하며 API endpoint, prompt, quality 등을 바꿀 수 없습니다.

## 이용 한도와 비용

서명된 HttpOnly 쿠키로 브라우저를 식별합니다. UTC 기준 하루 500번의 생성 요청이 허용됩니다. 이미지 한 장·모델 한 개를 요청할 때 1회로 계산하며, 4장 × 3모델은 12회입니다. 쿠키를 삭제하거나 다른 브라우저를 쓰면 새 브라우저로 인식하므로 본인 인증을 대신하는 장치는 아닙니다.

모델별 UTC 월 $50 예산을 D1 단일 SQL의 원자적 조건부 INSERT로 검사합니다. API 호출 전에 이미지당 $1을 예약해 동시 요청의 초과 지출을 방지하고, 성공 시 제공사가 반환한 토큰 사용량과 공식 요율로 정산합니다. 예약금까지 포함해 예산이 부족하면 요청을 거절하므로 $50에 근접하면 조기에 차단될 수 있습니다. 실패·타임아웃 요청은 실제 청구 여부가 불확실하므로 예약금을 유지합니다. 이 장부는 이 앱을 통한 요청만 포함하며 같은 API 키를 다른 앱에서 쓴 비용까지 추적하지는 않습니다.

Flare/Sunburst는 이미지 입력 $8/M, 텍스트 입력 $5/M, 이미지 출력 $30/M tokens, Batch는 절반을 적용합니다. Nano Banana 2.1은 입력 $1.50/M, 이미지 출력 $30/M, thinking 출력 $7.50/M tokens, Batch는 절반입니다. 가격 변경 시 서버의 정산식을 갱신해야 합니다.

## 프라이버시

앱은 업로드/생성 이미지를 DB·R2·갤러리에 저장하지 않고 현재 탭의 메모리에서만 표시합니다. 요청한 생성 처리를 위해 선택한 OpenAI/Google에 이미지를 전송하며 각 제공사의 데이터 보관 정책이 적용됩니다. 현재 새 요청에 Batch API를 사용하지 않습니다. 이전 버전에서 제출한 배치의 조회·수신 확인 API는 진행 중인 작업을 위해 남겨두었고 제공사의 보관 정책이 적용됩니다. 따라서 제공사까지 포함해 '이미지가 어디에도 저장되지 않는다'고 안내하지 않습니다.

## 비교와 다운로드

파일명을 화면에 노출하지 않고 원본·모델 이름으로 표시합니다. 원본과 결과 카드에서 왼쪽·오른쪽을 지정하면 테라코타·청록색 테두리와 선택 상태가 함께 바뀝니다. 여러 원본은 이미지 번호로 묶습니다. 전체 다운로드는 생성 결과만 PNG 파일로 묶은 ZIP을 브라우저에서 만들며, 파일명 중복 없이 번호·모델·픽셀 크기를 포함합니다. PNG 자체가 압축되어 있어 ZIP STORE 방식을 사용하며 이미지가 서버로 재전송되지 않습니다.

## 공식 API 근거

- [OpenAI 이미지 생성](https://developers.openai.com/api/docs/guides/image-generation)
- [OpenAI 이미지 편집 JSON schema](https://developers.openai.com/api/reference/resources/images/methods/edit)
- [OpenAI Batch API](https://developers.openai.com/api/docs/guides/batch)
- [Nano Banana 2.1](https://aistudio.google.com/docs/models/gemini-nano-banana-2.1)
- [Gemini Batch API](https://aistudio.google.com/docs/batch-api)
- [Gemini 요금](https://aistudio.google.com/docs/pricing)
