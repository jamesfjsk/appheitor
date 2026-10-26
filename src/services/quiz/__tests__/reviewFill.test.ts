import { expect, run, test } from '../../english/__tests__/harness';
import { REVIEW_MIN_DAYS, reviewCandidates } from '../reviewFill';

const row = (date: string, question: string, extra: Record<string, unknown> = {}) => ({
  date,
  question,
  options: ['A', 'B', 'C', 'D'],
  answer: 'B',
  why: 'Porque B é a resposta certa com uma explicação longa o bastante para passar no banco.',
  trap: 'Quem marca A esqueceu de olhar a segunda parte da pergunta e parou no meio da conta.',
  subject: 'ciências',
  kind: 'knowledge',
  correct: true,
  ...extra,
});

test('revisão: só perguntas de 30 dias ou mais, as erradas primeiro', () => {
  expect(REVIEW_MIN_DAYS).toBe(30);
  const out = reviewCandidates([
    row('2026-09-01', 'Por que o gelo boia na água?'),
    row('2026-09-10', 'Qual planeta é o maior do sistema solar?', { correct: false }),
    row('2026-10-20', 'Quantas patas tem uma aranha?', { correct: false }),
    row('2026-08-20', 'De onde vem a chuva?', { correct: false }),
  ], '2026-10-26');
  expect(out.map((q) => q.question)).toEqual([
    'De onde vem a chuva?',
    'Qual planeta é o maior do sistema solar?',
    'Por que o gelo boia na água?',
  ]);
});

test('revisão: o que caiu de novo há pouco, a lição, o dilema e o que já está na prova ficam fora', () => {
  const out = reviewCandidates([
    row('2026-09-01', 'Por que o gelo boia na água?'),
    row('2026-10-22', 'Por que o gelo boia na água?'),
    row('2026-09-01', 'Qual é a ideia de hoje?', { kind: 'lesson' }),
    row('2026-09-01', 'Qual atitude é a mais justa?', { kind: 'dilemma' }),
    row('2026-09-02', 'Quem inventou o avião?'),
    row('2026-09-03', 'Pergunta sem resposta nas opções?', { answer: 'Z' }),
  ], '2026-10-26', ['Quem inventou o avião?']);
  expect(out.length).toBe(0);
});

test('revisão: a mesma pergunta respondida duas vezes entra uma vez só', () => {
  const out = reviewCandidates([
    row('2026-08-01', 'De onde vem a chuva?', { correct: false }),
    row('2026-09-01', 'De onde vem a chuva?', { correct: true }),
  ], '2026-10-26');
  expect(out.length).toBe(1);
});

void run();
