"""In-hand pickaxe: clean T-head on the shoulder, item palettes, black outline."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHAR = ROOT / "public" / "assets" / "village" / "char"
PREV = ROOT / "docs" / "exemplos" / "telas" / "cena-v2" / "tmp-arena" / "look-shots"
PREV.mkdir(parents=True, exist_ok=True)
SIZE = 64

iso = Image.open(CHAR / "miner-iso.png").convert("RGBA")
iso_px = iso.load()

# sampled from the inventory sprites: outline, dark, mid, lite, shine, handle, bind
MAT = {
    "wood": {
        "o": (29, 25, 32),
        "d": (86, 58, 34),
        "m": (112, 79, 52),
        "l": (150, 108, 70),
        "s": (196, 154, 104),
        "h": (112, 79, 52),
        "b": (72, 48, 28),
    },
    "stone": {
        "o": (12, 11, 11),
        "d": (66, 67, 71),
        "m": (88, 90, 95),
        "l": (140, 143, 156),
        "s": (226, 225, 244),
        "h": (119, 61, 33),
        "b": (72, 48, 28),
    },
    "iron": {
        "o": (13, 10, 12),
        "d": (82, 82, 80),
        "m": (165, 171, 173),
        "l": (210, 214, 216),
        "s": (252, 252, 252),
        "h": (119, 61, 33),
        "b": (86, 86, 84),
    },
    "gold": {
        "o": (10, 7, 4),
        "d": (85, 51, 8),
        "m": (204, 150, 5),
        "l": (254, 217, 93),
        "s": (252, 251, 248),
        "h": (119, 61, 33),
        "b": (85, 51, 8),
    },
    "diamond": {
        "o": (11, 11, 9),
        "d": (30, 105, 98),
        "m": (27, 100, 93),
        "l": (63, 244, 249),
        "s": (220, 252, 249),
        "h": (109, 76, 45),
        "b": (22, 16, 11),
    },
}

# rows at y=12, x starts at 47. . empty
# o outline  d dark  m mid  l lite  s shine  h handle  b bind
BASE = [
    "  oslso",
    " olslmo",
    "homldo",
    "hhbdo",
    "hhbml o",
    " hbmlo",
    "  omlo",
    "  omdo",
    "   mldo",
    "   mdo",
    "    do",
    "    o",
]

EXTRA = {
    "wood": [],
    "stone": [
        (6, 1, "d"),
        (6, 8, "l"),
    ],
    "iron": [
        (6, 0, "s"),
        (6, 1, "l"),
        (7, 8, "s"),
        (6, 9, "l"),
    ],
    "gold": [
        (6, 0, "s"),
        (7, 1, "l"),
        (6, 2, "d"),
        (7, 8, "s"),
        (7, 9, "l"),
        (6, 10, "m"),
    ],
    "diamond": [
        (6, 0, "s"),
        (6, 1, "l"),
        (7, 1, "s"),
        (6, 2, "m"),
        (5, 3, "l"),
        (6, 7, "l"),
        (7, 8, "s"),
        (7, 9, "l"),
        (6, 10, "m"),
        (5, 11, "d"),
    ],
}

SPARK = {
    "wood": [],
    "stone": [],
    "iron": [(5, 0)],
    "gold": [(6, 0), (4, 2)],
    "diamond": [(6, 0), (7, 8)],
}

# fist handle — same wood as the item handles
FIST = {
    (21, 32): "l",
    (20, 33): "m",
    (18, 33): "m",
    (17, 33): "d",
    (18, 34): "d",
    (21, 33): "o",
}


def helmet(x, y):
    r, g, b, a = iso_px[x, y]
    if a < 16:
        return False
    return r > 150 and g > 110 and b < 90 and r + g > b * 3


def brim(x, y):
    return x >= 45 and y >= 14 and y <= 18


def put(px, x, y, rgb):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        px[x, y] = (*rgb, 255)


def paint(name: str) -> Image.Image:
    pal = MAT[name]
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = im.load()
    ox, oy = 46, 12
    filled = {}

    def stamp(x, y, key):
        if not (0 <= x < SIZE and 0 <= y < SIZE):
            return
        if helmet(x, y) and not brim(x, y):
            return
        put(px, x, y, pal[key])
        filled[(x, y)] = key

    for iy, row in enumerate(BASE):
        for ix, ch in enumerate(row):
            if ch == " ":
                continue
            stamp(ox + ix, oy + iy, ch)

    for ix, iy, key in EXTRA[name]:
        stamp(ox + ix, oy + iy, key)

    for ix, iy in SPARK[name]:
        stamp(ox + ix, oy + iy, "s")

    # outline empty neighbors (not into the helmet)
    for (x, y) in list(filled):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) in filled:
                continue
            if nx < 44 or ny < 11 or ny > 27:
                continue
            if helmet(nx, ny) and not brim(nx, ny):
                continue
            stamp(nx, ny, "o")

    wood_h = {
        "o": (22, 16, 11),
        "d": (86, 48, 24),
        "m": (119, 61, 33),
        "l": (158, 96, 52),
        "h": (119, 61, 33),
    }
    for (x, y), key in FIST.items():
        put(px, x, y, wood_h.get(key, wood_h["m"]))

    return im


def erase_stock(im: Image.Image) -> Image.Image:
    out = im.copy()
    p = out.load()
    for y in range(11, 28):
        for x in range(44, SIZE):
            r, g, b, a = p[x, y]
            if a < 16:
                continue
            if helmet(x, y):
                continue
            gray = abs(r - g) < 32 and abs(g - b) < 32
            if gray and r < 220 and (r > 68 or r < 22):
                p[x, y] = (0, 0, 0, 0)
    return out


def main():
    base = erase_stock(iso)
    for name in MAT:
        layer = paint(name)
        dest = CHAR / f"pick-{name}.png"
        layer.save(dest)
        preview = base.copy()
        preview.alpha_composite(layer)
        preview.save(PREV / f"pick-{name}.png")
        preview.resize((256, 256), Image.NEAREST).save(PREV / f"pick-{name}-4x.png")
        n = sum(1 for p in layer.getdata() if p[3] > 16)
        print(name, dest.name, n)


if __name__ == "__main__":
    main()
