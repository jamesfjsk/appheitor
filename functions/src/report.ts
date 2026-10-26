// Resumo do dia no Telegram do pai (26/10/2026). De 13 a 20/10 ele quase não abriu o jogo e ninguém viu;
// agora o pai recebe às 20h o dia inteiro (prova, missões, Mina, xadrez, conversa, gold e o que espera por ele)
// e às 17h, só se a prova ainda não saiu, um aviso curto. "resumo" no Telegram pede o de agora.
import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { nowBrazil } from './clock';
import { REGION, TELEGRAM_BOT_TOKEN, childName, readLink, tg } from './telegramApi';

const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const CONTRACT: Record<string, string> = { note: 'Recado', merchant: 'Comerciante', letter: 'Carta', forge: 'Ferraria' };

type Row = Record<string, unknown>;
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

async function rowsOf(col: string, uid: string, date: string): Promise<Row[]> {
  const snap = await getFirestore().collection(col).where('userId', '==', uid).where('date', '==', date).get();
  return snap.docs.map((d) => d.data());
}

/** O texto do resumo de um dia. */
export async function dailyReportText(uid: string, date: string): Promise<{ text: string; quizDone: boolean; quizOpened: boolean }> {
  const db = getFirestore();
  const name = await childName(uid);
  const [d, m] = [date.slice(8, 10), date.slice(5, 7)];
  const wd = WEEKDAY[new Date(`${date}T12:00:00Z`).getUTCDay()];
  const lines: string[] = [`Resumo de ${name}, ${wd} ${d}/${m}`];

  const quiz = (await db.doc(`dailyQuizzes/${uid}_${date}`).get()).data();
  const total = Array.isArray(quiz?.questions) ? quiz!.questions.length : 0;
  const quizDone = Boolean(quiz?.completed);
  const quizOpened = Array.isArray(quiz?.answers) && quiz!.answers.length > 0;
  if (quizDone) lines.push(`Prova: feita, ${num(quiz?.score)} de ${total} certas.`);
  else if (quizOpened) lines.push(`Prova: começou e parou na pergunta ${(quiz?.answers as unknown[]).length + 1} de ${total}.`);
  else lines.push('Prova: ainda não fez. (A Mina só abre depois dela.)');

  const tasks = await rowsOf('taskCompletions', uid, date);
  const titles = [...new Set(tasks.map((t) => String(t.taskTitle ?? '')).filter(Boolean))];
  lines.push(tasks.length ? `Missões: ${tasks.length} feitas (${titles.slice(0, 4).join(', ')}${titles.length > 4 ? '...' : ''}).` : 'Missões: nenhuma ainda.');

  const plan = (await db.doc(`englishPlans/${uid}_${date}`).get()).data();
  const contracts = plan?.contracts && typeof plan.contracts === 'object' ? Object.values(plan.contracts as Record<string, Row>) : [];
  const done = contracts.filter((c) => c.status === 'done');
  if (done.length) {
    const parts = done.map((c) => {
      const r = c.result as Row | undefined;
      return `${CONTRACT[String(c.type)] ?? c.type}${r && r.max ? ` ${num(r.score)}/${num(r.max)}` : ''}`;
    });
    lines.push(`Mina (inglês): ${parts.join(', ')}.`);
  } else lines.push(plan ? 'Mina (inglês): abriu, mas não fez nada.' : 'Mina (inglês): não entrou.');

  const games = await rowsOf('arenaLog', uid, date);
  if (games.length) {
    const wins = games.filter((g) => g.result === 'win').length;
    lines.push(`Xadrez: ${games.length} ${games.length === 1 ? 'partida' : 'partidas'}, ${wins} ${wins === 1 ? 'vitória' : 'vitórias'}.`);
  }

  const start = new Date(`${date}T03:00:00Z`);
  const end = new Date(start.getTime() + 864e5);
  const chat = await db.collection(`familyChat/${uid}/messages`).where('createdAt', '>=', start).where('createdAt', '<', end).get();
  const his = chat.docs.filter((x) => x.get('from') === 'filho').length;
  if (his) lines.push(`Conversa: ${his} ${his === 1 ? 'mensagem' : 'mensagens'} dele.`);

  const gold = await getFirestore().collection('goldTransactions').where('userId', '==', uid).where('createdAt', '>=', start.toISOString()).where('createdAt', '<', end.toISOString()).orderBy('createdAt', 'desc').get();
  let plus = 0;
  let minus = 0;
  for (const g of gold.docs) {
    const a = num(g.get('amount'));
    if (a > 0) plus += a;
    else minus += a;
  }
  const balance = num((await db.doc(`progress/${uid}`).get()).get('availableGold'));
  lines.push(`Gold: +${plus} / ${minus} (saldo ${balance}).`);

  const waiting: string[] = [];
  const subs = await db.collection('assignments').where('userId', '==', uid).where('status', '==', 'submitted').get();
  for (const a of subs.docs) waiting.push(`aprovar "${a.get('title')}" (aba Encomendas)`);
  const reds = await db.collection('redemptions').where('userId', '==', uid).where('status', '==', 'pending').get();
  for (const r of reds.docs) {
    const reward = (await db.doc(`rewards/${r.get('rewardId')}`).get()).get('title');
    waiting.push(`aprovar o prêmio "${reward ?? r.get('rewardId')}" (${num(r.get('costGold'))} gold)`);
  }
  if (waiting.length) lines.push(`Esperando você: ${waiting.join('; ')}.`);

  return { text: lines.join('\n'), quizDone, quizOpened };
}

async function sendToFather(text: string): Promise<void> {
  const link = await readLink();
  const token = TELEGRAM_BOT_TOKEN.value();
  if (!link?.parentChatId || !token) return;
  await tg(token, 'sendMessage', { chat_id: link.parentChatId, text, disable_web_page_preview: true });
}

/** 20h: o dia inteiro dele. */
export const dailyReport = onSchedule(
  { region: REGION, schedule: '0 20 * * *', timeZone: 'America/Sao_Paulo', secrets: [TELEGRAM_BOT_TOKEN] },
  async () => {
    const link = await readLink();
    if (!link?.childUid || !link.parentChatId) return;
    const { text } = await dailyReportText(link.childUid, nowBrazil().date);
    await sendToFather(text);
  },
);

/** 17h: só se a prova ainda não saiu, para dar tempo de o pai mandar um oi. */
export const quizNudge = onSchedule(
  { region: REGION, schedule: '0 17 * * *', timeZone: 'America/Sao_Paulo', secrets: [TELEGRAM_BOT_TOKEN] },
  async () => {
    const link = await readLink();
    if (!link?.childUid || !link.parentChatId) return;
    const { quizDone, quizOpened } = await dailyReportText(link.childUid, nowBrazil().date);
    if (quizDone) return;
    const name = await childName(link.childUid);
    await sendToFather(quizOpened
      ? `${name} começou a prova de hoje e parou no meio. Um oi seu costuma ajudar.`
      : `${name} ainda não fez a prova de hoje. Um oi seu costuma ajudar. (Mande "resumo" para ver o dia dele.)`);
  },
);
