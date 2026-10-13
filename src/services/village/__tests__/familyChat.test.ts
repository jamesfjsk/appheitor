import { expect, run, test } from '../../english/__tests__/harness';
import { canSend, chatClock, chatDayLabel, chatTimeLabel, cleanChatText, seenByOther, unreadFor, type ChatMessage } from '../familyChat';

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
});

void run();
