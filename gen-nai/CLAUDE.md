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

**배포 결과 (2026-05-16):**
- Pages: `https://gennai.pages.dev` (43224188 deployment)
- Queue Worker: `https://gennai-queue.izowooi.workers.dev` (08443782 version)
- Service binding: `QUEUE` (Pages → gennai-queue)
- 스모크 통과: 832×1216 PNG 1.3MB 수신
- 동시 3 요청 직렬화 검증: 12.3s + 11.6s 인터벌 (10초+생성 2초 ≈ 정상)

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-15 | 초기 구성 | 전체 (.claude/agents 6, .claude/skills 5) | NovelAI 웹앱 신규 개발 |
| 2026-05-15 | DO를 별도 Worker로 분리 | queue-worker/ 신규 | next-on-pages가 동일 번들에 DO 클래스를 export 못 함 — 서비스 바인딩 패턴으로 전환 |
| 2026-05-16 | 첫 배포 + 스모크 통과 | gennai.pages.dev, gennai-queue | 24 테스트 GREEN, 실서비스 NAI 호출 성공 |
| 2026-05-16 | 라이트 테마 + 3컬럼 UI | web/src/app, components | 사용자 피드백 (어두움, UX 복잡) 반영 |
| 2026-05-16 | n_samples=4, R2 이미지 저장 | queue-worker, web/types | SQLITE_TOOBIG(>2MB) 회피 + 1요청 4장으로 단축 (9초) |
