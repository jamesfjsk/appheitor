import { expect, run, test } from '../../english/__tests__/harness';
import { quizBankDocs } from '../bankWrite';
import { answersStash, attemptsForBank, completeQuizWrite } from '../closeQuiz';
import { rememberNudge } from '../nudge';
import { buildProfile } from '../profile';
import { reflectionGate, reflectionThemeHits, reflectionWordCount, wordCount } from '../provaRules';
import { playbackCounts } from '../../english/playback';
import { addDays } from '../../../utils/clock';

test('a segunda tentativa entra no stash e o reload não grava supportLevel 3', () => {
  const attempts = [{}, { second: 'certa', nudge: 'trap' as const }];
  const stash = answersStash(
    ['errada', 'errada'],
    0,
    2,
    [
      { msToAnswer: 1200, msReadingExplain: 4000 },
      { msToAnswer: 800, msReadingExplain: 5100 },
    ],
    attempts,
  );
  expect(stash.attempts?.[1]?.second).toBe('certa');
  expect(stash.timings?.[1]).toEqual({ msToAnswer: 800, msReadingExplain: 5100 });
  const merged = attemptsForBank([{}, {}], stash.attempts);
  const questions = [
    { question: 'Primeira?', answer: 'a', skill: 'MAT.OP2', kind: 'knowledge' },
    { question: 'Depois do aviso?', answer: 'certa', skill: 'MAT.OP2', kind: 'knowledge' },
  ];
  const kept = quizBankDocs({
    userId: 'u',
    date: '2026-09-29',
    theme: { id: 't', category: 'matematica' },
    questions,
    answers: ['errada', 'errada'],
    attempts: merged,
  });
  expect(kept[1].data.supportLevel).toBe(1);
  expect(kept[1].data.attempts).toBe(2);
  const wiped = quizBankDocs({
    userId: 'u',
    date: '2026-09-29',
    theme: { id: 't', category: 'matematica' },
    questions,
    answers: ['errada', 'errada'],
    attempts: [{}, {}],
  });
  expect(wiped[1].data.supportLevel).toBe(3);
});

test('pontuação e o … do molde não contam na reflexão; o validador conta 12 + 8 como 3', () => {
  expect(reflectionWordCount('Hoje eu … porque …')).toBe(3);
  expect(reflectionWordCount('Hoje eu ... porque ...')).toBe(3);
  expect(reflectionWordCount('celular , tv , tablet')).toBe(3);
  expect(reflectionWordCount('a lojica dele tanbem pode fucionar em celular , tv , tablet etc')).toBe(11);
  expect(wordCount('12 + 8')).toBe(3);
  expect(wordCount('Hoje eu … porque …')).toBe(5);
});

const syrup29 = 'eu fui fazer minha bebida e ai eu coloquei muito xarope de maracuja na minha bebida . quando fui da um gole da minha bebida e ai eu fiquei tonto nese dia aprender que nao poso colocar muito xarope de maracuja';

test('reflexão de 29/09, a do xarope, colada do Firestore; chute torto é inventada', () => {
  const about = {
    prompt: 'Pense em um erro que você cometeu recentemente. Como ele ajudou você a aprender algo novo?',
    title: 'Errar para Aprender',
    lesson: 'Michael Jordan, um dos maiores jogadores de basquete de todos os tempos, foi cortado do time da escola. Thomas Edison, inventor da lâmpada elétrica, falhou milhares de vezes antes de ter sucesso. Esses exemplos mostram que errar faz parte do processo de aprendizado. Quando erramos, nosso cérebro está trabalhando e crescendo. A palavra \'ainda\' pode mudar tudo: \'Eu não sei fazer isso... ainda.\' Hoje, ao enfrentar um desafio, lembre-se que errar é um passo para aprender.',
  };
  expect(reflectionWordCount(syrup29)).toBe(40);
  expect(wordCount(syrup29)).toBe(41);
  expect(reflectionThemeHits(syrup29, about)).toBeGreaterThanOrEqual(1);
  expect(reflectionGate(syrup29, about, '2026-09-18', '2026-09-29', false).ok).toBe(true);

  // inventada: a revisão descreve o chute, o texto literal não está no Firestore.
  const kickAbout = {
    prompt: about.prompt,
    title: about.title,
    lesson: 'Errar faz parte do aprendizado. Quando erramos, a gente aprende.',
  };
  const kick = 'No campinho o chute saiu torto e a bola passou longe do gol no recreio com a turma toda';
  expect(reflectionWordCount(kick)).toBeGreaterThanOrEqual(12);
  expect(reflectionThemeHits(kick, kickAbout)).toBe(0);
  const first = reflectionGate(kick, kickAbout, '2026-09-18', '2026-09-29', false);
  expect(first.ok).toBe(false);
  expect(reflectionGate(kick, kickAbout, '2026-09-18', '2026-09-29', true).ok).toBe(true);
  const blocked = completeQuizWrite(undefined, {
    score: 5,
    totalQuestions: 7,
    xpEarned: 30,
    goldEarned: 10,
    answers: ['a'],
    reflection: kick,
    about: kickAbout,
    launchedOn: '2026-09-18',
    today: '2026-09-29',
  });
  expect(blocked.kind).toBe('reject');
  const accepted = completeQuizWrite(undefined, {
    score: 5,
    totalQuestions: 7,
    xpEarned: 30,
    goldEarned: 10,
    answers: ['a'],
    reflection: kick,
    about: kickAbout,
    launchedOn: '2026-09-18',
    today: '2026-09-29',
    waiveTheme: true,
  });
  expect(accepted.kind).toBe('write');
});

test('a memória de 14 dias guarda a data de cada fala', () => {
  const today = '2026-09-29';
  const next = rememberNudge([
    { id: 'av_mat_1', date: '2026-09-16' },
    { id: 'av_mat_2', date: '2026-09-10' },
  ], 'av_cau_1', today);
  expect(next).toEqual([
    { id: 'av_mat_1', date: '2026-09-16' },
    { id: 'av_cau_1', date: today },
  ]);
});

test('dilema não é erro, retry só na segunda tentativa, d7 e d30 incluem hoje', () => {
  const today = '2026-09-29';
  const profile = buildProfile([
    { date: today, category: 'matematica', subject: 'matematica', skill: 'MAT.OP2', kind: 'knowledge', correct: false, attempts: 1, supportLevel: 3 },
    { date: today, category: 'matematica', subject: 'matematica', skill: 'MAT.OP2', kind: 'knowledge', correct: false, attempts: 2, retryOk: true, supportLevel: 1 },
    { date: today, category: 'matematica', subject: 'matematica', skill: 'CIE.CAUSA', kind: 'knowledge', correct: false, attempts: 2, retryOk: false, supportLevel: 3 },
    { date: today, category: 'carater', subject: 'tema', skill: 'LIC.DILEMA', kind: 'dilemma', correct: false, question: 'O que você faz no vestiário?' },
    { date: '2026-09-21', category: 'matematica', subject: 'matematica', skill: 'MAT.OP2', kind: 'knowledge', correct: true },
  ], today);
  expect(profile.byCategory.carater).toBe(undefined);
  expect(profile.bySubject.tema).toBe(undefined);
  expect(profile.lastWrong.some((row) => row.skill === 'LIC.DILEMA')).toBe(false);
  expect(profile.retry.all).toEqual([1, 2]);
  expect(profile.retry.d30).toEqual([1, 2]);
  expect(profile.byCategory.matematica.d7).toEqual([0, 3]);
  expect(profile.byCategory.matematica.d30).toEqual([1, 4]);
  const edge = buildProfile([
    { date: addDays(today, -6), category: 'matematica', subject: 'matematica', skill: 'MAT.OP2', kind: 'knowledge', correct: true },
    { date: addDays(today, -7), category: 'matematica', subject: 'matematica', skill: 'MAT.OP2', kind: 'knowledge', correct: false },
    { date: addDays(today, -29), category: 'matematica', subject: 'matematica', skill: 'MAT.OP2', kind: 'knowledge', correct: true },
    { date: addDays(today, -30), category: 'matematica', subject: 'matematica', skill: 'MAT.OP2', kind: 'knowledge', correct: false },
  ], today);
  expect(edge.byCategory.matematica.d7).toEqual([1, 1]);
  expect(edge.byCategory.matematica.d30).toEqual([2, 3]);
});

test('playText só conta o áudio que chegou ao fim', () => {
  expect(playbackCounts('ended')).toBe(true);
  expect(playbackCounts('stopped')).toBe(false);
  expect(playbackCounts('timeout')).toBe(false);
  expect(playbackCounts('error')).toBe(false);
});

void run();
