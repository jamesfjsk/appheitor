import { expect, run, test } from '../../english/__tests__/harness';
import { quizBankDocs } from '../bankWrite';

const questions = [
  { question: 'Qual é a ideia de hoje sobre a paciência?', options: ['a', 'b', 'c', 'd'], answer: 'a', why: 'porque a', trap: 'quem marca b', kind: 'lesson', subject: 'tema', skill: 'LIC.IDEIA', bloom: 'entender' },
  { question: 'No recreio, o que a paciência muda?', options: ['a', 'b', 'c', 'd'], answer: 'b', why: 'porque b', trap: 'quem marca a', kind: 'lesson', subject: 'tema', skill: 'LIC.APLICA', bloom: 'aplicar' },
  { question: 'O amigo ficou de fora. Qual atitude é a mais justa?', options: ['Chamo', 'Fico', 'Sigo', 'Digo'], answer: 'Chamo', why: 'porque chamo', trap: 'quem marca fico', kind: 'dilemma', subject: 'tema', skill: 'LIC.DILEMA', bloom: 'analisar' },
  { question: 'Uma abelha faz 6 células por dia. Em 5 dias, quantas 4 abelhas fazem?', options: ['120', '30', '24', '20'], answer: '120', why: '120 porque duas contas', trap: 'quem marca 30', kind: 'knowledge', subject: 'matematica', skill: 'MAT.OP2', bloom: 'aplicar' },
  { question: 'O que acontece com o gelo no sol?', options: ['derrete', 'cresce', 'some', 'quebra'], answer: 'derrete', why: 'derrete porque aquece', trap: 'quem marca some', kind: 'knowledge', subject: 'ciencias', skill: 'CIE.CAUSA', bloom: 'entender' },
  { question: 'There ___ a cat on the mat.', options: ['is', 'are', 'am', 'be'], answer: 'is', why: 'is porque um gato', trap: 'quem marca are', kind: 'knowledge', subject: 'ingles', skill: 'ING.N1.BE', bloom: 'aplicar' },
  { question: 'Em que ano o Brasil ficou independente?', options: ['1822', '1500', '1889', '1808'], answer: '1822', why: '1822 porque dom pedro', trap: 'quem marca 1500', kind: 'knowledge', subject: 'historia', skill: 'HIS.FATO', bloom: 'entender' },
  { question: 'O time venceu 4 e empatou 2. Cada vitória vale 3 e cada empate vale 1. Quantos pontos?', options: ['14', '12', '7', '6'], answer: '14', why: '14 porque duas contas', trap: 'quem marca 12', kind: 'knowledge', subject: 'matematica', skill: 'MAT.OP2', bloom: 'aplicar' },
];

const answers = ['a', 'errado', 'Fico', '120', 'cresce', 'is', '1500', '14'];
const timings = questions.map((_, i) => ({ msToAnswer: 1200 + i, msReadingExplain: 6400 + i }));

test('concluir a prova grava 8 docs com os campos da memória', () => {
  const docs = quizBankDocs({
    userId: 'uid-teste',
    date: '2026-09-23',
    theme: { id: 'paciencia', category: 'carater', depth: 2 },
    questions,
    answers,
    timings,
  });
  expect(docs).toHaveLength(8);
  const required = [
    'userId', 'familyId', 'date', 'n', 'themeId', 'category', 'subject', 'kind',
    'skill', 'bloom', 'depth', 'question', 'options', 'answer', 'why', 'trap',
    'hash', 'chosen', 'correct', 'attempts', 'msToAnswer', 'msReadingExplain',
  ];
  docs.forEach((doc, i) => {
    expect(doc.id).toBe(`uid-teste_2026-09-23_${i + 1}`);
    for (const key of required) expect(doc.data[key] !== undefined).toBe(true);
    expect(doc.data.secondChoice).toBe(undefined);
    expect(doc.data.retryOk).toBe(undefined);
    expect(doc.data.nudge).toBe(undefined);
    expect(doc.data.attempts).toBe(1);
    expect(doc.data.msToAnswer).not.toBe(0);
    expect(doc.data.msReadingExplain).not.toBe(0);
    expect(doc.data.depth).toBe(2);
    expect(doc.data.difficulty).toBe(undefined);
    expect(doc.data.hash).toBe(doc.data.hash?.toString().toLowerCase());
  });
  expect(docs[0].data.correct).toBe(true);
  expect(docs[0].data.supportLevel).toBe(0);
  expect(docs[1].data.correct).toBe(false);
  expect(docs[1].data.supportLevel).toBe(3);
  expect(docs[2].data.kind).toBe('dilemma');
  expect(docs[2].data.supportLevel).toBe(undefined);
  const withDifficulty = quizBankDocs({
    userId: 'uid-teste',
    date: '2026-09-24',
    theme: { id: 'paciencia', category: 'carater', depth: 1 },
    questions: [{ ...questions[3], difficulty: 3 }],
    answers: ['120'],
    timings: [{ msToAnswer: 800, msReadingExplain: 5000 }],
  });
  expect(withDifficulty[0].data.depth).toBe(1);
  expect(withDifficulty[0].data.difficulty).toBe(3);
  expect(docs[3].data.supportLevel).toBe(0);
  expect(docs[4].data.supportLevel).toBe(3);
});

void run();
