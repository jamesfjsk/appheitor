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

test('todo where cita arquivo ou função real', () => {
  const bad: string[] = [];
  for (const [stat, src] of Object.entries(STAT_SOURCES)) {
    if (!/[\w./-]+\.[A-Za-z_(]/.test(src.where)) bad.push(`${stat}:${src.where}`);
  }
  expect(bad).toEqual([]);
  expect(STAT_SOURCES.merchantBuys.where).toMatch(/qty/);
});

run();
