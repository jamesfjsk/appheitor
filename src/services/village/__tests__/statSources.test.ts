import { expect, run, test } from '../../english/__tests__/harness';
import { GAME_ACHIEVEMENTS } from '../../../data/achievements';
import { NPC_QUESTS } from '../../../data/npcQuests';
import { STAT_SOURCES } from '../statSources';

const NO_SOURCE_YET = new Set(['saverWeeks', 'creeperClicks', 'weekQuestion', 'shelfFixed']);

test('todo stat de conquista ou pedido tem fonte em STAT_SOURCES', () => {
  const missing: string[] = [];
  for (const ach of GAME_ACHIEVEMENTS) {
    if (NO_SOURCE_YET.has(ach.stat)) missing.push(`ach:${ach.id}:${ach.stat} (devia estar fora do catálogo)`);
    else if (!STAT_SOURCES[ach.stat]) missing.push(`ach:${ach.id}:${ach.stat}`);
  }
  for (const [npc, chapters] of Object.entries(NPC_QUESTS)) {
    for (const q of chapters) {
      if (NO_SOURCE_YET.has(q.stat)) missing.push(`quest:${npc}:${q.chapter}:${q.stat} (devia estar fora)`);
      else if (!STAT_SOURCES[q.stat]) missing.push(`quest:${npc}:${q.chapter}:${q.stat}`);
    }
  }
  expect(missing).toEqual([]);
});

test('capítulo 4 do Sábio é o livro e tem fonte', () => {
  const livro = NPC_QUESTS.sabio.find((c) => c.chapter === 4);
  const todas = NPC_QUESTS.sabio.find((c) => c.chapter === 3);
  expect(todas?.title).toBe('Todas');
  expect(todas?.ask).toBe('Acerte todas as perguntas da prova');
  expect(todas?.stat).toBe('quizPerfect');
  expect(livro?.title).toBe('Livro');
  expect(livro?.ask).toBe('Conte um livro para o Sábio');
  expect(livro?.stat).toBe('booksRead');
  expect(STAT_SOURCES.booksRead.where).toMatch(/bookService/);
  expect(STAT_SOURCES.themesSet).toBe(undefined);
});

test('todo where cita arquivo ou função real', () => {
  const bad: string[] = [];
  for (const [stat, src] of Object.entries(STAT_SOURCES)) {
    if (!/[\w./-]+\.[A-Za-z_(]/.test(src.where)) bad.push(`${stat}:${src.where}`);
  }
  expect(bad).toEqual([]);
  expect(STAT_SOURCES.merchantBuys.where).toMatch(/qty/);
});

run();
