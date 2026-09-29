import { expect, run, test } from '../../english/__tests__/harness';
import { INCOME_GROUP, gamesOutearnedMissions, incomeBucket, weekIncome } from '../../assignments/buckets';
import { effectiveStatus, nextStatus, proofReady, statusCtx } from '../../assignments/machine';
import { instanceDraft, instanceId, weekdayIndex } from '../../assignments/recurrence';
import { assignmentReward, bandFor, overCap, suggestedGold, weeklyCapLeft } from '../../assignments/rewards';
import { settleApproval, type SettleState } from '../../assignments/settle';
import type { AssignmentRecurrence } from '../../../types/assignment';

const paid = (patch: Partial<StatusCtxShape> = {}) => statusCtx({ kind: 'paid', proofComplete: true, ...patch });

type StatusCtxShape = Parameters<typeof statusCtx>[0];

test('transições permitidas e proibidas', () => {
  const ctx = paid();
  expect(nextStatus('available', 'accept', ctx)).toEqual({ ok: true, status: 'accepted' });
  expect(nextStatus('accepted', 'submit', ctx)).toEqual({ ok: true, status: 'submitted' });
  expect(nextStatus('needs_changes', 'submit', ctx)).toEqual({ ok: true, status: 'submitted' });
  expect(nextStatus('accepted', 'drop', ctx)).toEqual({ ok: true, status: 'available' });
  expect(nextStatus('needs_changes', 'drop', ctx)).toEqual({ ok: true, status: 'available' });
  expect(nextStatus('submitted', 'approve', ctx)).toEqual({ ok: true, status: 'approved' });
  expect(nextStatus('submitted', 'request_changes', ctx)).toEqual({ ok: true, status: 'needs_changes' });
  expect(nextStatus('available', 'cancel', ctx)).toEqual({ ok: true, status: 'cancelled' });
  expect(nextStatus('accepted', 'cancel', ctx)).toEqual({ ok: true, status: 'cancelled' });
  expect(nextStatus('expired', 'cancel', ctx)).toEqual({ ok: true, status: 'cancelled' });

  expect(nextStatus('submitted', 'submit', ctx).ok).toBe(false);
  expect(nextStatus('submitted', 'accept', ctx)).toEqual({ ok: false, reason: 'transicao' });
  expect(nextStatus('approved', 'cancel', ctx)).toEqual({ ok: false, reason: 'transicao' });
  expect(nextStatus('approved', 'approve', ctx)).toEqual({ ok: false, reason: 'transicao' });
  expect(nextStatus('available', 'drop', ctx)).toEqual({ ok: false, reason: 'transicao' });
  expect(nextStatus('available', 'submit', ctx)).toEqual({ ok: false, reason: 'transicao' });
  expect(nextStatus('available', 'submit', paid({ kind: 'training' }))).toEqual({ ok: true, status: 'submitted' });
  expect(nextStatus('available', 'accept', paid({ kind: 'training' }))).toEqual({ ok: false, reason: 'transicao' });
  expect(nextStatus('accepted', 'submit', paid({ proofComplete: false }))).toEqual({ ok: false, reason: 'prova' });
  expect(nextStatus('available', 'expire', paid({ dueOn: '2026-09-28' }))).toEqual({ ok: true, status: 'expired' });
  expect(nextStatus('submitted', 'expire', paid({ dueOn: '2026-09-28' }))).toEqual({ ok: false, reason: 'transicao' });
  expect(nextStatus('accepted', 'expire', paid({ dueOn: '2026-09-30' }))).toEqual({ ok: false, reason: 'cedo' });
});

test('effectiveStatus mostra o prazo passado antes da função gravar', () => {
  expect(effectiveStatus({ status: 'accepted', dueOn: '2026-09-28' }, '2026-09-29')).toBe('expired');
  expect(effectiveStatus({ status: 'available', dueOn: '2026-09-29' }, '2026-09-29')).toBe('available');
  expect(effectiveStatus({ status: 'submitted', dueOn: '2026-09-28' }, '2026-09-29')).toBe('submitted');
  expect(effectiveStatus({ status: 'needs_changes', dueOn: '2026-09-20' }, '2026-09-29')).toBe('expired');
  expect(effectiveStatus({ status: 'approved', dueOn: '2026-09-01' }, '2026-09-29')).toBe('approved');
  expect(nextStatus('available', 'accept', paid({ dueOn: '2026-09-28' }))).toEqual({ ok: false, reason: 'prazo' });
  expect(nextStatus('accepted', 'submit', paid({ dueOn: '2026-09-28' }))).toEqual({ ok: false, reason: 'prazo' });
});

test('treino nunca paga gold, mesmo com gold no documento; encomenda paga o gravado', () => {
  const training = assignmentReward({ kind: 'training', reward: { gold: 99, xp: 40 }, templateId: 't1' });
  expect(training.gold).toBe(0);
  expect(training.xp).toBe(0);
  const fromTable = assignmentReward(
    { kind: 'training', reward: { gold: 99, xp: 40 }, templateId: 't1' },
    { trainings: { t1: { xp: 12 } } },
  );
  expect(fromTable.gold).toBe(0);
  expect(fromTable.xp).toBe(12);
  const paidReward = assignmentReward({ kind: 'paid', reward: { gold: 6, xp: 15 } });
  expect(paidReward.gold).toBe(6);
  expect(paidReward.xp).toBe(15);
});

test('faixa com D = 22 e teto semanal', () => {
  expect(bandFor('pequena', 22)).toEqual({ size: 'pequena', minDays: 0.1, maxDays: 0.2, xp: 10, minGold: 2, maxGold: 4 });
  expect(bandFor('normal', 22).minGold).toBe(4);
  expect(bandFor('normal', 22).maxGold).toBe(7);
  expect(bandFor('normal', 22).xp).toBe(15);
  expect(suggestedGold('normal', 22)).toBe(6);
  expect(bandFor('sabado', 22).minGold).toBe(9);
  expect(bandFor('sabado', 22).maxGold).toBe(14);
  expect(weeklyCapLeft(40, 22)).toBe(4);
  expect(weeklyCapLeft(44, 22)).toBe(0);
  expect(weeklyCapLeft(50, 22)).toBe(0);
  expect(overCap(40, 6, 22)).toBe(true);
  expect(overCap(10, 6, 22)).toBe(false);
  expect(overCap(40, 0, 22)).toBe(false);
});

test('limite de ativas: 3, com no máximo 1 projeto', () => {
  expect(nextStatus('available', 'accept', paid({ activeCount: 3 })).ok).toBe(false);
  expect(nextStatus('available', 'accept', paid({ activeCount: 3 }))).toEqual({ ok: false, reason: 'limite' });
  expect(nextStatus('available', 'accept', paid({ activeCount: 2 })).ok).toBe(true);
  expect(nextStatus('available', 'accept', paid({ size: 'projeto', projectCount: 1, activeCount: 1 }))).toEqual({ ok: false, reason: 'projeto' });
  expect(nextStatus('available', 'accept', paid({ size: 'grande', projectCount: 1 }))).toEqual({ ok: false, reason: 'projeto' });
  expect(nextStatus('available', 'accept', paid({ size: 'projeto', projectCount: 0, activeCount: 2 })).ok).toBe(true);
  expect(nextStatus('available', 'accept', paid({ size: 'normal', projectCount: 1, activeCount: 1 })).ok).toBe(true);
});

test('id da recorrência igual gera uma vez só, e o domingo é 0', () => {
  expect(weekdayIndex('2026-09-27')).toBe(0);
  expect(weekdayIndex('2026-09-29')).toBe(2);
  const seen = new Set<string>();
  seen.add(instanceId('rec1', '2026-09-29'));
  seen.add(instanceId('rec1', '2026-09-29'));
  expect(seen.size).toBe(1);
  expect(instanceId('rec1', '2026-09-29')).toBe('rec1_2026-09-29');
  const rec: AssignmentRecurrence = {
    id: 'rec1',
    userId: 'uid',
    specialty: 'testador',
    title: 'Testar a Vagoneta por 15 minutos.',
    deliverable: 'uma sessão de teste de 15 minutos, anotada.',
    criteria: ['testei pelo tempo combinado'],
    proof: { kinds: ['checklist'] },
    size: 'normal',
    reward: { gold: 6, xp: 15 },
    competencies: [],
    weekdays: [2],
    dueAfterDays: 0,
    active: true,
  };
  const first = instanceDraft(rec, '2026-09-29');
  const second = instanceDraft(rec, '2026-09-29');
  expect(first?.id).toBe(second?.id);
  expect(first?.id).toBe('rec1_2026-09-29');
  expect(first?.dueOn).toBe('2026-09-29');
  expect(instanceDraft({ ...rec, active: false }, '2026-09-29')).toBe(null);
  expect(instanceDraft(rec, '2026-09-30')).toBe(null);
});

test('incomeBucket com todas as fontes', () => {
  const life = ['task_completion', 'late_task', 'task_reversal', 'chest', 'streak_chest', 'repair'];
  const play = ['quiz', 'english_game', 'achievement', 'challenge', 'book_report'];
  for (const source of Object.keys(INCOME_GROUP)) {
    const group = incomeBucket(source);
    expect(group).toBe(INCOME_GROUP[source as keyof typeof INCOME_GROUP]);
    if (life.includes(source)) expect(group).toBe('life');
    else if (play.includes(source)) expect(group).toBe('play');
    else if (source === 'assignment') expect(group).toBe('assignment');
    else expect(group).toBe('aside');
  }
  expect(incomeBucket('assignment')).toBe('assignment');
  expect(incomeBucket('daily_penalty')).toBe('aside');
  expect(incomeBucket('goal_interest')).toBe('aside');
  expect(incomeBucket('desconhecida')).toBe('aside');
  const week = weekIncome([
    { source: 'task_completion', amount: 91 },
    { source: 'chest', amount: 25 },
    { source: 'assignment', amount: 12 },
    { source: 'quiz', amount: 42 },
    { source: 'english_game', amount: 22 },
    { source: 'achievement', amount: 9 },
    { source: 'daily_penalty', amount: -32 },
    { source: 'goal_interest', amount: 4 },
  ]);
  expect(week.life).toBe(116);
  expect(week.assignment).toBe(12);
  expect(week.play).toBe(73);
  expect(week.penalty).toBe(-32);
  expect(week.interest).toBe(4);
  expect(gamesOutearnedMissions(week)).toBe(false);
  expect(gamesOutearnedMissions({ ...week, play: 200, life: 10 })).toBe(true);
});

function submitted(gold = 6, kind: 'paid' | 'training' = 'paid'): SettleState {
  return {
    status: 'submitted',
    kind,
    reward: { gold, xp: 15 },
    claimed: false,
    txExists: false,
    gold: 10,
    txs: [],
  };
}

test('aprovar duas vezes num armazenamento falso paga uma vez', () => {
  const first = settleApproval(submitted(6), 'caixa');
  expect(first.result).toEqual({ wrote: true, paid: true, gold: 6 });
  expect(first.state.gold).toBe(16);
  expect(first.state.txs).toHaveLength(1);
  expect(first.state.txs[0].id).toBe('assignment_caixa');
  expect(first.state.txs[0].balanceBefore).toBe(10);
  expect(first.state.txs[0].balanceAfter).toBe(16);
  expect(first.state.claimed).toBe(true);
  const second = settleApproval(first.state, 'caixa');
  expect(second.result).toEqual({ wrote: false, reason: 'already' });
  expect(second.state.gold).toBe(16);
  expect(second.state.txs).toHaveLength(1);
  const crashed = settleApproval({ ...submitted(6), claimed: true, status: 'submitted' }, 'caixa');
  expect(crashed.result).toEqual({ wrote: true, paid: false, reason: 'claim_exists' });
  expect(crashed.state.gold).toBe(10);
  expect(crashed.state.txs).toHaveLength(0);
  const training = settleApproval(submitted(99, 'training'), 'treino');
  expect(training.result).toEqual({ wrote: true, paid: true, gold: 0 });
  expect(training.state.gold).toBe(10);
  expect(training.state.txs).toHaveLength(0);
  expect(training.state.claimed).toBe(true);
});

test('ajuste e nova entrega pagam uma vez', () => {
  const ctx = paid();
  expect(nextStatus('submitted', 'request_changes', ctx)).toEqual({ ok: true, status: 'needs_changes' });
  expect(nextStatus('needs_changes', 'submit', ctx)).toEqual({ ok: true, status: 'submitted' });
  expect(nextStatus('submitted', 'submit', ctx)).toEqual({ ok: false, reason: 'transicao' });
  const paidOnce = settleApproval(submitted(6), 'cabos');
  const again = settleApproval(paidOnce.state, 'cabos');
  expect(again.state.txs).toHaveLength(1);
  expect(again.state.gold).toBe(16);
  expect(proofReady(
    { kinds: ['checklist'], questions: [] },
    { kinds: ['checklist'], checklist: [true, false] },
    2,
  )).toBe(false);
  expect(proofReady(
    { kinds: ['checklist', 'questions'], questions: ['O que você testou?'] },
    { kinds: ['checklist', 'questions'], checklist: [true], answers: [{ q: 'O que você testou?', a: 'a vagoneta' }] },
    1,
  )).toBe(true);
});

run();
