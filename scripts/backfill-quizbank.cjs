// Retroativo do quizBank a partir dos dailyQuizzes já concluídos.
// Uso: node scripts/backfill-quizbank.cjs --uid <uid> [--apply]
// Sem --apply só conta. Idempotente pelo id. Não atualiza doc que já existe
// (a regra publicada só deixa mexer em reviewedOk/reviewedOn).
// Prova em aberto (respostas gravadas, ainda sem completed) fica para o
// completeDailyQuiz, que cria o doc com o tempo de verdade.
const { connect, parseArgs } = require('./lib/firestore-rest.cjs');

function normalizeQuestion(q) {
  return String(q || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function bankRow(uid, date, n, theme, q, chosen) {
  const answer = typeof q.answer === 'string' ? q.answer : '';
  const kind = q.kind === 'dilemma' || q.kind === 'lesson' || q.kind === 'knowledge' || q.kind === 'review'
    ? q.kind
    : 'knowledge';
  const correct = chosen === answer;
  const depth = theme && (theme.depth === 2 || theme.depth === 3) ? theme.depth : 1;
  const bloom = q.bloom === 'entender' || q.bloom === 'aplicar' || q.bloom === 'analisar' ? q.bloom : 'entender';
  const row = {
    userId: uid,
    familyId: 'heitor',
    date,
    n,
    themeId: (theme && theme.id) || '',
    category: (theme && theme.category) || 'tema',
    subject: q.subject || (kind === 'lesson' || kind === 'dilemma' ? 'tema' : 'geral'),
    kind,
    skill: q.skill || '',
    bloom,
    depth,
    question: q.question,
    options: Array.isArray(q.options) ? q.options : [],
    answer,
    why: q.why || q.explanation || '',
    trap: q.trap || '',
    hash: normalizeQuestion(q.question),
    chosen,
    correct,
    attempts: 1,
    createdAt: new Date(),
  };
  if (q.difficulty === 1 || q.difficulty === 2 || q.difficulty === 3) row.difficulty = q.difficulty;
  if (kind !== 'dilemma') row.supportLevel = correct ? 0 : 3;
  return row;
}

(async () => {
  const args = parseArgs();
  const uid = args.uid;
  if (!uid || uid === true) {
    console.error('uso: node scripts/backfill-quizbank.cjs --uid <uid> [--apply]');
    process.exit(1);
  }
  const apply = args.apply === true || args.apply === 'true';
  const api = await connect();
  const quizzes = await api.queryAll('dailyQuizzes', 'userId', uid);
  let created = 0;
  let existed = 0;
  let skippedOpen = 0;
  let skippedEmpty = 0;
  const pending = [];

  for (const doc of quizzes) {
    const data = doc.data || {};
    const questions = data.questions;
    const answers = data.answers;
    const date = String(data.date || '');
    if (!Array.isArray(questions) || !questions.length || !Array.isArray(answers) || !date) {
      skippedEmpty += 1;
      continue;
    }
    if (data.completed !== true) {
      skippedOpen += 1;
      continue;
    }
    const n = Math.min(questions.length, answers.length);
    for (let i = 0; i < n; i++) {
      const q = questions[i];
      if (!q || typeof q.question !== 'string' || !q.question.trim()) continue;
      const id = `${uid}_${date}_${i + 1}`;
      const existing = await api.get(`quizBank/${id}`);
      if (existing) {
        existed += 1;
        continue;
      }
      created += 1;
      if (apply) {
        pending.push({
          id,
          row: bankRow(uid, date, i + 1, data.theme, q, typeof answers[i] === 'string' ? answers[i] : ''),
        });
      }
    }
  }

  if (apply) {
    for (const item of pending) {
      await api.put(`quizBank/${item.id}`, item.row);
    }
  }

  console.log(`backfill quizBank uid=${uid} apply=${apply}`);
  console.log(`provas lidas: ${quizzes.length}`);
  console.log(`criados: ${created}${apply ? '' : ' (simulação, nada gravado)'}`);
  console.log(`já existiam: ${existed}`);
  console.log(`sem questions+answers: ${skippedEmpty}`);
  console.log(`em aberto (respostas sem fechar): ${skippedOpen}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
