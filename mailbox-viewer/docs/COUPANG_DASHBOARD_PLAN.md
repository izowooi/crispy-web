# 쿠팡 소비 통계 웹 대시보드 계획

## 목표

Supabase에 구축된 쿠팡 구매 데이터베이스를 참고해서, 웹에서 소비 통계를 시각화해 볼 수 있는 개인용 대시보드를 만든다.

이 문서는 나중에 “이 계획대로 구현해줘”라고 지시했을 때 바로 구현에 들어갈 수 있도록 구현 기준, 데이터 기준, UI 기준, 검증 기준을 정리한 실행 계획이다.

## 기술 스택

- Next.js App Router
- React
- TypeScript
- Tailwind CSS v4
- Supabase JS
- Recharts
- lucide-react
- Cloudflare Pages

## 데이터 소스

기본 데이터 소스는 Supabase의 `public.cp_order_item_details` 뷰다.

필요한 주요 컬럼:

- `order_id`
- `order_key`
- `order_datetime`
- `order_date`
- `paid_amount_krw`
- `payment_method`
- `item_id`
- `item_index`
- `product_name`
- `product_option`
- `unit_price_krw`
- `quantity`
- `purchase_amount_krw`
- `seller`
- `category_major`
- `category_minor`
- `category_confidence`

조회 방식은 브라우저에서 Supabase publishable key로 직접 읽는 방식을 기본으로 한다. 개인용 서비스이고 현재 공개 키로 조회 가능한 상태이므로, 첫 버전에서는 별도 서버 API 라우트를 만들지 않는다.

Supabase 환경변수는 다음 이름을 사용한다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

실제 값이 들어간 `.env.local`은 커밋하지 않고, `.env.local.example`만 커밋한다.

## 기본 UX

- 기본 기간은 최근 12개월이다.
- 카테고리는 대분류 우선으로 보여준다.
- `기타`는 일반 카테고리처럼 포함한다.
- 모바일과 데스크톱 모두 잘 보여야 한다.
- 인증, 로그인, 권한 관리는 만들지 않는다.
- 쓰기, 재분류, 수정 기능은 첫 버전 범위에서 제외한다.

## 금액 기준

대시보드의 대표 지출 총액은 주문별 `paid_amount_krw`를 `order_id` 기준으로 중복 제거한 합계로 계산한다.

카테고리별 차트와 상품별 차트는 상품 단위 배분이 가능한 `purchase_amount_krw`를 사용한다.

이 기준을 명확히 나누는 이유는 같은 주문에 여러 상품이 있을 때 `paid_amount_krw`를 상품 행마다 합산하면 주문 금액이 중복될 수 있기 때문이다.

## 주요 화면

첫 화면은 랜딩 페이지가 아니라 바로 대시보드다.

포함할 영역:

- KPI 요약
  - 실결제 합계
  - 주문 수
  - 상품 수
  - 평균 주문액
  - 최대 지출 월
- 기간 필터
  - 최근 3개월
  - 최근 6개월
  - 최근 12개월
  - 올해
  - 전체
  - 시작 월 / 끝 월 선택
- 카테고리 필터
  - 전체
  - 대분류별 선택
- 검색
  - 상품명
  - 옵션
  - 판매자
- 월별 실결제 추이 차트
- 월별 카테고리 누적 막대 차트
- 카테고리 점유 차트
- 상위 상품 또는 상위 카테고리 순위
- 필터 가능한 주문 상품 상세 목록

## 데이터 처리

Supabase 기본 반환 제한을 피하기 위해 `cp_order_item_details`를 1000개 단위로 페이지네이션 조회한다.

클라이언트에서 수행할 데이터 변환:

- 기간 필터 적용
- 대분류 필터 적용
- 검색어 필터 적용
- 주문별 실결제 중복 제거
- 월별 실결제 집계
- 카테고리별 상품금액 집계
- 상위 상품/카테고리 계산
- 상세 목록 정렬

주요 타입:

- `OrderItemDetail`
- `DashboardFilters`
- `DashboardSummary`

데이터 변환 함수는 가능한 한 순수 함수로 분리해서 테스트 가능하게 만든다.

## 제외 범위

첫 버전에서 하지 않을 것:

- 인증
- 로그인
- 관리자 기능
- 쿠팡 데이터 수정
- 카테고리 재분류 쓰기 기능
- Supabase DB 스키마 변경
- Supabase migration 작성
- 실제 Cloudflare Pages 배포 실행

Cloudflare Pages 배포 가능한 설정은 만들지만, 완료 기준은 로컬 검증과 GitHub 푸시까지다.

## 검증 기준

구현 후 다음 명령을 실행한다.

```bash
npm run lint
npm run test
npm run build
npm run pages:build
```

가능하면 로컬 dev server를 실행하고 Playwright MCP로 실제 화면을 확인한다.

확인할 화면:

- 데스크톱 viewport
- 모바일 viewport

확인할 동작:

- 기본 기간이 최근 12개월로 적용된다.
- KPI가 비어 있지 않다.
- 차트가 렌더링된다.
- 기간 프리셋이 동작한다.
- 시작 월 / 끝 월 선택이 동작한다.
- 카테고리 필터가 동작한다.
- 검색이 동작한다.
- 상세 목록이 필터 결과에 맞게 바뀐다.
- 모바일에서 텍스트와 차트가 겹치지 않는다.

## 테스트 시나리오

Vitest로 데이터 변환 테스트를 추가한다.

- 같은 `order_id`가 여러 상품 행에 있어도 `paid_amount_krw`는 한 번만 합산된다.
- 최근 12개월 필터가 기대한 월 범위만 포함한다.
- 올해 필터가 해당 연도의 데이터만 포함한다.
- 전체 필터가 모든 데이터를 포함한다.
- 시작 월 / 끝 월 필터가 경계 월을 포함한다.
- 대분류 필터가 선택한 카테고리만 남긴다.
- 검색어 필터가 상품명, 옵션, 판매자에 적용된다.
- 카테고리 집계는 `purchase_amount_krw` 기준으로 계산된다.

## 커밋 기준

웹앱 구현 커밋 메시지는 다음 형식을 기본으로 한다.

```bash
git commit -m "mailbox-viewer: 쿠팡 소비 대시보드 추가"
```

계획 문서화 커밋은 다음 메시지를 사용한다.

```bash
git commit -m "mailbox-viewer: 쿠팡 소비 대시보드 계획 문서화"
```
