# Peças de xadrez da Arena (25/10/2026): silhueta clássica (para ele aprender o xadrez de verdade)
# em pixel art no estilo do jogo. A forma vem dos símbolos de xadrez da fonte Noto Sans Symbols 2 (OFL).
# Uso: python scripts/build-chess-pieces.py <NotoSansSymbols2-Regular.ttf>
# Saída: public/assets/arena/pieces/<w|b><k|q|r|b|n|p>.png e, com PRANCHA=<arquivo>, a prancha para conferir.
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'arena', 'pieces')
GRID = 24          # pixels da arte
SCALE = 4          # cada pixel vira 4x4 no arquivo (96x96)
SOLID = {'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'}
HOLLOW = {'k': '♔', 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘', 'p': '♙'}
CLOSE: dict = {}
PALETTE = {
    # contorno, luz, meio, sombra, detalhe
    'w': ((43, 33, 26), (255, 250, 236), (236, 224, 196), (196, 178, 140), (150, 128, 92)),
    'b': ((18, 14, 12), (112, 98, 122), (66, 56, 74), (40, 33, 46), (150, 136, 160)),
}

# Rei e dama desenhados à mão: os traços finos da coroa da fonte somem em 24 px.
MANUAL = {
    'k': [
        '........................',
        '..........####..........',
        '..........#oo#..........',
        '........###oo###........',
        '........#oooooo#........',
        '........###oo###........',
        '..........#oo#..........',
        '......#####oo#####......',
        '.....#oooooooooooo#.....',
        '....#oooooooooooooo#....',
        '....#oooooooooooooo#....',
        '.....#oooooooooooo#.....',
        '......############......',
        '.......#oooooooo#.......',
        '.......#oooooooo#.......',
        '......#oooooooooo#......',
        '......#oooooooooo#......',
        '.....##############.....',
        '....#oooooooooooooo#....',
        '...#oooooooooooooooo#...',
        '...##################...',
        '........................',
        '........................',
        '........................',
    ],
    'q': [
        '........................',
        '...........##...........',
        '..........#oo#..........',
        '...#......#oo#......#...',
        '...##..#...##...#..##...',
        '...#o#.##..##..##.#o#...',
        '...#oo##o#.##.#o##oo#...',
        '...#oooooo#oo#oooooo#...',
        '....#oooooooooooooo#....',
        '....#oooooooooooooo#....',
        '.....##############.....',
        '......#oooooooooo#......',
        '.......#oooooooo#.......',
        '.......#oooooooo#.......',
        '......#oooooooooo#......',
        '......#oooooooooo#......',
        '.....##############.....',
        '....#oooooooooooooo#....',
        '...#oooooooooooooooo#...',
        '...##################...',
        '........................',
        '........................',
        '........................',
        '........................',
    ],
}


def piece_from_map(rows, color):
    outline, light, mid, shade, _ = PALETTE[color]
    px = Image.new('RGBA', (GRID, GRID), (0, 0, 0, 0))
    cells = [(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch != '.']
    top = min(y for _, y in cells)
    bottom = max(y for _, y in cells)
    for y, r in enumerate(rows):
        filled = [x for x, ch in enumerate(r) if ch != '.']
        if not filled:
            continue
        left, right = filled[0], filled[-1]
        for x, ch in enumerate(r):
            if ch == '.':
                continue
            if ch == '#':
                c = outline
            else:
                t = (x - left) / max(1, right - left)
                v = (y - top) / max(1, bottom - top)
                c = light if t < 0.3 and v < 0.75 else shade if t > 0.72 or v > 0.9 else mid
            px.putpixel((x, y + 2), c + (255,))
    return px


def glyph_mask(font, ch, size=256):
    im = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(im)
    box = d.textbbox((0, 0), ch, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((size - w) / 2 - box[0], (size - h) / 2 - box[1]), ch, font=font, fill=255)
    return im


def to_grid(mask, inner):
    """Corta a figura, encaixa num quadrado de inner x inner e reduz por média."""
    bb = mask.getbbox()
    m = mask.crop(bb)
    side = max(m.width, m.height)
    sq = Image.new('L', (side, side), 0)
    sq.paste(m, ((side - m.width) // 2, side - m.height))
    return sq.resize((inner, inner), Image.BOX)


def build_piece(font, kind, color):
    if kind in MANUAL:
        base = Image.new('RGBA', (GRID, GRID), (0, 0, 0, 0))
        ImageDraw.Draw(base).ellipse([4, GRID - 3, GRID - 5, GRID - 1], fill=(0, 0, 0, 70))
        base.alpha_composite(piece_from_map(MANUAL[kind], color))
        return base.resize((GRID * SCALE, GRID * SCALE), Image.NEAREST)
    inner = GRID - 2
    big = glyph_mask(font, SOLID[kind])
    if kind in CLOSE:
        # rei e dama: os traços finos da coroa somem em 24 px; fecha a silhueta e tira as linhas de dentro
        big = big.filter(ImageFilter.MaxFilter(CLOSE[kind])).filter(ImageFilter.MinFilter(CLOSE[kind]))
    solid = to_grid(big, inner)
    hollow = to_grid(glyph_mask(font, HOLLOW[kind]), inner) if kind not in CLOSE else Image.new('L', (inner, inner), 0)
    outline, light, mid, shade, detail = PALETTE[color]
    px = Image.new('RGBA', (GRID, GRID), (0, 0, 0, 0))
    fill = [[solid.getpixel((x, y)) > 110 for x in range(inner)] for y in range(inner)]
    # linhas internas: onde a peça vazada tem traço por dentro da silhueta cheia
    lines = [[hollow.getpixel((x, y)) > 140 for x in range(inner)] for y in range(inner)]
    edge = [[False] * inner for _ in range(inner)]
    for y in range(inner):
        for x in range(inner):
            if not fill[y][x]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < inner and 0 <= ny < inner) or not fill[ny][nx]:
                    edge[y][x] = True
    rows = [y for y in range(inner) if any(fill[y])]
    top, bottom = rows[0], rows[-1]
    for y in range(inner):
        cols = [x for x in range(inner) if fill[y][x]]
        if not cols:
            continue
        left, right = cols[0], cols[-1]
        for x in cols:
            near_edge = any(
                0 <= x + dx < inner and 0 <= y + dy < inner and edge[y + dy][x + dx]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            )
            if edge[y][x]:
                c = outline
            elif lines[y][x] and not near_edge:
                c = detail
            else:
                t = (x - left) / max(1, right - left)
                v = (y - top) / max(1, bottom - top)
                c = light if t < 0.3 and v < 0.75 else shade if t > 0.72 or v > 0.9 else mid
            px.putpixel((x + 1, y + 1), c + (255,))
    # sombra no chão
    base = Image.new('RGBA', (GRID, GRID), (0, 0, 0, 0))
    sh = ImageDraw.Draw(base)
    sh.ellipse([4, GRID - 3, GRID - 5, GRID - 1], fill=(0, 0, 0, 70))
    base.alpha_composite(px)
    return base.resize((GRID * SCALE, GRID * SCALE), Image.NEAREST)


def main(font_path):
    font = ImageFont.truetype(font_path, 220)
    os.makedirs(OUT, exist_ok=True)
    made = {}
    for color in ('w', 'b'):
        for kind in ('k', 'q', 'r', 'b', 'n', 'p'):
            im = build_piece(font, kind, color)
            name = f'{color}{kind}'
            im.save(os.path.join(OUT, f'{name}.png'))
            made[name] = im
    prancha = os.environ.get('PRANCHA')
    if prancha:
        cell = 64
        sheet = Image.new('RGBA', (cell * 12, cell * 2), (0, 0, 0, 255))
        light, dark = (232, 213, 168, 255), (138, 90, 58, 255)
        for row, color in enumerate(('w', 'b')):
            for col, kind in enumerate(('k', 'q', 'r', 'b', 'n', 'p')):
                for sub in range(2):
                    x = (col * 2 + sub) * cell
                    sq = Image.new('RGBA', (cell, cell), light if sub == 0 else dark)
                    sq.alpha_composite(made[f'{color}{kind}'].resize((cell, cell), Image.NEAREST))
                    sheet.paste(sq, (x, row * cell))
        sheet.save(prancha)
    print('peças em', OUT)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('uso: python scripts/build-chess-pieces.py <NotoSansSymbols2-Regular.ttf>')
        sys.exit(1)
    main(sys.argv[1])
