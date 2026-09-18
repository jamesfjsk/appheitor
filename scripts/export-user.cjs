// Uso: node scripts/export-user.cjs --uid <uid>
// Grava backups/<uid>-<YYYY-MM-DD>.json com os docs do uid. backups/ está no .gitignore.
const fs = require('fs');
const path = require('path');
const { connect, parseArgs, brazilToday } = require('./lib/firestore-rest.cjs');

const BY_ID = ['users', 'progress', 'village', 'englishBase', 'learning', 'health'];
const BY_USER_ID = [
  'redemptions',
  'goals',
  'challenges',
  'agenda',
  'notices',
  'dailyProgress',
  'taskCompletions',
  'goldTransactions',
  'dailyQuizzes',
  'quizBank',
  'englishPlans',
  'englishSessions',
  'userAchievements',
  'progressSnapshots',
  'xpAdjustments',
  'birthdayEvents',
  'dailySurpriseMissionStatus',
  'punishmentMode',
];
const BY_OWNER_ID = ['tasks', 'rewards', 'achievements'];
const BY_UID_FIELD = ['clientErrors'];

(async () => {
  const args = parseArgs();
  const uid = args.uid;
  if (!uid || args.uid === true) {
    console.error('uso: node scripts/export-user.cjs --uid <uid>');
    process.exit(1);
  }
  const api = await connect();
  const counts = {};
  const docs = {};
  const collections = {};

  for (const col of BY_ID) {
    const row = await api.get(`${col}/${uid}`);
    docs[col] = row ? row.data : null;
    counts[col] = row ? 1 : 0;
  }

  const settingsRows = await api.listDocs('settings');
  docs.settings = Object.fromEntries(settingsRows.map((r) => [r.id, r.data]));
  counts.settings = settingsRows.length;

  for (const col of BY_USER_ID) {
    const rows = await api.queryAll(col, 'userId', uid);
    collections[col] = rows.map((r) => ({ id: r.id, ...r.data }));
    counts[col] = rows.length;
  }

  const punishAlias = await api.queryAll('punishments', 'userId', uid);
  collections.punishments = punishAlias.map((r) => ({ id: r.id, ...r.data }));
  counts.punishments = punishAlias.length;

  for (const col of BY_OWNER_ID) {
    const rows = await api.queryAll(col, 'ownerId', uid);
    collections[col] = rows.map((r) => ({ id: r.id, ...r.data }));
    counts[col] = rows.length;
  }

  for (const col of BY_UID_FIELD) {
    const rows = await api.queryAll(col, 'uid', uid);
    collections[col] = rows.map((r) => ({ id: r.id, ...r.data }));
    counts[col] = rows.length;
  }

  const today = brazilToday();
  const dir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${uid}-${today}.json`);
  const payload = {
    uid,
    exportedAt: new Date().toISOString(),
    date: today,
    counts,
    docs,
    collections,
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  const names = Object.keys(counts).sort();
  for (const k of names) console.log(k, counts[k]);
  console.log('total', names.reduce((s, k) => s + counts[k], 0));
  console.log('gravado', path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/'));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
