# gen-nai-s2

NAIS3의 태그와 NovelAI v4.5 생성 로직을 활용하는 로컬 우선 이미지 생성기입니다. 구조화 랜덤 프롬프트, NAI PNG Inspector, 4장 생성, 조절 가능한 전역 큐, D1/R2 영속화를 제공합니다.

자세한 설계는 [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)를 참고하세요.

## 로컬 실행

```bash
cd queue-worker
npm install
cp .dev.vars.example .dev.vars
# .dev.vars에 로컬 테스트용 NAI_TOKEN을 직접 입력
npm run db:migrate:local
npm run dev
```

다른 터미널에서:

```bash
cd web
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

기본 로컬 주소는 웹 `http://localhost:3000`, 큐 Worker `http://localhost:8787`입니다. 실제 시크릿 파일은 Git에 포함되지 않습니다.

실제 Anlas를 쓰지 않고 전체 저장 경로를 확인하려면 큐의 `.dev.vars`에 `NAI_BASE_URL=http://127.0.0.1:8788`을 추가하고 다음 mock을 먼저 실행합니다.

```bash
cd queue-worker
node tests/mock-nai-server.mjs
```

## 로컬 환경 변수

웹:

- `AUTH_PASSWORD`: 접속 비밀번호
- `SESSION_SECRET`: 세션 HMAC 키
- `QUEUE_SERVICE_SECRET`: 웹과 큐 사이 공유 secret
- `QUEUE_BASE_URL`: 기본값 `http://127.0.0.1:8787`

큐 Worker:

- `NAI_TOKEN`: NovelAI access token
- `QUEUE_SERVICE_SECRET`: 웹과 동일한 공유 secret
- `MIN_INTERVAL_MS`: 기본 `15000`, 최소 `10000`
- `NAI_BASE_URL`: 생략 시 공식 NovelAI API. 로컬 mock 테스트에서만 변경

## 데이터 이동성

- D1에는 정규화 positive hash, positive+negative 조합 hash, 원문 prompt, 태그, 실행 설정, R2 key가 저장됩니다.
- 이미지는 R2의 `<run-id>/<index>.png` 경로에 저장됩니다.
- 로컬 DB는 `npm run db:export:local`로 SQL 형태로 내보낼 수 있습니다.

## 검증

```bash
cd web && npm run lint && npm run typecheck && npm run test && npm run build
cd ../queue-worker && npm run typecheck && npm run test
```
