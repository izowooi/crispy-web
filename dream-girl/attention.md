# attention.md — 자율 결정 기록 (MUSE CUP / dream-girl)

사용자 확인 없이 정한 사항입니다. 바꾸고 싶은 항목이 있으면 알려 주세요.

| # | 결정 | 이유 |
|---|------|------|
| 1 | **CSR(React SPA)** + Worker는 API/이미지만 | 기존 Vite SPA 유지, SSR 이득이 적음. Workers Assets의 SPA 폴백 사용 |
| 2 | 도메인 `dg.zowoo.uk` + `dreamgirl.zowoo.uk` 둘 다 연결 | 짧은 주소와 풀네임 모두 확보 |
| 3 | 여성향 2종 = 로판 남주 16 + 현대 서울 남주 16 | 기존 히로인 세계관과 대칭, 화풍 통일 |
| 4 | 이미지 전부 Nano Banana(`google/nano-banana`)로 통일 (기존 `m01~m16`, `f04/f10/f16` 리마스터 포함) | 요청한 "동일 화풍" 충족 |
| 5 | 에디션 3종: 히로인 32 / 히어로 32 / 전체 64강 | 64명 전원 플레이 가능 |
| 6 | D1은 익명 집계만 저장 (개인정보·로그인 없음) | 최소 수집 |
| 7 | 초기 D1 통계는 "시드 값"으로 채움 | 출시 첫날 랭킹이 비어 보이지 않도록. 실제 투표가 누적되며 변동. 원치 않으면 `UPDATE dg_character_stats SET wins=0,matches=0,championships=0;` |
| 8 | 이미지는 R2 우선 서빙, 실패 시 번들 `ASSETS` 폴백 | 로컬 개발/장애 대비 |
| 9 | Vite 6 → 8 업그레이드 | `@cloudflare/vite-plugin` 2.x 요구사항 |
| 10 | 공유 링크 `?share=<id>` (D1 `dg_shares`) | 결과 영구 링크 |
| 11 | TTS는 브라우저 Web Speech API(무료, 오프라인 가능) | 외부 비용/키 없음 |
| 12 | 일러스트 생성은 Replicate `google/nano-banana` 사용 (Gemini 한도 소진 시 대체 경로) | Gemini 쿼터 소진 대응 |

## 비밀값
커밋된 파일에 토큰 없음. Replicate 토큰은 다른 앱의 `.env.local`에서 읽어 로컬 스크립트로만 사용했고 저장소에는 포함하지 않았습니다.

## Gemini 한도 관련 보류 항목
현재 Gemini가 꼭 필요한 미완료 작업은 **없습니다**. 추후 이미지를 추가/재생성할 때는 `docs/IMAGE_PROMPTS.md`의 프롬프트를 사용하세요.
