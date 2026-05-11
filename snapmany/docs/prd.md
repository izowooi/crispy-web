이 앱은 Next.js 웹앱으로 만든다.
단, Replicate API Token은 브라우저에 노출하면 안 되므로 Cloudflare Worker 또는 Next.js Route Handler를 “얇은 보안 프록시”로만 사용한다.

## 아키텍처

- Next.js App Router
- TypeScript
- Tailwind CSS
- Replicate API
- Cloudflare 배포
- Firebase Remote Config
- 데이터베이스가 필요하다면 supabase db
- 사용자 계정은 현재 없으나 추후 개발
- 사용자의 사진은 저장하지 않습니다. ( 개인정보를 중요하게 여깁니다. 오로지 api 통신에만 쓰입니다. )
- MVP에서는 결제 없음
- 생성 결과는 브라우저 상태에서만 관리
- 필요 시 localStorage/sessionStorage 정도만 사용

## 서버/프록시 원칙

서버 API를 앱의 핵심 구조로 만들지 않는다.
다만 Replicate API 키 보호를 위해 최소한의 endpoint 는 만듭니다.

POST /api/generate

역할:
- 클라이언트에서 받은 이미지와 선택한 styleIds를 검증한다.
- Replicate API Token을 서버 환경변수에서 읽는다.
- 선택된 스타일별로 Replicate prediction을 생성한다.
- 결과 URL 또는 prediction 정보를 클라이언트에 반환한다.

금지:
- DB 저장은 생략합니다.
- jobs 테이블 금지
- 사용자 계정은 현재 생략합니다.
- 복잡한 webhook 구조보다는 되도록 단순하게 관리합니다.

## 상태 관리

생성 상태는 클라이언트에서 관리한다.

예:
type GenerationItem = {
  id: string;
  styleId: string;
  status: "idle" | "uploading" | "generating" | "completed" | "failed";
  imageUrl?: string;
  error?: string;
};

React state 또는 Zustand를 사용해도 된다.

## 이미지 처리

이미지를 영구 저장하지 않는다.

가능한 방식:
1. 브라우저에서 이미지를 base64 또는 File로 받는다.
2. /api/generate로 전달한다.
3. 프록시가 Replicate에 전달한다.
4. 결과 URL을 프론트에 반환한다.
5. 사용자는 결과 이미지를 즉시 다운로드한다.

주의:
- 파일 크기 제한: 기본 10MB
- jpg/png/webp만 허용
- 클라이언트에서 미리보기 제공
- EXIF 제거는 가능하면 브라우저에서 canvas 재인코딩으로 처리
- 생성 결과는 새로고침하면 사라져도 괜찮다.

## 환경변수
필요한 토큰이나 엑세스 정보는 모두 알아서 발급하세요.
만일 mcp 로도 발급이 불가능하다면 거기서 작업은 일시 정지 하고, 제게 어디서 발급 받을 수 있는 지 알려주세요.
제가 발급하면 그 때 이어서 진행합니다.

필수:
REPLICATE_API_TOKEN=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

Cloudflare 사용 시:
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

선택:
NEXT_PUBLIC_APP_ENV=
SENTRY_DSN=

## Firebase Remote Config 사용

Remote Config는 서버 상태 저장용이 아니다.
다음 설정값을 원격으로 바꾸는 용도로만 사용한다.

- enabled_styles
- default_style_count
- max_upload_size_mb
- maintenance_mode
- replicate_model_by_style
- show_beta_styles
- ui_copy
- style_order

Remote Config fetch 실패 시 기본 local config로 동작해야 한다.

## 스타일 프리셋

스타일 프리셋은 config로 분리한다.

type StylePreset = {
  id: string;
  label: string;
  description: string;
  prompt: string;
  negativePrompt?: string;
  model?: string;
};

초기 스타일:
- 캐리커처
- 3D 캐릭터
- 애니메이션풍
- 증명사진
- 여권사진 스타일
- 운전면허증 사진 스타일
- 비즈니스 프로필
- SNS 프로필
- 귀여운 스티커
- 흑백 스튜디오

## 중요한 보안 조건

절대 하지 말 것:
- Replicate API Token을 NEXT_PUBLIC_ 환경변수에 넣지 말 것
- 클라이언트 코드에서 Replicate API를 직접 호출하지 말 것
- 브라우저에 비밀 키를 숨길 수 있다고 가정하지 말 것

반드시 할 것:
- Replicate 호출은 서버/Worker에서만 한다.
- 클라이언트는 /api/generate만 호출한다.
- 입력 파일 타입과 크기를 서버에서도 검증한다.
- rate limit 구조를 고려한다.

## TDD 요구사항

테스트를 먼저 작성하고 구현한다.

필수 테스트:
- 스타일 config validation
- 파일 타입 validation
- 파일 크기 validation
- /api/generate 입력 검증
- Replicate client mock 테스트
- 스타일 10개 생성 요청 테스트
- 실패한 스타일만 UI에서 failed 표시
- 메인 페이지 렌더링
- 이미지 업로드 미리보기
- 생성 버튼 disabled 조건
- Playwright mock flow

명령어:
npm run test
npm run lint
npm run typecheck
npm run build

## 최종 결과물

다음을 구현해라.

1. Next.js 프로젝트 구조
2. Tailwind 기반 UI
3. 사진 업로드 컴포넌트
4. 스타일 선택 컴포넌트
5. 결과 갤러리
6. 얇은 /api/generate 프록시
7. Replicate client wrapper
8. Firebase Remote Config wrapper
9. 테스트 코드
10. README
11. Cloudflare 배포 설명

중요:
이 프로젝트는 DB 없는 MVP다.
만일 DB 가 필요하면 supabase mcp 를 사용합니다. 그리고 접두어는 snap_ 이라고 붙여주세요.
마찬가지로 firebase console 이 필요하다면 crispy-web 프로젝트에 만들어주시고, snap 이라는 루트에 만들어주세요.
해당 프로젝트는 다른 프로젝트도 사용가능한 모노레포 프로젝트입니다.
가급적 단순하게 만듭니다.
필요하다면 ductcanvas 프로젝트를 참고해주세요. 이 프로젝트 또한 동일하게 ducttape replicate 를 이요한 프로젝트입니다.
동일한 키를 사용해도 됩니다.