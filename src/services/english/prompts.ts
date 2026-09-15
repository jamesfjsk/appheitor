// ========================================
// Arena de Inglês: prompts por tipo de contrato e do juiz do Recado (seção 4)
// Os prompts são em inglês (o modelo escreve conteúdo em inglês com traduções em PT).
// Cada prompt traz o cartão do nível, tema, vocabulário conhecido, nomes a evitar,
// semente e o esquema JSON literal que o validador correspondente espera.
// Módulo puro, roda em Node.
// ========================================

import type { ContractType, ForgeItem, ForgeTarget, LetterGenre, MerchantStep, NoteInfo } from '../../types/english';
import { MERCHANT_CATALOGS, RELATION_EN, type MerchantCatalogs } from '../../config/englishBase';
import { NUMBER_WORDS, letterWordRange, levelFor, type EnglishLevel } from '../../config/englishLevels';

export interface BuiltPrompt {
  system: string;
  user: string;
  maxTokens: number;
}

export interface PromptInputBase {
  level: number;
  /** Tema do dia em PT (ou themeRequest da Mesa) */
  theme: string;
  /** Lemas que a criança já viu */
  vocabKnown: string[];
  /** Nomes e remetentes dos últimos 7 dias */
  avoidNames: string[];
  seed: number;
  /** Problemas da validação anterior (retentativa cita o token/regra reprovada) */
  retryProblems?: string[];
}

export interface MerchantPromptInput extends PromptInputBase {
  steps: MerchantStep[];
  /** Frases de reserva (offlineSentences), uma por passo */
  sentences: string[];
  items?: { id: string; stock: number }[];
  catalogs?: MerchantCatalogs;
}

export interface LetterPromptInput extends PromptInputBase {
  genre: LetterGenre;
}

export type NotePromptInput = PromptInputBase;

export interface ForgePromptInput extends PromptInputBase {
  target: ForgeTarget;
  /** Continuidade com a Carta do dia */
  letterNames: string[];
  letterItems: string[];
  /** Itens errados ontem (2 deles voltam com distratores novos) */
  yesterdayMistakes: ForgeItem[];
}

export type AnyPromptInput = MerchantPromptInput | LetterPromptInput | NotePromptInput | ForgePromptInput;

export interface JudgePromptInput {
  level: number;
  brief: string;
  mustInclude: NoteInfo[];
  model: string;
  /** Molde mostrado na tela (null nos estágios sem molde) */
  template: string | null;
  /** Texto escrito pela criança */
  text: string;
}

export const PROMPT_MAX_TOKENS: Record<ContractType | 'judge', number> = {
  merchant: 400,
  letter: 1500,
  note: 700,
  forge: 1800,
  judge: 500,
};

/** Quantos itens de cada tipo a Ferraria pede; alvo de ordem = só scramble */
export function forgeItemMixFor(level: number, kind: ForgeTarget['kind']): { scramble: number; gap: number; typed: number } {
  if (kind === 'order') return { scramble: 6, gap: 0, typed: 0 };
  const lv = levelFor(level).level;
  if (lv === 1) return { scramble: 0, gap: 4, typed: 2 };
  if (lv === 2) return { scramble: 0, gap: 3, typed: 3 };
  return { scramble: 0, gap: 2, typed: 4 };
}

export const LETTER_GENRE_HINTS: Record<LetterGenre, string> = {
  letter: 'a short personal letter from a neighbor of the base (greeting, news, a request, sign-off)',
  scout_report: 'a scout report about a player or a place: name, position or location, strengths, one problem, a price in emeralds',
  dialogue: 'a dialogue between two characters, one turn per line (separate the turns with \\n inside the JSON string); each line starts with the speaker name and a colon',
  notice: 'a notice pinned on the village board: rules, an event or a warning, short lines',
  list: 'a list with a title and numbered or bulleted lines (shopping list, plan for the day, team lineup)',
};

const bullet = (items: string[]): string => items.map((s) => `- ${s}`).join('\n');

/** Palavras de pergunta da Carta por nível; "never" cita as formas proibidas que o modelo mais tenta usar */
const LETTER_QUESTION_WORDS: Record<1 | 2 | 3, { allowed: string; never: string }> = {
  1: { allowed: 'what, where, who, which, how many, is/are, do you', never: 'does, did, was, were, will, can\'t' },
  2: { allowed: 'what, where, who, which, why, how many, is/are, do/does, can', never: 'did, was, were, will, must' },
  3: { allowed: 'what, where, who, which, why, how many, is/are, do/does, can, was/were, must', never: 'did, will, would, should' },
};

function levelCard(lv: EnglishLevel): string {
  return [
    `LEVEL CARD (level ${lv.level} of 3)`,
    'Allowed grammar:',
    bullet(lv.promptAllowed),
    'Forbidden (never use, not even in questions or options):',
    bullet(lv.promptForbidden),
    `Maximum words per sentence: ${lv.maxWords}. Numbers 1-20 are written as words (two, three).`,
  ].join('\n');
}

function commonSystem(lv: EnglishLevel, role: string): string {
  return [
    `You write English learning content for a 10-year-old Brazilian beginner who plays a Minecraft-style game about building a base. ${role}`,
    'Learner-facing text is simple English inside the level card. Every translation, hint, rule and explanation is in Brazilian Portuguese (pt-BR).',
    'Reply with ONE JSON object only, no markdown, no comments, exactly the keys of the schema.',
    levelCard(lv),
  ].join('\n\n');
}

function commonUser(input: PromptInputBase): string {
  const known = input.vocabKnown.length ? input.vocabKnown.join(', ') : '(none yet)';
  const avoid = input.avoidNames.length ? input.avoidNames.join(', ') : '(none)';
  const lines = [
    `Theme of the day (in Portuguese, keep the story around it): ${input.theme}`,
    `Known vocabulary: ${known}`,
    'Reuse about 60% of the known vocabulary; introduce at most 6 new words.',
    `Names and senders to avoid (used recently): ${avoid}`,
    `Variation seed: ${input.seed >>> 0}. Use it to vary characters, objects and situations so two days never look alike.`,
  ];
  if (input.retryProblems && input.retryProblems.length) {
    lines.push('The previous answer was rejected by the validator. Fix these problems:', bullet(input.retryProblems));
  }
  return lines.join('\n');
}

// ---------- Comerciante ----------

function merchantPrompt(input: MerchantPromptInput): BuiltPrompt {
  const lv = levelFor(input.level);
  const catalogs = input.catalogs ?? MERCHANT_CATALOGS;
  const stepLines = input.steps.map((s, i) => {
    const item = catalogs.items.find((it) => it.id === s.item);
    const noun = s.qty === 1 ? item?.label ?? s.item : item?.plural ?? `${s.item}s`;
    return `Step ${i + 1}: quantity=${NUMBER_WORDS[s.qty]}, item=${noun}, preposition="${RELATION_EN[s.relation]}", place=${s.spot}. Reference: "${input.sentences[i] ?? ''}"`;
  });
  const system = commonSystem(lv, 'You voice the merchant who gives spoken instructions to place objects in a room.');
  const user = [
    commonUser(input),
    'Rewrite each reference sentence with natural variation (Put / Can you put / First..., then / Please / Now) and translate it.',
    'Hard rules for every sentence:',
    bullet([
      'keep the same quantity (as a word), the same item noun (singular for one, plural for two or three), the same preposition and the same place',
      'one instruction per sentence; never mention another item or another place',
      `at most ${lv.maxWords + 3} words; only simple words: put/place/give, can you, please, first, then, now, the, a, an, and, numbers, item and place names`,
      'no digits, no pronouns for the item (say the noun), no forbidden grammar',
    ]),
    'Steps:',
    stepLines.join('\n'),
    'Schema (arrays have one entry per step, same order):',
    '{ "sentences": ["Put two apples on the table."], "translation": ["Coloque duas maçãs em cima da mesa."] }',
  ].join('\n\n');
  return { system, user, maxTokens: PROMPT_MAX_TOKENS.merchant };
}

// ---------- Carta ----------

function letterPrompt(input: LetterPromptInput): BuiltPrompt {
  const lv = levelFor(input.level);
  const [minW, maxW] = letterWordRange(lv.level, input.genre);
  const [gMin, gMax] = lv.glossarySize;
  // Pede 5 perguntas (as 3 do nível + 2 extras dos mesmos tipos): o validador fica com as 3 primeiras válidas,
  // e o gpt-4.1-mini perde cerca de metade das perguntas nas regras de opções
  const kindList = [...lv.letterQuestionKinds, lv.letterQuestionKinds[1], lv.letterQuestionKinds[2]];
  const kinds = kindList.map((k, i) => `${i + 1}: ${k}`).join(', ');
  const frames =
    lv.level === 1
      ? ' Frames that work at this level: "Where is the ...?", "How many ... are there?", "What color is the ...?", "Who has the ...?", "What is in the ...?", "Is the ... big or small?"'
      : '';
  const decisionExample =
    lv.level === 1
      ? 'Decision question example: "You have three emeralds and you need a fast player. Who do you hire?" (the restriction is inside the question).'
      : 'Decision question: the reader must choose something using two facts from the text.';
  const inference = lv.level === 3 ? 'The inference question asks something the text implies but does not say word by word.' : '';
  // Alvo no meio da faixa: sem isso o modelo entrega textos curtos (29-35 palavras para 40-60)
  const targetWords = Math.round((minW + maxW) / 2);
  const targetSentences = Math.ceil(targetWords / Math.max(4, lv.maxWords - 2));
  const questionWords = LETTER_QUESTION_WORDS[lv.level];
  // Repetida junto da regra do glossário: longe dela o modelo ignora a lista
  const knownInline = input.vocabKnown.length ? input.vocabKnown.slice(0, 80).join(', ') : '(none yet)';
  const system = commonSystem(lv, 'You write a short reading text with questions.');
  const user = [
    commonUser(input),
    `Genre: ${input.genre} = ${LETTER_GENRE_HINTS[input.genre]}. Use a new sender name.`,
    `Length of "text": ${minW}-${maxW} words. Aim for about ${targetWords} words (around ${targetSentences} short sentences) and count them: a text under ${minW} words is rejected.`,
    `Glossary: the NEW words of the text. ${gMin}-${gMax} entries; each "en" is a word that appears in the text and is NOT in the known vocabulary (a known word is never a glossary entry), written exactly as it appears in the text (if the text says "tools", write "tools", not "tool"); "pt" is the Portuguese meaning.`,
    `New words: on purpose, put ${gMin + 1}-${gMax} theme words the learner has NOT seen into the text (football: goalkeeper, whistle, net, referee, boots; mine: pickaxe, lantern, rope, tunnel, ladder; adjectives: lazy, brave, heavy) and list exactly those in the glossary. Entries that are known or absent are dropped, and fewer than 4 left rejects the whole text. Known words that can NOT be glossary entries: ${knownInline}.`,
    'Write the text so it gives material for wrong answers: mention at least two different numbers, two different places and two different objects or people.',
    `Questions: write ${kindList.length} questions in English (the game keeps the first 3 that pass validation), at most ${lv.maxWords} words per sentence (a question may have two short sentences), kinds in this order: ${kinds}. ${decisionExample} ${inference}`.trim(),
    `Question words: ${questionWords.allowed}. Never ${questionWords.never}.${frames}`,
    'Options: 4 per question. The validator enforces every rule below and discards a question that breaks one:',
    bullet([
      'all 4 in English, same grammatical form and the SAME number of words (count them: four 3-word places, four 1-word numbers...)',
      'at least two WRONG options are words or phrases copied word by word from the text about something else (for "Where is the map?" use places the text gives for other objects; for "How many...?" use other numbers that appear in the text)',
      'the correct option must not be the longest one',
      'no option may contain another option (not "the ball" and "the red ball")',
      '"answer" is the index (0-3) of the correct option',
      '"evidence" is ONE continuous piece copied EXACTLY from the text (same words, same order; never two sentences taken from different places) that proves the answer',
      '"explanation" is one line in Portuguese saying why',
    ]),
    'Example for a text that says "The torch is on the wall. The map is in the chest. The key is under the bed.": question "Where is the map?", options ["on the wall", "in the chest", "under the bed", "on the table"], answer 1: all options have three words and three of them are copied from the text.',
    '"translation" is the full text in Portuguese.',
    'Schema:',
    '{ "genre": "letter", "title": "...", "sender": "...", "text": "...", "glossary": [{ "en": "lazy", "pt": "preguiçoso" }], "questions": [{ "kind": "decision", "question": "...", "options": ["...", "...", "...", "..."], "answer": 0, "evidence": "...", "explanation": "..." }], "translation": "..." }',
  ].join('\n\n');
  return { system, user, maxTokens: PROMPT_MAX_TOKENS.letter };
}

// ---------- Recado ----------

function notePrompt(input: NotePromptInput): BuiltPrompt {
  const lv = levelFor(input.level);
  const [sMin, sMax] = lv.noteSentences;
  const sentences = sMin === sMax ? `${sMin}` : `${sMin}-${sMax}`;
  const system = commonSystem(lv, 'You create a short writing task: the learner writes a note in English from a brief in Portuguese.');
  const user = [
    commonUser(input),
    'The brief is in Portuguese and asks the learner to write a note with exactly 3 pieces of information:',
    bullet(lv.noteInfoKinds.map((k, i) => `info ${i + 1}: ${k}`)),
    'Rules:',
    bullet([
      '"brief": 1-2 sentences in Portuguese, natural, e.g. "Peça ao ferreiro 2 espadas e diga que são para a caverna." It mentions ONLY the 3 infos (no extra items, numbers or details) and never gives the English words.',
      '"mustInclude": the 3 infos in the same order as the brief; "pt" is how a hint would describe it in Portuguese ("2 espadas"); "en" lists 3-5 accepted English variants of the SAME info, each 2-5 words: the first one is the exact phrase copied from the model answer, the others are short wordings a child would type ("two swords", "2 swords", "two sword"); for a recipient, place or reason include the preposition or connector ("for the dog", "to the dog", "in the cave", "because it is dark")',
      `"model": a correct answer with ${sentences} sentences, each at most ${lv.maxWords} words, that contains WORD BY WORD one "en" variant of each info; the validator checks this literally, so if the model says "for the mine team" that exact phrase must be one of the variants`,
      '"wordBank": 10-14 English words in base form: every content word of the model (nouns in singular, verbs, adjectives, prepositions) plus 3 distractor content words; no number words (one, two...), no digits, no a/an/the, no pronouns, no capital letters',
      lv.level === 3
        ? '"hint": one line in Portuguese describing the structure to use (e.g. "Frase 1: o que está acontecendo; frase 2: quantidade; frase 3: para quê")'
        : '"hint": empty string ""',
      'no forbidden grammar anywhere, including the model',
    ]),
    'Schema:',
    '{ "brief": "...", "mustInclude": [{ "pt": "2 espadas", "en": ["two swords", "2 swords"] }, { "pt": "...", "en": ["..."] }, { "pt": "...", "en": ["..."] }], "wordBank": ["need", "sword", "..."], "model": "I need two swords. They are for the cave.", "hint": "" }',
  ].join('\n\n');
  return { system, user, maxTokens: PROMPT_MAX_TOKENS.note };
}

// ---------- Ferraria ----------

function forgeItemSummary(item: ForgeItem): string {
  if (item.kind === 'scramble') return `scramble: "${item.answer}"`;
  if (item.kind === 'gap') return `gap: "${item.sentence}" -> "${item.options[item.answer] ?? ''}"`;
  return `typed: "${item.sentence}" -> "${item.accepted[0] ?? ''}"`;
}

function forgePrompt(input: ForgePromptInput): BuiltPrompt {
  const lv = levelFor(input.level);
  const mix = forgeItemMixFor(lv.level, input.target.kind);
  const mixText = [
    mix.scramble ? `${mix.scramble} "scramble"` : '',
    mix.gap ? `${mix.gap} "gap"` : '',
    mix.typed ? `${mix.typed} "typed"` : '',
  ]
    .filter(Boolean)
    .join(', ');
  const names = input.letterNames.length ? input.letterNames.join(', ') : '(none)';
  const items = input.letterItems.length ? input.letterItems.join(', ') : '(none)';
  const mistakes = input.yesterdayMistakes.slice(0, 2).map(forgeItemSummary);
  const system = commonSystem(lv, 'You create 8 grammar drill items for the blacksmith (the Forge); the game keeps the first 6 valid ones.');
  const user = [
    commonUser(input),
    `Target of the day: ${input.target.label} (kind: ${input.target.kind === 'order' ? 'word ORDER' : 'word FORM'}). Every item drills this target.`,
    `Item mix: ${mixText}, plus 2 spare items of the same kinds: 8 items in total, every sentence different (a repeated or invalid item is dropped and a spare takes its place).`,
    `Continuity: reuse these names and objects from today's letter when natural: names ${names}; objects ${items}.`,
    mistakes.length
      ? `Two of the six items must re-test these mistakes from yesterday with NEW distractors and a slightly different sentence:\n${bullet(mistakes)}`
      : 'There are no mistakes from yesterday.',
    'Rules per kind:',
    bullet([
      '"scramble": "answer" is a correct sentence of 4-8 words (count them; "next to" is two words) with its articles kept ("next to the goal", never "next to goal"); "words" is the same words in lowercase without punctuation (the game shuffles them); never use then, please, first, today or also',
      '"gap": "sentence" contains exactly one "___"; "options" has 3 different choices of the same kind (e.g. is/are/am); "answer" is the index of the correct one',
      '"typed": "prompt" is one line in Portuguese telling what to type (e.g. "Escreva o plural de torch"); "sentence" contains one "___"; "accepted" lists every correct spelling',
      '"rule": one line in Portuguese explaining the rule, shown when the learner misses',
      'no sentence repeats across items; no forbidden grammar',
    ]),
    'Schema:',
    '{ "target": "...", "items": [ { "kind": "scramble", "words": ["the", "put", "on", "torch", "table", "the"], "answer": "Put the torch on the table.", "rule": "..." }, { "kind": "gap", "sentence": "There ___ two swords.", "options": ["is", "are", "am"], "answer": 1, "rule": "..." }, { "kind": "typed", "prompt": "Escreva o plural de torch", "sentence": "I need two ___.", "accepted": ["torches"], "rule": "..." } ] }',
  ].join('\n\n');
  return { system, user, maxTokens: PROMPT_MAX_TOKENS.forge };
}

export function buildPrompt(type: 'merchant', input: MerchantPromptInput): BuiltPrompt;
export function buildPrompt(type: 'letter', input: LetterPromptInput): BuiltPrompt;
export function buildPrompt(type: 'note', input: NotePromptInput): BuiltPrompt;
export function buildPrompt(type: 'forge', input: ForgePromptInput): BuiltPrompt;
export function buildPrompt(type: ContractType, input: AnyPromptInput): BuiltPrompt;
export function buildPrompt(type: ContractType, input: AnyPromptInput): BuiltPrompt {
  switch (type) {
    case 'merchant':
      return merchantPrompt(input as MerchantPromptInput);
    case 'letter':
      return letterPrompt(input as LetterPromptInput);
    case 'note':
      return notePrompt(input as NotePromptInput);
    case 'forge':
      return forgePrompt(input as ForgePromptInput);
  }
}

// ---------- Juiz do Recado ----------

export const NOTE_ERROR_TAGS = ['plural', 'article', 'verb', 'spelling', 'word_order', 'preposition', 'other'] as const;

export function buildJudgePrompt(input: JudgePromptInput): BuiltPrompt {
  const lv = levelFor(input.level);
  const system = [
    'You are an English teacher correcting a note written by a 10-year-old Brazilian beginner. Be precise, fair and brief.',
    'Reply with ONE JSON object only, no markdown.',
    levelCard(lv),
    'Correction rules:',
    bullet([
      'ignore capitalization and punctuation completely',
      lv.level === 1
        ? 'digits instead of number words (2 instead of two) are NOT errors at this level; if you see one, mention the written form in "note" without counting it'
        : 'digits instead of number words count as one "spelling" error',
      'each entry of "errors" is one real mistake: "wrong" is the exact piece of the learner text, "fix" is the corrected piece, "tag" is one of ' + NOTE_ERROR_TAGS.join('/'),
      'use "verb" for a missing or wrong verb, "word_order" for order that changes the meaning, "spelling" for a misspelled English word, "other" only for a Portuguese word or a wrong word that breaks the sentence (it counts as a serious error; never use it for style)',
      '"missing": the "pt" of each required info that is absent from the learner text (empty array when all are present)',
      '"corrected": the learner text with the MINIMAL edits that fix the listed errors; keep the learner wording and word order whenever it is acceptable; do not rewrite it as the model',
      '"note": one line in Portuguese with the rule behind the main error (e.g. "Depois de two o substantivo vai para o plural: two swords."); never praise; empty string when there are no errors',
      '"isEnglish": false only when the text is not an attempt to write English (Portuguese, gibberish or empty)',
    ]),
  ].join('\n\n');
  const infos = input.mustInclude.map((m, i) => `info ${i + 1}: ${m.pt} (accepted: ${m.en.join(' | ')})`);
  const user = [
    `Brief given to the learner (Portuguese): ${input.brief}`,
    'Required information:',
    bullet(infos),
    `Model answer (reference only, other correct wordings are fine): ${input.model}`,
    input.template ? `Template shown on screen: ${input.template}` : 'No template was shown.',
    `Learner text:\n"""\n${input.text}\n"""`,
    'Schema:',
    '{ "isEnglish": true, "errors": [{ "wrong": "two sword", "fix": "two swords", "tag": "plural" }], "missing": [], "corrected": "...", "note": "..." }',
  ].join('\n\n');
  return { system, user, maxTokens: PROMPT_MAX_TOKENS.judge };
}
