import { addDays } from '../../utils/clock';
import { retryable } from './provaRules';

export interface ProfileItem {
  id?: string;
  date: string;
  category?: string;
  subject?: string;
  skill?: string;
  kind?: string;
  question?: string;
  correct?: boolean;
  msToAnswer?: number;
  attempts?: number;
  supportLevel?: number;
  retryOk?: boolean;
}

export interface LearningProfile {
  updatedAt: string;
  byCategory: Record<string, { d7: [number, number]; d30: [number, number]; all: [number, number] }>;
  bySubject: Record<string, { d7: [number, number]; d30: [number, number]; all: [number, number] }>;
  bySkill: Record<string, { d30: [number, number]; all: [number, number] }>;
  byKind: Record<string, { d7: [number, number]; d30: [number, number]; all: [number, number] }>;
  strong: string[];
  weak: string[];
  lastWrong: { date: string; id: string; category: string; subject: string; skill: string; question: string }[];
  englishLastSkill?: string;
  retry: { d30: [number, number]; all: [number, number] };
  medianMsToAnswer: number;
}

type Pair = [number, number];

function bump(pair: Pair | undefined, correct: boolean): Pair {
  const [ok, n] = pair ?? [0, 0];
  return [ok + (correct ? 1 : 0), n + 1];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function rank(rows: { key: string; ok: number; n: number }[], dir: 'best' | 'worst'): string[] {
  const ready = rows.filter((row) => row.n >= 4);
  ready.sort((a, b) => {
    const ra = a.ok / a.n;
    const rb = b.ok / b.n;
    if (ra !== rb) return dir === 'best' ? rb - ra : ra - rb;
    return a.key.localeCompare(b.key);
  });
  return ready.slice(0, 3).map((row) => row.key);
}

/** Perfil da prova. strong e weak usam o total, com pelo menos 4 perguntas. */
export function buildProfile(items: ProfileItem[], today: string): LearningProfile {
  const d7 = addDays(today, -7);
  const d30 = addDays(today, -30);
  const byCategory: LearningProfile['byCategory'] = {};
  const bySubject: LearningProfile['bySubject'] = {};
  const bySkill: LearningProfile['bySkill'] = {};
  const byKind: LearningProfile['byKind'] = {};
  const retry = { d30: [0, 0] as Pair, all: [0, 0] as Pair };
  const times: number[] = [];
  const wrong: LearningProfile['lastWrong'] = [];
  let englishLastSkill: string | undefined;
  const ordered = [...items].sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));

  for (const item of ordered) {
    const correct = item.correct === true;
    const dilemma = item.kind === 'dilemma' || item.skill === 'LIC.DILEMA';
    if (dilemma) continue;
    const in7 = item.date >= d7 && item.date <= today;
    const in30 = item.date >= d30 && item.date <= today;
    const cat = item.category || 'tema';
    const subject = item.subject || 'geral';
    const skill = item.skill || '';
    const kind = item.kind || 'knowledge';
    const catRow = byCategory[cat] ?? { d7: [0, 0], d30: [0, 0], all: [0, 0] };
    if (in7) catRow.d7 = bump(catRow.d7, correct);
    if (in30) catRow.d30 = bump(catRow.d30, correct);
    catRow.all = bump(catRow.all, correct);
    byCategory[cat] = catRow;

    const subRow = bySubject[subject] ?? { d7: [0, 0], d30: [0, 0], all: [0, 0] };
    if (in7) subRow.d7 = bump(subRow.d7, correct);
    if (in30) subRow.d30 = bump(subRow.d30, correct);
    subRow.all = bump(subRow.all, correct);
    bySubject[subject] = subRow;

    if (skill) {
      const skillRow = bySkill[skill] ?? { d30: [0, 0], all: [0, 0] };
      if (in30) skillRow.d30 = bump(skillRow.d30, correct);
      skillRow.all = bump(skillRow.all, correct);
      bySkill[skill] = skillRow;
    }
    if (kind === 'lesson' || kind === 'knowledge' || kind === 'review') {
      const kindRow = byKind[kind] ?? { d7: [0, 0], d30: [0, 0], all: [0, 0] };
      if (in7) kindRow.d7 = bump(kindRow.d7, correct);
      if (in30) kindRow.d30 = bump(kindRow.d30, correct);
      kindRow.all = bump(kindRow.all, correct);
      byKind[kind] = kindRow;
    }
    if (typeof item.msToAnswer === 'number' && item.msToAnswer > 0) times.push(item.msToAnswer);
    if (!correct) {
      wrong.push({
        date: item.date,
        id: item.id || '',
        category: cat,
        subject,
        skill,
        question: item.question || '',
      });
    }
    if (skill.startsWith('ING.')) englishLastSkill = skill;
    // retryOk vem booleano em todo item (learningService grava `=== true`): não serve para saber se houve 2ª tentativa.
    const hadSecond = (item.attempts ?? 1) >= 2 || item.supportLevel === 1;
    if (retryable({ skill, kind }) && hadSecond) {
      const later = item.retryOk === true || item.supportLevel === 1;
      retry.all = [retry.all[0] + (later ? 1 : 0), retry.all[1] + 1];
      if (in30) retry.d30 = [retry.d30[0] + (later ? 1 : 0), retry.d30[1] + 1];
    }
  }

  const totals = Object.entries(byCategory).map(([key, row]) => ({ key, ok: row.all[0], n: row.all[1] }));
  return {
    updatedAt: today,
    byCategory,
    bySubject,
    bySkill,
    byKind,
    strong: rank(totals, 'best'),
    weak: rank(totals, 'worst'),
    lastWrong: wrong.slice(-10).reverse(),
    ...(englishLastSkill ? { englishLastSkill } : {}),
    retry,
    medianMsToAnswer: median(times),
  };
}
