// ========================================
// Motor de rotação da prova do dia (puro; sem Firebase, sem import.meta.env).
// Especificação: docs/etapas/ETAPA_2_LANCAMENTO.md, seção 8.2.
// Testes: src/services/quiz/__tests__/rotation.test.ts
// ========================================

import { QUIZ_THEMES, type QuizThemeSeed } from '../../config/quizCurriculum';
import { addDays, isoWeekOf } from '../../utils/clock';

export interface ThemeHistoryEntry {
  date: string;      // YYYY-MM-DD
  themeId: string;
  category: string;
  angle?: number;    // índice do ângulo usado (0..2)
}

export interface RotationProfile {
  /** categorias fracas do perfil de aprendizado (learning/{uid}.profile.weak) */
  weak?: string[];
  /** categorias fortes (ganham profundidade, não prioridade) */
  strong?: string[];
  /** interesses da criança ('futebol' | 'minecraft' | 'ciencia'), pesam no máximo 1 vez por semana ISO */
  interests?: Array<'futebol' | 'minecraft' | 'ciencia'>;
}

export function rotationProfileFrom(raw: unknown): RotationProfile {
  if (!raw || typeof raw !== 'object') return {};
  const row = raw as { weak?: unknown; strong?: unknown; interests?: unknown };
  const list = (v: unknown) => (
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
  );
  const interests = list(row.interests).filter(
    (x): x is 'futebol' | 'minecraft' | 'ciencia' => x === 'futebol' || x === 'minecraft' || x === 'ciencia',
  );
  const weak = list(row.weak);
  const strong = list(row.strong);
  return {
    ...(weak.length ? { weak } : {}),
    ...(strong.length ? { strong } : {}),
    ...(interests.length ? { interests } : {}),
  };
}

export type ThemePickReason =
  | 'categoria nunca vista'
  | 'categoria fraca'
  | 'interesse'
  | 'rodízio'
  | 'revisita (esgotado)';

export interface ThemePick {
  theme: QuizThemeSeed;
  angle: string;
  angleIndex: 0 | 1 | 2;
  depth: 1 | 2 | 3;
  reason: ThemePickReason;
}

function dateSeed(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const dayOfYear = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000) + 1;
  return dayOfYear * 7 + y;
}

function seedPick<T extends { id: string }>(items: T[], date: string): T {
  const ordered = [...items].sort((a, b) => a.id.localeCompare(b.id));
  return ordered[dateSeed(date) % ordered.length];
}

function clampDepth(n: number): 1 | 2 | 3 {
  if (n >= 3) return 3;
  if (n <= 1) return 1;
  return 2;
}

function finish(
  theme: QuizThemeSeed,
  past: ThemeHistoryEntry[],
  reason: ThemePickReason,
  reuseLocked: boolean,
): ThemePick {
  const uses = past.filter((h) => h.themeId === theme.id).length;
  const angleIndex = (uses % 3) as 0 | 1 | 2;
  const depth = reuseLocked ? clampDepth(theme.depth + uses) : theme.depth;
  return {
    theme,
    angle: theme.angles[angleIndex],
    angleIndex,
    depth,
    reason,
  };
}

function leastRecent(pool: QuizThemeSeed[], past: ThemeHistoryEntry[], date: string): QuizThemeSeed {
  const lastOf = (id: string) => {
    let last = '';
    for (const h of past) if (h.themeId === id && h.date > last) last = h.date;
    return last;
  };
  let oldest = lastOf(pool[0].id);
  for (const t of pool) {
    const last = lastOf(t.id);
    if (last < oldest) oldest = last;
  }
  return seedPick(pool.filter((t) => lastOf(t.id) === oldest), date);
}

/**
 * Escolhe o tema de um dia. Regras (seção 8.2), nesta ordem:
 * 1. determinístico por data e histórico (semente = dia do ano);
 * 2. a categoria de ontem está fora;
 * 3. tema usado nos últimos 90 dias está fora; esgotado, o menos recente volta com depth + usos e o ângulo seguinte;
 * 4. prioridade: categoria nunca vista > categoria fraca (máx. 2 por semana ISO) > interesse (máx. 1 por semana ISO) > rodízio pela categoria menos vista em 30 dias;
 * 5. angleIndex = usos anteriores do tema módulo 3;
 * 6. o teto da categoria fraca e do interesse vale também no rodízio.
 *
 * A categoria fraca, quando já não tem tema livre nos 90 dias e ainda não apareceu na semana,
 * traz de volta o tema menos recente dela (depth sobe). Sem isso, 6 temas de matemática
 * não cobrem as semanas do teste de 70 dias. O simulado sem perfil não reusa tema dentro de 90 dias.
 */
export function pickTheme(
  date: string,
  history: ThemeHistoryEntry[],
  profile?: RotationProfile,
  themes: QuizThemeSeed[] = QUIZ_THEMES,
): ThemePick {
  const past = history.filter((h) => h.date < date);
  let yesterday = '';
  for (const h of past) if (h.date >= yesterday) yesterday = h.date;
  const yEntries = past.filter((h) => h.date === yesterday);
  const yCat = yEntries.length ? yEntries[yEntries.length - 1].category : undefined;

  const cutoff90 = addDays(date, -90);
  const locked = new Set(past.filter((h) => h.date > cutoff90).map((h) => h.themeId));
  const seenCats = new Set(past.map((h) => h.category));
  const week = isoWeekOf(date);
  const weekPast = past.filter((h) => isoWeekOf(h.date) === week);
  const cutoff30 = addDays(date, -30);
  const seen30 = (cat: string) => past.filter((h) => h.category === cat && h.date > cutoff30).length;
  const weekCount = (cat: string) => weekPast.filter((h) => h.category === cat).length;

  const weak = new Set(profile?.weak ?? []);
  const interests = new Set(profile?.interests ?? []);
  const byId = new Map(themes.map((t) => [t.id, t]));
  const interestHits = weekPast.filter((h) => {
    const theme = byId.get(h.themeId);
    return Boolean(theme?.interest && interests.has(theme.interest));
  }).length;

  const eligible = themes.filter((t) => t.category !== yCat && !locked.has(t.id));

  if (eligible.length === 0) {
    const pool = themes.filter((t) => t.category !== yCat);
    const theme = leastRecent(pool.length ? pool : themes, past, date);
    return finish(theme, past, 'revisita (esgotado)', true);
  }

  const never = eligible.filter((t) => !seenCats.has(t.category));
  if (never.length) return finish(seedPick(never, date), past, 'categoria nunca vista', false);

  const weakFree = eligible.filter((t) => weak.has(t.category) && weekCount(t.category) < 2);
  if (weakFree.length) return finish(seedPick(weakFree, date), past, 'categoria fraca', false);

  const weakQuiet = [...weak].filter((cat) => cat !== yCat && weekCount(cat) === 0);
  if (weakQuiet.length) {
    const pool = themes.filter((t) => weakQuiet.includes(t.category));
    if (pool.length) return finish(leastRecent(pool, past, date), past, 'categoria fraca', true);
  }

  const interestFree = eligible.filter((t) => t.interest && interests.has(t.interest) && interestHits < 1);
  if (interestFree.length) return finish(seedPick(interestFree, date), past, 'interesse', false);

  const capped = (t: QuizThemeSeed) =>
    (weak.has(t.category) && weekCount(t.category) >= 2)
    || Boolean(t.interest && interests.has(t.interest) && interestHits >= 1);
  const rotating = eligible.filter((t) => !capped(t));
  const pool = rotating.length ? rotating : eligible;
  const min = Math.min(...pool.map((t) => seen30(t.category)));
  const least = pool.filter((t) => seen30(t.category) === min);
  return finish(seedPick(least, date), past, 'rodízio', false);
}
