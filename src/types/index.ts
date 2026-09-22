// ========================================
// 🔥 SCHEMA FIRESTORE ALINHADO - FLASH MISSIONS
// ========================================

export interface User {
  userId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'child';
  managedChildId?: string; // Apenas para admin
  createdAt: Date;
  updatedAt: Date;
  lastLoginTimestamp: Date;
}

export interface UserProgress {
  userId: string;
  level: number;
  totalXP: number;
  availableGold: number;
  totalGoldEarned: number;
  totalGoldSpent: number;
  streak: number;
  longestStreak: number;
  rewardsRedeemed: number;
  totalTasksCompleted: number;
  lastActivityDate: Date;
  updatedAt: Date;
  lastDailySummaryProcessedDate?: Date;
  quizEnabled?: boolean; // Flag para ativar/desativar o quiz diário
  quizRequired?: boolean; // Quiz obrigatório: a criança precisa fazer antes de seguir
  quizQuestionCount?: number; // Quantidade de perguntas do quiz diário (padrão 8)
}

// ========================================
// QUIZ DIÁRIO (prova gerada com antecedência e guardada em dailyQuizzes)
// ========================================
export type DailyQuizQuestionKind = 'lesson' | 'knowledge' | 'dilemma';

export interface DailyQuizSanitize {
  kept: number;
  dropped: Record<string, number>;
  /** Códigos do validador, na ordem da IA. Vazio = a pergunta passou. */
  perQuestion?: { i: number; codes: string[] }[];
  /** Revisor (gpt-4o-mini): o lote inteiro. ok false sai da prova. */
  review?: { n: number; ok: boolean; motivo: string }[];
  /** A resposta do revisor veio quebrada: vale o validador local. */
  reviewFellBack?: boolean;
  /** reviewBatch local, log, não decide a prova. */
  batchLog?: string[];
  /** Quantas das perguntas publicadas vieram do banco, depois do validador. */
  fromOffline?: number;
  /** Aprovação no limite do revisor. A pergunta fica. */
  duvidas?: { n: number; question: string; motivo: string }[];
}

export interface DailyQuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  kind: DailyQuizQuestionKind;
  subject: string;
  why?: string;
  trap?: string;
  skill?: string;
  bloom?: string;
  audioText?: string;
  /** Partida como cenário. A matéria continua em subject. */
  scenario?: string;
}

export interface DailyQuizTheme {
  id: string;          // id do tema no currículo
  category: string;    // id de QuizCategory (filosofia, carater, quimica...)
  title: string;
  lesson: string;      // a "ideia do dia": texto curto e concreto
  whyItMatters: string;
  curiosity?: string;  // 1 ou 2 frases, depois da ideia do dia
}

export interface DailyQuiz {
  id: string;
  userId: string;
  date: string;        // YYYY-MM-DD (Brasil)
  status: 'ready' | 'completed';
  theme: DailyQuizTheme;
  questions: DailyQuizQuestion[];
  reflectionPrompt: string;
  source: 'ai' | 'offline';
  sanitize?: DailyQuizSanitize;
  /** Saída crua da IA (primeira chamada e, se houve, a substituição). */
  raw?: unknown;
  generatedAt: Date;
  completed: boolean;
  /** 8 respostas gravadas; a prova ainda não pagou nem fechou (M2). */
  awaitingReflection?: boolean;
  score?: number;
  totalQuestions?: number;
  xpEarned?: number;
  goldEarned?: number;
  answers?: string[];
  reflection?: string;
  /** Contagem gravada, não recalculada (B4). */
  reflectionWords?: number;
  /** Frase do Sábio ao aceitar ou recusar a reflexão. */
  reflectionNote?: string;
  completedAt?: Date;
}

// ========================================
// ARENA DE INGLÊS (jogos de vocabulário)
// ========================================
export type EnglishGameId = 'mine_rush' | 'block_memory' | 'creeper_quiz' | 'crafting_words';
/** Jogos antigos + contratos da Base (Etapa 1); definido em ./english para manter os módulos puros */
import type { EnglishSessionGame } from './english';
export type { EnglishSessionGame } from './english';

export interface EnglishGameSession {
  id: string;
  userId: string;
  game: EnglishSessionGame;   // jogos antigos ou tipo de contrato da Base
  category: string;       // fruits | animals | ... | mixed
  date: string;           // YYYY-MM-DD
  correct: number;
  total: number;
  score: number;
  durationSec: number;
  xpEarned: number;
  goldEarned: number;
  rewarded: boolean;      // false quando o limite diário de rodadas premiadas já passou
  depth?: number;         // Mine Rush: blocos quebrados na corrida
  maxCombo?: number;      // Mine Rush: maior sequência de acertos
  createdAt: Date;
}

export interface EnglishWordStat {
  seen: number;
  correct: number;
  wrong: number;
  streak: number;         // acertos seguidos; 3+ = dominada
  lastAt?: Date;
}

export interface EnglishProgress {
  userId: string;
  words: Record<string, EnglishWordStat>;
  sessions: number;
  updatedAt: Date;
  bestDepth?: number;     // Mine Rush: recorde de profundidade (blocos)
  bestScore?: number;     // Mine Rush: recorde de pontos
}

export interface Task {
  id: string;
  ownerId: string; // Child UID
  title: string;
  description?: string;
  xp: number;
  gold: number;
  period: 'morning' | 'afternoon' | 'evening';
  time?: string;
  frequency: 'daily' | 'weekday' | 'weekend';
  active: boolean;
  status: 'pending' | 'done' | 'proposed';
  lastCompletedDate?: string; // YYYY-MM-DD format
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Admin UID
  optional?: boolean;
  origin?: 'admin' | 'child' | 'agenda';
  date?: string;
}

export interface Reward {
  id: string;
  ownerId: string; // Child UID
  title: string;
  description: string;
  category: 'toy' | 'activity' | 'treat' | 'privilege' | 'custom';
  costGold: number;
  emoji: string; // icon key Flash Missions (legado: emoji)
  active: boolean;
  requiredLevel: number;
  createdAt: Date;
  updatedAt: Date;
  goalOnly?: boolean;
}

export interface RewardRedemption {
  id: string;
  userId: string; // Child UID
  rewardId: string;
  rewardTitle?: string;
  costGold: number;
  status: 'pending' | 'approved' | 'rejected' | 'delivered';
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string; // Admin UID
  metadata?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  toUserId: string; // Child UID
  title: string;
  message: string;
  type: 'reminder' | 'achievement' | 'reward' | 'general';
  sentAt: Date;
  read: boolean;
  readAt?: Date;
}

export interface SurpriseMissionConfig {
  id: string;
  isEnabled: boolean;
  theme: 'english' | 'math' | 'general' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  goldReward: number;
  questionsCount: number; // Always 30 for now
  lastUpdatedBy: string; // Admin UID
  createdAt: Date;
  updatedAt: Date;
}

export interface DailySurpriseMissionStatus {
  id: string;
  userId: string; // Child UID
  date: string; // YYYY-MM-DD format
  completed: boolean;
  score: number; // Number of correct answers
  totalQuestions: number; // Should be 30
  xpEarned: number;
  goldEarned: number;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurpriseMissionQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface BirthdayEvent {
  id: string;
  userId: string; // Child UID
  birthdayDate: string; // MM-DD format (month-day)
  year: number; // Year of this specific birthday
  age: number; // Age reached
  specialRewards: string[]; // Array of reward IDs given as birthday gifts
  celebrationCompleted: boolean;
  celebrationCompletedAt?: Date;
  specialMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BirthdayConfig {
  id: string;
  userId: string; // Child UID
  birthdayDate: string; // MM-DD format (12-18 for December 18th)
  birthdayYear: number; // Birth year
  isEnabled: boolean;
  specialXPBonus: number; // Extra XP on birthday
  specialGoldBonus: number; // Extra Gold on birthday
  createdAt: Date;
  updatedAt: Date;
}

// Tipos auxiliares
export interface CalendarDay {
  date: Date;
  tasksCompleted: number;
  totalTasks: number;
  pointsEarned: number;
  status: 'completed' | 'partial' | 'missed' | 'future';
  tasks: Task[];
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}

export interface LevelSystem {
  currentLevel: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpNeededForNext: number;
  progressPercentage: number;
  levelTitle: string;
  nextLevelTitle: string;
  isMaxLevel: boolean;
}

export interface FlashReminder {
  id: string;
  ownerId: string; // Child UID
  title: string;
  message: string;
  icon: string;
  color: 'red' | 'yellow' | 'blue' | 'green' | 'purple' | 'orange';
  priority: 'low' | 'medium' | 'high';
  active: boolean;
  showOnDashboard: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Admin UID
}

export interface Achievement {
  id: string;
  ownerId: string; // Child UID
  title: string;
  description: string;
  icon: string; // icon key Flash Missions (legado: emoji)
  type: 'xp' | 'level' | 'tasks' | 'checkin' | 'streak' | 'redemptions' | 'custom';
  target: number; // valor alvo (ex: 1000 para 1000 XP)
  xpReward: number;
  goldReward: number;
  isActive: boolean;
  createdBy: string; // admin que criou
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAchievement {
  id: string;
  userId: string; // Child UID
  achievementId: string;
  progress: number; // progresso atual
  isCompleted: boolean;
  rewardClaimed: boolean;
  claimedAt?: Date;
  unlockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  ownerId: string; // Admin UID
  title: string;
  content: string;
  category?: 'general' | 'tasks' | 'rewards' | 'progress' | 'important';
  color?: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoldTransaction {
  id: string;
  userId: string; // Child UID
  amount: number; // Positive for gain, negative for spend
  type: 'earned' | 'spent' | 'bonus' | 'penalty' | 'refund' | 'adjustment' | 'saved';
  source:
    | 'task_completion'
    | 'reward_redemption'
    | 'daily_bonus'
    | 'daily_penalty'
    | 'admin_adjustment'
    | 'birthday'
    | 'quiz'
    | 'surprise_mission'
    | 'achievement'
    | 'redemption_refund'
    | 'english_game'
    | 'village_shop'
    | 'chest'
    | 'task_reversal'
    | 'level_gift'
    | 'goal_deposit'
    | 'goal_withdraw'
    | 'book_report'
    | 'goal_interest'
    | 'goal_achieved'
    | 'challenge'
    | 'repair'
    | 'merchant_sale'
    | 'streak_chest'
    | 'trophy'
    | 'late_task';
  description: string; // Human-readable description
  relatedId?: string; // Task ID, Reward ID, Achievement ID, etc.
  relatedTitle?: string; // Title of related item for quick reference
  metadata?: Record<string, unknown>; // Additional context
  balanceBefore: number; // Gold balance before transaction
  balanceAfter: number; // Gold balance after transaction
  createdAt: Date;
  createdBy?: string; // Admin UID for manual adjustments
}

export interface PunishmentMode {
  id: string;
  userId: string; // Child UID
  isActive: boolean;
  startDate: Date;
  endDate: Date; // 7 days from startDate
  tasksCompleted: number;
  tasksRequired: number; // Always 30
  activatedBy: string; // Admin UID
  reason: string;
  lastTaskCompletedAt?: Date;
  deactivatedAt?: Date;
  deactivatedReason?: 'time_completed' | 'tasks_completed' | 'admin_override';
  createdAt: Date;
  updatedAt: Date;
}

export interface PunishmentTaskCompletion {
  id: string;
  punishmentId: string;
  userId: string; // Child UID
  completedAt: Date;
  taskNumber: number; // 1-30
  taskId: string; // ID of the task that was completed
  taskTitle: string; // Title of the task for quick reference
}
export interface DailyCheckin {
  mood?: 'bom' | 'normal' | 'dificil';
  water?: boolean;
  stretch?: boolean;
  kindness?: boolean;
  screen?: boolean;
  tomorrow: string;
  at: string;
}

export interface DailyProgress {
  userId: string;
  date: string; // YYYY-MM-DD format
  xpEarned: number;
  goldEarned: number;
  tasksCompleted: number;
  totalTasksAvailable: number;
  goldPenalty: number;
  allTasksBonusGold: number;
  summaryProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
  checkin?: DailyCheckin | null;
  repaired?: boolean;
  helmetUsed?: boolean;
}

// ========================================
// ESTANTE DO SÁBIO (decisão 40, 22/09/2026): livros cadastrados e relatos de leitura
// ========================================
export type BookSize = 'curto' | 'medio' | 'longo';
export type BookStatus = 'to_read' | 'done';

export interface BookDoc {
  id: string;
  userId: string;
  familyId: string;
  title: string;
  titleKey: string;
  pages: number;
  size: BookSize;
  gold?: number;              // valor definido pelo pai (1-100); sem ele, vale pelo tamanho (8/15/25)
  addedOn: string;            // YYYY-MM-DD (quando entrou na estante)
  addedBy: 'parent' | 'child';
  status: BookStatus;
  doneOn?: string;            // YYYY-MM-DD (quando o relato foi aceito)
  parentReply?: string;       // uma linha do pai, entregue pelo Sábio
  createdAt: Date;
  updatedAt: Date;
}

export type BookSuspect = 'nenhum' | 'copiado' | 'ia' | 'fora_do_tema';

export interface BookJudge {
  leu: 0 | 1 | 2 | 3;
  motivo: string;
  faltou: string[];
  suspeito: BookSuspect;
  comentario: string;
  pergunta?: string;
  respostaEsperada?: string;
  model: string;
}

export interface BookVerify {
  question: string;
  expected: string;
  answer: string;
  ok: boolean;
}

export type BookVerdict = 'aceito' | 'falta' | 'suspeito' | 'fora' | 'colado' | 'repetido';

export interface BookReportDoc {
  id: string;
  userId: string;
  familyId: string;
  bookId: string;
  title: string;
  titleKey: string;
  liked: 0 | 1 | 2 | 3;       // não gostei · gostei · gostei muito · amei
  rating: number | null;      // 0-10, opcional
  text: string;
  words: number;
  typedMs: number;
  pasted: boolean;
  attempt: number;
  date: string;               // YYYY-MM-DD
  readingDays: number;
  judge?: BookJudge;
  verify?: BookVerify;
  verdict: BookVerdict;
  accepted: boolean;
  needsParent: boolean;       // livro proposto pela criança ou texto suspeito aceito com marca
  flagged: boolean;
  paidGold: number;
  paidXp: number;
  parentDecision?: 'approved' | 'voided';
  createdAt: Date;
}
