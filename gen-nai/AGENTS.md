# AGENTS.md — gen-nai (Layer 3)

이 문서는 `gen-nai` 도메인에 적용되는 Layer 3 작업 지침이다.
상위 Layer 2 지침은 `../AGENTS.md`를 따른다. `web/`, `queue-worker/` 등에 더 구체적인 `AGENTS.md`가 생기면 해당 Layer 4 지침을 우선한다.

## 프로젝트 개요

NovelAI 이미지 생성 API를 감싸 친구들이 단일 서버 토큰으로 체험할 수 있게 하는 웹앱이다. Next.js + Cloudflare Pages 웹앱, Durable Objects 글로벌 큐 Worker, 캐릭터 데이터셋으로 구성된다.

## 구조

- `web/`: Next.js 웹앱과 Cloudflare Pages 배포 단위.
- `queue-worker/`: 요청을 직렬화하는 Durable Objects Worker.
- `docs/queueing.md`: 큐 아키텍처.
- `docs/NovelAI.xlsx`: 한글 태그 사전.
- `docs/NovelAI_Characters.csv`: 캐릭터 한글·영문 매핑.
- `.claude/`: 이 도메인의 에이전트와 스킬 정의.

## 하네스

gen-nai 개발·테스트·배포·디버깅·확장 작업에는 `.claude/skills/gen-nai-orchestrator/SKILL.md`의 워크플로우를 적용한다. 단순 질의는 직접 처리할 수 있다.

## 핵심 제약

- NovelAI API token은 Cloudflare 서버 환경변수에서만 사용하고 client bundle이나 Git에 포함하지 않는다.
- 모델은 `nai-diffusion-4-5-full`을 사용한다.
- 동시 호출은 `docs/queueing.md`에 정의한 Durable Objects 큐로 직렬화하고, 마지막 응답 이후 최소 10초를 둔다.
- 캐릭터 검색은 `docs/NovelAI_Characters.csv`를 기준으로 한글·영문·작품명 부분 일치를 지원한다.
- 데이터나 생성 로직 변경은 실패 테스트부터 추가한다.
- NovelAI v4 payload 구조가 필요하면 `$HOME/git/NAIA2.0_origiin/core/api_service.py`를 로컬 참고 자료로만 사용하고 이 저장소에 복사하지 않는다.

## 실행과 검증

웹앱 명령은 `web/`에서 실행한다.

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run pages:build
```

큐 Worker 명령은 `queue-worker/`에서 실행한다.

```bash
npm run dev
npm run deploy
```

실제 배포와 live NovelAI 호출은 비용과 운영 상태에 영향을 주므로 사용자 요청 또는 승인 없이 실행하지 않는다.

## 자주 깨지는 부분

- `@cloudflare/next-on-pages` 번들에서 Durable Object class를 함께 export하지 않는다. 큐는 별도 Worker와 service binding으로 유지한다.
- 큰 생성 결과를 Durable Objects SQLite에 직접 넣지 말고 R2 저장 경로와 metadata 동기화를 함께 검증한다.
- Cloudflare subrequest와 timeout 한도, 큐의 10초 간격을 변경할 때는 동시 요청 회귀 테스트를 추가한다.
