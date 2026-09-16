import type { NpcId } from '../../types/village';
import { DIALOGUE_BY_NPC } from '../../data/dialogue';

export interface DialogueCtx {
  hour: number;
  weekday: number;
  level: number;
  tier: number;
  fullDays: number;
  baseLevels: Record<string, number>;
  yesterday: { missed: boolean; complete: boolean };
  today: { done: number; due: number; quizDone: boolean };
  pause?: boolean;
  punish?: boolean;
  firstTime: Set<string>;
}

export interface DialogueEntry {
  id: string;
  npc: NpcId;
  tier: number;
  lines: string[];
  once?: boolean;
  priority: number;
  when: (ctx: DialogueCtx) => boolean;
}

export function pickDialogue(
  npc: NpcId,
  ctx: DialogueCtx,
  seen: readonly string[],
  recent14: readonly string[],
  extra: DialogueEntry[] = []
): DialogueEntry | null {
  const seenSet = new Set(seen);
  const recent = new Set(recent14.slice(-14));
  const pool = [...DIALOGUE_BY_NPC[npc], ...extra].filter((e) => e.npc === npc);
  const eligible = pool
    .filter((e) => ctx.tier >= e.tier)
    .filter((e) => e.when(ctx))
    .filter((e) => !(e.once && seenSet.has(e.id)))
    .filter((e) => !recent.has(e.id));
  const ranked = (eligible.length ? eligible : pool.filter((e) => ctx.tier >= e.tier && e.when(ctx) && !(e.once && seenSet.has(e.id))))
    .slice()
    .sort((a, b) => b.priority - a.priority);
  return ranked[0] ?? null;
}

export function friendTier(points: number): number {
  const mins = [0, 5, 15, 30, 50, 80];
  let t = 0;
  for (let i = 0; i < mins.length; i++) if (points >= mins[i]) t = i;
  return t;
}

export function talkPointsToday(already: number, firstTalk: boolean, domainBonus: number): number {
  const add = (firstTalk ? 1 : 0) + Math.max(0, domainBonus);
  return Math.min(5, already + add);
}
