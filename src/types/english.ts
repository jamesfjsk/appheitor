// ========================================
// Arena de Inglês, "A Base" (Etapa 1): modelo de dados
// Espelha a seção 3 de docs/ARENA_INGLES_ETAPA1.md. Sem imports de Firebase:
// datas viajam como string ISO para que os módulos puros rodem em Node.
// ========================================

import type { EnglishGameId } from './index';

export type Material = 'madeira' | 'pedra' | 'ferro' | 'redstone';
export type ContractType = 'merchant' | 'letter' | 'note' | 'forge';
export type BuildingId = 'fornalha' | 'bau' | 'cerca' | 'torre' | 'mesa' | 'campinho' | 'cofre' | 'agenda' | 'mercado';
export type Relation = 'on' | 'in' | 'under' | 'next_to';
export type ContractStatus = 'open' | 'done';
export type LetterGenre = 'letter' | 'scout_report' | 'dialogue' | 'notice' | 'list';
export type LetterQuestionKind = 'decision' | 'comprehension' | 'inference';
export type NoteErrorTag = 'plural' | 'article' | 'verb' | 'spelling' | 'word_order' | 'preposition' | 'other';
export type ScaffoldStage = 0 | 1 | 2;
export type MaterialCount = 0 | 1 | 2 | 3;

/** `englishSessions.game` aceita os jogos antigos e os contratos novos */
export type EnglishSessionGame = EnglishGameId | ContractType;

// ---------- Comerciante ----------

export interface MerchantSpot {
  id: string;
  label: string;
  image: string;
  relations: Relation[];
}

export interface MerchantItem {
  id: string;
  label: string;
  plural: string;
  image: string;
}

export interface MerchantStep {
  item: string;
  qty: 1 | 2 | 3;
  relation: Relation;
  spot: string;
}

/** Estado final de um item na sala, como a tela entrega para avaliação */
export interface MerchantPlacement {
  item: string;
  qty: number;
  relation: Relation;
  spot: string;
}

export interface MerchantContent {
  /** 4-6 lugares sorteados por código a partir de MERCHANT_SPOTS */
  spots: MerchantSpot[];
  /** Bandeja: um item a mais que os passos, como distrator */
  items: { id: string; stock: number }[];
  /** 2 (n1) a 4 (n3) passos gerados por código; item nunca repete; spot repete só no n3 */
  steps: MerchantStep[];
  /** Uma frase por passo (a IA reescreve a frase de reserva com variação) */
  sentences: string[];
  /** Mesma frase com item e lugar trocados por ___ (gerado por código) */
  gapped: string[];
  translation: string[];
}

// ---------- Carta ----------

export interface LetterQuestion {
  kind: LetterQuestionKind;
  /** Inglês, dentro de maxWords e da gramática do nível */
  question: string;
  /** 4 opções em inglês, mesma forma gramatical; embaralhadas em código */
  options: string[];
  answer: number;
  /** Trecho literal do texto que justifica (validado como substring) */
  evidence: string;
  /** Português, 1 linha */
  explanation: string;
}

export interface LetterContent {
  genre: LetterGenre;
  title: string;
  sender: string;
  text: string;
  /** Só palavras fora do vocabulário conhecido e presentes no texto */
  glossary: { en: string; pt: string }[];
  questions: LetterQuestion[];
  translation: string;
}

// ---------- Recado ----------

/** pt = como a dica descreve a informação; en = variantes aceitas na pré-checagem */
export interface NoteInfo {
  pt: string;
  en: string[];
}

export interface NoteContent {
  /** Português */
  brief: string;
  /** 3 informações obrigatórias */
  mustInclude: NoteInfo[];
  /** Moldes do nível (a tela mostra um, conforme scaffoldStage) */
  templates: string[];
  /** 10-14 palavras em forma base (sem números, sem plural), com 3 distratoras */
  wordBank: string[];
  /** Resposta-modelo escondida (vai ao juiz e ao painel) */
  model: string;
  /** Dica de estrutura em PT (nível 3); '' nos outros */
  hint: string;
}

// ---------- Ferraria ----------

export type ForgeItem =
  | { kind: 'scramble'; words: string[]; answer: string; rule: string; audio?: string }
  | { kind: 'gap'; sentence: string; options: string[]; answer: number; rule: string }
  | { kind: 'typed'; prompt: string; sentence: string; accepted: string[]; rule: string };

export type ForgeItemKind = ForgeItem['kind'];

/** Alvo gramatical da Ferraria: ordem gera scramble; forma gera gap/typed */
export interface ForgeTarget {
  id: string;
  label: string;
  kind: 'order' | 'form';
}

export interface ForgeContent {
  target: string;
  /** 6 itens; 2 deles reaproveitam erros de ontem quando existem */
  items: ForgeItem[];
}

// ---------- Contratos ----------

export interface ContractBase {
  id: string;
  type: ContractType;
  material: Material;
  theme: string;
  title: string;
  version: number;
  status: ContractStatus;
  result: ContractResult | null;
  retryUsed: boolean;
}

export type Contract = ContractBase &
  (
    | { type: 'merchant'; content: MerchantContent }
    | { type: 'letter'; content: LetterContent }
    | { type: 'note'; content: NoteContent }
    | { type: 'forge'; content: ForgeContent }
  );

export interface NoteError {
  wrong: string;
  fix: string;
  tag: NoteErrorTag;
}

export interface NoteJudgement {
  isEnglish: boolean;
  errors: NoteError[];
  /** Informações (pt) que faltaram */
  missing: string[];
  /** Edição mínima do texto da criança */
  corrected: string;
  /** Regra do erro principal em PT, 1 linha */
  note: string;
  /** Calculado em código (scoring.noteScore) */
  score: 0 | 1 | 2 | 3;
}

export interface ContractOutcome {
  score: number;
  max: number;
  materialEarned: MaterialCount;
  answer?: string;
  correction?: NoteJudgement;
  /** listens, textShown, glossaryHovers, evidenceHits... */
  details?: Record<string, unknown>;
}

export interface ContractResult extends ContractOutcome {
  rewarded: boolean;
  xp: number;
  gold: number;
  durationSec: number;
  /** ISO */
  finishedAt: string;
}

// ---------- Plano do dia e base ----------

export type PlanSource = 'ai' | 'offline' | 'mixed';

export interface DailyPlan {
  id: string;
  userId: string;
  date: string;
  level: number;
  status: 'generating' | 'ready';
  /** ISO; lease de 3 min */
  generatingAt: string | null;
  /** ids na ordem do quadro */
  order: string[];
  /** Atualizações por caminho contracts.c2.result */
  contracts: Record<string, Contract>;
  /** Preenchido na transação de conclusão */
  rewardedIds: string[];
  generatedAt: string | null;
  source: PlanSource;
  reviewedByParent: boolean;
  /** Pedido feito ontem pela Mesa */
  themeRequest: string | null;
}

export interface BaseDoc {
  userId: string;
  level: number;
  materials: Record<Material, number>;
  buildings: Record<BuildingId, number>;
  /** 0 molde+banco; 1 só banco; 2 banco vira "Dica" paga (1 ferro) */
  scaffoldStage: ScaffoldStage;
  /** Notas 3 seguidas no Recado (retira o andaime) */
  noteStreak3: number;
  /** Lemas vistos (glossário lido, itens do Comerciante, substantivos do Recado) */
  vocab: Record<string, { seen: number; lastDate: string }>;
  contractsDone: number;
  daysPlayed: number;
  streakDays: number;
  lastPlayedDate: string;
  /** Escolhido na Mesa para amanhã */
  themeRequest: string | null;
  updatedAt: string;
}
