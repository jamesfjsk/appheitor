// ========================================
// Motor de rotação da prova do dia (puro; sem Firebase, sem import.meta.env).
// Especificação: docs/etapas/ETAPA_2_LANCAMENTO.md, seção 8.2.
// Testes: src/services/quiz/__tests__/rotation.test.ts (escritos antes; implementar até passarem).
// Este arquivo é só a assinatura: a implementação é do pacote P5 (Cursor).
// ========================================

import { QUIZ_THEMES, type QuizThemeSeed } from '../../config/quizCurriculum';

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
  interests?: string[];
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

/**
 * Escolhe o tema de um dia. Regras (seção 8.2):
 * 1. determinístico por data e histórico;
 * 2. a categoria de ontem está fora;
 * 3. tema usado nos últimos 90 dias está fora; esgotado, o menos recente volta com depth + 1 e o ângulo seguinte;
 * 4. prioridade: categoria nunca vista > categoria fraca (máx. 2 por semana ISO) > interesse (máx. 1 por semana ISO) > rodízio pela categoria menos vista em 30 dias;
 * 5. angleIndex = usos anteriores do tema módulo 3.
 */
export function pickTheme(
  _date: string,
  _history: ThemeHistoryEntry[],
  _profile?: RotationProfile,
  themes: QuizThemeSeed[] = QUIZ_THEMES,
): ThemePick {
  throw new Error(`rotation.pickTheme: não implementado (pacote P5, ETAPA_2_LANCAMENTO.md §8.2); ${themes.length} temas`);
}
