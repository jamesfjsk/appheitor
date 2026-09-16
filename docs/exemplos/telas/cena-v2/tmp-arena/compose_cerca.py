"""Monta a cerca sul de frente, entre as árvores, em 3 níveis."""
from PIL import Image, ImageDraw
from pathlib import Path

ROOT = Path(r"c:\Users\Nobody\Downloads\Samsonite\appheitor")
SRC = ROOT / "public/assets/village/scene/wall/palisade-south-src.png"
TORCH = ROOT / "public/assets/village/scene/wall/torch.png"
BACKDROP = ROOT / "public/assets/village/scene/backdrop-day.png"
WALL = ROOT / "public/assets/village/scene/wall"
BUILD = ROOT / "public/assets/village/buildings"
PREV = ROOT / "docs/exemplos/telas/cena-v2"

W, H = 768, 88
L1_H = 64
OUTLINE = (40, 20, 22, 255)
DARK = (74, 40, 40, 255)
MID = (130, 88, 54, 255)
LIGHT = (184, 130, 77, 255)
SHADOW = (66, 34, 36, 255)
STONE = (168, 160, 148, 255)
STONE_D = (110, 104, 96, 255)


def nn(im: Image.Image, w: int, h: int) -> Image.Image:
    return im.resize((w, h), Image.NEAREST)


def blit(dst: Image.Image, src: Image.Image, x: int, y: int) -> None:
    dst.alpha_composite(src, (x, y))


def tile_row(dst: Image.Image, tile: Image.Image, x0: int, x1: int, y: int) -> None:
    x = x0
    while x < x1:
        piece = tile
        if x + tile.width > x1:
            piece = tile.crop((0, 0, x1 - x, tile.height))
        blit(dst, piece, x, y)
        x += tile.width


def palisade_l2() -> Image.Image:
    src = Image.open(SRC).convert("RGBA")
    tile = src.crop((0, 0, 116, 128))
    gate = src.crop((236, 0, 410, 128))
    tile_s = nn(tile, round(116 * H / 128), H)
    gate_s = nn(gate, round(174 * H / 128), H)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gx = (W - gate_s.width) // 2
    tile_row(out, tile_s, 0, gx, 0)
    blit(out, gate_s, gx, 0)
    tile_row(out, tile_s, gx + gate_s.width, W, 0)
    return out


def rail_l1() -> Image.Image:
    """Nível 1: a mesma madeira, sem as estacas — muro baixo com porta."""
    src = Image.open(SRC).convert("RGBA")
    planks = src.crop((0, 50, 116, 126))
    door = src.crop((258, 50, 394, 126))
    h = L1_H
    tile_s = nn(planks, round(116 * h / planks.height), h)
    door_s = nn(door, round(door.width * h / door.height), h)
    out = Image.new("RGBA", (W, h), (0, 0, 0, 0))
    gx = (W - door_s.width) // 2
    tile_row(out, tile_s, 0, gx, 0)
    blit(out, door_s, gx, 0)
    tile_row(out, tile_s, gx + door_s.width, W, 0)
    return out


def palisade_l3(base: Image.Image) -> Image.Image:
    out = base.copy()
    torch = Image.open(TORCH).convert("RGBA")
    tw, th = 22, 22
    t = nn(torch, tw, th)
    # postes do portão ~ centro
    left = W // 2 - 48
    right = W // 2 + 26
    blit(out, t, left, 2)
    blit(out, t, right, 2)
    # faixa de ferro na porta
    d = ImageDraw.Draw(out)
    door_y = H - 38
    d.rectangle([W // 2 - 18, door_y, W // 2 + 17, door_y + 3], fill=SHADOW)
    d.rectangle([W // 2 - 18, door_y + 14, W // 2 + 17, door_y + 17], fill=SHADOW)
    return out


def icon_from(src: Image.Image, box: tuple[int, int, int, int], canvas=128) -> Image.Image:
    crop = src.crop(box)
    # cabe no canvas com margem
    scale = min((canvas - 16) / crop.width, (canvas - 16) / crop.height)
    nw, nh = max(8, round(crop.width * scale)), max(8, round(crop.height * scale))
    spr = nn(crop, nw, nh)
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    blit(out, spr, (canvas - nw) // 2, canvas - nh - 6)
    return out


def overlay(bg: Image.Image, fence: Image.Image, x: int, y: int, name: str) -> None:
    frame = bg.convert("RGBA").copy()
    blit(frame, fence, x, y)
    frame.save(PREV / name)


def main() -> None:
    WALL.mkdir(parents=True, exist_ok=True)
    l2 = palisade_l2()
    l1 = rail_l1()
    l3 = palisade_l3(l2)
    l1.save(WALL / "cerca-south-1.png")
    l2.save(WALL / "cerca-south-2.png")
    l3.save(WALL / "cerca-south-3.png")

    # ícones do cartão: o portão, não o losango
    icon_from(l1, (W // 2 - 40, 0, W // 2 + 40, L1_H)).save(BUILD / "cerca-1.png")
    icon_from(l2, (W // 2 - 70, 0, W // 2 + 70, H)).save(BUILD / "cerca-2.png")
    icon_from(l3, (W // 2 - 70, 0, W // 2 + 70, H)).save(BUILD / "cerca-3.png")

    bg = Image.open(BACKDROP)
    x, y2 = 256, 640 - H - 4
    y1 = 640 - L1_H - 4
    overlay(bg, l1, x, y1, "preview-cerca-l1.png")
    overlay(bg, l2, x, y2, "preview-cerca-l2.png")
    overlay(bg, l3, x, y2, "preview-cerca-l3.png")
    print("l1", l1.size, "l2", l2.size, "l3", l3.size, "place", x, y1, y2)


if __name__ == "__main__":
    main()
