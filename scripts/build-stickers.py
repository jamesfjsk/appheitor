# Figurinhas da Conversa (25/10/2026): personagem do jogo com contorno branco e um balão de fala.
# Uso: python scripts/build-stickers.py <Fredoka.ttf>  (fonte do Google Fonts, OFL)
# Saída: public/assets/stickers/<id>.webp (512x512, o tamanho que o Telegram usa para figurinha)
# A prancha para conferir antes de entrar vai para o caminho de PRANCHA (variável de ambiente), fora do public.
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'public', 'assets', 'village')
OUT = os.path.join(ROOT, 'public', 'assets', 'stickers')
LIST = os.path.join(ROOT, 'src', 'data', 'stickers.ts')
SIZE = 512
INK = (31, 26, 23, 255)
PAPER = (255, 250, 238, 255)


def load_font(path, size):
    font = ImageFont.truetype(path, size)
    try:
        font.set_variation_by_name('Bold')
    except Exception:
        pass
    return font


def crop_alpha(im):
    box = im.getchannel('A').getbbox()
    return im.crop(box) if box else im


def with_outline(im, width):
    pad = width * 2
    canvas = Image.new('RGBA', (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(im, (pad, pad))
    alpha = canvas.getchannel('A').point(lambda a: 255 if a > 40 else 0)
    grown = alpha.filter(ImageFilter.MaxFilter(width * 2 + 1))
    white = Image.new('RGBA', canvas.size, (255, 255, 255, 255))
    white.putalpha(grown)
    shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 90))
    shadow.putalpha(grown.point(lambda a: 70 if a else 0))
    out = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    out.alpha_composite(shadow, (0, 6))
    out.alpha_composite(white)
    out.alpha_composite(canvas)
    return out


def wrap(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ''
    for w in words:
        test = f'{cur} {w}'.strip()
        if draw.textlength(test, font=font) <= max_w or not cur:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def bubble(canvas, text, font_path, tail_x):
    draw = ImageDraw.Draw(canvas)
    font = load_font(font_path, 54)
    lines = wrap(draw, text, font, 420)
    if len(lines) > 1:
        font = load_font(font_path, 46)
        lines = wrap(draw, text, font, 430)
    line_h = font.size + 8
    text_w = max(draw.textlength(l, font=font) for l in lines)
    w = int(text_w + 56)
    h = int(line_h * len(lines) + 34)
    x0 = (SIZE - w) // 2
    y0 = 14
    # rabinho apontando para o personagem
    tx = max(x0 + 40, min(x0 + w - 40, tail_x))
    draw.polygon([(tx - 22, y0 + h - 8), (tx + 22, y0 + h - 8), (tx + 4, y0 + h + 30)], fill=INK)
    draw.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=30, fill=INK)
    draw.rounded_rectangle([x0 + 7, y0 + 7, x0 + w - 7, y0 + h - 7], radius=24, fill=PAPER)
    draw.polygon([(tx - 13, y0 + h - 9), (tx + 13, y0 + h - 9), (tx + 3, y0 + h + 17)], fill=PAPER)
    y = y0 + 15
    for l in lines:
        lw = draw.textlength(l, font=font)
        draw.text(((SIZE - lw) / 2, y), l, font=font, fill=INK)
        y += line_h
    return y0 + h + 30


STICKERS = [
    ('sabio-oi', 'npc/sabio-iso.png', 'Oi!', 'wave'),
    ('sabio-muito-bem', 'npc/sabio-iso.png', 'Muito bem!', 'bounce'),
    ('sabio-orgulho', 'npc/sabio-iso.png', 'Orgulho de você!', 'pulse'),
    ('sabio-hmm', 'npc/sabio-iso.png', 'Hmm...', 'tilt'),
    ('sabio-durma-bem', 'npc/sabio-iso.png', 'Durma bem!', 'sway'),
    ('capataz-bora', 'npc/olheiro-iso.png', 'Bora trabalhar!', 'jump'),
    ('comerciante-fechado', 'npc/comerciante-iso.png', 'Negócio fechado!', 'bounce'),
    ('ferreiro-forte', 'npc/ferreiro-iso.png', 'Ficou forte!', 'shake'),
    ('minerador-oi-pai', 'char/miner-iso.png', 'Oi, pai!', 'jump'),
    ('minerador-saudade', 'char/miner-iso.png', 'Saudade!', 'pulse'),
    ('minerador-te-amo', 'char/miner-iso.png', 'Te amo!', 'pulse'),
    ('minerador-consegui', 'char/miner-iso.png', 'Consegui!', 'spin'),
    ('minerador-boa-noite', 'char/miner-iso.png', 'Boa noite!', 'sway'),
    ('gato-miau', 'pets/gato.png', 'Miau!', 'wiggle'),
    ('lobo-auu', 'pets/lobo.png', 'Auuu!', 'jump'),
    ('papagaio-oi', 'pets/papagaio.png', 'Oi! Oi! Oi!', 'bob'),
    ('pizza', 'rewards/pizza.png', 'Pizza hoje?', 'spin'),
    ('presente', 'rewards/presente.png', 'Surpresa!', 'shake'),
    ('videogame', 'rewards/videogame.png', 'Bora jogar?', 'bounce'),
    ('futebol', 'rewards/futebol.png', 'Gol!', 'spin'),
    ('sorvete', 'rewards/sorvete.png', 'Sorvete!', 'wiggle'),
    ('pipoca', 'rewards/pipoca.png', 'Cinema?', 'bob'),
    ('chocolate', 'rewards/chocolate.png', 'Chocolate?', 'wiggle'),
]


def build(font_path):
    os.makedirs(OUT, exist_ok=True)
    made = []
    for sid, src, caption, anim in STICKERS:
        art = crop_alpha(Image.open(os.path.join(SRC, src)).convert('RGBA'))
        canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        top = bubble(canvas, caption, font_path, SIZE // 2)
        room_h = SIZE - top - 26
        scale = max(1, min(room_h // art.height, 400 // art.width))
        big = art.resize((art.width * scale, art.height * scale), Image.NEAREST)
        big = with_outline(big, 9)
        x = (SIZE - big.width) // 2
        y = SIZE - big.height - 4
        under = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        under.alpha_composite(big, (x, max(top - 30, y)))
        under.alpha_composite(canvas)
        under.save(os.path.join(OUT, f'{sid}.webp'), 'WEBP', quality=92, method=6)
        made.append({'id': sid, 'label': caption, 'anim': anim})
    anims = sorted({s['anim'] for s in made})
    with open(LIST, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('// Gerado por scripts/build-stickers.py. Não editar à mão.\n')
        fh.write('// Figurinhas da Conversa: arte do jogo com balão de fala, em public/assets/stickers/<id>.webp.\n\n')
        fh.write('export type StickerAnim = ' + ' | '.join(json.dumps(a) for a in anims) + ';\n\n')
        fh.write('export interface ChatSticker {\n  id: string;\n  label: string;\n  anim: StickerAnim;\n}\n\n')
        fh.write('export const CHAT_STICKERS: ChatSticker[] = [\n')
        for s in made:
            label = json.dumps(s['label'], ensure_ascii=False)
            fh.write(f"  {{ id: {json.dumps(s['id'])}, label: {label}, anim: {json.dumps(s['anim'])} }},\n")
        fh.write('];\n')
    cols, cell = 6, 200
    rows = (len(made) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * cell, rows * cell), (34, 30, 26, 255))
    for i, s in enumerate(made):
        im = Image.open(os.path.join(OUT, f"{s['id']}.webp")).resize((cell - 10, cell - 10), Image.LANCZOS)
        sheet.alpha_composite(im, ((i % cols) * cell + 5, (i // cols) * cell + 5))
    if os.environ.get('PRANCHA'):
        sheet.save(os.environ['PRANCHA'])
    print(f'{len(made)} figurinhas em {OUT}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('uso: python scripts/build-stickers.py <Fredoka.ttf>')
        sys.exit(1)
    build(sys.argv[1])
