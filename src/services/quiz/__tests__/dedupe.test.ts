import { expect, run, test } from '../../english/__tests__/harness';
import { QUIZ_THEMES } from '../../../config/quizCurriculum';
import { addDays } from '../../../utils/clock';
import { buildPrompt } from '../dailyPrompt';
import { avoidQuestionsFromRecent, dropRepeated, isRepeatedQuestion, nearDuplicate } from '../dedupe';
import { normalizeQuestion } from '../hash';
import { prepareTodayThenTomorrow } from '../prefetch';

const PAIRS = [
  {
    name: '2026-09-23 Q7 / 2026-09-24 Q6',
    subject: 'ciências',
    a: 'O que aconteceria se o Sol parasse de emitir luz e calor?',
    b: 'O que aconteceria se o Sol parasse de emitir luz e calor?',
  },
  {
    name: '2026-09-23 Q8 / 2026-09-24 Q7',
    subject: 'inglês',
    a: "Choose the correct sentence: 'They ___ playing soccer in the park.'",
    b: "Choose the correct sentence: 'They ___ playing soccer in the park.'",
  },
  {
    name: '2026-10-06 Q6 / 2026-10-26 Q3',
    subject: 'futebol',
    a: 'Qual é a função do bandeirinha em um jogo de futebol?',
    b: 'Qual é a função do bandeirinha em um jogo de futebol?',
  },
  {
    name: '2026-10-10 Q1 / 2026-10-24 Q6',
    subject: 'tema',
    a: 'Qual planeta fica entre a Terra e Júpiter na ordem de distância do Sol?',
    b: 'Qual planeta fica entre a Terra e Júpiter na ordem de distância do Sol?',
  },
  {
    name: '2026-11-16 Q7 / 2026-11-20 Q4',
    subject: 'matematica',
    a: 'Se um time de futebol ganha 3 pontos por vitória e 1 ponto por empate, quantos pontos ele tem após 3 vitórias e 2 empates?',
    b: 'Se um time de futebol ganha 3 pontos por vitória e 1 ponto por empate, quantos pontos ele tem após 4 vitórias e 1 empate?',
  },
  {
    name: '2026-11-08 Q4 / 2026-11-08 Q5',
    subject: 'matematica',
    a: 'Se uma sequência começa com 3 e cada número seguinte é o dobro do anterior, qual é o quarto número?',
    b: 'Se uma sequência começa com 5 e cada número seguinte é o triplo do anterior, qual é o quarto número?',
  },
  {
    name: '2026-10-23 Q3 / 2026-11-02 Q4',
    subject: 'matematica',
    a: 'Se você tem 300 reais e compra dois jogos de 120 reais cada, quanto sobra?',
    b: 'Se você tem 200 reais e compra dois brinquedos de 75 reais cada, quanto sobra?',
  },
  {
    name: '2026-09-20 Q6 / 2026-10-29 Q5',
    subject: 'inglês',
    a: 'Which sentence is correct?',
    b: 'Which sentence is correct?',
  },
];

const CROSS = [
  {
    name: '2026-10-08 Q4 geral / 2026-10-22 Q7 tema',
    a: { subject: 'geral', question: "Ache o erro: 'Hércules era famoso pela sua força e cumpriu dez trabalhos quase impossíveis.'" },
    b: { subject: 'tema', question: "Ache o erro: 'Hércules era famoso pela sua força e cumpriu dez trabalhos quase impossíveis.'" },
  },
  {
    name: '2026-10-08 Q6 geral / 2026-10-22 Q6 matematica',
    a: { subject: 'geral', question: 'Heitor tem o triplo da idade do primo. Juntos, eles têm 16 anos. Qual é a idade do primo?' },
    b: { subject: 'matematica', question: 'Heitor tem o triplo da idade do primo. Juntos, eles têm 16 anos. Qual é a idade do primo?' },
  },
  {
    name: '2026-10-07 Q8 geral / 2026-10-20 Q7 tema',
    a: { subject: 'geral', question: 'Qual frase é verdadeira sobre os rios?' },
    b: { subject: 'tema', question: 'Qual frase é verdadeira sobre o Sol?' },
  },
  {
    name: '2026-09-21 Q7 futebol / 2026-12-10 Q2 ciencias',
    a: { subject: 'futebol', question: 'Durante um jogo de futebol, se um jogador está impedido, o que acontece?' },
    b: { subject: 'ciencias', question: 'Durante um jogo de futebol, a bola está molhada. O que acontece com ela?' },
  },
];

test('normalizeQuestion junta acento, pontuação e espaços', () => {
  expect(normalizeQuestion('Ação?')).toBe('acao');
  expect(normalizeQuestion('  AÇÃO!!! ')).toBe(normalizeQuestion('acao'));
  expect(normalizeQuestion('Qual é a função?')).toBe('qual e a funcao');
});

test('8 pares reais da conta de teste são quase iguais', () => {
  for (const pair of PAIRS) {
    const hit = nearDuplicate(
      { subject: pair.subject, question: pair.a },
      { subject: pair.subject, question: pair.b },
    );
    expect(hit).toBe(true);
  }
});

test('4 pares de assuntos diferentes passam', () => {
  for (const pair of CROSS) {
    expect(nearDuplicate(pair.a, pair.b)).toBe(false);
  }
});

test('hash dos últimos 180 dias e quase igual dos 60 mais novos viram repetida', () => {
  const sun = 'O que aconteceria se o Sol parasse de emitir luz e calor?';
  const old = { date: '2026-04-01', subject: 'ciencias', question: sun, n: 1 };
  expect(isRepeatedQuestion({ subject: 'ciencias', question: sun }, [old], '2026-09-23')).toBe(true);
  const fillers = Array.from({ length: 60 }, (_, i) => ({
    date: addDays('2026-09-22', 0),
    subject: 'historia',
    question: `Pergunta recente número ${i} sobre um fato bem diferente da conta`,
    n: i + 1,
  }));
  const buried = { date: '2026-01-02', subject: 'matematica', question: PAIRS[6].a, n: 1 };
  const bank = [...fillers, buried];
  expect(isRepeatedQuestion({ subject: 'matematica', question: PAIRS[6].b }, bank, '2026-09-23')).toBe(false);
  const recentTwin = { date: '2026-09-20', subject: 'matematica', question: PAIRS[6].a, n: 3 };
  expect(isRepeatedQuestion(
    { subject: 'matematica', question: PAIRS[6].b },
    [recentTwin, ...fillers.slice(0, 10)],
    '2026-09-23',
  )).toBe(true);
});

test('repetida sai do lote e o buraco pede a reserva', () => {
  const sun = PAIRS[0].a;
  const other = { question: 'Uma pergunta nova sobre a chuva na vila', subject: 'ciencias' };
  const bank = [{ date: '2026-09-01', subject: 'ciências', question: sun }];
  const out = dropRepeated([
    { question: sun, subject: 'ciencias' },
    other,
  ], bank, '2026-09-23');
  expect(out.kept).toHaveLength(1);
  expect(out.kept[0].question).toBe(other.question);
  expect(out.rejected).toEqual([{ n: 1, reasons: ['repetida'] }]);
});

test('os 60 enunciados do prompt são os 60 mais novos de 100', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({
    date: addDays('2026-01-01', i),
    questions: [`hash-${String(i).padStart(3, '0')}`],
  }));
  const avoid = avoidQuestionsFromRecent(items, 60);
  expect(avoid).toHaveLength(60);
  expect(avoid[0]).toBe('hash-099');
  expect(avoid[59]).toBe('hash-040');
  const prompt = buildPrompt({
    seed: QUIZ_THEMES[0],
    count: 8,
    spare: 3,
    age: 10,
    weekday: 1,
    englishLevel: 1,
    avoidHashes: avoid,
  });
  for (let i = 40; i < 100; i++) expect(prompt.includes(`hash-${String(i).padStart(3, '0')}`)).toBe(true);
  for (let i = 0; i < 40; i++) expect(prompt.includes(`hash-${String(i).padStart(3, '0')}`)).toBe(false);
});

test('P1.8: o avoid da segunda chamada contém os enunciados da primeira', async () => {
  const calls: string[][] = [];
  const saved = new Map<string, string[]>();
  const ensure = async (date: string, today: string) => {
    const recent = [...saved.entries()]
      .filter(([d]) => d <= today)
      .map(([d, questions]) => ({ date: d, questions }));
    const avoid = avoidQuestionsFromRecent(recent, 60);
    calls.push(avoid);
    const questions = [`Enunciado da prova ${date} sobre a água fervendo na panela`];
    saved.set(date, questions);
  };
  await prepareTodayThenTomorrow({
    needsToday: true,
    prepare: () => ensure('2026-09-23', '2026-09-23'),
    prefetchTomorrow: () => ensure('2026-09-24', '2026-09-23'),
  });
  expect(calls).toHaveLength(2);
  expect(calls[0]).toHaveLength(0);
  expect(calls[1].some((q) => q.includes('2026-09-23'))).toBe(true);
});

void run();
