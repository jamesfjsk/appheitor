"""Continue the village lawn into the campinho using only adjacent grass."""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(r"c:\Users\Nobody\Downloads\Samsonite\appheitor")
SRC = ROOT / "public/assets/village/scene/backdrop-day.png"
PREVIEW = ROOT / "docs/exemplos/telas/cena-v2/tmp-arena/field-inpaint-preview.png"

PATCH = 12
N_CAND = 120
RNG = np.random.default_rng(11)


def main() -> None:
    im = np.array(Image.open(SRC).convert("RGB"))
    h, w = im.shape[:2]
    r = im[:, :, 0].astype(np.int16)
    g = im[:, :, 1].astype(np.int16)
    b = im[:, :, 2].astype(np.int16)

    water = (b > 135) & (b > g + 10) & (b > r + 18)
    wood = (r > 85) & (g > 35) & (g < 155) & (b < 95) & (r > g + 10) & (r > b + 22)
    lawn = (g > 88) & (g >= r + 12) & (g > b + 8) & (r > 35) & (r < 160) & (g < 190) & ~wood

    hole = np.zeros((h, w), np.uint8)
    hole[296:490, 916:1140] = 255
    hole = cv2.dilate(hole, np.ones((5, 5), np.uint8), iterations=2)
    hole[water] = 0
    # keep pond and lantern out
    hole[:, :910] = 0
    hole[:290, :] = 0
    hole[500:, :] = 0

    ring = cv2.dilate(hole, np.ones((55, 55), np.uint8))
    src_ok = ((ring > 0) & (hole == 0) & lawn & ~water).astype(np.uint8) * 255
    src_ok[400:470, 850:910] = 0  # lantern
    src_ok[:250, :] = 0  # hill trees

    erode = cv2.erode(src_ok, np.ones((PATCH, PATCH), np.uint8))
    cand_y, cand_x = np.where(erode > 0)
    print("hole", int(hole.sum() // 255), "cands", len(cand_y))
    if len(cand_y) == 0:
        raise SystemExit("no source grass")
    if len(cand_y) > 1800:
        pick = RNG.choice(len(cand_y), 1800, replace=False)
        cand_y, cand_x = cand_y[pick], cand_x[pick]

    patches = np.stack([im[y : y + PATCH, x : x + PATCH] for y, x in zip(cand_y, cand_x)])
    cand_y = cand_y.astype(np.int32)
    cand_x = cand_x.astype(np.int32)

    out = im.copy()
    remaining = hole.copy()
    half = PATCH // 2

    def best_idx(py: int, px: int, prefer_y: int) -> int:
        dest = np.zeros((PATCH, PATCH, 3), np.int16)
        known = np.zeros((PATCH, PATCH), bool)
        for oy in range(PATCH):
            yy = py + oy
            if yy < 0 or yy >= h:
                continue
            for ox in range(PATCH):
                xx = px + ox
                if xx < 0 or xx >= w:
                    continue
                if remaining[yy, xx] == 0:
                    dest[oy, ox] = out[yy, xx]
                    known[oy, ox] = True
        if not known.any():
            near = np.abs(cand_y - prefer_y)
            return int(np.argmin(near))
        near = np.where(np.abs(cand_y - prefer_y) <= 18)[0]
        pool = near if len(near) >= 12 else np.arange(len(cand_y))
        if len(pool) > N_CAND:
            pool = RNG.choice(pool, N_CAND, replace=False)
        cand = patches[pool].astype(np.int16)
        diff = cand - dest
        ssd = (diff * diff * known[None, :, :, None]).sum(axis=(1, 2, 3))
        return int(pool[int(np.argmin(ssd))])

    def paste(py: int, px: int, sy: int, sx: int) -> None:
        y0, y1 = max(0, py), min(h, py + PATCH)
        x0, x1 = max(0, px), min(w, px + PATCH)
        sl = remaining[y0:y1, x0:x1] > 0
        if not sl.any():
            return
        src = im[sy + (y0 - py) : sy + (y1 - py), sx + (x0 - px) : sx + (x1 - px)]
        dest = out[y0:y1, x0:x1]
        dest[sl] = src[sl]
        remaining[y0:y1, x0:x1][sl] = 0

    guard = 0
    while remaining.any() and guard < 300:
        guard += 1
        known = (remaining == 0).astype(np.uint8)
        border = cv2.bitwise_and(cv2.dilate(known, np.ones((3, 3), np.uint8)), remaining)
        bys, bxs = np.where(border > 0)
        if len(bys) == 0:
            bys, bxs = np.where(remaining > 0)
        if len(bys) == 0:
            break
        step = max(1, PATCH // 3)
        order = np.arange(0, len(bys), step)
        RNG.shuffle(order)
        for k in order[:60]:
            cy, cx = int(bys[k]), int(bxs[k])
            py, px = cy - half, cx - half
            i = best_idx(py, px, cy)
            paste(py, px, int(cand_y[i]), int(cand_x[i]))
        if guard % 15 == 0:
            print("left", int(remaining.sum() // 255), "pass", guard)

    Image.fromarray(out).save(SRC)
    Image.fromarray(out).crop((850, 270, 1190, 530)).save(PREVIEW)
    print("left", int(remaining.sum() // 255), "passes", guard)


if __name__ == "__main__":
    main()
