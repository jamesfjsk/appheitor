// ========================================
// Regras e constantes do app (um lugar só)
// ========================================

/** Missões concluídas no dia necessárias para liberar a loja de recompensas */
export const REDEEM_MIN_TASKS = 5;

/** Valores padrão de uma missão quando não informados */
export const TASK_DEFAULT_XP = 10;
export const TASK_DEFAULT_GOLD = 5;

/** Data de nascimento da criança (aniversário e idade são calculados daqui) */
export const CHILD_BIRTH_DATE = { year: 2016, month: 9, day: 18 };

/** "MM-DD" do aniversário, para comparação com a data de hoje */
export const CHILD_BIRTHDAY_MMDD = `${String(CHILD_BIRTH_DATE.month).padStart(2, '0')}-${String(CHILD_BIRTH_DATE.day).padStart(2, '0')}`;

/** Idade que a criança completa (ou completou) no ano informado */
export function childAgeInYear(year: number): number {
  return year - CHILD_BIRTH_DATE.year;
}

/** Idade atual, considerando se o aniversário deste ano já passou */
export function childAgeToday(today: Date = new Date()): number {
  const hadBirthday =
    today.getMonth() + 1 > CHILD_BIRTH_DATE.month ||
    (today.getMonth() + 1 === CHILD_BIRTH_DATE.month && today.getDate() >= CHILD_BIRTH_DATE.day);
  return childAgeInYear(today.getFullYear()) - (hadBirthday ? 0 : 1);
}

/** Chat com IA (ChatFlashGPT): desligado até os ajustes de IA terminarem */
export const AI_CHAT_ENABLED = false;

/** Quiz do dia: quantidade de perguntas */
export const DAILY_QUIZ_QUESTIONS = 8;

/** Fechamento do dia (penalidade por missão perdida e bônus por dia completo): padrões */
export const DAILY_RULES_DEFAULTS = {
  enabled: true,
  penaltyPerMissedTask: 1,
  allDoneBonus: 10,
  /** quantos dias para trás o fechamento pode alcançar se o app ficar fechado */
  maxLookbackDays: 7,
};

/** Foto da criança usada no login, cabeçalho e celebrações */
export const CHILD_PHOTO_URL =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThmdGPdw5KIVi5gQ-UWFdptTPziXMRjk6phx4Noy3Toh9Nu_nbnP-YZGe9sdfP0jrVakc&usqp=CAU';
