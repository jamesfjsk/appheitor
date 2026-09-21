import { expect, run, test } from '../../english/__tests__/harness';
import { addDays, isBeforeLaunch, nowBrazil, resetClockForTests } from '../../../utils/clock';
import type { GoldTransaction } from '../../../types';
import type { AgendaItem, ChallengeDoc, GoalDoc } from '../../../types/village';
import { DEFAULT_ECONOMY } from '../../../config/village';
import { validateDeposit, vaultGoalCap, weeklyInterest, weeklyStatement, savingsRate, patienceForecast, minGoldForBonus, vaultInterestPct, unlockOnAfter, canRedeemPile, redeemWaitLine, saqueLine } from '../bank';
import { applyEvent, challengeState, extendForPunishment } from '../challenges';
import { daysToAfford, priceForDays, referenceIncome, sinceLaunch } from '../income';
import { txsLastDays, balancaTotals } from '../balance';
import { capGold, gameGoldRoom } from '../caps';
import { applyMaterialRepair, canRepair, cracksAfterClose, isBroken, liveBuildingLevel, repairMaterialCost, repairRefund, BREAKABLE_LOTS } from '../repair';
import { nextQuizStreak, skipDayPenalty } from '../stats';
import { nextFullDays } from '../schedule';
import { lateTaskReward, lateWindow } from '../late';
import { levelGift, minLevelFor } from '../levels';
import { occurrencesBetween, organizationXp, reminderDue, studyPlanFor, weekOrganized, dayTimeline } from '../agenda';
import { levelGiftClaimKey, levelGiftPendingKey, pendingLevelGiftLevels } from '../claims';
import { keepDoneContracts } from '../../../config/englishBase';

const tx = (over: Partial<GoldTransaction> & Pick<GoldTransaction, 'amount' | 'source' | 'type'>): GoldTransaction => ({
  id: over.id || 't',
  userId: 'u',
  description: '',
  balanceBefore: 0,
  balanceAfter: 0,
  createdAt: over.createdAt || new Date('2026-09-15T15:00:00.000Z'),
  ...over,
});

const goal = (over: Partial<GoalDoc> = {}): GoalDoc => ({
  id: 'g1',
  userId: 'u',
  familyId: 'heitor',
  title: 'Pizza',
  targetGold: 45,
  savedGold: 20,
  status: 'open',
  interestPaid: 0,
  createdAt: '2026-09-01',
  updatedAt: '2026-09-01',
  ...over,
});

const challenge = (over: Partial<ChallengeDoc> = {}): ChallengeDoc => ({
  id: 'c1',
  userId: 'u',
  familyId: 'heitor',
  title: '20 missões',
  description: '',
  kind: 'tasks_count',
  target: 20,
  progress: 19,
  startsOn: '2026-09-14',
  endsOn: '2026-09-20',
  xpReward: 20,
  goldReward: 10,
  createdBy: 'admin',
  status: 'active',
  extendedDays: 0,
  createdAt: '2026-09-14',
  updatedAt: '2026-09-14',
  ...over,
});

test('depósito válido e recusa quando falta gold', () => {
  expect(validateDeposit(goal(), 10, 30)).toEqual({ ok: true });
  expect(validateDeposit(goal(), 40, 30).ok).toBe(false);
  const fail = validateDeposit(goal(), 40, 30);
  expect(fail.ok ? '' : fail.reason).toBe('gold');
});

test('juros 10/20/30 sem teto e ignora semana já paga; virada de ano', () => {
  const week = '2026-W01';
  const a = goal({ id: 'a', savedGold: 200, lastInterestWeek: '2025-W52' });
  const b = goal({ id: 'b', savedGold: 200, lastInterestWeek: '2025-W52' });
  const paid = weeklyInterest([a, b], week, DEFAULT_ECONOMY, 2);
  const sum = paid.reduce((s, p) => s + p.interest, 0);
  expect(sum).toBe(80);
  expect(paid[0].savedBefore).toBe(200);
  const again = weeklyInterest(
    paid.map((p) => ({ id: p.goalId, status: 'open' as const, savedGold: p.savedAfter, lastInterestWeek: week })),
    week,
    DEFAULT_ECONOMY,
    2,
  );
  expect(again).toHaveLength(0);
});

test('juros do Cofre: n1 10%, n2 20%, n3 30%; n0 não paga', () => {
  expect(vaultGoalCap(0)).toBe(0);
  expect(vaultGoalCap(1)).toBe(5);
  expect(vaultGoalCap(2)).toBe(8);
  expect(vaultInterestPct(0)).toBe(0);
  expect(vaultInterestPct(1)).toBe(10);
  expect(vaultInterestPct(2)).toBe(20);
  expect(vaultInterestPct(3)).toBe(30);
  const week = '2026-W02';
  const g = goal({ savedGold: 100, lastInterestWeek: '2026-W01' });
  expect(weeklyInterest([g], week, DEFAULT_ECONOMY, 0)).toHaveLength(0);
  expect(weeklyInterest([g], week, DEFAULT_ECONOMY, 1)[0].interest).toBe(10);
  expect(weeklyInterest([g], week, DEFAULT_ECONOMY, 2)[0].interest).toBe(20);
  expect(weeklyInterest([g], week, DEFAULT_ECONOMY, 3)[0].interest).toBe(30);
  const afterDeposit = weeklyInterest([g], week, DEFAULT_ECONOMY, 2, { g1: 80 });
  expect(afterDeposit[0].savedBefore).toBe(20);
  expect(afterDeposit[0].interest).toBe(4);
});

test('previsão de paciência soma semanas sem teto', () => {
  expect(patienceForecast(100, 1, 10)).toBe(10);
  expect(patienceForecast(100, 2, 10)).toBe(21);
  expect(patienceForecast(400, 1, 10)).toBe(40);
  expect(patienceForecast(10, 1, 10)).toBe(1);
  expect(patienceForecast(20, 1, 10)).toBe(2);
  expect(patienceForecast(30, 1, 10)).toBe(3);
  expect(patienceForecast(40, 1, 10)).toBe(4);
  expect(patienceForecast(50, 1, 10)).toBe(5);
  expect(patienceForecast(10, 4, 10)).toBe(4);
  expect(patienceForecast(10, 4, 20)).toBe(9);
  expect(patienceForecast(5, 1, 20)).toBe(1);
  expect(minGoldForBonus(10)).toBe(10);
  expect(minGoldForBonus(20)).toBe(5);
  expect(minGoldForBonus(30)).toBe(4);
});

test('resgate: prazo de semanas e montinho antigo já pode sair', () => {
  expect(unlockOnAfter('2026-09-19', 1)).toBe('2026-09-26');
  expect(unlockOnAfter('2026-09-19', 4)).toBe('2026-10-17');
  expect(unlockOnAfter('2026-09-19', 1, '2026-10-01')).toBe('2026-10-01');
  expect(canRedeemPile({ status: 'open', savedGold: 10 }, '2026-09-19')).toBe(true);
  expect(canRedeemPile({ status: 'open', savedGold: 10, unlockOn: '2026-09-26' }, '2026-09-19')).toBe(false);
  expect(canRedeemPile({ status: 'open', savedGold: 10, unlockOn: '2026-09-26' }, '2026-09-26')).toBe(true);
  expect(canRedeemPile({ status: 'cancelled', savedGold: 10 }, '2026-09-19')).toBe(false);
  expect(redeemWaitLine('2026-09-26', '2026-09-19')).toBe('Ainda rendendo. Saque no sábado.');
  expect(saqueLine('2026-09-26', '2026-09-19')).toBe('Saque no sábado.');
  expect(saqueLine('2026-10-17', '2026-09-19')).toBe('Saque 17 de outubro.');
  expect(saqueLine(undefined, '2026-09-19')).toBe('Já pode resgatar.');
  expect(saqueLine('2026-09-19', '2026-09-19')).toBe('Já pode resgatar.');
});

test('extrato da semana e taxa de poupança', () => {
  const list = [
    tx({ amount: 30, type: 'earned', source: 'task_completion' }),
    tx({ amount: -20, type: 'saved', source: 'goal_deposit' }),
    tx({
      amount: 0,
      type: 'saved',
      source: 'goal_interest',
      metadata: { savedBefore: 20, savedAfter: 21 },
    }),
  ];
  const st = weeklyStatement(list, '2026-W38');
  expect(st.earned).toBe(30);
  expect(st.saved).toBe(20);
  expect(st.interest).toBe(1);
  expect(st.savingsRatePct).toBe(67);
  expect(savingsRate(list)).toBe(67);
});

test('desafio completa uma vez e expira no mesmo dia', () => {
  const first = applyEvent(challenge(), { kind: 'tasks_count', value: 1 }, '2026-09-20');
  expect(first.justCompleted).toBe(true);
  expect(first.challenge.completedAt).toBe('2026-09-20');
  const second = applyEvent(first.challenge, { kind: 'tasks_count', value: 1 }, '2026-09-20');
  expect(second.justCompleted).toBe(false);
  expect(challengeState(challenge({ endsOn: '2026-09-15', completedAt: undefined }), '2026-09-15')).toBe('active');
  expect(challengeState(challenge({ endsOn: '2026-09-14' }), '2026-09-15')).toBe('expired');
});

test('punição prolonga o prazo', () => {
  const [next] = extendForPunishment([challenge({ endsOn: '2026-09-20', extendedDays: 0 })], 1);
  expect(next.endsOn).toBe('2026-09-21');
  expect(next.extendedDays).toBe(1);
});

test('R7, faixa de preço e dias para alcançar', () => {
  const list = Array.from({ length: 7 }, (_, i) =>
    tx({ amount: 45, type: 'earned', source: 'task_completion', createdAt: new Date(`2026-09-0${i + 1}T15:00:00Z`) })
  );
  expect(referenceIncome(list, 45)).toBe(45);
  expect(referenceIncome([], 45)).toBe(45);
  expect(priceForDays(45, 3)).toBe(135);
  expect(daysToAfford(135, 45, 45)).toBe(2);
  expect(daysToAfford(20, 30, 45)).toBe(0);
});

test('R7 ignora o histórico anterior ao lançamento e o presente', () => {
  const old = tx({ amount: 90, type: 'earned', source: 'task_completion', createdAt: new Date('2026-09-10T15:00:00.000Z') });
  const gift = tx({
    amount: 100,
    type: 'adjustment',
    source: 'admin_adjustment',
    createdAt: new Date('2026-09-20T15:00:00.000Z'),
    metadata: { launch: true },
  });
  const play = tx({ amount: 45, type: 'earned', source: 'task_completion', createdAt: new Date('2026-09-22T15:00:00.000Z') });
  expect(sinceLaunch([old, gift, play], '2026-09-20')).toEqual([play]);
  // com o instante do lançamento, o que foi feito no mesmo dia antes do reset fica de fora (18/09)
  const sameDayBefore = { ...play, createdAt: new Date('2026-09-20T11:00:00.000Z') } as typeof play;
  const sameDayAfter = { ...play, createdAt: new Date('2026-09-20T14:00:00.000Z') } as typeof play;
  expect(sinceLaunch([sameDayBefore, gift, sameDayAfter], '2026-09-20', '2026-09-20T13:00:00.000Z')).toEqual([sameDayAfter]);
  expect(referenceIncome([old, gift, play], 45, { launchedOn: '2026-09-20', today: '2026-09-22' })).toBe(45);
  const week = Array.from({ length: 7 }, (_, i) =>
    tx({ amount: 30, type: 'earned', source: 'task_completion', createdAt: new Date(`2026-09-${21 + i}T15:00:00.000Z`) })
  );
  expect(referenceIncome(week, 45, { launchedOn: '2026-09-20', today: '2026-09-27' })).toBe(30);
});

test('teto de gold do jogo conta juros pelo metadata', () => {
  const today = [tx({ amount: 30, type: 'earned', source: 'chest' })];
  const week = [
    ...today,
    tx({ amount: 80, type: 'earned', source: 'challenge' }),
    tx({ amount: 0, type: 'saved', source: 'goal_interest', metadata: { savedBefore: 10, savedAfter: 15 } }),
  ];
  const room = gameGoldRoom(today, week, { gameGoldDailyCap: 35, gameGoldWeeklyCap: 100 });
  expect(room.day).toBe(5);
  expect(room.week).toBe(0);
  expect(room.room).toBe(0);
  expect(capGold(10, 5)).toEqual({ paid: 5, capped: true });
});

test('linha do dia ordena missão, compromisso sem hora no fim e fechar o dia', () => {
  const item: AgendaItem = {
    id: 'a1',
    userId: 'u',
    familyId: 'heitor',
    title: 'Treino',
    kind: 'treino',
    date: '2026-09-15',
    createdBy: 'child',
    plannedAheadDays: 1,
    createdAt: '2026-09-15',
    updatedAt: '2026-09-15',
  };
  const timed: AgendaItem = { ...item, id: 'a2', title: 'Prova', kind: 'prova', time: '14:00' };
  const tasks = [
    { id: 'm1', title: 'Cama', active: true, frequency: 'daily' as const, period: 'morning' as const, time: '08:00' },
    { id: 'm2', title: 'Leitura', active: true, frequency: 'daily' as const, period: 'evening' as const },
  ];
  const line = dayTimeline([item, timed], tasks, null, '2026-09-15');
  expect(line[0].title).toBe('Cama');
  expect(line.some((e) => e.title === 'Prova' && e.sortMin === 14 * 60)).toBe(true);
  expect(line[line.length - 1].kind).toBe('close');
  const untimed = line.find((e) => e.title === 'Treino');
  expect(untimed?.sortMin).toBe(21 * 60);
});

test('dia perdido derruba no máximo uma obra; conserto pede o dia de hoje completo', () => {
  const built = { fornalha: 1, bau: 1, cerca: 1, torre: 1, mesa: 1, cofre: 1, agenda: 1, mercado: 1, campinho: 0, arena: 0 };
  expect(cracksAfterClose([], [{ period: 'afternoon' }], built)).toEqual(['cerca']);
  expect(cracksAfterClose([], [
    { period: 'morning' },
    { period: 'morning' },
    { period: 'evening' },
  ], built)).toEqual(['fornalha']);
  expect(cracksAfterClose(['fornalha'], [{ period: 'morning' }], built)).toEqual(['fornalha', 'bau']);
  expect(cracksAfterClose(['fornalha'], [
    { period: 'morning' },
    { period: 'afternoon' },
    { period: 'evening' },
  ], built)).toEqual(['fornalha', 'bau']);
  expect(cracksAfterClose([], [{ period: 'afternoon' }], { fornalha: 1 })).toEqual(['fornalha']);
  expect(cracksAfterClose([], [{ period: 'morning' }, { period: 'evening' }], {})).toEqual([]);
  expect(liveBuildingLevel(built, ['fornalha'], 'fornalha')).toBe(0);
  expect(liveBuildingLevel(built, ['fornalha'], 'bau')).toBe(1);
  expect(isBroken(['cerca'], 'cerca')).toBe(true);
  const cracks = cracksAfterClose([], [{ period: 'afternoon' }], built);
  expect(canRepair(cracks, 6, 6)).toBe(true);
  expect(canRepair(cracks, 6, 5)).toBe(false);
  expect(repairRefund(4)).toBe(2);
});

test('arrumar com material tira só aquela obra e cobra 1 do material do nível', () => {
  expect(repairMaterialCost('fornalha', 1)).toEqual({ madeira: 1, pedra: 0, ferro: 0, redstone: 0 });
  expect(repairMaterialCost('torre', 1)).toEqual({ madeira: 0, pedra: 1, ferro: 0, redstone: 0 });
  expect(repairMaterialCost('bau', 2)).toEqual({ madeira: 1, pedra: 0, ferro: 0, redstone: 0 });
  const mats = { madeira: 2, pedra: 1, ferro: 0, redstone: 0 };
  const out = applyMaterialRepair(['fornalha', 'bau'], 'fornalha', mats, 1);
  expect(out.cracks).toEqual(['bau']);
  expect(out.materials.madeira).toBe(1);
  expect(out.materials.pedra).toBe(1);
  expect(() => applyMaterialRepair(['bau'], 'fornalha', mats, 1)).toThrow();
  expect(() => applyMaterialRepair(['fornalha'], 'fornalha', { madeira: 0, pedra: 0, ferro: 0, redstone: 0 }, 1)).toThrow();
});

test('missão recuperada só até o horário e metade do gold', () => {
  expect(lateWindow(11)).toBe(true);
  expect(lateWindow(12)).toBe(false);
  expect(lateTaskReward({ gold: 5, xp: 10 })).toEqual({ gold: 2, xp: 10, material: 0 });
});

test('presente de nível e minLevel', () => {
  expect(levelGift(10, 1)).toEqual({ materialChoice: true, rare: 'diamante', cosmeticId: 'milestone_10' });
  expect(levelGift(3, 1).rare).toBe(null);
  expect(minLevelFor('pickaxe_stone')).toBe(5);
  expect(minLevelFor('pickaxe_diamond')).toBe(32);
  expect(minLevelFor('hat_crown')).toBe(25);
});

test('agenda: repetição semanal, plano de estudo e XP de antecedência', () => {
  const item: AgendaItem = {
    id: 'a1',
    userId: 'u',
    familyId: 'heitor',
    title: 'Prova de matemática',
    kind: 'prova',
    date: '2026-09-18',
    createdBy: 'child',
    plannedAheadDays: 3,
    createdAt: '2026-09-15',
    updatedAt: '2026-09-15',
    repeat: 'none',
  };
  expect(studyPlanFor(item, '2026-09-15')).toEqual(['2026-09-15', '2026-09-16', '2026-09-17']);
  expect(organizationXp(item)).toBe(10);
  const weekly: AgendaItem = { ...item, id: 'w', repeat: 'weekly', date: '2026-09-15' };
  const occ = occurrencesBetween([weekly], '2026-09-15', '2026-09-29');
  expect(occ).toHaveLength(3);
  expect(weekOrganized([{ ...item, doneAt: '2026-09-18' }], '2026-W38')).toBe(true);
  resetClockForTests();
  const due = reminderDue(
    { ...item, date: addDays('2026-09-16', 0), time: undefined, remindMinutesBefore: 0 },
    nowBrazil(Date.parse('2026-09-16T00:00:00.000Z'))
  );
  expect(due).toBe(true);
  expect(reminderDue({ ...item, doneAt: '2026-09-16' }, nowBrazil(Date.parse('2026-09-16T00:00:00.000Z')))).toBe(false);
  expect(reminderDue(
    { ...item, date: '2026-09-16', time: '08:00', remindMinutesBefore: 0 },
    nowBrazil(Date.parse('2026-09-16T21:00:00.000Z')),
  )).toBe(false);
  expect(reminderDue(
    { ...item, date: '2026-09-15', time: '18:00', remindMinutesBefore: 0 },
    nowBrazil(Date.parse('2026-09-16T15:00:00.000Z')),
  )).toBe(false);
});

test('balança de 7 dias não conta depósito como gasto', () => {
  const list = [
    tx({ amount: 30, type: 'earned', source: 'task_completion' }),
    tx({ amount: -20, type: 'saved', source: 'goal_deposit' }),
  ];
  const cut = txsLastDays(list, 7, Date.parse('2026-09-15T18:00:00.000Z'));
  const tot = balancaTotals(cut, 45);
  expect(tot.earned).toBe(30);
  expect(tot.spent).toBe(0);
  expect(tot.saved).toBe(20);
  expect(tot.rate).toBe(67);
});

test('ruína só com skipPenalty; Arena e Campinho não caem', () => {
  expect(BREAKABLE_LOTS.includes('arena')).toBe(false);
  expect(BREAKABLE_LOTS.includes('campinho')).toBe(false);
  expect(skipDayPenalty({ vacation: true, paused: false, punished: false, enabled: true })).toBe(true);
  expect(skipDayPenalty({ vacation: false, paused: true, punished: false, enabled: true })).toBe(true);
  expect(skipDayPenalty({ vacation: false, paused: false, punished: true, enabled: true })).toBe(true);
  expect(skipDayPenalty({ vacation: false, paused: false, punished: false, enabled: false })).toBe(true);
  expect(skipDayPenalty({ vacation: false, paused: false, punished: false, enabled: true })).toBe(false);
  const built = { fornalha: 1, bau: 1, cerca: 1, torre: 1, mesa: 1, cofre: 1, agenda: 1, mercado: 1, campinho: 1, arena: 1 };
  expect(cracksAfterClose(['arena', 'campinho'], [], built)).toEqual([]);
  expect(cracksAfterClose([], [], built)).toEqual([]);
});

test('skipPenalty: tochas não zeram no dia perdido', () => {
  const base = { due: 4, done: 1, fullDays: 5, fullDaysStart: '2026-09-10', date: '2026-09-16', skip: false };
  expect(nextFullDays({ ...base, skip: true })).toEqual({ fullDays: 5, fullDaysStart: '2026-09-10', changed: false });
  expect(nextFullDays(base).fullDays).toBe(0);
  expect(skipDayPenalty({ vacation: false, paused: false, punished: false, enabled: false })).toBe(true);
});

test('nextQuizStreak: férias não zeram a sequência', () => {
  expect(nextQuizStreak(7, false, true)).toBe(8);
  expect(nextQuizStreak(7, true, false)).toBe(8);
  expect(nextQuizStreak(7, false, false)).toBe(1);
});

test('presente de nível pendente reabre e keepDone preserva contrato feito', () => {
  expect(levelGiftPendingKey(1, 2)).toBe('pending:level:1:2');
  expect(pendingLevelGiftLevels({ [levelGiftPendingKey(1, 2)]: '2026-09-18' }, 1)).toEqual([2]);
  expect(pendingLevelGiftLevels({
    [levelGiftPendingKey(1, 2)]: '2026-09-18',
    [levelGiftClaimKey(1, 2)]: '2026-09-18',
  }, 1)).toEqual([]);
  expect(isBeforeLaunch('2026-09-17', '2026-09-18')).toBe(true);
  const done = { id: 'c1', status: 'done' as const, result: { score: 1 } };
  const built = { c2: { id: 'c2', status: 'open' as const } };
  const merged = keepDoneContracts({ c1: done as never }, built as never, ['c2']);
  expect(merged.contracts.c1.status).toBe('done');
  expect(merged.order[0]).toBe('c1');
});

void run();
