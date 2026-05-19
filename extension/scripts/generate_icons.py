"""Generate extension icons. Run: python extension/scripts/generate_icons.py"""

from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Install Pillow first: pip install pillow")
    raise

ASSETS = Path(__file__).resolve().parent.parent / "assets"
ASSETS.mkdir(exist_ok=True)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size), "#0a0a0a")
    draw = ImageDraw.Draw(img)
    margin = max(2, size // 8)
    draw.rectangle(
        [margin, margin, size - margin, size - margin],
        outline="#ffffff",
        width=max(1, size // 16),
    )
    font_size = max(8, size // 2)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except OSError:
        font = ImageFont.load_default()
    text = "S"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - tw) / 2, (size - th) / 2 - 1),
        text,
        fill="#ffffff",
        font=font,
    )
    return img


for s in (16, 48, 128):
    draw_icon(s).save(ASSETS / f"icon{s}.png")
    print(f"Wrote icon{s}.png")
