import type { BoardItem, HabitDef, LineDef, NoticeContext, Period } from '../../types/village';
import { HABIT_BY_ID } from '../../config/village';
import { claimKey } from './claims';
import { chestNeedLeft } from './chest';
import { periodFromHour, weekdayFromDate } from './schedule';

const MAX_BOARD = 3;

function daysUntilBirthday(date: string, birthdayMmDd: string): number {
  const [y] = date.split('-').map(Number);
  const thisYear = `${y}-${birthdayMmDd}`;
  if (thisYear >= date) {
    const a = Date.parse(`${date}T12:00:00.000-03:00`);
    const b = Date.parse(`${thisYear}T12:00:00.000-03:00`);
    return Math.round((b - a) / 86400000);
  }
  const next = `${y + 1}-${birthdayMmDd}`;
  const a = Date.parse(`${date}T12:00:00.000-03:00`);
  const b = Date.parse(`${next}T12:00:00.000-03:00`);
  return Math.round((b - a) / 86400000);
}

/** Recados da placa agora (pai + automáticos), no máximo 3, sem os dispensados. */
export function noticesForNow(ctx: NoticeContext, date: string, hour: number): BoardItem[] {
  const items: BoardItem[] = [];
  const dismissed = new Set(ctx.dismissed ?? []);

  for (const n of ctx.fatherNotices) {
    if (n.ackAt) continue;
    if (n.until && n.until < date) continue;
    if (n.when && n.when > date) continue;
    items.push({ key: `father:${n.id}`, kind: 'father', text: n.text, until: n.until });
  }

  const auto = (tipo: string, text: string, until?: string) => {
    const key = claimKey('auto', tipo, date);
    if (dismissed.has(key)) return;
    items.push({ key, kind: 'auto', text, until });
  };

  if (hour >= 21) {
    if (ctx.tomorrowQuizTitle) auto('amanha', `Amanhã: prova sobre ${ctx.tomorrowQuizTitle}`);
    return items.slice(0, MAX_BOARD);
  }

  const missing = chestNeedLeft(ctx.due, ctx.done);
  // depois de aberto, a conta do dia pode mudar (pai edita missões) e o recado ficaria mentindo
  if (!ctx.chestOpened && ctx.due >= ctx.minDueForChest && missing > 0 && hour < ctx.chestOpenHour + 6) {
    auto('chest', `${missing === 1 ? 'Falta 1 missão' : `Faltam ${missing} missões`} para o Baú do Dia`);
  }

  const bdays = daysUntilBirthday(date, ctx.birthdayMmDd);
  if (bdays >= 0 && bdays <= 7) {
    auto('birthday', bdays === 0 ? 'Hoje é seu aniversário' : `Seu aniversário é em ${bdays} ${bdays === 1 ? 'dia' : 'dias'}`);
  }

  if (ctx.nearestReward && ctx.gold < ctx.nearestReward.costGold) {
    const lack = ctx.nearestReward.costGold - ctx.gold;
    const days = ctx.avgGoldPerDay > 0 ? Math.max(1, Math.ceil(lack / ctx.avgGoldPerDay)) : null;
    const ritmo = days ? ` no seu ritmo, ${days} ${days === 1 ? 'dia' : 'dias'}` : '';
    auto('gold', `Faltam ${lack} gold para '${ctx.nearestReward.title}'${ritmo ? `: ${ritmo}` : ''}`);
  }

  if (ctx.tomorrowQuizTitle && hour >= 18) {
    auto('quiz', `Amanhã: prova sobre ${ctx.tomorrowQuizTitle}`);
  }

  if (ctx.pauseDates.includes(date)) auto('pause', 'Hoje é dia de folga na Vila');
  if (ctx.vacation) auto('vacation', 'Férias na Vila: missões valem mais');

  return items.slice(0, MAX_BOARD);
}

export function habitsForNow(habits: HabitDef[], date: string, hour: number): HabitDef[] {
  void date;
  const period: Period = periodFromHour(hour);
  const nightOnly = hour >= 21;
  return habits.filter((h) => {
    if (nightOnly) return h.id === 'sono';
    return h.period === 'any' || h.period === period;
  });
}

export function defaultHabitsForNow(date: string, hour: number): HabitDef[] {
  return [habitTipForNow(date, hour)];
}

/**
 * Um hábito por turno: manhã (água/postura/alongar em rodízio), tarde arrumar,
 * noite tela, depois das 21h sono. Terça e sexta: gentileza (olheiro), salvo de noite.
 */
export function habitTipForNow(date: string, hour: number): HabitDef {
  if (hour >= 21) return HABIT_BY_ID.sono;
  const dow = weekdayFromDate(date);
  if (dow === 2 || dow === 5) return HABIT_BY_ID.gentileza;
  const period: Period = periodFromHour(hour);
  if (period === 'afternoon') return HABIT_BY_ID.arrumar;
  if (period === 'evening') return HABIT_BY_ID.tela;
  const morning = ['agua', 'postura', 'alongar'] as const;
  const dayNum = Math.floor(Date.parse(`${date}T12:00:00.000-03:00`) / 86400000);
  return HABIT_BY_ID[morning[((dayNum % 3) + 3) % 3]];
}

/** Escolhe uma fala que não repetiu nos últimos 14 ids. */
export function pickLine(lines: readonly LineDef[], recentIds: readonly string[]): LineDef {
  const recent = new Set(recentIds.slice(-14));
  const fresh = lines.filter((l) => !recent.has(l.id));
  const pool = fresh.length > 0 ? fresh : [...lines];
  return pool[0];
}
