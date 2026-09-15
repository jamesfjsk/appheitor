// Prepara a conta de teste para o aceite D1 / D1b / D2 / D4.
// Uso: node scripts/patch-test-d1d4.cjs <quizlock|quizunlock|d1|punish-on|punish-off|agenda>
const fs = require('fs'); const os = require('os'); const path = require('path');
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const DOCS = 'https://firestore.googleapis.com/v1/projects/app-heitor/databases/(default)/documents';
const uid = 'DydxTQ0cGEbX46LLlQxxD123pQD3';
const FAMILY_ID = 'heitor';
const cmd = process.argv[2] || '';

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

function todayBR() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

(async () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: cfg.tokens.refresh_token, grant_type: 'refresh_token' }) })).json();
  if (!t.access_token) throw new Error('token: ' + JSON.stringify(t));
  const H = { Authorization: 'Bearer ' + t.access_token, 'Content-Type': 'application/json' };
  const patch = async (p, fields) => {
    const mask = Object.keys(fields).map((m) => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&');
    const r = await fetch(`${DOCS}/${p}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify(enc(fields)) });
    const body = r.status >= 400 ? await r.text() : '';
    console.log('patch', p, r.status, body.slice(0, 180));
  };
  const create = async (col, fields) => {
    const r = await fetch(`${DOCS}/${col}`, { method: 'POST', headers: H, body: JSON.stringify(enc(fields)) });
    const j = await r.json();
    if (r.status >= 400) console.log('create', col, r.status, JSON.stringify(j).slice(0, 240));
    else console.log('create', col, r.status, (j.name || '').split('/').pop());
    return j;
  };
  const q = async (col, field, value) => (await (await fetch(`${DOCS}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } } } }) })).json()).filter((r) => r.document).map((r) => r.document);
  const delNames = async (names) => {
    for (const n of names) await fetch(`https://firestore.googleapis.com/v1/${n}`, { method: 'DELETE', headers: H });
  };

  const today = todayBR();
  const yesterday = addDays(today, -1);
  const now = new Date();

  if (cmd === 'quizlock') {
    await patch(`progress/${uid}`, { quizEnabled: true, quizRequired: true, quizQuestionCount: 3, updatedAt: now });
    console.log('quizlock', today);
    return;
  }
  if (cmd === 'quizunlock') {
    await patch(`progress/${uid}`, { quizEnabled: true, quizRequired: false, updatedAt: now });
    console.log('quizunlock');
    return;
  }
  if (cmd === 'd1') {
    await patch(`village/${uid}`, { cracks: ['fornalha'], updatedAt: now.toISOString() });
    await patch(`dailyProgress/${uid}_${yesterday}`, {
      userId: uid,
      date: yesterday,
      summaryProcessed: true,
      goldPenalty: 20,
      totalTasksAvailable: 3,
      tasksCompleted: 2,
      xpEarned: 0,
      goldEarned: 0,
      allTasksBonusGold: 0,
      vacation: false,
      paused: false,
      punished: false,
      updatedAt: now,
    });
    console.log('d1', { today, yesterday });
    return;
  }
  if (cmd === 'punish-on') {
    const existing = await q('punishmentMode', 'userId', uid);
    for (const doc of existing) {
      const p = doc.name.replace(/.*\/documents\//, '');
      await patch(p, { isActive: false, deactivatedReason: 'replaced_by_new', updatedAt: now });
    }
    const end = new Date(now.getTime() + 7 * 86400000);
    await create('punishmentMode', {
      userId: uid,
      isActive: true,
      startDate: now,
      endDate: end,
      tasksCompleted: 0,
      tasksRequired: 30,
      activatedBy: 'admin',
      reason: 'Aceite D2',
      createdAt: now,
      updatedAt: now,
    });
    console.log('punish-on');
    return;
  }
  if (cmd === 'punish-off') {
    const existing = await q('punishmentMode', 'userId', uid);
    for (const doc of existing) {
      const p = doc.name.replace(/.*\/documents\//, '');
      await patch(p, { isActive: false, deactivatedReason: 'admin_override', updatedAt: now });
    }
    console.log('punish-off', existing.length);
    return;
  }
  if (cmd === 'wipe-agenda') {
    const docs = await q('agenda', 'userId', uid);
    await delNames(docs.map((d) => d.name));
    console.log('wipe-agenda', docs.length);
    return;
  }
  if (cmd === 'agenda') {
    const docs = await q('agenda', 'userId', uid);
    await delNames(docs.map((d) => d.name));
    await create('agenda', {
      userId: uid,
      familyId: FAMILY_ID,
      title: 'Aceite D4',
      kind: 'outro',
      date: today,
      time: '19:00',
      remindMinutesBefore: 0,
      repeat: 'none',
      createdBy: 'admin',
      plannedAheadDays: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    console.log('agenda', today);
    return;
  }
  console.error('comando:', 'quizlock|quizunlock|d1|punish-on|punish-off|agenda');
  process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
