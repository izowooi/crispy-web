# gen-nai — NovelAI 이미지 생성 웹앱

NovelAI 이미지 생성 API를 래핑해서 "NovelAI 계정 없이도 친구들이 체험할 수 있는" 단일 토큰 공유 웹앱.
Next.js + Cloudflare Pages + Durable Objects 글로벌 큐 + 2,300+ 캐릭터 데이터셋.

## 하네스: gen-nai 웹앱 개발

**목표:** TDD 기반으로 Next.js NovelAI 이미지 생성 웹앱을 만들고 Cloudflare Pages(`gennai.pages.dev`)에 배포한다. NAI 약관 준수를 위해 Durable Object 글로벌 큐로 동시 호출을 직렬화한다.

**트리거:** gen-nai 웹앱 관련 개발·테스트·배포·디버깅·확장 작업 요청 시 `gen-nai-orchestrator` 스킬을 사용한다. 단순 질문은 직접 응답 가능.

**핵심 제약:**
- NAI API 토큰은 절대 클라이언트 번들/Git에 포함 금지 — Cloudflare 환경변수만 사용
- 모델 고정: `nai-diffusion-4-5-full`
- 동시 호출 직렬화: 마지막 응답 + 10초 이후 다음 작업 (`docs/queueing.md` 참조)
- 캐릭터 검색은 `docs/NovelAI_Characters.csv`(2,304행) 기반, 한글·영문·작품명 부분일치
- 개발은 TDD — 실패하는 테스트부터 작성

**참조 자료:**
- `docs/queueing.md` — Durable Object 큐 아키텍처
- `docs/NovelAI.xlsx` — 한글 태그 사전 (캐릭터 외 기본/외모/체형/의상/장신구/동작/행동)
- `docs/NovelAI_Characters.csv` — 캐릭터 한글/영문 매핑
- `/Users/izowooi/git/NAIA2.0_origiin/core/api_service.py` — NAI v4 페이로드 구조 1차 레퍼런스

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-15 | 초기 구성 | 전체 (.claude/agents 6, .claude/skills 5) | NovelAI 웹앱 신규 개발 |
