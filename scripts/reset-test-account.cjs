// Uso: node scripts/reset-test-account.cjs
// Conta teste: 20 gold, nível 1, 1 ferro, vila vazia. Não é a conta do Heitor.
const fs = require('fs'); const os = require('os'); const path = require('path');
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const DOCS = 'https://firestore.googleapis.com/v1/projects/app-heitor/databases/(default)/documents';
const uid = 'DydxTQ0cGEbX46LLlQxxD123pQD3';
const v = (x) => {
  if (x === null) return { nullValue: null };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } };
};
const enc = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, v(x)])) });
(async () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: cfg.tokens.refresh_token, grant_type: 'refresh_token' }) })).json();
  const H = { Authorization: 'Bearer ' + t.access_token, 'Content-Type': 'application/json' };
  const q = async (col, field, value) => {
    const rows = await (await fetch(`${DOCS}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }) })).json();
    if (!Array.isArray(rows)) { console.log(col, 'query falhou', JSON.stringify(rows).slice(0, 180)); return []; }
    return rows.filter((r) => r.document).map((r) => r.document.name);
  };
  const del = async (col, field) => { const names = await q(col, field, uid); for (const n of names) await fetch(`https://firestore.googleapis.com/v1/${n}`, { method: 'DELETE', headers: H }); console.log(col, 'apagados:', names.length); };
  const patch = async (p, fields) => { const mask = Object.keys(fields).map((m) => `updateMask.fieldPaths=${m}`).join('&'); const r = await fetch(`${DOCS}/${p}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify(enc(fields)) }); console.log(p, r.status); };
  const now = new Date();
  const nowIso = now.toISOString();
  const npc = () => ({ points: 0, tier: 0, lastTalkDate: null, seen: [], quest: { chapter: 0, progress: 0, doneAt: null } });
  await del('taskCompletions', 'userId');
  await del('goldTransactions', 'userId');
  await del('dailyProgress', 'userId');
  await del('clientErrors', 'uid');
  await del('progressSnapshots', 'userId');
  await del('xpAdjustments', 'userId');
  await del('englishPlans', 'userId');
  await del('englishSessions', 'userId');
  await del('dailyQuizzes', 'userId');
  await del('challenges', 'userId');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  await fetch(`${DOCS}/englishPlans/${uid}_${today}`, { method: 'DELETE', headers: H });
  console.log('plano do dia', today);
  await fetch(`${DOCS}/learning/${uid}`, { method: 'DELETE', headers: H });
  console.log('learning apagado');
  for (const n of await q('tasks', 'ownerId', uid)) {
    const p = n.replace(/.*\/documents\//, '');
    await patch(p, { status: 'pending', lastCompletedDate: '', updatedAt: now });
  }
  await patch(`progress/${uid}`, {
    availableGold: 20,
    totalGoldEarned: 20,
    totalGoldSpent: 0,
    totalXP: 0,
    totalTasksCompleted: 0,
    streak: 0,
    longestStreak: 0,
    checkin: null,
    updatedAt: now,
  });
  await patch(`englishBase/${uid}`, {
    level: 1,
    materials: { madeira: 0, pedra: 0, ferro: 1, redstone: 0 },
    buildings: { fornalha: 0, bau: 0, cerca: 0, torre: 0, mesa: 0, campinho: 0, arena: 0, cofre: 0, agenda: 0, mercado: 0 },
    scaffoldStage: 0,
    noteStreak3: 0,
    vocab: {},
    contractsDone: 0,
    daysPlayed: 0,
    streakDays: 0,
    lastPlayedDate: '',
    themeRequest: null,
    updatedAt: nowIso,
  });
  await patch(`village/${uid}`, {
    characterName: 'Teste',
    onboardedAt: nowIso,
    claimed: {},
    owned: [],
    habits: {},
    fullDays: 0,
    fullDaysStart: null,
    gear: { pickaxe: 0, helmet: 0, boots: 0, lamp: 0, cape: 0 },
    rare: { diamante: 0, esmeralda: 0 },
    shield: { helmetWeek: null },
    records: {},
    decor: [],
    noticesDismissed: [],
    season: 0,
    npcs: { sabio: npc(), comerciante: npc(), ferreiro: npc(), olheiro: npc() },
    cracks: [],
    stars: [],
    trophies: {},
    plan: { date: '', order: [], focusTaskId: null },
    newItems: [],
    stats: {},
    achievementsUnlocked: {},
    newAchievements: [],
    updatedAt: nowIso,
  });
  await patch(`health/${uid}`, { lastChestDate: null });
  console.log('reset ok');
})().catch((e) => { console.error(e); process.exit(1); });
