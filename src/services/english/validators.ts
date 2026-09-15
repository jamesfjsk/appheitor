// ========================================
// Arena de Inglês: validadores por tipo de contrato (seção 4), "conserta antes de rejeitar"
// Recebem o JSON cru da IA (unknown) e devolvem { ok, content consertado, problems }.
// problems[] em PT serve de dica na retentativa e de registro no painel.
// Módulo puro, roda em Node.
// ========================================

import type {
  ForgeContent,
  ForgeItem,
  LetterContent,
  LetterGenre,
  LetterQuestion,
  LetterQuestionKind,
  MerchantContent,
  MerchantStep,
  NoteContent,
  NoteInfo,
} from '../../types/english';
import { MERCHANT_CATALOGS, RELATION_EN, type MerchantCatalogs } from '../../config/englishBase';
import { LETTER_GENRES, NUMBER_WORDS, findForbiddenTokens, letterWordRange, levelFor, tokenize } from '../../config/englishLevels';
import { gapped, offlineSentences } from './merchantRoom';
import { missingInfos, normalize, normalizedTokens, singularize } from './notePrecheck';
import { mixSeed, seedFromString, seededShuffle, shuffleOptions } from './shuffle';

export interface ValidationResult<T> {
  ok: boolean;
  content: T;
  problems: string[];
}

export interface MerchantValidation extends ValidationResult<MerchantContent> {
  /** Índices dos passos cuja frase foi trocada pela de reserva */
  replaced: number[];
}

/** Sala montada por código + resposta crua da IA (sentences/translation) */
export interface MerchantContentInput {
  spots: MerchantContent['spots'];
  items: MerchantContent['items'];
  steps: MerchantStep[];
  sentences?: unknown;
  translation?: unknown;
  gapped?: unknown;
}

/** Folga de palavras sobre maxWords para frases geradas (Comerciante, perguntas, modelo) */
export const WORD_SLACK = 3;
/** Folga proporcional na contagem de palavras da Carta */
export const LETTER_WORD_SLACK = 0.1;
export const NOTE_BANK_RANGE: [number, number] = [10, 14];
export const FORGE_ITEMS = 6;
export const SCRAMBLE_WORDS: [number, number] = [4, 8];
export const SCRAMBLE_BANNED = ['then', 'please', 'first', 'today', 'also'];
/** Depois de preposição de lugar o substantivo precisa de artigo, possessivo ou número ("next to goal" não ensina inglês) */
const PLACE_PREPOSITIONS = ['on', 'in', 'under', 'at', 'behind', 'near', 'from', 'into', 'onto'];
/** expressões fixas sem artigo (at home, at night, in bed, on Sunday) */
const BARE_NOUNS_OK = ['home', 'night', 'school', 'work', 'bed', 'noon', 'midnight', 'breakfast', 'lunch', 'dinner', 'time', 'tv', 'class', 'practice', 'sea', 'church', 'town', 'foot', 'front', 'top', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'it', 'them', 'me', 'you', 'him', 'her', 'us'];
const DETERMINERS = ['the', 'a', 'an', 'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that', 'these', 'those', 'some', 'any', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'all', 'every', 'each', 'no'];
export function missingDeterminerAfterPreposition(words: string[], original = ''): string | null {
  // nomes próprios (Sunday, Brazil) vêm com maiúscula no meio da frase
  const proper = new Set(original.split(/\s+/).slice(1).filter((w) => /^[A-Z]/.test(w)).map((w) => w.toLowerCase().replace(/[^a-z']/g, '')));
  for (let i = 0; i < words.length - 1; i++) {
    const w = words[i];
    const isNextTo = w === 'to' && i > 0 && words[i - 1] === 'next';
    if (!isNextTo && !PLACE_PREPOSITIONS.includes(w)) continue;
    const next = words[i + 1];
    if (DETERMINERS.includes(next) || BARE_NOUNS_OK.includes(next) || proper.has(next)) continue;
    return `${isNextTo ? 'next to' : w} ${next}`;
  }
  return null;
}
export const LETTER_OPTIONS = 4;
export const LETTER_MIN_QUESTIONS = 2;
/** Seção 4.3: glossário filtrado precisa de pelo menos 4 entradas em qualquer nível (glossarySize é o pedido ao prompt) */
export const LETTER_GLOSSARY_MIN = 4;
export const GAP_OPTIONS = 3;
const LETTER_KINDS: LetterQuestionKind[] = ['decision', 'comprehension', 'inference'];
/** Letras a mais que a opção certa precisa ter sobre todas as outras (com o mesmo número de palavras) para contar como "a mais longa" */
const LONGEST_CHAR_MARGIN = 5;
const FORGE_DEFAULT_RULE = 'Leia a frase de novo e repare na forma da palavra.';

// ---------- utilitários ----------

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter((s) => s.length > 0) : []);
const lower = (s: string): string => s.toLowerCase();

/** Palavras separadas por espaço que tenham ao menos uma letra ou dígito */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /[a-z0-9À-ÿ]/i.test(w)).length;
}

/** Maior frase (em palavras) de um texto; maxWords do nível vale por frase, não por texto */
export function longestSentenceWords(text: string): number {
  return text
    .split(/[.!?]+/)
    .map((s) => wordCount(s))
    .reduce((max, n) => Math.max(max, n), 0);
}

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();
const containsIgnoreCase = (text: string, part: string): boolean => part.length > 0 && squash(text).includes(squash(part));

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text: string, word: string): boolean => new RegExp(`\\b${escapeRe(word)}\\b`, 'i').test(text);

/** Flexões regulares de uma palavra (plural -s/-es/-ies e o singular pela pré-checagem) */
function inflections(word: string): string[] {
  const w = lower(word);
  const forms = new Set([w, `${w}s`, `${w}es`]);
  if (w.endsWith('y')) forms.add(`${w.slice(0, -1)}ies`);
  const singular = singularize(w);
  if (singular !== w && singular.length > 2) forms.add(singular);
  return [...forms];
}

/** Forma da palavra como aparece no texto (ela mesma ou uma flexão regular), ou null se não está lá */
function surfaceForm(text: string, word: string): string | null {
  return inflections(word).find((f) => hasWord(text, f)) ?? null;
}

function dedupeIgnoreCase(list: string[]): string[] {
  const seen = new Set<string>();
  return list.filter((s) => {
    const k = lower(s);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const sameMultiset = (a: string[], b: string[]): boolean => a.length === b.length && [...a].sort().join(' ') === [...b].sort().join(' ');
const sameOrder = (a: string[], b: string[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

// ---------- Comerciante ----------

/** Palavras funcionais aceitas nas frases do Comerciante (além de itens, lugares e números) */
export const MERCHANT_FUNCTION_WORDS: string[] = [
  'put', 'place', 'can', 'you', 'please', 'first', 'then', 'next', 'now', 'and', 'the', 'a', 'an', 'on', 'in',
  'under', 'to', 'of', 'give', 'me', 'it', 'them', 'also', 'after', 'that', 'there', 'here', 'at', 'with', 'your',
  'my', 'ok', 'okay', 'hey', 'hello', 'hi', 'thanks', 'thank', 'good', 'great', 'quick', 'quickly', 'fast', 'careful',
  'carefully', 'so', 'but', 'do', 'not', 'all', 'more', 'big', 'small', 'new', 'again', 'go', 'get', 'bring', 'take',
  'carry', 'grab', 'pick', 'up', 'leave', 'move', 'set', 'hang', 'drop', 'keep', 'we', 'need', 'want', 'i', 'for',
  'let', 'us', 'ready', 'yes', 'hurry', 'come', 'right', 'away', 'one', 'nice', 'well', 'friend',
];

/** Allowlist fechada: funcionais + números + labels/plurais dos itens + labels dos lugares */
export function merchantAllowlist(catalogs: MerchantCatalogs = MERCHANT_CATALOGS): Set<string> {
  const allow = new Set<string>([...MERCHANT_FUNCTION_WORDS, ...NUMBER_WORDS]);
  catalogs.items.forEach((it) => {
    allow.add(lower(it.label));
    allow.add(lower(it.plural));
  });
  catalogs.spots.forEach((s) => allow.add(lower(s.label)));
  return allow;
}

const RELATION_WORDS = ['on', 'in', 'under', 'next'];
/** Para qty 1 a frase precisa marcar a unidade: the/a/an/one antes do substantivo */
const QTY_ONE_DETERMINERS = new Set(['the', 'a', 'an', 'one']);
const startsWithVowel = (w: string): boolean => /^[aeiou]/i.test(w);

/** Motivo da reprovação da frase, ou null quando ela serve */
export function checkMerchantSentence(
  sentence: string,
  step: MerchantStep,
  catalogs: MerchantCatalogs,
  allow: Set<string>,
  maxWords: number
): string | null {
  if (!sentence) return 'frase vazia';
  if (/\d/.test(sentence)) return 'contém dígito';
  const tokens = tokenize(sentence);
  if (tokens.length === 0) return 'frase vazia';
  if (tokens.length > maxWords) return `mais de ${maxWords} palavras`;
  const outside = tokens.filter((t) => !allow.has(t));
  if (outside.length) return `palavra fora da lista: ${outside.join(', ')}`;
  const item = catalogs.items.find((it) => it.id === step.item);
  const spot = catalogs.spots.find((s) => s.id === step.spot);
  if (!item || !spot) return 'item ou lugar desconhecido';
  const noun = step.qty === 1 ? lower(item.label) : lower(item.plural);
  const wrongForm = step.qty === 1 ? lower(item.plural) : lower(item.label);
  if (!tokens.includes(noun)) return `item "${noun}" ausente`;
  if (wrongForm !== noun && tokens.includes(wrongForm)) return `forma errada do item: ${wrongForm}`;
  if (step.qty === 1) {
    const nounIdx = tokens.indexOf(noun);
    const det = tokens.slice(0, nounIdx).reverse().find((t) => QTY_ONE_DETERMINERS.has(t));
    if (!det) return `item "${noun}" sem the/a/an/one antes`;
    if (item.pluralOnly && det !== 'the') return `"${det} ${noun}": palavra só no plural pede the`;
    const prevTok = tokens[nounIdx - 1];
    if (prevTok === 'a' && startsWithVowel(noun)) return `"a ${noun}": antes de vogal usa-se an`;
    if (prevTok === 'an' && !startsWithVowel(noun)) return `"an ${noun}": antes de consoante usa-se a`;
  }
  const numbers = tokens.filter((t) => NUMBER_WORDS.indexOf(t) >= 2);
  if (step.qty >= 2 && !tokens.includes(NUMBER_WORDS[step.qty])) return `quantidade "${NUMBER_WORDS[step.qty]}" ausente`;
  const expectedNumber = step.qty >= 2 ? NUMBER_WORDS[step.qty] : '';
  if (numbers.some((n) => n !== expectedNumber)) return 'quantidade diferente do passo';
  if (!tokens.includes(lower(spot.label))) return `lugar "${spot.label}" ausente`;
  const otherSpots = catalogs.spots.filter((s) => s.id !== spot.id && tokens.includes(lower(s.label)));
  if (otherSpots.length) return `outro lugar na frase: ${otherSpots.map((s) => s.label).join(', ')}`;
  const otherItems = catalogs.items.filter((it) => it.id !== item.id && (tokens.includes(lower(it.label)) || tokens.includes(lower(it.plural))));
  if (otherItems.length) return `outro item na frase: ${otherItems.map((it) => it.label).join(', ')}`;
  const relations = RELATION_WORDS.filter((w) => tokens.includes(w));
  const expected = step.relation === 'next_to' ? 'next' : step.relation;
  if (!relations.includes(expected)) return `preposição "${RELATION_EN[step.relation]}" ausente`;
  if (relations.length > 1) return 'mais de uma preposição de lugar';
  if (step.relation === 'next_to' && tokens[tokens.indexOf('next') + 1] !== 'to') return '"next" sem "to"';
  return null;
}

/** Estrutura vinda do código é checada; frase reprovada vira a de reserva (não derruba o contrato) */
export function validateMerchant(content: MerchantContentInput, level: number, catalogs: MerchantCatalogs = MERCHANT_CATALOGS): MerchantValidation {
  const lv = levelFor(level);
  const problems: string[] = [];
  const steps = Array.isArray(content.steps) ? content.steps : [];
  const spots = Array.isArray(content.spots) ? content.spots : [];
  const items = Array.isArray(content.items) ? content.items : [];
  const base: MerchantContent = { spots, items, steps, sentences: [], gapped: [], translation: [] };
  if (steps.length < 2 || steps.length > 4) problems.push(`passos: ${steps.length} (esperado 2-4)`);
  if (spots.length < 4 || spots.length > 6) problems.push(`lugares: ${spots.length} (esperado 4-6)`);
  if (items.length !== steps.length + 1) problems.push('bandeja precisa ter um item a mais que os passos');
  const seenItems = new Set<string>();
  steps.forEach((s, i) => {
    const def = catalogs.items.find((it) => it.id === s.item);
    const spotDef = catalogs.spots.find((sp) => sp.id === s.spot);
    const inRoom = spots.some((sp) => sp.id === s.spot);
    if (!def) problems.push(`passo ${i + 1}: item desconhecido`);
    if (!spotDef || !inRoom) problems.push(`passo ${i + 1}: lugar fora da sala`);
    if (spotDef && !spotDef.relations.includes(s.relation)) problems.push(`passo ${i + 1}: relação não permitida pelo lugar`);
    if (![1, 2, 3].includes(s.qty)) problems.push(`passo ${i + 1}: quantidade fora de 1-3`);
    if (seenItems.has(s.item)) problems.push(`passo ${i + 1}: item repetido`);
    seenItems.add(s.item);
    if (!items.some((it) => it.id === s.item && it.stock >= s.qty)) problems.push(`passo ${i + 1}: estoque insuficiente`);
  });
  if (problems.length) return { ok: false, content: base, problems, replaced: [] };

  const allow = merchantAllowlist(catalogs);
  const sentences = Array.isArray(content.sentences) ? content.sentences.map(str) : [];
  const translations = Array.isArray(content.translation) ? content.translation.map(str) : [];
  const offline = offlineSentences(steps, catalogs, items);
  const replaced: number[] = [];
  const fixed: string[] = [];
  const fixedT: string[] = [];
  steps.forEach((step, i) => {
    const reason = checkMerchantSentence(sentences[i] ?? '', step, catalogs, allow, lv.maxWords + WORD_SLACK);
    if (reason) {
      problems.push(`frase ${i + 1}: ${reason}; usada a de reserva`);
      replaced.push(i);
      fixed.push(offline.sentences[i]);
      fixedT.push(offline.translations[i]);
      return;
    }
    fixed.push(sentences[i]);
    if (!translations[i]) problems.push(`frase ${i + 1}: sem tradução; usada a de reserva`);
    fixedT.push(translations[i] || offline.translations[i]);
  });
  return {
    ok: true,
    content: { ...base, sentences: fixed, gapped: gapped(fixed, steps, catalogs), translation: fixedT },
    problems,
    replaced,
  };
}

// ---------- Carta ----------

function parseQuestion(raw: unknown, text: string, level: number, maxWords: number, seed: number, index: number): { question: LetterQuestion | null; problems: string[] } {
  const problems: string[] = [];
  const tag = `pergunta ${index + 1}`;
  if (!isRecord(raw)) return { question: null, problems: [`${tag}: formato inválido`] };
  const question = str(raw.question);
  if (!question) return { question: null, problems: [`${tag}: enunciado vazio`] };
  // Por frase: a pergunta de decisão do nível 1 tem duas ("You have three emeralds... Who do you hire?")
  if (longestSentenceWords(question) > maxWords) return { question: null, problems: [`${tag}: frase do enunciado com mais de ${maxWords} palavras`] };
  const rawOptions = strArray(raw.options);
  const answerIdx = typeof raw.answer === 'number' && Number.isInteger(raw.answer) ? raw.answer : -1;
  const correct = rawOptions[answerIdx];
  if (correct === undefined) return { question: null, problems: [`${tag}: answer fora das opções`] };
  const options = dedupeIgnoreCase(rawOptions);
  if (options.length !== LETTER_OPTIONS) return { question: null, problems: [`${tag}: precisa de ${LETTER_OPTIONS} opções distintas`] };
  const lowered = options.map(lower);
  const nested = lowered.some((a, i) => lowered.some((b, j) => i !== j && a.includes(b)));
  if (nested) return { question: null, problems: [`${tag}: uma opção contém outra`] };
  const answer = lowered.indexOf(lower(correct));
  const others = options.filter((_, i) => i !== answer);
  // "Mais longa" que a criança consegue explorar: mais palavras que todas, ou uma folga de letras visível
  // ("Five" contra "Two/One/Ten" tem 1 letra a mais e não entrega nada)
  const correctWords = wordCount(correct);
  const longestByWords = others.every((o) => correctWords > wordCount(o));
  const longestByChars = others.every((o) => correct.length >= o.length + LONGEST_CHAR_MARGIN);
  if (longestByWords || longestByChars) return { question: null, problems: [`${tag}: opção certa é a mais longa`] };
  const evidence = str(raw.evidence);
  if (!evidence || !containsIgnoreCase(text, evidence)) return { question: null, problems: [`${tag}: evidence não está no texto`] };
  if (containsIgnoreCase(text, correct) && !others.some((o) => containsIgnoreCase(text, o))) {
    return { question: null, problems: [`${tag}: anti-cola, só a opção certa aparece literalmente no texto`] };
  }
  const forbidden = findForbiddenTokens([question, ...options].join(' '), level);
  if (forbidden.length) return { question: null, problems: [`${tag}: tokens proibidos: ${forbidden.join(', ')}`] };
  const kindRaw = str(raw.kind) as LetterQuestionKind;
  const kind: LetterQuestionKind = LETTER_KINDS.includes(kindRaw) ? kindRaw : 'comprehension';
  if (kind !== kindRaw) problems.push(`${tag}: kind inválido, usado comprehension`);
  const shuffled = shuffleOptions(options, answer, mixSeed(seed, `q${index}`));
  return {
    question: { kind, question, options: shuffled.options, answer: shuffled.answer, evidence, explanation: str(raw.explanation) },
    problems,
  };
}

/** Rejeita por contagem, tokens proibidos e glossário; perguntas ruins são descartadas (mínimo 2) */
export function validateLetter(raw: unknown, level: number, vocabKnown: string[], seed?: number): ValidationResult<LetterContent> {
  const lv = levelFor(level);
  const problems: string[] = [];
  const r = isRecord(raw) ? raw : {};
  const genreRaw = str(r.genre) as LetterGenre;
  const genre: LetterGenre = LETTER_GENRES.includes(genreRaw) ? genreRaw : 'letter';
  if (genre !== genreRaw) problems.push('genre inválido, usado letter');
  const text = str(r.text);
  const title = str(r.title);
  const sender = str(r.sender);
  const translation = str(r.translation);
  const theSeed = seed ?? seedFromString(text);
  let ok = true;
  if (!text) {
    ok = false;
    problems.push('texto vazio');
  }
  if (!title) problems.push('título vazio');
  if (!sender) problems.push('remetente vazio');
  if (!translation) problems.push('tradução vazia');
  const [minW, maxW] = letterWordRange(lv.level, genre);
  const words = wordCount(text);
  if (text && (words < Math.floor(minW * (1 - LETTER_WORD_SLACK)) || words > Math.ceil(maxW * (1 + LETTER_WORD_SLACK)))) {
    ok = false;
    problems.push(`texto com ${words} palavras (esperado ${minW}-${maxW})`);
  }
  const forbidden = findForbiddenTokens(text, lv.level);
  if (forbidden.length) {
    ok = false;
    problems.push(`tokens proibidos no texto: ${forbidden.join(', ')}`);
  }
  const known = new Set(vocabKnown.map(lower));
  const glossaryRaw = Array.isArray(r.glossary) ? r.glossary : [];
  const glossarySeen = new Set<string>();
  // Fica só o que está no texto, sem repetição, palavras novas primeiro (conhecidas também pelo singular).
  // A IA costuma mandar a forma base ("tool") quando o texto tem o plural ("tools"): a entrada fica,
  // com "en" na forma que aparece no texto, para o destaque por hover da tela casar.
  const fresh: LetterContent['glossary'] = [];
  const alreadyKnown: LetterContent['glossary'] = [];
  glossaryRaw
    .filter(isRecord)
    .map((g) => ({ en: str(g.en), pt: str(g.pt) }))
    .forEach((g) => {
      if (!g.en || !g.pt) return;
      const en = hasWord(text, g.en) ? g.en : surfaceForm(text, g.en);
      if (!en) return;
      const k = lower(en);
      if (glossarySeen.has(k)) return;
      glossarySeen.add(k);
      (known.has(k) || known.has(singularize(k)) ? alreadyKnown : fresh).push({ en, pt: g.pt });
    });
  // A IA tende a repetir o vocabulário conhecido que o prompt manda reaproveitar: com menos de 4 novas,
  // as conhecidas presentes no texto completam o glossário em vez de derrubar a carta inteira
  const topUp = fresh.length < LETTER_GLOSSARY_MIN ? alreadyKnown.slice(0, LETTER_GLOSSARY_MIN - fresh.length) : [];
  if (topUp.length) problems.push(`glossário com ${fresh.length} palavra(s) nova(s); completado com ${topUp.length} conhecida(s) do texto`);
  const glossary = [...fresh, ...topUp];
  const gMax = lv.glossarySize[1];
  if (glossary.length < LETTER_GLOSSARY_MIN) {
    ok = false;
    problems.push(`glossário com ${glossary.length} palavras válidas (mínimo ${LETTER_GLOSSARY_MIN})`);
  }
  const questionsRaw = Array.isArray(r.questions) ? r.questions : [];
  const questions: LetterQuestion[] = [];
  questionsRaw.forEach((q, i) => {
    const parsed = parseQuestion(q, text, lv.level, lv.maxWords + WORD_SLACK, theSeed, i);
    problems.push(...parsed.problems);
    if (parsed.question) questions.push(parsed.question);
  });
  if (questions.length < LETTER_MIN_QUESTIONS) {
    ok = false;
    problems.push(`só ${questions.length} pergunta(s) válida(s) (mínimo ${LETTER_MIN_QUESTIONS})`);
  }
  return {
    ok,
    content: { genre, title, sender, text, glossary: glossary.slice(0, gMax), questions: questions.slice(0, 3), translation },
    problems,
  };
}

// ---------- Recado ----------

const NUMBER_SET = new Set(NUMBER_WORDS);

/** model precisa conter as 3 infos (pré-checagem); banco 10-14 sem dígitos; templates do nível quando faltam */
export function validateNote(raw: unknown, level: number): ValidationResult<NoteContent> {
  const lv = levelFor(level);
  const problems: string[] = [];
  const r = isRecord(raw) ? raw : {};
  let ok = true;
  const brief = str(r.brief);
  if (!brief) {
    ok = false;
    problems.push('brief vazio');
  }
  const infosRaw = Array.isArray(r.mustInclude) ? r.mustInclude : [];
  let mustInclude: NoteInfo[] = infosRaw
    .filter(isRecord)
    .map((m) => ({ pt: str(m.pt), en: dedupeIgnoreCase(strArray(m.en)) }))
    .filter((m) => m.pt && m.en.length > 0);
  if (mustInclude.length > 3) {
    problems.push('mustInclude com mais de 3 itens; mantidos os 3 primeiros');
    mustInclude = mustInclude.slice(0, 3);
  }
  if (mustInclude.length < 3) {
    ok = false;
    problems.push(`mustInclude com ${mustInclude.length} informações válidas (esperado 3)`);
  }
  const model = str(r.model);
  if (!model) {
    ok = false;
    problems.push('model vazio');
  } else {
    const missing = missingInfos(model, mustInclude);
    if (missing.length) {
      ok = false;
      problems.push(`model não contém: ${missing.map((m) => m.pt).join('; ')}`);
    }
    const forbidden = findForbiddenTokens(model, lv.level);
    if (forbidden.length) {
      ok = false;
      problems.push(`tokens proibidos no model: ${forbidden.join(', ')}`);
    }
    const long = model.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).filter((s) => wordCount(s) > lv.maxWords + WORD_SLACK);
    if (long.length) problems.push(`model com frase acima de ${lv.maxWords + WORD_SLACK} palavras`);
  }
  // Tokens do modelo sem plural, para reconhecer "sword" em "two swords"
  const modelTokens = new Set(normalizedTokens(model));
  let wordBank = dedupeIgnoreCase(strArray(r.wordBank).map(lower)).filter((w) => !/\d/.test(w) && !NUMBER_SET.has(w));
  if (wordBank.length !== strArray(r.wordBank).length) problems.push('banco com dígitos, números ou repetições; removidos');
  if (wordBank.length > NOTE_BANK_RANGE[1]) {
    problems.push(`banco com ${wordBank.length} palavras; cortado para ${NOTE_BANK_RANGE[1]} (as do model primeiro)`);
    const inModel = wordBank.filter((w) => modelTokens.has(w));
    const rest = wordBank.filter((w) => !modelTokens.has(w));
    wordBank = [...inModel, ...rest].slice(0, NOTE_BANK_RANGE[1]);
  }
  if (wordBank.length < NOTE_BANK_RANGE[0]) {
    ok = false;
    problems.push(`banco com ${wordBank.length} palavras (mínimo ${NOTE_BANK_RANGE[0]})`);
  }
  // O prompt não pede templates: os moldes são os do nível; se a IA mandar, só ficam os com ___ e dentro do nível
  let templates = strArray(r.templates).filter((t) => t.includes('___') && findForbiddenTokens(t, lv.level).length === 0);
  if (templates.length === 0) templates = [...lv.noteTemplates];
  const hint = lv.level === 3 ? str(r.hint) : '';
  if (lv.level === 3 && !hint) problems.push('hint vazio no nível 3');
  return { ok, content: { brief, mustInclude, templates, wordBank, model, hint }, problems };
}

// ---------- Ferraria ----------

const cleanWords = (s: string): string[] => tokenize(s.replace(/[‘’]/g, "'"));

function parseForgeItem(raw: unknown, level: number, seed: number, index: number): { item: ForgeItem | null; key: string; problems: string[] } {
  const problems: string[] = [];
  const tag = `item ${index + 1}`;
  if (!isRecord(raw)) return { item: null, key: '', problems: [`${tag}: formato inválido`] };
  const kind = str(raw.kind);
  let rule = str(raw.rule);
  if (!rule) {
    rule = FORGE_DEFAULT_RULE;
    problems.push(`${tag}: rule vazia, usada a padrão`);
  }
  if (kind === 'scramble') {
    const answer = str(raw.answer);
    const answerWords = cleanWords(answer);
    if (answerWords.length < SCRAMBLE_WORDS[0] || answerWords.length > SCRAMBLE_WORDS[1]) {
      return { item: null, key: '', problems: [`${tag}: scramble com ${answerWords.length} palavras (esperado 4-8)`] };
    }
    const banned = answerWords.filter((w) => SCRAMBLE_BANNED.includes(w));
    if (banned.length) return { item: null, key: '', problems: [`${tag}: scramble com palavra proibida: ${banned.join(', ')}`] };
    const forbidden = findForbiddenTokens(answer, level);
    if (forbidden.length) return { item: null, key: '', problems: [`${tag}: tokens proibidos: ${forbidden.join(', ')}`] };
    const bare = missingDeterminerAfterPreposition(answerWords, answer);
    if (bare) return { item: null, key: '', problems: [`${tag}: substantivo sem artigo depois de preposição ("${bare}")`] };
    let words = strArray(raw.words).map(lower).flatMap(cleanWords);
    if (!sameMultiset(words, answerWords)) {
      if (words.length) problems.push(`${tag}: words diferente da resposta; refeito a partir dela`);
      words = answerWords;
    }
    let shuffled = seededShuffle(words, mixSeed(seed, `s${index}`));
    if (sameOrder(shuffled, answerWords)) shuffled = [...shuffled.slice(1), shuffled[0]];
    return { item: { kind: 'scramble', words: shuffled, answer, rule }, key: normalize(answer), problems };
  }
  if (kind === 'gap') {
    const sentence = str(raw.sentence);
    if (!sentence.includes('___')) return { item: null, key: '', problems: [`${tag}: gap sem ___`] };
    const rawOptions = strArray(raw.options);
    const answerIdx = typeof raw.answer === 'number' && Number.isInteger(raw.answer) ? raw.answer : -1;
    const correct = rawOptions[answerIdx];
    if (correct === undefined) return { item: null, key: '', problems: [`${tag}: answer fora das opções`] };
    let options = dedupeIgnoreCase(rawOptions);
    if (options.length < GAP_OPTIONS) return { item: null, key: '', problems: [`${tag}: gap precisa de ${GAP_OPTIONS} opções distintas`] };
    if (options.length > GAP_OPTIONS) {
      problems.push(`${tag}: gap com mais de ${GAP_OPTIONS} opções; cortado`);
      options = [correct, ...options.filter((o) => lower(o) !== lower(correct))].slice(0, GAP_OPTIONS);
    }
    const forbidden = findForbiddenTokens(sentence.replace('___', correct), level);
    if (forbidden.length) return { item: null, key: '', problems: [`${tag}: tokens proibidos: ${forbidden.join(', ')}`] };
    const answer = options.findIndex((o) => lower(o) === lower(correct));
    const shuffled = shuffleOptions(options, answer, mixSeed(seed, `g${index}`));
    return { item: { kind: 'gap', sentence, options: shuffled.options, answer: shuffled.answer, rule }, key: normalize(sentence), problems };
  }
  if (kind === 'typed') {
    const prompt = str(raw.prompt);
    const sentence = str(raw.sentence);
    const accepted = dedupeIgnoreCase(strArray(raw.accepted));
    if (!prompt) return { item: null, key: '', problems: [`${tag}: typed sem prompt`] };
    if (!sentence.includes('___')) return { item: null, key: '', problems: [`${tag}: typed sem ___`] };
    if (!accepted.length) return { item: null, key: '', problems: [`${tag}: typed sem accepted`] };
    const forbidden = findForbiddenTokens(sentence.replace('___', accepted[0]), level);
    if (forbidden.length) return { item: null, key: '', problems: [`${tag}: tokens proibidos: ${forbidden.join(', ')}`] };
    return { item: { kind: 'typed', prompt, sentence, accepted, rule }, key: normalize(sentence), problems };
  }
  return { item: null, key: '', problems: [`${tag}: kind desconhecido`] };
}

/** 6 itens válidos e sem frase repetida; scramble e opções embaralhados com semente */
export function validateForge(raw: unknown, level: number, seed?: number): ValidationResult<ForgeContent> {
  const lv = levelFor(level);
  const problems: string[] = [];
  const r = isRecord(raw) ? raw : {};
  let target = str(r.target);
  if (!target) {
    target = 'Gramática do dia';
    problems.push('target vazio, usado o padrão');
  }
  const theSeed = seed ?? seedFromString(target);
  const rawItems = Array.isArray(r.items) ? r.items : [];
  const seen = new Set<string>();
  const items: ForgeItem[] = [];
  rawItems.forEach((it, i) => {
    const parsed = parseForgeItem(it, lv.level, theSeed, i);
    problems.push(...parsed.problems);
    if (!parsed.item) return;
    if (seen.has(parsed.key)) {
      problems.push(`item ${i + 1}: frase repetida, descartado`);
      return;
    }
    seen.add(parsed.key);
    items.push(parsed.item);
  });
  if (items.length > FORGE_ITEMS) problems.push(`${items.length} itens válidos; mantidos os ${FORGE_ITEMS} primeiros`);
  const ok = items.length >= FORGE_ITEMS;
  if (!ok) problems.push(`só ${items.length} item(ns) válido(s) (esperado ${FORGE_ITEMS})`);
  return { ok, content: { target, items: items.slice(0, FORGE_ITEMS) }, problems };
}
