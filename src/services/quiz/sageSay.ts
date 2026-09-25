/** A fala local quando a IA aceita e não manda frase. */

export const SAGE_LOCAL_OK = 'Li sua reflexão.';

/** null = JSON quebrado. Aceite sem `say` cai na fala local. */
export function parseSageSay(raw: unknown): { ok: boolean; say: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as { ok?: unknown; say?: unknown };
  if (typeof rec.ok !== 'boolean') return null;
  const say = typeof rec.say === 'string' ? rec.say.replace(/\s+/g, ' ').trim() : '';
  if (rec.ok && !say) return { ok: true, say: SAGE_LOCAL_OK };
  return { ok: rec.ok, say };
}
