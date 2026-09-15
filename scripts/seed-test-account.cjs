// Semeia a conta de teste (teste@flash.com) para testar a Vila: 3 missões diárias, 100 gold, 95 XP, 10 de cada material.
// Uso: node scripts/seed-test-account.cjs (usa o token do firebase-tools e o .env, como setup-test-account.cjs)
// Semeia a conta de teste para o teste de navegador da Etapa 1: 3 missões, 100 gold, 95 XP, 10 de cada material.
const fs = require('fs'); const os = require('os'); const path = require('path');
const APP = 'C:/Users/Nobody/Downloads/Samsonite/appheitor';
const env = fs.readFileSync(path.join(APP, '.env'), 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1]?.trim();
const API_KEY = get('VITE_FIREBASE_API_KEY');
const DOCS = 'https://firestore.googleapis.com/v1/projects/app-heitor/databases/(default)/documents';
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
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
  const s = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: get('TEST_CHILD_EMAIL'), password: get('TEST_CHILD_PASSWORD'), returnSecureToken: true }) })).json();
  const uid = s.localId; console.log('uid', uid);
  const adminUid = 'admin';
  const now = new Date();
  // missões existentes?
  const q = await (await fetch(`${DOCS}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'tasks' }], where: { fieldFilter: { field: { fieldPath: 'ownerId' }, op: 'EQUAL', value: { stringValue: uid } } } } }) })).json();
  const existing = q.filter((r) => r.document).length;
  console.log('missões existentes:', existing);
  if (existing === 0) {
    const tasks = [
      { title: 'Arrumar a cama', period: 'morning' },
      { title: 'Ler 15 minutos', period: 'afternoon' },
      { title: 'Guardar os brinquedos', period: 'evening' },
    ];
    for (const tk of tasks) {
      const r = await fetch(`${DOCS}/tasks`, { method: 'POST', headers: H, body: JSON.stringify(enc({ ownerId: uid, title: tk.title, description: 'Missão da conta de teste', xp: 10, gold: 5, period: tk.period, frequency: 'daily', active: true, status: 'pending', createdAt: now, updatedAt: now, createdBy: adminUid })) });
      console.log('task', tk.title, r.status);
    }
  }
  const patch = async (p, fields) => {
    const mask = Object.keys(fields).map((m) => `updateMask.fieldPaths=${m}`).join('&');
    const r = await fetch(`${DOCS}/${p}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify(enc(fields)) });
    console.log(p, r.status);
  };
  await patch(`progress/${uid}`, { availableGold: 100, totalGoldEarned: 100, totalXP: 95, updatedAt: now });
  await patch(`englishBase/${uid}`, { userId: uid, materials: { madeira: 10, pedra: 10, ferro: 10, redstone: 0 }, updatedAt: now.toISOString() });
  console.log('pronto');
})().catch((e) => { console.error(e); process.exit(1); });
