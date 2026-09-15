// ========================================
// Vila (Etapa 1): modelo de dados e catálogos
// Módulo puro: sem Firebase, React ou import.meta.env.
// ========================================

import type { Material } from './english';

export type Period = 'morning' | 'afternoon' | 'evening';
export type GearSlot = 'pickaxe' | 'helmet' | 'boots' | 'lamp' | 'cape';
export type PickaxeLevel = 0 | 1 | 2 | 3 | 4;
export type Flag01 = 0 | 1;
export type ClaimKind = 'daily' | 'quiz8' | 'streak' | 'level' | 'event' | 'challenge' | 'season' | 'auto';
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
}

export interface VillageSettings {
  shopEnabled: boolean;
  effectsEnabled: boolean;
  goldPriceMultiplier: number;
  team: { name: string; color1: string; color2: string };
}

export interface EconomySettings {
  materialsPerTask: number;
  dailyChestGold: [number, number];
  rareEveryNDays: number;
  gameGoldDailyCap: number;
  redeemMinTasks: number;
  taskDefaultXp: number;
  taskDefaultGold: number;
  periodStartHours: { afternoon: number; evening: number };
  periodGating: boolean;
  chestOpenHour: number;
  minDueForChest: number;
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
}

export interface HealthDoc {
  lastCloseDay: string | null;
  lastQuizGenerated: string | null;
  lastPlanGenerated: string | null;
  lastChestDate: string | null;
  updatedAt: string;
}

export interface CosmeticItem {
  id: string;
  slot: 'skin' | 'hair' | 'shirt' | 'pants' | 'hat' | 'cape' | 'pet';
  label: string;
  basePrice: number;
  free: boolean;
  premium: boolean;
}

export interface GearDef {
  id: string;
  slot: GearSlot;
  level: number;
  label: string;
  effect: string;
  cost: Partial<Record<Material, number>>;
  rare: Partial<VillageRare>;
}

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
}

export interface LineDef {
  id: string;
  text: string;
}
