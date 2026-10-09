import { expect, run, test } from '../../english/__tests__/harness';
import { progressStash, RESUME_JOKES, resumeJoke, resumePoint } from '../closeQuiz';

const questions = Array.from({ length: 8 }, (_, i) => ({ question: `p${i + 1}` }));

test('prova recarregada no meio volta na pergunta seguinte, com as respostas que já deu (pai, 09/10)', () => {
  const r = resumePoint({ questions, answers: ['a', 'b', 'c'], timings: [{ msToAnswer: 900, msReadingExplain: 0 }] });
  expect(r?.answers).toEqual(['a', 'b', 'c']);
  expect(r?.answers.length).toBe(3);
  expect(r?.timings.length).toBe(1);
});

test('sem resposta, prova terminada ou esperando a reflexão: não é retomada', () => {
  expect(resumePoint({ questions, answers: [] })).toBe(null);
  expect(resumePoint({ questions, answers: ['a'], completed: true })).toBe(null);
  expect(resumePoint({ questions, answers: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], awaitingReflection: true })).toBe(null);
  expect(resumePoint({ questions, answers: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] })).toBe(null);
});

test('a escolha gravada na hora leva só respostas, tempos e tentativas, sem abrir a reflexão', () => {
  const s = progressStash(['a', 'b'], [{ msToAnswer: 1200, msReadingExplain: 0 }, { msToAnswer: -5, msReadingExplain: 0 }]);
  expect(s.answers).toEqual(['a', 'b']);
  expect(s.timings?.[1].msToAnswer).toBe(0);
  expect('awaitingReflection' in s).toBe(false);
});

test('o Sábio faz uma piada diferente a cada volta do dia e diz a pergunta', () => {
  expect(resumeJoke(4, 0)).toBe(RESUME_JOKES[0].replace('{n}', '4'));
  expect(resumeJoke(4, 1) === resumeJoke(4, 0)).toBe(false);
  expect(resumeJoke(6, 7).includes('6')).toBe(true);
});

void run();
