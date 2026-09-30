import { expect, run, test } from '../../english/__tests__/harness';
import {
  BOOK_TALK_XP,
  LOCAL_CLOSING_LINE,
  SAGE_NUDGE,
  answerMissesStory,
  buildSageClosingPrompt,
  buildSageFollowPrompt,
  buildSageQuestionPrompt,
  checkSageQuestion,
  closingSpeech,
  localFollow,
  localQuestion,
  needsNudge,
  parseSageClosing,
  parseSageFollow,
  parseSageQuestion,
  parseStoredTalk,
  parseTalk,
  pickMove,
  talkStep,
} from '../bookTalk';

const MATILDA_Q = 'Os pais da Matilda não cuidavam dela, e a Sra. Mel cuidou. O que faz alguém ser da sua família?';
const FABRICA_Q = 'Cada criança que saiu da fábrica teve um castigo ligado ao seu defeito. Os castigos foram justos, ou alguns foram grandes demais?';
const PRINCIPE_Q = 'A raposa diz que o essencial é invisível aos olhos. O que existe de importante na sua vida que não dá para ver?';

test('checkSageQuestion: as seis regras do §1', () => {
  expect(checkSageQuestion(MATILDA_Q).ok).toBe(true);
  expect(checkSageQuestion('O que faz alguém ser da sua família: nascer junto ou cuidar?').ok).toBe(true);
  expect(checkSageQuestion('Ter coragem é não ter medo ou fazer a coisa mesmo com medo?').ok).toBe(true);
  const longa = `${Array.from({ length: 31 }, () => 'casa').join(' ')}?`;
  expect(checkSageQuestion(longa).reason).toBe('tamanho');
  expect(checkSageQuestion(`${Array.from({ length: 30 }, () => 'casa').join(' ')}?`).ok).toBe(true);
  expect(checkSageQuestion('Ele mereceu ou teve sorte? Dá para separar as duas coisas?').reason).toBe('perguntas');
  expect(checkSageQuestion('Qual foi a primeira criança a sair da competição?').reason).toBe('fato');
  expect(checkSageQuestion('Quem ganhou a fábrica no final?').reason).toBe('fato');
  expect(checkSageQuestion('Quando o Charlie achou o bilhete?').reason).toBe('fato');
  expect(checkSageQuestion('Onde fica a fábrica de chocolate?').reason).toBe('fato');
  expect(checkSageQuestion('Quantos bilhetes dourados existiam?').reason).toBe('fato');
  expect(checkSageQuestion('Como se chama o menino pobre?').reason).toBe('fato');
  expect(checkSageQuestion('O que você aprendeu com esse livro?').reason).toBe('licao');
  expect(checkSageQuestion('A lição do livro é cuidar das pessoas?').reason).toBe('licao');
  expect(checkSageQuestion('O certo é obedecer sempre?').reason).toBe('licao');
  expect(checkSageQuestion('Devemos sempre falar a verdade?').reason).toBe('licao');
});

test('banco local copia os três livros; parseTalk com lixo cai nele', () => {
  expect(localQuestion('Matilda').question).toBe(MATILDA_Q);
  expect(localQuestion('A Fantástica Fábrica de Chocolate').question).toBe(FABRICA_Q);
  expect(localQuestion('O Pequeno Príncipe').question).toBe(PRINCIPE_Q);
  expect(localQuestion('Matilda', 'poder').question).toContain('Trunchbull');
  expect(parseTalk('lixo', 'Matilda').question).toBe(MATILDA_Q);
  expect(parseTalk(null, 'O Pequeno Príncipe').question).toBe(PRINCIPE_Q);
  expect(parseTalk({ question: 'Qual foi a primeira criança a sair?', theme: 'castigo' }, 'A Fantástica Fábrica de Chocolate').question).toBe(FABRICA_Q);
  expect(parseSageQuestion({ theme: 'familia', question: MATILDA_Q })?.question).toBe(MATILDA_Q);
  expect(parseSageQuestion('nao é json')).toBe(null);
  expect(parseStoredTalk(null)).toBe(undefined);
  expect(parseStoredTalk('lixo')).toBe(undefined);
});

test('escolha de movimento local e a segunda pergunta do banco', () => {
  expect(pickMove('não sei')).toBe('duas_saidas');
  expect(pickMove('sim')).toBe('duas_saidas');
  expect(pickMove('eu acho que família é quem cuida')).toBe('por_que');
  expect(pickMove('porque ele mereceu de verdade')).toBe('exemplo');
  expect(pickMove('porque na escola a sra mel cuidou de mim quando eu estava sozinho e isso mudou o meu dia')).toBe('sua_vida');
  expect(pickMove('quem manda nunca tem razão e ponto final')).toBe('outro_lado');
  expect(localFollow('Matilda', 'familia', 'outro_lado').question).toBe('O Sr. Wormwood diria que ele é o pai de qualquer jeito. Ele tem razão?');
  expect(localFollow('Matilda', 'familia', 'e_se').question).toBe('E se a Sra. Mel fosse brava, mas cuidasse dela direitinho? Ainda seria família?');
  expect(localFollow('A Fantástica Fábrica de Chocolate', 'felicidade', 'duas_saidas').question).toBe('Uns acham que dinheiro compra alegria. Outros acham que a alegria vem das pessoas. Com qual você fica?');
  expect(localFollow('O Pequeno Príncipe', 'cuidar', 'e_se').question).toBe('E se cuidar desse muito trabalho? Ainda seria escolha?');
  expect(localFollow('A Ilha Perdida', 'familia', 'por_que').question).toBe('Por que você acha isso?');
  const follow = parseSageFollow({ move: 'por que', question: 'Por que você acha isso?', flagged: false });
  expect(follow?.move).toBe('por_que');
  expect(parseSageFollow({ move: 'exemplo', question: 'Qual o nome do pai?' })).toBe(null);
  expect(parseSageFollow('lixo')).toBe(null);
});

test('fechamento: lixo cai no banco; pergunta grande de outro livro no prompt', () => {
  expect(parseSageClosing('lixo')).toBe(null);
  expect(parseSageClosing({ restate: 'Você disse que família é quem cuida.', concept: 'Você pensou sobre o que é família.', takeHome: 'quem cuidou de você?' })?.takeHome).toBe('quem cuidou de você?');
  expect(parseSageClosing({ restate: 'Muito bem, você acertou.', concept: 'Resposta certa.', takeHome: 'e agora?' })).toBe(null);
  const local = parseTalk({ restate: 'x' }, 'Matilda');
  expect(local.question).toBe(MATILDA_Q);
  expect(closingSpeech({ restate: 'Guardei o que você pensou.', concept: 'O seu pai vai ler.', takeHome: '' })).toBe(LOCAL_CLOSING_LINE);
  expect(needsNudge('   ')).toBe(true);
  expect(needsNudge('não sei')).toBe(false);
  expect(SAGE_NUDGE).toContain('suas palavras');
  expect(answerMissesStory('não sei')).toBe(false);
  expect(answerMissesStory('eu não li esse livro')).toBe(true);
  expect(BOOK_TALK_XP).toBe(10);

  const matilda = buildSageQuestionPrompt({ title: 'Matilda', text: 'ela lia muitos livros na biblioteca' });
  expect(matilda.system).not.toContain('Os pais da Matilda');
  expect(matilda.system).not.toContain('Sra. Mel');
  expect(matilda.system).not.toContain('Trunchbull');
  expect(matilda.system).toContain('A raposa diz que o essencial');
  expect(matilda.system).toContain(FABRICA_Q);
  expect(matilda.user).toContain('ela lia muitos livros');
  const fabrica = buildSageQuestionPrompt({ title: 'A Fantástica Fábrica de Chocolate', text: 'o charlie' });
  expect(fabrica.system).not.toContain(FABRICA_Q);
  expect(fabrica.system).toContain(MATILDA_Q);
  const principe = buildSageFollowPrompt({ title: 'O Pequeno Príncipe', question: 'O que é importante?', answer: 'não sei' });
  expect(principe.system).toContain('Por que você acha isso?');
  expect(principe.system).not.toContain('homem de negócios');
  const fecha = buildSageClosingPrompt({ title: 'Matilda', question: MATILDA_Q, answers: ['quem cuida'] });
  expect(fecha.system).toContain('takeHome');
  expect(fecha.user).toContain('quem cuida');

  expect(talkStep({ question: '', turns: [] })).toBe('need-question');
  expect(talkStep({ question: 'Q?', turns: [{ by: 'sabio', text: 'Q?' }] })).toBe('answer-1');
  expect(talkStep({ question: 'Q?', turns: [{ by: 'sabio', text: 'Q?' }, { by: 'heitor', text: 'sim' }] })).toBe('need-follow');
  expect(talkStep({
    question: 'Q?',
    turns: [{ by: 'sabio', text: 'Q?' }, { by: 'heitor', text: 'sim' }, { by: 'sabio', text: 'Por quê?', move: 'por_que' }],
  })).toBe('answer-2');
  expect(talkStep({ question: 'Q?', turns: [], doneAt: '2026-09-29T12:00:00.000Z' })).toBe('done');
  expect(parseStoredTalk({
    theme: 'familia',
    question: MATILDA_Q,
    turns: [{ by: 'sabio', text: MATILDA_Q }, { by: 'heitor', text: 'quem cuida' }],
    skipped: true,
  })?.skipped).toBe(true);
});

void run();
