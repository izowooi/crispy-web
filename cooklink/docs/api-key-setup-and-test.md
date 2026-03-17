# API Key 발급 및 테스트 가이드

이 문서는 `Cooklink` 웹앱을 만들기 전에 필요한 외부 API 두 가지를 먼저 검증하기 위한 가이드입니다.

- `YouTube Data API v3`: 영상 메타데이터 확인
- `Gemini API`: 텍스트 기반 레시피 구조화 가능 여부 확인

## 1. 사전 준비

- Google 계정
- 결제 설정이 가능한 Google Cloud 프로젝트
- 로컬 환경의 `Node.js 18+`

현재 저장소에는 테스트 스크립트가 추가되어 있습니다.

- `scripts/test-apis.mjs`
- `.env.example`

## 2. YouTube API Key 발급

공식 문서 기준으로 YouTube Data API를 쓰려면 Google Cloud 프로젝트를 만들고, 해당 프로젝트에서 `YouTube Data API v3`를 활성화한 뒤, `Credentials`에서 API Key를 생성하면 됩니다.

진행 순서:

1. [Google Cloud Console](https://console.cloud.google.com/)에 로그인합니다.
2. 새 프로젝트를 만들거나 기존 프로젝트를 선택합니다.
3. [Enabled APIs](https://console.cloud.google.com/apis/library)에서 `YouTube Data API v3`를 검색해 활성화합니다.
4. [Credentials](https://console.cloud.google.com/apis/credentials)로 이동합니다.
5. `Create credentials` → `API key`를 눌러 키를 생성합니다.
6. 처음 테스트 단계에서는 제한 없이 확인할 수 있지만, 실제 배포 전에는 반드시 제한을 거는 것을 권장합니다.

권장 제한:

- `API restrictions`: `YouTube Data API v3`만 허용
- `Application restrictions`
  - 서버 전용이면 `IP addresses`
  - 브라우저 호출이면 `HTTP referrers`

주의:

- YouTube Data API는 쿼터를 사용합니다.
- 기본적으로 프로젝트별 일일 쿼터가 제공되며, 잘못된 요청도 쿼터를 소모할 수 있습니다.
- 지금 단계에서는 `videos.list` 같은 저비용 조회만 테스트하면 충분합니다.

## 3. Gemini API Key 발급

공식 문서 기준으로 Gemini API 키는 [Google AI Studio](https://aistudio.google.com/)의 `API Keys` 페이지에서 만들 수 있습니다. 처음 사용하는 계정은 기본 프로젝트가 자동 생성될 수 있고, 기존 Cloud 프로젝트는 AI Studio에 가져와서 사용할 수도 있습니다.

진행 순서:

1. [Google AI Studio](https://aistudio.google.com/)에 로그인합니다.
2. 왼쪽 메뉴에서 `Dashboard` → `Projects`를 엽니다.
3. 프로젝트가 없다면 새로 만들거나, 기존 Google Cloud 프로젝트를 import 합니다.
4. `API Keys` 페이지로 이동합니다.
5. 해당 프로젝트에서 `Create API key`를 눌러 키를 생성합니다.
6. 테스트가 끝나고 운영 단계로 넘어가기 전에는 Google Cloud Console에서 키 제한 정책을 다시 확인합니다.

주의:

- Gemini 키는 환경 변수로 관리하는 것이 안전합니다.
- 공식 문서상 `GEMINI_API_KEY` 또는 `GOOGLE_API_KEY`를 사용할 수 있지만, 이 저장소에서는 `GEMINI_API_KEY` 사용을 권장합니다.

## 4. 로컬 설정

`.env.example`를 참고해 루트에 `.env` 파일을 만듭니다.

```bash
cp .env.example .env
```

그리고 값을 채웁니다.

```env
YOUTUBE_API_KEY=발급받은_유튜브_API_KEY
GEMINI_API_KEY=발급받은_제미니_API_KEY
YOUTUBE_TEST_VIDEO_ID=dQw4w9WgXcQ
```

`YOUTUBE_TEST_VIDEO_ID`는 공개 영상 ID 아무거나 사용해도 됩니다.

## 5. 테스트 실행 방법

전체 테스트:

```bash
npm run test:apis
```

YouTube만 테스트:

```bash
npm run test:youtube
```

Gemini만 테스트:

```bash
npm run test:gemini
```

## 6. 성공 기준

### YouTube 성공 예시

- HTTP 200 응답
- Video ID, 제목, 채널명, 게시일, 재생시간 출력

### Gemini 성공 예시

- HTTP 200 응답
- JSON 형태의 짧은 구조화 결과 출력
- 최소한 `dishName`, `ingredients`, `steps` 형태가 보이면 성공

## 7. 자주 만나는 실패 원인

### YouTube API

- `API key not valid`: 키 오타 또는 잘못된 프로젝트
- `API has not been used or is disabled`: `YouTube Data API v3` 비활성화 상태
- `Requests from this referrer/IP are blocked`: 키 제한 설정이 현재 실행 환경과 맞지 않음
- 빈 `items`: 영상 ID가 잘못되었거나 비공개/삭제 영상

### Gemini API

- `API key not valid`: 키 오타 또는 잘못된 프로젝트
- 프로젝트 import가 안 되어 AI Studio에서 키가 제대로 연결되지 않은 경우
- 조직 정책 또는 지역/결제 설정 문제

## 8. 지금 단계에서 추가로 필요한 것

다음 준비가 끝나면 바로 본 개발 단계로 넘어갈 수 있습니다.

1. YouTube API Key
2. Gemini API Key
3. 공개 테스트용 YouTube 영상 ID 1개
4. 추후 구현 시 사용할 자막 수집 전략 결정

마지막 항목은 중요합니다. YouTube Data API는 영상 메타데이터는 잘 주지만, 자막 수집은 별도 전략이 필요할 수 있습니다. 실제 구현 전에 아래 둘 중 하나를 정해야 합니다.

- 공식 YouTube caption 관련 API/OAuth 기반 접근
- 외부 자막 수집 라이브러리 또는 서버 측 수집 전략 검토

현재 단계에서는 메타데이터 + Gemini 호출 성공 여부만 검증해도 충분합니다.

## 9. 공식 문서

- Gemini API key: [Google AI for Developers](https://ai.google.dev/gemini-api/docs/api-key)
- YouTube Data API 개요: [YouTube Data API Overview](https://developers.google.com/youtube/v3/getting-started)
- YouTube 인증/키 생성: [Obtaining authorization credentials](https://developers.google.com/youtube/registering_an_application)
