/** Simulador da economia v2: 91 dias, três perfis. Sem Firebase. */
const DAYS = 91;
const R7 = 45;
const TASK_GOLD = 5;
const TASKS_DAY = 5;
const QUIZ_HIT = 2;
const CHEST_BASE = 10;
const CHEST_CAP = 15;
const INTEREST = 0.05;
const INTEREST_CAP = 20;

function run(name, { taskRate, quizHits, chest, savePct, spendDay }) {
  let gold = 20;
  let saved = 0;
  let earned = 0;
  let spent = 0;
  let xp = 0;
  const mats = { madeira: 0, pedra: 0, ferro: 0 };
  let lastMove = 0;
  const weekLevel = [];
  for (let d = 1; d <= DAYS; d++) {
    const tasks = Math.round(TASKS_DAY * taskRate);
    const gTasks = tasks * TASK_GOLD;
    const gQuiz = quizHits * QUIZ_HIT;
    const torches = chest ? Math.min(d, 20) : 0;
    const gChest = chest && tasks === TASKS_DAY ? Math.min(CHEST_CAP, CHEST_BASE + Math.min(torches, 5)) : 0;
    const dayIn = gTasks + gQuiz + gChest;
    earned += dayIn;
    gold += dayIn;
    xp += tasks * 10 + quizHits * 6;
    mats.madeira += tasks >= 1 ? 1 : 0;
    mats.pedra += tasks >= 3 ? 1 : 0;
    mats.ferro += tasks >= 5 ? 1 : 0;
    const put = Math.floor(dayIn * savePct);
    if (put > 0 && gold - put >= 0) {
      gold -= put;
      saved += put;
    }
    if (d % 7 === 0) {
      const j = Math.min(INTEREST_CAP, Math.floor(saved * INTEREST));
      saved += j;
      weekLevel.push({ week: d / 7, level: Math.min(40, 1 + Math.floor(xp / 220)), gold, saved });
    }
    const spend = spendDay && gold >= spendDay ? spendDay : 0;
    if (spend) {
      gold -= spend;
      spent += spend;
      lastMove = d;
    }
    if (dayIn > 0 || spend > 0) lastMove = d;
  }
  const idle = DAYS - lastMove;
  const unaffordable = gold + saved < R7 * 50;
  return { name, earned, spent, saved, gold, xp, mats, weekLevel, idle, unaffordable };
}

const profiles = [
  run('típico', { taskRate: 0.7, quizHits: 6, chest: true, savePct: 0.15, spendDay: 8 }),
  run('misto', { taskRate: 0.5, quizHits: 4, chest: true, savePct: 0.05, spendDay: 15 }),
  run('perfeito', { taskRate: 1, quizHits: 8, chest: true, savePct: 0.25, spendDay: 0 }),
];

for (const p of profiles) {
  console.log(`\n== ${p.name} ==`);
  console.log(`ganho ${p.earned}  gasto ${p.spent}  guardado ${p.saved}  saldo ${p.gold}  xp ${p.xp}`);
  console.log(`materiais madeira ${p.mats.madeira} pedra ${p.mats.pedra} ferro ${p.mats.ferro}`);
  console.log('nível por semana:', p.weekLevel.map((w) => `S${w.week}:Nv${w.level}`).join(' '));
  if (p.idle > 15) console.log(`ALERTA saldo parado > 15 D (${p.idle})`);
  if (p.unaffordable) console.log('ALERTA item temporada (50 D) inalcançável em 13 semanas');
}
