// Prepara a conta de teste para o aceite do Lote 1: Cofre 2, Mercado, Agenda e Fornalha/Armazém.
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
  const patch = async (p, fields) => {
    const mask = Object.keys(fields).map((m) => `updateMask.fieldPaths=${m}`).join('&');
    const r = await fetch(`${DOCS}/${p}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify(enc(fields)) });
    console.log(p, r.status);
  };
  const now = new Date();
  await patch(`englishBase/${uid}`, {
    buildings: { fornalha: 1, bau: 1, cofre: 2, mercado: 1, agenda: 1, cerca: 0, torre: 0, mesa: 0, campinho: 0 },
    updatedAt: now.toISOString(),
  });
  await patch(`village/${uid}`, { onboardedAt: now.toISOString(), updatedAt: now.toISOString() });
  console.log('patch etapa2 ok');
})().catch((e) => { console.error(e); process.exit(1); });
