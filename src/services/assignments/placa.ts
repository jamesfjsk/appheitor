// Avisos asg_* na Placa. Puro.
// O recado do pai entra antes das encomendas, para a Placa cheia não escondê-lo.

import { addDays } from '../../utils/clock';

/**
 * `_new` vale até o dueOn. Sem prazo, vale 3 dias (hoje e mais dois).
 * `_ok` e `_fix` valem 2 dias (hoje e amanhã). O dia de `until` ainda aparece.
 */
export function noticeUntil(kind: 'new' | 'ok' | 'fix', today: string, dueOn?: string): string {
  if (kind === 'new' && dueOn && /^\d{4}-\d{2}-\d{2}$/.test(dueOn)) return dueOn;
  if (kind === 'new') return addDays(today, 2);
  return addDays(today, 1);
}

export function orderFatherNotices<T extends { id: string }>(notices: readonly T[]): T[] {
  const personal: T[] = [];
  const orders: T[] = [];
  for (const notice of notices) {
    if (notice.id.startsWith('asg_')) orders.push(notice);
    else personal.push(notice);
  }
  return [...personal, ...orders];
}
