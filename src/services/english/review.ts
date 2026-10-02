// Revisão da Ferraria: caixas de 1, 3 e 7 dias, no máximo 30, e 2 barras antigas por dia.

import type { ForgeItem } from '../../types/english';
import { addDays } from '../../utils/clock';

export interface ReviewEntry {
  key: string;
  box: 1 | 3 | 7;
  due: string;
  item: ForgeItem;
}

const NEXT: Record<ReviewEntry['box'], ReviewEntry['box'] | null> = { 1: 3, 3: 7, 7: null };

export function reviewQueue(queue: ReviewEntry[], today: string, miss: { key: string; item: ForgeItem } | null): ReviewEntry[] {
  let next = queue.filter((row) => row.due >= today || row.box !== 7);
  if (miss) {
    const old = next.find((row) => row.key === miss.key);
    const box = old ? NEXT[old.box] : 1;
    next = next.filter((row) => row.key !== miss.key);
    if (box) next.push({ key: miss.key, box, due: addDays(today, box), item: miss.item });
  }
  return next.slice(-30);
}

export function dueReviews(queue: ReviewEntry[], today: string): ReviewEntry[] {
  return queue.filter((row) => row.due <= today).slice(0, 2);
}

export function weeklySeal(sealedOn: string, today: string, last: string | null): boolean {
  if (!sealedOn) return false;
  const week = addDays(sealedOn, 7);
  if (today < week) return false;
  if (last && today < addDays(last, 7)) return false;
  return true;
}

/** O erro do Recado vira "Qual está certa?". */
export function noteMistakeBar(wrong: string, fix: string): ForgeItem {
  return {
    kind: 'gap',
    sentence: 'Qual está certa?',
    options: [fix, wrong],
    answer: 0,
    rule: 'A frase certa é a do molde.',
  };
}
