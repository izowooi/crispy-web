"""PWA 아이콘과 iOS 시작 화면(splash)을 docs/brand/icon-master.png 한 장에서 만든다.

    python3 scripts/generate-pwa-assets.py      # Pillow 필요: pip install pillow

마스터 이미지는 Codex CLI의 이미지 생성으로 그렸다(전체를 채우는 불투명 정사각형, 그림은 중앙 70% 안).
생성물(public/icons, public/splash, src/app/apple-icon.png)은 저장소에 커밋되어 있어 평소엔 다시 만들 필요가 없다.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
MASTER = Image.open(ROOT / "docs/brand/icon-master.png").convert("RGB")
BACKGROUND = (247, 247, 239)  # #f7f7ef, manifest의 background_color와 같아야 한다

# 같은 그림을 쓰는 이유: maskable은 중앙 80% 안전 영역 안에 그림이 있어야 하고,
# 마스터의 그림은 중앙 60%에 모여 있어서 any/maskable 모두 잘리지 않는다.
ICONS = {
    "public/icons/icon-192.png": 192,
    "public/icons/icon-512.png": 512,
    "public/icons/icon-maskable-512.png": 512,
    "src/app/apple-icon.png": 180,  # iOS는 투명 영역을 검게 채우므로 반드시 불투명
}

# (가로, 세로) CSS px, 배율. iOS는 기기 화면에 정확히 맞는 시작 이미지만 쓴다.
# src/lib/pwa.ts의 SPLASH_SCREENS와 같은 목록이어야 한다.
SPLASH = [
    (440, 956, 3), (402, 874, 3), (430, 932, 3), (393, 852, 3), (390, 844, 3),
    (375, 812, 3), (414, 896, 3), (414, 896, 2), (414, 736, 3), (375, 667, 2),
    (834, 1194, 2), (834, 1112, 2), (820, 1180, 2), (810, 1080, 2), (768, 1024, 2), (744, 1133, 2), (1024, 1366, 2),
]


def rounded(image: Image.Image, size: int) -> Image.Image:
    icon = image.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=size * 4 * 0.22, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(icon, (0, 0), mask.resize((size, size), Image.LANCZOS))
    return out


def main() -> None:
    for rel, size in ICONS.items():
        path = ROOT / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        MASTER.resize((size, size), Image.LANCZOS).save(path, optimize=True)
        print("icon", rel, size)

    for w, h, scale in SPLASH:
        px_w, px_h = w * scale, h * scale
        canvas = Image.new("RGB", (px_w, px_h), BACKGROUND)
        size = round(min(px_w, px_h) * 0.3)
        icon = rounded(MASTER, size)
        canvas.paste(icon, ((px_w - size) // 2, (px_h - size) // 2 - px_h // 20), icon)
        name = f"splash-{px_w}x{px_h}.png"
        canvas.save(ROOT / "public/splash" / name, optimize=True)
        print("splash", name)


if __name__ == "__main__":
    main()
