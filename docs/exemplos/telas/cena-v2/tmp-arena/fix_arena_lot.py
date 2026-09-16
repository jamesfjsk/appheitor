"""Apaga o campinho (cerca + campo listrado) e continua o prado da vila."""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(r"c:\Users\Nobody\Downloads\Samsonite\appheitor")
ORIG = ROOT / "docs/exemplos/telas/cena-v2/tmp-arena/git-lote1.png"
OUT = ROOT / "public/assets/village/scene/backdrop-day.png"
PREVIEW = ROOT / "docs/exemplos/telas/cena-v2/tmp-arena/arena-lot-preview.png"
RNG = np.random.default_rng(41)
PATCH = 18


def is_water(r, g, b):
    return (b > 135) & (b > g + 10) & (b > r + 18)


def is_wood(r, g, b):
    return (r > 88) & (g > 40) & (g < 155) & (b < 95) & (r > g + 8) & (r > b + 22)


def is_lawn(r, g, b):
    return (g > 78) & (g >= r + 8) & (g > b + 4) & (r < 175) & (g < 200)


def dist_to_false(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    inf = h + w
    d = np.where(mask, inf, 0).astype(np.int32)
    for y in range(h):
        for x in range(w):
            if d[y, x] == 0:
                continue
            best = d[y, x]
            if y:
                best = min(best, d[y - 1, x] + 1)
                if x:
                    best = min(best, d[y - 1, x - 1] + 1)
                if x + 1 < w:
                    best = min(best, d[y - 1, x + 1] + 1)
            if x:
                best = min(best, d[y, x - 1] + 1)
            d[y, x] = best
    for y in range(h - 1, -1, -1):
        for x in range(w - 1, -1, -1):
            best = d[y, x]
            if y + 1 < h:
                best = min(best, d[y + 1, x] + 1)
                if x:
                    best = min(best, d[y + 1, x - 1] + 1)
                if x + 1 < w:
                    best = min(best, d[y + 1, x + 1] + 1)
            if x + 1 < w:
                best = min(best, d[y, x + 1] + 1)
            d[y, x] = best
    return d


def main() -> None:
    im = np.array(Image.open(ORIG).convert("RGBA"))
    rgb = im[:, :, :3].astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    h, w = r.shape
    water = is_water(r, g, b)
    wood = is_wood(r, g, b)
    lawn = is_lawn(r, g, b)

    region = np.zeros((h, w), bool)
    region[312:482, 916:1136] = True

    barrier = cv2.dilate(wood.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2) > 0
    walk = np.zeros((h, w), np.uint8)
    walk[region & ~barrier & ~water] = 255
    ff = walk.copy()
    cv2.floodFill(ff, None, (1024, 398), 128)
    pitch = ff == 128
    fence = cv2.dilate((wood & region).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=3) > 0
    # as 4 paredes da cerca, cor nao importa — pega poste escuro que o detector perde
    x0, y0, x1, y1 = 904, 296, 1142, 486
    band = 20
    frame = np.zeros((h, w), bool)
    frame[y0:y1, x0 : x0 + band] = True
    frame[y0:y1, x1 - band : x1] = True
    frame[y0 : y0 + band, x0:x1] = True
    frame[y1 - band : y1, x0:x1] = True
    hole = ((pitch | fence | frame).astype(np.uint8))
    hole = cv2.dilate(hole, np.ones((3, 3), np.uint8), iterations=1) > 0
    hole[water] = False
    hole[:, :880] = False
    hole[:292, :] = False
    hole[512:, :] = False
    hole[:, 1155:] = False
    blob = hole.astype(np.uint8) * 255
    yy, xx = np.where(blob > 0)
    for y, x in zip(yy[::11], xx[::11]):
        if RNG.random() < 0.35:
            cv2.circle(blob, (int(x), int(y)), int(RNG.integers(2, 5)), 255, -1)
    hole = blob > 0
    hole[water] = False
    hole[:292, :] = False

    src_ok = lawn & ~water & ~hole & ~wood
    src_ok[:260, :] = False
    src_ok[548:, :] = False  # arvores do sul
    src_ok[:, :760] = False
    src_ok[:, 1175:] = False
    src_ok[390:470, 740:830] = False
    src_ok[268:338, 880:1160] = False  # nao clonar o topo da cerca

    erode = cv2.erode(src_ok.astype(np.uint8) * 255, np.ones((PATCH, PATCH), np.uint8))
    erode[h - PATCH :, :] = 0
    erode[:, w - PATCH :] = 0
    cand_y, cand_x = np.where(erode > 0)
    if len(cand_y) == 0:
        raise SystemExit("no meadow source")
    south = cand_y > 468
    west = cand_x < 910
    prefer = np.where(south | west)[0]
    other = np.where(~south & ~west)[0]
    if len(prefer) > 900:
        prefer = RNG.choice(prefer, 900, replace=False)
    if len(other) > 900:
        other = RNG.choice(other, 900, replace=False)
    pick = np.concatenate([prefer, other]) if len(prefer) else other
    cand_y, cand_x = cand_y[pick], cand_x[pick]
    patches = np.stack([im[y : y + PATCH, x : x + PATCH] for y, x in zip(cand_y, cand_x)])
    cand_y = cand_y.astype(np.int32)
    cand_x = cand_x.astype(np.int32)

    out = im.copy()
    remaining = hole.copy()
    half = PATCH // 2

    def best_idx(py: int, px: int, prefer_y: int, prefer_x: int) -> int:
        dest = np.zeros((PATCH, PATCH, 4), np.int16)
        known = np.zeros((PATCH, PATCH), bool)
        y0, y1 = max(0, py), min(h, py + PATCH)
        x0, x1 = max(0, px), min(w, px + PATCH)
        sl = ~remaining[y0:y1, x0:x1]
        if sl.any():
            dest[(y0 - py) : (y1 - py), (x0 - px) : (x1 - px)][sl] = out[y0:y1, x0:x1][sl]
            known[(y0 - py) : (y1 - py), (x0 - px) : (x1 - px)] = sl
        near = np.where((np.abs(cand_y - prefer_y) <= 30) & (np.abs(cand_x - prefer_x) <= 42))[0]
        pool = near if len(near) >= 16 else np.arange(len(cand_y))
        if len(pool) > 90:
            pool = RNG.choice(pool, 90, replace=False)
        if not known.any():
            return int(pool[int(np.argmin(np.abs(cand_y[pool] - prefer_y) + 0.4 * np.abs(cand_x[pool] - prefer_x)))])
        cand = patches[pool].astype(np.int16)
        diff = cand - dest
        ssd = (diff * diff * known[None, :, :, None]).sum(axis=(1, 2, 3))
        return int(pool[int(np.argmin(ssd))])

    def paste(py: int, px: int, sy: int, sx: int) -> None:
        y0, y1 = max(0, py), min(h, py + PATCH)
        x0, x1 = max(0, px), min(w, px + PATCH)
        sl = remaining[y0:y1, x0:x1]
        if not sl.any():
            return
        src = im[sy + (y0 - py) : sy + (y1 - py), sx + (x0 - px) : sx + (x1 - px)]
        if src.shape[:2] != sl.shape:
            return
        if RNG.random() < 0.35:
            src = np.fliplr(src)
        dest = out[y0:y1, x0:x1]
        dest[sl] = src[sl]
        remaining[y0:y1, x0:x1][sl] = False

    guard = 0
    while remaining.any() and guard < 400:
        guard += 1
        known = (~remaining).astype(np.uint8)
        border = cv2.bitwise_and(cv2.dilate(known, np.ones((3, 3), np.uint8)), remaining.astype(np.uint8))
        bys, bxs = np.where(border > 0)
        if len(bys) == 0:
            bys, bxs = np.where(remaining)
        if len(bys) == 0:
            break
        step = max(1, PATCH // 3)
        order = np.arange(0, len(bys), step)
        RNG.shuffle(order)
        for k in order[:70]:
            cy, cx = int(bys[k]), int(bxs[k])
            py, px = cy - half, cx - half
            i = best_idx(py, px, cy, cx)
            paste(py, px, int(cand_y[i]), int(cand_x[i]))

    if remaining.any():
        ys, xs = np.where(remaining)
        for y, x in zip(ys, xs):
            i = int(RNG.integers(0, len(cand_y)))
            out[y, x] = im[int(cand_y[i]) + half, int(cand_x[i]) + half]

    fade = 20
    edge = dist_to_false(hole)
    ey, ex = np.where(hole & (edge < fade) & ~water)
    for y, x in zip(ey, ex):
        t = float(edge[y, x]) / fade
        found = False
        for rad in range(1, fade + 8):
            for dy in range(-rad, rad + 1):
                for dx in range(-rad, rad + 1):
                    if abs(dx) != rad and abs(dy) != rad:
                        continue
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and (not hole[ny, nx]) and (not water[ny, nx]) and lawn[ny, nx]:
                        a = im[ny, nx].astype(np.float32)
                        bpix = out[y, x].astype(np.float32)
                        out[y, x] = (a * (1 - t) + bpix * t).astype(np.uint8)
                        found = True
                        break
                if found:
                    break
            if found:
                break

    ring = lawn & ~hole & ~water
    ring[:300, :] = False
    ring[510:, :] = False
    ring[:, :860] = False
    ring[:, 1160:] = False
    ring = ring & cv2.dilate(hole.astype(np.uint8), np.ones((41, 41), np.uint8)).astype(bool)
    if ring.any() and hole.any():
        shift = (im[ring, :3].mean(axis=0) - out[hole, :3].mean(axis=0)).astype(np.int16)
        out[hole, :3] = np.clip(out[hole, :3].astype(np.int16) + shift, 0, 255).astype(np.uint8)

    # puxa o prado vizinho para dentro da borda (quebra o retangulo do campinho)
    def copy_in(y, x, sy, sx) -> None:
        if not (0 <= sy < h and 0 <= sx < w):
            return
        if water[sy, sx] or wood[sy, sx]:
            return
        out[y, x] = im[sy, sx]

    ey, ex = np.where(hole)
    for y, x in zip(ey, ex):
        d = int(edge[y, x])
        if d > 16:
            continue
        # sul
        if y > 430:
            copy_in(y, x, min(h - 1, y + 28 + (x % 5)), x)
        # oeste
        elif x < 960:
            copy_in(y, x, y, max(0, x - 36 - (y % 5)))
        # leste, desvia da agua
        elif x > 1085:
            copy_in(y, x, y, max(0, x - 50))
        # norte: mesma linha a oeste (luz das pedras)
        elif y < 340:
            copy_in(y, x, y, 800 + ((x - 900) % 90))

    # postes que escaparam: qualquer madeira restante no buraco vira prado
    rr, gg, bb = out[:, :, 0].astype(np.int16), out[:, :, 1].astype(np.int16), out[:, :, 2].astype(np.int16)
    north_wood = ((r > 50) & (r >= g - 2) & (r > b + 8) & (g < 130) & (b < 95))
    north_wood[:280, :] = False
    north_wood[325:, :] = False
    north_wood[:, :896] = False
    north_wood[:, 1148:] = False
    leftover = (is_wood(rr, gg, bb) & hole) | north_wood
    ly, lx = np.where(leftover)
    for y, x in zip(ly, lx):
        sx = 800 + ((x - 900) % 90)
        sy = y if 300 <= y < 520 else 500
        if water[sy, sx] or wood[sy, sx]:
            i = int(RNG.integers(0, len(cand_y)))
            out[y, x] = im[int(cand_y[i]) + half, int(cand_x[i]) + half]
        else:
            out[y, x] = im[sy, sx]

    # continua o gramado de baixo das pedras (mesma linha, vindo do oeste)
    for y in range(292, 328):
        for x in range(904, 1140):
            if not hole[y, x] and not leftover[y, x]:
                continue
            sx = 800 + ((x - 904) % 92)
            if not water[y, sx]:
                out[y, x] = im[y, sx]

    flower = (r > 168) & (g > 155) & (b < 165) & lawn & ~hole
    fy, fx = np.where(flower)
    filled_y, filled_x = np.where(hole & (edge > 8))
    if len(fy) > 6 and len(filled_y) > 10:
        for i in RNG.choice(len(fy), size=min(8, len(fy)), replace=False):
            sy, sx = int(fy[i]), int(fx[i])
            j = int(RNG.integers(0, len(filled_y)))
            dy, dx = int(filled_y[j]), int(filled_x[j])
            for oy in range(-2, 3):
                for ox in range(-2, 3):
                    if abs(oy) + abs(ox) > 3:
                        continue
                    ty, tx = dy + oy, dx + ox
                    if 0 <= ty < h and 0 <= tx < w and hole[ty, tx] and not water[ty, tx]:
                        qy, qx = sy + oy, sx + ox
                        if 0 <= qy < h and 0 <= qx < w:
                            out[ty, tx] = im[qy, qx]

    Image.fromarray(out).save(OUT)
    Image.fromarray(out).crop((880, 270, 1180, 530)).save(PREVIEW)
    rr, gg, bb = out[:, :, 0].astype(np.int16), out[:, :, 1].astype(np.int16), out[:, :, 2].astype(np.int16)
    print(
        "saved hole", int(hole.sum()),
        "passes", guard,
        "wood-left", int((is_wood(rr, gg, bb) & hole).sum()),
    )


if __name__ == "__main__":
    main()
