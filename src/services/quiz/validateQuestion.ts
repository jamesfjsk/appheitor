/** Validador da prova v3: uma pergunta, lista de códigos. Vazio = passa. */

import { LEVELS, findForbiddenTokens } from '../../config/englishLevels';
import { normalizeQuestion } from './hash';
import { answerLeaksInPrompt, contentWords, knowledgeAreasForWeekday, normalizeQuizText, optionsCollide, wordCount } from './provaRules';
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
  'explicacao_em_ingles',
  'ingles_sem_marcador',
  'futebol_solto',
  'why_circular',
  'dilema_com_certa',
  'fato_solto',
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
  /** Cenário da pergunta quando o futebol é só o pano de fundo (decisão 37). */
  scenario?: string;
  /** Id do banco de reserva, quando a pergunta veio de lá. */
  id?: string;
}

export interface ValidateCtx {
  englishLevel?: number;
  avoidHashes?: Set<string>;
  /** Outra pergunta do mesmo assunto: 70% das palavras de 4+ letras vira duplicata. */
  avoidRecent?: { subject: string; words: string[] }[];
  lesson?: string;
}

const DEFINICAO = /^(o que e |qual e o nome d|o que significa |qual e a funcao d|qual e o papel d|o que faz o |o que faz a |para que serve)/;
const FUTEBOL_SOLTO = /o que acontece se|quantos jogadores|qual a posicao|qual e a posicao|quem e o |regra do |impedimento/;
/** Palavras de função do português. A razão é sobre o `why` depois de tirar o trecho entre aspas. */
const PT_FUNCAO = new Set([
  'e', 'de', 'que', 'nao', 'porque', 'para', 'com', 'um', 'uma', 'o', 'a', 'os', 'as',
  'do', 'da', 'em', 'quando', 'depois', 'antes', 'verbo', 'frase', 'regra',
]);
/** Palavras inglesas que não estão na lista de função. "a" fica de fora: também é artigo em português. */
const EN_PALAVRA = new Set([
  'the', 'past', 'tense', 'correctly', 'fits', 'sentence', 'context', 'of', 'to', 'and',
  'is', 'are', 'was', 'were', 'for', 'with', 'this', 'that', 'from', 'there', 'on', 'in',
]);
const MARCA_TEMPO = ['every day', 'right now', 'last week', 'next week', 'yesterday', 'tomorrow', 'always', 'now'];
const ENSINA = new Set([
  'MAT.OP2', 'CIE.CAUSA', 'ING.N1.PREP', 'ING.N1.BE', 'ING.N1.LIKE', 'HIS.FATO', 'GEO.FATO', 'GEN.CONH',
]);
const CAPITAL = /qual e a capital|capital d[aeo] /;
const SUPERLATIVO = /\b(mais|maior|melhor|pior|principal|famos[oa]|avancad[oa])\b/;
const FATO_SUBJ = /histor|geograf|futebol|arte/;
const CARICATURA =
  /\b(azul|verde|roxo|rosa|amarelo|preto|branco)\b.{0,40}\b(celula|atomo|molecula|planeta)\b|\b(celula|atomo|molecula|planeta)\b.{0,40}\b(azul|verde|roxo|rosa|amarelo|preto|branco)\b/;
export const OPINIAO =
  /\b(o que voce faria|como voce agiria|o que voce acha|voce prefere|o que seria mais sabio|como voce poderia usar|como voce pode aplicar|como voce pode usar|como voce demonstra|se voce tivesse que escolher|o que voce faz|o que fazer)\b/;
const CARICATA =
  /\b(ignorar|ignoraria|ignoro|fingir|fingiria|fingo|burro|falar mal|nao fazer nada|nao comer nada|impor|nao se importar|nao se importaria|deixar para outra pessoa|sair do jogo|criticar|critico)\b/;

const VARIANT_PAIRS: Array<[string, string]> = [
  ['soccer', 'football'],
  ['color', 'colour'],
  ['mom', 'mum'],
  ['gray', 'grey'],
  ['favorite', 'favourite'],
  ['writes', 'writing'],
];

export function hashOf(question: string): string {
  return normalizeQuestion(question);
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

/** Palavra da certa com 5 letras ou mais, inteira no enunciado e em nenhuma errada. */
export function answerWordInStem(question: string, answer: string, options: string[]): boolean {
  const q = normalizeQuizText(question);
  const wrong = options.filter((o) => normalizeQuizText(o) !== normalizeQuizText(answer)).map((o) => normalizeQuizText(o));
  const words = normalizeQuizText(answer).split(' ').filter((w) => w.length >= 5);
  return words.some((w) => {
    const hit = new RegExp(`(?:^| )${w}(?: |$)`);
    if (!hit.test(q)) return false;
    return wrong.every((o) => !hit.test(o));
  });
}

function stemLeak(question: string, answer: string): boolean {
  if (answerLeaksInPrompt(question, answer)) return true;
  const a = normalizeQuizText(answer);
  const q = normalizeQuizText(question);
  if (a.length < 4) return false;
  const stem = a.replace(/e$/, '').slice(0, 6);
  if (stem.length < 4) return false;
  return q.split(' ').some((word) => word.startsWith(stem));
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

function canonSkill(raw: string): string {
  if (SKILLS.has(raw)) return raw;
  const n = normalizeQuizText(raw).replace(/ /g, '');
  if (n.includes('dilema')) return 'LIC.DILEMA';
  if (n.includes('aplica')) return 'LIC.APLICA';
  if (n.includes('ideia')) return 'LIC.IDEIA';
  if (n.includes('matem')) return 'MAT.OP2';
  if (n.includes('cien')) return 'CIE.CAUSA';
  if (n.includes('ingl') || n === 'be' || n.includes('n1be')) return 'ING.N1.BE';
  if (n.includes('hist')) return 'HIS.FATO';
  if (n.includes('geog')) return 'GEO.FATO';
  return raw;
}

function subjectForSkill(skill: string): string {
  if (skill.startsWith('LIC.')) return 'tema';
  if (skill === 'MAT.OP2') return 'matematica';
  if (skill === 'CIE.CAUSA') return 'ciencias';
  if (skill.startsWith('ING.')) return 'ingles';
  if (skill === 'HIS.FATO') return 'historia';
  if (skill === 'GEO.FATO') return 'geografia';
  return '';
}

function inferSkill(subject: string, kind: string): string {
  if (kind === 'lesson') return 'LIC.IDEIA';
  if (subject === 'matematica') return 'MAT.OP2';
  if (subject === 'ciencias') return 'CIE.CAUSA';
  if (subject === 'ingles') return 'ING.N1.PREP';
  if (subject === 'historia') return 'HIS.FATO';
  if (subject === 'geografia') return 'GEO.FATO';
  if (subject === 'futebol') return 'GEN.CONH';
  return 'GEN.CONH';
}

function stripQuoted(text: string): string {
  return text
    .replace(/"[^"]*"/g, ' ')
    .replace(/'[^']*'/g, ' ')
    .replace(/[“”][^“”]*[“”]/g, ' ')
    .replace(/[‘’][^‘’]*[‘’]/g, ' ');
}

/** 40% de palavra funcional aprova. Abaixo disso, só cai se o inglês empatar ou passar o português. */
function explicacaoEmIngles(why: string): boolean {
  const words = normalizeQuizText(stripQuoted(why)).split(' ').filter(Boolean);
  if (words.length === 0) return false;
  const pt = words.filter((w) => PT_FUNCAO.has(w)).length;
  if (pt / words.length >= 0.4) return false;
  const en = words.filter((w) => EN_PALAVRA.has(w) && !PT_FUNCAO.has(w)).length;
  return en >= pt;
}

function sameVerbRoot(options: string[]): boolean {
  const counts = new Map<string, number>();
  for (const option of options) {
    const token = normalizeQuizText(option).replace(/ /g, '');
    if (token.length < 4) continue;
    const root = token.slice(0, 4);
    counts.set(root, (counts.get(root) ?? 0) + 1);
  }
  return [...counts.values()].some((n) => n >= 3);
}

function hasTimeMark(text: string): boolean {
  const n = normalizeQuizText(text);
  return MARCA_TEMPO.some((mark) => n.includes(mark));
}

function futebolSolto(question: string, subject: string): boolean {
  if (subject === 'futebol') return true;
  const nq = normalizeQuizText(question);
  if (FUTEBOL_SOLTO.test(nq)) return true;
  return nq.includes('cartao') && numbersOf(question).length === 0;
}

export function hydrateQuestion(raw: RawQuestion): RawQuestion {
  const named = canonSkill(typeof raw.skill === 'string' ? raw.skill : '');
  const dilemma = raw.kind === 'dilemma' || named === 'LIC.DILEMA';
  const rawWhy = typeof raw.why === 'string' && raw.why.trim() ? raw.why : typeof raw.explanation === 'string' ? raw.explanation : '';
  const why = dilemma ? stripCertaPrefix(rawWhy) : rawWhy;
  const kind = dilemma ? 'dilemma' : raw.kind === 'lesson' ? 'lesson' : 'knowledge';
  let subject = canonSubject(typeof raw.subject === 'string' ? raw.subject : '');
  const skill = SKILLS.has(named) ? named : inferSkill(subject, kind === 'dilemma' ? 'lesson' : kind);
  if (!SUBJECTS.has(subject)) {
    const guessed = subjectForSkill(skill);
    if (guessed) subject = guessed;
  }
  const bloom = typeof raw.bloom === 'string' && BLOOM.has(raw.bloom) ? raw.bloom : kind === 'lesson' ? 'entender' : 'aplicar';
  let audioText = typeof raw.audioText === 'string' ? raw.audioText.trim() : '';
  const question = typeof raw.question === 'string' ? raw.question : '';
  const answer = typeof raw.answer === 'string' ? raw.answer.trim() : '';
  if (subject === 'ingles' && !audioText && /___+/.test(question) && answer) {
    audioText = question.replace(/___+/, answer);
  }
  return { ...raw, subject, kind, why, skill, bloom, ...(audioText ? { audioText } : {}) };
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

  const dilema = skill === 'LIC.DILEMA' || q.kind === 'dilemma';
  if (stemLeak(question, answer) || (!dilema && answerWordInStem(question, answer, options))) r.push('enunciado_vazou');
  if (CAPITAL.test(nq)) r.push('capital');
  if (DEFINICAO.test(nq)) r.push('definicao');
  if (futebolSolto(question, subject)) r.push('futebol_solto');
  if (FATO_SUBJ.test(subject) && SUPERLATIVO.test(nq)) r.push('fato_discutivel');
  if (CARICATURA.test(nq)) r.push('caricatura');
  if (optionsCollide(options)) r.push('duas_certas');
  // No inglês as quatro frases são o mesmo molde com um erro. A palavra de conteúdo
  // (there, table) cola os pares; quem decide duas válidas é ingles_duas_validas.
  if (subject !== 'ingles' && sinonimas(options)) r.push('sinonimas');

  if (subject === 'ingles' && duasVariantesValidas(options)) r.push('ingles_duas_validas');

  const whyMin = skill === 'LIC.DILEMA' || q.kind === 'dilemma' ? 8 : 12;
  if (wordCount(why) < whyMin || wordCount(trap) < 12) r.push('why_curto');
  if (whyCircular(why)) r.push('why_circular');
  if ((skill === 'LIC.DILEMA' || q.kind === 'dilemma') && dilemaComCerta(why)) r.push('dilema_com_certa');
  if (!skill.startsWith('LIC.') && FATO_SOLTO.test(normalizeQuizText(question))) r.push('fato_solto');
  if (why && explicacaoEmIngles(why)) r.push('explicacao_em_ingles');
  if (why && answer && !whyCitesAnswer(why, answer)) r.push('why_sem_resposta');
  if (trap && options.length === 4 && !trapHitsDistractor(trap, options, answer)) r.push('trap_sem_distrator');

  if (options.length === 4) {
    const counts = options.map((o) => wordCount(o));
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const tightLesson = (skill === 'LIC.APLICA' || skill === 'LIC.DILEMA') && max - min > 2;
    if (!(max <= 2 * min || max - min <= 3) || tightLesson) r.push('tamanho_opcoes');
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
    if (sameVerbRoot(options) && !hasTimeMark(question) && !hasTimeMark(audioText)) r.push('ingles_sem_marcador');
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

export interface QuizSlot {
  index: number;
  skill: string;
  kind: 'lesson' | 'dilemma' | 'knowledge';
  area: string;
  scenario?: 'futebol';
}

const AREA_SKILL: Record<string, string> = {
  matemática: 'MAT.OP2',
  ciências: 'CIE.CAUSA',
  inglês: 'ING.N1.BE',
  'história ou geografia': 'HIS.FATO',
};

export function quizSlots(count: number, weekday: number): QuizSlot[] {
  const slots: QuizSlot[] = [];
  const head: QuizSlot[] = [
    { index: 0, skill: 'LIC.IDEIA', kind: 'lesson', area: 'ideia' },
    { index: 1, skill: 'LIC.APLICA', kind: 'lesson', area: 'aplica' },
    { index: 2, skill: 'LIC.DILEMA', kind: 'dilemma', area: 'dilema' },
  ];
  for (const slot of head) {
    if (slots.length >= count) break;
    slots.push(slot);
  }
  const areas = knowledgeAreasForWeekday(weekday);
  let cursor = 0;
  while (slots.length < count) {
    const area = areas[cursor % areas.length];
    cursor += 1;
    const football = area === 'cenário de futebol';
    slots.push({
      index: slots.length,
      skill: football ? '' : (AREA_SKILL[area] ?? 'GEN.CONH'),
      kind: 'knowledge',
      area,
      ...(football ? { scenario: 'futebol' as const } : {}),
    });
  }
  return slots;
}

function skillOf(q: RawQuestion): string {
  return typeof q.skill === 'string' ? q.skill : '';
}

function skillRoom(skill: string, counts: Map<string, number>): boolean {
  if (!skill) return true;
  return (counts.get(skill) ?? 0) < 2;
}

function bumpSkill(counts: Map<string, number>, q: RawQuestion) {
  const skill = skillOf(q);
  if (skill) counts.set(skill, (counts.get(skill) ?? 0) + 1);
}

function mentionsFootball(q: RawQuestion): boolean {
  return /\b(gol|gols|partida|campo|bola|jogador|gramado|tabela)\b/.test(normalizeQuizText(q.question ?? ''));
}

function matchesFixed(q: RawQuestion, slot: QuizSlot): boolean {
  if (q.scenario === 'futebol') return false;
  const skill = skillOf(q);
  if (slot.skill === 'LIC.IDEIA' || slot.skill === 'LIC.APLICA' || slot.skill === 'LIC.DILEMA') return skill === slot.skill;
  if (slot.area === 'inglês') return skill.startsWith('ING.');
  if (slot.area === 'história ou geografia') return skill === 'HIS.FATO' || skill === 'GEO.FATO';
  return skill === slot.skill;
}

function matchesFootball(q: RawQuestion): boolean {
  if (q.subject === 'futebol') return false;
  const skill = skillOf(q);
  if (!ENSINA.has(skill) && !skill.startsWith('ING.')) return false;
  return q.scenario === 'futebol' || mentionsFootball(q);
}

function takeQuestion(
  questions: RawQuestion[],
  used: Set<number>,
  counts: Map<string, number>,
  pred: (q: RawQuestion) => boolean,
): number {
  return questions.findIndex((q, i) => !used.has(i) && pred(q) && skillRoom(skillOf(q), counts));
}

/** A prova publicada segue a posição: ideia, aplica, dilema, depois as áreas do dia. */
export function placeIntoSlots(
  questions: RawQuestion[],
  slots: QuizSlot[],
): { placed: (RawQuestion | null)[]; missing: QuizSlot[] } {
  const used = new Set<number>();
  const counts = new Map<string, number>();
  const placed: (RawQuestion | null)[] = slots.map(() => null);
  const sit = (si: number, pred: (q: RawQuestion) => boolean) => {
    const hit = takeQuestion(questions, used, counts, pred);
    if (hit < 0) return;
    used.add(hit);
    placed[si] = questions[hit];
    bumpSkill(counts, questions[hit]);
  };
  slots.forEach((slot, si) => {
    if (slot.scenario === 'futebol') return;
    sit(si, (q) => matchesFixed(q, slot));
  });
  slots.forEach((slot, si) => {
    if (slot.scenario !== 'futebol') return;
    sit(si, matchesFootball);
  });
  return { placed, missing: slots.filter((_, i) => placed[i] == null) };
}

/** Encaixa o lote novo só no buraco, sem tirar quem já sentou. */
export function fillSlotHoles(
  placed: (RawQuestion | null)[],
  slots: QuizSlot[],
  extra: RawQuestion[],
): { placed: (RawQuestion | null)[]; missing: QuizSlot[] } {
  const counts = new Map<string, number>();
  for (const q of placed) if (q) bumpSkill(counts, q);
  const used = new Set<number>();
  const next = placed.slice();
  const sit = (si: number, pred: (q: RawQuestion) => boolean) => {
    const hit = takeQuestion(extra, used, counts, pred);
    if (hit < 0) return;
    used.add(hit);
    next[si] = extra[hit];
    bumpSkill(counts, extra[hit]);
  };
  slots.forEach((slot, si) => {
    if (next[si] || slot.scenario === 'futebol') return;
    sit(si, (q) => matchesFixed(q, slot));
  });
  slots.forEach((slot, si) => {
    if (next[si] || slot.scenario !== 'futebol') return;
    sit(si, matchesFootball);
  });
  return { placed: next, missing: slots.filter((_, i) => next[i] == null) };
}

/** Vaga que sobrou, inclusive ideia e dilema, aceita pergunta de conhecimento. Cada área no máximo duas vezes. */
export function fillAnyArea(
  placed: (RawQuestion | null)[],
  extra: RawQuestion[],
): { placed: (RawQuestion | null)[]; used: number } {
  const areaOf = (q: RawQuestion) => (typeof q.subject === 'string' && q.subject ? q.subject : 'geral');
  const counts = new Map<string, number>();
  for (const q of placed) {
    if (!q) continue;
    counts.set(areaOf(q), (counts.get(areaOf(q)) ?? 0) + 1);
  }
  const usedIdx = new Set<number>();
  const next = placed.slice();
  let used = 0;
  for (let i = 0; i < next.length; i++) {
    if (next[i]) continue;
    const hit = extra.findIndex((q, j) => !usedIdx.has(j) && (counts.get(areaOf(q)) ?? 0) < 2);
    if (hit < 0) continue;
    usedIdx.add(hit);
    const q = extra[hit];
    next[i] = q.kind === 'dilemma' ? { ...q, kind: 'knowledge' } : q;
    counts.set(areaOf(q), (counts.get(areaOf(q)) ?? 0) + 1);
    used += 1;
  }
  return { placed: next, used };
}

const CIRCULAR_WHY = /amplamente reconhecid|bem documentad|consensual|e um fato historico|e verdade porque e/;

function whyCircular(why: string): boolean {
  const n = normalizeQuizText(why);
  if (!CIRCULAR_WHY.test(n)) return false;
  const rest = n
    .replace(/amplamente reconhecid\w*/g, ' ')
    .replace(/bem documentad\w*/g, ' ')
    .replace(/\bconsensual\b/g, ' ')
    .replace(/e um fato historico/g, ' ')
    .replace(/e verdade porque e/g, ' ');
  if (/\d/.test(why)) return false;
  if (/\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|seculo)\b/.test(rest)) return false;
  if (/\b(brasil|rio|sao paulo|amazonia|minas|bahia|paris|europa|africa|oceano|floresta|cidade)\b/.test(rest)) return false;
  const stop = new Set(['porque', 'pois', 'fato', 'historico', 'verdade', 'amplamente', 'reconhecido', 'reconhecida', 'documentado', 'documentada', 'consensual', 'isso', 'essa', 'esse', 'muito', 'sobre', 'entre', 'quando', 'sempre']);
  const cause = rest.split(' ').filter((w) => w.length >= 5 && !stop.has(w));
  return cause.length < 2;
}

const FATO_SOLTO = /^(qual fato e verdadeiro|qual frase e verdadeira|qual das frases e verdadeira|qual das alternativas e verdadeira)\b/;

/** Tira do começo "A resposta certa é '…' porque/pois/,". O resto começa com maiúscula. */
export function stripCertaPrefix(why: string): string {
  const match = why.match(/^\s*a resposta certa é\s+(?:['"“«][^'"”»]+['"”»]\s*)?(?:porque|pois|,)\s*/i);
  if (!match) return why;
  const rest = why.slice(match[0].length).trim();
  if (!rest) return why;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

function dilemaComCerta(why: string): boolean {
  return /a resposta certa|a certa e/.test(normalizeQuizText(why));
}
