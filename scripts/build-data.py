#!/usr/bin/env python3
import re, json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
entries_dir = root / "entries"
out_path = root / "data" / "data.json"
out_path.parent.mkdir(parents=True, exist_ok=True)

date_re = re.compile(r"^\d{4}-\d{2}-\d{2}\.md$")
fm_re = re.compile(r"^---\s*(.*?)\s*---", re.DOTALL)
val_line_re = re.compile(r"^value\s*:\s*([+-]?\d+(?:\.\d+)?)\s*$", re.IGNORECASE)

data = {}
if entries_dir.exists():
    for p in sorted(entries_dir.glob("*.md")):
        if not date_re.match(p.name):
            continue
        date = p.stem  # YYYY-MM-DD
        txt = p.read_text(encoding="utf-8", errors="ignore")

        val = None
        # 1) YAMLフロントマターから value を探す
        m = fm_re.match(txt.strip())
        if m:
            for line in m.group(1).splitlines():
                ml = val_line_re.match(line.strip())
                if ml:
                    val = float(ml.group(1))
                    break
        # 2) 見つからなければ先頭数行の "value: ..."
        if val is None:
            for line in txt.splitlines()[:5]:
                ml = val_line_re.match(line.strip())
                if ml:
                    val = float(ml.group(1))
                    break

        if val is None:
            val = 0
        data[date] = int(val) if float(val).is_integer() else float(val)

with out_path.open("w", encoding="utf-8") as f:
    json.dump(dict(sorted(data.items())), f, ensure_ascii=False, indent=2)

print(f"written: {out_path}")
