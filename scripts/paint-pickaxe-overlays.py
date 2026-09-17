"""Held pickaxe: original skinny pick pose, backpack item palettes."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHAR = ROOT / "public" / "assets" / "village" / "char"
PREV = ROOT / "docs" / "exemplos" / "telas" / "cena-v2" / "tmp-arena" / "look-shots"
PREV.mkdir(parents=True, exist_ok=True)
SIZE = 64

iso = Image.open(CHAR / "miner-iso.png").convert("RGBA")
iso_px = iso.load()

# sampled from the backpack 32x32 items
MAT = {
    "wood": {
        "o": (29, 21, 16),
        "d": (72, 47, 26),
        "m": (112, 79, 52),
        "l": (157, 119, 84),
        "s": (212, 186, 150),
        "h": (132, 98, 66),
        "b": (56, 36, 20),
    },
    "stone": {
        "o": (12, 11, 11),
        "d": (66, 67, 71),
        "m": (88, 90, 95),
        "l": (140, 143, 156),
        "s": (226, 225, 244),
        "h": (119, 61, 33),
        "b": (56, 36, 20),
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
        "h": (164, 98, 44),
        "b": (71, 41, 5),
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

WOOD_H = {
    "o": (22, 16, 11),
    "d": (65, 41, 23),
    "m": (119, 61, 33),
    "l": (207, 176, 137),
    "h": (132, 98, 66),
    "b": (56, 36, 20),
}

FIST = {
    (21, 32): "l",
    (20, 33): "m",
    (18, 33): "m",
    (17, 33): "d",
    (18, 34): "d",
    (21, 33): "o",
}

# skinny pick point UP (not a T-bar) + wood bind on the neck + tip
EXTRA = {
    "wood": [
        (48, 10, "l"),
        (49, 10, "o"),
        (48, 11, "s"),
        (47, 14, "s"),
        (46, 15, "h"),
        (46, 16, "h"),
        (47, 16, "b"),
        (46, 17, "h"),
        (48, 16, "l"),
        (49, 18, "s"),
        (50, 20, "l"),
        (51, 22, "m"),
        (52, 24, "s"),
        (53, 25, "o"),
    ],
    "stone": [
        (48, 10, "s"),
        (49, 10, "o"),
        (48, 11, "l"),
        (46, 16, "h"),
        (47, 16, "b"),
        (51, 20, "l"),
        (52, 24, "s"),
        (53, 25, "o"),
    ],
    "iron": [
        (48, 10, "s"),
        (49, 10, "l"),
        (50, 10, "o"),
        (48, 11, "s"),
        (46, 16, "h"),
        (47, 16, "b"),
        (50, 17, "s"),
        (51, 19, "l"),
        (52, 22, "s"),
        (52, 24, "s"),
        (53, 25, "o"),
    ],
    "gold": [
        (48, 10, "s"),
        (49, 10, "l"),
        (50, 10, "o"),
        (48, 11, "s"),
        (47, 13, "s"),
        (46, 16, "h"),
        (47, 16, "b"),
        (50, 17, "s"),
        (51, 19, "s"),
        (52, 21, "l"),
        (52, 24, "s"),
        (53, 24, "o"),
        (53, 25, "o"),
    ],
    "diamond": [
        (48, 10, "s"),
        (49, 10, "s"),
        (50, 10, "o"),
        (48, 11, "s"),
        (47, 13, "s"),
        (48, 14, "s"),
        (46, 16, "h"),
        (47, 16, "b"),
        (50, 17, "s"),
        (51, 18, "s"),
        (52, 20, "l"),
        (52, 22, "s"),
        (52, 24, "s"),
        (53, 24, "o"),
        (53, 25, "o"),
    ],
}


def helmet(x, y):
    r, g, b, a = iso_px[x, y]
    if a < 16:
        return False
    return r > 150 and g > 110 and b < 90 and r + g > b * 3


def brim(x, y):
    return x >= 45 and 14 <= y <= 18


def is_stock_pick(r, g, b, a, x, y):
    if a < 16 or x < 44 or y < 11 or y > 26:
        return False
    if helmet(x, y):
        return False
    gray = abs(r - g) < 32 and abs(g - b) < 32
    if not gray:
        return False
    if r < 24:
        return True
    return r > 68 and r < 220 and b > 80


def spine_key(x, y, r):
    if r < 24:
        return "o"
    expected = 11 + (14 / 8) * (x - 44)
    side = y - expected
    if side < -1.1:
        return "s" if r > 170 else "l"
    if side < 0.4:
        return "l" if r > 150 else "m"
    if side < 1.6:
        return "m" if r > 120 else "d"
    return "d"


def put(px, x, y, rgb):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        px[x, y] = (*rgb, 255)


def paint(name: str) -> Image.Image:
    pal = MAT[name]
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    px = im.load()

    def stamp(x, y, key):
        if not (0 <= x < SIZE and 0 <= y < SIZE):
            return
        if helmet(x, y) and not brim(x, y):
            return
        if key in ("h", "b"):
            put(px, x, y, WOOD_H[key] if name != "wood" else pal[key])
        else:
            put(px, x, y, pal[key])

    for y in range(11, 27):
        for x in range(44, SIZE):
            r, g, b, a = iso_px[x, y]
            if not is_stock_pick(r, g, b, a, x, y):
                continue
            stamp(x, y, spine_key(x, y, r))

    for x, y, key in EXTRA[name]:
        stamp(x, y, key)

    for (x, y), key in FIST.items():
        put(px, x, y, WOOD_H[key])

    return im


def erase_stock(im: Image.Image) -> Image.Image:
    out = im.copy()
    p = out.load()
    for y in range(11, 27):
        for x in range(44, SIZE):
            r, g, b, a = p[x, y]
            if is_stock_pick(r, g, b, a, x, y):
                p[x, y] = (0, 0, 0, 0)
    return out


def recolor_wood_item():
    """Minecraft wood pickaxe head is gray; paint it oak so the slot reads as wood."""
    dest = ROOT / "public" / "assets" / "village" / "items" / "pickaxe-madeira.png"
    im = Image.open(dest).convert("RGBA")
    px = im.load()
    oak = [
        (86, 54, 28),
        (112, 79, 52),
        (132, 90, 48),
        (157, 119, 84),
        (176, 128, 78),
        (212, 186, 150),
    ]
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                continue
            if r + g + b < 90:
                continue
            already_wood = r > g + 18 and r > 70 and b < 110
            gray = abs(r - g) < 45 and abs(g - b) < 50
            pink = r > 140 and g > 90 and b > 110 and r > b - 40
            if not (gray or pink) and already_wood:
                continue
            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
            idx = min(len(oak) - 1, max(0, int(lum * len(oak))))
            px[x, y] = (*oak[idx], 255)
    im.save(dest)
    im.resize((128, 128), Image.NEAREST).save(PREV / "item-wood-4x.png")
    print("item", dest.name)


def main():
    recolor_wood_item()
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
