// Apaga dados da conta de teste e zera o progresso. Não mexe na conta do Heitor.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: cfg.tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('sem token admin');
  return j.access_token;
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

async function runQuery(tok, collectionId, uid) {
  const r = await fetch(`${DOCS}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'userId' },
            op: 'EQUAL',
            value: { stringValue: uid },
          },
        },
      },
    }),
  });
  const rows = await r.json();
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => row.document?.name).filter(Boolean);
}

(async () => {
  const s = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  });
  const sj = await s.json();
  if (!sj.localId) {
    console.log('login falhou', JSON.stringify(sj).slice(0, 200));
    process.exit(1);
  }
  const uid = sj.localId;
  if (EMAIL !== 'teste@flash.com') {
    console.error('recusa: o script só limpa teste@flash.com');
    process.exit(1);
  }
  const tok = await adminToken();
  const H = { Authorization: `Bearer ${tok}` };
  const del = async (name) => {
    const r = await fetch(`https://firestore.googleapis.com/v1/${name}`, { method: 'DELETE', headers: H });
    console.log('del', name.split('/').slice(-2).join('/'), r.status);
  };

  for (const col of ['englishPlans', 'englishSessions', 'taskCompletions', 'goldTransactions', 'dailyQuizzes', 'dailyProgress']) {
    const names = await runQuery(tok, col, uid);
    for (const name of names) await del(name);
  }

  for (const p of [`englishBase/${uid}`, `village/${uid}`]) {
    const r = await fetch(`${DOCS}/${p}`, { method: 'DELETE', headers: H });
    console.log('del', p, r.status);
  }

  const now = new Date();
  const put = async (p, fields) => {
    const r = await fetch(`${DOCS}/${p}`, {
      method: 'PATCH',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, x]) => [k, v(x)])) }),
    });
    console.log('put', p, r.status);
  };
  await put(`progress/${uid}`, {
    userId: uid,
    level: 1,
    totalXP: 0,
    availableGold: 0,
    totalGoldEarned: 0,
    totalGoldSpent: 0,
    streak: 0,
    longestStreak: 0,
    rewardsRedeemed: 0,
    totalTasksCompleted: 0,
    lastActivityDate: now,
    updatedAt: now,
    quizEnabled: true,
    quizRequired: false,
  });
  console.log('limpo', uid);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
