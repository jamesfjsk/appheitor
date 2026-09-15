// Uso: node scripts/reset-test-account.cjs (apaga conclusões, transações, dailyProgress e erros da conta de teste e volta ao estado semeado)
// Reset da conta de teste para um estado limpo e conhecido (admin via REST).
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
  const q = async (col, field, value) => (await (await fetch(`${DOCS}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }) })).json()).filter((r) => r.document).map((r) => r.document.name);
  const del = async (col, field) => { const names = await q(col, field, uid); for (const n of names) await fetch(`https://firestore.googleapis.com/v1/${n}`, { method: 'DELETE', headers: H }); console.log(col, 'apagados:', names.length); };
  const patch = async (p, fields) => { const mask = Object.keys(fields).map((m) => `updateMask.fieldPaths=${m}`).join('&'); const r = await fetch(`${DOCS}/${p}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify(enc(fields)) }); console.log(p, r.status); };
  const now = new Date();
  await del('taskCompletions', 'userId');
  await del('goldTransactions', 'userId');
  await del('dailyProgress', 'userId');
  await del('clientErrors', 'uid');
  await del('progressSnapshots', 'userId');
  await del('xpAdjustments', 'userId');
  for (const n of await q('tasks', 'ownerId', uid)) {
    const p = n.replace(/.*\/documents\//, '');
    await patch(p, { status: 'pending', lastCompletedDate: '', updatedAt: now });
  }
  await patch(`progress/${uid}`, { availableGold: 100, totalGoldEarned: 100, totalGoldSpent: 0, totalXP: 95, totalTasksCompleted: 0, streak: 0, longestStreak: 0, updatedAt: now });
  await patch(`englishBase/${uid}`, { materials: { madeira: 10, pedra: 10, ferro: 10, redstone: 0 }, buildings: {}, updatedAt: now.toISOString() });
  await patch(`village/${uid}`, { claimed: {}, owned: [], habits: {}, fullDays: 0, fullDaysStart: null, gear: { pickaxe: 0, helmet: 0, boots: 0, lamp: 0, cape: 0 }, rare: { diamante: 0, esmeralda: 0 }, updatedAt: now.toISOString() });
  await patch(`health/${uid}`, { lastChestDate: null });
  console.log('reset ok');
})().catch((e) => { console.error(e); process.exit(1); });
