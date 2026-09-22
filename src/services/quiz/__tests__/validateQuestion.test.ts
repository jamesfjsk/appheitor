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
  selectValidQuestions,
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

test('P0.2: 28 códigos nomeados', () => {
  expect(REJECT_CODES).toHaveLength(28);
  expect(REJECT_CODES).toContain('opiniao');
  expect(REJECT_CODES).toContain('opcao_caricata');
  expect(REJECT_CODES).toContain('tamanho_opcoes');
  expect(REJECT_CODES).toContain('certa_mais_longa');
  expect(REJECT_CODES).toContain('tipos_mistos');
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
  ['caso-15-09-q8-posicao', 'aprova'],
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
  expect(posicao).toEqual([]);
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

test('sonda: Q8 compara o áudio com a resposta quando o enunciado não tem a frase', () => {
  const codes = validateQuestion(probe.questions[7], { englishLevel: 1 });
  expect(codes.includes('audio_mismatch')).toBe(false);
});

void run();
