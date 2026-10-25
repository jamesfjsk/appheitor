// Emojis da Conversa (25/10/2026): animação do Noto, busca em português, efeitos e fundos.
// Puro: sem Firebase e sem DOM.

export interface EmojiEntryLike {
  e: string;
  k: string;
}

export interface EmojiGroupLike {
  id: string;
  label: string;
  emojis: EmojiEntryLike[];
}

/** Código do emoji no Noto Emoji Animation ("1f602", "2764_fe0f"), ou null quando não tem animação. */
export function notoKey(emoji: string, animated: ReadonlySet<string>): string | null {
  const cps = [...emoji].map((c) => (c.codePointAt(0) ?? 0).toString(16));
  const exact = cps.join('_');
  if (animated.has(exact)) return exact;
  const bare = cps.filter((c) => c !== 'fe0f').join('_');
  if (animated.has(bare)) return bare;
  if (animated.has(`${bare}_fe0f`)) return `${bare}_fe0f`;
  return null;
}

export const notoLottieUrl = (key: string): string => `https://fonts.gstatic.com/s/e/notoemoji/latest/${key}/lottie.json`;

/** Separa "❤️👍🏽" em ["❤️", "👍🏽"], sem quebrar emoji composto. */
export function splitEmojis(text: string): string[] {
  const t = text.replace(/\s+/g, '');
  if (!t) return [];
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: 'grapheme' }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return [...new Seg('pt', { granularity: 'grapheme' }).segment(t)].map((s) => s.segment);
  return t.match(/\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?)*|./gu) ?? [];
}

const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Busca em português: todas as palavras digitadas precisam aparecer ("gato bravo"). */
export function searchEmojis(groups: EmojiGroupLike[], query: string, limit = 120): string[] {
  const parts = plain(query).split(/\s+/).filter(Boolean);
  if (!parts.length) return [];
  const out: string[] = [];
  for (const g of groups) {
    for (const it of g.emojis) {
      const hay = ` ${it.k} `;
      if (parts.every((p) => hay.includes(` ${p}`))) {
        out.push(it.e);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

export type ChatEffect = 'confete' | 'coracoes' | 'fogo' | 'risos' | 'estrelas';

const EFFECTS: Array<[ChatEffect, string[]]> = [
  ['confete', ['🎉', '🥳', '🎊', '🎂', '🏆', '🥇']],
  ['coracoes', ['❤️', '😍', '🥰', '😘', '💕', '💖', '💗', '💓', '💞', '💘', '💝', '🧡', '💛', '💚', '💙', '💜']],
  ['fogo', ['🔥', '💥', '🚀']],
  ['risos', ['😂', '🤣', '😆', '😹']],
  ['estrelas', ['⭐', '🌟', '✨', '💫', '🤩', '💎', '💯']],
];

/** Mensagem só com um destes emojis enche a tela com o efeito dele (como o Telegram). */
export function chatEffectFor(text: string): { kind: ChatEffect; emoji: string } | null {
  const list = splitEmojis(text);
  if (list.length !== 1) return null;
  const e = list[0];
  const bare = e.replace(/️/g, '');
  for (const [kind, set] of EFFECTS) {
    if (set.some((x) => x.replace(/️/g, '') === bare)) return { kind, emoji: e };
  }
  return null;
}

/** Peças que voam no efeito: o próprio emoji e uns parceiros. */
export function effectPieces(kind: ChatEffect, emoji: string): string[] {
  switch (kind) {
    case 'confete':
      return [emoji, '🎉', '🎊', '✨', '⭐'];
    case 'coracoes':
      return [emoji, '❤️', '💖', '💕'];
    case 'fogo':
      return [emoji, '🔥', '✨'];
    case 'risos':
      return [emoji, '😂', '🤣'];
    case 'estrelas':
      return [emoji, '⭐', '✨', '🌟'];
  }
}

export interface ChatWallpaper {
  id: string;
  label: string;
  /** imagem do jogo; sem ela o fundo é só CSS (classe .wall-<id>) */
  image?: string;
}

export const CHAT_WALLPAPERS: ChatWallpaper[] = [
  { id: 'pedra', label: 'Pedra' },
  { id: 'mina', label: 'Mina', image: '/assets/village/scenes/tunel/backdrop-a.png' },
  { id: 'vila', label: 'Vila', image: '/assets/village/scene/backdrop-day.png' },
  { id: 'loja', label: 'Comerciante', image: '/assets/village/scenes/comerciante/backdrop.png' },
  { id: 'noite', label: 'Noite estrelada' },
  { id: 'espaco', label: 'Espaço' },
  { id: 'oceano', label: 'Oceano' },
  { id: 'floresta', label: 'Floresta' },
  { id: 'nether', label: 'Nether' },
  { id: 'doce', label: 'Doce' },
  { id: 'foto', label: 'Sua foto' },
];

export const wallpaperById = (id: string | null | undefined): ChatWallpaper =>
  CHAT_WALLPAPERS.find((w) => w.id === id) ?? CHAT_WALLPAPERS[0];
