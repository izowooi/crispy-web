#!/usr/bin/env python3
"""Crop per-frame PNGs to their trim bbox and emit sprites/<color>/index.json.

Foot anchor convention (see PROGRESS.md):
  The original SWF dudie sprite registers with the foot at the
  sprite-bottom-centre of the ORIGINAL untrimmed canvas. So in the cropped
  image, the foot anchor is:
    footX = (origW / 2) - trimX
    footY = origH - trimY
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from PIL import Image

ROOT = Path("/Users/jongwoopark/Downloads/temp/porting-web/snow-craft/approach-4-faithful-port")
INVENTORY = ROOT / "sprite_inventory.json"
LABELS = ROOT / "sprite_labels.json"
SRC_DIRS = {
    "red": ROOT / "decompiled/sprites/DefineSprite_32_reddudie",
    "green": ROOT / "decompiled/sprites/DefineSprite_69_greendudie",
}
OUT_BASE = ROOT / "web/public/assets/sprites"


def crop_color(color: str, frames: list[dict], labels_color: dict) -> dict:
    src_dir = SRC_DIRS[color]
    out_dir = OUT_BASE / color
    out_dir.mkdir(parents=True, exist_ok=True)
    out_frames = []
    for entry in frames:
        frame = entry["frame"]
        orig_w, orig_h = entry["size"]
        trim = entry["trim"]
        tx, ty, tw, th = trim["x"], trim["y"], trim["w"], trim["h"]
        src_path = src_dir / f"{frame}.png"
        with Image.open(src_path) as im:
            if im.mode != "RGBA":
                im = im.convert("RGBA")
            assert im.size == (orig_w, orig_h), (
                f"size mismatch for {src_path}: PIL={im.size} inventory=({orig_w},{orig_h})"
            )
            cropped = im.crop((tx, ty, tx + tw, ty + th))
        dst_path = out_dir / f"{frame}.png"
        cropped.save(dst_path, format="PNG", optimize=True)
        foot_x = (orig_w / 2) - tx
        foot_y = orig_h - ty
        out_frames.append({
            "frame": frame,
            "path": f"sprites/{color}/{frame}.png",
            "footX": foot_x,
            "footY": foot_y,
            "w": tw,
            "h": th,
        })

    labels_clean = {k: v for k, v in labels_color.items() if not k.startswith("_")}

    index = {"frames": out_frames, "labels": labels_clean}
    (out_dir / "index.json").write_text(json.dumps(index, indent=2))
    return index


def main() -> int:
    inventory = json.loads(INVENTORY.read_text())
    labels = json.loads(LABELS.read_text())

    summary = {}
    for color in ("red", "green"):
        idx = crop_color(color, inventory[color], labels[color])
        summary[color] = {"frames": len(idx["frames"])}
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
