// Uso: node scripts/archive-legacy-achievements.cjs --uid <uid> [--apply]
// Decisão 38 (22/09/2026): as conquistas antigas do Flash (coleção `achievements`, 13 docs "Flash Nível…")
// saem da Torre e do painel. Este script marca `archived: true` e `isActive: false`; NADA é apagado.
// Sem --apply é só leitura (mostra o que faria).
const { connect, parseArgs } = require('./lib/firestore-rest.cjs');

(async () => {
  const args = parseArgs();
  const uid = args.uid;
  if (!uid || typeof uid !== 'string') throw new Error('Passe --uid <uid do filho>');
  const c = await connect();
  const docs = await c.queryAll('achievements', 'ownerId', uid);
  console.log(`achievements de ${uid}: ${docs.length}`);
  let touched = 0;
  for (const doc of docs) {
    const id = doc.id;
    const d = doc.data || {};
    const already = d.archived === true && d.isActive === false;
    console.log(`${already ? '  (já)' : '  ->  '} ${id} | ${d.title} | isActive=${d.isActive} archived=${d.archived === true}`);
    if (already) continue;
    if (args.apply) {
      await c.patch(`achievements/${id}`, { archived: true, isActive: false }, ['archived', 'isActive']);
      touched += 1;
    }
  }
  console.log(args.apply ? `arquivados agora: ${touched}` : `dry-run: ${docs.filter((x) => !((x.data || {}).archived === true && (x.data || {}).isActive === false)).length} seriam arquivados (rode com --apply)`);
})().catch((e) => { console.error(e); process.exit(1); });
