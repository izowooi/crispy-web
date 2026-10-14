# 실험 노트: placement 가 하는 일을 눈으로 보기

> 이 문서는 **읽는 실험**입니다. 명령 몇 개(모두 읽기 전용)만 실행하고, 운영 설정은 바꾸지 않습니다.
> 배경은 [01장 Workers](../../01-cloudflare-workers.md#4-실제-사건-홍콩-colo-에서-anthropic-403) 를 먼저 읽으세요.

## 준비물

- 터미널, `curl`
- 이 저장소의 [`trace-colo.sh`](./trace-colo.sh)

## 1단계 — "내 요청은 어디로 들어가나?"

```bash
bash trace-colo.sh bm.zowoo.uk
```

관찰할 줄은 세 개입니다.

| 줄 | 의미 | 2026-10-14 한국에서 실행한 결과 |
|---|---|---|
| `colo=` (`/cdn-cgi/trace`) | 내 요청을 **받은** Cloudflare 데이터센터 | `HKG` (홍콩) |
| `cf-ray: …-XXX` 의 끝 3글자 | 같은 정보(요청을 받은 colo) | `HKG` |
| `cf-placement:` | Worker 코드가 **실행된** 곳 | `remote-ICN` (서울 근처) |

> **참고** — 한국에서 접속해도 입구가 서울(ICN)이 아니라 홍콩일 수 있습니다. 어느 colo 로 들어가는지는 통신사·경로(라우팅)가
> 정하고, 우리가 고를 수 없습니다. 그래서 "입구는 그대로 두고 Worker 가 **어디서 돌지**만 고정"하는 placement 가 필요했습니다.

## 2단계 — 그림으로 정리해 보기

```text
          [입구]                                [Worker 실행]                [Anthropic API]
내 폰 ───▶ HKG colo ──(placement 로 전달)───▶ ICN 근처(aws:ap-northeast-2) ───▶ 서울 쪽 IP 에서 요청 ✅
                  └── placement 가 없으면 ──▶ HKG 에서 그대로 실행 ───────────▶ 홍콩 쪽 IP → 403 ❌
```

`cf-placement: remote-ICN` 에서 **remote** 는 "입구와 다른 곳에서 실행됨", **local-XXX** 는 "입구에서 그대로 실행됨"입니다.

## 3단계 — (선택) 전/후를 직접 보고 싶다면

운영 앱의 placement 를 껐다 켜는 실험은 **하지 마세요**. 분석 기능이 실제로 깨집니다.
정말 해보고 싶다면 다음처럼 "연습용 Worker 를 새로 배포"해야 하는데, 이 문서는 그 배포를 권하지 않습니다(계정에 리소스가 남고, 정리를 잊기 쉽습니다).
대신 아래 두 가지로 충분히 이해할 수 있습니다.

1. 공식 문서의 placement 설명을 읽고 위 표와 맞춰 보기 — <https://developers.cloudflare.com/workers/configuration/smart-placement/>
2. `local-worker-hello` 의 `/subrequest` 를 실행해 보기. 내 컴퓨터에서 `bm.zowoo.uk/cdn-cgi/trace` 를 호출하면 `coloSeenByThatServer` 로
   **내 컴퓨터의 요청이 들어간 colo** 가 보입니다. "요청을 받는 colo 는 보내는 쪽 위치에 따라 달라진다"는 것을 확인하는 실험입니다.

## 생각해 볼 질문

1. `cf-placement` 헤더가 아예 없다면 어떤 경우일까요? (정답은 `trace-colo.sh` 출력 맨 아래 "읽는 법")
2. D1 의 primary 가 아시아에 있다면, Worker 를 미국에 고정하면 응답은 빨라질까요, 느려질까요?
3. placement 를 `smart` 로 두면 이번 문제가 해결되었을까요? (힌트: 공식 문서의 "Smart Placement 는 …위치에서만 고른다" 한계)
