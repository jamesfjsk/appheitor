import { expect, run, test } from '../../english/__tests__/harness';
import { buildProfile } from '../profile';
import { nudgeFor } from '../nudge';
import { readingMs, reflectionMinWords, reflectionReady, reflectionThemeHits, retryable, wordCount } from '../provaRules';
import { quizBankDocs } from '../bankWrite';
import items from './fixtures/quizbank-teste.json';

test('perfil da conta de teste: forte e fraco batem com a conta à mão', () => {
  const profile = buildProfile(items, '2026-09-26');
  // À mão, no total, mínimo 4: animais 0/8, matematica 2/8, brasil 6/6, corpo 8/8.
  expect(profile.strong).toEqual(['brasil', 'corpo', 'matematica']);
  expect(profile.weak).toEqual(['animais', 'matematica', 'brasil']);
  expect(profile.lastWrong.length).toBeLessThanOrEqual(10);
});

test('retryable: um skill de cada coluna', () => {
  expect(retryable({ skill: 'MAT.OP2' })).toBe(true);
  expect(retryable({ skill: 'ING.N1.BE' })).toBe(true);
  expect(retryable({ skill: 'LIC.APLICA' })).toBe(true);
  expect(retryable({ skill: 'CIE.CAUSA' })).toBe(true);
  expect(retryable({ skill: 'LIC.IDEIA' })).toBe(false);
  expect(retryable({ skill: 'HIS.FATO' })).toBe(false);
  expect(retryable({ skill: 'GEO.FATO' })).toBe(false);
  expect(retryable({ skill: 'GEN.CONH' })).toBe(false);
  expect(retryable({ skill: '' })).toBe(false);
  expect(retryable({ skill: 'LIC.DILEMA', kind: 'dilemma' })).toBe(false);
});

test('nudgeFor: trap que nomeia, trap que vaza, escolhida fora do trap', () => {
  const names = nudgeFor(
    { skill: 'MAT.OP2', trap: 'Quem marca 36 reais parou no preço e esqueceu o troco da nota.', answer: '14 reais' },
    '36 reais',
    1,
  );
  expect(names.nudge).toBe('trap');
  const leaks = nudgeFor(
    { skill: 'MAT.OP2', trap: 'Quem marca 30 parou no meio; o total é 120.', answer: '120' },
    '30',
    1,
  );
  expect(leaks.nudge).toBe('strategy');
  expect(leaks.text.includes('120')).toBe(false);
  const other = nudgeFor(
    { skill: 'MAT.OP2', trap: 'Quem marca 36 reais parou no preço e esqueceu o troco.', answer: '14 reais' },
    '200',
    2,
  );
  expect(other.nudge).toBe('strategy');
});

test('supportLevel nos caminhos 0, 1 e 3', () => {
  const docs = quizBankDocs({
    userId: 'u',
    date: '2026-09-26',
    theme: { id: 't', category: 'matematica' },
    questions: [
      { question: 'Certa de primeira?', answer: 'a', skill: 'MAT.OP2', kind: 'knowledge' },
      { question: 'Acertou depois?', answer: 'b', skill: 'MAT.OP2', kind: 'knowledge' },
      { question: 'Errou as duas?', answer: 'c', skill: 'CIE.CAUSA', kind: 'knowledge' },
    ],
    answers: ['a', 'x', 'y'],
    attempts: [{}, { second: 'b', nudge: 'trap' }, { second: 'z', nudge: 'strategy' }],
  });
  expect(docs[0].data.supportLevel).toBe(0);
  expect(docs[0].data.attempts).toBe(1);
  expect(docs[1].data.supportLevel).toBe(1);
  expect(docs[1].data.retryOk).toBe(true);
  expect(docs[1].data.attempts).toBe(2);
  expect(docs[2].data.supportLevel).toBe(3);
  expect(docs[2].data.retryOk).toBe(false);
});

test('reflexão: 11 palavras, a de 26/09 e o piso de leitura', () => {
  const about = {
    prompt: 'O que a lógica muda no seu dia?',
    title: 'A lógica por trás dos computadores',
    lesson: 'A lógica liga uma causa a um efeito, como um interruptor.',
  };
  expect(readingMs('um dois três quatro cinco seis sete oito nove', 6000, 12000)).toBe(6000);
  const eleven = 'hoje a logica do jogo me ajudou a pensar bem melhor';
  expect(reflectionReady(eleven, about, '2026-09-26', '2026-10-03')).toBe(false);
  expect(reflectionReady(eleven, about, '2026-09-26', '2026-09-26')).toBe(true);
  expect(reflectionMinWords('2026-09-26', '2026-09-26')).toBe(8);
  const real = 'a lojica dele tanbem pode fucionar em celular , tv , tablet etc';
  expect(wordCount(real)).toBe(11);
  expect(reflectionThemeHits(real, about)).toBeGreaterThanOrEqual(1);
  expect(reflectionReady(real, about, '2026-09-26', '2026-09-26')).toBe(true);
  expect(reflectionReady(real, about)).toBe(false);
});

void run();
