from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
iso = Image.open(ROOT / "public/assets/village/char/miner-iso.png").convert("RGBA")
px = iso.load()


def is_helmet(r, g, b, a):
    if a < 16:
        return False
    return r > 150 and g > 110 and b < 90 and r + g > b * 3


print("=== STOCK PICK (gray, not helmet) ===")
cells = []
for y in range(8, 30):
    row = []
    for x in range(40, 64):
        r, g, b, a = px[x, y]
        if a < 16:
            row.append(" ")
            continue
        if is_helmet(r, g, b, a):
            row.append("H")
            continue
        gray = abs(r - g) < 32 and abs(g - b) < 32
        if gray and r < 220 and (r > 68 or r < 24):
            row.append("#" if r >= 24 else ".")
            cells.append((x, y, r, g, b))
        else:
            row.append("+")
    if any(c in "#H.+" for c in row):
        print(f"{y:02d} {''.join(row)}")
print(
    "n=",
    len(cells),
    "bbox",
    min(c[0] for c in cells),
    min(c[1] for c in cells),
    max(c[0] for c in cells),
    max(c[1] for c in cells),
)
print("pixels:")
for c in cells:
    print(c)

print("\n=== FIST BROWN-ish y28-36 x14-24 ===")
for y in range(28, 38):
    row = []
    for x in range(14, 26):
        r, g, b, a = px[x, y]
        if a < 16:
            row.append(" ")
        elif r > 80 and r > g + 20 and g > 30 and b < 80:
            row.append("W")
        else:
            row.append("+")
    print(f"{y:02d} {''.join(row)}")

items = [
    "pickaxe-madeira",
    "pickaxe-pedra",
    "pickaxe-ferro",
    "pickaxe-ouro",
    "diamond-pickaxe",
]
for name in items:
    im = Image.open(ROOT / "public/assets/village/items" / f"{name}.png").convert("RGBA")
    print(f"\n=== ITEM {name} {im.size} ===")
    p = im.load()
    w, h = im.size
    for y in range(h):
        row = []
        nonempty = False
        for x in range(w):
            r, g, b, a = p[x, y]
            if a < 16:
                row.append(" ")
            else:
                nonempty = True
                lum = (r + g + b) // 3
                if r < 40 and g < 40 and b < 40:
                    ch = "o"
                elif r > 80 and r > g + 15 and g > 30 and b < 90:
                    ch = "w"
                elif b > g + 20 and b > 140:
                    ch = "c"
                elif lum > 200:
                    ch = "s"
                elif lum > 140:
                    ch = "L"
                elif lum > 90:
                    ch = "m"
                else:
                    ch = "d"
                row.append(ch)
        if nonempty:
            print(f"{y:02d} {''.join(row)}")
            for x in range(w):
                r, g, b, a = p[x, y]
                if a > 16:
                    print(f"    {x},{y} {(r,g,b)}")
