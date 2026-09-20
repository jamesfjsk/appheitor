import { expect, run, test } from '../../english/__tests__/harness';
import { QUIZ_THEMES } from '../../../config/quizCurriculum';
import { buildPrompt } from '../../quiz/dailyPrompt';
import {
  answerLeaksInPrompt,
  dilemmaOf,
  hasKeyMash,
  hasRepeatedWord,
  knowledgeAreasForWeekday,
  normalizeQuizText,
  optionsCollide,
  readingMs,
  reflectionOk,
  revealParts,
  takeWords,
  wordCount,
} from '../../quiz/provaRules';

test('ideia aparece no ritmo da leitura, sem jogar o fim no começo', () => {
  expect(takeWords('uma duas três quatro', 0)).toBe('');
  expect(takeWords('uma duas três quatro', 2)).toBe('uma duas');
  expect(takeWords('uma duas três quatro', 9)).toBe('uma duas três quatro');
  const half = revealParts(['alpha beta gamma', 'delta epsilon'], 0.5);
  expect(half[0]).toBe('alpha beta');
  expect(half[1]).toBe('');
  const done = revealParts(['alpha beta gamma', 'delta epsilon'], 1);
  expect(done[0]).toBe('alpha beta gamma');
  expect(done[1]).toBe('delta epsilon');
});

test('tempo de leitura: 1 s a cada 3 palavras, preso no mínimo e no máximo', () => {
  expect(readingMs('uma duas três', 4000, 12000)).toBe(4000);
  expect(readingMs(Array(12).fill('palavra').join(' '), 4000, 12000)).toBe(4000);
  expect(readingMs(Array(15).fill('palavra').join(' '), 4000, 12000)).toBe(5000);
  expect(readingMs(Array(90).fill('palavra').join(' '), 4000, 12000)).toBe(12000);
  expect(readingMs(Array(24).fill('palavra').join(' '), 8000, 30000)).toBe(8000);
  expect(readingMs(Array(90).fill('palavra').join(' '), 8000, 30000)).toBe(30000);
});

test('reflexão: 10 palavras, sem a mesma palavra 4 vezes e sem tecla repetida', () => {
  expect(wordCount('uma duas três')).toBe(3);
  expect(reflectionOk('curto')).toBe(false);
  expect(reflectionOk('eu acho que isso importa porque o time precisa de todo mundo no campo hoje')).toBe(true);
  expect(hasRepeatedWord('sim sim sim sim chega', 4)).toBe(true);
  expect(reflectionOk('sim sim sim sim e ainda escrevo mais umas palavras para passar')).toBe(false);
  expect(hasKeyMash('aaaa isso nao vale')).toBe(true);
  expect(reflectionOk('aaaa isso nao vale mesmo que eu escreva várias palavras extras aqui')).toBe(false);
});

test('sanitize descarta resposta no enunciado e alternativas iguais depois de normalizar', () => {
  expect(normalizeQuizText('São Paulo!')).toBe('sao paulo');
  expect(answerLeaksInPrompt('Qual o nome da técnica drible?', 'drible')).toBe(true);
  expect(answerLeaksInPrompt('Se o time marca 2 e depois 3, qual o placar?', '5')).toBe(false);
  expect(optionsCollide(['soccer', 'Football', 'Soccer', 'basket'])).toBe(true);
  expect(optionsCollide(['soccer', 'football', 'tennis', 'chess'])).toBe(false);
});

test('áreas de conhecimento giram pelo dia da semana e o dilema é a terceira pergunta', () => {
  expect(knowledgeAreasForWeekday(0)[0]).toBe('matemática');
  expect(knowledgeAreasForWeekday(1)[0]).toBe('ciências');
  expect(knowledgeAreasForWeekday(1)[4]).toBe('matemática');
  const quiz = {
    questions: [
      { kind: 'lesson', question: 'ideia 1' },
      { kind: 'lesson', question: 'ideia 2' },
      { kind: 'lesson', question: 'O que você faria no vestiário?' },
      { kind: 'knowledge', question: 'conta' },
    ],
    answers: ['a', 'b', 'Falar com o amigo', '5'],
  };
  const d = dilemmaOf(quiz);
  expect(d?.question).toBe('O que você faria no vestiário?');
  expect(d?.chosen).toBe('Falar com o amigo');
});

test('prompt da prova fixa 5º ano, proibições, auto-revisão e giro das áreas', () => {
  const p = buildPrompt(QUIZ_THEMES[0], 8, 10, 1);
  expect(p.includes('5º ano do ensino fundamental')).toBe(true);
  expect(p.includes('AUTO-REVISÃO')).toBe(true);
  expect(p.includes('qual a capital de')).toBe(true);
  expect(p.includes('nunca uma conta de um passo') || p.includes('Nunca uma conta de um passo')).toBe(true);
  expect(p.includes('ciências — causa e efeito')).toBe(true);
  expect(p.includes('gpt-4o')).toBe(false);
});

void run();
