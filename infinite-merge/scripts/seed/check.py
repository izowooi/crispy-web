"""check.py FILE [--fix]  — validate a seed JSONL against world/names.txt + world/pairs.txt.
Reports how many lines are usable and how many results are NEW names. --fix deletes unusable lines
(cascade: lines whose ingredient only came from a deleted line are deleted too) and prints dropped names."""
import json, sys, os, unicodedata
here = os.path.dirname(os.path.abspath(__file__))
norm = lambda s: unicodedata.normalize("NFC", str(s or "")).strip()
world = set(norm(l) for l in open(os.path.join(here, "world/names.txt")) if l.strip())
taken = set(l.strip() for l in open(os.path.join(here, "world/pairs.txt")) if l.strip())
path = sys.argv[1]; fix = "--fix" in sys.argv
have = set(world); seen = set(); keep = []; drops = []; newn = 0; alt = 0
for i, line in enumerate(open(path, encoding="utf8"), 1):
    if not line.strip(): continue
    try:
        d = json.loads(line); a, b, n = norm(d["a"]), norm(d["b"]), norm(d["name"])
    except Exception:
        drops.append((i, "bad-json", line[:40])); continue
    key = "+".join(sorted([a, b]))
    why = None
    if a not in have: why = f"재료 없음: {a}"
    elif b not in have: why = f"재료 없음: {b}"
    elif key in taken: why = f"이미 있는 조합: {key}"
    elif key in seen: why = f"파일 안 중복 조합: {key}"
    elif not (1 <= len(n) <= 12): why = f"이름 길이: {n}"
    elif n.replace(" ", "") in (a + b, b + a): why = f"재료 두 이름을 그대로 붙인 이름: {n}"
    elif " " in n and any(w in (a, b) or w in a or w in b for w in n.split(" ")): why = f"재료를 이어 붙인 띄어쓰기 이름: {n}"
    if why:
        drops.append((i, why, n)); continue
    seen.add(key); keep.append(line)
    if n in have: alt += 1
    else: newn += 1; have.add(n)
total = len(keep) + len(drops)
print(f"줄 {total} · 사용 가능 {len(keep)} · 새 이름 {newn} · 기존 이름으로 가는 대체 레시피 {alt} · 버려짐 {len(drops)}")
for i, why, n in drops[:30]: print(f"  {i}행 {why} (결과 {n})")
if fix and drops:
    open(path, "w", encoding="utf8").writelines(keep)
    print(f"--fix: {len(drops)}줄 삭제. 아래 이름은 이제 없으니 필요하면 다른 조합으로 다시 만들 것:")
    print("  " + ", ".join(sorted({n for _, _, n in drops if n not in have})[:80]))
