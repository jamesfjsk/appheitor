# A Base, Etapa 1: API da fundação

Contrato para os agentes que constroem em paralelo (serviços Firebase/IA, telas da criança, painel do pai, banco de reserva). Tudo o que está aqui existe, compila (`npx tsc --noEmit -p tsconfig.app.json`), passa no eslint e tem testes (`npm run test:english`). Especificação de origem: `docs/ARENA_INGLES_ETAPA1.md` (v2).

Regras dos módulos desta fundação:

- `src/types/english.ts`, `src/config/english*.ts` e `src/services/english/*.ts` são **puros**: não importam Firebase nem React e não leem `import.meta.env`. Rodam em Node (os testes fazem isso via esbuild).
- Datas viajam como string ISO; nada de `Date`/`Timestamp` nesses tipos.
- Sementes são números inteiros de 32 bits: `seedFromString(uid + '|' + date + '|' + ...)`.
- `problems[]` dos validadores é texto em PT: serve de dica na retentativa da IA (citar o token/regra reprovada) e de registro no painel.

## 1. `src/types/english.ts`

Espelha a seção 3 da especificação. `EnglishGameId` em `src/types/index.ts` **não muda**; `EnglishSessionGame` é definido aqui (módulo puro) e reexportado por `src/types/index.ts` (`export type { EnglishSessionGame } from './english'`), como pede a seção 8. `EnglishGameSession.game` continua `EnglishGameId` (ver "Pontos em aberto").

```ts
export type Material = 'madeira' | 'pedra' | 'ferro' | 'redstone';
export type ContractType = 'merchant' | 'letter' | 'note' | 'forge';
export type BuildingId = 'fornalha' | 'bau' | 'cerca' | 'torre' | 'mesa' | 'campinho';
export type Relation = 'on' | 'in' | 'under' | 'next_to';
export type ContractStatus = 'open' | 'done';
export type LetterGenre = 'letter' | 'scout_report' | 'dialogue' | 'notice' | 'list';
export type LetterQuestionKind = 'decision' | 'comprehension' | 'inference';
export type NoteErrorTag = 'plural' | 'article' | 'verb' | 'spelling' | 'word_order' | 'preposition' | 'other';
export type ScaffoldStage = 0 | 1 | 2;
export type MaterialCount = 0 | 1 | 2 | 3;
export type EnglishSessionGame = EnglishGameId | ContractType;   // para englishSessions.game
export type PlanSource = 'ai' | 'offline' | 'mixed';

export interface MerchantSpot { id: string; label: string; image: string; relations: Relation[] }
export interface MerchantItem { id: string; label: string; plural: string; image: string }
export interface MerchantStep { item: string; qty: 1 | 2 | 3; relation: Relation; spot: string }
export interface MerchantPlacement { item: string; qty: number; relation: Relation; spot: string }   // estado final que a tela entrega
export interface MerchantContent { spots: MerchantSpot[]; items: { id: string; stock: number }[]; steps: MerchantStep[]; sentences: string[]; gapped: string[]; translation: string[] }

export interface LetterQuestion { kind: LetterQuestionKind; question: string; options: string[]; answer: number; evidence: string; explanation: string }
export interface LetterContent { genre: LetterGenre; title: string; sender: string; text: string; glossary: { en: string; pt: string }[]; questions: LetterQuestion[]; translation: string }

export interface NoteInfo { pt: string; en: string[] }
export interface NoteContent { brief: string; mustInclude: NoteInfo[]; templates: string[]; wordBank: string[]; model: string; hint: string }

export type ForgeItem =
  | { kind: 'scramble'; words: string[]; answer: string; rule: string; audio?: string }
  | { kind: 'gap'; sentence: string; options: string[]; answer: number; rule: string }
  | { kind: 'typed'; prompt: string; sentence: string; accepted: string[]; rule: string };
export type ForgeItemKind = ForgeItem['kind'];
export interface ForgeTarget { id: string; label: string; kind: 'order' | 'form' }   // ordem -> scramble; forma -> gap/typed
export interface ForgeContent { target: string; items: ForgeItem[] }

export interface ContractBase { id: string; type: ContractType; material: Material; theme: string; title: string; version: number; status: ContractStatus; result: ContractResult | null; retryUsed: boolean }
export type Contract = ContractBase & (
  | { type: 'merchant'; content: MerchantContent } | { type: 'letter'; content: LetterContent }
  | { type: 'note'; content: NoteContent } | { type: 'forge'; content: ForgeContent });

export interface NoteError { wrong: string; fix: string; tag: NoteErrorTag }
export interface NoteJudgement { isEnglish: boolean; errors: NoteError[]; missing: string[]; corrected: string; note: string; score: 0 | 1 | 2 | 3 }
export interface ContractOutcome { score: number; max: number; materialEarned: MaterialCount; answer?: string; correction?: NoteJudgement; details?: Record<string, unknown> }
export interface ContractResult extends ContractOutcome { rewarded: boolean; xp: number; gold: number; durationSec: number; finishedAt: string }

export interface DailyPlan { id: string; userId: string; date: string; level: number; status: 'generating' | 'ready'; generatingAt: string | null; order: string[]; contracts: Record<string, Contract>; rewardedIds: string[]; generatedAt: string | null; source: PlanSource; reviewedByParent: boolean; themeRequest: string | null }
export interface BaseDoc { userId: string; level: number; materials: Record<Material, number>; buildings: Record<BuildingId, number>; scaffoldStage: ScaffoldStage; noteStreak3: number; vocab: Record<string, { seen: number; lastDate: string }>; contractsDone: number; daysPlayed: number; streakDays: number; lastPlayedDate: string; themeRequest: string | null; updatedAt: string }
```

## 2. `src/config/englishLevels.ts`

```ts
export type LevelNumber = 1 | 2 | 3;
export interface EnglishLevel {
  level: LevelNumber; label: string;
  grammar: string[];                 // PT, painel
  promptAllowed: string[];           // EN, cartão "permitido" que entra no prompt
  promptForbidden: string[];         // EN, cartão "proibido"
  forbiddenTokens: string[];         // formas inteiras (was/were/did/going/irregulares/particípios/modais)
  maxWords: number;                  // 7 / 9 / 11
  letterWords: [number, number];     // 40-60 / 60-90 / 80-120 (letter, scout_report, dialogue)
  glossarySize: [number, number];    // 4-6 / 6-8 / 8-10
  letterQuestionKinds: LetterQuestionKind[];   // n1-2: decision, comprehension, comprehension; n3: ..., inference
  noteSentences: [number, number];   // [2,2] / [2,3] / [3,3]
  noteTemplates: string[];           // 5 moldes por nível, com ___
  noteInfoKinds: [string, string, string];     // EN: o que cada info do Recado pede (vai ao prompt)
  vocabThemes: string[];             // PT, 8 temas por nível
  forgeTargets: ForgeTarget[];       // 6 alvos por nível para a rotação da Ferraria
}
export const LEVELS: Record<LevelNumber, EnglishLevel>;
export const NUMBER_WORDS: string[];               // índice = valor, 'zero'..'twenty'
export const VERB_LEMMAS: string[];                // lemas para reconhecer -ing/-ed
export const LETTER_GENRES: LetterGenre[];
export const LETTER_GENRE_WORDS: Partial<Record<LetterGenre, [number, number]>>;   // notice 25-45, list 30-50
export const FORGE_TAG_TARGETS: Record<NoteErrorTag, ForgeTarget>;   // etiqueta do Recado -> alvo da Ferraria
export function levelFor(n: number): EnglishLevel;                   // limita a 1..3 (NaN -> 1)
export function letterWordRange(level: number, genre: LetterGenre): [number, number];
export function tokenize(text: string): string[];                    // minúsculas, apóstrofo preservado
export function ingLemma(token: string): string | null;              // 'running' -> 'run'; 'building' -> null
export function edLemma(token: string): string | null;               // 'played' -> 'play'; 'bed'/'seed' -> null
export function isTokenForbidden(token: string, level: number, prev?: string, next?: string, afterNext?: string): boolean;
export function findForbiddenTokens(text: string, level: number): string[];   // únicos, na ordem
```

Regras de `findForbiddenTokens`: lista de formas por nível + `-ed` por lema (todos os níveis) + `-ing` por lema nos níveis 1-2, liberado logo depois de like/likes/love/loves; nível 3 libera -ing e was/were. `going` não está na lista de nenhum nível: nos níveis 1-2 cai na regra do -ing (proibido fora de like/love), e `going to` + verbo da lista de lemas (futuro) é proibido em todos os níveis, enquanto `going to the mine` (movimento) passa. Nunca por sufixo solto (red/bed/need/king/morning/evening/building/tired/bored passam; testado com 30 armadilhas).

## 3. `src/config/englishBase.ts`

```ts
export type MaterialCost = Record<Material, number>;
export type PtGender = 'm' | 'f';
export const MATERIALS: Material[];
export const MATERIAL_LABELS: Record<Material, string>;      // Madeira, Pedra, Ferro, Redstone
export const MATERIAL_ICONS: Record<Material, string>;       // /assets/english/ui/base/mat_*.webp
export const CONTRACT_TYPES: ContractType[];
export const CONTRACT_LABELS: Record<ContractType, string>;  // Comerciante, Carta, Recado, Ferraria
export const CONTRACT_ICONS: Record<ContractType, string>;   // /assets/english/ui/base/c_*.webp
export const CONTRACT_MATERIAL: Record<ContractType, Material>;   // merchant madeira, letter pedra, note ferro, forge redstone

export interface BuildingDef { id: BuildingId; label: string; description: string; effect: string; icon: string; costs: [MaterialCost, MaterialCost, MaterialCost]; requiresCore: boolean }
export const BUILDINGS: BuildingDef[];                       // 6, na ordem da grade 3x2
export const BUILDING_BY_ID: Record<BuildingId, BuildingDef>;
export const BUILDING_MAX_LEVEL = 3;
export const TERRAIN_ICON: string;                           // b_terreno.webp (nível 0)
export function buildingCost(id: BuildingId, targetLevel: number): MaterialCost | null;   // cópia; null fora de 1..3
export function buildingIcon(id: BuildingId, level: number): string;
export function isBuildingUnlocked(id: BuildingId, buildings: Record<BuildingId, number>): boolean;  // torre/mesa/campinho exigem fornalha>=1 e bau>=1
export function canAfford(materials: MaterialCost, cost: MaterialCost): boolean;
export function missingMaterials(materials: MaterialCost, cost: MaterialCost): MaterialCost;
export function baseLevel(buildings: Record<BuildingId, number>): number;   // "Base nível N"
export const INITIAL_MATERIALS: MaterialCost;                // { madeira 0, pedra 0, ferro 1, redstone 0 }
export const INITIAL_BUILDINGS: Record<BuildingId, number>;  // todos 0
export function initialBaseDoc(userId: string, nowIso: string, level = 1): BaseDoc;

export const RELATIONS: Relation[];
export const RELATION_EN: Record<Relation, string>;          // on, in, under, next to
export const RELATION_PT: Record<Relation, string>;          // em cima de, dentro de, embaixo de, ao lado de
export interface MerchantSpotDef extends MerchantSpot { pt: string; ptGender: PtGender }
export interface MerchantItemDef extends MerchantItem { pt: string; ptPlural: string; ptGender: PtGender; pluralOnly?: boolean }
export const MERCHANT_SPOTS: MerchantSpotDef[];              // 12
export const MERCHANT_ITEMS: MerchantItemDef[];              // 17
export interface MerchantCatalogs { spots: MerchantSpotDef[]; items: MerchantItemDef[] }
export const MERCHANT_CATALOGS: MerchantCatalogs;
```

Custos (madeira, pedra, ferro, redstone), somando 3 / 5 / 8 e sempre com ferro >= 1:

| Construção | n1 | n2 | n3 | Efeito na Etapa 1 |
|---|---|---|---|---|
| fornalha | 1,1,1,0 | 1,2,1,1 | 2,3,2,1 | n1: +1 material no primeiro contrato do dia |
| bau | 2,0,1,0 | 2,1,1,1 | 3,2,2,1 | n1: libera Torre, Mesa e Campinho |
| cerca | 1,1,1,0 | 2,1,1,1 | 3,2,2,1 | Etapa 2 |
| torre | 0,2,1,0 | 1,2,1,1 | 1,3,2,2 | Etapa 2 (exige núcleo) |
| mesa | 1,0,1,1 | 1,1,1,2 | 2,1,2,3 | n1: escolhe o tema de amanhã (exige núcleo) |
| campinho | 1,1,1,0 | 2,1,1,1 | 2,2,2,2 | Etapa 2 (exige núcleo) |

Estado inicial: 1 ferro, Fornalha n1 custa 1 madeira + 1 pedra + 1 ferro, logo faltam 1 pedra + 1 madeira.

Lugares (id = label em inglês): door, window, fence (`next_to`, `under`); chest, box, oven, barrel (`in`, `on`, `next_to`); table, bed, shelf, rug, bench (`on`, `under`, `next_to`). Itens: torch, sword, book, ball, apple, banana, orange, map, clock, bucket, bone, cake, key, lamp, boots (`pluralOnly`), helmet, potion. Nenhum id de item coincide com lugar (testado).

## 4. `src/config/englishRewards.ts`

```ts
export const MAX_MATERIAL = 3;
export const MIN_XP = 5;
export const REWARDED_OTHER_SLOTS = 2;                  // além do Recado, 2 contratos premiados por dia
export const MERCHANT_TEXT_SHOWN_CAP: MaterialCount = 2;
export const FORGE_THRESHOLDS = { three: 5, two: 3 };
export const XP_BY_MATERIAL: Record<ContractType, [number, number, number, number]>;   // índice = material; merchant/letter/forge [5,8,12,16]; note [5,10,15,20]
export const GOLD_BY_MATERIAL: Record<ContractType, [number, number, number, number]>; // merchant/letter/forge [0,3,4,5]; note [0,4,6,8]
export const BUILD_XP: [number, number, number];        // [10, 15, 20]
export function merchantMaterial(hits: number, steps: number, textShown: boolean): MaterialCount;  // 3 todos / 2 errou 1 / 1 acertou >=1 / 0; teto 2 se textShown
export function letterMaterial(hits: number, evidenceOk: boolean, total = 3): MaterialCount;      // floor(pontos*3/total); evidenceOk=false só quando a decisão foi acertada sem evidência (vale meio)
export function noteMaterial(score: number): MaterialCount;                                       // nota = ferro
export function forgeMaterial(hits: number): MaterialCount;                                       // >=5 -> 3; 3-4 -> 2; senão 0 (aceita meio ponto)
export interface OutcomeParts { hits?: number; steps?: number; total?: number; textShown?: boolean; evidenceOk?: boolean; score?: number }
export function materialFor(type: ContractType, parts: OutcomeParts): MaterialCount;
export function rewardFor(type: ContractType, material: number, rewarded = true): { xp: number; gold: number };  // não premiado -> { xp: 5, gold: 0 }; material 0 -> { xp: 5, gold: 0 }
export function buildXp(level: number): number;         // 10/15/20 (nível alvo 1..3)
export function applyFurnaceBonus(material: MaterialCount, fornalhaLevel: number, firstOfDay: boolean): MaterialCount;  // +1 com teto 3; não sobe de 0
```

## 5. `src/services/english/shuffle.ts`

```ts
export type Rng = () => number;                                  // [0, 1)
export function seedFromString(s: string): number;              // FNV-1a 32 bits, nunca 0
export function mixSeed(seed: number, salt: number | string): number;   // semente derivada (por pergunta, por item)
export function createRng(seed: number): Rng;                   // xorshift32 (mesmo do mine/engine.ts)
export function randInt(rng: Rng, min: number, max: number): number;   // inclusivo
export function pickOne<T>(rng: Rng, arr: readonly T[]): T;
export function seededShuffle<T>(arr: readonly T[], seed: number | Rng): T[];   // não altera o original
export function shuffleOptions<T>(options: readonly T[], answer: number, seed: number | Rng): { options: T[]; answer: number };
```

`shuffleOptions` nunca devolve a ordem original quando há 2+ valores distintos (rotaciona quando o sorteio coincide) e devolve `answer` remapeado (testado em 1000 sementes).

## 6. `src/services/english/merchantRoom.ts`

```ts
export interface MerchantRoom { spots: MerchantSpot[]; items: { id: string; stock: number }[]; steps: MerchantStep[] }
export interface RoomEvaluation { hits: number; perStep: boolean[] }
export function roomSizeFor(level: number): number;             // 4 / 5 / 6
export function stepsFor(level: number): number;                // 2 / 3 / 4
export function buildMerchantRoom(seed: number, level: number, spotsCatalog?: MerchantSpotDef[], itemsCatalog?: MerchantItemDef[]): MerchantRoom;
export function itemPhrase(step: MerchantStep, def: MerchantItemDef, stock?: number): string;   // "the torch" | "an apple" (stock > 1) | "two apples"
export function offlineSentences(steps: MerchantStep[], catalogs?: MerchantCatalogs, items?: { id: string; stock: number }[]): { sentences: string[]; translations: string[] };
export function gapped(sentences: string[], steps: MerchantStep[], catalogs?: MerchantCatalogs): string[];   // item e lugar -> ___, número fica
export function evaluateRoom(steps: MerchantStep[], placements: MerchantPlacement[]): RoomEvaluation;         // item+qty+relação+lugar; cada colocação vale uma vez
export function buildMerchantContent(seed: number, level: number, catalogs?: MerchantCatalogs): MerchantContent;   // contrato inteiro por código (reserva)
```

Invariantes de `buildMerchantRoom` (testadas em 1000 sementes por nível): spots distintos; steps = 2/3/4; item nunca repete; relação sempre permitida pelo lugar; lugar só repete no nível 3; `items` = itens dos passos + 1 distrator; `stock` >= qty (às vezes qty+1, para obrigar a contar), máximo 3.

Frases de reserva: aberturas por passo `Put` / `Then put` / `Now put` / `Please put`; qty 1 usa `the` quando o item é único na bandeja, `a`/`an` quando há mais de um, `the` para boots; qty 2-3 usa número por extenso + plural (`torches`, `potions`). Tradução PT com gênero e contração (`em cima da mesa`, `dentro do baú`).

## 7. `src/services/english/notePrecheck.ts`

```ts
export const FUZZY_MIN_LENGTH = 4;                              // tokens menores exigem igualdade exata (dígitos, in/on, a/an)
export function stripAccents(s: string): string;
export function singularize(token: string): string;             // -ies -> y; -es após s/x/z/ch/sh; -s (exceções: is, this, yes, has, glass...)
export function normalizedTokens(text: string): string[];       // minúsculas, sem acento/pontuação, 'two' -> '2', sem plural
export function normalize(text: string): string;                // normalizedTokens(...).join(' ')
export function levenshtein(a: string, b: string): number;      // troca de letras vizinhas vale 1 ("sowrd" -> "sword")
export function tokenMatches(expected: string, actual: string): boolean;   // igual, ou distância <= 1 com 4+ letras
export function matchesInfo(text: string, info: NoteInfo): boolean;        // alguma variante com todos os tokens em ordem (pode haver palavras no meio)
export function missingInfos(text: string, mustInclude: NoteInfo[]): NoteInfo[];
export function plainTokens(text: string): string[];            // sem singularizar nem trocar números
export function wordDistance(a: string, b: string): number;     // distância em palavras (valida a edição mínima do juiz)
```

Fluxo do juiz (para `englishJudge.ts`): `missingInfos(texto, content.mustInclude)` -> se faltou, mostrar "Faltou dizer: <pt>" e dar 1 tentativa; depois `buildJudgePrompt` -> `callOpenAI` -> validar `corrected` com `wordDistance(texto, corrected) <= errors.length + 1` (senão descartar `corrected`) -> `noteScore` -> `noteMaterial` -> `nextScaffoldStage`.

## 8. `src/services/english/scoring.ts`

```ts
export type NoteErrorSeverity = 'ignored' | 'small' | 'blocking';
export const SMALL_FIX_MAX_LETTERS = 2;
export const SCAFFOLD_STEP = 2;
export function classifyNoteError(e: NoteError, level = 1): NoteErrorSeverity;
export function noteScore(j: Omit<NoteJudgement, 'score'>, level = 1): 0 | 1 | 2 | 3;
export function nextScaffoldStage(stage: ScaffoldStage, noteStreak3: number, score: number): { scaffoldStage: ScaffoldStage; noteStreak3: number };
export { merchantMaterial, letterMaterial, forgeMaterial, noteMaterial, materialFor, rewardFor, applyFurnaceBonus } from '../../config/englishRewards';
```

`classifyNoteError`: `article`/`plural`/`preposition` = pequeno; `verb`/`word_order`/`other` = bloqueante (o juiz usa `other` para palavra em português, bloqueante pela seção 4.5c; a distância em letras não reconhece "em" -> "in"); `spelling` = pequeno se o fix muda até 2 letras, senão bloqueante; só maiúscula/pontuação = ignorado; dígito no lugar do número por extenso = ignorado no nível 1, pequeno nos outros. `noteScore`: `!isEnglish` 0; `missing` ou bloqueante 1; 0 pequenos 3; 1-2 pequenos 2; 3+ pequenos 1. `nextScaffoldStage`: nota 3 soma a sequência; ao chegar a 2 sobe um estágio (máximo 2) e zera; nota < 3 zera.

## 9. `src/services/english/validators.ts`

```ts
export interface ValidationResult<T> { ok: boolean; content: T; problems: string[] }
export interface MerchantValidation extends ValidationResult<MerchantContent> { replaced: number[] }
export interface MerchantContentInput { spots: MerchantSpot[]; items: { id: string; stock: number }[]; steps: MerchantStep[]; sentences?: unknown; translation?: unknown; gapped?: unknown }
export const WORD_SLACK = 3;                 // folga sobre maxWords (frases do Comerciante, perguntas, modelo)
export const LETTER_WORD_SLACK = 0.1;        // folga proporcional na contagem da Carta
export const NOTE_BANK_RANGE: [number, number];   // [10, 14]
export const FORGE_ITEMS = 6;
export const SCRAMBLE_WORDS: [number, number];    // [4, 8]
export const SCRAMBLE_BANNED: string[];           // then, please, first, today, also
export const LETTER_OPTIONS = 4;
export const LETTER_MIN_QUESTIONS = 2;
export const LETTER_GLOSSARY_MIN = 4;        // glossário filtrado, em qualquer nível (seção 4.3)
export const GAP_OPTIONS = 3;
export const MERCHANT_FUNCTION_WORDS: string[];   // ~90 palavras funcionais
export function wordCount(text: string): number;
export function longestSentenceWords(text: string): number;   // maior frase (split em .!?); maxWords vale por frase
export function merchantAllowlist(catalogs?: MerchantCatalogs): Set<string>;
export function checkMerchantSentence(sentence: string, step: MerchantStep, catalogs: MerchantCatalogs, allow: Set<string>, maxWords: number): string | null;  // motivo ou null
export function validateMerchant(content: MerchantContentInput, level: number, catalogs?: MerchantCatalogs): MerchantValidation;
export function validateLetter(raw: unknown, level: number, vocabKnown: string[], seed?: number): ValidationResult<LetterContent>;
export function validateNote(raw: unknown, level: number): ValidationResult<NoteContent>;
export function validateForge(raw: unknown, level: number, seed?: number): ValidationResult<ForgeContent>;
```

- **validateMerchant**: `ok=false` só por estrutura (passos 2-4, sala 4-6, bandeja = passos + 1, item único, relação permitida, estoque suficiente). Cada frase precisa: sem dígito, `<= maxWords + 3` palavras, todas na allowlist, o substantivo na forma certa (singular para 1, plural para 2-3), para qty 1 um `the`/`a`/`an`/`one` antes do substantivo (com `a`/`an` conferido pela vogal quando vem colado ao substantivo; `boots` só aceita `the`), o número por extenso do passo e nenhum outro, o lugar e nenhum outro, nenhum outro item, exatamente uma preposição de lugar (`next` seguido de `to`). Frase reprovada é trocada pela de reserva (`replaced` guarda os índices; `problems` explica). `gapped` é sempre refeito por código; tradução vazia recebe a de reserva. Aceita `MerchantContent` direto.
- **validateLetter**: rejeita (`ok=false`) por texto vazio, contagem fora da faixa do gênero/nível (10% de folga), tokens proibidos no texto, glossário com menos de `LETTER_GLOSSARY_MIN` (4) entradas válidas em qualquer nível (só ficam entradas presentes no texto e fora de `vocabKnown`; corta no máximo do nível) e menos de 2 perguntas válidas. Pergunta é descartada por: enunciado vazio ou com alguma frase acima de `maxWords + 3` palavras (por frase: a decisão do nível 1 tem duas, "You have three emeralds and you need a fast player. Who do you hire?"), `answer` inválido, opções != 4 distintas, opção contida em outra, certa estritamente mais longa que todas, `evidence` fora do texto (comparação sem maiúsculas e com espaços colapsados), anti-cola (certa literal no texto e nenhuma distratora literal), tokens proibidos. Opções embaralhadas com `mixSeed(seed, 'q<i>')` e `answer` remapeado; `seed` padrão = `seedFromString(text)`. `kind` inválido vira `comprehension`; gênero inválido vira `letter`.
- **validateNote**: rejeita por brief vazio, `mustInclude` com menos de 3 infos válidas (mais de 3 corta), `model` vazio, `model` sem alguma info (pré-checagem), tokens proibidos no `model`, banco com menos de 10 após remover dígitos/números/repetições. Banco com mais de 14 é cortado (palavras do `model` primeiro). `templates`: o prompt não pede; ficam os moldes do nível, ou os da IA que tenham `___` e passem nos tokens proibidos (sem registrar problema). `hint` só no nível 3.
- **validateForge**: rejeita quando sobram menos de 6 itens válidos (mais de 6 corta). Scramble: resposta com 4-8 palavras, sem then/please/first/today/also, sem tokens proibidos; `words` refeito a partir da resposta quando difere; embaralhado com semente e nunca igual à resposta. Gap: `___` presente, 3 opções distintas (mais de 3 corta mantendo a certa), `answer` válido, embaralhado com `answer` remapeado. Typed: `prompt`, `___` e `accepted` não vazios. Frase repetida (normalizada) é descartada; `rule` vazia recebe uma padrão; `seed` padrão = `seedFromString(target)`.

## 10. `src/services/english/prompts.ts`

```ts
export interface BuiltPrompt { system: string; user: string; maxTokens: number }
export interface PromptInputBase { level: number; theme: string; vocabKnown: string[]; avoidNames: string[]; seed: number; retryProblems?: string[] }
export interface MerchantPromptInput extends PromptInputBase { steps: MerchantStep[]; sentences: string[]; items?: { id: string; stock: number }[]; catalogs?: MerchantCatalogs }
export interface LetterPromptInput extends PromptInputBase { genre: LetterGenre }
export type NotePromptInput = PromptInputBase;
export interface ForgePromptInput extends PromptInputBase { target: ForgeTarget; letterNames: string[]; letterItems: string[]; yesterdayMistakes: ForgeItem[] }
export type AnyPromptInput = MerchantPromptInput | LetterPromptInput | NotePromptInput | ForgePromptInput;
export interface JudgePromptInput { level: number; brief: string; mustInclude: NoteInfo[]; model: string; template: string | null; text: string }
export const PROMPT_MAX_TOKENS: Record<ContractType | 'judge', number>;   // merchant 400, letter 1500, note 700, forge 1400, judge 500
export const LETTER_GENRE_HINTS: Record<LetterGenre, string>;
export const NOTE_ERROR_TAGS: readonly NoteErrorTag[];
export function forgeItemMixFor(level: number, kind: 'order' | 'form'): { scramble: number; gap: number; typed: number };   // ordem 6 scramble; forma n1 4+2, n2 3+3, n3 2+4
export function buildPrompt(type: 'merchant', input: MerchantPromptInput): BuiltPrompt;
export function buildPrompt(type: 'letter', input: LetterPromptInput): BuiltPrompt;
export function buildPrompt(type: 'note', input: NotePromptInput): BuiltPrompt;
export function buildPrompt(type: 'forge', input: ForgePromptInput): BuiltPrompt;
export function buildPrompt(type: ContractType, input: AnyPromptInput): BuiltPrompt;   // sobrecarga genérica (loops sobre os 5 contratos)
export function buildJudgePrompt(input: JudgePromptInput): BuiltPrompt;
```

Todo prompt (em inglês) leva: cartão do nível (`promptAllowed`/`promptForbidden`/`maxWords`), tema (PT), vocabulário conhecido ("reuse about 60%, at most 6 new words"), nomes a evitar, semente, `retryProblems` (na retentativa) e o esquema JSON literal que o validador espera. Respostas esperadas (`callOpenAI` já usa `json_object`):

- merchant: `{ "sentences": string[], "translation": string[] }` (uma por passo, mesma ordem). Montar o `MerchantContentInput` com a sala de `buildMerchantRoom` + essas duas listas e chamar `validateMerchant`.
- letter: `{ genre, title, sender, text, glossary: [{en, pt}], questions: [{kind, question, options[4], answer, evidence, explanation}], translation }` -> `validateLetter`.
- note: `{ brief, mustInclude: [{pt, en[]}], wordBank, model, hint }` (sem `templates`; o validador preenche) -> `validateNote`.
- forge: `{ target, items: [...] }` -> `validateForge`. Alvo do dia: etiqueta mais frequente dos Recados dos últimos 5 planos (>= 2 ocorrências) via `FORGE_TAG_TARGETS[tag]`, senão rotação sobre `LEVELS[n].forgeTargets`.
- judge: `{ isEnglish, errors: [{wrong, fix, tag}], missing: string[] (pt), corrected, note }` -> `noteScore`.

## 11. Testes

- Harness próprio em `src/services/english/__tests__/harness.ts`: `test(name, fn)`, `expect(v).toBe/toEqual/toBeTruthy/toBeFalsy/toContain/toHaveLength/toBeGreaterThanOrEqual/toBeLessThanOrEqual/toMatch/toThrow` e `.not`, `run()` (imprime e marca exitCode 1). Cada arquivo termina com `void run()`.
- Runner `scripts/run-english-tests.mjs`: empacota cada `*.test.ts` com o esbuild do Vite (`--bundle --platform=node --format=cjs`) num diretório temporário e executa; sai com 1 se algo falhar. `npm run test:english`.
- Cobertura: sala válida em 1000 sementes x 3 níveis; frases offline (artigo, plural, tradução); `gapped`; `evaluateRoom`; pré-checagem com tabela de pares; 14 casos de nota; validadores com 1 exemplo bom e 6+ ruins por tipo; embaralhamento nunca igual e `answer` remapeado; tokens proibidos sem falso positivo; tabelas de recompensa, custos e existência dos ícones no disco.
- `adversarial.test.ts` (revisão independente): sala do nível 3 em 2000 sementes; 24 pares difíceis da pré-checagem (acento, dígito, transposição, plural, ordem, ausência); `other` bloqueante; `shuffleOptions` com 2 opções em 1000 sementes; a pergunta de decisão da especificação aceita; opção certa mais longa / empate; `evidence` parafraseada ou com espaços; glossário mínimo 4 no nível 3; `templates` sem ruído; artigo para qty 1; scramble já na ordem da resposta em 300 sementes; 30 palavras armadilha; `going to`.

## 12. Ícones (todos conferidos em `public/`)

- Materiais: `/assets/english/ui/base/mat_{madeira,pedra,ferro,redstone}.webp` (`MATERIAL_ICONS`).
- Construções: `/assets/english/ui/base/b_{fornalha,bau,cerca,torre,mesa,campinho}.webp`; nível 0: `b_terreno.webp` (`buildingIcon`).
- Contratos: `/assets/english/ui/base/c_{merchant,letter,note,forge}.webp` (`CONTRACT_ICONS`).
- Lugares: door `/assets/english/images/object_door.webp`; table `/assets/english/images/object_table.webp`; chest `/assets/english/ui/chest.webp`; bed `/assets/english/ui/bed.webp`; window/fence/box/oven/barrel/shelf/rug/bench `/assets/english/ui/base/s_<id>.webp`.
- Itens: torch/sword/map/clock/apple `/assets/english/ui/<id>.webp`; bone/bucket/cake/key/lamp/boots/helmet/potion `/assets/english/ui/base/i_<id>.webp`; book `/assets/english/images/object_book.webp`; ball `/assets/english/images/object_ball.webp`; banana `/assets/english/images/fruit_banana.webp`; orange `/assets/english/images/fruit_orange.webp`.

## Decisões e furos

1. **Lugares do Comerciante**: a especificação lista 14 nomes (com floor e wall) mas pede 12 e só há imagem para 12; floor e wall ficaram de fora.
2. **`boots`**: palavra só no plural; `plural` = `boots`, qty 1 vira `the boots` (nunca `a boots`); qty 2-3 vira `two boots`. Marcado com `pluralOnly` no catálogo.
3. **Artigo nas frases de reserva**: `the` quando o item é único na bandeja, `a`/`an` quando há mais de um (exercita a/an do nível 1); qty 2-3 sem artigo. O validador exige `a`/`an`/`one`/`the` antes do substantivo para qty 1 (e reprova "a apple"/"an torch"/"a boots").
4. **Carta, "decisão sem evidência vale meio"**: `letterMaterial(hits, evidenceOk, total)` desconta 0,5 acerto quando `evidenceOk=false` e faz `floor(pontos * 3 / total)`; o chamador passa `evidenceOk=false` só quando a decisão foi acertada sem a evidência ser encontrada. `total` = perguntas válidas (3, ou 2 quando o validador descartou uma).
5. **Ferraria sem material 1**: seguindo a tabela (>=5 -> 3; 3-4 -> 2; senão 0). Acerto na 2ª tentativa vale 0,5 e entra em `hits` como fração.
6. **XP de tentativa**: `rewardFor(type, 0)` e `rewardFor(type, m, false)` pagam `{ xp: 5, gold: 0 }`; a transação decide `rewarded` (Recado sempre; mais os 2 primeiros com material > 0).
7. **Nota do Recado, erros "spelling"/"other"**: `spelling` é pequeno se o fix muda até 2 letras (com transposição valendo 1), bloqueante acima disso; `other` é sempre bloqueante, porque o prompt do juiz reserva `other` para palavra em português (bloqueante na seção 4.5c) e a distância em letras não distingue "em" -> "in" de uma grafia. Dígito no lugar do número: ignorado no nível 1, pequeno nos outros. `noteScore(j, level)` ganhou o parâmetro `level` (padrão 1) por causa disso.
8. **Recado nível 1, "3ª informação"**: a especificação diz ao mesmo tempo que a 3ª informação é "para quem/onde" e que ela é "uma terceira do nível". Adotado por nível (`noteInfoKinds`): n1 = quantidade+item, segunda quantidade+item ou cor/tamanho, para quem/onde; n2 = quantidade+item, para quem/onde, motivo com because ou can/can't; n3 = quantidade+item, finalidade (to/for -ing), presente contínuo ou must.
9. **`can` no nível 1**: não está na lista proibida porque as frases do Comerciante usam "Can you put..." (a própria especificação). `can't`/`cannot` seguem proibidos no nível 1. **`going`** saiu das listas dos níveis 1-2 (reprovava "I like going", gramática do nível 2): o -ing por lema já cobre `going` fora de like/love, e `going to` + verbo é proibido em todos os níveis.
10. **`left`, `read`, `put`, `cut`, `set`** não entram na lista de passados irregulares por serem ambíguos (left = esquerda, read = presente). Nomes em -ing/-ed que são substantivos (`building`, `bed`, `seed`...) têm lista de exceção.
11. **Gêneros curtos da Carta**: `notice` 25-45 e `list` 30-50 palavras em todos os níveis (a especificação não os escalona por nível); os outros gêneros usam `letterWords` do nível. Folga de 10% para cima e para baixo na contagem. **Glossário**: `glossarySize` do nível vai só ao prompt; o validador exige 4 (seção 4.3), senão o nível 3 reprovaria toda carta cujo glossário caísse abaixo de 8 depois do filtro por `vocabKnown`.
12. **Nível 1 e a 3ª pessoa (-s)**: a checagem por token não detecta `he likes` (não há lista de formas -s); fica só no cartão do prompt.
13. **`MerchantContent` não carrega `pt`/`ptGender`** dos catálogos (o plano fica enxuto); a tela que precisar da tradução de um lugar/item consulta `MERCHANT_CATALOGS` pelo id.
14. **`ContractOutcome.details`** sugeridos pela especificação (`listens`, `textShown`, `glossaryHovers`, `evidenceHits`) não têm tipo próprio: continuam `Record<string, unknown>`; `materialFor` lê só `hits/steps/total/textShown/evidenceOk/score`.
15. **Validadores recebem `unknown`** (JSON cru da IA) para letter/note/forge; `validateMerchant` recebe `MerchantContentInput` (sala do código + `sentences`/`translation` crus). Assim o serviço de IA não precisa de casts.
16. **Semente dos validadores**: `validateLetter`/`validateForge` aceitam `seed` opcional; sem ele usam `seedFromString(text|target)`. O serviço de IA deve passar a semente do dia para o embaralhamento ser reproduzível.
17. **Esquema de retentativa**: `retryProblems` em `PromptInputBase`; o serviço passa `problems` do validador na segunda chamada.
18. **Tamanho das perguntas da Carta é por frase**: `maxWords + 3` vale para cada frase do enunciado (`longestSentenceWords`), não para o enunciado inteiro; o prompt diz o mesmo. Sem isso a pergunta de decisão do nível 1 da especificação (2 frases, 14 palavras) era descartada.
19. **Pré-checagem com transposição**: `levenshtein` conta a troca de letras vizinhas como 1 ("sowrds" casa com "swords"), o erro de digitação mais comum. Preço conhecido da folga de 1 letra: "cake" casa com "cave" (o juiz corrige depois).

## Pontos em aberto para os próximos agentes

- **`EnglishGameSession.game`** (`src/types/index.ts`) continua `EnglishGameId`. A seção 3 pede `game: EnglishSessionGame` em `englishSessions`; ampliar o campo quebra `GAME_INFO[s.game]` em `src/components/parent/EnglishProgressPanel.tsx:67` (Record por `EnglishGameId`). Quem gravar sessões de contrato deve ampliar o campo e trocar aquele acesso por um `Partial`/guarda. `recordRound` e `computeReward` seguem só para os jogos antigos.
- **Sorteio do gênero da Carta** "sem repetir os 2 últimos" e **alvo da Ferraria** (etiqueta mais frequente dos últimos 5 planos, senão rotação sobre `forgeTargets`) não têm função pura aqui; `englishAi.ts` implementa com `LETTER_GENRES`, `FORGE_TAG_TARGETS` e `LEVELS[n].forgeTargets`.
- **Bônus da Fornalha com material 0**: `applyFurnaceBonus` não sobe de 0 para 1 (a especificação não diz; assim "0 material = só XP de tentativa" continua valendo).
- **`letterMaterial(hits, evidenceOk, total)`**: quem decide `evidenceOk` é a tela da Carta (`details.evidenceHits`); a especificação não define como a evidência é "acertada" pela criança.
- **Pré-checagem**: tokens com menos de 4 letras exigem igualdade exata (`FUZZY_MIN_LENGTH`), diferente do "Levenshtein <= 1 por token" literal, para não aceitar `in` por `on` nem `2` por `3`; palavras em -ss não singularizam ("swordss" não casa).
- **Tokens proibidos**: adjetivos em -ed com lema de verbo (`closed`, `lost`, `used`) são reprovados em todos os níveis; a 3ª pessoa `-s` do nível 1 e "to + verbo" não são detectados por token (só no cartão do prompt).
- **`wordBank`**: o validador não confere se as palavras necessárias ao `model` estão no banco nem se há plural (forma base é pedida só no prompt).
- **Lugares floor/wall** ficaram fora (sem imagem); `notice`/`list` com faixa fixa em todos os níveis.
- **Prompts** ainda não foram rodados contra a API real (`scripts/generate-english-example.mjs`, seção 8); `PROMPT_MAX_TOKENS` é estimativa.
