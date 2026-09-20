import { expect, run, test } from './harness';
import type { NoteInfo, NoteJudgement } from '../../../types/english';
import { allPegsOn, chalkDiff, chalkLine, explainJudge, fillTemplate, gapCount, gapWidthCh, isLazyNote, missingLine, moldBySentences, moldFromModel, moldFromTemplates, pegLesson, pegLit, pegReview, pegSay, recadoGrade, splitTemplate, teachFromRecado, trayWords } from '../notePlay';

const infos: NoteInfo[] = [
  { pt: '2 tochas', en: ['two torches', '2 torches'] },
  { pt: 'uma tocha azul', en: ['one blue torch', 'a blue torch'] },
  { pt: 'para a caverna', en: ['for the cave'] },
];

test('splitTemplate e fillTemplate', () => {
  const bits = splitTemplate('I need ___ and ___.');
  expect(bits.filter((b) => b.kind === 'gap')).toHaveLength(2);
  expect(gapCount('I need ___ and ___.')).toBe(2);
  expect(fillTemplate('I need ___ and ___.', ['two torches', 'a blue torch'])).toBe('I need two torches and a blue torch.');
  expect(fillTemplate('I need ___ and ___.', ['two torches'])).toContain('___');
});

test('pregos acendem só com a informação no texto', () => {
  const none = pegLit('hello', infos);
  expect(none).toEqual([false, false, false]);
  const some = pegLit('I need two torches for the cave.', infos);
  expect(some[0]).toBeTruthy();
  expect(some[2]).toBeTruthy();
  expect(some[1]).toBeFalsy();
  expect(allPegsOn('I need two torches. A blue torch is for the cave.', infos)).toBeTruthy();
});

test('chalkLine e missingLine falam do quadro', () => {
  expect(missingLine(infos.slice(0, 1))).toContain('2 tochas');
  expect(missingLine(infos.slice(0, 1))).toContain('Ouve');
  const j: NoteJudgement = {
    isEnglish: true,
    missing: [],
    errors: [{ tag: 'plural', wrong: 'torch', fix: 'torches' }],
    corrected: 'I need two torches.',
    note: '',
    score: 2,
  };
  expect(chalkLine(j)).toContain('two');
  expect(recadoGrade(3)).toContain('Três pregos');
  const diff = chalkDiff('I need two torch', 'I need two torches');
  expect(diff.left.some((t) => t.mark === 'bad' && t.text === 'torch')).toBeTruthy();
  expect(diff.right.some((t) => t.mark === 'good' && t.text === 'torches')).toBeTruthy();
});

test('moldBySentences deixa o quadro vazio: uma linha por frase', () => {
  const { mold, slots } = moldBySentences('Please, I want water. I am thirsty.');
  expect(mold).toBe('___. ___.');
  expect(slots).toEqual(['Please, I want water', 'I am thirsty']);
  expect(fillTemplate(mold, slots)).toBe('Please, I want water. I am thirsty.');
  expect(mold.includes('water')).toBeFalsy();
  expect(mold.includes('Please')).toBeFalsy();
});

test('moldFromTemplates guarda a frase e só fura o miolo', () => {
  const framed = moldFromTemplates('I do my homework first. Then I play soccer.', [
    'I do ___ first.',
    'I do ___ first. Then I ___.',
  ]);
  expect(framed).toBeTruthy();
  expect(framed?.mold).toBe('I do ___ first. Then I ___.');
  expect(framed?.slots).toEqual(['my homework', 'play soccer']);
  expect(fillTemplate(framed?.mold ?? '', framed?.slots ?? [])).toBe('I do my homework first. Then I play soccer.');
});

test('moldFromModel junta buracos vizinhos: uma frase, uma lacuna', () => {
  const life: NoteInfo[] = [
    { pt: 'faço a lição', en: ['my homework', 'the homework', 'do my homework'] },
    { pt: 'primeiro', en: ['homework first', 'do first', 'first'] },
    { pt: 'jogo bola', en: ['play soccer', 'play football', 'I play soccer'] },
  ];
  const { mold, slots } = moldFromModel('I do my homework first. Then I play soccer.', life);
  expect(gapCount(mold)).toBe(2);
  expect(mold.includes('___ ___')).toBeFalsy();
  expect(mold).toContain('. Then');
  expect(mold.includes('.Then')).toBeFalsy();
  expect(mold.startsWith('I')).toBeTruthy();
  expect(slots).toEqual(['do my homework first', 'I play soccer']);
  expect(fillTemplate(mold, slots)).toBe('I do my homework first. Then I play soccer.');
  expect(gapWidthCh(slots[0], '') > gapWidthCh('first', '')).toBeTruthy();
});

test('teachFromRecado usa este recado e o que ele escreveu', () => {
  const info = { pt: 'jogo bola', en: ['play soccer'] };
  const brief = 'Faço a lição primeiro. Depois jogo bola.';
  const tip = teachFromRecado(info, brief, 'I do homework');
  expect(tip.hear).toBe('play soccer');
  expect(tip.say.toLowerCase()).toContain('play soccer');
  expect(tip.say).toContain('lição');
  expect(tip.say).toContain('I do homework');
  expect(tip.say.includes('I do my homework first. Then I play soccer')).toBeFalsy();
  expect(isLazyNote('Faltou dizer: jogo bola.')).toBeTruthy();
  expect(isLazyNote('Neste recado, jogo bola se diz play soccer. O pedido era a lição primeiro.')).toBeFalsy();
});

test('explainJudge usa a nota gerada, não um glossário', () => {
  const life: NoteInfo[] = [
    { pt: 'faço a lição', en: ['my homework'] },
    { pt: 'primeiro', en: ['first'] },
    { pt: 'jogo bola', en: ['play soccer'] },
  ];
  const j: NoteJudgement = {
    isEnglish: true,
    missing: ['jogo bola'],
    errors: [],
    corrected: 'I do my homework first.',
    note: 'Você escreveu só a lição. Neste recado, jogo bola se diz play soccer — a bola vem depois, com Then.',
    lessons: [{ pt: 'jogo bola', say: 'Play soccer é jogar bola neste recado, depois da lição.' }],
    score: 2,
  };
  const tip = explainJudge(j, life, 'Faço a lição primeiro. Depois jogo bola.', 'I do my homework first.');
  expect(tip.say).toContain('play soccer');
  expect(tip.say).toContain('lição');
  expect(tip.hear).toBe('play soccer');
  const row = pegReview('I do my homework first.', life)[2];
  expect(pegLesson(row, j, 'Faço a lição primeiro. Depois jogo bola.', 'I do my homework first.')).toContain('Play soccer');
});

test('pegReview e pegSay falam o que acendeu e o que faltou', () => {
  const life: NoteInfo[] = [
    { pt: 'faço a lição', en: ['my homework'] },
    { pt: 'primeiro', en: ['first'] },
    { pt: 'jogo bola', en: ['play soccer'] },
  ];
  const rows = pegReview('I do my homework first.', life);
  expect(rows[0].ok).toBeTruthy();
  expect(rows[1].ok).toBeTruthy();
  expect(rows[2].ok).toBeFalsy();
  expect(pegSay(rows[0])).toContain('Pegou');
  expect(pegSay(rows[2])).toContain('Faltou');
  expect(pegSay(rows[2])).toContain('jogo bola');
});

test('bandeja traz a frase inteira, não só o banco pela metade', () => {
  const tray = trayWords(
    'I need three torches and one pickaxe. They are for the mine.',
    ['need', 'torch', 'sword', 'dog'],
    ['three torches', 'for the mine']
  );
  expect(tray).toContain('I');
  expect(tray).toContain('three');
  expect(tray).toContain('torches');
  expect(tray).toContain('pickaxe');
  expect(tray).toContain('sword');
  expect(tray.filter((w) => w.toLowerCase() === 'need')).toHaveLength(1);
});

void run();
