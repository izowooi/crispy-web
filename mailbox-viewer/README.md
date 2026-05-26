# mailbox-viewer

쿠팡 메일함에서 가져와 Supabase에 적재한 구매 데이터를 시각화하는 개인용 소비 통계 대시보드.

## 기능

- KPI: 실결제 합계, 주문/상품 수, 평균 주문액, 최대 지출 월
- 기간 필터: 최근 3/6/12개월, 올해, 전체, 시작/끝 월 직접 선택
- 카테고리 필터(대분류) + 상품명/옵션/판매자 검색
- 월별 실결제 추이, 월별 카테고리 누적 막대, 카테고리 점유 도넛
- 상위 상품/카테고리 순위, 필터링 가능한 주문 상품 상세 (페이지네이션)

## 데이터 소스

Supabase `public.cp_order_item_details` 뷰 (페이지네이션 1000행 단위 클라이언트 fetch).

## 로컬 실행

```bash
cp .env.local.example .env.local
# .env.local에 실제 Supabase URL과 publishable key 채우기
npm install
npm run dev
```

`http://localhost:3000` 접속.

## 검증

```bash
npm run lint
npm run test
npm run build
```

## 환경변수

| 이름 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable / anon 키 |

## 배포

`@cloudflare/next-on-pages` 기반 Cloudflare Pages 배포 설정 포함.

```bash
npm run pages:build
npm run preview
npm run deploy
```

## 데이터 정리/임포트 스크립트

`scripts/import_coupang_mail.py`, `scripts/upload_coupang_payload.py`는 Apple Mail `.mbox`/`.emlx` 파싱·업로드 도구. 자세한 인수인계는 `COUPANG_MAIL_IMPORT_HANDOFF.md`, 대시보드 구현 기준은 `docs/COUPANG_DASHBOARD_PLAN.md` 참고.

## Supabase RLS

`cp_*` 테이블에는 anon 키로 SELECT만 허용하는 정책이 적용되어 있다 (마이그레이션 `cp_anon_read_for_mailbox_viewer`). 개인용 데이터로 보안 요구사항이 없어 의도된 설계.
