// Faixas, recompensa e teto semanal. Puro.
// CONTRATOS_E_CARREIRAS.md §4.2 e §4.3.

import type { AssignmentReward, AssignmentSize } from '../../types/assignment';
import type { Material } from '../../types/english';
import { DEFAULT_ECONOMY } from '../../config/village';
import { isoWeekOf } from '../../utils/clock';
import { isProjectSize } from './machine';

export interface BandSetting {
  minDays: number;
  maxDays: number;
  xp: number;
}

export interface BandRange extends BandSetting {
  size: AssignmentSize;
  minGold: number;
  maxGold: number;
}

const SHORT: ReadonlySet<AssignmentSize> = new Set(['pequena', 'normal', 'sabado']);

export function countsTowardWeeklyCap(size?: AssignmentSize): boolean {
  return Boolean(size && SHORT.has(size));
}

function roundGold(days: number, dayGold: number): number {
  return Math.max(0, Math.round(days * dayGold));
}

export function bandFor(
  size: AssignmentSize,
  dayGold: number,
  bands: Record<AssignmentSize, BandSetting> = DEFAULT_ECONOMY.assignmentBands,
): BandRange {
  const band = bands[size];
  return {
    size,
    minDays: band.minDays,
    maxDays: band.maxDays,
    xp: band.xp,
    minGold: roundGold(band.minDays, dayGold),
    maxGold: roundGold(band.maxDays, dayGold),
  };
}

export function suggestedGold(size: AssignmentSize, dayGold: number): number {
  const band = bandFor(size, dayGold);
  return Math.round((band.minGold + band.maxGold) / 2);
}

export interface TrainingPay {
  xp: number;
  materials?: Partial<Record<Material, number>>;
}

export interface RewardConfig {
  trainings?: Record<string, TrainingPay>;
}

/**
 * Treino: o gold é sempre 0 e o valor não sai do documento.
 * Sem a tabela da carreira (15b), XP e material ficam 0.
 * Encomenda: paga o que foi gravado na criação.
 */
export function assignmentReward(
  a: { kind: 'paid' | 'training'; reward: AssignmentReward; templateId?: string },
  config?: RewardConfig,
): AssignmentReward {
  if (a.kind === 'training') {
    const fromTable = a.templateId ? config?.trainings?.[a.templateId] : undefined;
    return {
      gold: 0,
      xp: Math.max(0, Math.round(fromTable?.xp ?? 0)),
      ...(fromTable?.materials ? { materials: fromTable.materials } : {}),
    };
  }
  return {
    gold: Math.max(0, Math.round(a.reward.gold)),
    xp: Math.max(0, Math.round(a.reward.xp)),
    ...(a.reward.materials ? { materials: a.reward.materials } : {}),
  };
}

export function weeklyCapGold(dayGold: number, capDays = DEFAULT_ECONOMY.assignmentWeeklyCapDays): number {
  return Math.max(0, Math.round(capDays * dayGold));
}

export function weeklyCapLeft(usedShortGold: number, dayGold: number, capDays = DEFAULT_ECONOMY.assignmentWeeklyCapDays): number {
  return Math.max(0, weeklyCapGold(dayGold, capDays) - Math.max(0, usedShortGold));
}

export function overCap(usedShortGold: number, incomingGold: number, dayGold: number, capDays = DEFAULT_ECONOMY.assignmentWeeklyCapDays): boolean {
  if (incomingGold <= 0) return false;
  return usedShortGold + incomingGold > weeklyCapGold(dayGold, capDays);
}

export interface WeekMeter {
  offered: number;
  approved: number;
  cap: number;
  left: number;
}

/** Gold aprovado na semana ISO, só das faixas curtas. */
export function usedShortGold(
  rows: ReadonlyArray<{ size?: AssignmentSize; status: string; payoutGold?: number; payoutDay?: string | null }>,
  week: string,
): number {
  return rows.reduce((sum, row) => {
    if (!countsTowardWeeklyCap(row.size) || row.status !== 'approved') return sum;
    if (!row.payoutDay || isoWeekOf(row.payoutDay) !== week) return sum;
    return sum + Math.max(0, Math.round(Number(row.payoutGold) || 0));
  }, 0);
}

/** Até 1 D por semana de prazo. */
export function projectWeekCap(dayGold: number, weeks: number): number {
  const span = Math.max(1, Math.floor(Number(weeks)) || 1);
  return Math.max(0, Math.round(span * Math.max(0, dayGold)));
}

export function projectOverCap(gold: number, dayGold: number, weeks: number): boolean {
  if (gold <= 0) return false;
  return gold > projectWeekCap(dayGold, weeks);
}

/** Curta usa o teto de 2 D. Projeto passa por "até 1 D por semana de prazo". */
export function needsCapWarn(input: {
  size?: AssignmentSize;
  gold: number;
  usedShort: number;
  dayGold: number;
  weeks?: number;
  capDays?: number;
}): boolean {
  if (isProjectSize(input.size)) return projectOverCap(input.gold, input.dayGold, input.weeks ?? 1);
  if (!countsTowardWeeklyCap(input.size)) return false;
  return overCap(input.usedShort, input.gold, input.dayGold, input.capDays);
}

export function weekMeter(offered: number, approved: number, dayGold: number, capDays = DEFAULT_ECONOMY.assignmentWeeklyCapDays): WeekMeter {
  const cap = weeklyCapGold(dayGold, capDays);
  return {
    offered: Math.max(0, offered),
    approved: Math.max(0, approved),
    cap,
    left: Math.max(0, cap - Math.max(0, approved)),
  };
}
