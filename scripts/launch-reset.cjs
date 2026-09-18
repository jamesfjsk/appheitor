// Uso: node scripts/launch-reset.cjs --uid <uid> [--gold 100] [--launch 2026-09-20] [--confirm "LANCAR <vila>"] [--apply]
// Sem --apply é dry-run. Com --apply exige backup do dia e --confirm.
const fs = require('fs');
const path = require('path');
const { connect, parseArgs, brazilToday, addDays, brazilDateOf, enc } = require('./lib/firestore-rest.cjs');

function npc() {
  return { points: 0, tier: 0, lastTalkDate: null, seen: [], quest: { chapter: 0, progress: 0, doneAt: null } };
}

function villageReset({ uid, name, characterName, createdAt, launch, nowIso }) {
  return {
    userId: uid,
    createdAt: createdAt || nowIso,
    updatedAt: nowIso,
    name,
    characterName,
    onboardedAt: null,
    launchedOn: launch,
    rare: { diamante: 0, esmeralda: 0 },
    gear: { pickaxe: 0, helmet: 0, boots: 0, lamp: 0, cape: 0 },
    character: {
      skin: 'skin_1',
      hair: 'hair_1',
      shirt: 'shirt_1',
      pants: 'pants_1',
      hat: null,
      cape: null,
      pet: null,
    },
    owned: [],
    claimed: {},
    shield: { helmetWeek: null },
    fullDays: 0,
    fullDaysStart: null,
    records: {},
    decor: [],
    noticesDismissed: [],
    habits: {},
    season: 1,
    npcs: { sabio: npc(), comerciante: npc(), ferreiro: npc(), olheiro: npc() },
    cracks: [],
    stars: [],
    trophies: {},
    plan: { date: '', order: [], focusTaskId: null },
    newItems: [],
    stats: {},
    achievementsUnlocked: {},
    newAchievements: [],
  };
}

function isLaunchGift(row, launch) {
  const meta = row.data && row.data.metadata;
  if (!meta || meta.launch !== true) return false;
  if (!launch) return true;
  const day = brazilDateOf(row.data.createdAt);
  return !day || day === launch;
}

(async () => {
  const args = parseArgs();
  const uid = args.uid;
  if (!uid || args.uid === true) {
    console.error('uso: node scripts/launch-reset.cjs --uid <uid> [--gold 100] [--launch 2026-09-20] [--confirm "LANCAR <vila>"] [--apply]');
    process.exit(1);
  }
  const gold = args.gold === true || args.gold == null ? 100 : Number(args.gold);
  if (!Number.isFinite(gold) || gold < 0) {
    console.error('--gold inválido');
    process.exit(1);
  }
  const launch = args.launch === true || !args.launch ? '2026-09-20' : String(args.launch);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(launch)) {
    console.error('--launch deve ser YYYY-MM-DD');
    process.exit(1);
  }
  const apply = args.apply === true;
  const confirm = args.confirm === true ? '' : String(args.confirm || '');
  const api = await connect();

  const user = await api.get(`users/${uid}`);
  const progress = await api.get(`progress/${uid}`);
  const village = await api.get(`village/${uid}`);
  const base = await api.get(`englishBase/${uid}`);
  const health = await api.get(`health/${uid}`);
  const learning = await api.get(`learning/${uid}`);
  const dailyRules = await api.get('settings/dailyRules');

  const villageName = (village && village.data && village.data.name) || '';
  const characterName = (village && village.data && village.data.characterName) || '';
  const email = (user && user.data && user.data.email) || '';
  const expectedConfirm = `LANCAR ${villageName}`;

  const [
    goals,
    challenges,
    redemptions,
    notices,
    surprise,
    userAchs,
    clientErrors,
    punishmentMode,
    punishments,
    achievements,
    tasks,
    goldTxs,
    birthday,
  ] = await Promise.all([
    api.queryAll('goals', 'userId', uid),
    api.queryAll('challenges', 'userId', uid),
    api.queryAll('redemptions', 'userId', uid),
    api.queryAll('notices', 'userId', uid),
    api.queryAll('dailySurpriseMissionStatus', 'userId', uid),
    api.queryAll('userAchievements', 'userId', uid),
    api.queryAll('clientErrors', 'uid', uid),
    api.queryAll('punishmentMode', 'userId', uid),
    api.queryAll('punishments', 'userId', uid),
    api.queryAll('achievements', 'ownerId', uid),
    api.queryAll('tasks', 'ownerId', uid),
    api.queryAll('goldTransactions', 'userId', uid),
    api.queryAll('birthdayEvents', 'userId', uid),
  ]);

  const pendingRedemptions = redemptions.filter((r) => (r.data.status || 'pending') === 'pending');
  const activePunish = [...punishmentMode, ...punishments].filter((r) => r.data.isActive !== false);
  const activeAchs = achievements.filter((r) => r.data.isActive !== false);
  const doneTasks = tasks.filter((r) => r.data.status && r.data.status !== 'pending');
  const launchGifts = goldTxs.filter((r) => isLaunchGift(r, launch));
  const already = launchGifts.length > 0;
  const vocab = (base && base.data && base.data.vocab) || {};
  const vocabKeys = vocab && typeof vocab === 'object' ? Object.keys(vocab).length : 0;
  const keepLevel = (base && base.data && Number(base.data.level)) || 1;
  const oldGold = (progress && progress.data && Number(progress.data.availableGold)) || 0;
  const yesterday = addDays(launch, -1);
  const today = brazilToday();
  const backupRel = `backups/${uid}-${today}.json`;
  const backupPath = path.join(__dirname, '..', backupRel);
  const backupOk = fs.existsSync(backupPath);

  console.log('uid', uid);
  console.log('email', email || '(sem e-mail)');
  console.log('vila', villageName || '(sem nome)');
  console.log('personagem', characterName || '(sem personagem)');
  console.log('lançamento', launch);
  console.log('gold presente', gold);
  console.log('já lançado', already ? `sim (${launchGifts.length} linha(s) metadata.launch)` : 'não');
  console.log('backup do dia', backupOk ? backupRel : `FALTA ${backupRel}`);
  console.log('antes:');
  console.log('  gold', oldGold);
  console.log('  xp', (progress && progress.data && progress.data.totalXP) || 0);
  console.log('  level', (progress && progress.data && progress.data.level) || 1);
  console.log('  season', (village && village.data && village.data.season) || 0);
  console.log('  onboardedAt', (village && village.data && village.data.onboardedAt) || null);
  console.log('  launchedOn', (village && village.data && village.data.launchedOn) || null);
  console.log('  englishBase.level', keepLevel, 'vocab', vocabKeys);
  console.log('  tasks', tasks.length, 'não-pending', doneTasks.length);
  console.log('  achievements', achievements.length, 'ativas', activeAchs.length);
  console.log('  goals', goals.length, 'challenges', challenges.length);
  console.log('  redemptions pendentes', pendingRedemptions.length);
  console.log('  notices', notices.length);
  console.log('  userAchievements', userAchs.length);
  console.log('  goldTransactions', goldTxs.length);
  console.log('  punishment ativas', activePunish.length);
  console.log('  dailyRules.activatedOn', (dailyRules && dailyRules.data && dailyRules.data.activatedOn) || null);

  if (already) {
    console.log('faria: nada (idempotente: linha de lançamento já existe)');
    process.exit(0);
  }

  console.log('faria:');
  console.log(`  progress: XP 0, level 1, streak 0, gold ${gold}, quizRequired true, lastDailySummaryProcessedDay ${yesterday}`);
  console.log(`  village: initial + season 1 + onboardedAt null + launchedOn ${launch}; name/characterName preservados`);
  console.log(`  englishBase: initial, preserva level ${keepLevel} e vocab (${vocabKeys} chaves)`);
  console.log(`  apaga: goals ${goals.length}, challenges ${challenges.length}, redemptions pendentes ${pendingRedemptions.length}, notices ${notices.length}, learning ${learning ? 1 : 0}, dailySurpriseMissionStatus ${surprise.length}, userAchievements ${userAchs.length}, clientErrors ${clientErrors.length}, punishments ativas ${activePunish.length}`);
  console.log(`  achievements isActive false: ${achievements.length}`);
  console.log(`  tasks status pending, sem lastCompletedDate: ${tasks.length}`);
  console.log('  health zerado');
  console.log('  birthdayEvents 2026 marcado concluído');
  console.log(`  settings/dailyRules.activatedOn = ${launch} (doc da família)`);
  console.log(`  goldTransactions: +${gold} type adjustment source admin_adjustment metadata.launch`);

  if (!apply) {
    console.log('dry-run: nada gravado. para aplicar: --apply --confirm "LANCAR ' + (villageName || '<nome da vila>') + '"');
    process.exit(0);
  }

  if (!backupOk) {
    console.log(`recusa: rode primeiro node scripts/export-user.cjs --uid ${uid}`);
    process.exit(1);
  }
  if (confirm !== expectedConfirm) {
    console.log(`recusa: --confirm deve ser exatamente "${expectedConfirm}"`);
    process.exit(1);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const writes = [];

  const delNames = [
    ...goals,
    ...challenges,
    ...pendingRedemptions,
    ...notices,
    ...surprise,
    ...userAchs,
    ...clientErrors,
    ...activePunish,
  ];
  if (learning) delNames.push(learning);
  for (const row of delNames) writes.push({ delete: row.name });

  for (const row of achievements) {
    writes.push({
      update: {
        name: row.name,
        fields: enc({ isActive: false, updatedAt: now }).fields,
      },
      updateMask: { fieldPaths: ['isActive', 'updatedAt'] },
    });
  }

  for (const row of tasks) {
    writes.push({
      update: {
        name: row.name,
        fields: enc({ status: 'pending', updatedAt: now }).fields,
      },
      updateMask: { fieldPaths: ['status', 'lastCompletedDate', 'updatedAt'] },
    });
  }

  await api.commitChunks(writes);

  const progressBody = {
    ...(progress && progress.data ? progress.data : {}),
    userId: uid,
    totalXP: 0,
    level: 1,
    streak: 0,
    longestStreak: 0,
    totalTasksCompleted: 0,
    totalGoldSpent: 0,
    totalGoldEarned: gold,
    availableGold: gold,
    quizRequired: true,
    lastDailySummaryProcessedDay: yesterday,
    checkin: null,
    rewardsRedeemed: 0,
    updatedAt: now,
    lastActivityDate: now,
  };
  delete progressBody.lastDailySummaryProcessedDate;
  await api.put(`progress/${uid}`, progressBody);

  const createdAt = (village && village.data && village.data.createdAt) || nowIso;
  await api.put(
    `village/${uid}`,
    villageReset({
      uid,
      name: villageName || 'Vila do Heitor',
      characterName: characterName || 'Heitor',
      createdAt,
      launch,
      nowIso,
    })
  );

  await api.put(`englishBase/${uid}`, {
    userId: uid,
    level: keepLevel,
    materials: { madeira: 0, pedra: 0, ferro: 1, redstone: 0 },
    buildings: {
      fornalha: 0,
      bau: 0,
      cerca: 0,
      torre: 0,
      mesa: 0,
      campinho: 0,
      arena: 0,
      cofre: 0,
      agenda: 0,
      mercado: 0,
    },
    scaffoldStage: 0,
    noteStreak3: 0,
    vocab,
    contractsDone: 0,
    daysPlayed: 0,
    streakDays: 0,
    lastPlayedDate: '',
    themeRequest: null,
    updatedAt: nowIso,
  });

  await api.put(`health/${uid}`, {
    lastCloseDay: null,
    lastQuizGenerated: null,
    lastPlanGenerated: null,
    lastChestDate: null,
    lastInterestWeek: null,
    lastLearningWeek: null,
    clockDriftMs: null,
    updatedAt: nowIso,
  });

  const bdayId = `${uid}_2026`;
  const existingBday = birthday.find((r) => r.id === bdayId);
  await api.put(`birthdayEvents/${bdayId}`, {
    ...(existingBday && existingBday.data ? existingBday.data : {}),
    userId: uid,
    year: 2026,
    celebrationCompleted: true,
    celebrationCompletedAt: nowIso,
    updatedAt: nowIso,
    createdAt: (existingBday && existingBday.data && existingBday.data.createdAt) || nowIso,
  });

  if (dailyRules) {
    await api.patch('settings/dailyRules', { activatedOn: launch, updatedAt: nowIso }, ['activatedOn', 'updatedAt']);
  } else {
    await api.patch('settings/dailyRules', { activatedOn: launch, updatedAt: nowIso }, ['activatedOn', 'updatedAt']);
  }

  await api.create('goldTransactions', {
    userId: uid,
    amount: gold,
    type: 'adjustment',
    source: 'admin_adjustment',
    reason: 'admin_adjustment',
    description: 'Lançamento Miner Missions: presente de lançamento',
    metadata: { launch: true },
    balanceBefore: oldGold,
    balanceAfter: gold,
    createdAt: now,
    createdBy: 'launch-reset',
  });

  console.log('apply ok');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
