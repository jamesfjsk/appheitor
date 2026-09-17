"""Held pickaxe: the backpack 32x32 sprite, rotated into the shoulder."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHAR = ROOT / "public" / "assets" / "village" / "char"
ITEMS = ROOT / "public" / "assets" / "village" / "items"
PREV = ROOT / "docs" / "exemplos" / "telas" / "cena-v2" / "tmp-arena" / "look-shots"
PREV.mkdir(parents=True, exist_ok=True)
SIZE = 64
ANGLE = -48
HEIGHT = 16
OX, OY = 43, 8

iso = Image.open(CHAR / "miner-iso.png").convert("RGBA")
iso_px = iso.load()

ITEM_FILES = {
    "wood": "pickaxe-madeira.png",
    "stone": "pickaxe-pedra.png",
    "iron": "pickaxe-ferro.png",
    "gold": "pickaxe-ouro.png",
    "diamond": "diamond-pickaxe.png",
}

FIST = {
    (21, 32): (207, 176, 137),
    (20, 33): (119, 61, 33),
    (18, 33): (119, 61, 33),
    (17, 33): (65, 41, 23),
    (18, 34): (65, 41, 23),
    (21, 33): (22, 16, 11),
}


def helmet(x, y):
    r, g, b, a = iso_px[x, y]
    if a < 16:
        return False
    return r > 150 and g > 110 and b < 90 and r + g > b * 3


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


def crop_opaque(im: Image.Image) -> Image.Image:
    bbox = im.split()[-1].getbbox()
    return im.crop(bbox) if bbox else im


def palette_of(im: Image.Image):
    cols = []
    for r, g, b, a in im.getdata():
        if a >= 16:
            cols.append((r, g, b))
    return list(dict.fromkeys(cols))


def nearest(rgb, pal):
    r, g, b = rgb
    best, dist = pal[0], 10**9
    for pr, pg, pb in pal:
        d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
        if d < dist:
            best, dist = (pr, pg, pb), d
    return best


def snap(im: Image.Image, pal, thr=96) -> Image.Image:
    out = im.copy()
    p = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if a < thr:
                p[x, y] = (0, 0, 0, 0)
            else:
                nr, ng, nb = nearest((r, g, b), pal)
                p[x, y] = (nr, ng, nb, 255)
    return out


def item_to_held(item: Image.Image) -> Image.Image:
    pal = palette_of(item)
    head = crop_opaque(item.crop((0, 0, 32, 16)))
    big = head.resize((head.width * 8, head.height * 8), Image.NEAREST)
    rot = big.rotate(ANGLE, resample=Image.BICUBIC, expand=True, fillcolor=(0, 0, 0, 0))
    rot = snap(crop_opaque(snap(rot, pal)), pal)
    rot = crop_opaque(rot)
    f = HEIGHT / rot.height
    nw, nh = max(1, round(rot.width * f)), HEIGHT
    return rot.resize((nw, nh), Image.NEAREST)


def paint(item: Image.Image) -> Image.Image:
    held = item_to_held(item)
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    lp = layer.load()
    hp = held.load()
    for y in range(held.height):
        for x in range(held.width):
            r, g, b, a = hp[x, y]
            if a < 16:
                continue
            gx, gy = OX + x, OY + y
            if not (0 <= gx < SIZE and 0 <= gy < SIZE):
                continue
            if gx < 42 or gy < 7 or gy > 28:
                continue
            if helmet(gx, gy) and not (gx >= 44 and 12 <= gy <= 20):
                continue
            lp[gx, gy] = (r, g, b, 255)
    for (x, y), rgb in FIST.items():
        lp[x, y] = (*rgb, 255)
    return layer


def erase_stock(im: Image.Image) -> Image.Image:
    out = im.copy()
    p = out.load()
    for y in range(11, 27):
        for x in range(44, SIZE):
            r, g, b, a = p[x, y]
            if is_stock_pick(r, g, b, a, x, y):
                p[x, y] = (0, 0, 0, 0)
    return out


def main():
    base = erase_stock(iso)
    for name, fname in ITEM_FILES.items():
        item = Image.open(ITEMS / fname).convert("RGBA")
        layer = paint(item)
        dest = CHAR / f"pick-{name}.png"
        layer.save(dest)
        preview = base.copy()
        preview.alpha_composite(layer)
        preview.save(PREV / f"pick-{name}.png")
        preview.resize((256, 256), Image.NEAREST).save(PREV / f"pick-{name}-4x.png")
        n = sum(1 for p in layer.getdata() if p[3] > 16)
        print(name, dest.name, n, "held", item_to_held(item).size)


if __name__ == "__main__":
    main()
