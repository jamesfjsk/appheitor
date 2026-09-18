// Uso: node scripts/clone-to-test.cjs --from <uid Heitor> --to <uid teste>
// Copia pedagógico da conta real para a de teste. Nunca escreve no --from.
const { connect, parseArgs } = require('./lib/firestore-rest.cjs');

function rewriteString(s, from, to) {
  if (typeof s !== 'string') return s;
  if (s === from) return to;
  if (s.startsWith(from + '_')) return to + s.slice(from.length);
  return s;
}

function rewriteNode(node, from, to) {
  if (!node || typeof node !== 'object') return node;
  if (typeof node.stringValue === 'string') {
    node.stringValue = rewriteString(node.stringValue, from, to);
    return node;
  }
  if (node.mapValue && node.mapValue.fields) {
    for (const k of Object.keys(node.mapValue.fields)) rewriteNode(node.mapValue.fields[k], from, to);
  }
  if (node.arrayValue && node.arrayValue.values) {
    for (const item of node.arrayValue.values) rewriteNode(item, from, to);
  }
  return node;
}

function cloneFields(fields, from, to, extra) {
  const out = JSON.parse(JSON.stringify(fields || {}));
  if (extra && extra.dropEmail) delete out.email;
  for (const k of Object.keys(out)) rewriteNode(out[k], from, to);
  if (out.userId) out.userId = { stringValue: to };
  if (out.ownerId) out.ownerId = { stringValue: to };
  if (out.uid) out.uid = { stringValue: to };
  if (extra && extra.keepEmail) out.email = extra.keepEmail;
  return out;
}

function newId(to, orig) {
  return `c${to.slice(0, 8)}_${orig}`.slice(0, 1500);
}

(async () => {
  const args = parseArgs();
  const from = args.from;
  const to = args.to;
  if (!from || from === true || !to || to === true) {
    console.error('uso: node scripts/clone-to-test.cjs --from <uid Heitor> --to <uid teste>');
    process.exit(1);
  }
  if (from === to) {
    console.error('recusa: --from e --to são o mesmo uid');
    process.exit(1);
  }

  const api = await connect();
  const testChild = await api.get('settings/testChild');
  const testUid = testChild && testChild.data && testChild.data.uid;
  if (!testUid) {
    console.error('recusa: settings/testChild.uid ausente');
    process.exit(1);
  }
  if (to !== testUid) {
    console.error(`recusa: --to deve ser a conta de teste (${testUid})`);
    process.exit(1);
  }
  if (from === testUid) {
    console.error('recusa: --from é a conta de teste');
    process.exit(1);
  }

  const srcUser = await api.get(`users/${from}`);
  const destUser = await api.get(`users/${to}`);
  if (!srcUser) {
    console.error('recusa: users/' + from + ' não existe');
    process.exit(1);
  }
  if (!destUser) {
    console.error('recusa: users/' + to + ' não existe');
    process.exit(1);
  }

  const counts = {};

  const userFields = cloneFields(srcUser.fields, from, to, {
    dropEmail: true,
    keepEmail: destUser.fields.email,
  });
  await api.putFields(`users/${to}`, userFields);
  counts.users = 1;

  for (const col of ['progress', 'village', 'englishBase']) {
    const src = await api.get(`${col}/${from}`);
    if (!src) {
      counts[col] = 0;
      continue;
    }
    await api.putFields(`${col}/${to}`, cloneFields(src.fields, from, to));
    counts[col] = 1;
  }

  const wipe = [
    ['tasks', 'ownerId'],
    ['rewards', 'ownerId'],
    ['agenda', 'userId'],
    ['dailyQuizzes', 'userId'],
  ];
  for (const [col, field] of wipe) {
    const existing = await api.queryAll(col, field, to);
    await api.commitChunks(existing.map((r) => ({ delete: r.name })));
  }

  async function copyQuery(col, field, { composite, take } = {}) {
    let rows = await api.queryAll(col, field, from);
    if (take) {
      rows = rows
        .slice()
        .sort((a, b) => String((b.data && b.data.date) || b.id).localeCompare(String((a.data && a.data.date) || a.id)))
        .slice(0, take);
    }
    for (const row of rows) {
      const fields = cloneFields(row.fields, from, to);
      let id = row.id;
      if (composite && id.startsWith(from + '_')) id = to + id.slice(from.length);
      else if (!composite) id = newId(to, row.id);
      await api.putFields(`${col}/${id}`, fields);
    }
    counts[col] = rows.length;
  }

  await copyQuery('tasks', 'ownerId');
  await copyQuery('rewards', 'ownerId');
  await copyQuery('agenda', 'userId');
  await copyQuery('dailyQuizzes', 'userId', { composite: true, take: 30 });

  for (const k of Object.keys(counts).sort()) console.log(k, counts[k]);
  console.log('clone ok', from, '->', to);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
