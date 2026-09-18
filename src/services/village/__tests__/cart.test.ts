import { expect, run, test } from '../../english/__tests__/harness';
import { addDays } from '../../../utils/clock';
import {
  CART_TRY_MS,
  askOf,
  cartBand,
  cartCap,
  cartOk,
  cartSkill,
  closeOf,
  coachOf,
  emptyPick,
  goalOf,
  hitchOf,
  hookSlots,
  howOf,
  isWon,
  lookOf,
  sayOf,
  scrambleCrates,
  sessionFor,
  sessionHash,
  toggleCrate,
  weigh,
  whyOf,
  winMasks,
} from '../cart';
import { sessionMarks, sessionPay } from '../redstone';

test('pagamento da sessão continua 0 a 3 redstone, XP 5/7/9/11', () => {
  expect(sessionPay(0)).toEqual({ redstone: 0, xp: 5 });
  expect(sessionPay(3)).toEqual({ redstone: 3, xp: 11 });
  expect(sessionMarks(0).redstoneDone).toBe(0);
  expect(sessionMarks(0).ferreiro).toBe(0);
  expect(sessionMarks(3).redstonePerfect).toBe(1);
  expect(sessionMarks(3).ferreiro).toBe(3);
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
  expect(askOf(p2).startsWith('Fecha')).toBe(true);
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
  const ban = `${coachOf(p1)} ${goalOf(p1)} ${howOf(p1).map((c) => c.label).join(' ')} ${askOf(p1)}`;
  expect(ban.includes('anel')).toBe(false);
  expect(ban.includes('puxa as duas')).toBe(false);
  expect(askOf(p1).includes(String(p1.target))).toBe(true);
  expect(askOf(p1).startsWith('Me traz')).toBe(true);
  const mash = p1.crates.map(() => true);
  const sum = weigh(p1, mash).sum;
  const rib0 = sayOf(p1, 'Tombou', sum, 0);
  const rib1 = sayOf(p1, 'Tombou', sum, 1);
  expect(rib0.includes(String(sum))).toBe(true);
  expect(rib1.includes(String(sum))).toBe(true);
  expect(rib0).not.toBe(rib1);
  expect(sayOf(p1, 'ask').includes(String(sum))).toBe(false);
  expect(sayOf(p1, 'win', p1.target, 0).includes(String(p1.target))).toBe(true);
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

test('pavio curto demais pra calculadora e longo o bastante pra contar de cabeça', () => {
  expect(CART_TRY_MS).toBeGreaterThanOrEqual(20_000);
  expect(CART_TRY_MS).toBeLessThanOrEqual(30_000);
});

test('nível e maestria juntos: sem oficina fica na soma mesmo no 30', () => {
  expect(cartCap(1)).toBe(0);
  expect(cartCap(5)).toBe(1);
  expect(cartCap(10)).toBe(2);
  expect(cartCap(20)).toBe(3);
  expect(cartCap(30)).toBe(4);
  expect(cartSkill(0, 0)).toBe(0);
  expect(cartSkill(2, 0)).toBe(1);
  expect(cartSkill(5, 0)).toBe(2);
  expect(cartSkill(10, 2)).toBe(3);
  expect(cartSkill(18, 5)).toBe(4);
  expect(cartBand(30)).toBe(0);
  expect(cartBand(4, { redstoneDone: 18, redstonePerfect: 5 })).toBe(0);
  expect(cartBand(30, { redstoneDone: 18, redstonePerfect: 5 })).toBe(4);
  expect(closeOf(null)).toBe('Já foi hoje. Amanhã tem mais.');
  expect(closeOf(3).includes('Amanhã')).toBe(true);
  expect(closeOf(0).includes('Amanhã')).toBe(true);
  expect(closeOf(1).includes('Amanhã')).toBe(true);
  const low = sessionFor('heitor-band', '2026-09-16', 1);
  expect(low.every((p) => p.kind === 'sum')).toBe(true);
  const mid = sessionFor('heitor-band', '2026-09-16', 10, { redstoneDone: 5 });
  expect(mid.some((p) => p.kind === 'product')).toBe(true);
  expect(mid.some((p) => askOf(p) === 'Vezes.')).toBe(true);
  const hi = sessionFor('heitor-band', '2026-09-16', 20, { redstoneDone: 10, redstonePerfect: 2 });
  expect(hi.some((p) => p.kind === 'divide')).toBe(true);
  const div = hi.find((p) => p.kind === 'divide');
  if (!div) throw new Error('sem divisão');
  expect(askOf(div).includes('monte')).toBe(true);
  expect(askOf(div).includes('Me traz')).toBe(false);
  const top = sessionFor('heitor-band', '2026-09-16', 30, { redstoneDone: 18, redstonePerfect: 5 });
  expect(top.some((p) => p.kind === 'logic')).toBe(true);
  for (const p of [...low, ...mid, ...hi, ...top]) {
    expect(cartOk(p)).toBe(true);
    expect(isWon(p, emptyPick(p.crates.length))).toBe(false);
    expect(isWon(p, p.crates.map(() => true))).toBe(false);
  }
  const prod = mid.find((p) => p.kind === 'product');
  if (!prod) throw new Error('sem produto');
  const mask = winMasks(prod)[0] as number;
  let on = emptyPick(prod.crates.length);
  for (let i = 0; i < prod.crates.length; i++) if (mask & (1 << i)) on = toggleCrate(on, i);
  expect(hitchOf(prod, on).product).toBe(prod.target);
  expect(isWon(prod, on)).toBe(true);
});

test('catálogo de lógica tem várias regras, não só ímpar e sem o 5', () => {
  const seen = new Set<string>();
  const start = '2026-09-16';
  for (let d = 0; d < 30; d++) {
    const session = sessionFor('heitor-logic-cat', addDays(start, d), 30, { redstoneDone: 18, redstonePerfect: 5 });
    const logic = session.find((p) => p.kind === 'logic');
    if (!logic) throw new Error(`sem lógica no dia ${d}`);
    expect(cartOk(logic)).toBe(true);
    expect(logic.rule).toBeTruthy();
    if (logic.rule) seen.add(logic.rule);
    const ask = askOf(logic);
    expect(ask.startsWith('Me traz')).toBe(true);
    expect(ask.includes(String(logic.target))).toBe(true);
  }
  expect(seen.size >= 4).toBe(true);
});

void run();
