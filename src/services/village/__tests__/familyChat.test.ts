import { expect, run, test } from '../../english/__tests__/harness';
import { CHAT_REACTIONS, EMOJI_GROUPS, canSend, chatClock, chatDayLabel, chatGroup, chatTimeLabel, lastSeenLine, cleanChatText, insertAtCaret, isEmojiOnly, seenByOther, unreadFor, type ChatMessage } from '../familyChat';

const msg = (id: string, from: 'pai' | 'filho', at: string, text = 'oi'): ChatMessage => ({ id, from, text, at, via: 'app' });

test('conversa: texto limpo, sem espaço sobrando e com teto', () => {
  expect(cleanChatText('  oi pai  \r\n\r\n\r\n\r\ntudo bem? ')).toBe('oi pai\n\ntudo bem?');
  expect(cleanChatText('a'.repeat(1200)).length).toBe(1000);
  expect(canSend('   ', false)).toBe(false);
  expect(canSend('   ', true)).toBe(true);
});

test('conversa: não lidas são as do outro lado depois da última leitura', () => {
  const list = [
    msg('1', 'pai', '2026-10-13T10:00:00.000Z'),
    msg('2', 'filho', '2026-10-13T10:05:00.000Z'),
    msg('3', 'pai', '2026-10-13T11:00:00.000Z'),
    msg('4', 'pai', ''),
  ];
  expect(unreadFor(list, 'filho', '2026-10-13T10:30:00.000Z')).toBe(1);
  expect(unreadFor(list, 'filho', undefined)).toBe(2);
  expect(unreadFor(list, 'pai', '2026-10-13T10:00:00.000Z')).toBe(1);
  expect(seenByOther(list, 'filho', '2026-10-13T10:06:00.000Z')).toBe(true);
  expect(seenByOther(list, 'filho', '2026-10-13T10:01:00.000Z')).toBe(false);
});

test('conversa: hora no fuso de São Paulo, ontem e outro dia', () => {
  const now = '2026-10-13T18:00:00.000Z';
  expect(chatTimeLabel('2026-10-13T17:05:00.000Z', now)).toBe('14:05');
  expect(chatTimeLabel('2026-10-12T17:05:00.000Z', now)).toBe('ontem 14:05');
  expect(chatTimeLabel('2026-10-10T17:05:00.000Z', now)).toBe('10/10 14:05');
  expect(chatTimeLabel('', now)).toBe('enviando...');
  expect(chatDayLabel('2026-10-13T02:30:00.000Z', now)).toBe('Ontem');
  expect(chatDayLabel('2026-10-13T03:30:00.000Z', now)).toBe('Hoje');
  expect(chatDayLabel('2026-10-01T15:00:00.000Z', now)).toBe('01/10');
  expect(chatClock('2026-10-13T02:30:00.000Z')).toBe('23:30');
  expect(lastSeenLine('2026-10-13T17:05:00.000Z', now)).toBe('viu hoje às 14:05');
  expect(lastSeenLine('2026-10-12T17:05:00.000Z', now)).toBe('viu ontem às 14:05');
  expect(lastSeenLine('2026-10-01T17:05:00.000Z', now)).toBe('viu em 01/10');
  expect(lastSeenLine(undefined, now)).toBe('ainda não abriu a conversa');
});

test('conversa: só emoji aparece grande; texto com emoji não', () => {
  expect(isEmojiOnly('😂')).toBe(true);
  expect(isEmojiOnly('❤️ 👍')).toBe(true);
  expect(isEmojiOnly('👍🏽')).toBe(true);
  expect(isEmojiOnly('😀😀😀😀')).toBe(false);
  expect(isEmojiOnly('oi 😀')).toBe(false);
  expect(isEmojiOnly('123')).toBe(false);
  expect(isEmojiOnly('')).toBe(false);
  for (const g of EMOJI_GROUPS) for (const e of g.emojis) if (!isEmojiOnly(e)) throw new Error('emoji da lista não reconhecido: ' + e);
  for (const e of CHAT_REACTIONS) expect(isEmojiOnly(e)).toBe(true);
});

test('conversa: emoji entra onde está o cursor', () => {
  expect(insertAtCaret('oi pai', 2, 2, ' 😀')).toEqual({ text: 'oi 😀 pai', caret: 5 });
  expect(insertAtCaret('oi pai', 3, 6, '❤️')).toEqual({ text: 'oi ❤️', caret: 5 });
  expect(insertAtCaret('', 9, 9, '👍').text).toBe('👍');
});

test('conversa: mensagens seguidas do mesmo lado formam grupo', () => {
  const list = [
    msg('1', 'pai', '2026-10-25T10:00:00.000Z'),
    msg('2', 'pai', '2026-10-25T10:02:00.000Z'),
    msg('3', 'pai', '2026-10-25T10:30:00.000Z'),
    msg('4', 'filho', '2026-10-25T10:31:00.000Z'),
  ];
  expect(chatGroup(list, 0)).toEqual({ first: true, last: false });
  expect(chatGroup(list, 1)).toEqual({ first: false, last: true });
  expect(chatGroup(list, 2)).toEqual({ first: true, last: true });
  expect(chatGroup(list, 3)).toEqual({ first: true, last: true });
});

void run();
