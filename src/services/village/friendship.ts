import type { NpcId } from '../../types/village';
import { claimKey } from './claims';

export type TierGift = { key: string; rare: 'esmeralda' | 'diamante' };

/** Presentes dos degraus 3 e 5 cruzados, sem pagar de novo se já houver chave nova ou antiga. */
export function tierGifts(
  npc: NpcId,
  prevTier: number,
  nextTier: number,
  claimed: Record<string, string>,
): TierGift[] {
  const gifts: TierGift[] = [];
  for (const t of [3, 5] as const) {
    if (prevTier >= t || nextTier < t) continue;
    const giftKey = `npcgift:${npc}:${t}`;
    const oldKey = claimKey('friend', `${npc}:${t}`);
    if (claimed[giftKey] || claimed[oldKey]) continue;
    gifts.push({ key: giftKey, rare: t === 5 ? 'diamante' : 'esmeralda' });
  }
  return gifts;
}
