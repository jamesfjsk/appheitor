// Carreiras (CONTRATOS_E_CARREIRAS.md §11). Puro: sem Firebase.
// Na primeira versão, só o Engenheiro da Vila. Outra carreira é outro CareerDef e outro lote.

import type { RewardConfig } from '../services/assignments/rewards';
import { COMPETENCY_LABEL } from '../services/assignments/labels';
import { ENGENHEIRO_TREINOS, type TrainingDef } from './engenheiroTreinos';

export type CompetencyLevel = 'praticando' | 'domina';
export type RankId = 'aprendiz' | 'tecnico' | 'engenheiro' | 'inventor';

export type RankRequirement =
  | { type: 'competency'; id: string; level: CompetencyLevel }
  | { type: 'projects'; count: number }
  | { type: 'projectsFixed'; count: number }
  | { type: 'ownProblemProjects'; count: number };

export interface CareerRank {
  id: RankId;
  name: string;
  requirements: RankRequirement[];
}

export interface CareerDef {
  id: 'engenheiro';
  name: string;
  description: string;
  ranks: CareerRank[];
  competencies: Array<{ id: string; name: string }>;
  trainings: TrainingDef[];
  tools: Array<{ id: string; name: string; unlockAfterTraining: number }>;
}

const comp = (id: string, level: CompetencyLevel): RankRequirement => ({ type: 'competency', id, level });

export const ENGENHEIRO: CareerDef = {
  id: 'engenheiro',
  name: 'Engenheiro da Vila',
  description: 'Programa o micro:bit, monta circuitos e resolve problemas de verdade.',
  ranks: [
    { id: 'aprendiz', name: 'Aprendiz', requirements: [] },
    {
      id: 'tecnico',
      name: 'Técnico',
      requirements: [
        comp('mb-basico', 'domina'), comp('entradas', 'domina'), comp('saidas', 'domina'),
        comp('circuito', 'praticando'), comp('sensor', 'praticando'), comp('atuador', 'praticando'),
        comp('debug', 'praticando'), comp('bancada', 'praticando'),
      ],
    },
    {
      id: 'engenheiro',
      name: 'Engenheiro',
      requirements: [
        comp('circuito', 'domina'), comp('sensor', 'domina'), comp('atuador', 'domina'), comp('debug', 'domina'),
        { type: 'projects', count: 2 },
        { type: 'projectsFixed', count: 1 },
      ],
    },
    {
      id: 'inventor',
      name: 'Inventor',
      requirements: [{ type: 'ownProblemProjects', count: 1 }, comp('projeto', 'domina')],
    },
  ],
  competencies: Object.entries(COMPETENCY_LABEL).map(([id, name]) => ({ id, name })),
  trainings: ENGENHEIRO_TREINOS,
  tools: [{ id: 'metodo', name: 'Método do Engenheiro', unlockAfterTraining: 7 }],
};

export const trainingTemplateId = (n: number): string => `eng-${n}`;

export function trainingByTemplate(templateId: string | undefined): TrainingDef | null {
  const m = /^eng-(\d+)$/.exec(templateId || '');
  if (!m) return null;
  return ENGENHEIRO.trainings.find((t) => t.n === Number(m[1])) ?? null;
}

/** Treino paga XP e 1 redstone, nunca gold. O valor sai daqui, não do documento. */
export const CAREER_REWARDS: RewardConfig = {
  trainings: Object.fromEntries(
    ENGENHEIRO.trainings.map((t) => [trainingTemplateId(t.n), { xp: t.xp, materials: { redstone: 1 } }]),
  ),
};

/** Método do Engenheiro (§11.5): o cartão do "Não funcionou?". */
export const METODO_PASSOS = [
  'O que deveria acontecer?',
  'O que aconteceu de verdade?',
  'Confira as ligações.',
  'Confira a alimentação.',
  'Confira o código.',
  'Mude uma coisa só.',
  'Teste de novo.',
  'Se ainda não funcionar, conte o que já tentou.',
];

export const MAKECODE_URL = 'https://makecode.microbit.org/?lang=pt-BR';

/**
 * Tutoriais guiados oficiais do MakeCode, passo a passo, com animação do bloco a arrastar.
 * Conferidos em 02/10/2026: "name-tag" e "dice" abrem em português; "flashing-heart" tem o texto em inglês.
 */
export const TRAINING_TUTORIALS: Record<number, { path: string; pt: boolean }> = {
  2: { path: 'name-tag', pt: true },
  3: { path: 'flashing-heart', pt: false },
  5: { path: 'dice', pt: true },
};

/**
 * Onde cada treino aparece no PDF do kit ("Projetos para começar", Casa da Robótica, 98 páginas), conferido em 02/10/2026.
 * Página = número impresso no rodapé, que é o mesmo do leitor de PDF. O link do PDF fica na carreira (painel), nunca no código.
 */
export const TRAINING_KIT_PAGES: Record<number, Array<{ label: string; page: number; note?: string }>> = {
  1: [
    { label: 'Sobre o Micro:bit e os pinos', page: 11 },
    { label: 'MakeCode: criar o projeto e baixar', page: 16 },
    { label: 'Lição 01: Coração na matriz de LED', page: 18 },
  ],
  2: [{ label: 'Lição 03: Crachá', page: 24 }],
  3: [{ label: 'Lição 02: Coração batendo', page: 21 }],
  4: [{ label: 'Lição 15: LED RGB (o contador com variável)', page: 60 }],
  5: [{ label: 'Lição 04: Dado', page: 27 }],
  6: [{ label: 'Lição 08: Sol', page: 39 }],
  7: [
    { label: 'Sobre a protoboard', page: 13 },
    { label: 'Como usar o Shield', page: 14 },
    { label: 'Lição 09: Pisca LED', page: 42 },
  ],
  8: [{ label: 'Lição 17: Buzzer', page: 66 }],
  10: [{ label: 'Lição 16: Sensor de luz - LDR', page: 63, note: 'O PDF liga o LDR no P0. No treino ele vai no P2: funciona igual, desde que o código leia o mesmo pino do fio.' }],
  11: [
    { label: 'Lição 16: Sensor de luz - LDR', page: 63 },
    { label: 'Lição 09: Pisca LED', page: 42 },
  ],
};

export const tutorialUrl = (path: string): string => `https://makecode.microbit.org/?lang=pt-BR#tutorial:/projects/${path}`;
