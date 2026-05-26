#!/usr/bin/env python3
"""Parse Coupang Apple Mail messages and generate Supabase import SQL.

This script intentionally has no third-party dependencies so it can run on the
MacBook now and on a Mac mini later with only Python 3.
"""

from __future__ import annotations

import argparse
import datetime as dt
import email.utils
import hashlib
import html
import json
import mailbox
import os
import plistlib
import re
import sys
from email import policy
from email.parser import BytesParser
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable


PARSER_VERSION = "cp-mail-importer-v1"
KST = dt.timezone(dt.timedelta(hours=9))


CATEGORY_RULES: list[tuple[str, str, str | None, str, float]] = [
    ("fashion_women", "패션", "여성의류", r"(여성|원피스|스커트|블라우스|팬츠|레깅스|자켓|코트|니트|링클프리|ELLE PARIS|산후팬티|수유브라)", 0.92),
    ("fashion_men", "패션", "남성의류", r"(남성|셔츠|슬랙스|정장|벨트|넥타이|드로즈)", 0.90),
    ("fashion_shoes_bag", "패션", "신발/가방", r"(운동화|구두|샌들|슬리퍼|부츠|가방|백팩|파우치|지갑|캐리어|깔창)", 0.88),
    ("food_fresh", "식품", "신선식품", r"(쌀|현미|계란|달걀|메추리알|란\\b|우유|요거트|요구르트|치즈|모짜렐라|고기|한우|한돈|돼지|닭|오리|생선|황태|과일|사과|바나나|참외|포도|블루베리|토마토|아보카도|채소|야채|샐러드|콩나물|숙주|마늘|양파|오이|시금치|당근|브로콜리|실파|대파|도라지|무\\b|버섯|고사리|두부|대추|밤|반건시|감말랭이|부채살|척아이롤|목초|목심|목살|삼겹살|앞다리살|스테이크|프렌치랙)", 0.90),
    ("food_processed", "식품", "가공식품", r"(라면|사발면|비빔면|떡볶이|어묵|만두|순대|부대찌개|장조림|곰탕|오징어젓|와사비|과자|인디안밥|유과|고구마츄|카스테라|시리얼|코코볼|커피|카페라떼|라떼|맥심|캐모마일|얼그레이|히비스커스|음료|콜라|제로슈거|제로슈가|주스|식혜|두유|생수|햇반|오뚜기밥|즉석|소스|고추장|쌈장|간장|식초|부침가루|설탕|미역|김\\b|도시락김|간식|초콜릿|쿠키|빵|모닝롤|토스트|비엔나|소시지|요리|냉동|견과|너트|호박씨|애니타임)", 0.88),
    ("baby_kids", "육아/아동", None, r"(기저귀|분유|아기|유아|키즈|어린이|우리아이|젖병|젖꼭지|수유|이유식|신생아|손톱가위|턱받이|워시빕|컵홀더|바디수트|내의|아동|티니핑|뽀로로|사운드북|놀이|색칠공부|장난감)", 0.90),
    ("beauty", "뷰티", None, r"(화장품|스킨|로션|크림|선크림|선팩트|쿠션|파운데이션|염모제|미쟝센|로레알|샴푸|트리트먼트|바디워시|향수|마스크팩)", 0.88),
    ("health", "건강", None, r"(영양제|비타민|비타500|유산균|오메가|홍삼|침향환|양배추즙|마그네슘|건강|마스크|밴드|약|연고|센텔라스카)", 0.86),
    ("household", "생활용품", None, r"(세제|섬유유연제|피죤|휴지|물티슈|청소|수납|정리함|리빙박스|건전지|방향제|칫솔|생리대|주방|욕실|쓰레기|비닐|행거)", 0.86),
    ("electronics", "디지털/가전", None, r"(삼성전자|LG전자|쿠쿠|테팔|노트북|모니터|키보드|마우스|충전기|케이블|아이폰|갤럭시|이어폰|헤드폰|가전|전기주전자|냉장고|세탁기|밥솥|블렌더|TV보안기|USB|SSD)", 0.86),
    ("home_interior", "홈/인테리어", None, r"(침구|이불|베개|매트리스|커튼|러그|조명|의자|책상|가구|스툴|선반|인테리어)", 0.84),
    ("pet", "반려동물", None, r"(강아지|고양이|반려|사료|간식|모래|배변패드)", 0.90),
    ("sports", "스포츠/레저", None, r"(운동|헬스|요가|캠핑|자전거|등산|골프|수영|런닝|러닝)", 0.82),
    ("book_office", "도서/문구", None, r"(책|도서|문구|노트|펜|연필|파일|복사용지|프린터|사진앨범|포토앨범|엽서|크레용|스티커|자수|DIY|비즈)", 0.84),
    ("car", "자동차용품", None, r"(자동차|차량|와이퍼|엔진오일|블랙박스|세차|타이어)", 0.84),
]


class CoupangHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.text_parts: list[str] = []
        self.rows: list[list[str]] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag == "tr":
            self._row = []
        elif tag in {"td", "th"}:
            self._cell = []
        elif tag in {"br", "p", "div", "li"}:
            self._append_text("\n")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"td", "th"} and self._cell is not None:
            cell = normalize_space(" ".join(self._cell))
            if self._row is not None:
                self._row.append(cell)
            self._cell = None
        elif tag == "tr" and self._row is not None:
            row = [cell for cell in self._row if cell]
            if row:
                self.rows.append(row)
            self._row = None
        elif tag in {"p", "div", "li", "table", "tr"}:
            self._append_text("\n")

    def handle_data(self, data: str) -> None:
        if not data:
            return
        self._append_text(data)
        if self._cell is not None:
            self._cell.append(data)

    def _append_text(self, value: str) -> None:
        self.text_parts.append(value)

    @property
    def text(self) -> str:
        lines = [normalize_space(line) for line in "".join(self.text_parts).splitlines()]
        return "\n".join(line for line in lines if line)


def normalize_space(value: str | None) -> str:
    if not value:
        return ""
    value = html.unescape(value)
    value = value.replace("\xa0", " ").replace("\u200b", "")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_text(value: str) -> str | None:
    if not value:
        return None
    return hashlib.sha256(value.encode("utf-8", errors="replace")).hexdigest()


def parse_price(value: str | None) -> int | None:
    if not value:
        return None
    match = re.search(r"[-+]?\s*\d[\d,]*\s*원?", value)
    if not match:
        return None
    number = match.group(0).replace("원", "").replace(",", "").replace(" ", "")
    try:
        return int(number)
    except ValueError:
        return None


def parse_quantity(value: str | None) -> int | None:
    if not value:
        return None
    match = re.search(r"\d+", value.replace(",", ""))
    if not match:
        return None
    return int(match.group(0))


def strip_price(value: str, price: int | None) -> str | None:
    if price is None:
        return normalize_space(value) or None
    pattern = r"[-+]?\s*" + re.escape(f"{abs(price):,}") + r"\s*원?"
    stripped = re.sub(pattern, "", value, count=1)
    stripped = re.sub(r"[-+]?\s*" + re.escape(str(abs(price))) + r"\s*원?", "", stripped, count=1)
    return normalize_space(stripped) or None


def parse_email_datetime(value: str | None) -> str | None:
    if not value:
        return None
    try:
        parsed = email.utils.parsedate_to_datetime(value)
    except (TypeError, ValueError, IndexError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=KST)
    return parsed.astimezone(KST).isoformat()


def parse_korean_datetime(text: str) -> str | None:
    patterns = [
        r"(?:주문|결제)\s*(?:일시|일자|일|시간)?\s*[:：]?\s*(\d{4})[./-]\s*(\d{1,2})[./-]\s*(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?",
        r"(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*(\d{1,2})\s*시\s*(\d{1,2})\s*분?(?:\s*(\d{1,2})\s*초?)?)?",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if not match:
            continue
        year, month, day = (int(match.group(i)) for i in range(1, 4))
        hour = int(match.group(4) or 0)
        minute = int(match.group(5) or 0)
        second = int(match.group(6) or 0)
        try:
            return dt.datetime(year, month, day, hour, minute, second, tzinfo=KST).isoformat()
        except ValueError:
            return None
    return None


def date_part(iso_datetime: str | None) -> str | None:
    if not iso_datetime:
        return None
    return iso_datetime[:10]


def message_to_text_parts(msg: Any) -> tuple[str, str]:
    html_parts: list[str] = []
    plain_parts: list[str] = []

    for part in msg.walk():
        if part.is_multipart():
            continue
        content_type = part.get_content_type()
        filename = part.get_filename()
        if filename and content_type not in {"text/html", "text/plain"}:
            continue
        try:
            content = part.get_content()
        except Exception:
            payload = part.get_payload(decode=True)
            if not payload:
                continue
            charset = part.get_content_charset() or "utf-8"
            content = payload.decode(charset, errors="replace")
        if not isinstance(content, str):
            continue
        if content_type == "text/html":
            html_parts.append(content)
        elif content_type == "text/plain":
            plain_parts.append(content)

    return "\n".join(html_parts), "\n".join(plain_parts)


def parse_html(html_value: str, plain_value: str) -> tuple[str, list[list[str]]]:
    if html_value:
        parser = CoupangHTMLParser()
        parser.feed(html_value)
        return parser.text, parser.rows
    lines = [normalize_space(line) for line in plain_value.splitlines()]
    return "\n".join(line for line in lines if line), []


def header_role(value: str) -> str | None:
    compact = re.sub(r"\s+", "", value)
    if "구매상세" in compact or "상품명" in compact or compact in {"상품", "구매내역"}:
        return "product"
    if "쿠팡가" in compact or "판매가" in compact or "상품금액" in compact or "단가" in compact:
        return "unit_price_krw"
    if "수량" in compact:
        return "quantity"
    if "구매금액" in compact or "결제금액" in compact:
        return "purchase_amount_krw"
    if "배송" in compact:
        return "delivery_status"
    if "판매자" in compact:
        return "seller"
    return None


def category_for(product_name: str) -> dict[str, Any]:
    for rule_name, major, minor, pattern, confidence in CATEGORY_RULES:
        if re.search(pattern, product_name, flags=re.IGNORECASE):
            return {
                "category_major": major,
                "category_minor": minor,
                "category_confidence": confidence,
                "category_rule": rule_name,
            }
    return {
        "category_major": "기타",
        "category_minor": None,
        "category_confidence": 0.25,
        "category_rule": "fallback_other",
    }


def product_option(product_name: str) -> str | None:
    parts = [part.strip() for part in product_name.split(",") if part.strip()]
    if len(parts) < 2:
        return None
    option_tail = ", ".join(parts[-2:])
    if re.search(r"(black|white|gray|grey|blue|red|pink|green|brown|ivory|navy|beige|[SMLX]{1,3}\(?\d{0,3}\)?|\d+\s*(개|매|입|ml|g|kg|cm))", option_tail, re.I):
        return option_tail
    return parts[-1]


def parse_items(rows: list[list[str]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen_headers: list[tuple[int, dict[int, str]]] = []

    for idx, row in enumerate(rows):
        roles = {cell_idx: role for cell_idx, cell in enumerate(row) if (role := header_role(cell))}
        if "product" in roles.values() and ("quantity" in roles.values() or "purchase_amount_krw" in roles.values()):
            seen_headers.append((idx, roles))

    for header_idx, roles in seen_headers:
        for row in rows[header_idx + 1 :]:
            if any(header_role(cell) for cell in row):
                break
            joined = " ".join(row)
            if re.search(r"(결제 정보|받는사람 정보|주문금액|할인금액|결제금액)", joined):
                break
            product = value_by_role(row, roles, "product")
            if not product or len(product) < 2:
                continue
            if re.fullmatch(r"(상품\s*가격|가격|상품명?)", product):
                continue
            if "주문배송조회" in product and len(row) > 1:
                continue
            unit_price = parse_price(value_by_role(row, roles, "unit_price_krw"))
            quantity = parse_quantity(value_by_role(row, roles, "quantity"))
            purchase_amount = parse_price(value_by_role(row, roles, "purchase_amount_krw"))
            seller = value_by_role(row, roles, "seller")
            delivery_status = value_by_role(row, roles, "delivery_status")
            item = {
                "item_index": len(items) + 1,
                "product_name": product,
                "product_option": product_option(product),
                "unit_price_krw": unit_price,
                "quantity": quantity,
                "purchase_amount_krw": purchase_amount,
                "seller": seller,
                "delivery_status": delivery_status,
            }
            item.update(category_for(product))
            item["item_fingerprint"] = item_fingerprint(item)
            items.append(item)

    return dedupe_items(items)


def value_by_role(row: list[str], roles: dict[int, str], role: str) -> str | None:
    for idx, row_role in roles.items():
        if row_role == role and idx < len(row):
            return normalize_space(row[idx]) or None
    return None


def dedupe_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for item in items:
        fingerprint = item["item_fingerprint"]
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        item["item_index"] = len(unique) + 1
        unique.append(item)
    return unique


def item_fingerprint(item: dict[str, Any]) -> str:
    source = "|".join(
        str(item.get(key) or "")
        for key in ["product_name", "product_option", "unit_price_krw", "quantity", "purchase_amount_krw", "seller"]
    )
    return hashlib.sha256(source.encode("utf-8", errors="replace")).hexdigest()


def parse_payment(rows: list[list[str]], text: str) -> dict[str, Any]:
    result: dict[str, Any] = {}
    label_map = {
        "주문금액": "order_amount_krw",
        "할인금액": "discount_amount_krw",
        "결제금액": "paid_amount_krw",
    }

    for row in rows:
        if not row:
            continue
        label = re.sub(r"\s+", "", row[0])
        value = normalize_space(" ".join(row[1:])) if len(row) > 1 else row[0]
        for korean_label, field in label_map.items():
            if korean_label in label:
                amount = parse_price(value)
                result[field] = amount
                if field == "paid_amount_krw":
                    result["payment_method"] = strip_price(value, amount)

    for korean_label, field in label_map.items():
        if field in result:
            continue
        match = re.search(korean_label + r"\s*([-+]?\s*[\d,]+\s*원[^\n]*)", text)
        if match:
            value = normalize_space(match.group(1))
            amount = parse_price(value)
            result[field] = amount
            if field == "paid_amount_krw":
                result["payment_method"] = strip_price(value, amount)

    return result


def parse_recipient(rows: list[list[str]], text: str) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for row in rows:
        for idx, cell in enumerate(row):
            label = re.sub(r"\s+", "", cell)
            value = row[idx + 1] if idx + 1 < len(row) else ""
            if "받으시는분" in label or "받는사람" in label:
                result["recipient_name_masked"] = normalize_space(value) or None
            elif "연락처" in label:
                result["recipient_phone_masked"] = normalize_space(value) or None
            elif label == "주소":
                result["recipient_address_masked"] = normalize_space(value) or None

    if "recipient_name_masked" not in result:
        match = re.search(r"(?:받으시는 분|받는사람)\s+([^\n]+)", text)
        if match:
            result["recipient_name_masked"] = normalize_space(match.group(1))
    return result


def parse_order_no(text: str) -> str | None:
    patterns = [
        r"주문\s*(?:번호|No\.?|NO\.?)\s*[:：]?\s*([0-9A-Za-z-]{6,})",
        r"order(?:Id|No|Number)?[=/:\s]+([0-9A-Za-z-]{6,})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip("-")
    return None


def build_order_key(order_no: str | None, order_datetime: str | None, paid_amount: int | None, items: list[dict[str, Any]], raw_sha256: str) -> str:
    if order_no:
        return f"order_no:{order_no}"
    item_signature = ";".join(
        hashlib.sha256(
            "|".join(str(item.get(key) or "") for key in ["product_name", "unit_price_krw", "quantity", "purchase_amount_krw"]).encode("utf-8")
        ).hexdigest()[:16]
        for item in items
    )
    source = f"{order_datetime or ''}|{paid_amount or ''}|{item_signature or raw_sha256}"
    return "fallback:" + hashlib.sha256(source.encode("utf-8", errors="replace")).hexdigest()


def parse_emlx(path: Path) -> tuple[bytes, dict[str, Any] | None]:
    data = path.read_bytes()
    newline = data.find(b"\n")
    if newline == -1:
        return data, None
    first_line = data[:newline].strip()
    if not first_line.isdigit():
        return data, None
    size = int(first_line)
    raw_message = data[newline + 1 : newline + 1 + size]
    plist_data = data[newline + 1 + size :].strip()
    plist: dict[str, Any] | None = None
    if plist_data.startswith(b"<?xml") or plist_data.startswith(b"bplist"):
        try:
            plist = plistlib.loads(plist_data)
        except Exception:
            plist = None
    return raw_message, plist


def iter_mail_messages(mailbox_path: Path) -> Iterable[tuple[Path, bytes]]:
    if mailbox_path.is_file():
        if mailbox_path.suffix == ".mbox" or mailbox_path.name == "mbox":
            box = mailbox.mbox(str(mailbox_path), create=False)
            for idx, msg in enumerate(box):
                yield mailbox_path.with_name(f"{mailbox_path.name}:{idx}"), msg.as_bytes(policy=policy.default)
            return
        yield mailbox_path, mailbox_path.read_bytes()
        return

    # Force one direct scan first. On macOS Mail directories, pathlib.rglob can
    # otherwise return an empty iterator when TCC denies access.
    try:
        _ = list(mailbox_path.iterdir())
    except PermissionError:
        raise

    emlx_files = sorted(path for path in mailbox_path.rglob("*.emlx") if path.is_file())
    if emlx_files:
        for path in emlx_files:
            raw_message, _plist = parse_emlx(path)
            yield path, raw_message
        return

    nested_mbox = sorted(path for path in mailbox_path.rglob("mbox") if path.is_file())
    for path in nested_mbox:
        box = mailbox.mbox(str(path), create=False)
        for idx, msg in enumerate(box):
            yield path.with_name(f"{path.name}:{idx}"), msg.as_bytes(policy=policy.default)

    if not emlx_files and not nested_mbox:
        raise FileNotFoundError(f"No .emlx files or nested mbox files found under {mailbox_path}")


def parse_message(source_path: Path, raw_message: bytes, source_device: str | None) -> dict[str, Any]:
    msg = BytesParser(policy=policy.default).parsebytes(raw_message)
    html_body, plain_body = message_to_text_parts(msg)
    extracted_text, rows = parse_html(html_body, plain_body)
    subject = normalize_space(str(msg.get("subject", "")))
    sent_at = parse_email_datetime(msg.get("date"))
    order_datetime = parse_korean_datetime(extracted_text) or sent_at
    items = parse_items(rows)
    payment = parse_payment(rows, extracted_text)
    recipient = parse_recipient(rows, extracted_text)
    order_no = parse_order_no(extracted_text + "\n" + subject)

    if items and "order_amount_krw" not in payment:
        item_sum = sum(item.get("purchase_amount_krw") or 0 for item in items)
        payment["order_amount_krw"] = item_sum or None
    if items and "paid_amount_krw" not in payment:
        payment["paid_amount_krw"] = payment.get("order_amount_krw")

    seller = next((item.get("seller") for item in items if item.get("seller")), None)
    raw_sha = sha256_bytes(raw_message)
    order_key = build_order_key(order_no, order_datetime, payment.get("paid_amount_krw"), items, raw_sha)

    parsed_status = "parsed" if items else "skipped"
    parsed_error = None if items else "No Coupang purchase item table was detected."
    order: dict[str, Any] | None = None
    if items:
        order = {
            "order_key": order_key,
            "order_no": order_no,
            "order_datetime": order_datetime,
            "order_date": date_part(order_datetime),
            "subject": subject,
            "seller": seller,
            "order_amount_krw": payment.get("order_amount_krw"),
            "discount_amount_krw": payment.get("discount_amount_krw"),
            "paid_amount_krw": payment.get("paid_amount_krw"),
            "payment_method": payment.get("payment_method"),
            "recipient_name_masked": recipient.get("recipient_name_masked"),
            "recipient_phone_masked": recipient.get("recipient_phone_masked"),
            "recipient_address_masked": recipient.get("recipient_address_masked"),
            "items": items,
        }

    message = {
        "source_path": str(source_path),
        "source_device": source_device,
        "message_id": normalize_space(str(msg.get("message-id", ""))) or None,
        "raw_sha256": raw_sha,
        "html_sha256": sha256_text(html_body),
        "text_sha256": sha256_text(extracted_text or plain_body),
        "subject": subject,
        "from_address": normalize_space(str(msg.get("from", ""))) or None,
        "to_address": normalize_space(str(msg.get("to", ""))) or None,
        "sent_at": sent_at,
        "received_at": parse_email_datetime(msg.get("received")),
        "raw_size_bytes": len(raw_message),
        "parsed_status": parsed_status,
        "parsed_error": parsed_error,
        "orders": [order] if order else [],
    }
    return message


def chunked(values: list[dict[str, Any]], size: int) -> Iterable[list[dict[str, Any]]]:
    for idx in range(0, len(values), size):
        yield values[idx : idx + size]


def dollar_quote_json(payload: dict[str, Any]) -> str:
    json_text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    tag = "cpjson_" + hashlib.sha256(json_text.encode("utf-8")).hexdigest()[:12]
    return f"${tag}${json_text}${tag}$"


def write_sql_batches(
    messages: list[dict[str, Any]],
    out_dir: Path,
    source_path: Path,
    source_device: str | None,
    batch_size: int,
) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for old_file in out_dir.glob("*.sql"):
        old_file.unlink()

    sql_files: list[Path] = []
    total_files = len(messages)
    for batch_idx, batch in enumerate(chunked(messages, batch_size), start=1):
        payload = {
            "source_path": str(source_path),
            "source_device": source_device,
            "parser_version": PARSER_VERSION,
            "batch_label": f"{batch_idx:04d}",
            "mail_file_count": total_files,
            "messages": batch,
            "notes": {"generated_by": PARSER_VERSION},
        }
        sql = "select public.cp_import_payload(" + dollar_quote_json(payload) + "::jsonb) as result;\n"
        sql_path = out_dir / f"batch_{batch_idx:04d}.sql"
        sql_path.write_text(sql, encoding="utf-8")
        sql_files.append(sql_path)
    return sql_files


def summarize(messages: list[dict[str, Any]]) -> dict[str, Any]:
    orders = [order for msg in messages for order in msg.get("orders", [])]
    items = [item for order in orders for item in order.get("items", [])]
    categories: dict[str, int] = {}
    for item in items:
        category = item.get("category_major") or "기타"
        categories[category] = categories.get(category, 0) + 1
    return {
        "messages": len(messages),
        "parsed_messages": sum(1 for msg in messages if msg.get("parsed_status") == "parsed"),
        "skipped_messages": sum(1 for msg in messages if msg.get("parsed_status") != "parsed"),
        "orders": len(orders),
        "items": len(items),
        "categories": dict(sorted(categories.items())),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Parse Coupang Mail.app mailbox and generate Supabase SQL batches.")
    parser.add_argument("--mailbox", required=True, type=Path, help="Apple Mail .mbox package or mbox file path.")
    parser.add_argument("--out-dir", default=Path("out/coupang_import"), type=Path, help="Output directory.")
    parser.add_argument("--source-device", default=os.uname().nodename, help="Device label stored in cp_* tables.")
    parser.add_argument("--batch-size", default=150, type=int, help="Messages per SQL batch.")
    args = parser.parse_args()

    mailbox_path = args.mailbox.expanduser()
    out_dir = args.out_dir

    if not mailbox_path.exists():
        print(f"Mailbox path does not exist: {mailbox_path}", file=sys.stderr)
        return 2

    messages: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    try:
        iterator = iter_mail_messages(mailbox_path)
        for idx, (source_path, raw_message) in enumerate(iterator, start=1):
            try:
                messages.append(parse_message(source_path, raw_message, args.source_device))
            except Exception as exc:
                errors.append({"source_path": str(source_path), "error": repr(exc)})
            if idx % 250 == 0:
                print(f"parsed {idx} mail files...", file=sys.stderr)
    except PermissionError as exc:
        print(
            "Permission denied while reading Mail.app data. Grant Full Disk Access to Codex or copy the .mbox package into this workspace, then rerun.",
            file=sys.stderr,
        )
        print(f"Original error: {exc}", file=sys.stderr)
        return 13

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "payload_messages.json").write_text(json.dumps(messages, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "parse_errors.json").write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = summarize(messages)
    summary["parse_errors"] = len(errors)
    (out_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    sql_files = write_sql_batches(messages, out_dir / "sql_batches", mailbox_path, args.source_device, args.batch_size)

    print(json.dumps({**summary, "sql_batches": len(sql_files), "out_dir": str(out_dir)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
