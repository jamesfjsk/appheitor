// Prepara a conta de teste (teste@flash.com): descobre o uid pelo login por senha (REST do Firebase Auth),
// cria users/{uid} (role child), progress/{uid} inicial e settings/testChild = { uid }. Usa o token do firebase-tools.
const fs = require('fs');
const os = require('os');
const path = require('path');

const APP = 'C:/Users/Nobody/Downloads/Samsonite/appheitor';
const env = fs.readFileSync(path.join(APP, '.env'), 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1]?.trim();
const API_KEY = get('VITE_FIREBASE_API_KEY');
const EMAIL = get('TEST_CHILD_EMAIL') || 'teste@flash.com';
const PASSWORD = get('TEST_CHILD_PASSWORD') || 'teste123';
const PROJECT = 'app-heitor';
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

async function adminToken() {
  const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: cfg.tokens.refresh_token, grant_type: 'refresh_token' }) });
  const j = await r.json(); if (!j.access_token) throw new Error('sem token admin'); return j.access_token;
}
const v = (x) => {
  if (x === null) return { nullValue: null };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } };
};

(async () => {
  // 1. uid pelo login por senha
  const s = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }) });
  const sj = await s.json();
  if (!sj.localId) { console.log('login falhou', s.status, JSON.stringify(sj).slice(0, 200)); process.exit(1); }
  const uid = sj.localId;
  console.log('uid da conta de teste:', uid);

  const tok = await adminToken();
  const H = { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
  const now = new Date();
  const put = async (p, fields, mask) => {
    const url = `${DOCS}/${p}` + (mask ? '?' + mask.map((m) => `updateMask.fieldPaths=${m}`).join('&') : '');
    const r = await fetch(url, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, x]) => [k, v(x)])) }) });
    console.log(p, r.status);
  };
  // 2. users/{uid}
  const exists = await fetch(`${DOCS}/users/${uid}`, { headers: H });
  if (exists.status === 404) {
    await put(`users/${uid}`, { userId: uid, email: EMAIL, displayName: 'Conta de teste', role: 'child', createdAt: now, updatedAt: now, lastLoginTimestamp: now });
  } else {
    await put(`users/${uid}`, { role: 'child', displayName: 'Conta de teste' }, ['role', 'displayName']);
  }
  // 3. progress/{uid} inicial (só se não existir)
  const pe = await fetch(`${DOCS}/progress/${uid}`, { headers: H });
  if (pe.status === 404) {
    await put(`progress/${uid}`, { userId: uid, level: 1, totalXP: 0, availableGold: 0, totalGoldEarned: 0, totalGoldSpent: 0, streak: 0, longestStreak: 0, rewardsRedeemed: 0, totalTasksCompleted: 0, lastActivityDate: now, updatedAt: now, quizEnabled: true, quizRequired: false });
  } else console.log('progress já existe');
  // 4. settings/testChild
  await put('settings/testChild', { uid, email: EMAIL, updatedAt: now });
  console.log('pronto');
})().catch((e) => { console.error(e.message); process.exit(1); });
