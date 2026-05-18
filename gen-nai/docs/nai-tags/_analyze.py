"""79개 스타일 프롬프트 토큰화 + 빈도 분석.
출력:
  - quality_tokens.txt : 긍정 프롬프트에서 자주 등장하는 비-작가 토큰 (퀄리티/스타일/컴포지션)
  - negative_tokens.txt: 부정 프롬프트에서 자주 등장하는 토큰
"""
import json, re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
data = json.load(open(ROOT / "artists.json", encoding="utf-8"))
print(f"loaded {len(data)} styles")

# 토큰 분리: ::로 감싸진 가중치 블록 안의 각 토큰을 분리
# 형태: <weight>:: tag1, tag2, ... ::,
WEIGHT_BLOCK = re.compile(r"(-?\d+(?:\.\d+)?)\s*::\s*(.+?)\s*::", re.S)
ARTIST_PREFIX = re.compile(r"^artist\s*:\s*", re.I)

def split_tokens(text: str):
    """Returns list of (weight, [tags...]) — also includes weightless toks at depth 0."""
    out = []
    pos = 0
    for m in WEIGHT_BLOCK.finditer(text):
        # bare tokens before this block
        bare = text[pos:m.start()]
        bare_tags = [t.strip() for t in re.split(r"[,]", bare) if t.strip()]
        if bare_tags:
            out.append((None, bare_tags))
        weight = float(m.group(1))
        inner = m.group(2)
        tags = [t.strip() for t in re.split(r"[,]", inner) if t.strip()]
        out.append((weight, tags))
        pos = m.end()
    # tail
    bare = text[pos:]
    bare_tags = [t.strip() for t in re.split(r"[,]", bare) if t.strip()]
    if bare_tags:
        out.append((None, bare_tags))
    return out

def is_artist_tag(t: str) -> bool:
    return bool(ARTIST_PREFIX.match(t))

pos_tokens = Counter()   # 비-작가 긍정 토큰
neg_tokens = Counter()
for s in data:
    sp = s.get("style_prompt") or ""
    np = s.get("negative_prompt") or ""
    for weight, tags in split_tokens(sp):
        for t in tags:
            if is_artist_tag(t): continue
            # weight 가 -1 같은 음수는 사실 부정 프롬프트에 가까움 — skip for pos
            if weight is not None and weight < 0: continue
            pos_tokens[t.lower()] += 1
    for weight, tags in split_tokens(np):
        for t in tags:
            if is_artist_tag(t): continue
            neg_tokens[t.lower()] += 1

print()
print(f"=== TOP 100 비-작가 긍정 토큰 (79개 중 등장 횟수) ===")
for tok, n in pos_tokens.most_common(100):
    print(f"{n:3d}  {tok}")

print()
print(f"=== TOP 100 부정 토큰 ===")
for tok, n in neg_tokens.most_common(100):
    print(f"{n:3d}  {tok}")

# save
(ROOT / "quality_tokens.txt").write_text(
    "\n".join(f"{n}\t{tok}" for tok, n in pos_tokens.most_common(200)),
    encoding="utf-8",
)
(ROOT / "negative_tokens.txt").write_text(
    "\n".join(f"{n}\t{tok}" for tok, n in neg_tokens.most_common(200)),
    encoding="utf-8",
)
print()
print("saved → quality_tokens.txt, negative_tokens.txt")
