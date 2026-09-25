import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, run, test } from '../../english/__tests__/harness';
import { contentWords } from '../provaRules';
import {
  REJECT_CODES,
  hashOf,
  numbersOf,
  reachable,
  fillToCount,
  placeIntoSlots,
  fillAnyArea,
  quizSlots,
  selectValidQuestions,
  stripCertaPrefix,
  validateQuestion,
  type RawQuestion,
} from '../validateQuestion';
import fixture from './fixtures/era3.json';

interface FixtureRow extends RawQuestion {
  id: string;
  date: string;
  n: number;
  expect: string;
  avoidFrom?: string;
  similarTo?: string;
}

const rows = fixture as FixtureRow[];
const byId = new Map(rows.map((r) => [r.id, r]));

test('P0.2: 34 códigos nomeados', () => {
  expect(REJECT_CODES).toHaveLength(34);
  expect(REJECT_CODES).toContain('explicacao_em_ingles');
  expect(REJECT_CODES).toContain('ingles_sem_marcador');
  expect(REJECT_CODES).toContain('futebol_solto');
  expect(REJECT_CODES).toContain('opiniao');
  expect(REJECT_CODES).toContain('opcao_caricata');
  expect(REJECT_CODES).toContain('tamanho_opcoes');
  expect(REJECT_CODES).toContain('certa_mais_longa');
  expect(REJECT_CODES).toContain('tipos_mistos');
  expect(REJECT_CODES).toContain('why_circular');
  expect(REJECT_CODES).toContain('dilema_com_certa');
  expect(REJECT_CODES).toContain('fato_solto');
});

test('P0.2: numbersOf lê inteiros e vírgula', () => {
  expect(numbersOf('6 células, 5 dias e 4 abelhas')).toEqual([6, 5, 4]);
  expect(numbersOf('200 gramas em 3 pratos')).toEqual([200, 3]);
});

test('P0.2: reachable de duas etapas fecha 120; uma etapa não', () => {
  expect(reachable([6, 5, 4], 120, 1)).toBe(false);
  expect(reachable([6, 5, 4], 120, 2)).toBe(true);
  expect(reachable([5, 2], 3, 1)).toBe(true);
  expect(reachable([200, 3], 66, 2)).toBe(false);
});

for (const row of rows) {
  test(`P0.2: ${row.id} → ${row.expect}`, () => {
    const avoid = new Set<string>();
    if (row.avoidFrom) {
      const src = byId.get(row.avoidFrom);
      if (src?.question) avoid.add(hashOf(src.question));
    }
    const similar = row.similarTo ? byId.get(row.similarTo) : undefined;
    const codes = validateQuestion(row, {
      englishLevel: 1,
      avoidHashes: avoid,
      ...(similar?.question
        ? { avoidRecent: [{ subject: similar.subject ?? '', words: contentWords(similar.question) }] }
        : {}),
    });
    if (row.expect === 'ok') {
      expect(codes).toEqual([]);
    } else {
      expect(codes).toContain(row.expect);
    }
  });
}

test('P0.2: 21/09 Q4 passa sem código', () => {
  const q = byId.get('2026-09-21-q4');
  expect(q).toBeTruthy();
  expect(validateQuestion(q!, { englishLevel: 1 })).toEqual([]);
});

test('P0.2: 15/09 Q8 passa no validador local', () => {
  const q = byId.get('2026-09-15-q8');
  expect(validateQuestion(q!, { englishLevel: 1 })).toEqual([]);
});

test('P0.5 observação: 8 boas + 3 ruins ficam na prova e os códigos vão para o sanitize', () => {
  const good = rows.filter((r) => r.expect === 'ok' && r.id !== '2026-09-15-q4-dup');
  const tags = ['alfa', 'beta', 'gama', 'delta', 'epsilon'];
  const eight = [...good];
  while (eight.length < 9) {
    const n = eight.length;
    const base = good[n % good.length];
    eight.push({ ...base, question: `${base.question} Variante ${tags[n % tags.length]}.` });
  }
  const bad = [
    byId.get('2026-09-15-q1')!,
    byId.get('2026-09-15-q3')!,
    byId.get('2026-09-15-q5')!,
  ];
  const batch = [...eight, ...bad];
  const { kept, dropped, perQuestion } = selectValidQuestions(batch, { englishLevel: 1 }, false);
  expect(kept.length).toBe(batch.length);
  expect(perQuestion.length).toBe(batch.length);
  expect(perQuestion.some((p) => p.codes.includes('enunciado_vazou'))).toBe(true);
  expect(Boolean(dropped.enunciado_vazou)).toBe(true);
  expect(Boolean(dropped.conta_um_passo)).toBe(true);
  expect(Boolean(dropped.capital)).toBe(true);
  const strict = selectValidQuestions(batch, { englishLevel: 1 }, true);
  expect(strict.kept.length >= 8).toBe(true);
  expect(strict.kept.length < batch.length).toBe(true);
});

const CASOS = [
  ['caso-19-09-q8', 'reprova'],
  ['caso-19-09-q4', 'reprova'],
  ['caso-17-09-q4', 'reprova'],
  ['caso-22-09-q7', 'reprova'],
  ['caso-14-09-q6', 'reprova'],
  ['caso-19-09-q6', 'reprova'],
  ['caso-18-09-q6', 'reprova'],
  ['caso-22-09-q4', 'reprova'],
  ['caso-21-09-q6', 'reprova'],
  ['caso-19-09-q1', 'reprova'],
  ['caso-20-09-q5', 'reprova'],
  ['caso-20-09-q8', 'reprova'],
  ['caso-21-09-q8', 'reprova'],
  ['caso-21-09-q3', 'reprova'],
  ['caso-18-09-q3', 'reprova'],
  ['caso-15-09-q4-seq', 'reprova'],
  ['caso-18-09-q1', 'reprova'],
  ['caso-19-09-q3', 'reprova'],
  ['2026-09-21-q4', 'aprova'],
  ['caso-15-09-q8-posicao', 'reprova'],
] as const;

test('§4.3: os 20 casos batem o veredito', () => {
  for (const [id, verdict] of CASOS) {
    const row = byId.get(id);
    expect(row).toBeTruthy();
    const similar = row?.similarTo ? byId.get(row.similarTo) : undefined;
    const codes = validateQuestion(row!, {
      englishLevel: 1,
      ...(similar?.question
        ? { avoidRecent: [{ subject: similar.subject ?? '', words: contentWords(similar.question) }] }
        : {}),
    });
    if (verdict === 'aprova') expect(codes).toEqual([]);
    else expect(codes.length > 0).toBe(true);
  }
  const knights = validateQuestion(byId.get('caso-22-09-q4')!, { englishLevel: 1 });
  expect(knights.includes('enunciado_vazou')).toBe(false);
  const posicao = validateQuestion(byId.get('caso-15-09-q8-posicao')!, { englishLevel: 1 });
  expect(posicao).toContain('futebol_solto');
  const onlyWhy = validateQuestion(byId.get('caso-19-09-q3')!, { englishLevel: 1 });
  expect(onlyWhy).toEqual(['why_sem_resposta']);
  const opinion = validateQuestion(byId.get('caso-21-09-q3')!, { englishLevel: 1 });
  expect(opinion).toContain('opiniao');
  expect(opinion).toContain('opcao_caricata');
  const uneven = validateQuestion(byId.get('caso-18-09-q3')!, { englishLevel: 1 });
  expect(uneven).toContain('tamanho_opcoes');
  expect(uneven).toContain('opcao_caricata');
});

test('conta que o reachable não lê fica marcada e segue para o revisor', () => {
  const q = byId.get('2026-09-22-q4')!;
  const { kept, perQuestion } = selectValidQuestions([q], { englishLevel: 1 }, true);
  expect(perQuestion[0].codes).toContain('conta_nao_fecha');
  expect(kept).toHaveLength(1);
});

test('P0.5: 7 boas não viram prova de 8', () => {
  const good = rows.filter((r) => r.expect === 'ok');
  const seven = [...good, good[0], good[0], good[0], good[0]].slice(0, 7);
  const { kept } = selectValidQuestions(seven, { englishLevel: 1 });
  expect(kept.length < 8).toBe(true);
});

const probe = JSON.parse(
  readFileSync(resolve('docs/exemplos/telas/etapa-3/prova-v3/sonda-lider-2026-09-23-raw.json'), 'utf8'),
) as { questions: RawQuestion[] };

test('o mesmo enunciado duas vezes não entra duas vezes na prova', () => {
  const q = byId.get('2026-09-21-q4')!;
  const { kept, perQuestion } = selectValidQuestions([q, { ...q }], { englishLevel: 1 }, true);
  expect(kept).toHaveLength(1);
  expect(perQuestion[1].codes).toContain('duplicata');
});

test('P0.5: completar do banco não troca a prova da IA', () => {
  const ai = [byId.get('2026-09-21-q4')!, byId.get('2026-09-15-q8')!];
  const offline = [byId.get('2026-09-16-q8')!, byId.get('caso-15-09-q8-posicao')!];
  const filled = fillToCount(ai, offline, 3);
  expect(filled.questions[0].question).toBe(ai[0].question);
  expect(filled.questions[1].question).toBe(ai[1].question);
  expect(filled.fromOffline).toBe(1);
  expect(filled.questions).toHaveLength(3);
  const full = fillToCount([ai[0], ai[0], ai[0], ai[0], ai[0], ai[0], ai[0], ai[0]], offline, 8);
  expect(full.fromOffline).toBe(0);
  expect(full.questions).toHaveLength(8);
});

test('why cita is quando a resposta é essa palavra curta', () => {
  const codes = validateQuestion(
    {
      question: 'There ___ a cat on the roof.',
      options: ['is', 'are', 'am', 'be'],
      answer: 'is',
      why: 'A resposta certa é is porque there is vale para uma coisa só, como o gato no telhado da casa.',
      trap: 'Quem marca are pensa em várias coisas e esquece que a frase fala de um gato só no telhado.',
      subject: 'ingles',
      skill: 'ING.N1.BE',
      bloom: 'aplicar',
      audioText: 'There is a cat on the roof.',
      kind: 'knowledge',
    },
    { englishLevel: 1 },
  );
  expect(codes.includes('why_sem_resposta')).toBe(false);
});

test('inglês: o quarteto da mesma frase não é sinônimo, e o because da explicação não sobe o nível', () => {
  const codes = validateQuestion(
    {
      question: 'Which sentence is correct?',
      options: [
        'There is a cat on the mat',
        'There are a cat on the mat',
        'There is cats on the mat',
        'There are cat on the mat',
      ],
      answer: 'There is a cat on the mat',
      why: 'A frase certa é There is a cat on the mat porque um gato só usa is, e a palavra because fica de fora neste nível.',
      trap: 'A frase There are a cat on the mat engana quem acha que are serve para qualquer gato, mas are pede o plural.',
      subject: 'ingles',
      skill: 'ING.N1.BE',
      bloom: 'aplicar',
      audioText: 'There is a cat on the mat',
      kind: 'knowledge',
    },
    { englishLevel: 1 },
  );
  expect(codes.includes('sinonimas')).toBe(false);
  expect(codes.includes('ingles_nivel')).toBe(false);
  expect(codes.includes('audio_mismatch')).toBe(false);
});

test('tipos_mistos não pega 2 palavras ao lado de 3', () => {
  const codes = validateQuestion(
    {
      question: 'O que a chegada das máquinas a vapor trouxe para as cidades?',
      options: ['Crescimento rápido', 'Desaparecimento das fábricas', 'Menos empregos', 'Menos pessoas'],
      answer: 'Crescimento rápido',
      why: 'A resposta certa é Crescimento rápido porque as fábricas atraíram muita gente para trabalhar nas cidades.',
      trap: 'Quem marca Menos empregos pensa que a máquina só tirou serviço e esquece a fábrica nova.',
      subject: 'historia',
      skill: 'HIS.FATO',
      bloom: 'entender',
      kind: 'knowledge',
    },
    { englishLevel: 1 },
  );
  expect(codes.includes('tipos_mistos')).toBe(false);
  expect(codes.includes('tamanho_opcoes')).toBe(false);
});

test('sonda: Q1 passa why_sem_resposta (palavra da resposta, não a frase inteira)', () => {
  const codes = validateQuestion(probe.questions[0], { englishLevel: 1 });
  expect(codes.includes('why_sem_resposta')).toBe(false);
});

test('sonda: Q2 cai em opiniao e o dilema Q3 não', () => {
  expect(validateQuestion(probe.questions[1], { englishLevel: 1 })).toContain('opiniao');
  expect(validateQuestion(probe.questions[2], { englishLevel: 1 }).includes('opiniao')).toBe(false);
});

test('sonda: par mínimo de oxigênio e de a/an não é sinônimo; iguais ainda colidem', () => {
  const oxigenio = validateQuestion(probe.questions[6], { englishLevel: 1 });
  const artigo = validateQuestion(probe.questions[7], { englishLevel: 1 });
  expect(oxigenio.includes('sinonimas')).toBe(false);
  expect(artigo.includes('sinonimas')).toBe(false);
  const iguais = validateQuestion(
    {
      ...probe.questions[6],
      options: [
        'Menos oxigênio no ar',
        'Menos oxigênio no ar',
        'Mais água potável',
        'Menos luz solar',
      ],
    },
    { englishLevel: 1 },
  );
  expect(iguais).toContain('duas_certas');
});

function shell(over: Partial<RawQuestion>): RawQuestion {
  return {
    question: 'Pergunta de teste com bastante texto para não vazar.',
    options: ['Uma frase curta aqui', 'Outra frase curta aqui', 'Mais uma frase curta', 'A última frase curta'],
    answer: 'Uma frase curta aqui',
    why: 'A resposta certa é Uma frase curta aqui porque o teste precisa de uma explicação longa em português do Brasil.',
    trap: 'Quem marca Outra frase curta aqui escolhe o distrator e erra a regra que o teste quer ver.',
    subject: 'tema',
    skill: 'LIC.IDEIA',
    bloom: 'entender',
    kind: 'lesson',
    ...over,
  };
}

test('6b: why em inglês cai e o exemplo em português passa', () => {
  const ruim = validateQuestion(
    shell({ why: "The past tense 'defended' correctly fits the sentence context." }),
    { englishLevel: 1 },
  );
  expect(ruim).toContain('explicacao_em_ingles');
  const bom = validateQuestion(
    shell({
      why: "Depois de 'yesterday' o verbo vai para o passado: 'defended'. 'Defends' é o presente, de todo dia, e a frase pede o passado.",
    }),
    { englishLevel: 1 },
  );
  expect(bom.includes('explicacao_em_ingles')).toBe(false);
});

test('6b: formas do mesmo verbo sem marca de tempo caem', () => {
  const base = {
    options: ['defends', 'defended', 'defense', 'defending'],
    answer: 'defended',
    subject: 'ingles',
    skill: 'ING.N1.BE',
    why: 'A resposta certa é defended porque a frase pede o passado e defended é a forma que cabe aqui no castelo.',
    trap: 'Quem marca defends escolhe o presente e esquece que a marca de tempo pede o passado do verbo.',
  };
  const sem = validateQuestion(
    shell({ ...base, question: 'The knight ___ the castle bravely.', audioText: 'The knight defended the castle bravely.' }),
    { englishLevel: 1 },
  );
  expect(sem).toContain('ingles_sem_marcador');
  const com = validateQuestion(
    shell({ ...base, question: 'The knight defended the castle yesterday.', audioText: 'The knight defended the castle yesterday.' }),
    { englishLevel: 1 },
  );
  expect(com.includes('ingles_sem_marcador')).toBe(false);
});

test('6b: futebol como matéria cai e a conta da partida passa', () => {
  const regra = validateQuestion(
    shell({
      question: 'Se um jogador está fora de campo durante o jogo, o que deve acontecer?',
      subject: 'futebol',
      skill: 'GEN.CONH',
    }),
    { englishLevel: 1 },
  );
  expect(regra).toContain('futebol_solto');
  const conta = validateQuestion(
    shell({
      question: '2 gols no 1º tempo, sofreu 3, terminou 4 a 3. Quantos gols saíram no segundo tempo?',
      subject: 'matematica',
      skill: 'MAT.OP2',
      scenario: 'futebol',
      options: ['2', '3', '4', '5'],
      answer: '2',
    }),
    { englishLevel: 1 },
  );
  expect(conta.includes('futebol_solto')).toBe(false);
});

test('6b: qual é a função do X no futebol é definição', () => {
  const frases = [
    "Qual é a função do 'penalty kick' no futebol?",
    "Qual é a função do 'goal kick' no futebol?",
    "Qual é a função do 'midfielder' em um time de futebol?",
  ];
  for (const question of frases) {
    const codes = validateQuestion(shell({ question, subject: 'futebol', skill: 'GEN.CONH' }), { englishLevel: 1 });
    expect(codes).toContain('definicao');
  }
});

test('6b: skill escrito como matéria ganha o código e o subject', () => {
  const codes = validateQuestion(
    shell({
      skill: 'ciências',
      subject: '',
      scenario: 'futebol',
      question: 'No 1º tempo saíram 2 gols e no 2º saíram 3. Quantos gols o time fez no jogo?',
      options: ['5', '6', '4', '1'],
      answer: '5',
      why: 'A resposta certa é 5 porque 2 gols do primeiro tempo mais 3 do segundo fecham 5 gols no jogo inteiro.',
      trap: 'Quem marca 6 soma um gol que a pergunta não contou nos dois tempos do jogo.',
    }),
    { englishLevel: 1 },
  );
  expect(codes.includes('campo_invalido')).toBe(false);
  expect(codes.includes('futebol_solto')).toBe(false);
});

test('6b: a posição 1-3 guarda ideia, aplica e dilema, e o skill não passa de dois', () => {
  const slots = quizSlots(8, 1);
  expect(slots[0].skill).toBe('LIC.IDEIA');
  expect(slots[1].skill).toBe('LIC.APLICA');
  expect(slots[2].skill).toBe('LIC.DILEMA');
  expect(slots[2].kind).toBe('dilemma');
  expect(slots.some((slot) => slot.scenario === 'futebol')).toBe(true);
  const lote: RawQuestion[] = [
    { question: 'ideia', skill: 'LIC.IDEIA', subject: 'tema' },
    { question: 'aplica', skill: 'LIC.APLICA', subject: 'tema' },
    { question: 'dilema', skill: 'LIC.DILEMA', kind: 'dilemma', subject: 'tema' },
    { question: 'There is a dog.', skill: 'ING.N1.BE', subject: 'ingles' },
    { question: 'The team scores now.', skill: 'ING.N1.BE', subject: 'ingles', scenario: 'futebol' },
    { question: 'There is a cat.', skill: 'ING.N1.BE', subject: 'ingles', scenario: 'futebol' },
  ];
  const { placed } = placeIntoSlots(lote, slots);
  expect(placed[0]?.skill).toBe('LIC.IDEIA');
  expect(placed[1]?.skill).toBe('LIC.APLICA');
  expect(placed[2]?.skill).toBe('LIC.DILEMA');
  const be = placed.filter((q) => q?.skill === 'ING.N1.BE');
  expect(be).toHaveLength(2);
});

test('sonda: Q8 compara o áudio com a resposta quando o enunciado não tem a frase', () => {
  const codes = validateQuestion(probe.questions[7], { englishLevel: 1 });
  expect(codes.includes('audio_mismatch')).toBe(false);
});

test('why_circular: fato reconhecido sem causa cai; com ano e lugar fica', () => {
  const base = {
    question: 'O que aconteceu com o gelo no sol?',
    options: ['derrete', 'cresce', 'some', 'quebra'],
    answer: 'derrete',
    trap: 'Quem marca some acha que o gelo desaparece no ar e esquece que ele vira água no copo.',
    skill: 'CIE.CAUSA',
    subject: 'ciencias',
    bloom: 'entender',
    kind: 'knowledge',
  };
  const circular = validateQuestion({
    ...base,
    why: 'Porque é um fato histórico amplamente reconhecido e bem documentado nos livros de sempre sem mais nada.',
  });
  expect(circular.includes('why_circular')).toBe(true);
  const caused = validateQuestion({
    ...base,
    why: 'Em 1822 no Rio o gelo derrete porque o sol esquenta a água e ela muda de estado no copo da mesa.',
  });
  expect(caused.includes('why_circular')).toBe(false);
});

test('dilema_com_certa: o why do dilema não diz qual é a certa', () => {
  const base = {
    question: 'O amigo ficou de fora. Qual atitude é a mais justa?',
    options: ['Chamo ele', 'Fico quieto', 'Sigo jogando', 'Digo fechou'],
    answer: 'Chamo ele',
    trap: 'Quem marca Fico quieto deixa o amigo sozinho e chama isso de respeito ao jogo dos outros.',
    skill: 'LIC.DILEMA',
    subject: 'tema',
    bloom: 'analisar',
    kind: 'dilemma',
  };
  const bad = validateQuestion({
    ...base,
    why: 'A resposta certa é chamar o amigo porque ficar quieto abandona quem quer jogar junto no recreio.',
  });
  expect(bad.includes('dilema_com_certa')).toBe(true);
  const ok = validateQuestion({
    ...base,
    why: 'Chamar o amigo muda o jogo para os dois. Ficar quieto abandona quem quer entrar no recreio.',
  });
  expect(ok.includes('dilema_com_certa')).toBe(false);
});

test('lote curto chega a 8: substituição de 1 e banco de qualquer área; dilema vazio vira conhecimento', () => {
  const q = (n: number, subject: string): RawQuestion => ({
    question: `pergunta ${n} sobre ${subject}`,
    subject,
    kind: 'knowledge',
    skill: 'GEN.CONH',
  });
  const kept = [q(1, 'tema'), q(2, 'tema'), q(3, 'matematica'), q(4, 'ciencias'), q(5, 'historia')];
  const replacement = [q(6, 'geografia')];
  const seated: (RawQuestion | null)[] = [...kept, ...replacement, null, null];
  const second = fillAnyArea(seated, [q(7, 'ingles')]);
  expect(second.used).toBe(1);
  const offline = fillAnyArea(second.placed, [q(8, 'matematica'), q(9, 'ciencias')]);
  const final = offline.placed.filter((item): item is RawQuestion => item != null);
  expect(final).toHaveLength(8);
  expect(second.used + offline.used).toBe(2);

  const dilemmaHole: (RawQuestion | null)[] = [q(1, 'tema'), q(2, 'tema'), null, q(4, 'matematica'), q(5, 'ciencias'), q(6, 'historia'), q(7, 'geografia'), q(8, 'ingles')];
  const filled = fillAnyArea(dilemmaHole, [{ ...q(3, 'futebol'), kind: 'knowledge' }]);
  const quiz = filled.placed.filter((item): item is RawQuestion => item != null);
  expect(quiz).toHaveLength(8);
  expect(quiz.some((item) => item.kind === 'dilemma')).toBe(false);
});

test('C1: o prefixo da certa sai e o dilema passa; no meio continua reprovado', () => {
  const original = "A resposta certa é 'Conversar sobre prioridades' porque ajuda o amigo a refletir sobre suas escolhas e necessidades.";
  expect(stripCertaPrefix(original)).toBe('Ajuda o amigo a refletir sobre suas escolhas e necessidades.');
  const base = {
    question: 'O amigo quer o brinquedo agora. Qual atitude é a mais justa?',
    options: ['Converso sobre prioridades', 'Compro na hora', 'Escondo o dinheiro', 'Digo que não tem'],
    answer: 'Converso sobre prioridades',
    trap: 'Quem marca Compro na hora paga o preço de gastar o que era para outra coisa.',
    skill: 'LIC.DILEMA',
    subject: 'tema',
    bloom: 'analisar',
    kind: 'dilemma' as const,
  };
  const kept = selectValidQuestions([{ ...base, why: original }], {});
  expect(kept.kept).toHaveLength(1);
  expect(kept.kept[0].why).toBe('Ajuda o amigo a refletir sobre suas escolhas e necessidades.');
  expect(kept.dropped.dilema_com_certa).toBe(undefined);
  const middle = validateQuestion({
    ...base,
    why: 'Conversar ajuda, mas a resposta certa no meio da frase ainda entrega o gabarito para a criança.',
  });
  expect(middle.includes('dilema_com_certa')).toBe(true);
});

test('fato_solto: o molde da trivia cai fora da ideia', () => {
  const base = {
    options: ['Começou no século XVIII', 'Foi no século XX', 'Iniciou no Brasil', 'Durou 10 anos'],
    answer: 'Começou no século XVIII',
    why: 'A Revolução Industrial começou na Inglaterra no século XVIII porque as máquinas a vapor mudaram as fábricas.',
    trap: 'Quem marca Foi no século XX confunde com as guerras do século passado e erra o começo das fábricas.',
    skill: 'HIS.FATO',
    subject: 'historia',
    bloom: 'entender',
    kind: 'knowledge' as const,
  };
  const industrial = validateQuestion({
    ...base,
    question: 'Qual fato é verdadeiro sobre a Revolução Industrial?',
  });
  expect(industrial.includes('fato_solto')).toBe(true);
  const francesa = validateQuestion({
    ...base,
    question: 'Qual fato é verdadeiro sobre a Revolução Francesa?',
    options: ['Começou em 1789', 'Foi em 1500', 'Iniciou no Brasil', 'Durou 10 anos'],
    answer: 'Começou em 1789',
  });
  expect(francesa.includes('fato_solto')).toBe(true);
  const lesson = validateQuestion({
    ...base,
    question: 'Qual fato é verdadeiro sobre a Revolução Industrial?',
    skill: 'LIC.IDEIA',
    subject: 'tema',
    kind: 'lesson',
  });
  expect(lesson.includes('fato_solto')).toBe(false);
});

test('C2: o pedaço da certa só vale no começo da palavra', () => {
  const pack = (question: string, answer: string): RawQuestion => ({
    question,
    options: [answer, 'outra medida longa', 'mais uma medida', 'a última medida'],
    answer,
    why: 'A explicação nomeia a resposta e diz por que a etapa pela metade engana quem para cedo demais.',
    trap: 'Quem marca a primeira errada parou na etapa pela metade e não fechou a conta do enunciado.',
    skill: 'MAT.OP2',
    subject: 'matematica',
    bloom: 'aplicar',
    kind: 'knowledge',
  });
  const perimetro = validateQuestion({
    ...pack('Um campinho tem 120 metros de perímetro. Quanto mede o outro lado?', '20 metros'),
    options: ['20 metros', '40 metros', '70 metros', '50 metros'],
  });
  expect(perimetro.includes('enunciado_vazou')).toBe(false);
  const drible = validateQuestion({
    ...pack('qual o nome da técnica de driblar', 'Drible'),
    options: ['Drible', 'Passe', 'Chute', 'Cruzamento'],
    skill: 'LIC.IDEIA',
    subject: 'tema',
    kind: 'lesson',
  });
  expect(drible.includes('enunciado_vazou')).toBe(true);
});

test('10b-2: palavra da certa no enunciado', () => {
  const pack = (question: string, answer: string, options: string[], skill = 'CIE.CAUSA'): RawQuestion => ({
    question,
    options,
    answer,
    why: 'A explicação nomeia a resposta e diz por que a etapa pela metade engana quem para cedo.',
    trap: 'Quem marca a primeira errada parou na etapa pela metade e não fechou a conta do enunciado.',
    skill,
    subject: skill.startsWith('LIC') ? 'tema' : skill.startsWith('MAT') ? 'matematica' : skill.startsWith('ING') ? 'ingles' : 'ciencias',
    bloom: 'aplicar',
    kind: skill === 'LIC.DILEMA' ? 'dilemma' : skill.startsWith('LIC') ? 'lesson' : 'knowledge',
  });
  const loco = validateQuestion(pack(
    'Como a primeira locomotiva a vapor se movia?',
    'Com vapor',
    ['Com vapor', 'Com eletricidade', 'Com gasolina', 'Com vento'],
  ));
  expect(loco.includes('enunciado_vazou')).toBe(true);
  const troia = validateQuestion(pack(
    'Por que os gregos usaram um cavalo de madeira na história de Troia?',
    'Para enganar os troianos',
    ['Para enganar os troianos', 'Para presentear os deuses', 'Para construir uma estátua', 'Para transportar comida'],
    'LIC.IDEIA',
  ));
  expect(troia.includes('enunciado_vazou')).toBe(false);
  const published: RawQuestion[] = [
    pack('Um retângulo tem 12 cm de comprimento e 5 cm de largura. Qual é o perímetro dele?', '34 cm', ['34 cm', '17 cm', '60 cm', '24 cm'], 'MAT.OP2'),
    pack('Você e seus amigos querem construir um carrinho de brinquedo. Qual atitude é a mais justa?', 'Pesquiso como fazer', ['Pesquiso como fazer', 'Deixo para outro dia', 'Espero alguém ajudar', 'Desisto da ideia'], 'LIC.DILEMA'),
    pack('Uma loja vende 25 livros por dia. Em 4 dias, quantos 3 lojas vendem juntas?', '300', ['300', '100', '75', '200'], 'MAT.OP2'),
    pack('O que aconteceria se um carro elétrico ficasse sem bateria?', 'Pararia', ['Pararia', 'Explodiria', 'Aceleraria', 'Flutuaria']),
    pack('There ___ a bird in the sky.', 'is', ['is', 'are', 'am', 'be'], 'ING.N1.BE'),
    pack('Durante uma partida de futebol, o vento está forte. O que acontece com a bola?', 'Muda de direção', ['Muda de direção', 'Fica parada', 'Afunda no gramado', 'Sobe sozinha']),
    pack('Por que a mesma raiz é chamada de mandioca, aipim e macaxeira?', 'Diferenças regionais', ['Diferenças regionais', 'Tipos diferentes', 'Cores variadas', 'Tamanhos distintos'], 'LIC.IDEIA'),
    pack('Em uma feira no Rio de Janeiro, como a raiz é chamada?', 'Aipim', ['Mandioca', 'Aipim', 'Macaxeira', 'Batata'], 'LIC.APLICA'),
    pack('Você e seus amigos querem fazer uma festa surpresa. Qual atitude é a mais justa?', 'Conversa sobre prioridades', ['Conversa sobre prioridades', 'Fico quieto sobre a festa', 'Deixo a ideia de lado', 'Faço tudo sozinho'], 'LIC.DILEMA'),
    pack('Uma loja vende 30 pacotes de mandioca por dia. Em 5 dias, quantos 4 lojas vendem juntas?', '600', ['600', '150', '120', '100'], 'MAT.OP2'),
    pack('O que aconteceria se a mandioca não fosse cozida antes de comer?', 'Pode ser tóxica', ['Nada acontece', 'Pode ser tóxica', 'Fica mais saborosa', 'Perde nutrientes']),
    pack('There ___ a rabbit in the garden.', 'is', ['is', 'are', 'am', 'be'], 'ING.N1.BE'),
    pack('Cada caixa guarda 6 ovos. Quantas caixas são necessárias para guardar 40 ovos?', '7', ['7', '6', '8', '5'], 'MAT.OP2'),
    pack('Durante uma partida de futebol, o campo está encharcado. O que acontece com a bola?', 'Fica mais pesada', ['Fica mais pesada', 'Quica mais alto', 'Rola mais rápido', 'Fica invisível']),
    pack('Se você estivesse em Troia, o que veria ao abrir os portões para o cavalo?', 'Soldados escondidos', ['Um cavalo vazio', 'Soldados escondidos', 'Um presente dos deuses', 'Comida para a cidade'], 'LIC.APLICA'),
    pack('Você descobre que um amigo está sendo excluído do grupo. Qual atitude é a mais justa?', 'Conversa com o grupo sobre inclusão', ['Conversa com o grupo sobre inclusão', 'Ignora e continua com seus amigos', 'Fala para o amigo procurar outro grupo', 'Diz que não pode fazer nada'], 'LIC.DILEMA'),
    pack('Uma loja vende 40 maçãs por dia. Em 3 dias, quantas 5 lojas vendem juntas?', '600', ['600', '200', '120', '60'], 'MAT.OP2'),
    pack('Por que as plantas precisam de luz solar para crescer?', 'Para fazer fotossíntese', ['Para fazer fotossíntese', 'Para se proteger do frio', 'Para absorver água', 'Para evitar predadores']),
    pack('There ___ a lion in the zoo.', 'is', ['is', 'are', 'am', 'be'], 'ING.N1.BE'),
    pack('Por que os gregos usaram um cavalo de madeira na história de Troia?', 'Para enganar os troianos', ['Para enganar os troianos', 'Para presentear os deuses', 'Para construir uma estátua', 'Para transportar comida'], 'LIC.IDEIA'),
  ];
  expect(published).toHaveLength(20);
  for (const q of published) expect(validateQuestion(q).includes('enunciado_vazou')).toBe(false);
});

void run();
