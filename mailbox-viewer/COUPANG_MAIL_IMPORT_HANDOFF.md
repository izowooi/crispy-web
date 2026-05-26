# 쿠팡 메일 가져오기 인수인계

## 현재 상태

- 기존 Codex 작업 폴더: `/Users/izowooi/Documents/쿠팡 메일함 정리`
- 원하는 작업 폴더: `/Users/izowooi/git/crispy-web/mailbox-viewer`
- Supabase 프로젝트: `clever-lemon`
- Supabase 프로젝트 ID/ref: `tnihnfuwhhtvbkmhwiut`
- Supabase URL: `https://tnihnfuwhhtvbkmhwiut.supabase.co`
- 원본 메일함 경로:
  `/Users/izowooi/Library/Mail/V10/A0424D4C-DEAA-4781-AC58-578402A69AB6/coupang-payment.mbox`

현재 Codex 스레드 안에서는 작업 폴더 루트를 변경할 수 없어서, 재사용 가능한 스크립트와 이 인수인계 문서를 새 대상 폴더로 복사했습니다.

## Supabase 테이블 및 뷰

`public` 스키마 아래에 `cp_` 접두사로 생성했습니다.

- `cp_import_runs`
- `cp_email_messages`
- `cp_orders`
- `cp_order_items`
- `cp_category_rules`
- `cp_order_item_details`
- `cp_monthly_category_spend`
- `cp_weekly_category_spend`

중복 방지는 스크립트뿐 아니라 데이터베이스에서도 처리합니다.

- `cp_email_messages.email_identity`는 고유합니다.
- `cp_email_messages.raw_sha256`은 고유합니다.
- `cp_orders.order_key`는 고유합니다.
- `cp_orders.order_no`는 값이 있을 때 고유합니다.
- `cp_order_items`에는 `(order_id, item_fingerprint)` 기준 고유 키가 있습니다.

따라서 나중에 Mac mini에서 가져오기 스크립트를 다시 실행해도 기존 행을 중복 생성하지 않고 upsert해야 합니다.

## 최종 가져오기 건수

Supabase에서 중복 제거와 정리를 마친 뒤의 결과입니다.

- 고유 이메일 메시지: `1327`
- 고유 주문: `1323`
- 주문 상품 행: `2497`
- 건너뛴 비구매 메시지: `4`
- 첫 주문일: `2016-08-30`
- 마지막 주문일: `2026-05-26`
- `cp_orders.paid_amount_krw` 합계: `30,813,450`

DB 중복 제거 전 초기 로컬 파싱 결과입니다.

- 읽은 메일 파일: `1651`
- 파싱된 구매 메시지: `1647`
- 파싱된 주문: `1647`
- 파싱된 상품 후보: `3191`
- 파싱 오류: `0`

건수 차이는 예상된 결과입니다. 반복된 쿠팡 메시지가 같은 메시지 식별자, 주문 키, 상품 fingerprint를 공유했고, DB 고유 제약 조건에 의해 하나로 합쳐졌기 때문입니다.

## 카테고리 요약

규칙 정리 후 현재 `cp_order_items` 카테고리 분포입니다.

| 카테고리 | 세부 | 상품 수 | 금액 KRW |
|---|---:|---:|---:|
| 식품 | 신선식품 | 863 | 5,836,940 |
| 육아/아동 |  | 385 | 5,227,480 |
| 식품 | 가공식품 | 359 | 2,596,070 |
| 기타 |  | 358 | 5,100,390 |
| 패션 | 여성의류 | 126 | 2,602,070 |
| 도서/문구 |  | 94 | 835,290 |
| 뷰티 |  | 65 | 875,970 |
| 생활용품 |  | 56 | 1,058,900 |
| 패션 | 신발/가방 | 43 | 1,079,180 |
| 건강 |  | 42 | 744,750 |
| 패션 | 남성의류 | 38 | 737,760 |
| 디지털/가전 |  | 35 | 4,400,650 |
| 홈/인테리어 |  | 20 | 1,215,010 |
| 스포츠/레저 |  | 7 | 190,240 |
| 자동차용품 |  | 4 | 68,900 |
| 반려동물 |  | 2 | 47,500 |

`기타`는 아직 의도적으로 보수적으로 남겨두었습니다. 나중에 `cp_category_rules`에 행을 추가하고 재분류 업데이트를 다시 실행하면 개선할 수 있습니다.

## 복사된 스크립트

다음 파일을 새 폴더로 복사했습니다.

- `scripts/import_coupang_mail.py`
- `scripts/upload_coupang_payload.py`

`import_coupang_mail.py`는 Apple Mail `.mbox` / `.emlx` 메시지를 JSON과 SQL 배치로 파싱합니다.

`upload_coupang_payload.py`는 첫 가져오기 작업 중 임시 Supabase RPC/token 경로와 함께 사용했습니다. 업로드 후 안전을 위해 임시 RPC와 token 테이블을 제거했으므로, 이 업로드 스크립트를 다시 사용하려면 새 임시 RPC를 만들거나 다른 인증 업로드 경로가 필요합니다.

## 중요한 개인정보 안내

기존 작업 폴더에는 다음 파일이 있습니다.

- `out/coupang_import/payload_messages.json`
- `out/coupang_import/sql_batches/*.sql`

이 파일에는 구매 이력과 마스킹된 수신자 정보가 들어 있습니다. 새 작업 폴더로 자동 복사하지 않았습니다.

## 유용한 쿼리

월별 카테고리 지출:

```sql
select *
from public.cp_monthly_category_spend
order by month desc, purchase_amount_krw desc;
```

주별 카테고리 지출:

```sql
select *
from public.cp_weekly_category_spend
order by week desc, purchase_amount_krw desc;
```

상세 주문 상품:

```sql
select *
from public.cp_order_item_details
order by order_datetime desc, item_index;
```

현재 테이블 건수:

```sql
select
  (select count(*) from public.cp_email_messages) as email_messages,
  (select count(*) from public.cp_orders) as orders,
  (select count(*) from public.cp_order_items) as order_items,
  (select count(*) from public.cp_email_messages where parsed_status = 'skipped') as skipped_messages;
```

## 제안하는 다음 단계

다음 경로에서 새 Codex 작업 폴더를 엽니다.

`/Users/izowooi/git/crispy-web/mailbox-viewer`

그다음 기존 Supabase 테이블/뷰를 기반으로 웹앱을 만듭니다. 조회용 앱에서는 다음 항목을 읽는 것을 우선합니다.

- `cp_monthly_category_spend`
- `cp_weekly_category_spend`
- `cp_order_item_details`

쓰기 키나 가져오기용 인증 정보를 브라우저에 노출하지 마세요.
