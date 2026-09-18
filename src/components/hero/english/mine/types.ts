// ========================================
// Mine Rush: contrato entre motor (engine.ts), renderização (render.ts) e a tela (MineRush.tsx)
// Este arquivo é a única fonte de verdade das formas de dados. Não tem React nem DOM.
//
// Ritmo (Fase 2): toda fileira nasce PARADA no fundo do túnel ("announce"). A tela recebe o evento
// 'prompt', toca o áudio do pedido e chama releaseRow() quando o áudio termina; só então a fileira
// começa a descer e a janela de tempo conta. Nunca há dois áudios ao mesmo tempo: a tela enfileira.
// Não existe mais a placa "quebre qualquer bloco": palavra nova é apresentada no pedido (modo 'intro').
// ========================================

export type Lane = 0 | 1 | 2;

/** Como o pedido é apresentado ao jogador */
export type PromptMode =
  | 'intro'               // 1ª vez da palavra: pedido = figura + palavra + tradução + áudio em inglês; blocos = palavras escritas (a certa está à vista)
  | 'word_to_image'       // pedido = palavra em inglês (áudio + escrita); blocos = figuras
  | 'translation_to_word'; // pedido = tradução em português (áudio pt-BR + escrita; figura como dica quando hint); blocos = palavras escritas

export type RowPhase =
  | 'announce'   // parada no fundo (z = 1), esperando o áudio do pedido; ageMs não avança
  | 'moving';    // descendo até o impacto

export interface MineWord {
  id: string;
  word: string;
  translation: string;
  image: string | null;   // url da imagem 320px (pode ser null: cores usam hex)
  audio: string | null;   // url do mp3 (null: usar speechSynthesis)
  hex: string | null;     // cor, quando a palavra é uma cor
}

export interface BlockFace {
  kind: 'image' | 'text' | 'color';
  word: MineWord;
  /** texto exibido quando kind = 'text' */
  text?: string;
}

export interface BlockRow {
  index: number;                 // contador único de criação (retries também recebem um)
  target: MineWord;
  mode: PromptMode;
  /** mostrar a figura da palavra no pedido como dica (palavras de nível <= 1) */
  hint: boolean;
  faces: [BlockFace, BlockFace, BlockFace];
  correctLane: Lane;
  phase: RowPhase;
  /** tempo (ms) parada em 'announce' */
  announceMs: number;
  /** a tela pediu a liberação (áudio do pedido terminou); vira 'moving' quando announceMs >= announceMinMs */
  released: boolean;
  /** distância normalizada do carrinho: 1 = parada no fundo, 0 = ponto de impacto */
  z: number;
  /** janela de tempo desta fileira (ms), do início do movimento até o impacto */
  windowMs: number;
  /** quanto tempo a fileira está em movimento (ms) */
  ageMs: number;
  resolved: null | 'hit' | 'miss';
  /** se true, é uma reinserção de palavra errada */
  retry: boolean;
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number;        // 0..1
  color: string;
  size: number;
}

export type MineEvent =
  | { type: 'prompt'; row: BlockRow }                // fileira nova parada: a tela mostra/toca o pedido e depois chama releaseRow()
  | { type: 'go'; row: BlockRow }                    // a fileira começou a descer
  | { type: 'hit'; word: MineWord; points: number; fast: boolean; combo: number; pickaxe: number }
  | { type: 'miss'; word: MineWord; chosen: MineWord | null }
  | { type: 'pickaxe'; level: number }               // trocou de picareta (subiu ou caiu)
  | { type: 'checkpoint'; index: number; heartsAfter: number; stratum: Stratum }
  | { type: 'gameover'; reason: 'hearts' | 'complete' }
  | { type: 'audio'; word: MineWord; reason: 'hit' | 'miss'; mode: PromptMode };  // a tela deve tocar a palavra em inglês (enfileirado, nunca sobreposto); mode = modo da fileira recém-julgada

export type Stratum = 'surface' | 'stone';

export interface MineState {
  status: 'ready' | 'running' | 'paused' | 'finished';
  seed: number;
  rngState: number;              // xorshift32
  config: MineConfig;            // configuração fixada em createRun (tick/summarize só recebem o estado)
  plan: RunPlan;                 // plano de origem: níveis das palavras (janela fixa para nível 0) e dicionário para o resumo
  /** idade (ms) da fileira ativa quando a pista foi escolhida pela última vez; decide o bônus de rapidez */
  choiceAgeMs: number;
  lane: Lane;                    // pista escolhida (lógica)
  cartX: number;                 // posição visual do carrinho, 0..2 (interpola para lane)
  rows: BlockRow[];              // fileiras vivas (normalmente 1)
  queue: BlockRow[];             // fileiras ainda não lançadas, em ordem
  totalBlocks: number;           // 40
  spawned: number;               // quantas fileiras já nasceram
  hearts: number;                // 0..3
  combo: number;
  maxCombo: number;
  pickaxe: number;               // 0 madeira, 1 pedra, 2 ferro, 3 ouro, 4 diamante
  score: number;
  depth: number;                 // blocos quebrados (acertos)
  windowMs: number;              // janela atual para fileiras novas (4000 -> 2000)
  elapsedMs: number;
  stratum: Stratum;
  particles: Particle[];
  events: MineEvent[];           // fila consumida pela tela via drainEvents()
  results: { id: string; correct: boolean }[];  // um item por fileira julgada
  /** fileira em destaque após erro (mostra o bloco certo), ms restantes */
  highlightMs: number;
  highlightRow: BlockRow | null;
  /** id da fileira cujo pedido está ativo no HUD */
  activeRowIndex: number | null;
}

export interface MineConfig {
  totalBlocks: number;           // 40
  hearts: number;                // 3
  windowStartMs: number;         // 4000
  windowMinMs: number;           // 2000
  windowStepMs: number;          // 100 por acerto
  checkpointEvery: number;       // 10
  fastFraction: number;          // 0.4: acerto nos primeiros 40% da janela ganha bônus
  basePoints: number;            // 10
  fastBonus: number;             // 5
  retryAfterMin: number;         // 5
  retryAfterMax: number;         // 8
  highlightMs: number;           // 1200: tempo mostrando o bloco certo após erro
  spawnGapMs: number;            // 700: intervalo mínimo entre fileiras
  announceMinMs: number;         // 500: a fileira fica parada pelo menos isso, mesmo que a tela libere antes
  announceMaxMs: number;         // 6000: segurança; 0 = espera a tela para sempre
  /** Picareta forjada: a corrida não cai abaixo disto (0 madeira … 4 diamante). */
  pickaxeFloor: number;
}

export const DEFAULT_CONFIG: MineConfig = {
  totalBlocks: 40,
  hearts: 3,
  windowStartMs: 4000,
  windowMinMs: 2000,
  windowStepMs: 100,
  checkpointEvery: 10,
  fastFraction: 0.4,
  basePoints: 10,
  fastBonus: 5,
  retryAfterMin: 5,
  retryAfterMax: 8,
  highlightMs: 1200,
  spawnGapMs: 700,
  announceMinMs: 500,
  announceMaxMs: 6000,
  pickaxeFloor: 0,
};

/** Multiplicador por picareta (índice = nível) e combo mínimo para cada nível */
export const PICKAXES = [
  { name: 'Madeira', minCombo: 0, multiplier: 1, color: '#9a6b3c' },
  { name: 'Pedra', minCombo: 3, multiplier: 2, color: '#8a8a8a' },
  { name: 'Ferro', minCombo: 6, multiplier: 3, color: '#d8d8d8' },
  { name: 'Ouro', minCombo: 10, multiplier: 4, color: '#f2c94c' },
  { name: 'Diamante', minCombo: 15, multiplier: 5, color: '#5ee0e6' },
] as const;

/** Entrada para montar a corrida: a tela escolhe as palavras e o motor monta as fileiras */
export interface RunPlan {
  /**
   * palavras da corrida com seu "nível":
   *   0 = nova: 1ª aparição em modo 'intro' (janela fixa em windowStartMs), depois como nível 1
   *   1 = aprendendo: alterna translation_to_word (com figura como dica) e word_to_image
   *   2+ = firme: alterna translation_to_word (sem dica) e word_to_image
   */
  words: { word: MineWord; level: number }[];
  /** banco para sortear distratores (mesma categoria de preferência); deve conter as próprias palavras também */
  pool: MineWord[];
  seed: number;
}

export interface RunSummary {
  depth: number;
  score: number;
  maxCombo: number;
  hearts: number;
  elapsedMs: number;
  results: { id: string; correct: boolean }[];
  completed: boolean;   // chegou ao último bloco
  missedWords: MineWord[];
}

/** Assets prontos para desenhar (imagens já carregadas), preparadas pela tela */
export interface RenderAssets {
  images: Map<string, HTMLImageElement>;   // chave: url da imagem
}

export interface RenderOptions {
  width: number;    // px CSS
  height: number;   // px CSS
  dpr: number;      // devicePixelRatio limitado a 2
  reduceEffects: boolean;
}
