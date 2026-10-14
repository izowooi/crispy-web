# local-worker-hello — 내 컴퓨터에서만 도는 연습용 Worker

> ⚠️ **배포 금지.** 이 폴더에서는 `wrangler dev`(내 컴퓨터에서 실행)만 씁니다.
> `wrangler deploy` 는 하지 마세요. 이름이 `baby-menu-lab-hello` 라서 운영 `baby-menu` 를 덮어쓰지는 않지만,
> 연습용이 인터넷에 올라갈 이유가 없습니다.

## 실행

```bash
cd learn/labs/cloudflare/local-worker-hello
npx wrangler dev --port 8799      # 프로젝트(menu/)에 설치된 wrangler 를 씁니다
```

다른 터미널에서:

```bash
curl -s localhost:8799/                      # isolate 시작 시각, 요청 횟수, vars
curl -s localhost:8799/                      # 한 번 더 → requestsInThisIsolate 가 2 로 올라간다
curl -s localhost:8799/secret                # secret 이 없을 때
cp .dev.vars.example .dev.vars               # 가짜 secret 만들기 → wrangler dev 재시작
curl -s localhost:8799/secret                # 이제 defined: true (값은 보여 주지 않음)
curl -s "localhost:8799/pbkdf2?n=100000"     # 성공 + 걸린 시간
curl -s "localhost:8799/pbkdf2?n=1000000"    # 반복을 10배로 → 걸린 시간도 눈에 띄게 늘어난다
curl -s localhost:8799/subrequest            # 바깥으로 fetch 한 번 (subrequest 1개)
```

끝나면 `wrangler dev` 터미널에서 `Ctrl+C`.

## 관찰 포인트

| 실험 | 보게 되는 것 | 배우는 것 |
|---|---|---|
| `/` 두 번 | `requestsInThisIsolate` 증가 | 모듈 전역 변수는 isolate 하나 안에서 공유 — 하지만 언제든 사라질 수 있다 |
| `wrangler dev` 재시작 후 `/` | `isolateStartedAt` 변경 | 새 isolate = 새 전역 상태 |
| `/secret` 전/후 | `.dev.vars` 의 유무 | secret 은 코드가 아니라 **바인딩**으로 들어온다 |
| `/pbkdf2?n=1000000` | `ms` 가 `n=100000` 보다 훨씬 큼 | 반복 횟수 = 해시 비용. Workers 는 CPU 시간에도 한도가 있어서 무한정 올릴 수 없다 |

> **참고** — 이 앱은 PBKDF2 반복 횟수를 100,000 으로 고정했습니다(`../../../../src/lib/server/auth.ts`). 배포된 Workers 에 상한이 있다는 내용은 코드 주석과
> 커뮤니티 글에만 있고 공식 문서에서는 확인하지 못했습니다. 그리고 로컬 `wrangler dev` 는 100,001 이상도 통과시킵니다.
> "로컬에서 되니까 운영에서도 된다"가 항상 성립하지는 않는다는 좋은 예입니다.
