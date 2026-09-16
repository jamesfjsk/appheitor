// ========================================
// Vila (Etapa 1): modelo de dados e catálogos
// Módulo puro: sem Firebase, React ou import.meta.env.
// ========================================

import type { Material } from './english';

export type Period = 'morning' | 'afternoon' | 'evening';
export type GearSlot = 'pickaxe' | 'helmet' | 'boots' | 'lamp' | 'cape';
export type PickaxeLevel = 0 | 1 | 2 | 3 | 4;
export type Flag01 = 0 | 1;
export type ClaimKind =
  | 'daily'
  | 'quiz8'
  | 'streak'
  | 'level'
  | 'event'
  | 'challenge'
  | 'season'
  | 'auto'
  | 'repair'
  | 'trophy'
  | 'merchant'
  | 'milestone'
  | 'hint'
  | 'agenda'
  | 'punish'
  | 'burn'
  | 'fence'
  | 'ach'
  | 'friend'
  | 'redstone';
export type NoticeType = 'compromisso' | 'regra' | 'viagem' | 'visita' | 'recado';
export type HabitId = 'agua' | 'postura' | 'alongar' | 'tela' | 'arrumar' | 'sono' | 'gentileza';

export interface VillageGear {
  pickaxe: PickaxeLevel;
  helmet: Flag01;
  boots: Flag01;
  lamp: Flag01;
  cape: Flag01;
}

export interface VillageCharacter {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  hat: string | null;
  cape: string | null;
  pet: string | null;
}

export interface VillageRare {
  diamante: number;
  esmeralda: number;
}

export interface VillageShield {
  helmetWeek: string | null;
}

export interface VillageHabits {
  [habitId: string]: { streak: number; lastDate: string };
}

export interface VillageDoc {
  userId: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  characterName: string;
  onboardedAt: string | null;
  rare: VillageRare;
  gear: VillageGear;
  character: VillageCharacter;
  owned: string[];
  claimed: Record<string, string>;
  shield: VillageShield;
  fullDays: number;
  fullDaysStart: string | null;
  records: Record<string, number>;
  decor: string[];
  noticesDismissed: string[];
  habits: VillageHabits;
  season: number;
  npcs: Record<NpcId, NpcState>;
  cracks: string[];
  stars: SeasonStar[];
  trophies: Record<string, TrophyTier>;
  plan: VillagePlan;
  newItems: string[];
  stats: VillageStats;
  achievementsUnlocked: Record<string, string>;
  newAchievements: string[];
}

export interface VillageSettings {
  shopEnabled: boolean;
  effectsEnabled: boolean;
  goldPriceMultiplier: number;
  team: { name: string; color1: string; color2: string };
}

export interface MerchantBuySettings {
  materials: number;
  gold: number;
  dailyCap: number;
}

export interface EconomySettings {
  materialsPerTask: number;
  dailyChestGold: [number, number];
  rareEveryNDays: number;
  gameGoldDailyCap: number;
  gameGoldWeeklyCap: number;
  redeemMinTasks: number;
  taskDefaultXp: number;
  taskDefaultGold: number;
  periodStartHours: { afternoon: number; evening: number };
  periodGating: boolean;
  chestOpenHour: number;
  minDueForChest: number;
  incomeDayGold: number;
  quizGoldPerHit: number;
  quizXpPerHit: number;
  challengeGoldWeeklyCap: number;
  achievementGoldCap: number;
  buildCostMultiplier: number;
  merchantBuy: MerchantBuySettings;
  savingsTargetPct: number;
  interestRatePct: number;
  interestCapGold: number;
  maxOpenGoals: number;
  lateMissionUntilHour: number;
  lateMissionGoldPct: number;
  repairRefundPct: number;
  seasonWeeks: number;
  levelCap: number;
}

export interface ModuleSettings {
  shop: boolean;
  effects: boolean;
  bank: boolean;
  interest: boolean;
  logic: boolean;
  lines: boolean;
  dilemmas: boolean;
  mineShift: boolean;
  football: boolean;
  chat: boolean;
  tts: boolean;
  aiGeneration: boolean;
  music: boolean;
}

export interface PauseDaysSettings {
  dates: string[];
}

export interface TestChildSettings {
  uid: string | null;
  email?: string;
}

export interface HealthDoc {
  lastCloseDay: string | null;
  lastQuizGenerated: string | null;
  lastPlanGenerated: string | null;
  lastChestDate: string | null;
  lastInterestWeek: string | null;
  lastLearningWeek: string | null;
  clockDriftMs: number | null;
  updatedAt: string;
}

export interface CosmeticItem {
  id: string;
  slot: 'skin' | 'hair' | 'shirt' | 'pants' | 'hat' | 'cape' | 'pet';
  label: string;
  basePrice: number;
  free: boolean;
  premium: boolean;
  minLevel: number;
}

export interface GearDef {
  id: string;
  slot: GearSlot;
  level: number;
  label: string;
  effect: string;
  cost: Partial<Record<Material, number>>;
  rare: Partial<VillageRare>;
  minLevel: number;
}

export type NpcId = 'sabio' | 'comerciante' | 'ferreiro' | 'olheiro';

export interface NpcState {
  points: number;
  tier: number;
  lastTalkDate: string | null;
  seen: string[];
  quest: { chapter: number; progress: number; doneAt: string | null };
}

export type GoalStatus = 'open' | 'achieved' | 'cancelled' | 'cancel_requested';

export interface GoalDoc {
  id: string;
  userId: string;
  familyId: string;
  title: string;
  targetGold: number;
  savedGold: number;
  status: GoalStatus;
  rewardId?: string;
  cancelReason?: string;
  lastInterestWeek?: string;
  interestPaid: number;
  createdAt: string;
  updatedAt: string;
  achievedAt?: string;
  cancelledAt?: string;
}

export type ChallengeKind =
  | 'tasks_count'
  | 'streak_days'
  | 'quiz_correct'
  | 'english_contracts'
  | 'full_days'
  | 'manual';

export type ChallengeStatus = 'active' | 'proposed' | 'rejected';

export interface ChallengeDoc {
  id: string;
  userId: string;
  familyId: string;
  title: string;
  description: string;
  kind: ChallengeKind;
  target: number;
  progress: number;
  startsOn: string;
  endsOn: string;
  xpReward: number;
  goldReward: number;
  createdBy: 'admin' | 'child';
  status: ChallengeStatus;
  completedAt?: string;
  extendedDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface VillagePlan {
  date: string;
  order: string[];
  focusTaskId: string | null;
}

export type VillageStats = Record<string, number>;

export type AchievementTier = 'bronze' | 'prata' | 'ouro' | 'exclusiva';

export interface GameAchievementReward {
  xp: number;
  material?: number;
  rare?: 'esmeralda' | 'diamante';
  cosmetic?: string;
}

export interface GameAchievement {
  id: string;
  category: string;
  tier: AchievementTier;
  title: string;
  description: string;
  icon: string;
  stat: string;
  target: number;
  hidden?: boolean;
  resetOnSeason?: boolean;
  reward: GameAchievementReward;
}

export interface DailyCheckinAnswers {
  water: boolean;
  stretch: boolean;
  kindness: boolean;
  screen: boolean;
  tomorrow: string;
}

export interface LearningDoc {
  week: string;
  quizAccuracyByCategory: Record<string, number>;
  wordsMastered: number;
  reflections: number;
  savingsRatePct: number;
  goldEarned: number;
  goldSpent: number;
  goldSaved: number;
  fullDays: number;
  challengesDone: number;
  updatedAt: string;
}

export type VillageSceneEventKind =
  | 'task_done'
  | 'level_up'
  | 'chest_open'
  | 'full_day'
  | 'missed_yesterday'
  | 'build';

export interface VillageSceneEvent {
  kind: VillageSceneEventKind;
  at: number;
  lot?: string;
}

export const FRIEND_TIER_MIN = [0, 5, 15, 30, 50, 80] as const;
export const FRIEND_TIER_NAME = ['Desconhecido', 'Conhecido', 'Colega', 'Amigo', 'Parceiro', 'Lenda da Vila'] as const;

export type TrophyTier = 'bronze' | 'prata' | 'ouro';

export interface SeasonStar {
  season: number;
  level: number;
  endedOn: string;
}

export type AgendaKind =
  | 'prova'
  | 'trabalho'
  | 'evento'
  | 'aniversario'
  | 'treino'
  | 'compromisso'
  | 'outro';

export interface AgendaItem {
  id: string;
  userId: string;
  familyId: string;
  title: string;
  kind: AgendaKind;
  date: string;
  time?: string;
  remindMinutesBefore?: number;
  repeat?: 'none' | 'weekly';
  notes?: string;
  createdBy: 'child' | 'admin';
  plannedAheadDays: number;
  doneAt?: string;
  remindedAt?: string;
  remindedFor?: string;
  studyPlanAccepted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceBand {
  id: 'mimo' | 'pequeno' | 'medio' | 'grande' | 'enorme' | 'temporada';
  days: number;
  onlyGoal?: boolean;
}

export interface LevelGift {
  materialChoice: boolean;
  rare: 'esmeralda' | 'diamante' | null;
  cosmeticId: string | null;
}

export type GameGoldSource =
  | 'chest'
  | 'streak_chest'
  | 'challenge'
  | 'achievement'
  | 'goal_interest'
  | 'merchant_sale'
  | 'trophy'
  | 'repair';

export interface TaskLootInput {
  period: Period;
  gear: VillageGear;
  completionsTodayByPeriod: Record<Period, number>;
  settings: EconomySettings;
  effectsEnabled: boolean;
}

export interface TaskLoot {
  material: Material;
  qty: number;
}

export interface ChestContents {
  gold: number;
  materials: Partial<Record<Material, number>>;
  esmeralda: number;
}

export interface ScheduleTask {
  id: string;
  active: boolean;
  frequency: 'daily' | 'weekday' | 'weekend';
  period: Period;
  createdAt?: Date | string | null;
  optional?: boolean;
}

export interface FatherNotice {
  id: string;
  type: NoticeType;
  text: string;
  when?: string;
  until?: string;
  ackAt?: string | null;
}

export interface HabitDef {
  id: HabitId;
  label: string;
  period: Period | 'any';
  confirmLabel: string;
  npc: 'ferreiro' | 'comerciante' | 'sabio' | 'olheiro';
}

export interface BoardItem {
  key: string;
  kind: 'father' | 'auto' | 'habit';
  text: string;
  until?: string;
}

export interface NoticeContext {
  due: number;
  done: number;
  minDueForChest: number;
  chestOpenHour: number;
  birthdayMmDd: string;
  gold: number;
  nearestReward: { title: string; costGold: number } | null;
  avgGoldPerDay: number;
  tomorrowQuizTitle: string | null;
  pauseDates: string[];
  vacation: boolean;
  fatherNotices: FatherNotice[];
  dismissed: string[];
  agendaToday?: Array<{ title: string; time?: string }>;
  agendaTomorrow?: Array<{ title: string }>;
}

export interface LineDef {
  id: string;
  text: string;
}
