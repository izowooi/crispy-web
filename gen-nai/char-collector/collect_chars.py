# -*- coding: utf-8 -*-
"""기존 NovelAI.xlsx 캐릭터 + Tier A/B/C 신규 데이터를 병합하여
docs/NovelAI_Characters.csv (UTF-8 BOM, 3컬럼) 출력.

컬럼: 작품명, 캐릭터 한글명, 캐릭터 영문 프롬프트
출처: Danbooru 공식 태그 (safebooru wiki와 동일한 표기)
"""
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HERE = Path(__file__).resolve().parent

# Make script imports work when run from anywhere
sys.path.insert(0, str(HERE))
from data_tier_a import TIER_A
from data_tier_bc import TIER_B, TIER_C

BASELINE_JSON = HERE / "raw" / "baseline.json"
OUT_CSV = ROOT / "docs" / "NovelAI_Characters.csv"

HEADER = ["작품명", "캐릭터 한글명", "캐릭터 영문 프롬프트"]


def normalize_tag(tag: str) -> str:
    """Danbooru 태그 정규화 — 비교용 키."""
    t = tag.strip().lower()
    # 첫 토큰만 (콤마로 여러개 적힌 경우)
    if "," in t:
        t = t.split(",")[0].strip()
    # 공백을 언더스코어로
    t = re.sub(r"\s+", "_", t)
    return t


# 작품명 정규화 — 대소문자/표기 차이를 흡수
WORK_ALIASES = {
    "fate/grand order": "Fate/Grand Order",
    "fate/grand Order": "Fate/Grand Order",
    "Fate/Grand order": "Fate/Grand Order",
    "fate/stay night": "Fate/stay night",
    "fate/stay_night": "Fate/stay night",
    "Fate/stay_night": "Fate/stay night",
    "마법소녀 마도카☆마기카": "마법소녀 마도카 마기카",
    "마법소녀 마도카 마기카": "마법소녀 마도카 마기카",
    "케이온!": "K-On!",
    "K-On": "K-On!",
    "k-on!": "K-On!",
}


def normalize_work(name: str) -> str:
    n = (name or "").strip()
    if not n:
        return n
    return WORK_ALIASES.get(n, WORK_ALIASES.get(n.lower(), n))


def baseline_rows():
    rows = json.loads(BASELINE_JSON.read_text(encoding="utf-8"))
    out = []
    for r in rows:
        work = normalize_work(r["work"])
        out.append((work, r["kor"].strip(), r["eng"].strip()))
    return out


def new_rows():
    out = []
    for table in (TIER_A, TIER_B, TIER_C):
        for work, chars in table.items():
            work = normalize_work(work)
            for entry in chars:
                if not isinstance(entry, tuple) or len(entry) != 2:
                    continue
                kor, eng = entry
                if not kor or not eng:
                    continue
                out.append((work, kor.strip(), eng.strip()))
    return out


def merge_and_dedupe(rows):
    """1차: (작품, 영문태그) 기준 중복 제거. baseline 우선.
    2차: (작품, 한글명) 기준 중복 제거 — 같은 한글명에 서로 다른 영문 태그가
        매핑된 경우 한 개만 유지 (먼저 등록된 것 우선).
        같은 캐릭터의 alias/costume variant까지 함께 들어가 있던 케이스 정리.
    """
    seen_tag = set()
    pass1 = []
    for work, kor, eng in rows:
        key = (work, normalize_tag(eng))
        if key in seen_tag:
            continue
        seen_tag.add(key)
        pass1.append((work, kor, eng))

    seen_kor = set()
    pass2 = []
    for work, kor, eng in pass1:
        key = (work, kor.strip())
        if key in seen_kor:
            continue
        seen_kor.add(key)
        pass2.append((work, kor, eng))
    return pass2


def korean_sort_key(s: str):
    """작품명/한글명 가나다 정렬을 위한 키. 빈 값은 뒤로."""
    return (s or "", )


def main():
    base = baseline_rows()
    new = new_rows()
    print(f"baseline: {len(base)}")
    print(f"new: {len(new)}")

    combined = base + new
    print(f"combined raw: {len(combined)}")

    deduped = merge_and_dedupe(combined)
    print(f"after dedup: {len(deduped)}")

    # 정렬: 작품명 → 한글명
    deduped.sort(key=lambda x: (x[0], x[1]))

    # CSV 작성 (UTF-8 BOM)
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(HEADER)
        for row in deduped:
            w.writerow(row)

    print(f"wrote: {OUT_CSV}  rows={len(deduped)}  + header")
    print()
    print("=== Top 30 series by character count ===")
    from collections import Counter
    c = Counter(r[0] for r in deduped)
    for k, v in c.most_common(30):
        print(f"  {v:5d}  {k}")

    if len(deduped) < 2000:
        print()
        print(f"!! WARNING: only {len(deduped)} rows, target was 2000+")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
