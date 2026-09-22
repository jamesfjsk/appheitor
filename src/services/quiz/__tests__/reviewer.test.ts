import { expect, run, test } from '../../english/__tests__/harness';
import { applyReview, parseReview, rescueDilemma, reviewBatch, reviewSystem } from '../reviewer';
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

test('6b: duvida ausente vale false e a do limite fica na lista', () => {
  const ausente = parseReview({ itens: [{ n: 1, ok: true, motivo: '' }] });
  expect(ausente).toBeTruthy();
  expect(ausente![0].duvida).toBe(false);
  const limite = parseReview({ itens: [{ n: 1, ok: true, motivo: 'no limite', duvida: true }] });
  const out = applyReview([mathTwo], limite);
  expect(out.kept).toHaveLength(1);
  expect(out.duvidas).toHaveLength(1);
  expect(out.duvidas[0].question).toBe(mathTwo.question);
  expect(out.duvidas[0].motivo).toBe('no limite');
  const caiu = parseReview({ itens: [{ n: 1, ok: false, motivo: 'duas certas', duvida: true }] });
  const dropped = applyReview([mathTwo], caiu);
  expect(dropped.kept).toHaveLength(0);
  expect(dropped.duvidas).toHaveLength(0);
});

test('6b: dilema chamado de opinião fica na prova, com dúvida', () => {
  const dilema: RawQuestion = {
    question: 'O amigo ficou de fora. Qual atitude é a mais justa?',
    skill: 'LIC.DILEMA',
    kind: 'dilemma',
    subject: 'tema',
  };
  const review = rescueDilemma(
    [dilema],
    [{ n: 1, ok: false, motivo: 'Pergunta pede o que ele faria, opinião.', duvida: false }],
  );
  const out = applyReview([dilema], review);
  expect(out.kept).toHaveLength(1);
  expect(out.duvidas).toHaveLength(1);
  const conta = rescueDilemma(
    [mathTwo],
    [{ n: 1, ok: false, motivo: 'duas atitudes defendem', duvida: false }],
  );
  expect(applyReview([mathTwo], conta).kept).toHaveLength(0);
});

test('6b: ideia que não pede atitude não cai por opinião', () => {
  const ideia: RawQuestion = {
    question: 'Como os juros compostos ajudam a realizar sonhos futuros?',
    skill: 'LIC.IDEIA',
    kind: 'lesson',
    subject: 'tema',
  };
  const review = rescueDilemma(
    [ideia],
    [{ n: 1, ok: false, motivo: 'A pergunta pede opinião e não é LIC.DILEMA.', duvida: false }],
  );
  const out = applyReview([ideia], review);
  expect(out.kept).toHaveLength(1);
  expect(out.duvidas).toHaveLength(1);
  const atitude: RawQuestion = {
    question: 'O que você faria com o dinheiro?',
    skill: 'LIC.IDEIA',
    kind: 'lesson',
    subject: 'tema',
  };
  const cai = rescueDilemma([atitude], [{ n: 1, ok: false, motivo: 'opinião', duvida: false }]);
  expect(applyReview([atitude], cai).kept).toHaveLength(0);
});

test('6b: conta que fecha em duas etapas não cai por conta não fecha', () => {
  const pontos: RawQuestion = {
    question: 'Cada vitória vale 3 pontos e cada empate vale 1. O time venceu 5 jogos e empatou 3. Quantos pontos o time acumulou?',
    options: ['18', '15', '16', '20'],
    answer: '18',
    skill: 'MAT.OP2',
    kind: 'knowledge',
    subject: 'matematica',
  };
  const review = rescueDilemma(
    [pontos],
    [{ n: 1, ok: false, motivo: 'A conta não fecha, total é 18, mas opções erradas.', duvida: false }],
  );
  const out = applyReview([pontos], review);
  expect(out.kept).toHaveLength(1);
  expect(out.duvidas).toHaveLength(1);
  const solta: RawQuestion = {
    question: 'Cada caixa tem 6 ovos. Quantas caixas são necessárias para guardar 40 ovos?',
    options: ['6', '7', '8', '40'],
    answer: '7',
    skill: 'MAT.OP2',
    kind: 'knowledge',
    subject: 'matematica',
  };
  const cai = rescueDilemma(
    [solta],
    [{ n: 1, ok: false, motivo: 'A conta não fecha.', duvida: false }],
  );
  expect(applyReview([solta], cai).kept).toHaveLength(0);
});

test('6b: dilema com uma só ajuda não cai por duas atitudes', () => {
  const um: RawQuestion = {
    question: 'Seu amigo acha que redstone é real. Qual atitude é a mais justa?',
    options: ['Explico sobre eletricidade', 'Deixo ele acreditar', 'Rio da ideia', 'Mudo de assunto'],
    answer: 'Explico sobre eletricidade',
    skill: 'LIC.DILEMA',
    kind: 'dilemma',
    subject: 'tema',
  };
  const review = rescueDilemma(
    [um],
    [{ n: 1, ok: false, motivo: 'Duas atitudes são igualmente sábias.', duvida: false }],
  );
  expect(applyReview([um], review).kept).toHaveLength(1);
  const dois: RawQuestion = {
    question: 'O amigo ficou de fora. Qual atitude é a mais justa?',
    options: ['Chamo ele para entrar', 'Peço ajuda ao adulto', 'Fico quieto no banco', 'Sigo jogando sem ele'],
    answer: 'Chamo ele para entrar',
    skill: 'LIC.DILEMA',
    kind: 'dilemma',
    subject: 'tema',
  };
  const cai = rescueDilemma(
    [dois],
    [{ n: 1, ok: false, motivo: 'Duas atitudes são igualmente sábias.', duvida: false }],
  );
  expect(applyReview([dois], cai).kept).toHaveLength(0);
});

test('6b: ideia com opções curtas não cai por única completa', () => {
  const ideia: RawQuestion = {
    question: 'Por que o buraco mais fundo já cavado tem apenas 12 km?',
    skill: 'LIC.IDEIA',
    kind: 'lesson',
    subject: 'tema',
  };
  const review = rescueDilemma(
    [ideia],
    [{ n: 1, ok: false, motivo: 'A certa é a única completa.', duvida: false }],
  );
  const out = applyReview([ideia], review);
  expect(out.kept).toHaveLength(1);
  expect(out.duvidas).toHaveLength(1);
  const consenso: RawQuestion = {
    question: 'Onde foram escritas as regras do jogo?',
    skill: 'LIC.IDEIA',
    kind: 'lesson',
    subject: 'tema',
  };
  const cai = rescueDilemma(
    [consenso],
    [{ n: 1, ok: false, motivo: 'Falta de consenso sobre o fato.', duvida: false }],
  );
  expect(applyReview([consenso], cai).kept).toHaveLength(0);
});

test('P0.6: o prompt do revisor é o da prova e pede JSON', () => {
  const text = reviewSystem(1);
  expect(text.includes('professor de 5º ano')).toBe(true);
  expect(text.includes('{"itens"')).toBe(true);
  expect(text.includes('JSON')).toBe(true);
  expect(text.includes('nível 1')).toBe(true);
});

void run();
