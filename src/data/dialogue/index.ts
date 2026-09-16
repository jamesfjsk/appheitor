import type { DialogueEntry } from '../../services/village/dialogue';
import type { NpcId } from '../../types/village';
import { DIALOGUE_FALLBACK } from './fallback';
import { DIALOGUE as SABIO } from './sabio';
import { DIALOGUE as COMERCIANTE } from './comerciante';
import { DIALOGUE as FERREIRO } from './ferreiro';
import { DIALOGUE as OLHEIRO } from './olheiro';

const EXTRA: Record<NpcId, DialogueEntry[]> = {
  sabio: SABIO,
  comerciante: COMERCIANTE,
  ferreiro: FERREIRO,
  olheiro: OLHEIRO,
};

export const DIALOGUE_BY_NPC: Record<NpcId, DialogueEntry[]> = {
  sabio: [...DIALOGUE_FALLBACK.filter((e) => e.npc === 'sabio'), ...EXTRA.sabio],
  comerciante: [...DIALOGUE_FALLBACK.filter((e) => e.npc === 'comerciante'), ...EXTRA.comerciante],
  ferreiro: [...DIALOGUE_FALLBACK.filter((e) => e.npc === 'ferreiro'), ...EXTRA.ferreiro],
  olheiro: [...DIALOGUE_FALLBACK.filter((e) => e.npc === 'olheiro'), ...EXTRA.olheiro],
};
