import type { NpcId } from '../../types/village';
import { getTodayBrazil } from '../../utils/clock';

/** Depois da transação de origem: evita ciclo de import com villageService. Sempre await. */
export async function bumpVillage(uid: string, deltas: Record<string, number>, extra?: {
  level?: number;
  buildings?: Record<string, number>;
  npcTiers?: Record<string, number>;
  owned?: string[];
  set?: Record<string, number>;
}): Promise<void> {
  if (!uid) return;
  try {
    const m = await import('../villageService');
    await m.applyVillageStats(uid, deltas, extra);
  } catch (e) {
    console.warn('bumpVillage', e);
  }
}

export async function bumpFriend(uid: string, npc: NpcId, bonus = 2, date = getTodayBrazil()): Promise<void> {
  if (!uid) return;
  try {
    const m = await import('../villageService');
    await m.talkToNpc(uid, npc, date, bonus);
  } catch (e) {
    console.warn('bumpFriend', e);
  }
}
