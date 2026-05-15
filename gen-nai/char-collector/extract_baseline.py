"""기존 NovelAI.xlsx 태그작품 시트에서 캐릭터 749개를
(작품명, 한글명, 영문태그) 3컬럼으로 추출하여 baseline.json 저장.
"""
import json
import openpyxl
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "docs" / "NovelAI.xlsx"
OUT = Path(__file__).resolve().parent / "raw" / "baseline.json"
OUT.parent.mkdir(parents=True, exist_ok=True)

wb = openpyxl.load_workbook(XLSX, data_only=True)
ws = wb["태그작품"]

rows = []
for row in ws.iter_rows(min_row=2, values_only=True):
    c1, c2, name, tag, nsfw = row
    if c1 != "캐릭터":
        continue
    if not tag or not name:
        continue
    work = (c2 or "").strip()
    kor = str(name).strip()
    eng = str(tag).strip()
    if not work or not kor or not eng:
        continue
    rows.append({"work": work, "kor": kor, "eng": eng})

OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"baseline rows: {len(rows)} → {OUT}")
