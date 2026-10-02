// Estado da unidade (§9.2). Sem o campo, a primeira Ferraria começa na U1.

import { nextUnitId, UNIT_ORDER } from '../../config/englishUnits';

export interface ForgeMark {
  date: string;
  first: number;
  max: number;
}

export interface ActiveUnit {
  id: string;
  startedOn: string;
  forges: ForgeMark[];
}

export interface UnitRecord {
  sealedOn?: string;
  review?: true;
}

export interface UnitBook {
  unit: ActiveUnit;
  units: Record<string, UnitRecord>;
}

export function currentUnit(base: { unit?: ActiveUnit | null } | null | undefined, today = ''): ActiveUnit {
  const unit = base?.unit;
  if (unit && UNIT_ORDER.includes(unit.id as (typeof UNIT_ORDER)[number])) {
    return { id: unit.id, startedOn: unit.startedOn || today, forges: unit.forges ?? [] };
  }
  return { id: 'u1', startedOn: today, forges: [] };
}

function good(mark: ForgeMark): boolean {
  return mark.max >= 6 && mark.first >= 5;
}

/** Dia dentro da unidade, 1 no dia em que ela começou. */
export function dayInUnit(unit: ActiveUnit, today: string): number {
  const dates = new Set(unit.forges.map((f) => f.date));
  if (unit.startedOn) dates.add(unit.startedOn);
  if (today) dates.add(today);
  const sorted = [...dates].filter(Boolean).sort();
  const at = sorted.indexOf(today || unit.startedOn);
  return at < 0 ? 1 : at + 1;
}

export interface ForgeClose {
  book: UnitBook;
  sealed: boolean;
  review: boolean;
}

/**
 * 2 Ferrarias com pelo menos 5 de 6, em dias diferentes, selam.
 * 6 Ferrarias sem selo deixam a unidade para rever e a próxima começa.
 */
export function unitAfterForge(book: UnitBook, input: { date: string; first: number; max: number }): ForgeClose {
  const forges = book.unit.forges.filter((f) => f.date !== input.date);
  forges.push({ date: input.date, first: input.first, max: input.max });
  forges.sort((a, b) => a.date.localeCompare(b.date));
  const goodDays = new Set(forges.filter(good).map((f) => f.date));
  const units = { ...book.units };
  if (goodDays.size >= 2) {
    units[book.unit.id] = { sealedOn: input.date };
    const id = nextUnitId(book.unit.id);
    return {
      sealed: true,
      review: false,
      book: { units, unit: { id, startedOn: input.date, forges: [] } },
    };
  }
  if (forges.length >= 6) {
    units[book.unit.id] = { review: true };
    const id = nextUnitId(book.unit.id);
    return {
      sealed: false,
      review: true,
      book: { units, unit: { id, startedOn: input.date, forges: [] } },
    };
  }
  return {
    sealed: false,
    review: false,
    book: { units, unit: { ...book.unit, forges } },
  };
}

/** Palavra conhecida: vista em 3 contratos. As mais vistas vêm primeiro. */
export function knownLemmas(vocab: Record<string, { seen: number }> | null | undefined): string[] {
  return Object.entries(vocab ?? {})
    .filter(([, row]) => row.seen >= 3)
    .sort((a, b) => b[1].seen - a[1].seen || a[0].localeCompare(b[0]))
    .map(([lemma]) => lemma);
}
