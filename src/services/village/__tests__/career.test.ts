import { expect, run, test } from '../../english/__tests__/harness';
import { CAREER_REWARDS, ENGENHEIRO, trainingTemplateId } from '../../../config/careers';
import { assignmentReward } from '../../assignments/rewards';
import {
  careerSnapshot,
  competencyLevels,
  labLevelOf,
  rankFor,
  unlockedTrainings,
  type CareerActivity,
} from '../career';

const training = (n: number, comps?: string[]): CareerActivity => {
  const t = ENGENHEIRO.trainings.find((x) => x.n === n)!;
  return { id: `eng_${n}`, kind: 'training', templateId: trainingTemplateId(n), competencies: comps ?? t.competencies };
};

test('carreira: 14 treinos lidos do documento, com passos, demonstração e XP', () => {
  expect(ENGENHEIRO.trainings.length).toBe(14);
  for (const t of ENGENHEIRO.trainings) {
    expect(t.worksWhen.length > 0).toBe(true);
    expect(t.xp > 0).toBe(true);
    expect(t.competencies.length > 0).toBe(true);
  }
  expect(ENGENHEIRO.trainings.find((t) => t.n === 12)?.hints.length).toBe(0);
  expect(ENGENHEIRO.trainings.find((t) => t.n === 7)?.unlocksTool).toBe('metodo');
});

test('carreira: o treino 1 abre sozinho; 1 a 3 feitos abrem o 4 e o 5', () => {
  expect(unlockedTrainings(ENGENHEIRO, [])).toEqual([1]);
  expect(unlockedTrainings(ENGENHEIRO, [1, 2, 3])).toEqual([1, 2, 3, 4, 5]);
  expect(unlockedTrainings(ENGENHEIRO, [1, 2, 3, 5])).toEqual([1, 2, 3, 4, 5, 7]);
  // o 15 é marco, não vira treino
  expect(unlockedTrainings(ENGENHEIRO, [14]).includes(15)).toBe(false);
});

test('carreira: uma demonstração é praticando, duas diferentes é já domina, e o pai pode ajustar', () => {
  const levels = competencyLevels([training(1), training(2)]);
  expect(levels['mb-basico']).toBe('domina');
  expect(levels.saidas).toBe('praticando');
  expect(levels.entradas).toBe(undefined);
  const manual = competencyLevels([training(1)], { entradas: 'praticando', 'mb-basico': 'nenhum' });
  expect(manual.entradas).toBe('praticando');
  expect(manual['mb-basico']).toBe(undefined);
});

test('carreira: Técnico pede o básico dominado e a protoboard praticada; o título nunca desce', () => {
  const firstDays = [1, 2, 3, 4, 5].map((n) => training(n));
  const snap = careerSnapshot(ENGENHEIRO, firstDays);
  expect(snap.rank).toBe('aprendiz');
  const tecnico = careerSnapshot(ENGENHEIRO, [
    ...firstDays,
    training(7),
    training(9),
    training(12),
  ]);
  expect(tecnico.rank).toBe('tecnico');
  expect(labLevelOf(tecnico.rank)).toBe(2);
  expect(tecnico.tools).toEqual(['metodo']);
  expect(rankFor(ENGENHEIRO, {}, { projects: 0, projectsFixed: 0, ownProblemProjects: 0 }, 'tecnico')).toBe('tecnico');
});

test('carreira: treino paga XP e 1 redstone, nunca gold, mesmo com gold no documento', () => {
  const pay = assignmentReward({ kind: 'training', templateId: 'eng-7', reward: { gold: 50, xp: 999 } }, CAREER_REWARDS);
  expect(pay.gold).toBe(0);
  expect(pay.xp).toBe(25);
  expect(pay.materials).toEqual({ redstone: 1 });
});

void run();
