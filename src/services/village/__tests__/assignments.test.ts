import { expect, run, test } from '../../english/__tests__/harness';
import { INCOME_GROUP, gamesOutearnedMissions, incomeBucket, weekIncome } from '../../assignments/buckets';
import { effectiveStatus, nextStatus, proofReady, statusCtx } from '../../assignments/machine';
import { instanceDraft, instanceId, weekdayIndex } from '../../assignments/recurrence';
import { approvalPlan, materialsForCreate, type ApprovalSnap } from '../../assignments/approval';
import { deadlineWeeks, dueAtIso, nextDueOn, submitInTime } from '../../assignments/due';
import { noticeUntil, orderFatherNotices } from '../../assignments/placa';
import { needsCapWarn, projectOverCap, projectWeekCap, usedShortGold, assignmentReward, bandFor, overCap, suggestedGold, weeklyCapLeft } from '../../assignments/rewards';
import { noticesForNow } from '../notices';
import { isoWeekOf } from '../../../utils/clock';
import type { AssignmentRecurrence } from '../../../types/assignment';
import type { NoticeContext } from '../../../types/village';
import { INITIAL_MATERIALS } from '../../../config/englishBase';

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

function submitted(gold = 6, kind: 'paid' | 'training' = 'paid', board = ['caixa', 'outra']): ApprovalSnap {
  return {
    id: 'caixa',
    status: 'submitted',
    kind,
    reward: { gold, xp: 15 },
    claimed: false,
    txExists: false,
    gold: 10,
    board,
    baseExists: true,
    progressExists: true,
    villageExists: true,
  };
}

test('aprovar duas vezes paga uma vez e poda o quadro', () => {
  const first = approvalPlan(submitted(6));
  if (!first.write || !first.paid) throw new Error('devia pagar');
  expect(first.reward.gold).toBe(6);
  expect(first.goldAfter).toBe(16);
  expect(first.line?.id).toBe('assignment_caixa');
  expect(first.line?.balanceBefore).toBe(10);
  expect(first.line?.balanceAfter).toBe(16);
  expect(first.claim).toBe('assignment:caixa');
  expect(first.board).toEqual(['outra']);
  const second = approvalPlan({
    ...submitted(6, 'paid', first.board),
    status: 'approved',
    claimed: true,
    txExists: true,
    gold: first.goldAfter,
  });
  expect(second).toEqual({ write: false, reason: 'already' });
  const crashed = approvalPlan({ ...submitted(6), claimed: true });
  if (!crashed.write || crashed.paid) throw new Error('claim existente não paga');
  expect(crashed.reason).toBe('claim_exists');
  expect(crashed.goldAfter).toBe(10);
  expect(crashed.line).toBe(null);
  expect(crashed.board).toEqual(['caixa', 'outra']);
});

test('treino com gold no documento paga 0 e não abre linha', () => {
  const training = approvalPlan({ ...submitted(99, 'training'), id: 'treino', board: ['treino'] });
  if (!training.write || !training.paid) throw new Error('devia gravar o treino');
  expect(training.reward.gold).toBe(0);
  expect(training.goldAfter).toBe(10);
  expect(training.line).toBe(null);
  expect(training.claim).toBe('assignment:treino');
  expect(training.board).toEqual([]);
});

test('sem englishBase o material nasce do padrão, sem chave com ponto', () => {
  const plan = approvalPlan({
    ...submitted(6),
    baseExists: false,
    reward: { gold: 6, xp: 15, materials: { madeira: 2 } },
  });
  if (!plan.write || !plan.paid || !plan.material) throw new Error('devia criar o material');
  expect(plan.material.create).toBe(true);
  expect(plan.material.materials.madeira).toBe(INITIAL_MATERIALS.madeira + 2);
  expect(plan.material.materials.ferro).toBe(INITIAL_MATERIALS.ferro);
  expect(Object.keys(plan.material.materials).some((key) => key.includes('.'))).toBe(false);
  expect(Object.keys(materialsForCreate({ pedra: 1 })).some((key) => key.includes('.'))).toBe(false);
});

test('ajuste e nova entrega pagam uma vez', () => {
  const ctx = paid();
  expect(nextStatus('submitted', 'request_changes', ctx)).toEqual({ ok: true, status: 'needs_changes' });
  expect(nextStatus('needs_changes', 'submit', ctx)).toEqual({ ok: true, status: 'submitted' });
  expect(nextStatus('submitted', 'submit', ctx)).toEqual({ ok: false, reason: 'transicao' });
  const paidOnce = approvalPlan({ ...submitted(6), id: 'cabos' });
  if (!paidOnce.write || !paidOnce.paid) throw new Error('devia pagar');
  const again = approvalPlan({
    ...submitted(6),
    id: 'cabos',
    status: 'approved',
    claimed: true,
    txExists: Boolean(paidOnce.line),
    gold: paidOnce.goldAfter,
  });
  expect(again).toEqual({ write: false, reason: 'already' });
  expect(paidOnce.goldAfter).toBe(16);
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

test('ajuste depois do prazo ganha dueAt novo e a entrega passa', () => {
  const today = '2026-09-29';
  expect(nextDueOn('2026-10-05', today)).toBe(null);
  expect(nextDueOn('2026-09-29', today)).toBe('2026-09-30');
  expect(nextDueOn('2026-09-28', today)).toBe('2026-09-30');
  expect(nextDueOn('2026-09-28', today, '2026-10-02')).toBe('2026-10-02');
  expect(nextDueOn('2026-09-28', today, today)).toBe('2026-09-30');
  const renewed = nextDueOn('2026-09-28', today) as string;
  const late = '2026-09-30T15:00:00.000-03:00';
  expect(submitInTime(late, dueAtIso('2026-09-28'))).toBe(false);
  expect(submitInTime(late, dueAtIso(renewed))).toBe(true);
});

test('faixas e teto usam o R7, e o projeto passa com até 1 D por semana', () => {
  const day = '2026-09-29';
  const week = isoWeekOf(day);
  expect(usedShortGold([
    { size: 'normal', status: 'approved', payoutGold: 6, payoutDay: day },
    { size: 'projeto', status: 'approved', payoutGold: 40, payoutDay: day },
    { size: 'normal', status: 'submitted', payoutGold: 6, payoutDay: day },
    { size: 'normal', status: 'approved', payoutGold: 4, payoutDay: '2026-09-01' },
  ], week)).toBe(6);
  expect(deadlineWeeks('2026-09-01', '2026-09-15')).toBe(2);
  expect(projectWeekCap(22, 2)).toBe(44);
  expect(projectOverCap(40, 22, 2)).toBe(false);
  expect(projectOverCap(45, 22, 2)).toBe(true);
  expect(needsCapWarn({ size: 'projeto', gold: 40, usedShort: 40, dayGold: 22, weeks: 2 })).toBe(false);
  expect(needsCapWarn({ size: 'normal', gold: 6, usedShort: 40, dayGold: 22 })).toBe(true);
  expect(bandFor('normal', 22).minGold).toBe(4);
  expect(bandFor('normal', 30).minGold).toBe(6);
});

test('placa cheia de encomendas ainda mostra o recado do pai', () => {
  const today = '2026-10-01';
  expect(noticeUntil('new', today, '2026-10-04')).toBe('2026-10-04');
  expect(noticeUntil('new', today)).toBe('2026-10-03');
  expect(noticeUntil('ok', today)).toBe('2026-10-02');
  expect(noticeUntil('fix', today)).toBe('2026-10-02');
  const father = { id: 'pai', type: 'recado' as const, text: 'Treino às 16h' };
  const orders = [1, 2, 3, 4].map((n) => ({
    id: `asg_caixa${n}_new`,
    type: 'recado' as const,
    text: `Encomenda nova na Casa: caixa ${n}`,
    until: '2026-10-06',
  }));
  const expired = { id: 'asg_velha_ok', type: 'recado' as const, text: 'Entrega aprovada: +6 gold', until: '2026-09-01' };
  const ctx: NoticeContext = {
    due: 0,
    done: 0,
    minDueForChest: 3,
    chestOpenHour: 18,
    chestOpened: true,
    birthdayMmDd: '03-01',
    gold: 10,
    nearestReward: null,
    avgGoldPerDay: 9,
    tomorrowQuizTitle: null,
    pauseDates: [],
    vacation: false,
    fatherNotices: orderFatherNotices([expired, ...orders, father]),
    dismissed: [],
  };
  const items = noticesForNow(ctx, today, 10);
  expect(items.some((item) => item.text === 'Treino às 16h')).toBe(true);
  expect(items.some((item) => item.text.includes('Entrega aprovada'))).toBe(false);
  expect(items.length).toBeLessThanOrEqual(3);
  expect(items.filter((item) => item.text.startsWith('Encomenda nova')).length).toBe(2);
});

run();
