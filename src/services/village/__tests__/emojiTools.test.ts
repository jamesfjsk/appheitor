import { expect, run, test } from '../../english/__tests__/harness';
import { CHAT_WALLPAPERS, chatEffectFor, notoKey, searchEmojis, splitEmojis, wallpaperById } from '../emojiTools';
import { NOTO_ANIMATED } from '../../../data/notoAnimated';
import { EMOJI_CATALOG } from '../../../data/emojiCatalog';

test('emoji animado: acha o código do Noto, com e sem o seletor de variação', () => {
  expect(notoKey('😂', NOTO_ANIMATED)).toBe('1f602');
  expect(notoKey('❤️', NOTO_ANIMATED) !== null).toBe(true);
  expect(notoKey('❤', NOTO_ANIMATED) !== null).toBe(true);
  expect(notoKey('🔥', NOTO_ANIMATED)).toBe('1f525');
  expect(notoKey('a', NOTO_ANIMATED)).toBe(null);
});

test('emoji: separa sem quebrar composto nem tom de pele', () => {
  expect(splitEmojis('❤️👍🏽')).toEqual(['❤️', '👍🏽']);
  expect(splitEmojis(' 😂 😂 ')).toEqual(['😂', '😂']);
  expect(splitEmojis('👨‍👩‍👧').length).toBe(1);
  expect(splitEmojis('')).toEqual([]);
});

test('busca em português, sem acento, todas as palavras', () => {
  expect(searchEmojis(EMOJI_CATALOG, 'kkk').includes('😂')).toBe(true);
  expect(searchEmojis(EMOJI_CATALOG, 'pizza')).toEqual(['🍕']);
  expect(searchEmojis(EMOJI_CATALOG, 'coracao').includes('❤️')).toBe(true);
  expect(searchEmojis(EMOJI_CATALOG, 'GATO').length > 2).toBe(true);
  expect(searchEmojis(EMOJI_CATALOG, '   ')).toEqual([]);
});

test('catálogo: sem bebida, cigarro, arma de fogo nem gesto feio, e com mais de mil emojis', () => {
  const all = new Set(EMOJI_CATALOG.flatMap((g) => g.emojis.map((x) => x.e)));
  for (const e of ['🍺', '🚬', '🖕', '🔫', '💣', '🍷']) if (all.has(e)) throw new Error('não podia estar: ' + e);
  expect(all.size > 1000).toBe(true);
  expect(all.has('⛏️') && all.has('💎') && all.has('⚽')).toBe(true);
});

test('efeito: um emoji só dispara a chuva; texto ou dois emojis não', () => {
  expect(chatEffectFor('🎉')).toEqual({ kind: 'confete', emoji: '🎉' });
  expect(chatEffectFor('❤')?.kind).toBe('coracoes');
  expect(chatEffectFor('🔥')?.kind).toBe('fogo');
  expect(chatEffectFor('🎉🎉')).toBe(null);
  expect(chatEffectFor('oi 🎉')).toBe(null);
  expect(chatEffectFor('🍕')).toBe(null);
});

test('fundos: ids únicos e o padrão é a pedra', () => {
  expect(new Set(CHAT_WALLPAPERS.map((w) => w.id)).size).toBe(CHAT_WALLPAPERS.length);
  expect(wallpaperById('nada').id).toBe('pedra');
  expect(wallpaperById('mina').image?.startsWith('/assets/')).toBe(true);
});

void run();
