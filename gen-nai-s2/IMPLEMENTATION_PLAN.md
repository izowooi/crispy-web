# gen-nai-s2 구현 계획

## 목표

NAIS3의 NovelAI v4.5 payload, 태그 사전, 토크나이저, PNG Inspector를 웹 환경에 맞게 이식한다. 사용자는 태그 자동완성과 구조화 랜덤 프롬프트를 편집한 뒤 한 요청당 4장을 생성할 수 있으며, 최대 500회의 작업을 전역 직렬 큐에 등록할 수 있다.

## 핵심 설계

- `web/`: Next.js 16 + OpenNext Cloudflare Worker. 인증, 프롬프트 편집, 랜덤 레시피, Inspector, 큐/갤러리 UI를 담당한다.
- `queue-worker/`: Durable Object 전역 큐. NovelAI 호출은 항상 하나씩 실행하며, 완료 후 설정 가능한 간격(기본 15초, 최소 10초)을 기다린다.
- D1: 프롬프트, 개별 태그, 생성 실행, 이미지 레코드를 보관한다. positive 단독 SHA-256, positive+negative 조합 SHA-256, 태그 인덱스로 미래의 결과 조회를 지원한다.
- R2: `<run-id>/<index>.png` 키로 원본 PNG를 저장한다. DB와 R2 키를 함께 내보내 다른 뷰어에서도 재사용할 수 있게 한다.
- 로컬 개발: Wrangler의 로컬 Durable Object, D1, R2를 사용한다. 실제 토큰은 `queue-worker/.dev.vars`에만 둔다.

## 사용자 흐름

1. 직접 작성: 28만 NAIS3 태그 자동완성으로 positive/negative prompt를 편집한다.
2. 랜덤 작성: subject, 외형, 구도, 포즈, 표정, 의상, 배경, 조명, 품질 슬롯을 생성하고 일부 슬롯을 잠근 채 다시 뽑는다. Advanced에서 full prompt를 자유롭게 수정·추가한다.
3. Inspector: NAI PNG의 tEXt/zTXt/iTXt 또는 stealth metadata에서 positive/negative prompt만 추출한다. Vision AI는 사용하지 않는다.
4. 생성: 확정 프롬프트 반복 또는 매 작업 새 랜덤 모드로 1~500회를 등록한다. 각 작업은 4장을 생성한다.
5. 영속화: 작업 완료 전 prompt/run/image 메타데이터와 R2 키를 D1에 기록한다.

## API 계약

- `POST /api/auth`, `DELETE /api/auth`: 서명 세션 발급·삭제.
- `POST /api/generate`: 단일/대량 캠페인을 큐에 등록.
- `GET /api/jobs/:id`, `DELETE /api/jobs/:id`: 캠페인 상태 조회와 아직 대기 중인 대량 작업 취소.
- `GET /api/images/:key`: 인증된 R2 이미지 프록시.
- `GET /api/history`: 최근 생성 기록과 프롬프트 조회를 위한 내부 계약.
- Queue Worker 내부 API: `/enqueue`, `/campaign/:id`, `/image/:key`, `/config`.

## 검증

- 태그 검색 parity, 랜덤 슬롯 잠금/안전 필터, 512 token 제한, PNG metadata 파싱을 단위 테스트한다.
- NAI payload fixture, 큐 직렬화/대기 간격, D1 스키마와 R2 저장을 Worker 테스트로 검증한다.
- API mock 기반 UI 흐름과 OpenNext/Worker 빌드를 검증한 뒤에만 실제 토큰 smoke test를 수행한다.

## 범위 제외

- Vision AI 기반 이미지 태깅.
- 배포 및 기존 `gennai.pages.dev` 리다이렉트.
- 의미 기반 이미지 검색 UI. 단, 이를 위한 DB 필드와 인덱스는 이번 구현에 포함한다.
