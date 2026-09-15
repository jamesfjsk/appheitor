import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DEFAULT_ECONOMY } from '../config/village';
import type { GoldTransaction } from '../types';
import type { EconomySettings } from '../types/village';
import { isoWeekOf, nowBrazil } from '../utils/clock';
import { gameGoldRoom } from './village/caps';

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function mapGoldTransaction(id: string, data: Record<string, unknown>): GoldTransaction {
  return {
    id,
    userId: String(data.userId || ''),
    amount: Number(data.amount) || 0,
    type: data.type as GoldTransaction['type'],
    source: data.source as GoldTransaction['source'],
    description: String(data.description || ''),
    relatedId: data.relatedId as string | undefined,
    relatedTitle: data.relatedTitle as string | undefined,
    metadata: data.metadata as Record<string, unknown> | undefined,
    balanceBefore: Number(data.balanceBefore) || 0,
    balanceAfter: Number(data.balanceAfter) || 0,
    createdAt: asDate(data.createdAt),
    createdBy: data.createdBy as string | undefined,
  };
}

function brazilDateOf(d: Date): string {
  return nowBrazil(d.getTime()).date;
}

export async function listGoldTransactions(uid: string, limitCount = 500): Promise<GoldTransaction[]> {
  const snap = await getDocs(query(
    collection(db, 'goldTransactions'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  ));
  return snap.docs.map((d) => mapGoldTransaction(d.id, d.data() as Record<string, unknown>));
}

export function txsOnDate(list: GoldTransaction[], date: string): GoldTransaction[] {
  return list.filter((t) => brazilDateOf(t.createdAt) === date);
}

export function txsInWeek(list: GoldTransaction[], weekIso: string): GoldTransaction[] {
  return list.filter((t) => isoWeekOf(brazilDateOf(t.createdAt)) === weekIso);
}

export async function roomForGameGold(
  uid: string,
  settings: Pick<EconomySettings, 'gameGoldDailyCap' | 'gameGoldWeeklyCap'> = DEFAULT_ECONOMY,
  date = nowBrazil().date
): Promise<{ day: number; week: number; room: number }> {
  const all = await listGoldTransactions(uid);
  return gameGoldRoom(txsOnDate(all, date), txsInWeek(all, isoWeekOf(date)), settings);
}
