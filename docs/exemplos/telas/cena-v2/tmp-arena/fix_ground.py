"""Remove campinho field/fence from the map; strip grass pads from building sprites."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(r"c:\Users\Nobody\Downloads\Samsonite\appheitor")
BACKDROP = ROOT / "public/assets/village/scene/backdrop-day.png"
BUILDINGS = ROOT / "public/assets/village/buildings"
PREVIEW = ROOT / "docs/exemplos/telas/cena-v2/tmp-arena/field-lawn-preview.png"


def is_water(r: int, g: int, b: int) -> bool:
    return b > 135 and b > g + 10 and b > r + 18


def is_wood(r: int, g: int, b: int) -> bool:
    return r > 88 and 48 < g < 150 and b < 90 and r > g + 8 and r > b + 25


def is_grass(r: int, g: int, b: int) -> bool:
    return g > 78 and g >= r - 8 and g > b + 4 and r < 175 and not is_wood(r, g, b)


def fill_field(im: Image.Image) -> None:
    px = im.load()
    w, h = im.size
    x0, y0, x1, y1 = 930, 310, 1120, 480
    src = im.crop((822, 302, 930, 410))
    tw, th = src.size
    sp = src.load()

    for y in range(y0, y1):
        row_off = ((y - y0) // th % 2) * (tw // 2)
        sy = (y - y0) % th
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            if is_water(r, g, b):
                continue
            sx = (x - x0 + row_off) % tw
            px[x, y] = sp[sx, sy]

    for y in range(y0 - 4, y1 + 4):
        for x in range(x0 - 4, min(x1 + 10, w)):
            r, g, b, a = px[x, y]
            if is_water(r, g, b):
                continue
            if is_wood(r, g, b):
                sx = (x - x0) % tw
                sy = (y - y0) % th
                px[x, y] = sp[max(0, min(tw - 1, sx)), max(0, min(th - 1, sy))]


def punch_ground(path: Path, punch_dirt: bool) -> None:
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            grass = g > 78 and g > r + 12 and g > b + 8
            dirt = (
                punch_dirt
                and y > int(h * 0.40)
                and r > 88
                and g > 68
                and b < g
                and (r - b) > 18
                and abs(r - g) < 52
                and g < 175
                and r < 210
            )
            if grass or dirt:
                px[x, y] = (0, 0, 0, 0)

    bbox = im.getbbox()
    if not bbox:
        return
    crop = im.crop(bbox)
    cw, ch = crop.size
    side = max(cw, ch) + 4
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.paste(crop, ((side - cw) // 2, side - ch - 1), crop)
    out.save(path)


def main() -> None:
    im = Image.open(BACKDROP).convert("RGBA")
    fill_field(im)
    im.save(BACKDROP)
    im.crop((860, 280, 1180, 520)).save(PREVIEW)
    print("ok", PREVIEW.exists())


if __name__ == "__main__":
    main()
