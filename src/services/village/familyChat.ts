// Conversa do pai com o Heitor (pedido do pai, 13/10/2026: "estou viajando e ele não tem telefone").
// Puro: sem Firebase. O serviço está em src/services/familyChatService.ts.

export type ChatSide = 'pai' | 'filho';
export type ChatVia = 'painel' | 'app' | 'telegram';

export interface ChatImage {
  path: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  from: ChatSide;
  text: string;
  image?: ChatImage;
  /** ISO; vazio enquanto o servidor não carimbou */
  at: string;
  via: ChatVia;
  /** Reação de quem recebeu: o filho reage às do pai, o pai às do filho */
  reaction?: string;
  /** Figurinha do jogo: public/assets/stickers/<id>.webp */
  sticker?: string;
  /** Figurinha do Telegram que o pai mandou, guardada no Storage */
  tgSticker?: TgSticker;
}

export interface TgSticker {
  kind: 'image' | 'lottie' | 'video';
  url: string;
  emoji?: string;
}

export const STICKER_ID = /^[a-z0-9-]{1,40}$/;
export const stickerUrl = (id: string): string => `/assets/stickers/${id}.webp`;

export const CHAT_MAX_CHARS = 1000;
export const CHAT_PAGE = 80;

/** Texto limpo: sem espaço sobrando e no máximo 1000 caracteres. */
export function cleanChatText(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, CHAT_MAX_CHARS);
}

export function canSend(text: string, hasImage: boolean): boolean {
  return cleanChatText(text).length > 0 || hasImage;
}

/** Mensagens do outro lado depois da última leitura de quem está olhando. */
export function unreadFor(messages: ChatMessage[], side: ChatSide, readAt: string | undefined): number {
  return messages.filter((m) => m.from !== side && m.at && (!readAt || m.at > readAt)).length;
}

/** A última mensagem que ele mandou já foi lida pelo outro lado? */
export function seenByOther(messages: ChatMessage[], side: ChatSide, otherReadAt: string | undefined): boolean {
  const mine = [...messages].reverse().find((m) => m.from === side);
  return Boolean(mine && mine.at && otherReadAt && otherReadAt >= mine.at);
}

const pad = (n: number) => String(n).padStart(2, '0');
const toSp = (s: string) => new Date(new Date(s).getTime() - 3 * 3600 * 1000);
const dayKey = (x: Date) => `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;

/** Dia da mensagem no horário de São Paulo, "2026-10-13"; vazio enquanto envia. */
export function chatDay(iso: string): string {
  return iso ? dayKey(toSp(iso)) : '';
}

/** "14:05" no horário de São Paulo. */
export function chatClock(iso: string): string {
  if (!iso) return 'enviando...';
  const d = toSp(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Separador da conversa: "Hoje", "Ontem" ou "10/10". */
export function chatDayLabel(iso: string, nowIso: string): string {
  const day = chatDay(iso);
  if (!day || day === chatDay(nowIso)) return 'Hoje';
  if (day === dayKey(new Date(toSp(nowIso).getTime() - 24 * 3600 * 1000))) return 'Ontem';
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

/** Linha do topo da conversa: quando o outro lado olhou por último. */
export function lastSeenLine(iso: string | undefined, nowIso: string): string {
  if (!iso) return 'ainda não abriu a conversa';
  const label = chatDayLabel(iso, nowIso);
  if (label === 'Hoje') return `viu hoje às ${chatClock(iso)}`;
  if (label === 'Ontem') return `viu ontem às ${chatClock(iso)}`;
  return `viu em ${label}`;
}

/** "14:05" hoje, "ontem 14:05", ou "12/10 14:05", no horário de São Paulo. */
export function chatTimeLabel(iso: string, nowIso: string): string {
  if (!iso) return 'enviando...';
  const label = chatDayLabel(iso, nowIso);
  const time = chatClock(iso);
  if (label === 'Hoje') return time;
  if (label === 'Ontem') return `ontem ${time}`;
  return `${label} ${time}`;
}

// Emojis e reações (pedido do pai, 25/10/2026: "opção de emoticon" e "mais moderno").
// A mesma lista vale para o filho e para o painel. As reações são as que o robô do Telegram também consegue pôr.

export const CHAT_REACTIONS = ['❤️', '👍', '🤣', '😱', '😢', '🔥'] as const;

export const EMOJI_GROUPS: Array<{ id: string; label: string; emojis: string[] }> = [
  {
    id: 'caras',
    label: 'Carinhas',
    emojis: ['😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😜', '🤪', '😇', '🤗', '🤔', '😮', '😱', '😢', '😭', '😴', '😡', '🤯', '🙃', '😅'],
  },
  {
    id: 'gestos',
    label: 'Gestos',
    emojis: ['👍', '👎', '👏', '🙌', '🙏', '💪', '✌️', '👋', '🤝', '👊', '❤️', '💙', '💚', '💛', '💜', '🔥', '⭐', '✨', '💯', '🎉', '✅', '❌', '❓', '💤'],
  },
  {
    id: 'coisas',
    label: 'Coisas',
    emojis: ['⚽', '🎮', '📚', '✏️', '🍕', '🍔', '🍟', '🍦', '🍫', '🍎', '🐶', '🐱', '🦖', '🐉', '🚀', '✈️', '🏠', '☀️', '🌙', '🌧️', '⛏️', '💎', '🏆', '🎁'],
  },
];

const EMOJI_ONLY = /^(?:\s*\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*){1,3}\s*$/u;

/** Só emoji (até 3): a mensagem aparece grande, sem balão. */
export function isEmojiOnly(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && EMOJI_ONLY.test(t);
}

/** Põe o emoji onde está o cursor e devolve onde o cursor fica. */
export function insertAtCaret(text: string, start: number, end: number, insert: string): { text: string; caret: number } {
  const a = Math.max(0, Math.min(start, text.length));
  const b = Math.max(a, Math.min(end, text.length));
  const next = (text.slice(0, a) + insert + text.slice(b)).slice(0, CHAT_MAX_CHARS);
  return { text: next, caret: Math.min(a + insert.length, next.length) };
}

const GROUP_GAP_MS = 5 * 60 * 1000;

/** Mensagens seguidas do mesmo lado, no mesmo dia e com até 5 minutos entre elas formam um grupo. */
export function chatGroup(messages: ChatMessage[], i: number): { first: boolean; last: boolean } {
  const same = (a: ChatMessage | undefined, b: ChatMessage | undefined): boolean => {
    if (!a || !b || a.from !== b.from) return false;
    if (!a.at || !b.at) return true;
    if (chatDay(a.at) !== chatDay(b.at)) return false;
    return Math.abs(new Date(b.at).getTime() - new Date(a.at).getTime()) <= GROUP_GAP_MS;
  };
  return { first: !same(messages[i - 1], messages[i]), last: !same(messages[i], messages[i + 1]) };
}
