# 01. cf CLI 기초 (v1 beta)

```bash
cf auth whoami                 # 로그인 확인 (토큰 자동 갱신)
cf d1 list                     # D1 목록
cf r2 buckets list             # R2 버킷 (버전에 따라 하위 명령 확인: cf r2 --help)
cf deploy                      # cloudflare.config.ts 기준 배포
```

핵심은 **설정 파일 한 개**입니다.

```ts
// cloudflare.config.ts
import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./worker/index.js" with { type: "cf-worker" };
export default defineConfig({
  accountId: "<ACCOUNT_ID>",
  worker: { name: "dream-girl", entrypoint, domains: ["<YOUR_DOMAIN>"],
    env: { DB: bindings.d1({ name: "dream-girl", id: "<D1_UUID>" }),
           IMAGES: bindings.r2({ name: "dream-girl" }) } },
});
```

- `with { type: "cf-worker" }` import 속성으로 Worker 진입점을 연결합니다.
- 바인딩 타입: `bindings.d1`, `bindings.r2`, `bindings.rateLimit`, `bindings.secret`, `bindings.text`.
- 로컬 시뮬레이션은 `--local` 플래그.

## 실습
`cf --help`, `cf d1 --help`, `cf r2 objects --help`로 하위 명령을 훑어보세요.
