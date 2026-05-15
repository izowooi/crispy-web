# gen-nai 배포 가이드

## 첫 배포 (2026-05-16 완료)

```
Frontend:        https://gennai.pages.dev
Queue Worker:    https://gennai-queue.izowooi.workers.dev
Service binding: gennai → gennai-queue (binding name: QUEUE)
Model:           nai-diffusion-4-5-full
큐 정책:          MIN_INTERVAL_MS=10000 (마지막 응답 + 10초 이후 다음)
```

## 아키텍처

```
브라우저 (gennai.pages.dev)
        │  POST /api/generate { prompt, ... }
        ▼
Pages Worker (Next.js + next-on-pages)
        │  env.QUEUE.fetch(/enqueue)        ← service binding
        ▼
gennai-queue Worker
        │  DO idFromName("global")
        ▼
NovelAiQueueDO (Durable Object, SQLite-backed)
        │  enqueue → alarm → callNai → store
        ▼
NovelAI API (https://image.novelai.net/ai/generate-image)
        │  ZIP { 0.png, ... }
        ▼
DO storage (base64 PNG)
        ▲
        │ GET /api/job/[id]  → status 폴링
브라우저
```

## 토큰/시크릿 관리

- **로컬**: `gen-nai/web/.dev.vars`, `gen-nai/queue-worker/.dev.vars` (둘 다 gitignored)
- **운영**: `gennai-queue` Worker의 `NAI_TOKEN` 시크릿 (이미 주입됨)
  - 재주입: `cd gen-nai/queue-worker && echo "pst-..." | npx wrangler secret put NAI_TOKEN`
- **Pages 측은 토큰 미접근** — 모든 NAI 호출은 queue-worker가 수행

## 재배포 절차

### 큐 로직만 변경 (queue-worker)

```bash
cd gen-nai/queue-worker
npx wrangler deploy
```

### 프론트만 변경 (Pages)

```bash
cd gen-nai/web
npm run pages:build           # next-on-pages 변환
npx wrangler pages deploy .vercel/output/static --project-name gennai
```

### 캐릭터 데이터셋 갱신

`gen-nai/docs/NovelAI_Characters.csv` 수정 후:

```bash
cd gen-nai/web
npm run prebuild              # CSV → public/characters.json
npm run pages:build
npx wrangler pages deploy .vercel/output/static --project-name gennai
```

## 운영 명령

| 작업 | 명령 |
|------|------|
| 큐 worker 로그 라이브 | `cd gen-nai/queue-worker && npx wrangler tail` |
| Pages 로그 라이브 | `cd gen-nai/web && npx wrangler pages deployment tail --project-name gennai` |
| 시크릿 목록 | `cd gen-nai/queue-worker && npx wrangler secret list` |
| 시크릿 삭제 | `npx wrangler secret delete NAI_TOKEN` |
| 큐 worker 롤백 | `npx wrangler rollback <version-id>` |

## 부트스트랩 (초기 1회만)

처음 배포할 때만 필요한 작업:

```bash
# 1. Cloudflare 로그인
npx wrangler login

# 2. queue-worker 배포 (DO 네임스페이스 생성)
cd gen-nai/queue-worker
npx wrangler deploy

# 3. queue-worker 시크릿 주입
echo "pst-..." | npx wrangler secret put NAI_TOKEN

# 4. Pages 프로젝트 생성
npx wrangler pages project create gennai --production-branch main

# 5. Pages 첫 배포
cd ../web
npm run pages:build
npx wrangler pages deploy .vercel/output/static --project-name gennai
```

## 스모크 테스트

```bash
JOB_ID=$(curl -s -X POST https://gennai.pages.dev/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"1girl, masterpiece","negativePrompt":"lowres","width":832,"height":1216,"steps":28,"guidance":5,"sampler":"euler_ancestral"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jobId'])")

# 폴링
for i in {1..20}; do
  sleep 3
  STATUS=$(curl -s "https://gennai.pages.dev/api/job/$JOB_ID")
  echo "$STATUS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status'))"
  echo "$STATUS" | grep -q '"status":"done"' && break
done
```

## 알려진 제약

- **이미지 저장은 DO storage** — base64로 인라인 저장. 큰 이미지(>128KB)는 향후 R2로 이전 필요.
- **무료 플랜의 DO 제약** — 무료 플랜에서도 DO는 사용 가능하지만 일부 한도 있음 (현재 무료로 운영 중).
- **gennai.pages.dev 자동 매핑** — 첫 배포 후 즉시 활성. custom domain은 GUI에서 추가.
- **position 필드 미세 race** — 동시 enqueue 시 position 값이 약간 어긋날 수 있음(실제 처리 순서는 정상). 사용자에게는 큰 영향 없음.
