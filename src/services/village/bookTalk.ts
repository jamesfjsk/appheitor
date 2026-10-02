// ========================================
// Conversa do Sábio sobre o livro (Pacote 16).
// Banco copiado de docs/conteudo/SABIO_CONVERSA_LIVROS.md. Não reescrever as perguntas.
// Sem Firebase. Quem chama o modelo é bookService.ts.
// ========================================

import type { BookTalk, BookTalkClosing, BookTalkTurn, SageMove } from '../../types';
import { bookWordCount, normalizeBookText, textSimilarity, titleKeyOf } from './books';

export const BOOK_TALK_XP = 10;
export const BOOK_TALK_MODEL = 'gpt-4o';
export const SAGE_QUESTION_TEMP = 0.7;
export const SAGE_FOLLOW_TEMP = 0.4;
export const SAGE_CLOSING_TEMP = 0.4;

export const SAGE_NUDGE = 'Me conta com as suas palavras: o que você acha?';
export const LOCAL_CLOSING_LINE = 'Guardei o que você pensou. O seu pai vai ler.';
export const LOCAL_CLOSING: BookTalkClosing = {
  restate: 'Guardei o que você pensou.',
  concept: 'O seu pai vai ler.',
  takeHome: '',
};

export type SageReject = 'fato' | 'licao' | 'perguntas' | 'tamanho' | 'copia';

const FACT_WORD = 'qual|quem|quando|onde|quantos|quantas|como se chama';
const FACT = new RegExp(`^(?:${FACT_WORD})\\b`);
const FACT_AFTER = new RegExp(`[,:;]\\s*(?:${FACT_WORD})\\b`, 'i');
const LESSON = ['voce aprendeu', 'a licao', 'o certo e', 'devemos'];
const QUESTION_PRAISE = ['muito bem', 'parabens', 'que inteligente'];

function hasPhrase(text: string, phrase: string): boolean {
  return new RegExp(`(?:^|\\s)${phrase}(?:\\s|$)`).test(text);
}

function questionHeads(text: string): string[] {
  const chunks = text.split('?');
  if (chunks.length < 2) return [normalizeBookText(text)].filter(Boolean);
  return chunks.slice(0, -1).map((part) => {
    const bits = part.split(/[.!;]/);
    return normalizeBookText(bits[bits.length - 1] || '');
  }).filter(Boolean);
}

function factQuestion(raw: string): boolean {
  const plain = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (FACT_AFTER.test(plain)) return true;
  return questionHeads(raw).some((h) => FACT.test(h));
}

/** As seis regras do §1, no que dá para checar sem opinar: tamanho, um "?", fato, lição, elogio. */
export function checkSageQuestion(text: string): { ok: boolean; reason: SageReject | null } {
  const raw = text.replace(/\s+/g, ' ').trim();
  const words = bookWordCount(raw);
  if (!raw || words === 0 || words > 30) return { ok: false, reason: 'tamanho' };
  if ((raw.match(/\?/g) || []).length !== 1) return { ok: false, reason: 'perguntas' };
  const n = normalizeBookText(raw);
  if (LESSON.some((p) => hasPhrase(n, p))) return { ok: false, reason: 'licao' };
  if (QUESTION_PRAISE.some((p) => hasPhrase(n, p))) return { ok: false, reason: 'licao' };
  if (factQuestion(raw)) return { ok: false, reason: 'fato' };
  return { ok: true, reason: null };
}

/** Vazia, ou "sei lá" sem palavra de conteúdo. "Não sei" e "não lembro" valem. */
export function needsNudge(text: string): boolean {
  const n = normalizeBookText(text);
  if (!n) return true;
  if (/^(nao sei|nao lembro)$/.test(n)) return false;
  return !n.split(' ').some((w) => w.length >= 4);
}

/** "Não sei" vale. Marca em silêncio só quando a frase mostra que ele não leu. */
export function answerMissesStory(text: string): boolean {
  const n = normalizeBookText(text);
  if (!n || /^(nao sei|nao lembro|sei la|nao faco ideia|tanto faz)$/.test(n)) return false;
  return /\bnao li\b|\bnunca li\b|\bnao conheco (esse|o) livro\b|\bnao lembro do livro\b|\bnao lembro da historia\b/.test(n);
}

export function pickMove(answer: string): SageMove {
  const n = normalizeBookText(answer);
  const words = n.split(' ').filter(Boolean);
  if (!n || /^(nao sei|nao lembro|sei la|tanto faz|nao faco ideia)$/.test(n) || words.length <= 4) return 'duas_saidas';
  const because = /\b(porque|por que|pois)\b/.test(n);
  const life = /\b(eu|minha|meu|comigo|na escola|em casa)\b/.test(n);
  if (because && life) return 'sua_vida';
  if (because) return 'exemplo';
  if (/\b(sempre|nunca|com certeza)\b/.test(n) && !/\bmas\b/.test(n)) return 'outro_lado';
  if (words.length < 18) return 'por_que';
  return 'e_se';
}

export type TalkStep = 'need-question' | 'answer-1' | 'need-follow' | 'answer-2' | 'need-closing' | 'done';

export function talkStep(talk: Pick<BookTalk, 'question' | 'turns' | 'closing' | 'doneAt'>): TalkStep {
  if (talk.doneAt) return 'done';
  if (!talk.question) return 'need-question';
  const heitor = talk.turns.filter((t) => t.by === 'heitor').length;
  const sabio = talk.turns.filter((t) => t.by === 'sabio').length;
  if (heitor === 0) return 'answer-1';
  if (sabio < 2) return 'need-follow';
  if (heitor === 1) return 'answer-2';
  if (!talk.closing) return 'need-closing';
  return 'done';
}

export function closingSpeech(closing: BookTalkClosing): string {
  const home = closing.takeHome.trim();
  const lead = home && !/^pergunta para levar\b/i.test(home) ? `Pergunta para levar: ${home}` : home;
  return [closing.restate.trim(), closing.concept.trim(), lead].filter(Boolean).join(' ');
}

// ---------- banco (texto idêntico ao doc) ----------

interface BankQ {
  theme: string;
  label: string;
  question: string;
  follows: Partial<Record<SageMove, string>>;
}

const MATILDA: BankQ[] = [
  {
    theme: 'familia',
    label: 'Família',
    question: 'Os pais da Matilda não cuidavam dela, e a Sra. Mel cuidou. O que faz alguém ser da sua família?',
    follows: {
      outro_lado: 'O Sr. Wormwood diria que ele é o pai de qualquer jeito. Ele tem razão?',
      e_se: 'E se a Sra. Mel fosse brava, mas cuidasse dela direitinho? Ainda seria família?',
    },
  },
  {
    theme: 'justica',
    label: 'Justiça ou vingança',
    question: 'A Matilda pregou peças no pai porque ele era injusto com ela. Dar o troco em quem é injusto é justiça ou vingança?',
    follows: {
      por_que: 'Por que você acha isso?',
      e_se: 'E se a peça tivesse machucado o pai de verdade? Continuaria certo?',
    },
  },
  {
    theme: 'poder',
    label: 'Poder',
    question: 'A diretora Trunchbull mandava em todos porque era forte e era a diretora. Quem manda sempre tem razão?',
    follows: {
      exemplo: 'Tem algum momento do livro em que quem mandava estava errado?',
      sua_vida: 'Já viu alguém mandar sem ter razão? O que dá para fazer?',
    },
  },
  {
    theme: 'ler',
    label: 'Ler',
    question: 'A Matilda preferia os livros, e a família preferia a televisão. Ler muda alguém por dentro? Como?',
    follows: {
      exemplo: 'Qual livro mudou alguma coisa em você?',
    },
  },
];

const FABRICA: BankQ[] = [
  {
    theme: 'castigo',
    label: 'Castigo',
    question: 'Cada criança que saiu da fábrica teve um castigo ligado ao seu defeito. Os castigos foram justos, ou alguns foram grandes demais?',
    follows: {
      exemplo: 'Qual castigo pareceu maior do que o erro?',
      outro_lado: 'O que os pais do Augustus diriam sobre isso?',
    },
  },
  {
    theme: 'sorte',
    label: 'Sorte e mérito',
    question: 'O Charlie ganhou a fábrica sendo quem ele era: pobre, educado, calmo. Ele mereceu ou teve sorte? Dá para separar as duas coisas?',
    follows: {
      e_se: 'E se o Charlie não tivesse achado o dinheiro na neve? Ele mereceria menos?',
    },
  },
  {
    theme: 'crescer',
    label: 'Crescer',
    question: 'O Sr. Wonka escolheu uma criança, e não um adulto, para cuidar da fábrica. O que uma criança enxerga que um adulto esquece?',
    follows: {
      sua_vida: 'Tem alguma coisa que você entende e os adultos não?',
    },
  },
  {
    theme: 'felicidade',
    label: 'Felicidade',
    question: 'A família do Charlie dividia uma cama e uma sopa rala, e mesmo assim parecia feliz. Dinheiro faz alguém feliz?',
    follows: {
      duas_saidas: 'Uns acham que dinheiro compra alegria. Outros acham que a alegria vem das pessoas. Com qual você fica?',
    },
  },
];

const PRINCIPE: BankQ[] = [
  {
    theme: 'importante',
    label: 'O que é importante',
    question: 'A raposa diz que o essencial é invisível aos olhos. O que existe de importante na sua vida que não dá para ver?',
    follows: {
      exemplo: 'Como você sabe que isso existe, se não dá para ver?',
    },
  },
  {
    theme: 'unico',
    label: 'O que torna único',
    question: 'O príncipe viu um jardim com cinco mil rosas iguais à dele, e mesmo assim a dele era única. O que torna uma coisa única para alguém?',
    follows: {
      sua_vida: 'Você tem alguma coisa que é igual a muitas, mas é única para você?',
    },
  },
  {
    theme: 'dono',
    label: 'Ser dono',
    question: 'O homem de negócios contava estrelas para dizer que elas eram dele. Dá para ser dono de uma estrela? O que é ser dono de alguma coisa?',
    follows: {
      outro_lado: 'O que o homem de negócios diria para você?',
    },
  },
  {
    theme: 'cuidar',
    label: 'Cuidar',
    question: 'A raposa diz que a gente é responsável por quem cativa. Cuidar de alguém é obrigação ou escolha?',
    follows: {
      e_se: 'E se cuidar desse muito trabalho? Ainda seria escolha?',
    },
  },
];

/** §2. Exemplos de forma, de outro livro. Alguns furam o validador de propósito: o banco vale quando a IA falha. */
const GENERIC: BankQ[] = [
  { theme: 'familia', label: 'Família', question: 'O que faz alguém ser da sua família: nascer junto ou cuidar?', follows: {} },
  { theme: 'justica', label: 'Justiça e castigo', question: 'Um castigo pode ser grande demais para o erro? Como saber o tamanho certo?', follows: {} },
  { theme: 'sorte', label: 'Sorte e mérito', question: 'Ele ganhou porque mereceu ou porque teve sorte? Dá para separar as duas coisas?', follows: {} },
  { theme: 'poder', label: 'Poder', question: 'Quem manda sempre tem razão?', follows: {} },
  { theme: 'verdade', label: 'Verdade', question: 'Existe mentira que protege alguém? Ela continua sendo errada?', follows: {} },
  { theme: 'coragem', label: 'Coragem', question: 'Ter coragem é não ter medo ou fazer a coisa mesmo com medo?', follows: {} },
  { theme: 'regras', label: 'Regras e liberdade', question: 'Uma regra injusta precisa ser obedecida?', follows: {} },
  { theme: 'felicidade', label: 'Felicidade', question: 'Dá para ser feliz tendo pouco?', follows: {} },
  { theme: 'crescer', label: 'Crescer', question: 'O que os adultos esquecem que as crianças sabem?', follows: {} },
  { theme: 'amizade', label: 'Amizade', question: 'Um amigo de verdade sempre concorda com você?', follows: {} },
  { theme: 'importante', label: 'O que é importante', question: 'O que é importante e não dá para ver?', follows: {} },
  { theme: 'dono', label: 'Ser dono', question: 'O que é ser dono de alguma coisa?', follows: {} },
];

const BOOKS = { matilda: MATILDA, fabrica: FABRICA, principe: PRINCIPE } as const;
type BookKey = keyof typeof BOOKS;

export function bookBankKey(title: string): BookKey | null {
  const k = titleKeyOf(title);
  if (k.includes('matilda')) return 'matilda';
  if (k.includes('fabrica') || k.includes('chocolate')) return 'fabrica';
  if (k.includes('pequeno principe')) return 'principe';
  return null;
}

function bookOf(title: string): BankQ[] | null {
  const key = bookBankKey(title);
  return key ? BOOKS[key] : null;
}

export function localQuestion(title: string, theme?: string): { theme: string; question: string } {
  const book = bookOf(title);
  if (book && theme) {
    const hit = book.find((q) => q.theme === theme);
    if (hit) return { theme: hit.theme, question: hit.question };
  }
  if (theme) {
    const g = GENERIC.find((q) => q.theme === theme);
    if (g) return { theme: g.theme, question: g.question };
  }
  if (book) return { theme: book[0].theme, question: book[0].question };
  return { theme: GENERIC[0].theme, question: GENERIC[0].question };
}

const POR_QUE = 'Por que você acha isso?';

/** Segunda pergunta local: a linha do banco daquele livro, ou a forma do §3 que não tem buraco. */
export function localFollow(title: string, theme: string, move: SageMove): { move: SageMove; question: string } {
  const book = bookOf(title);
  const item = book?.find((q) => q.theme === theme);
  if (item?.follows[move]) return { move, question: item.follows[move] as string };
  if (item) {
    const keys = Object.keys(item.follows) as SageMove[];
    if (keys[0] && item.follows[keys[0]]) return { move: keys[0], question: item.follows[keys[0]] as string };
  }
  if (book) {
    for (const q of book) {
      if (q.follows[move]) return { move, question: q.follows[move] as string };
    }
  }
  return { move: 'por_que', question: POR_QUE };
}

function foreignExamples(title: string): string[] {
  const mine = bookBankKey(title);
  const keys = (Object.keys(BOOKS) as BookKey[]).filter((k) => k !== mine);
  const out: string[] = [];
  for (const k of keys) {
    const q = BOOKS[k].find((item) => checkSageQuestion(item.question).ok);
    if (q) out.push(q.question);
  }
  return out;
}

/** Só os nomes das ideias (§2). A pergunta pronta não entra no prompt: a IA copia. */
const IDEA_LIST = GENERIC.map((g) => `- ${g.label} (${g.theme})`).join('\n');

const EDITION_NAMES = 'Use os nomes do relato dele, na edição brasileira. Na Matilda, a professora é a Sra. Mel, não Sra. Honey.';

const THEME_CONCEPT: Record<string, string> = {
  familia: 'o que é família',
  justica: 'justiça',
  castigo: 'o castigo',
  sorte: 'sorte e mérito',
  poder: 'o poder',
  ler: 'o que a leitura faz',
  crescer: 'crescer',
  felicidade: 'a felicidade',
  importante: 'o que é importante',
  unico: 'o que torna uma coisa única',
  dono: 'o que é ser dono',
  cuidar: 'cuidar de alguém',
  verdade: 'a verdade',
  coragem: 'a coragem',
  regras: 'as regras',
  amizade: 'a amizade',
};

const THEME_ALIAS: Record<string, string> = {
  ler: 'crescer',
  castigo: 'justica',
  unico: 'importante',
  cuidar: 'familia',
};

const MOVE_TABLE = `por_que: ele deu uma opinião sem motivo. Forma: "Por que você acha isso?"
exemplo: ele deu um motivo, mas ficou no ar. Forma: "Tem algum momento do livro que mostra isso?"
e_se: ele tem uma ideia firme. Forma: "E se [uma mudança concreta na cena]? Ainda seria assim?"
outro_lado: ele só olhou um lado. Forma: "O que [personagem do outro lado] diria sobre isso?"
sua_vida: a ideia já está concreta, com motivo. Forma: "Já aconteceu alguma coisa parecida com você?"
duas_saidas: ele disse "não sei" ou respondeu muito curto. Forma: "Uns acham que [A]. Outros acham que [B]. Com qual você fica, e por quê?"`;

function asObj(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    try { return asObj(JSON.parse(t) as unknown); } catch { return null; }
  }
  if (typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.json && typeof r.json === 'object') return r.json as Record<string, unknown>;
  return r;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
}

const MOVE_ALIAS: Record<string, SageMove> = {
  por_que: 'por_que',
  porque: 'por_que',
  por_que_: 'por_que',
  exemplo: 'exemplo',
  um_exemplo: 'exemplo',
  e_se: 'e_se',
  outro_lado: 'outro_lado',
  do_outro_lado: 'outro_lado',
  sua_vida: 'sua_vida',
  na_sua_vida: 'sua_vida',
  duas_saidas: 'duas_saidas',
};

function moveOf(raw: unknown): SageMove | null {
  if (typeof raw !== 'string') return null;
  const spaced = normalizeBookText(raw);
  const key = spaced.replace(/ /g, '_');
  return MOVE_ALIAS[key] || MOVE_ALIAS[spaced] || null;
}

export function parseSageQuestion(raw: unknown): { theme: string; question: string } | null {
  const r = asObj(raw);
  if (!r) return null;
  const question = str(r.question);
  if (!question) return null;
  const theme = normalizeBookText(str(r.theme)).replace(/ /g, '_') || 'familia';
  return { theme, question };
}

function bankLines(): string[] {
  const out: string[] = GENERIC.map((g) => g.question);
  for (const book of Object.values(BOOKS)) {
    for (const item of book) {
      out.push(item.question);
      for (const line of Object.values(item.follows)) if (line) out.push(line);
    }
  }
  return out;
}

/**
 * A mesma medida do projeto (`textSimilarity` ≥ 0,8: palavras de 4+ letras em comum, sobre o maior conjunto).
 * Uma cópia embutida depois da cena conta na janela do tamanho da linha do banco.
 */
export function copiesBankQuestion(question: string): boolean {
  const qWords = question.trim().split(/\s+/).filter(Boolean);
  return bankLines().some((line) => {
    if (textSimilarity(question, line) >= 0.8) return true;
    const content = normalizeBookText(line).split(' ').filter((w) => w.length >= 4);
    const bLen = line.trim().split(/\s+/).filter(Boolean).length;
    if (content.length < 4 || bLen < 4 || qWords.length < bLen) return false;
    for (let i = 0; i <= qWords.length - bLen; i++) {
      if (textSimilarity(qWords.slice(i, i + bLen).join(' '), line) >= 0.8) return true;
    }
    return false;
  });
}

/** Lixo, pergunta recusada ou cópia do banco cai no banco local. */
export function parseTalk(raw: unknown, title: string): { theme: string; question: string } {
  const parsed = parseSageQuestion(raw);
  if (parsed && checkSageQuestion(parsed.question).ok && !copiesBankQuestion(parsed.question)) return parsed;
  return localQuestion(title, parsed?.theme);
}

export function parseSageFollow(raw: unknown): { move: SageMove; question: string; flagged: boolean } | null {
  const r = asObj(raw);
  if (!r) return null;
  const move = moveOf(r.move);
  const question = str(r.question);
  if (!move || !question) return null;
  if (!checkSageQuestion(question).ok) return null;
  return { move, question, flagged: r.flagged === true };
}

const PRAISE = ['muito bem', 'que inteligente', 'resposta certa', 'resposta errada', 'parabens'];

const RESTATE_MAX = 25;
const CONCEPT_MAX = 15;
const HOME_MAX = 20;

function fitsHome(q: string): boolean {
  return q.includes('?') && bookWordCount(q) <= HOME_MAX;
}

/** Pergunta do banco para a ideia da conversa. Inteira: nunca cortada no meio. */
export function takeHomeFromBank(title: string, theme?: string): string {
  const key = (theme || '').replace(/ /g, '_');
  const generic = GENERIC.find((g) => g.theme === key) || GENERIC.find((g) => g.theme === THEME_ALIAS[key]);
  if (generic && fitsHome(generic.question)) return generic.question;
  const book = bookOf(title);
  const item = book?.find((q) => q.theme === key);
  if (item && fitsHome(item.question)) return item.question;
  if (item) {
    for (const line of Object.values(item.follows)) {
      if (line && fitsHome(line)) return line;
    }
  }
  const any = GENERIC.find((g) => fitsHome(g.question));
  return any?.question || GENERIC[0].question;
}

function shapeRestate(text: string): string | null {
  let t = text.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  t = t.replace(/\b(pra|para) mim\b/gi, 'para você');
  if (!/^você disse que\b/i.test(t)) {
    const body = t.replace(/^[«"']+/, '').replace(/[.?!]+$/, '');
    const lower = body.charAt(0).toLowerCase() + body.slice(1);
    t = `Você disse que ${lower}`;
  }
  t = t.replace(/\s+/g, ' ').trim();
  if (bookWordCount(t) > RESTATE_MAX) {
    const sentence = t.split(/(?<=[.!?])\s+/)[0] || '';
    if (sentence && bookWordCount(sentence) <= RESTATE_MAX && /^você disse que\b/i.test(sentence)) t = sentence;
    else t = `${t.split(/\s+/).slice(0, RESTATE_MAX).join(' ').replace(/[,:;]+$/, '')}.`;
  }
  if (!/[.!?]$/.test(t)) t = `${t.replace(/[,:;]$/, '')}.`;
  if (/\bpara mim\b/i.test(t)) return null;
  if (!/^você disse que\b/i.test(t)) return null;
  return t;
}

function shapeConcept(text: string, theme?: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  const n = normalizeBookText(t);
  if (t && bookWordCount(t) <= CONCEPT_MAX && !PRAISE.some((p) => hasPhrase(n, p))) {
    return /[.!?]$/.test(t) ? t : `${t}.`;
  }
  const key = (theme || '').replace(/ /g, '_');
  const name = THEME_CONCEPT[key] || THEME_CONCEPT[THEME_ALIAS[key] || ''] || 'essa ideia';
  return `Você acabou de pensar sobre ${name}.`;
}

/**
 * Cada parte no seu teto. A pergunta para levar, se vier vazia, sem "?" ou longa demais,
 * é trocada por uma do banco. Nunca é cortada palavra por palavra.
 */
export function parseSageClosing(raw: unknown, ctx?: { title?: string; theme?: string }): BookTalkClosing | null {
  const r = asObj(raw);
  if (!r) return null;
  const restateRaw = str(r.restate);
  let takeHome = str(r.takeHome) || str(r.take_home) || str(r.pergunta);
  takeHome = takeHome.replace(/^pergunta para (levar|o jantar)\s*:\s*/i, '').trim();
  const conceptRaw = str(r.concept);
  if (!restateRaw || !conceptRaw) return null;
  const n = normalizeBookText(`${restateRaw} ${conceptRaw} ${takeHome}`);
  if (PRAISE.some((p) => hasPhrase(n, p))) return null;
  const restate = shapeRestate(restateRaw);
  if (!restate) return null;
  const concept = shapeConcept(conceptRaw, ctx?.theme);
  const homeOk = fitsHome(takeHome) && !PRAISE.some((p) => hasPhrase(normalizeBookText(takeHome), p));
  const nextHome = homeOk ? takeHome : takeHomeFromBank(ctx?.title || '', ctx?.theme);
  if (!fitsHome(nextHome)) return null;
  return { restate, concept, takeHome: nextHome };
}

/** Fecho local completo: a ideia dele, o nome do que ele pensou e uma pergunta do banco. */
export function localFullClosing(input: { title: string; theme?: string; answers: string[] }): BookTalkClosing {
  const said = input.answers.map((a) => a.trim()).filter(Boolean).join(' ');
  const restate = shapeRestate(said) || 'Você disse que ainda está pensando nisso.';
  return {
    restate,
    concept: shapeConcept('', input.theme),
    takeHome: takeHomeFromBank(input.title, input.theme),
  };
}

export function parseStoredTalk(raw: unknown): BookTalk | undefined {
  const r = asObj(raw);
  if (!r) return undefined;
  const turns: BookTalkTurn[] = [];
  if (Array.isArray(r.turns)) {
    for (const item of r.turns) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const by = o.by === 'heitor' ? 'heitor' : o.by === 'sabio' ? 'sabio' : null;
      const text = str(o.text);
      if (!by || !text) continue;
      const move = moveOf(o.move);
      turns.push(move ? { by, text, move } : { by, text });
    }
  }
  const question = str(r.question);
  const theme = str(r.theme);
  if (!question && turns.length === 0 && !r.closing && r.skipped !== true) return undefined;
  let closing: BookTalkClosing | undefined;
  if (r.closing && typeof r.closing === 'object') {
    const c = r.closing as Record<string, unknown>;
    const restate = str(c.restate);
    const concept = str(c.concept);
    const takeHome = str(c.takeHome);
    if (restate || concept || takeHome) closing = { restate, concept, takeHome };
  }
  return {
    theme,
    question,
    turns,
    ...(closing ? { closing } : {}),
    ...(typeof r.doneAt === 'string' && r.doneAt ? { doneAt: r.doneAt } : {}),
    ...(r.skipped === true ? { skipped: true } : {}),
    ...(r.flagged === true ? { flagged: true } : {}),
  };
}

export function rejectionHint(reason: SageReject | null): string {
  if (reason === 'fato') return 'A anterior era pergunta de fato (qual, quem, quando, onde, quantos, como se chama). Manda uma sem resposta certa.';
  if (reason === 'licao') return 'A anterior dava lição. Não diga o que ele aprendeu, a lição, o certo é, nem devemos.';
  if (reason === 'perguntas') return 'A anterior não tinha exatamente uma pergunta. Uma só, um ponto de interrogação.';
  if (reason === 'copia') return 'A anterior parecia uma pergunta pronta do banco. Faz outra, saindo de uma cena deste livro.';
  return 'A anterior passou de 30 palavras ou veio vazia. Encurta.';
}

export function buildSageQuestionPrompt(input: { title: string; text: string }): { system: string; user: string } {
  const examples = foreignExamples(input.title);
  const sample = examples.length
    ? `Exemplos de OUTROS livros, só para ver a forma. Não copie o assunto nem o nome se não for este livro:\n${examples.map((q) => `- ${q}`).join('\n')}`
    : '';
  const system = `Você é o Sábio de uma vila, conversando com um menino de 10 anos que acabou de contar o livro "${input.title}". Faça UMA pergunta grande.

Regras, todas obrigatórias:
1. Não tem resposta certa. Dá para defender pelo menos dois lados.
2. Sai de uma cena deste livro, contada em meia frase antes da pergunta.
3. Toca uma ideia grande que uma criança de 10 anos consegue pensar.
4. Cabe em até 30 palavras e tem uma pergunta só, um "?" só.
5. Não é prova. Não comece a pergunta com Qual, Quem, Quando, Onde, Quantos, nem "como se chama".
6. Não dá lição. Nada de "o que você aprendeu", "a lição", "o certo é", "devemos".
7. Não elogie. Nada de "muito bem", "parabéns" ou "que inteligente".
8. Não copie uma pergunta pronta. A cena e as palavras são deste livro e deste relato.

${EDITION_NAMES}

Ideias grandes (escolha uma; "theme" é o id entre parênteses). Só o nome, sem a pergunta pronta:
${IDEA_LIST}

${sample}

Não dê nota, não diga "muito bem", não dê a sua opinião, não faça sermão.
Responda SOMENTE com JSON: {"theme":"familia","question":"..."}`;
  const user = `Livro: ${input.title}\n\nO que ele contou:\n${input.text.trim()}`;
  return { system, user };
}

export function buildSageFollowPrompt(input: { title: string; question: string; answer: string }): { system: string; user: string } {
  const system = `Você é o Sábio de uma vila. O menino de 10 anos respondeu a sua pergunta sobre "${input.title}". Faça a SEGUNDA pergunta, um movimento só, escolhido pela resposta dele.

Tabela:
${MOVE_TABLE}

Regras:
- Uma pergunta só, um "?" só, até 30 palavras.
- Não corrija a ideia dele. Não diga "muito bem", "resposta certa" ou "resposta errada".
- Não faça pergunta de fato (qual, quem, quando, onde, quantos, como se chama).
- "move" é um destes ids: por_que, exemplo, e_se, outro_lado, sua_vida, duas_saidas.
- "flagged": true só se a resposta mostra que ele não conhece a história (diz que não leu, fala de outro livro, inventa um fato que não existe). "Não sei" não é flagged. Na dúvida, false.
- ${EDITION_NAMES}

Responda SOMENTE com JSON: {"move":"por_que","question":"...","flagged":false}`;
  const user = `Pergunta que você fez: ${input.question}\n\nResposta dele: ${input.answer.trim() || 'Não sei'}`;
  return { system, user };
}

export function buildSageClosingPrompt(input: { title: string; question: string; answers: string[] }): { system: string; user: string } {
  const system = `Você é o Sábio de uma vila. Feche a conversa sobre "${input.title}" em três partes, cada uma no seu tamanho.

1. "restate": até 25 palavras. Sempre comece por "Você disse que…", na terceira pessoa, com as palavras dele escritas certo. Nunca "Para mim…" na sua voz.
2. "concept": até 15 palavras. Dê nome ao que ele pensou. Gente pensa nisso há muito tempo. Sem "muito bem" e sem "que inteligente".
3. "takeHome": até 20 palavras, com um "?". Uma pergunta para ele levar para casa, sem resposta certa. Não repita a pergunta que você já fez. Não corte a pergunta no meio.

Não corrija a ideia. Não dê a sua opinião. Não faça sermão. Não diga "resposta certa" nem "resposta errada".
${EDITION_NAMES}
Forma, de uma conversa sobre família (não copie o assunto se ele não falou disso): "Você disse que família é quem cuida, mesmo sem ser do mesmo sangue." / "Você acabou de pensar sobre o que é família." / "quem cuidou de você de um jeito que você nunca esqueceu?"

Responda SOMENTE com JSON: {"restate":"...","concept":"...","takeHome":"..."}`;
  const user = `Pergunta: ${input.question}\n\nRespostas dele:\n${input.answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  return { system, user };
}
