# 2026-10-14 D1 전환 · Workers 호스팅 보고

> Claude Code 작업 완료 보고 원문(요약하지 않음). 작성: 2026-10-14

https://merge.zowoo.uk 에 배포를 마쳤고, 전체 검증까지 끝났습니다. 커밋 4개를 `izowooi/crispy-web` main에 push했습니다(`08d65982`, `78b4f6f9`, `1686f014`, `7420f2d7`).

### 목표별 결과

| 요청 | 결과와 근거 |
|---|---|
| CLI로 D1 생성, `im_` 접두어 | `wrangler d1 create infinite-merge --location apac`로 만들었습니다. 테이블 8개가 모두 `im_*`이고, 이름 규칙은 테스트로 강제합니다(`migrations/0001_init.sql`) |
| Worker 호스팅, merge.zowoo.uk | OpenNext로 빌드해 배포했고 custom domain이 연결됐습니다. 실제 브라우저로 Turnstile → 게스트 입장 → 연성 28회 → 드래그 연성 → 모바일 화면까지 확인했습니다 |
| 로컬과 호스팅이 같은 DB 사용 | `npm run dev`가 원격 D1에 붙습니다. 로컬에서 만든 레시피가 원격 `im_recipes`에 들어간 것(28 → 29)을 확인했습니다 |
| 오픈소스로 클론해서 실행 | 커밋된 파일만 새 폴더로 꺼내 **wrangler 로그아웃 상태**에서 확인했습니다. `npm ci` → 테스트 79/79 → `dev:local`(SIWC 302 정상) → `dev:mock` 연성 모두 통과 |
| 학습 자료와 실습 도구 | `docs/learn/` 4편(D1, Workers 스택, vars/secret, 방어)과 `lab:d1`, `lab:size`, `lab:clone-remote`, `lab:hammer`, 미니 Worker(`learn/workers/hello-d1`)를 만들었습니다. 문서의 명령과 출력은 이번에 실제로 실행한 결과입니다 |
| 다양한 방어 | 아래 "방어" 표 참고 |
| 로컬은 SIWC, 호스팅은 내 키 | 호스팅에서는 `/auth/chatgpt`·`/auth/callback`이 404를 돌려주고 ChatGPT 버튼을 숨깁니다. 로컬(127.0.0.1)에서는 그대로 동작합니다 |

### 질문하신 DB 크기

- **지금 상태:** 원소 30개(기본 5 + 새 단어 25), 레시피 29개, 크기 **102 kB**
  - 새 단어: 증기, 숯, 광맥, 바다, 진흙, 화산, 녹, 숲, 산, 용광로, 검, 도끼, 증기기관, 온천, 섬, 산불, 대장장이, 계곡, 도자기, 강철, 벌목꾼, 제철소, 대양, 구름, 비구름
- **예상 크기** (`npm run lab:size`, 운영 DB의 실제 행 크기 기준, 원소 1개당 레시피 2개·발견 기록 5개 가정)

| 원소 수 | 크기 | 500 MB 대비 |
|---|---|---|
| 100 | 약 184 KB | 0.04% |
| 1,000 | 약 1.15 MB | 0.23% |
| 10,000 | 약 11 MB | 2.2% |
| 100,000 | 약 114 MB | 23% |

- 원소 1개는 약 1.1 KB라서, 500 MB면 원소 약 45만 개까지 들어갑니다. 500 MB는 맞는 값이고 DB 1개 기준입니다. 계정 전체로는 5 GB까지 쓸 수 있습니다.
- 용량보다 먼저 닿을 수 있는 한도는 **하루 읽기 500만 행**입니다. 그래서 원소 수는 `COUNT(*)` 대신 trigger로 관리하는 카운터 1행만 읽게 만들었습니다.

### 방어 (실측)

| 장치 | 결과 |
|---|---|
| same-origin 검사 | 다른 출처에서 온 POST → 403 |
| Rate Limiting binding | 로컬은 정확히 21번째 요청부터 429. **운영은 느슨합니다**: 순차 50회는 모두 통과했고, 병렬 200회 중 90회 차단, 300회 중 185회 차단 |
| Turnstile (게스트 입장 시 1번) | 토큰이 없으면 `bot_check_failed`. 실제 브라우저에서는 화면에 위젯이 보이지 않은 채 통과 |
| D1 일일 쿼터 (정확한 상한) | 전체 1,500 / 게스트 60 / IP 150 / IP별 새 게스트 20 |
| kill switch · 선불 크레딧 | secret 삭제나 `INFINITE_MERGE_GUEST=off`로 즉시 끌 수 있고, 마지막 상한은 선불 크레딧입니다 |

### 요청에 없던 변경과 이유

- **devDependency 3개 추가**: `@opennextjs/cloudflare`, `wrangler`, `@cloudflare/workers-types`. Workers 배포와 D1 타입에 필요하고, 같은 저장소의 `menu` 앱도 같은 구성입니다.
- **Next 16.4.0 → 16.3.8로 고정**: 16.4.0은 OpenNext에서 부팅하지 못합니다(#1448, 미해결).
- **`cacheComponents`·`partialPrefetching` 끔**: OpenNext에서 홈이 응답 없이 멈췄습니다(#1225). 앱이 쓰지 않는 기능입니다.
- **`/`와 `/icon.svg`를 정적 asset으로 제공**: Next 서버를 거치면 홈 하나에 CPU 18~119 ms가 들었는데(Free 한도 10 ms), 지금은 Worker가 실행되지 않습니다.
- **빌드 결과물의 secret scrub/verify**: OpenNext가 `.env.local`의 키를 번들에 넣는 것을 실제로 확인해서 추가했습니다.
- **D1 동작 차이로 생긴 버그 수정**: trigger가 바꾼 행 때문에 `meta.changes`가 2로 나와서 첫 발견이 false로 기록되던 문제를 `RETURNING` 방식으로 고쳤습니다. 테스트용 D1 shim도 실제 D1과 같게 맞춰 회귀 테스트로 잡히게 했습니다.

### 만든 외부 리소스와 한 일

- D1 `infinite-merge`, Turnstile 위젯 `infinite-merge`, Worker `infinite-merge`와 custom domain
- secret 3개: `ANTHROPIC_API_KEY`(`.env.local` 값을 파이프로 전달, 출력 안 함), `IM_IP_SALT`, `TURNSTILE_SECRET_KEY`
- Turnstile 권한(`challenge-widgets.write`)을 받으려고 `wrangler login`을 한 번 다시 했습니다
- 테스트용 Haiku 호출 약 30회 (약 $0.005)

### 남은 위험과 직접 해 보실 것

- **CPU:** 새 isolate가 뜨는 요청은 CPU 100~300 ms를 씁니다(Free 한도 10 ms). 지금까지 실패는 0건이지만, 대시보드 Metrics에서 오류율을 지켜봐 주세요.
- **Worker 크기 한도:** 말씀하신 10 MB와 문서가 다릅니다. Workers 한도 문서는 비압축 64 MiB에 압축 기준 제한 없음, OpenNext 문서는 아직 Free 3 MiB입니다. 어느 쪽이든 현재 번들(gzip 1.2 MB)은 여유가 있습니다.
- **직접 하실 것 (대시보드 작업이라 제가 하지 않음):**
  - WAF Rate limiting rule 실습: 교재 4-3절
  - Bot Fight Mode: zone 전체에 적용돼 `bm.zowoo.uk`까지 영향을 받아서 일부러 꺼 두었습니다. 선택 실습입니다
- **검증하지 않은 것:** 교재의 WAF 규칙 단계, 미니 Worker를 workers.dev에 배포하는 선택 실습, Time Travel의 restore 단계(`info`까지만 실행)
- `/model`은 아직 Opus 5.5가 기본으로 저장되어 있습니다.

교재는 `infinite-merge/docs/learn/README.md`부터 순서대로 보시면 됩니다.

Sources:
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Rate limit experiments (Classmethod)](https://dev.classmethod.jp/articles/cloudflare-rate-limit-experiments/)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) · [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [WAF rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) · [Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/)
- [Turnstile testing keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare) · [OpenNext bindings](https://opennext.js.org/cloudflare/bindings) · [Workers development & testing](https://developers.cloudflare.com/workers/development-testing/)
- [opennextjs-cloudflare#1448](https://github.com/opennextjs/opennextjs-cloudflare/issues/1448) · [#1225](https://github.com/opennextjs/opennextjs-cloudflare/issues/1225)
