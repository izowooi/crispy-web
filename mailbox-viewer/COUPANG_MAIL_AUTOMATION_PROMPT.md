# Coupang Mail Import Automation Prompt

## Goal

쿠팡 구매/결제 메일이 쌓이는 Apple Mail 메일박스를 주기적으로 읽고, Supabase `clever-lemon` 프로젝트의 `public.cp_*` 테이블에 중복 없이 업서트한다.

## Automation Prompt

아래 프롬프트를 Codex 자동화나 새 Codex 작업에 그대로 사용한다.

```text
작업 폴더는 이 저장소의 mailbox-viewer 디렉터리입니다.

Apple Mail 쿠팡 결제 메일함을 읽어서 Supabase clever-lemon DB의 public.cp_* 테이블에 중복 없이 반영해주세요.

메일함 경로:
~/Library/Mail/V10/<MAIL_ACCOUNT_UUID>/coupang-payment.mbox

해야 할 일:
1. 저장소 루트에서 mailbox-viewer 디렉터리로 이동합니다.
2. scripts/import_coupang_mail.py 를 실행해서 위 메일함을 파싱합니다.
3. 파싱 결과는 out/coupang_import/YYYYMMDD_HHMMSS 같은 새 실행 폴더에 저장합니다.
4. 구매내역, 상세 상품명, 수량, 단가, 구매금액, 결제금액, 주문일, 판매자, 수신자 마스킹 정보, 카테고리를 추출합니다.
5. 카테고리는 scripts/import_coupang_mail.py 의 규칙을 우선 사용하고, DB의 cp_category_rules와 일관되게 유지합니다.
6. Supabase MCP를 사용할 수 있으면 public.cp_import_payload(jsonb)를 호출하거나, 필요한 경우 안전한 임시 RPC를 만들어 배치 업서트합니다.
7. Supabase MCP를 사용할 수 없으면 환경변수에 있는 Supabase 토큰/DB URL을 사용해서 Python 또는 psql로 업서트합니다.
8. DB 중복 방지는 반드시 DB 유니크 키와 업서트에 맡깁니다. 새 메일인지 로컬 상태 파일만 믿고 판단하지 않습니다.
9. 업서트 후 다음 카운트를 검산합니다:
   - cp_email_messages
   - cp_orders
   - cp_order_items
   - cp_email_messages where parsed_status = 'skipped'
   - cp_monthly_category_spend 최근 3개월
10. 임시 업로드 토큰/RPC를 만들었다면 작업 종료 전에 반드시 비활성화하거나 삭제합니다.
11. 최종 답변에는 읽은 메일 수, 파싱된 주문 수, DB에 남은 유니크 주문 수, 상품 수, 스킵 수, 첫/마지막 주문일, 주요 카테고리별 금액을 간략히 보고합니다.

주의:
- 원본 메일 HTML이나 out/coupang_import 안의 JSON/SQL에는 구매내역 개인정보가 있으므로 Git에 커밋하지 않습니다.
- Supabase secret/service_role 키는 브라우저, 프론트엔드, 공개 저장소에 절대 노출하지 않습니다.
- macOS Full Disk Access 권한이 없으면 Mail 폴더 접근이 실패할 수 있습니다. Codex, Terminal, Python 실행 주체에 전체 디스크 접근 권한이 있는지 확인합니다.
```

## Environment Variables

자동화 실행 환경에는 아래 값 중 하나의 경로를 준비한다.

### Preferred: Supabase Secret/Service Key via REST RPC

```sh
export COUPANG_MAILBOX_PATH="$HOME/Library/Mail/V10/<MAIL_ACCOUNT_UUID>/coupang-payment.mbox"
export SUPABASE_URL="..."
export SUPABASE_SERVICE_ROLE_KEY="..."
export SOURCE_DEVICE="$(hostname)"
```

Supabase에서 한 번만 권한을 열어둔다.

```sql
grant usage on schema public to service_role;
grant execute on function public.cp_import_payload(jsonb) to service_role;
```

그 다음 업로더는 `cp_import_payload` RPC를 직접 호출하면 된다.

### Alternative: Direct Postgres Connection

```sh
export COUPANG_MAILBOX_PATH="$HOME/Library/Mail/V10/<MAIL_ACCOUNT_UUID>/coupang-payment.mbox"
export SUPABASE_DB_URL="..."
export SOURCE_DEVICE="$(hostname)"
```

이 방식은 `psycopg` 또는 `psql`로 `select public.cp_import_payload(%s::jsonb)`를 실행한다. REST 키 대신 DB 비밀번호를 쓰므로 1Password, macOS Keychain, `.env.local`처럼 로컬 비밀 저장소에만 둔다.

## Example Commands

파싱:

```sh
cd mailbox-viewer
RUN_DIR="out/coupang_import/$(date +%Y%m%d_%H%M%S)"
python3 scripts/import_coupang_mail.py \
  --mailbox "$COUPANG_MAILBOX_PATH" \
  --out-dir "$RUN_DIR" \
  --source-device "${SOURCE_DEVICE:-$(hostname)}" \
  --batch-size 100
```

업로드는 두 가지 중 하나를 사용한다.

### REST RPC Upload

`scripts/upload_coupang_payload.py`는 기본적으로 `cp_import_payload`를 직접 호출한다.

```sh
python3 scripts/upload_coupang_payload.py \
  --payload-json "$RUN_DIR/payload_messages.json" \
  --source-path "$COUPANG_MAILBOX_PATH" \
  --source-device "${SOURCE_DEVICE:-$(hostname)}" \
  --batch-size 100
```

이때 `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_KEY` 중 하나가 있어야 한다.

### psql Upload

`import_coupang_mail.py`가 만든 SQL 배치를 직접 실행한다.

```sh
for f in "$RUN_DIR"/sql_batches/*.sql; do
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

## Python Upload Strategy Without MCP

MCP가 없을 때 가장 깔끔한 방식은 업로더를 다음 구조로 바꾸는 것이다.

```python
from supabase import create_client

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)

result = supabase.rpc("cp_import_payload", {"payload": payload}).execute()
```

패키지 설치:

```sh
python3 -m pip install supabase
```

직접 DB 연결을 선호하면:

```sh
python3 -m pip install psycopg[binary]
```

그리고 Python에서:

```python
import json
import os
import psycopg

with psycopg.connect(os.environ["SUPABASE_DB_URL"]) as conn:
    with conn.cursor() as cur:
        cur.execute("select public.cp_import_payload(%s::jsonb)", [json.dumps(payload, ensure_ascii=False)])
```

## Recommended Schedule

개인 구매 메일 규모라면 하루 1회면 충분하다.

- 매일 새벽 4시 또는 Mac mini가 항상 켜져 있는 시간
- Mac mini에서 Mail 동기화가 완료된 뒤 실행
- 실패 시 다음 실행에서 같은 메일을 다시 읽어도 DB 유니크 키가 중복을 막음

## Mail App Rule Setup

Apple Mail에서 쿠팡 메일이 자동으로 `coupang-payment` 메일박스로 들어가게 한다.

1. Mail 앱을 연다.
2. 사이드바에서 대상 계정 아래에 `coupang-payment` 메일박스가 있는지 확인한다. 없으면 먼저 만든다.
3. Mail > Settings > Rules 로 이동한다.
4. Add Rule 을 누른다.
5. 이름을 `Coupang payment to mailbox`로 둔다.
6. 조건은 보수적으로 시작한다:
   - From contains `coupang`
7. 액션:
   - Move Message to mailbox `coupang-payment`
   - Stop Evaluating Rules
8. 저장할 때 기존 메일에도 적용할지 묻는다면 필요에 따라 적용한다.

더 엄격하게 하고 싶으면 규칙을 여러 개로 나눈다.

- Rule 1: From contains `coupang` and Subject contains `주문`
- Rule 2: From contains `coupang` and Subject contains `결제`
- Rule 3: From contains `coupang` and Subject contains `배송`

Mail 규칙은 클라이언트 규칙이다. Mac이 꺼져 있거나 Mail 앱이 동기화하지 않으면 즉시 이동되지 않을 수 있다. Gmail, iCloud, 회사 메일처럼 서버 필터를 제공하는 계정이면 서버 쪽 필터/라벨도 함께 설정하는 편이 더 안정적이다.

## References

- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Python client initialization: https://supabase.com/docs/reference/python/initializing
- Apple Mail rules: https://support.apple.com/en-lamr/guide/mail/mlhlp1017/mac
- Apple Mail rule settings: https://support.apple.com/en-lamr/guide/mail/cpmlprefrulesadd
