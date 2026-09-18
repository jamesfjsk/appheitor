// Token do firebase-tools (OAuth). Nunca chave de serviço no repositório.
const fs = require('fs');
const os = require('os');
const path = require('path');

const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const PROJECT = 'app-heitor';
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      out._.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 2) {
        out[a.slice(2, eq)] = a.slice(eq + 1);
        continue;
      }
      const k = a.slice(2);
      const n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) out[k] = true;
      else {
        out[k] = n;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

function brazilToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function addDays(ymd, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m) throw new Error(`data ISO inválida: ${ymd}`);
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n));
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function brazilDateOf(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    const s = String(value);
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
  }
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function findCfg() {
  const home = os.homedir();
  const cands = [
    path.join(home, '.config', 'configstore', 'firebase-tools.json'),
    path.join(home, 'AppData', 'Roaming', 'configstore', 'firebase-tools.json'),
  ];
  for (const p of cands) if (fs.existsSync(p)) return p;
  throw new Error('firebase-tools.json não encontrado; rode firebase login');
}

function v(x) {
  if (x === null) return { nullValue: null };
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') {
    if (!Number.isFinite(x)) return { nullValue: null };
    return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  }
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  if (typeof x === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(x).filter(([, y]) => y !== undefined).map(([k, y]) => [k, v(y)])) } };
  }
  return { nullValue: null };
}

function enc(o) {
  return {
    fields: Object.fromEntries(
      Object.entries(o || {})
        .filter(([, x]) => x !== undefined)
        .map(([k, x]) => [k, v(x)])
    ),
  };
}

function decodeVal(node) {
  if (!node || typeof node !== 'object') return null;
  if ('nullValue' in node) return null;
  if ('stringValue' in node) return node.stringValue;
  if ('booleanValue' in node) return node.booleanValue;
  if ('integerValue' in node) return Number(node.integerValue);
  if ('doubleValue' in node) return node.doubleValue;
  if ('timestampValue' in node) return node.timestampValue;
  if ('referenceValue' in node) return node.referenceValue;
  if ('geoPointValue' in node) return node.geoPointValue;
  if ('bytesValue' in node) return node.bytesValue;
  if ('arrayValue' in node) return (node.arrayValue.values || []).map(decodeVal);
  if ('mapValue' in node) return decodeFields(node.mapValue.fields || {});
  return null;
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([k, val]) => [k, decodeVal(val)]));
}

function decodeDoc(doc) {
  if (!doc || !doc.name) return null;
  return {
    name: doc.name,
    id: doc.name.split('/').pop(),
    data: decodeFields(doc.fields),
    fields: doc.fields || {},
  };
}

async function connect() {
  const cfg = JSON.parse(fs.readFileSync(findCfg(), 'utf8'));
  const refresh = cfg.tokens && cfg.tokens.refresh_token;
  if (!refresh) throw new Error('firebase-tools sem refresh_token; rode firebase login');
  const t = await (await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    }),
  })).json();
  if (!t.access_token) throw new Error('token: ' + JSON.stringify(t).slice(0, 240));
  const H = { Authorization: 'Bearer ' + t.access_token, 'Content-Type': 'application/json' };

  async function readJson(url, init) {
    const r = await fetch(url, init);
    const text = await r.text();
    let j = null;
    try {
      j = text ? JSON.parse(text) : null;
    } catch {
      j = { raw: text.slice(0, 200) };
    }
    return { ok: r.ok, status: r.status, body: j };
  }

  async function get(rel) {
    const { ok, status, body } = await readJson(`${DOCS}/${rel}`, { headers: H });
    if (status === 404) return null;
    if (!ok) throw new Error(`GET ${rel} ${status} ${JSON.stringify(body).slice(0, 240)}`);
    return decodeDoc(body);
  }

  async function patch(rel, obj, maskKeys) {
    const keys = maskKeys || Object.keys(obj).filter((k) => obj[k] !== undefined);
    const qs = keys.map((m) => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&');
    const url = qs ? `${DOCS}/${rel}?${qs}` : `${DOCS}/${rel}`;
    const { ok, status, body } = await readJson(url, { method: 'PATCH', headers: H, body: JSON.stringify(enc(obj)) });
    if (!ok) throw new Error(`PATCH ${rel} ${status} ${JSON.stringify(body).slice(0, 240)}`);
    return decodeDoc(body);
  }

  async function put(rel, obj) {
    const { ok, status, body } = await readJson(`${DOCS}/${rel}`, {
      method: 'PATCH',
      headers: H,
      body: JSON.stringify(enc(obj)),
    });
    if (!ok) throw new Error(`PUT ${rel} ${status} ${JSON.stringify(body).slice(0, 240)}`);
    return decodeDoc(body);
  }

  async function putFields(rel, fields) {
    const { ok, status, body } = await readJson(`${DOCS}/${rel}`, {
      method: 'PATCH',
      headers: H,
      body: JSON.stringify({ fields: fields || {} }),
    });
    if (!ok) throw new Error(`PUT ${rel} ${status} ${JSON.stringify(body).slice(0, 240)}`);
    return decodeDoc(body);
  }

  async function create(col, obj) {
    const { ok, status, body } = await readJson(`${DOCS}/${col}`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify(enc(obj)),
    });
    if (!ok) throw new Error(`POST ${col} ${status} ${JSON.stringify(body).slice(0, 240)}`);
    return decodeDoc(body);
  }

  async function del(nameOrRel) {
    const url = nameOrRel.startsWith('projects/') ? `https://firestore.googleapis.com/v1/${nameOrRel}` : `${DOCS}/${nameOrRel}`;
    const { ok, status, body } = await readJson(url, { method: 'DELETE', headers: H });
    if (status === 404) return false;
    if (!ok) throw new Error(`DELETE ${nameOrRel} ${status} ${JSON.stringify(body).slice(0, 240)}`);
    return true;
  }

  async function runQuery(structuredQuery) {
    const { ok, body } = await readJson(`${DOCS}:runQuery`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ structuredQuery }),
    });
    if (!ok || !Array.isArray(body)) return body;
    return body;
  }

  async function queryAll(col, field, value) {
    const filter = {
      fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: String(value) } },
    };
    const out = [];
    let cursor = null;
    for (;;) {
      const structuredQuery = {
        from: [{ collectionId: col }],
        where: filter,
        orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
        limit: 300,
      };
      if (cursor) structuredQuery.startAt = { values: [{ referenceValue: cursor }], before: false };
      const rows = await runQuery(structuredQuery);
      if (!Array.isArray(rows)) {
        if (cursor) break;
        const simple = await runQuery({ from: [{ collectionId: col }], where: filter });
        if (!Array.isArray(simple)) {
          console.warn(col, 'query falhou', JSON.stringify(rows).slice(0, 180));
          return [];
        }
        return simple.filter((r) => r.document).map((r) => decodeDoc(r.document));
      }
      const docs = rows.filter((r) => r.document).map((r) => decodeDoc(r.document));
      out.push(...docs);
      if (docs.length < 300) break;
      cursor = docs[docs.length - 1].name;
    }
    return out;
  }

  async function listDocs(col) {
    const out = [];
    let pageToken = '';
    do {
      const url = `${DOCS}/${col}?pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
      const { ok, body } = await readJson(url, { headers: H });
      if (!ok) {
        console.warn(col, 'list falhou', JSON.stringify(body).slice(0, 180));
        break;
      }
      for (const d of body.documents || []) out.push(decodeDoc(d));
      pageToken = body.nextPageToken || '';
    } while (pageToken);
    return out;
  }

  async function commit(writes) {
    const { ok, status, body } = await readJson(`${DOCS}:commit`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ writes }),
    });
    if (!ok) throw new Error(`commit ${status} ${JSON.stringify(body).slice(0, 240)}`);
    return body;
  }

  async function commitChunks(writes, size = 400) {
    if (!writes.length) return;
    for (let i = 0; i < writes.length; i += size) {
      await commit(writes.slice(i, i + size));
    }
  }

  return {
    H,
    get,
    patch,
    put,
    putFields,
    create,
    del,
    queryAll,
    listDocs,
    runQuery,
    commit,
    commitChunks,
    decodeDoc,
  };
}

module.exports = {
  PROJECT,
  DOCS,
  parseArgs,
  brazilToday,
  addDays,
  brazilDateOf,
  enc,
  v,
  decodeFields,
  decodeDoc,
  connect,
};
