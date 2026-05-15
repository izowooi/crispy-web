---
name: tdd-nextjs
description: Next.js + Cloudflare Workers + Durable Objects TDD 셋업 가이드. Vitest 단위/통합, Playwright e2e, MSW로 NAI fetch 격리, @cloudflare/vitest-pool-workers로 DO 실행, GIVEN/WHEN/THEN 명명 규칙. 테스트 코드를 작성하거나 TDD 사이클을 진행할 때 이 스킬을 사용한다.
---

# tdd-nextjs

`gen-nai/web`에서 TDD를 굴리는 방법.

## 레이어 구조

| 레이어 | 도구 | 격리 대상 |
|--------|------|----------|
| 단위 (lib) | Vitest + jsdom | 외부 fetch는 vi.mock |
| 단위 (DO) | Vitest + 인메모리 storage stub | `state.storage`를 Map으로 대체 |
| 통합 (API 라우트) | Vitest + MSW | NAI 호출 MSW로 가로채기 |
| 통합 (DO 실제) | `@cloudflare/vitest-pool-workers` | 실제 workerd, NAI는 MSW |
| e2e | Playwright | `wrangler pages dev` 띄워서 클릭 시뮬 |

## package.json scripts

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:do": "vitest --config vitest.do.config.ts run",
    "pages:build": "npx @cloudflare/next-on-pages",
    "deploy": "wrangler pages deploy .vercel/output/static --project-name gennai"
  }
}
```

## vitest.config.ts (기본)

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
});
```

## vitest.do.config.ts (DO 전용)

```ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
export default defineWorkersConfig({
  test: {
    include: ["tests/do/**/*.test.ts"],
    poolOptions: {
      workers: { wrangler: { configPath: "./wrangler.jsonc" } },
    },
  },
});
```

## 명명 규칙

```ts
describe("buildNaiV45Payload", () => {
  it("GIVEN base prompt only WHEN built THEN v4_prompt.base_caption holds the prompt and char_captions is empty", () => {
    // ...
  });
});
```

핵심: **이 테스트가 어떤 의도인지** 영문/한글 자연어로 풀어쓴다. 다음 사람이 깨진 테스트만 보고도 무엇이 깨졌는지 안다.

## MSW로 NAI 호출 격리

```ts
// tests/setup.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { readFileSync } from "node:fs";
import path from "node:path";

const fixtureZip = readFileSync(path.resolve(__dirname, "fixtures/nai-response.zip"));

export const server = setupServer(
  http.post("https://image.novelai.net/ai/generate-image", () => {
    return new HttpResponse(fixtureZip, { headers: { "Content-Type": "binary/octet-stream" } });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`tests/fixtures/nai-response.zip` — 1x1 PNG 하나만 들어있는 ZIP (생성 스크립트 별도)

## DO 단위 테스트 (Map 스텁)

```ts
class FakeStorage {
  m = new Map<string, any>();
  alarmAt: number | null = null;
  async get(k: string) { return this.m.get(k); }
  async put(k: string, v: any) { this.m.set(k, v); }
  async getAlarm() { return this.alarmAt; }
  async setAlarm(t: number) { this.alarmAt = t; }
}

function makeDO() {
  const state = { storage: new FakeStorage() } as unknown as DurableObjectState;
  return new NovelAiQueueDO(state, { NAI_TOKEN: "test", MIN_INTERVAL_MS: "10" } as any);
}

it("enqueue 시 jobId가 발급되고 큐 길이가 1 증가한다", async () => {
  const do_ = makeDO();
  const res = await do_.enqueue(new Request("https://do/enqueue", { method: "POST", body: JSON.stringify({ prompt: "p" }) }));
  const { jobId, position } = await res.json();
  expect(jobId).toMatch(/^[0-9a-f-]+$/);
  expect(position).toBe(1);
});
```

## 동시성 테스트

```ts
it("3개 enqueue가 동시에 들어와도 jobId 3개가 순서대로 부여된다", async () => {
  const do_ = makeDO();
  const [r1, r2, r3] = await Promise.all([
    do_.enqueue(req("p1")), do_.enqueue(req("p2")), do_.enqueue(req("p3")),
  ]);
  const ids = await Promise.all([r1, r2, r3].map(r => r.json().then(j => j.jobId)));
  expect(new Set(ids).size).toBe(3);
});
```

## Playwright e2e 골든 시나리오

```ts
test("프롬프트 입력 후 생성하면 갤러리에 이미지가 표시된다", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Prompt").fill("hu_tao_(genshin_impact), 1girl");
  await page.getByRole("button", { name: /generate/i }).click();
  await expect(page.getByText(/queued|processing/i)).toBeVisible();
  await expect(page.locator("img[data-testid=result]")).toBeVisible({ timeout: 30000 });
});
```

## TDD 체크리스트

- [ ] 새 기능 시작 시 — RED 테스트 1개 작성, 명시적으로 실패 확인
- [ ] 가장 단순한 구현으로 GREEN
- [ ] 통과 후 리팩터 — 테스트는 그대로
- [ ] 외부 의존성은 항상 MSW/mock으로 격리, 실 호출은 e2e/스모크에서만
- [ ] 동시성/에러 케이스는 별도 RED로 명세화
