import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, run, test } from '../../english/__tests__/harness';
import { pickReserveQuiz, reserveFromRow, topUpReserve } from '../reserveFromRow';
import { validateQuestion } from '../validateQuestion';

test('reserveFromRow: linha nova guarda why e trap; a antiga copia a explanation', () => {
  const nova = reserveFromRow({
    id: 'M01',
    subject: 'matematica',
    skill: 'MAT.OP2',
    question: 'Quanto sobra?',
    options: ['15 reais', '19 reais', '25 reais', '36 reais'],
    answer: '15 reais',
    why: 'O troco é 15 reais porque a conta fecha em duas etapas e sobra esse valor.',
    trap: 'Quem marca 19 reais esqueceu uma das compras e parou na primeira conta.',
  });
  expect(nova?.why).not.toBe(nova?.trap);
  expect(nova?.explanation).toBe(nova?.why);
  expect(nova?.id).toBe('M01');
  expect(nova?.kind).toBe('knowledge');
  const antiga = reserveFromRow({
    category: 'geografia',
    question: 'Para onde corre o rio?',
    options: ['Desce', 'Sobe', 'Para', 'Some'],
    answer: 'Desce',
    explanation: 'A água desce porque a gravidade puxa o rio para o lugar mais baixo.',
  });
  expect(antiga?.why).toBe(antiga?.trap);
  expect(antiga?.subject).toBe('geografia');
  expect(antiga?.id).toBe(undefined);
});

test('as 60 do banco novo passam no validador e o why difere do trap', () => {
  const file = resolve('public/data/provaReserva.json');
  const rows = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>[];
  expect(rows.length).toBe(60);
  for (const row of rows) {
    const q = reserveFromRow(row);
    expect(q != null).toBe(true);
    expect(q?.why).not.toBe(q?.trap);
    const codes = validateQuestion(q ?? {}).filter((code) => code !== 'conta_nao_fecha');
    expect(codes).toEqual([]);
  }
});

test('prova offline: banco esgotado completa com as já vistas, 2 por área, nunca vazia', () => {
  const rows = JSON.parse(readFileSync(resolve('public/data/provaReserva.json'), 'utf8')) as Record<string, unknown>[];
  const all = rows.map((row) => reserveFromRow(row)).filter((q): q is NonNullable<typeof q> => q != null);
  const perArea = (list: typeof all) => {
    const counts = new Map<string, number>();
    for (const q of list) counts.set(String(q.subject), (counts.get(String(q.subject)) ?? 0) + 1);
    return Math.max(...counts.values());
  };
  const tresDeConta = all.filter((q) => q.subject === 'matematica').slice(9);
  expect(pickReserveQuiz(tresDeConta, 8)).toHaveLength(2);
  const cheia = topUpReserve(tresDeConta, all, 8);
  expect(cheia).toHaveLength(8);
  expect(cheia[0].question).toBe(tresDeConta[0].question);
  expect(perArea(cheia)).toBe(2);
  const esgotado = topUpReserve([], all, 8);
  expect(esgotado).toHaveLength(8);
  expect(perArea(esgotado)).toBe(2);
});

void run();
