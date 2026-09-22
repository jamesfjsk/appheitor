import { expect, run, test } from '../../english/__tests__/harness';
import { applyReview, parseReview, reviewBatch, reviewSystem } from '../reviewer';
import type { RawQuestion } from '../validateQuestion';

const mathTwo: RawQuestion = {
  question: 'Uma abelha constrói 6 células por dia. Em 5 dias, quantas 4 abelhas constroem juntas?',
  options: ['120', '30', '24', '20'],
  answer: '120',
  subject: 'matematica',
  skill: 'MAT.OP2',
  bloom: 'aplicar',
  kind: 'knowledge',
};

const mathOne: RawQuestion = {
  question: 'João tem 5 maçãs. Ele come 2. Quantas sobram?',
  options: ['3', '7', '5', '2'],
  answer: '3',
  subject: 'matematica',
  skill: 'MAT.OP2',
  bloom: 'aplicar',
  kind: 'knowledge',
};

const causeA: RawQuestion = {
  question: 'O que aconteceria se você tirasse o oxigênio da respiração celular?',
  answer: 'A célula pararia de soltar energia útil',
  subject: 'ciencias',
  kind: 'knowledge',
};

const causeB: RawQuestion = {
  question: 'O que aconteceria se um rio perdesse a nascente?',
  answer: 'O leito ia secando rio abaixo com o tempo',
  subject: 'ciencias',
  kind: 'knowledge',
};

test('P0.6: lote só com conta de um passo marca falta_duas_etapas', () => {
  const issues = reviewBatch([mathOne, causeA, causeB]);
  expect(issues).toContain('falta_duas_etapas');
});

test('P0.6: duas causas + uma conta de duas etapas passa formato e etapa', () => {
  const issues = reviewBatch([mathTwo, causeA, causeB]);
  expect(issues.includes('falta_duas_etapas')).toBe(false);
  expect(issues.includes('falta_formato')).toBe(false);
});

test('P0.6: inglês com duas skills no mesmo lote mistura a regra', () => {
  const issues = reviewBatch([
    { question: 'The book is on the desk.', subject: 'ingles', skill: 'ING.N1.PREP', kind: 'knowledge' },
    { question: 'I like apples.', subject: 'ingles', skill: 'ING.N1.LIKE', kind: 'knowledge' },
    { question: 'He is a boy.', subject: 'ingles', skill: 'ING.N1.BE', kind: 'knowledge' },
    mathTwo,
    causeA,
    causeB,
  ]);
  expect(issues).toContain('ingles_mistura_regra');
});

test('P0.6: resposta malformada não derruba o lote local', () => {
  const lote = [mathTwo, causeA];
  expect(parseReview(null)).toBe(null);
  expect(parseReview({ itens: [{ n: 'x', ok: true }] })).toBe(null);
  expect(parseReview('não é json')).toBe(null);
  const intact = applyReview(lote, null);
  expect(intact.kept).toHaveLength(2);
  expect(intact.motivos).toHaveLength(0);
});

test('P0.6: duas reprovações saem e o motivo fica', () => {
  const lote = [mathTwo, causeA, causeB];
  const review = parseReview({
    itens: [
      { n: 1, ok: true, motivo: '' },
      { n: 2, ok: false, motivo: 'duas alternativas defendem o gol' },
      { n: 3, ok: false, motivo: 'fato sem consenso' },
    ],
  });
  const out = applyReview(lote, review);
  expect(out.kept).toEqual([mathTwo]);
  expect(out.motivos).toHaveLength(2);
  expect(out.motivos[0].motivo).toBe('duas alternativas defendem o gol');
});

test('P0.6: o prompt do revisor é o da prova e pede JSON', () => {
  const text = reviewSystem(1);
  expect(text.includes('professor de 5º ano')).toBe(true);
  expect(text.includes('{"itens"')).toBe(true);
  expect(text.includes('JSON')).toBe(true);
  expect(text.includes('nível 1')).toBe(true);
});

void run();
