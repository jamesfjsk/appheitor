"""Extract hat/cape from PixelLab 3/4 sprites and sit them on miner-iso."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHAR = ROOT / "public" / "assets" / "village" / "char"
PREV = ROOT / "docs" / "exemplos" / "telas" / "cena-v2" / "tmp-arena" / "look-shots"
PREV.mkdir(parents=True, exist_ok=True)
SIZE = 64

iso = Image.open(CHAR / "miner-iso.png").convert("RGBA")
base = Image.open(CHAR / "miner-base.png").convert("RGBA")


def lum(r, g, b):
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255


def is_helm(r, g, b):
    return r > 150 and g > 110 and b < 90 and r + g > b * 3


def is_skin(r, g, b):
    if is_helm(r, g, b):
        return False
    return r > 130 and g > 70 and g < 210 and b < 170 and r > b + 10 and r > g - 10


def is_hair(r, g, b):
    if is_helm(r, g, b) or is_skin(r, g, b):
        return False
    return r > 35 and r < 150 and g > 15 and g < 100 and b < 70 and r >= g and r > b + 8


def is_cape_cloth(r, g, b):
    return r > 55 and r >= g + 8 and r >= b and g < 130


def is_cap(r, g, b):
    green = g > 70 and g >= r + 4 and g > b
    visor = r > 150 and 70 < g < 180 and b < 100 and r > g
    return green or visor


def is_iron(r, g, b, y):
    grey = abs(r - g) < 28 and abs(g - b) < 28 and 55 < r < 210
    lamp = y <= 12 and ((r > 180 and g > 140 and b < 110) or (r > 190 and g > 190 and b > 160))
    return grey or lamp


def is_crown(r, g, b):
    gold = r > 150 and g > 70 and b < 140 and r > b + 18 and r >= g - 15
    gem = r > 90 and g < 110 and b < 120 and r > g + 30 and r > b
    return gold or gem


def is_gold(r, g, b):
    return r > 180 and g > 140 and b < 100 and r > b + 30


def is_turf(r, g, b, y):
    return y >= 52 and g > 92 and g >= r and g > b + 10 and r < 210


def blank():
    return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))


def extract_hat(src: Image.Image, kind: str) -> Image.Image:
    out = blank()
    sp, op = src.load(), out.load()
    y_max = 22 if kind != "crown" else 16
    x1 = 42 if kind == "iron" else 46
    for y in range(y_max + 1):
        for x in range(16, x1):
            r, g, b, a = sp[x, y]
            if a < 16 or is_skin(r, g, b) or is_hair(r, g, b):
                continue
            keep = False
            if kind == "cap":
                keep = is_cap(r, g, b)
            elif kind == "iron":
                keep = is_iron(r, g, b, y)
            elif kind == "crown":
                keep = is_crown(r, g, b)
            if keep:
                op[x, y] = (r, g, b, a)
    return out


def extract_cape(src: Image.Image) -> Image.Image:
    out = blank()
    sp, bp, op = src.load(), base.load(), out.load()
    for y in range(18, 54):
        for x in range(0, 40):
            r, g, b, a = sp[x, y]
            if a < 16:
                continue
            if is_helm(r, g, b) or is_skin(r, g, b) or is_turf(r, g, b, y):
                continue
            br, bg, bb, ba = bp[x, y]
            extra = ba < 16
            cloth = is_cape_cloth(r, g, b)
            clasp = is_gold(r, g, b) and 20 <= y <= 30
            if extra and cloth:
                op[x, y] = (r, g, b, a)
            elif cloth and x <= 22:
                op[x, y] = (r, g, b, a)
            elif clasp:
                op[x, y] = (r, g, b, a)
    return out


def bbox(im: Image.Image):
    p = im.load()
    xs, ys = [], []
    for y in range(SIZE):
        for x in range(SIZE):
            if p[x, y][3] >= 16:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return min(xs), min(ys), max(xs), max(ys), sum(xs) / len(xs), sum(ys) / len(ys)


def shift(im: Image.Image, dx: int, dy: int) -> Image.Image:
    out = blank()
    p, o = im.load(), out.load()
    for y in range(SIZE):
        for x in range(SIZE):
            pix = p[x, y]
            if pix[3] < 16:
                continue
            nx, ny = x + dx, y + dy
            if 0 <= nx < SIZE and 0 <= ny < SIZE:
                o[nx, ny] = pix
    return out


def iso_head():
    p = iso.load()
    xs, ys = [], []
    for y in range(22):
        for x in range(16, 48):
            r, g, b, a = p[x, y]
            if a < 16:
                continue
            if is_helm(r, g, b) or (y < 16 and abs(r - g) < 30 and r > 150):
                xs.append(x)
                ys.append(y)
    return sum(xs) / len(xs), sum(ys) / len(ys), min(ys)


def fit_to_helm(layer: Image.Image, target_w: int, top=2) -> Image.Image:
    b = bbox(layer)
    if not b:
        return layer
    crop = layer.crop((b[0], b[1], b[2] + 1, b[3] + 1))
    scale = target_w / crop.size[0]
    nw = max(8, round(crop.size[0] * scale))
    nh = max(6, round(crop.size[1] * scale))
    resized = crop.resize((nw, nh), Image.NEAREST)
    out = blank()
    out.paste(resized, (31 - nw // 2, top), resized)
    return out


def align_cape(layer: Image.Image) -> Image.Image:
    b = bbox(layer)
    if not b:
        return layer
    crop = layer.crop((b[0], b[1], b[2] + 1, b[3] + 1)).transpose(Image.FLIP_LEFT_RIGHT)
    out = blank()
    # Hang from the right shoulder (iso torso ends ~x=37 at y=26).
    x0 = 36
    y0 = 23
    out.paste(crop, (x0, y0), crop)
    p = out.load()
    ip = iso.load()
    mid = (176, 48, 58, 255)
    lite = (208, 64, 72, 255)
    clasp = (232, 185, 53, 255)
    for x in range(24, 40):
        if ip[x, 24][3] < 16:
            continue
        p[x, 24] = lite if x in (24, 39) else mid
        if 26 <= x <= 37:
            p[x, 25] = mid
    p[30, 24] = clasp
    p[31, 24] = clasp
    p[30, 25] = (255, 244, 196, 255)
    return out


def clear_helm(dest: Image.Image) -> Image.Image:
    out = dest.copy()
    p = out.load()
    src = dest.load()
    hair = None
    for y in range(3, 16):
        for x in range(17, 44):
            r, g, b, a = src[x, y]
            if a >= 16 and is_hair(r, g, b):
                hair = (r, g, b, 255)
                break
        if hair:
            break
    if hair is None:
        hair = (48, 32, 20, 255)
    for y in range(0, 16):
        for x in range(16, 46):
            r, g, b, a = p[x, y]
            if a < 16:
                continue
            if x >= 44 and y >= 12:
                continue
            if y >= 14 and is_skin(r, g, b):
                continue
            lamp = r > 190 and g > 190 and b > 150
            if is_helm(r, g, b) or lamp or (y < 14 and r > 140 and g > 100 and b < 120):
                p[x, y] = hair if y >= 8 else (0, 0, 0, 0)
    return out


def stamp(dest: Image.Image, layer: Image.Image, behind=False) -> Image.Image:
    out = dest.copy()
    if behind:
        canvas = blank()
        canvas.paste(layer, (0, 0), layer)
        canvas.paste(out, (0, 0), out)
        return canvas
    out.paste(layer, (0, 0), layer)
    return out


def scale4(im: Image.Image) -> Image.Image:
    return im.resize((256, 256), Image.NEAREST)


hats = {
    "hat-cap": (CHAR / "miner-cap.png", "cap"),
    "hat-iron": (CHAR / "miner-iron-helmet.png", "iron"),
    "hat-crown": (CHAR / "miner-crown.png", "crown"),
}
cape_src = Image.open(CHAR / "miner-cape.png").convert("RGBA")

HAT_FIT = {"cap": 24, "iron": 26, "crown": 20}

print("iso head", iso_head())
aligned = {}
for name, (path, kind) in hats.items():
    raw = extract_hat(Image.open(path).convert("RGBA"), kind)
    fit = fit_to_helm(raw, HAT_FIT[kind], top=1 if kind == "crown" else 2)
    print(name, "raw", bbox(raw), "fit", bbox(fit))
    fit.save(CHAR / f"{name}.png")
    aligned[name] = fit
    scale4(raw).save(PREV / f"layer-{name}-raw.png")
    scale4(fit).save(PREV / f"layer-{name}.png")

cape_raw = extract_cape(cape_src)
cape_fit = align_cape(cape_raw)
print("cape raw", bbox(cape_raw), "fit", bbox(cape_fit))
cape_fit.save(CHAR / "cape-drape.png")
scale4(cape_raw).save(PREV / "layer-cape-raw.png")
scale4(cape_fit).save(PREV / "layer-cape.png")

body = clear_helm(iso)
for name, layer in aligned.items():
    shot = stamp(body, layer)
    scale4(shot).save(PREV / f"align-{name}.png")
shot = stamp(iso, cape_fit, behind=True)
scale4(shot).save(PREV / "align-cape.png")
shot = stamp(iso, cape_fit, behind=False)
scale4(shot).save(PREV / "align-cape-over.png")
shot = stamp(stamp(body, aligned["hat-crown"]), cape_fit, behind=True)
scale4(shot).save(PREV / "align-crown-cape.png")
shot = stamp(stamp(body, aligned["hat-iron"]), cape_fit, behind=True)
scale4(shot).save(PREV / "align-iron-cape.png")
print("ok")
