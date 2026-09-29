// "Como ele trabalha": quatro frases para o pai, sem nota. §12.

import type { Assignment } from '../../types/assignment';
import { addDays, nowBrazil } from '../../utils/clock';
import { SPECIALTY_LABEL } from './labels';
import { isProjectSize } from './machine';

export interface WorkPortrait {
  lines: string[];
  pace: string | null;
}

function dayOf(iso: string | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return nowBrazil(ms).date;
}

function inWindow(iso: string | undefined, today: string): boolean {
  const day = dayOf(iso);
  if (!day) return false;
  return day >= addDays(today, -30) && day <= today;
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.round(ms / 86400000);
}

export function workPortrait(items: Assignment[], today: string): WorkPortrait {
  const recent = items.filter((a) => a.kind === 'paid' && (
    inWindow(a.acceptedAt, today)
    || inWindow(a.payout?.at, today)
    || inWindow(a.createdAt, today)
  ));
  if (recent.length === 0) {
    return {
      lines: ['Ainda não há encomenda nestes 30 dias.'],
      pace: null,
    };
  }

  const accepted = recent.filter((a) => a.acceptedAt && inWindow(a.acceptedAt, today)).length;
  const approved = recent.filter((a) => a.status === 'approved' && inWindow(a.payout?.at || a.updatedAt, today));
  const drops = recent.reduce((sum, a) => sum + (a.drops || 0), 0);
  const dropWord = drops === 1 ? '1 desistência' : `${drops} desistências`;

  const adjustments = approved.reduce(
    (sum, a) => sum + a.reviews.filter((r) => r.verdict === 'needs_changes').length,
    0,
  );
  const avg = approved.length === 0 ? 0 : adjustments / approved.length;
  const avgText = avg.toFixed(1).replace('.', ',');

  const fixed = approved.filter((a) => isProjectSize(a.size) && (
    a.reviews.some((r) => r.fixedAfterFailure)
    || a.submissions.some((s) => s.whatChanged)
  ));
  const changed = fixed
    .map((a) => a.submissions.map((s) => s.whatChanged).filter(Boolean).pop())
    .filter((s): s is string => Boolean(s));

  const bySpec = new Map<Assignment['specialty'], number>();
  for (const a of recent) {
    if (!a.acceptedAt || !inWindow(a.acceptedAt, today)) continue;
    bySpec.set(a.specialty, (bySpec.get(a.specialty) || 0) + 1);
  }
  const interest = [...bySpec.entries()]
    .map(([id, n]) => `${SPECIALTY_LABEL[id] || id} ${n}`)
    .join(', ');

  const paces: number[] = [];
  for (const a of approved) {
    const start = a.acceptedAt;
    const end = a.submissions[a.submissions.length - 1]?.at;
    if (start && end) paces.push(daysBetween(start, end));
  }
  const pace = paces.length
    ? `Levou ${Math.round(paces.reduce((s, n) => s + n, 0) / paces.length)} dias entre aceitar e entregar.`
    : null;

  const fixedLine = fixed.length === 0
    ? 'Nenhum projeto com correção depois de uma falha nestes 30 dias.'
    : `Projetos com correção depois de uma falha: ${fixed.length}.${changed.length ? ` Ele escreveu: “${changed[0]}”.` : ''}`;

  return {
    lines: [
      `Aceita e termina: ${accepted} aceitas, ${approved.length} aprovadas, ${dropWord}.`,
      `Precisa de muita intervenção: ${avgText} ajustes por entrega aprovada. Pista de treino: ainda não há treino.`,
      `Está corrigindo sozinho: ${fixedLine}`,
      `O que desperta interesse: ${interest || 'nenhuma especialidade aceita nestes 30 dias'}.`,
    ],
    pace,
  };
}
