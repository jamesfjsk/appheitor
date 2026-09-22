import { expect, run, test } from '../../english/__tests__/harness';
import { QUIZ_THEMES } from '../../../config/quizCurriculum';
import { buildPrompt } from '../../quiz/dailyPrompt';
import {
  answerLeaksInPrompt,
  copiesSource,
  dilemmaOf,
  hasKeyMash,
  hasRepeatedWord,
  knowledgeAreasForWeekday,
  normalizeQuizText,
  optionsCollide,
  readingMs,
  REFLECT_COPY,
  REFLECT_MASH,
  REFLECT_SHORT,
  reflectionLocalSay,
  reflectionOk,
  revealParts,
  speakChunks,
  speakVerdict,
  takeWords,
  touchesIdea,
  wordCount,
  lessonSpeakText,
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

test('reflexão: 10 palavras, sem lixo, sem colar a pergunta', () => {
  expect(wordCount('uma duas três')).toBe(3);
  expect(reflectionOk('curto')).toBe(false);
  expect(reflectionOk('eu acho que isso importa porque o time precisa de todo mundo no campo hoje')).toBe(true);
  expect(hasRepeatedWord('sim sim sim sim chega', 4)).toBe(true);
  expect(reflectionOk('sim sim sim sim e ainda escrevo mais umas palavras para passar')).toBe(false);
  expect(hasKeyMash('aaaa isso nao vale')).toBe(true);
  expect(reflectionOk('aaaa isso nao vale mesmo que eu escreva várias palavras extras aqui')).toBe(false);
  expect(reflectionOk('eu eu eu isso isso nao nao vale vale hoje hoje')).toBe(false);
  const about = {
    prompt: 'O que você faria diferente no recreio depois desta ideia?',
    title: 'Paciência no campo',
    lesson: 'Esperar a vez no futebol ensina mais que gritar com o juiz. Paciência é deixar o outro jogar.',
  };
  expect(reflectionLocalSay('curto', about)).toBe(REFLECT_SHORT);
  expect(reflectionLocalSay('aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj', about)).toBe(REFLECT_MASH);
  expect(copiesSource(
    'O que você faria diferente no recreio depois desta ideia e ainda um pouco mais',
    about.prompt,
  )).toBe(true);
  expect(reflectionOk(
    'O que você faria diferente no recreio depois desta ideia e ainda um pouco mais',
    about,
  )).toBe(false);
  expect(reflectionLocalSay(
    'O que você faria diferente no recreio depois desta ideia e ainda um pouco mais',
    about,
  )).toBe(REFLECT_COPY);
  expect(reflectionOk(
    'No recreio eu espero o amigo chutar antes de gritar com o juiz do jogo',
    about,
  )).toBe(true);
  expect(touchesIdea('banana casa bola sol mesa cadeira livro porta janela rua', about)).toBe(false);
  expect(touchesIdea('No recreio eu espero o amigo chutar antes de gritar com o juiz do jogo', about)).toBe(true);
});

test('sanitize descarta resposta no enunciado e alternativas iguais depois de normalizar', () => {
  expect(normalizeQuizText('São Paulo!')).toBe('sao paulo');
  expect(answerLeaksInPrompt('Qual o nome da técnica drible?', 'drible')).toBe(true);
  expect(answerLeaksInPrompt('Se o time marca 2 e depois 3, qual o placar?', '5')).toBe(false);
  // A3 (22/09): só palavra inteira conta como vazamento
  expect(answerLeaksInPrompt("Complete a frase em inglês: 'The knights were ... the castle.'", 'in')).toBe(false);
  expect(answerLeaksInPrompt('Ponha o livro ... a mesa. Complete em inglês.', 'on')).toBe(false);
  expect(answerLeaksInPrompt('Em 2026, quantos anos faltam para 2046?', '20')).toBe(false);
  expect(answerLeaksInPrompt('A resposta é in ou on? Complete: The cat is ... the box', 'in')).toBe(true);
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

test('ideia do dia fala inteira, em fatias de 300, sem cortar o fim', () => {
  const theme = {
    title: 'Por que as colmeias têm hexágonos?',
    lesson: 'Na escola o juiz apita e todo mundo para. Esperar a vez no futebol ensina mais que gritar. Paciência é deixar o outro jogar.',
    whyItMatters: 'Quem espera joga melhor com os amigos.',
    curiosity: 'No canto da mesa: o apito vale na rua também.',
  };
  const full = lessonSpeakText(theme);
  expect(full.startsWith('Por que as colmeias têm hexágonos?')).toBe(true);
  expect(full.includes('Paciência')).toBe(true);
  expect(full.includes('apito vale')).toBe(true);
  const parts = speakChunks(full);
  expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(full);
  expect(parts.every((p) => p.length <= 300)).toBe(true);
  const long = `${'palavra '.repeat(80)}Fim da primeira. A segunda frase precisa aparecer depois, inteira, sem cair fora.`;
  const chunks = speakChunks(long);
  expect(chunks.length >= 2).toBe(true);
  expect(chunks.every((p) => p.length <= 300)).toBe(true);
  expect(chunks.join(' ').includes('A segunda frase precisa aparecer')).toBe(true);
});

test('veredito falado: só a explicação, sem nome e sem refrão', () => {
  expect(speakVerdict('Formigas usam feromônios, que são sinais químicos.')).toBe(
    'Formigas usam feromônios, que são sinais químicos.',
  );
  expect(speakVerdict('Formigas usam feromônios, que são sinais químicos.').includes('Heitor')).toBe(false);
  expect(speakVerdict('Formigas usam feromônios, que são sinais químicos.').includes('Quase')).toBe(false);
  const long = `${'palavra '.repeat(80)}Fim da primeira. A segunda frase sobra demais e precisa cair fora do teto.`;
  const said = speakVerdict(long);
  expect(said.length).toBeLessThanOrEqual(300);
  expect(said.includes('A segunda frase')).toBe(false);
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
