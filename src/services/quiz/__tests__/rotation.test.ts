// ========================================
// Motor de rotação da prova do dia (ETAPA_2_LANCAMENTO.md, seção 8.2).
// Escrito pelo líder em 17/09/2026 antes da implementação: `rotation.ts` é
// feito até estes casos passarem. Registrar a pasta `quiz` em
// scripts/run-english-tests.mjs.
// ========================================

import { expect, run, test } from '../../english/__tests__/harness';
import { QUIZ_THEMES, type QuizThemeSeed } from '../../../config/quizCurriculum';
import { addDays, isoWeekOf } from '../../../utils/clock';
import { pickTheme, type ThemeHistoryEntry, type ThemePick } from '../rotation';

const START = '2026-09-20';

function simulate(days: number, profile?: Parameters<typeof pickTheme>[2], themes: QuizThemeSeed[] = QUIZ_THEMES): ThemePick[] {
  const history: ThemeHistoryEntry[] = [];
  const picks: ThemePick[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(START, i);
    const pick = pickTheme(date, history, profile, themes);
    picks.push(pick);
    history.push({ date, themeId: pick.theme.id, category: pick.theme.category, angle: pick.angleIndex });
  }
  return picks;
}

test('currículo tem pelo menos 115 temas, 3 ângulos cada e ids únicos', () => {
  expect(QUIZ_THEMES.length).toBeGreaterThanOrEqual(115);
  expect(new Set(QUIZ_THEMES.map((t) => t.id)).size).toBe(QUIZ_THEMES.length);
  for (const t of QUIZ_THEMES) {
    expect(t.angles).toHaveLength(3);
    expect([1, 2, 3]).toContain(t.depth);
  }
});

test('mesma data e mesmo histórico dão a mesma escolha', () => {
  const a = pickTheme('2026-10-03', [], undefined);
  const b = pickTheme('2026-10-03', [], undefined);
  expect(a.theme.id).toBe(b.theme.id);
  expect(a.angleIndex).toBe(b.angleIndex);
});

test('365 dias: categoria nunca repete em dias seguidos', () => {
  const picks = simulate(365);
  for (let i = 1; i < picks.length; i++) {
    expect(picks[i].theme.category).not.toBe(picks[i - 1].theme.category);
  }
});

test('365 dias: tema não repete dentro de 90 dias enquanto houver tema livre', () => {
  const picks = simulate(365);
  for (let i = 0; i < picks.length; i++) {
    for (let j = Math.max(0, i - 89); j < i; j++) {
      expect(picks[i].theme.id).not.toBe(picks[j].theme.id);
    }
  }
});

test('todas as categorias aparecem nos primeiros 30 dias', () => {
  const picks = simulate(30);
  const all = new Set(QUIZ_THEMES.map((t) => t.category));
  const seen = new Set(picks.map((p) => p.theme.category));
  for (const c of all) expect(seen.has(c)).toBeTruthy();
});

test('categoria fraca do perfil aparece pelo menos 1 e no máximo 2 vezes por semana (da 4ª semana em diante)', () => {
  const picks = simulate(70, { weak: ['matematica'] });
  const byWeek = new Map<string, number>();
  picks.forEach((p, i) => {
    const week = isoWeekOf(addDays(START, i));
    if (p.theme.category === 'matematica') byWeek.set(week, (byWeek.get(week) ?? 0) + 1);
    else if (!byWeek.has(week)) byWeek.set(week, 0);
  });
  const weeks = [...byWeek.keys()].sort();
  // semanas completas da 4ª em diante (as 3 primeiras são dominadas por "categoria nunca vista")
  for (const week of weeks.slice(3, -1)) {
    expect(byWeek.get(week)!).toBeGreaterThanOrEqual(1);
    expect(byWeek.get(week)!).toBeLessThanOrEqual(2);
  }
});

test('interesse do perfil pesa no máximo uma vez por semana', () => {
  const picks = simulate(70, { interests: ['futebol'] });
  const byWeek = new Map<string, number>();
  picks.forEach((p, i) => {
    if (p.reason !== 'interesse') return;
    const week = isoWeekOf(addDays(START, i));
    byWeek.set(week, (byWeek.get(week) ?? 0) + 1);
  });
  for (const n of byWeek.values()) expect(n).toBeLessThanOrEqual(1);
});

test('reason é uma das frases conhecidas', () => {
  const known = ['categoria nunca vista', 'categoria fraca', 'interesse', 'rodízio', 'revisita (esgotado)'];
  const picks = simulate(120, { weak: ['quimica'], interests: ['minecraft'] });
  for (const p of picks) expect(known).toContain(p.reason);
});

test('ângulo gira com o número de usos do tema', () => {
  const t = QUIZ_THEMES[0];
  const others = QUIZ_THEMES.filter((x) => x.category !== t.category).slice(0, 2);
  const themes = [t, ...others];
  const history: ThemeHistoryEntry[] = [
    { date: '2026-01-01', themeId: t.id, category: t.category, angle: 0 },
    { date: '2026-04-15', themeId: t.id, category: t.category, angle: 1 },
  ];
  // com 3 temas e histórico de 2 usos do primeiro, os outros dois entram primeiro
  const p1 = pickTheme('2026-10-01', history, undefined, themes);
  expect(p1.theme.id).not.toBe(t.id);
  // esgotado: tudo usado nos últimos 90 dias
  const recent: ThemeHistoryEntry[] = [
    ...history,
    { date: '2026-09-28', themeId: others[0].id, category: others[0].category, angle: 0 },
    { date: '2026-09-29', themeId: others[1].id, category: others[1].category, angle: 0 },
    { date: '2026-09-30', themeId: t.id, category: t.category, angle: 2 },
  ];
  const p2 = pickTheme('2026-10-01', recent, undefined, themes);
  expect(p2.reason).toBe('revisita (esgotado)');
  // o menos recente é others[0] (usado em 28/09) e a categoria de ontem (t) está fora
  expect(p2.theme.id).toBe(others[0].id);
  expect(p2.angleIndex).toBe(1);
  expect(p2.depth).toBeGreaterThanOrEqual(others[0].depth);
  expect(p2.depth).toBeLessThanOrEqual(3);
});

test('depth nunca passa de 3 mesmo com muitos usos', () => {
  const t = QUIZ_THEMES.find((x) => x.depth === 1) ?? QUIZ_THEMES[0];
  const other = QUIZ_THEMES.find((x) => x.category !== t.category)!;
  const themes = [t, other];
  const history: ThemeHistoryEntry[] = [];
  for (let i = 0; i < 8; i++) {
    history.push({ date: addDays('2026-01-01', i * 2), themeId: t.id, category: t.category, angle: i % 3 });
    history.push({ date: addDays('2026-01-01', i * 2 + 1), themeId: other.id, category: other.category, angle: i % 3 });
  }
  history.push({ date: '2026-09-29', themeId: other.id, category: other.category, angle: 0 });
  history.push({ date: '2026-09-30', themeId: other.id, category: other.category, angle: 1 });
  const p = pickTheme('2026-10-01', history, undefined, themes);
  expect(p.theme.id).toBe(t.id);
  expect(p.depth).toBeLessThanOrEqual(3);
});

void run();
