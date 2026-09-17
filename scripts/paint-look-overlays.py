"""Paint hat/cape overlays on the iso miner grid. No full-body stamp."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHAR = ROOT / "public" / "assets" / "village" / "char"
PREV = ROOT / "docs" / "exemplos" / "telas" / "cena-v2" / "tmp-arena" / "look-shots"
SIZE = 64

iso = Image.open(CHAR / "miner-iso.png").convert("RGBA")
base = iso.load()


def lum(r, g, b):
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255


def shade(color, t):
    t = max(0.15, min(1.35, t))
    return tuple(min(255, int(c * t)) for c in color) + (255,)


def is_helm(r, g, b):
    return r > 150 and g > 110 and b < 90 and r + g > b * 3


def is_lamp(r, g, b, y):
    if y > 14:
        return False
    if r > 200 and g > 200 and b > 180:
        return True
    if r > 180 and g > 150 and b >= 90 and b < 210 and r + g > b * 2:
        return True
    return abs(r - g) < 22 and abs(g - b) < 22 and 150 < r < 240


def body_at(x, y):
    if not (0 <= x < SIZE and 0 <= y < SIZE):
        return False
    return base[x, y][3] >= 20


def helmet_xs(y):
    xs = []
    for x in range(16, 46):
        r, g, b, a = base[x, y]
        if a < 16 or x >= 46:
            continue
        if is_helm(r, g, b) or is_lamp(r, g, b, y):
            xs.append(x)
    return xs


def new_layer():
    return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))


def put(px, x, y, rgba):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        px[x, y] = rgba


def outline(px, color):
    edge = []
    for y in range(SIZE):
        for x in range(SIZE):
            if px[x, y][3] < 16:
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < SIZE and 0 <= ny < SIZE) or px[nx, ny][3] < 16:
                    edge.append((x, y))
                    break
    for x, y in edge:
        r, g, b, a = px[x, y]
        px[x, y] = (max(0, r + color[0]) // 2, max(0, g + color[1]) // 2, max(0, b + color[2]) // 2, a)


def paint_iron():
    im = new_layer()
    px = im.load()
    mid = (124, 128, 136)
    for y in range(2, 16):
        xs = helmet_xs(y)
        if not xs:
            continue
        x0, x1 = min(xs), max(xs)
        for x in range(x0, x1 + 1):
            if x >= 43:
                continue
            t = 0.62 + 0.42 * ((x - x0) / max(1, x1 - x0))
            if y <= 4:
                t += 0.1
            if y >= 14:
                t -= 0.12
            put(px, x, y, shade(mid, t))
    for y in range(8, 11):
        for x in range(26, 37):
            if px[x, y][3] < 16:
                continue
            put(px, x, y, (24, 26, 30, 255) if y == 9 else (48, 50, 56, 255))
    for x in (23, 31, 39):
        if px[x, 5][3] >= 16:
            put(px, x, 5, (188, 192, 200, 255))
    return im


def paint_cap():
    im = new_layer()
    px = im.load()
    mid = (52, 122, 48)
    for y in range(2, 14):
        xs = helmet_xs(y)
        if not xs:
            continue
        x0, x1 = min(xs), max(xs)
        if y <= 4:
            x0 += 2
            x1 -= 2
        for x in range(x0, x1 + 1):
            if x >= 43:
                continue
            t = 0.75 + 0.3 * ((x - x0) / max(1, x1 - x0))
            put(px, x, y, shade(mid, t))
    brim = helmet_xs(12) or list(range(22, 42))
    x0, x1 = min(brim) - 1, min(43, max(brim) + 1)
    for y in range(13, 15):
        for x in range(x0, x1 + 1):
            put(px, x, y, shade(mid, 0.58 if y == 14 else 0.7))
    put(px, 31, 3, (196, 204, 72, 255))
    return im


def paint_crown():
    im = new_layer()
    px = im.load()
    gold = (232, 185, 35)
    band_y = 7
    for y in range(band_y, band_y + 3):
        xs = helmet_xs(y) or helmet_xs(8)
        if not xs:
            continue
        x0, x1 = min(xs) + 2, max(xs) - 2
        for x in range(x0, x1 + 1):
            put(px, x, y, shade(gold, 0.95 if y == band_y else 0.7))
    xs = helmet_xs(7) or [24, 40]
    x0, x1 = min(xs) + 2, max(xs) - 2
    span = max(1, x1 - x0)
    for i, gem in enumerate(((179, 40, 40), (80, 160, 220), (179, 40, 40), (80, 160, 220), (179, 40, 40))):
        cx = x0 + int(span * i / 4)
        h = 4 if i == 2 else 3
        for y in range(band_y - h, band_y):
            w = 0 if y == band_y - h else 1
            for x in range(cx - w, cx + w + 1):
                put(px, x, y, shade(gold, 1.15 if y == band_y - h else 0.9))
        put(px, cx, band_y - h, gem + (255,))
    return im


def paint_cape():
    im = new_layer()
    px = im.load()
    cloth = (179, 58, 43)
    for y in range(24, 50):
        torso = [x for x in range(18, 42) if body_at(x, y)]
        if not torso:
            continue
        left, right = min(torso), max(torso)
        flare = 5 + (y - 24) // 5
        for i, x in enumerate(range(left - flare, left)):
            if body_at(x, y) or x < 9 or x >= 44:
                continue
            t = 1.08 - 0.07 * i - 0.012 * (y - 24)
            if y >= 46:
                t -= 0.2
            put(px, x, y, shade(cloth, t))
        for i, x in enumerate(range(right + 1, right + flare + 1)):
            if body_at(x, y) or x >= 46:
                continue
            t = 0.7 - 0.05 * i - 0.01 * (y - 24)
            if y >= 46:
                t -= 0.18
            put(px, x, y, shade(cloth, t))
    for y in range(24, 27):
        for x in range(26, 37):
            if not body_at(x, y):
                continue
            if 29 <= x <= 33:
                continue
            put(px, x, y, shade(cloth, 0.95))
    for x, y in ((30, 24), (31, 24), (32, 24), (30, 25), (31, 25)):
        put(px, x, y, (232, 185, 35, 255))
    put(px, 31, 24, (255, 244, 196, 255))
    return im


def composite(hat=None, cape=None, hair=False):
    out = iso.copy()
    px = out.load()
    # strip turf
    for y in range(52, SIZE):
        for x in range(SIZE):
            r, g, b, a = px[x, y]
            if a >= 16 and g > 92 and g >= r and g > b + 10:
                px[x, y] = (0, 0, 0, 0)
    if cape:
        cp = cape.load()
        for y in range(SIZE):
            for x in range(SIZE):
                r, g, b, a = cp[x, y]
                if a < 16:
                    continue
                collar = 23 <= y <= 27 and 22 <= x <= 40
                if px[x, y][3] >= 16 and not collar:
                    continue
                px[x, y] = (r, g, b, a)
    if hat:
        # clear helm band
        for y in range(0, 16):
            for x in range(17, 45):
                if px[x, y][3] < 16:
                    continue
                if x >= 42 and y >= 12:
                    continue
                r, g, b, a = base[x, y]
                if y >= 15 and r > 130 and g > 70 and b < 170 and r > b + 10:
                    continue
                px[x, y] = (0, 0, 0, 0)
        if hair:
            for y in range(3, 15):
                xs = helmet_xs(y)
                if not xs:
                    continue
                x0, x1 = min(xs), max(xs)
                for x in range(x0, x1 + 1):
                    if px[x, y][3] >= 16 or x >= 43:
                        continue
                    t = 0.5 + 0.35 * ((x - x0) / max(1, x1 - x0))
                    px[x, y] = shade((61, 41, 24), t)
        hp = hat.load()
        for y in range(SIZE):
            for x in range(SIZE):
                r, g, b, a = hp[x, y]
                if a >= 16:
                    px[x, y] = (r, g, b, a)
    return out


def scale4(im):
    return im.resize((256, 256), Image.NEAREST)


iron = paint_iron()
cap = paint_cap()
crown = paint_crown()
cape = paint_cape()

iron.save(CHAR / "hat-iron.png")
cap.save(CHAR / "hat-cap.png")
crown.save(CHAR / "hat-crown.png")
cape.save(CHAR / "cape-drape.png")

PREV.mkdir(parents=True, exist_ok=True)
scale4(composite(hat=iron)).save(PREV / "ov-iron.png")
scale4(composite(hat=cap)).save(PREV / "ov-cap.png")
scale4(composite(hat=crown, hair=True)).save(PREV / "ov-crown.png")
scale4(composite(cape=cape)).save(PREV / "ov-cape.png")
scale4(composite(hat=iron, cape=cape)).save(PREV / "ov-iron-cape.png")
scale4(composite(hat=crown, cape=cape, hair=True)).save(PREV / "ov-crown-cape.png")
print("wrote overlays")
