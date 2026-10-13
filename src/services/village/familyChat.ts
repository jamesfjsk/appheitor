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
}

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

/** "14:05" hoje, "ontem 14:05", ou "12/10 14:05", no horário de São Paulo. */
export function chatTimeLabel(iso: string, nowIso: string): string {
  if (!iso) return 'enviando...';
  const label = chatDayLabel(iso, nowIso);
  const time = chatClock(iso);
  if (label === 'Hoje') return time;
  if (label === 'Ontem') return `ontem ${time}`;
  return `${label} ${time}`;
}

