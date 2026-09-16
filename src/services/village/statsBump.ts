import type { NpcId } from '../../types/village';
import { getTodayBrazil } from '../../utils/clock';

/** Depois da transação de origem: evita ciclo de import com villageService. */
export function bumpVillage(uid: string, deltas: Record<string, number>, extra?: {
  level?: number;
  buildings?: Record<string, number>;
  npcTiers?: Record<string, number>;
  owned?: string[];
}): void {
  if (!uid) return;
  void import('../villageService').then((m) => m.applyVillageStats(uid, deltas, extra).catch(() => undefined));
}

export function bumpFriend(uid: string, npc: NpcId, bonus = 2, date = getTodayBrazil()): void {
  if (!uid) return;
  void import('../villageService').then((m) => m.talkToNpc(uid, npc, date, bonus).catch(() => undefined));
}
