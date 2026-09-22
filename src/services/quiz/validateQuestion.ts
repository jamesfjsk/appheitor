/** Validador da prova v3: uma pergunta, lista de códigos. Vazio = passa. */

import { LEVELS, findForbiddenTokens } from '../../config/englishLevels';
import { answerLeaksInPrompt, contentWords, normalizeQuizText, optionsCollide, wordCount } from './provaRules';
import { QUIZ_VALIDATOR_ENFORCE } from './quizTokens';

export const REJECT_CODES = [
  'enunciado_vazou',
  'ingles_duas_validas',
  'conta_um_passo',
  'capital',
  'fato_discutivel',
  'definicao',
  'caricatura',
  'why_curto',
  'why_sem_resposta',
  'trap_sem_distrator',
  'duplicata',
  'ingles_nivel',
  'audio_vazio',
  'conta_nao_fecha',
  'campo_invalido',
  'duas_certas',
  'opcoes_invalidas',
  'resposta_fora',
  'sinonimas',
  'sem_licao',
  'audio_mismatch',
  'formato_invalido',
  'texto_vazio',
  'opiniao',
  'opcao_caricata',
  'tamanho_opcoes',
  'certa_mais_longa',
  'tipos_mistos',
] as const;

export type RejectCode = (typeof REJECT_CODES)[number];

/** Gravado no sanitize, mas quem decide é o revisor: a conta de porcentagem o reachable não lê. */
const SOFT_CODES = new Set<RejectCode>(['conta_nao_fecha']);

export const SKILLS = new Set([
  'LIC.IDEIA',
  'LIC.APLICA',
  'LIC.DILEMA',
  'MAT.OP2',
  'CIE.CAUSA',
  'ING.N1.PREP',
  'ING.N1.BE',
  'ING.N1.LIKE',
  'HIS.FATO',
  'GEO.FATO',
  'FUT.REGRA',
  'GEN.CONH',
]);

export const SUBJECTS = new Set([
  'matematica',
  'ciencias',
  'ingles',
  'historia',
  'geografia',
  'futebol',
  'tema',
  'arte',
]);

export const BLOOM = new Set(['entender', 'aplicar', 'analisar']);

export interface RawQuestion {
  question?: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  why?: string;
  trap?: string;
  subject?: string;
  skill?: string;
  bloom?: string;
  kind?: string;
  audioText?: string;
}

export interface ValidateCtx {
  englishLevel?: number;
  avoidHashes?: Set<string>;
  /** Outra pergunta do mesmo assunto: 70% das palavras de 4+ letras vira duplicata. */
  avoidRecent?: { subject: string; words: string[] }[];
  lesson?: string;
}

const DEFINICAO = /^(o que e |qual e o nome d|o que significa )/;
const CAPITAL = /qual e a capital|capital d[aeo] /;
const SUPERLATIVO = /\b(mais|maior|melhor|pior|principal|famos[oa]|avancad[oa])\b/;
const FATO_SUBJ = /histor|geograf|futebol|arte/;
const CARICATURA =
  /\b(azul|verde|roxo|rosa|amarelo|preto|branco)\b.{0,40}\b(celula|atomo|molecula|planeta)\b|\b(celula|atomo|molecula|planeta)\b.{0,40}\b(azul|verde|roxo|rosa|amarelo|preto|branco)\b/;
const OPINIAO =
  /\b(o que voce faria|como voce agiria|o que voce acha|voce prefere|o que seria mais sabio|como voce poderia usar|como voce pode aplicar|se voce tivesse que escolher)\b/;
const CARICATA =
  /\b(ignorar|ignoraria|fingir|fingiria|burro|falar mal|nao fazer nada|nao comer nada|impor|nao se importar|nao se importaria|deixar para outra pessoa|sair do jogo|criticar)\b/;

const VARIANT_PAIRS: Array<[string, string]> = [
  ['soccer', 'football'],
  ['color', 'colour'],
  ['mom', 'mum'],
  ['gray', 'grey'],
  ['favorite', 'favourite'],
  ['writes', 'writing'],
];

export function hashOf(question: string): string {
  return normalizeQuizText(question);
}

export function numbersOf(text: string): number[] {
  const out: number[] = [];
  const re = /\d+(?:[.,]\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = Number(m[0].replace(',', '.'));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function packKey(vals: number[]): string {
  return [...vals]
    .map((n) => (Math.abs(n) < 1e-9 ? 0 : n).toFixed(6))
    .sort()
    .join('|');
}

/** Dá para chegar no alvo com no máximo `maxOps` operações + − × ÷, sem repetir o mesmo saco. */
export function reachable(nums: number[], target: number, maxOps: number): boolean {
  if (!Number.isFinite(target) || maxOps < 1) return false;
  const start = nums.filter((n) => Number.isFinite(n));
  if (start.length === 0) return false;
  const seen = new Set<string>([packKey(start)]);
  const queue: Array<{ vals: number[]; ops: number }> = [{ vals: start, ops: 0 }];
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.ops > 0 && cur.vals.some((v) => close(v, target))) return true;
    if (cur.ops >= maxOps) continue;
    const vals = cur.vals;
    for (let i = 0; i < vals.length; i++) {
      for (let j = 0; j < vals.length; j++) {
        if (i === j) continue;
        const a = vals[i];
        const b = vals[j];
        const rest = vals.filter((_, k) => k !== i && k !== j);
        const nexts = [a + b, a - b, a * b];
        if (Math.abs(b) > 1e-9) nexts.push(a / b);
        for (const c of nexts) {
          if (!Number.isFinite(c)) continue;
          const next = [...rest, c];
          const key = packKey(next);
          if (seen.has(key)) continue;
          seen.add(key);
          queue.push({ vals: next, ops: cur.ops + 1 });
        }
      }
    }
  }
  return false;
}

function duasVariantesValidas(options: string[]): boolean {
  const bag = options.map((o) => normalizeQuizText(o));
  const blob = ` ${bag.join(' ')} `;
  return VARIANT_PAIRS.some(([a, b]) => blob.includes(` ${a} `) && blob.includes(` ${b} `));
}

function stemLeak(question: string, answer: string): boolean {
  if (answerLeaksInPrompt(question, answer)) return true;
  const a = normalizeQuizText(answer);
  const q = normalizeQuizText(question);
  if (a.length < 4) return false;
  const stem = a.replace(/e$/, '').slice(0, 6);
  return stem.length >= 4 && q.includes(stem);
}

function trapHitsDistractor(trap: string, options: string[], answer: string): boolean {
  const nt = normalizeQuizText(trap);
  return options
    .filter((o) => normalizeQuizText(o) !== normalizeQuizText(answer))
    .some((o) => {
      const n = normalizeQuizText(o);
      if (!n) return false;
      const words = n.split(' ').filter((w) => w.length >= 5);
      if (words.some((w) => nt.includes(w))) return true;
      return n.length <= 12 && nt.includes(n);
    });
}

function overlapRatio(a: string, b: string): number {
  const wa = new Set(contentWords(a));
  const wb = contentWords(b);
  if (wa.size === 0 || wb.length === 0) return 0;
  const hit = wb.filter((w) => wa.has(w)).length;
  return hit / Math.max(wa.size, new Set(wb).size);
}

function tokensOf(text: string): string[] {
  return normalizeQuizText(text).split(' ').filter(Boolean);
}

/** Troca, soma ou tira uma palavra: "Mais/Menos oxigênio", "a/an apple". Iguais ficam com optionsCollide. */
function oneWordApart(a: string, b: string): boolean {
  const wa = tokensOf(a);
  const wb = tokensOf(b);
  if (wa.length === 0 || wb.length === 0) return false;
  const bag = new Map<string, number>();
  for (const w of wb) bag.set(w, (bag.get(w) ?? 0) + 1);
  let onlyA = 0;
  for (const w of wa) {
    const n = bag.get(w) ?? 0;
    if (n > 0) bag.set(w, n - 1);
    else onlyA += 1;
  }
  let onlyB = 0;
  for (const n of bag.values()) onlyB += n;
  if (wa.length === wb.length && onlyA === 1 && onlyB === 1) return true;
  return Math.abs(wa.length - wb.length) === 1 && onlyA + onlyB === 1;
}

function sinonimas(options: string[]): boolean {
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      if (normalizeQuizText(options[i]) === normalizeQuizText(options[j])) continue;
      if (oneWordApart(options[i], options[j])) continue;
      if (overlapRatio(options[i], options[j]) >= 0.8) return true;
    }
  }
  return false;
}

/** Uma palavra de 4+ letras, o número, ou as 3 primeiras — não a frase inteira. */
export function whyCitesAnswer(why: string, answer: string): boolean {
  const nw = normalizeQuizText(why);
  const words = tokensOf(answer);
  if (words.length === 0) return true;
  if (words.some((w) => w.length >= 4 && nw.includes(w))) return true;
  const nums = numbersOf(answer);
  if (nums.length > 0 && nums.every((n) => numbersOf(why).includes(n))) return true;
  if (words.length >= 3 && nw.includes(words.slice(0, 3).join(' '))) return true;
  // is / in / on: a palavra inteira, com fronteira. Frase longa não usa este atalho.
  if (words.length > 0 && words.length < 3 && words.every((w) => w.length < 4)) {
    return words.every((w) => ` ${nw} `.includes(` ${w} `));
  }
  return false;
}

function similarWords(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const bag = new Set(b);
  const hit = a.filter((w) => bag.has(w)).length;
  return hit / Math.max(a.length, bag.size);
}

function isNumericOption(option: string): boolean {
  const words = tokensOf(option).filter((w) => w !== 'r');
  return words.length > 0 && words.every((w) => /^\d+(?:[.,]\d+)?$/.test(w));
}

function tiposMistos(options: string[]): boolean {
  const numeric = options.filter(isNumericOption).length;
  if (numeric > 0 && numeric < options.length) return true;
  // Palavra solta no meio de frase. 2 contra 3 palavras é tamanho, não tipo.
  const oneWord = options.filter((o) => wordCount(o) <= 1).length;
  const sentence = options.filter((o) => wordCount(o) >= 3).length;
  return oneWord > 0 && sentence > 0;
}

export function canonSubject(raw: string): string {
  const n = normalizeQuizText(raw).replace(/ /g, '');
  if (n.includes('matem')) return 'matematica';
  if (n.includes('cien')) return 'ciencias';
  if (n.includes('ingl')) return 'ingles';
  if (n.includes('hist')) return 'historia';
  if (n.includes('geog')) return 'geografia';
  if (n.includes('fute')) return 'futebol';
  if (n.includes('tema')) return 'tema';
  if (n.includes('arte')) return 'arte';
  return raw.trim();
}

function inferSkill(subject: string, kind: string): string {
  if (kind === 'lesson') return 'LIC.IDEIA';
  if (subject === 'matematica') return 'MAT.OP2';
  if (subject === 'ciencias') return 'CIE.CAUSA';
  if (subject === 'ingles') return 'ING.N1.PREP';
  if (subject === 'historia') return 'HIS.FATO';
  if (subject === 'geografia') return 'GEO.FATO';
  if (subject === 'futebol') return 'FUT.REGRA';
  return 'GEN.CONH';
}

export function hydrateQuestion(raw: RawQuestion): RawQuestion {
  const subject = canonSubject(typeof raw.subject === 'string' ? raw.subject : '');
  const kind = raw.kind === 'dilemma' || raw.skill === 'LIC.DILEMA' ? 'dilemma' : raw.kind === 'lesson' ? 'lesson' : 'knowledge';
  const why = typeof raw.why === 'string' && raw.why.trim() ? raw.why : typeof raw.explanation === 'string' ? raw.explanation : '';
  const skill = typeof raw.skill === 'string' && SKILLS.has(raw.skill) ? raw.skill : inferSkill(subject, kind === 'dilemma' ? 'lesson' : kind);
  const bloom = typeof raw.bloom === 'string' && BLOOM.has(raw.bloom) ? raw.bloom : kind === 'lesson' ? 'entender' : 'aplicar';
  return { ...raw, subject, kind, why, skill, bloom };
}

export function validateQuestion(raw: RawQuestion, ctx: ValidateCtx = {}): RejectCode[] {
  const q = hydrateQuestion(raw);
  const r: RejectCode[] = [];
  const question = typeof q.question === 'string' ? q.question : '';
  const options = Array.isArray(q.options) ? q.options.map((o) => String(o)) : [];
  const answer = typeof q.answer === 'string' ? q.answer : '';
  const why = typeof q.why === 'string' ? q.why : '';
  const trap = typeof q.trap === 'string' ? q.trap : '';
  const subject = typeof q.subject === 'string' ? q.subject : '';
  const skill = typeof q.skill === 'string' ? q.skill : '';
  const bloom = typeof q.bloom === 'string' ? q.bloom : '';
  const audioText = typeof q.audioText === 'string' ? q.audioText.trim() : '';
  const nq = normalizeQuizText(question);
  const level = ctx.englishLevel ?? 1;

  if (!question.trim() || !answer.trim()) r.push('texto_vazio');
  if (options.length !== 4 || options.some((o) => !o.trim())) r.push('opcoes_invalidas');
  if (options.length === 4 && answer && !options.includes(answer)) r.push('resposta_fora');
  if (!SKILLS.has(skill) || !SUBJECTS.has(subject) || !BLOOM.has(bloom)) r.push('campo_invalido');
  if (!why.trim() || !trap.trim()) r.push('formato_invalido');

  if (stemLeak(question, answer)) r.push('enunciado_vazou');
  if (CAPITAL.test(nq)) r.push('capital');
  if (DEFINICAO.test(nq)) r.push('definicao');
  if (FATO_SUBJ.test(subject) && SUPERLATIVO.test(nq)) r.push('fato_discutivel');
  if (CARICATURA.test(nq)) r.push('caricatura');
  if (optionsCollide(options)) r.push('duas_certas');
  // No inglês as quatro frases são o mesmo molde com um erro. A palavra de conteúdo
  // (there, table) cola os pares; quem decide duas válidas é ingles_duas_validas.
  if (subject !== 'ingles' && sinonimas(options)) r.push('sinonimas');

  if (subject === 'ingles' && duasVariantesValidas(options)) r.push('ingles_duas_validas');

  if (wordCount(why) < 12 || wordCount(trap) < 12) r.push('why_curto');
  if (why && answer && !whyCitesAnswer(why, answer)) r.push('why_sem_resposta');
  if (trap && options.length === 4 && !trapHitsDistractor(trap, options, answer)) r.push('trap_sem_distrator');

  if (options.length === 4) {
    const counts = options.map((o) => wordCount(o));
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    if (!(max <= 2 * min || max - min <= 3)) r.push('tamanho_opcoes');
    else if (wordCount(answer) === max && counts.filter((n) => n === max).length === 1 && max >= 4) r.push('certa_mais_longa');
    if (tiposMistos(options)) r.push('tipos_mistos');
  }

  if (OPINIAO.test(nq) && skill !== 'LIC.DILEMA' && q.kind !== 'dilemma') r.push('opiniao');
  if (options.some((o) => CARICATA.test(normalizeQuizText(o)))) r.push('opcao_caricata');

  const h = hashOf(question);
  if (ctx.avoidHashes?.has(h)) r.push('duplicata');
  else if (
    ctx.avoidRecent?.some(
      (p) => p.subject === subject && similarWords(p.words, contentWords(question)) >= 0.7,
    )
  ) {
    r.push('duplicata');
  }
  if (ctx.lesson && q.kind === 'lesson' && contentWords(ctx.lesson).length > 0) {
    const lessonSet = new Set(contentWords(ctx.lesson));
    if (!contentWords(question).some((w) => lessonSet.has(w))) r.push('sem_licao');
  }

  if (subject === 'matematica' && answer) {
    const nums = numbersOf(question);
    const [ans] = numbersOf(answer);
    if (ans == null) r.push('conta_nao_fecha');
    else if (reachable(nums, ans, 1)) r.push('conta_um_passo');
    else if (!reachable(nums, ans, 2)) r.push('conta_nao_fecha');
  }

  if (subject === 'ingles') {
    if (!audioText) r.push('audio_vazio');
    else {
      const matchesQuestion = overlapRatio(audioText, question) >= 0.3 || normalizeQuizText(audioText) === nq;
      const matchesAnswer =
        overlapRatio(audioText, answer) >= 0.3 || normalizeQuizText(audioText) === normalizeQuizText(answer);
      if (!matchesQuestion && !matchesAnswer) r.push('audio_mismatch');
    }
    const lv = level === 2 || level === 3 ? level : 1;
    // O cartão vale para a frase que ele lê e ouve. why e trap são a explicação em português.
    const blob = [question, ...options, answer, audioText].join(' ');
    if (findForbiddenTokens(blob, lv).length > 0) r.push('ingles_nivel');
    const max = LEVELS[lv as 1 | 2 | 3].maxWords;
    const enWords = audioText ? wordCount(audioText) : wordCount(question);
    if (enWords > max) r.push('ingles_nivel');
  }

  return r;
}

export function selectValidQuestions(
  raw: unknown,
  ctx: ValidateCtx = {},
  enforce = QUIZ_VALIDATOR_ENFORCE,
): { kept: RawQuestion[]; dropped: Record<string, number>; perQuestion: { i: number; codes: string[] }[] } {
  const list = Array.isArray(raw) ? raw : [];
  const dropped: Record<string, number> = {};
  const kept: RawQuestion[] = [];
  const perQuestion: { i: number; codes: string[] }[] = [];
  const seenKept = new Set<string>();
  list.forEach((item, i) => {
    const q = hydrateQuestion((item && typeof item === 'object' ? item : {}) as RawQuestion);
    const codes = validateQuestion(q, ctx);
    const stem = hashOf(typeof q.question === 'string' ? q.question : '');
    if (stem && seenKept.has(stem) && !codes.includes('duplicata')) codes.push('duplicata');
    perQuestion.push({ i, codes });
    for (const c of codes) dropped[c] = (dropped[c] ?? 0) + 1;
    const hard = codes.filter((c) => !SOFT_CODES.has(c as RejectCode));
    if (!enforce || hard.length === 0) {
      kept.push(q);
      if (stem) seenKept.add(stem);
    }
  });
  return { kept, dropped, perQuestion };
}

/** Completa até `count` com o banco, sem trocar as perguntas da IA que já passaram. */
export function fillToCount(
  ai: RawQuestion[],
  offline: RawQuestion[],
  count: number,
): { questions: RawQuestion[]; fromOffline: number } {
  const questions = ai.slice(0, count);
  let fromOffline = 0;
  if (questions.length >= count) return { questions, fromOffline };
  const seen = new Set(questions.map((q) => hashOf(String(q.question ?? ''))));
  for (const q of offline) {
    if (questions.length >= count) break;
    const h = hashOf(String(q.question ?? ''));
    if (!h || seen.has(h)) continue;
    seen.add(h);
    questions.push(q);
    fromOffline += 1;
  }
  return { questions, fromOffline };
}
