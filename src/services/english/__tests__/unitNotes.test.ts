import { expect, run, test } from './harness';
import { UNIT_ORDER, unitById } from '../../../config/englishUnits';
import { noteFromUnit } from '../units';
import { allPegsOn, pegLit, trayForStage } from '../notePlay';
import { normalizedTokens } from '../notePrecheck';

const notes = UNIT_ORDER.flatMap((id) => [noteFromUnit(unitById(id), 0), noteFromUnit(unitById(id), 1)]);

test('recado da unidade: a frase-guia acende os três pregos, e o quadro vazio nenhum', () => {
  expect(notes.length).toBe(20);
  for (const n of notes) {
    expect(n.mustInclude.length).toBe(3);
    if (!allPegsOn(n.model, n.mustInclude)) throw new Error(`frase-guia não acende tudo: ${n.model}`);
    if (pegLit('', n.mustInclude).some(Boolean)) throw new Error(`quadro vazio acende prego: ${n.model}`);
  }
});

test('recado da unidade: as chaves são palavras da frase-guia, nada de português (23/10)', () => {
  for (const n of notes) {
    const model = new Set(normalizedTokens(n.model));
    for (const info of n.mustInclude) {
      const first = normalizedTokens(info.en[0]);
      if (!first.length || first.some((t) => !model.has(t))) throw new Error(`chave fora da frase: "${info.en[0]}" em ${n.model}`);
    }
  }
  const umbrella = noteFromUnit(unitById('u2'), 1);
  expect(pegLit('There is an umbrella in my bag.', umbrella.mustInclude)).toEqual([true, false, false]);
  expect(pegLit('I have a ball. It is new.', umbrella.mustInclude)).toEqual([false, true, true]);
});

test('recado da unidade: no degrau "escrever" o banco aparece com as palavras da frase', () => {
  for (const n of notes) {
    const tray = trayForStage(1, n.model, n.wordBank);
    if (tray.length < 5) throw new Error(`banco vazio no degrau 1: ${n.model}`);
  }
  const umbrella = noteFromUnit(unitById('u2'), 1);
  const tray = trayForStage(1, umbrella.model, umbrella.wordBank);
  expect(tray.includes('umbrella') && tray.includes('ball') && tray.includes('new')).toBe(true);
  // "I" e nomes não viram minúscula; o começo de frase vira
  expect(tray.includes('I') && !tray.includes('i')).toBe(true);
  expect(tray.includes('there') && !tray.includes('There')).toBe(true);
  const leo = noteFromUnit(unitById('u7'), 1);
  expect(trayForStage(1, leo.model, leo.wordBank).includes('Leo')).toBe(true);
});

void run();
