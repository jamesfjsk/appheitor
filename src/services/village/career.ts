// Progresso da carreira, puro (CONTRATOS_E_CARREIRAS.md §11.2 a §11.4).
// O estado sai das entregas aprovadas pelo pai: treinos (kind 'training') e encomendas de engenharia.

import type { CareerDef, CareerRank, CompetencyLevel, RankId, RankRequirement } from '../../config/careers';
import { trainingByTemplate } from '../../config/careers';

/** Uma entrega aprovada que conta para a carreira. */
export interface CareerActivity {
  id: string;
  kind: 'training' | 'paid';
  templateId?: string;
  /** As competências que o pai marcou na aprovação (ou as do treino). */
  competencies: string[];
  fixedAfterFailure?: boolean;
}

export type ManualLevels = Record<string, CompetencyLevel | 'nenhum'>;

export interface CareerCounters {
  projects: number;
  projectsFixed: number;
  ownProblemProjects: number;
}

export interface CareerSnapshot {
  trainingsDone: number[];
  unlocked: number[];
  competencies: Record<string, CompetencyLevel>;
  counters: CareerCounters;
  rank: RankId;
  tools: string[];
}

const RANK_ORDER: RankId[] = ['aprendiz', 'tecnico', 'engenheiro', 'inventor'];

export const rankIndex = (rank: RankId): number => Math.max(0, RANK_ORDER.indexOf(rank));

/** Números da Torre. Reescritos inteiros a cada sync, para não somar duas vezes. */
export function careerTowerStats(input: {
  approvedPaid: number;
  fixed: number;
  trainings: number[];
  projects: number;
  projectFixed: number;
  rank: RankId;
}): Record<string, number> {
  return {
    assignmentsApproved: input.approvedPaid,
    assignmentsFixed: input.fixed,
    training7: input.trainings.includes(7) ? 1 : 0,
    bugsFixed: input.trainings.includes(12) || input.projectFixed > 0 ? 1 : 0,
    projectsDone: input.projects,
    careerRank: rankIndex(input.rank),
  };
}

/** Nível da obra do Laboratório: n1 Aprendiz ... n4 Inventor. */
export const labLevelOf = (rank: RankId): number => rankIndex(rank) + 1;

export function trainingsDoneOf(activities: CareerActivity[]): number[] {
  const done = new Set<number>();
  for (const a of activities) {
    if (a.kind !== 'training') continue;
    const t = trainingByTemplate(a.templateId);
    if (t) done.add(t.n);
  }
  return [...done].sort((x, y) => x - y);
}

/** O treino 1 abre sempre; os outros abrem quando algum treino feito os libera. */
export function unlockedTrainings(def: CareerDef, done: number[]): number[] {
  const open = new Set<number>([def.trainings[0]?.n ?? 1]);
  for (const t of def.trainings) {
    if (!done.includes(t.n)) continue;
    for (const next of t.unlocks) {
      if (def.trainings.some((x) => x.n === next)) open.add(next);
    }
  }
  return [...open].sort((x, y) => x - y);
}

/** 1 demonstração aprovada: praticando. 2 em atividades diferentes: já domina. O ajuste do pai vence. */
export function competencyLevels(activities: CareerActivity[], manual: ManualLevels = {}): Record<string, CompetencyLevel> {
  const seen: Record<string, Set<string>> = {};
  for (const a of activities) {
    for (const c of new Set(a.competencies)) {
      (seen[c] ||= new Set()).add(a.id);
    }
  }
  const out: Record<string, CompetencyLevel> = {};
  for (const [c, ids] of Object.entries(seen)) out[c] = ids.size >= 2 ? 'domina' : 'praticando';
  for (const [c, level] of Object.entries(manual)) {
    if (level === 'nenhum') delete out[c];
    else out[c] = level;
  }
  return out;
}

export function countersOf(activities: CareerActivity[]): CareerCounters {
  const paid = activities.filter((a) => a.kind === 'paid');
  return {
    projects: paid.length,
    projectsFixed: paid.filter((a) => a.fixedAfterFailure).length,
    ownProblemProjects: paid.filter((a) => a.templateId === 'problema').length,
  };
}

export function meets(req: RankRequirement, levels: Record<string, CompetencyLevel>, counters: CareerCounters): boolean {
  switch (req.type) {
    case 'competency': {
      const have = levels[req.id];
      return req.level === 'praticando' ? Boolean(have) : have === 'domina';
    }
    case 'projects':
      return counters.projects >= req.count;
    case 'projectsFixed':
      return counters.projectsFixed >= req.count;
    case 'ownProblemProjects':
      return counters.ownProblemProjects >= req.count;
  }
}

/** O título nunca desce: vale o maior entre o que já tinha e o que os requisitos dão, em ordem. */
export function rankFor(def: CareerDef, levels: Record<string, CompetencyLevel>, counters: CareerCounters, prev: RankId = 'aprendiz'): RankId {
  let reached: RankId = 'aprendiz';
  for (const rank of def.ranks) {
    if (!rank.requirements.every((r) => meets(r, levels, counters))) break;
    reached = rank.id;
  }
  return rankIndex(reached) >= rankIndex(prev) ? reached : prev;
}

export function nextRank(def: CareerDef, rank: RankId): CareerRank | null {
  const i = def.ranks.findIndex((r) => r.id === rank);
  return i >= 0 && i + 1 < def.ranks.length ? def.ranks[i + 1] : null;
}

export function requirementLine(def: CareerDef, req: RankRequirement): string {
  switch (req.type) {
    case 'competency': {
      const name = def.competencies.find((c) => c.id === req.id)?.name ?? req.id;
      return req.level === 'domina' ? `${name}: já domina` : `${name}: praticando`;
    }
    case 'projects':
      return req.count === 1 ? '1 projeto aprovado' : `${req.count} projetos aprovados`;
    case 'projectsFixed':
      return req.count === 1 ? '1 projeto que falhou e ele corrigiu' : `${req.count} projetos corrigidos depois de uma falha`;
    case 'ownProblemProjects':
      return '1 projeto que nasceu de um problema da casa dele';
  }
}

export function careerSnapshot(def: CareerDef, activities: CareerActivity[], manual: ManualLevels = {}, prevRank: RankId = 'aprendiz'): CareerSnapshot {
  const trainingsDone = trainingsDoneOf(activities);
  const competencies = competencyLevels(activities, manual);
  const counters = countersOf(activities);
  const tools = def.tools.filter((tool) => trainingsDone.includes(tool.unlockAfterTraining)).map((tool) => tool.id);
  return {
    trainingsDone,
    unlocked: unlockedTrainings(def, trainingsDone),
    competencies,
    counters,
    rank: rankFor(def, competencies, counters, prevRank),
    tools,
  };
}
