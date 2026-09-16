import { expect, run, test } from '../../english/__tests__/harness';
import { addDays } from '../../../utils/clock';
import {
  cartOk,
  coachOf,
  emptyPick,
  goalOf,
  hookSlots,
  howOf,
  isWon,
  lookOf,
  scrambleCrates,
  sessionFor,
  sessionHash,
  toggleCrate,
  weigh,
  whyOf,
  winMasks,
} from '../cart';
import { sessionPay } from '../redstone';

test('pagamento da sessão continua 0 a 3 redstone, XP 5/7/9/11', () => {
  expect(sessionPay(0)).toEqual({ redstone: 0, xp: 5 });
  expect(sessionPay(3)).toEqual({ redstone: 3, xp: 11 });
});

test('sessão de 3 contas é estável e única no jeito de acertar', () => {
  const a = sessionFor('heitor', '2026-09-16', 1);
  const b = sessionFor('heitor', '2026-09-16', 1);
  expect(a).toHaveLength(3);
  expect(sessionHash(a)).toBe(sessionHash(b));
  expect(a.map((p) => p.stage)).toEqual([1, 2, 3]);
  for (const p of a) {
    expect(cartOk(p)).toBe(true);
    expect(p.crates.length >= 6 && p.crates.length <= 7).toBe(true);
    expect(p.target >= 10 && p.target <= 22).toBe(true);
    expect(winMasks(p)).toHaveLength(1);
    expect(isWon(p, emptyPick(p.crates.length))).toBe(false);
    const mash = p.crates.map(() => true);
    expect(isWon(p, mash)).toBe(false);
    expect(coachOf(p).includes('Etapa')).toBe(true);
    expect(coachOf(p).includes('Enviar')).toBe(true);
  }
});

test('três contas: soma, o que falta, exatamente 3 caixas', () => {
  const [p1, p2, p3] = sessionFor('heitor-vagoneta', '2026-09-16', 1);
  if (!p1 || !p2 || !p3) throw new Error('sessão incompleta');

  expect(p1.loaded).toBe(0);
  expect(p1.needCount).toBe(null);
  expect(goalOf(p1)).toBe(String(p1.target));
  const mask1 = winMasks(p1)[0] as number;
  let on = emptyPick(p1.crates.length);
  for (let i = 0; i < p1.crates.length; i++) {
    if (mask1 & (1 << i)) on = toggleCrate(on, i);
  }
  expect(isWon(p1, on)).toBe(true);
  expect(weigh(p1, on).count).toBeGreaterThanOrEqual(3);

  expect(p2.loaded).toBeGreaterThanOrEqual(2);
  expect(goalOf(p2)).toBe(String(p2.target));
  expect(isWon(p2, emptyPick(p2.crates.length))).toBe(false);
  const mask2 = winMasks(p2)[0] as number;
  let bits2 = 0;
  for (let i = 0; i < p2.crates.length; i++) if (mask2 & (1 << i)) bits2 += 1;
  expect(bits2).toBeGreaterThanOrEqual(2);
  expect(bits2).toBeLessThanOrEqual(3);
  expect(p2.crates.includes(p2.target - p2.loaded)).toBe(false);

  expect(hookSlots(p1)).toBe(4);
  expect(hookSlots(p2)).toBe(2);
  expect(hookSlots(p3)).toBe(p3.needCount ?? 3);

  expect([3, 4]).toContain(p3.needCount);
  expect(goalOf(p3)).toBe(String(p3.target));
  const mask3 = winMasks(p3)[0] as number;
  let bits = 0;
  for (let i = 0; i < p3.crates.length; i++) if (mask3 & (1 << i)) bits += 1;
  expect(bits).toBe(p3.needCount);

  const mash = p3.crates.map(() => true);
  expect(['contagem', 'Tombou', 'Faltou']).toContain(whyOf(p3, mash));
});

test('peso escondido até Enviar; HUD não conta a conta', () => {
  const [p1] = sessionFor('heitor-vagoneta', '2026-09-16', 1);
  if (!p1) throw new Error('sem etapa 1');
  const idle = emptyPick(p1.crates.length);
  expect(lookOf(p1, idle, false)).toBe('O peso só aparece quando a vagoneta sai.');
  const ban = `${coachOf(p1)} ${goalOf(p1)} ${howOf(p1).map((c) => c.label).join(' ')}`;
  expect(ban.includes('anel')).toBe(false);
  expect(ban.includes('puxa as duas')).toBe(false);
});

test('90 dias × 3 níveis: cartOk e hash único em 60 dias', () => {
  const uid = 'heitor-cart';
  const start = '2026-09-16';
  for (const level of [1, 6, 12]) {
    const hashes: string[] = [];
    for (let d = 0; d < 90; d++) {
      const date = addDays(start, d);
      const session = sessionFor(uid, date, level);
      expect(session).toHaveLength(3);
      for (const p of session) expect(cartOk(p)).toBe(true);
      const h = sessionHash(session);
      const window = hashes.slice(Math.max(0, hashes.length - 59));
      const dup = window.indexOf(h);
      if (dup >= 0) throw new Error(`sessão repetida nível ${level} dia ${d}`);
      hashes.push(h);
    }
  }
});

test('isca e sem atalho de macaco; segunda tentativa só troca o lugar', () => {
  const a = sessionFor('heitor-cart-smart', '2026-09-16', 1);
  const b = sessionFor('heitor-cart-smart', '2026-09-17', 1);
  expect(sessionHash(a)).not.toBe(sessionHash(b));
  const [p1] = a;
  if (!p1) throw new Error('sem etapa 1');
  const mixed = scrambleCrates(p1, 'try1');
  expect([...mixed.crates].sort((x, y) => x - y).join(',')).toBe([...p1.crates].sort((x, y) => x - y).join(','));
  expect(winMasks(mixed)).toHaveLength(1);
  const valuesA = a.map((p) => `${p.target}:${[...p.crates].sort((x, y) => x - y).join(',')}`);
  const valuesB = b.map((p) => `${p.target}:${[...p.crates].sort((x, y) => x - y).join(',')}`);
  expect(valuesA.join('|')).not.toBe(valuesB.join('|'));
});

void run();
