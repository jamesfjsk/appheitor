// ========================================
// Estante do Sábio (decisão 40): regras puras de contar um livro.
// Sem Firebase. O que paga, o que barra antes da IA, como ler o juiz, o que o Sábio diz.
// ========================================

import type { BookJudge, BookSize, BookSuspect, BookVerdict } from '../../types';

export const BOOK_XP = 40;
export const BOOK_GOLD: Record<BookSize, number> = { curto: 8, medio: 15, longo: 25 };
export const BOOK_MAX_WORDS = 600;
export const BOOK_MIN_WORDS_START = 40;   // pai, 22/09: 80 era muito para começar (baixou para 50, depois 40)
export const BOOK_MIN_WORDS_AFTER = 80;
export const BOOK_EASY_BOOKS = 5;          // até este número de livros aceitos, o mínimo é o de começo e o molde aparece
export const BOOK_ATTEMPTS_PER_DAY = 3;
export const BOOK_JUDGE_MODEL = 'gpt-4o';
export const BOOK_VERIFY_MODEL = 'gpt-4o'; // precisa conhecer o livro para não recusar resposta certa (caso Menino Maluquinho, 22/09)

export function normalizeBookText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chave do título: minúsculas, sem acento, sem artigo inicial, sem pontuação. */
export function titleKeyOf(title: string): string {
  const n = normalizeBookText(title);
  return n.replace(/^(o|a|os|as|um|uma|uns|umas|the|a|an)\s+/, '').trim();
}

/** Chaves de claim em `village.claimed` (sem espaço: caminho de campo do Firestore). */
export function claimKeyForBook(titleKey: string): string {
  return `book:${titleKey.replace(/\s+/g, '-')}`;
}
export function claimKeyForBookDay(date: string): string {
  return `bookday:${date}`;
}

export function sizeForPages(pages: number): BookSize {
  if (pages <= 60) return 'curto';
  if (pages <= 150) return 'medio';
  return 'longo';
}

export function goldForSize(size: BookSize): number {
  return BOOK_GOLD[size];
}

export const BOOK_GOLD_MAX = 100;

/** Valor válido definido pelo pai (inteiro de 1 a 100) ou undefined. */
export function normalizeBookGold(v: unknown): number | undefined {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= BOOK_GOLD_MAX ? n : undefined;
}

/** O que o livro paga: o valor que o pai definiu (complexidade conta) ou, sem ele, o valor pelo tamanho. */
export function goldForBook(book: { size: BookSize; gold?: number }): number {
  return normalizeBookGold(book.gold) ?? goldForSize(book.size);
}

export function minWordsFor(booksDone: number): number {
  return booksDone < BOOK_EASY_BOOKS ? BOOK_MIN_WORDS_START : BOOK_MIN_WORDS_AFTER;
}

export function bookWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Levenshtein simples para títulos curtos. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

export function sameBook(keyA: string, keyB: string): boolean {
  if (!keyA || !keyB) return false;
  if (keyA === keyB) return true;
  return Math.max(keyA.length, keyB.length) >= 6 && editDistance(keyA, keyB) <= 2;
}

/** Palavras de conteúdo (4+ letras) em comum, sobre o maior conjunto. */
export function textSimilarity(a: string, b: string): number {
  const wa = new Set(normalizeBookText(a).split(' ').filter((w) => w.length >= 4));
  const wb = new Set(normalizeBookText(b).split(' ').filter((w) => w.length >= 4));
  if (wa.size === 0 || wb.size === 0) return 0;
  let hit = 0;
  for (const w of wb) if (wa.has(w)) hit += 1;
  return hit / Math.max(wa.size, wb.size);
}

/** A mesma palavra n vezes seguidas ("bom bom bom bom bom"). */
export function repeatedRun(text: string, n = 5): boolean {
  const words = normalizeBookText(text).split(' ').filter(Boolean);
  let run = 1;
  for (let i = 1; i < words.length; i++) {
    run = words[i] === words[i - 1] ? run + 1 : 1;
    if (run >= n) return true;
  }
  return false;
}

export type LocalCode = 'sem_livro' | 'curto' | 'longo' | 'colado' | 'repetido_texto' | 'repetido_palavras' | 'ja_contado' | 'dia_usado' | 'tentativas';

export interface LocalCheckInput {
  text: string;
  pasted: boolean;
  booksDone: number;
  /** Relatos de OUTROS livros: 80% igual a um deles é história reaproveitada. */
  previousTexts: string[];
  /** Tentativas anteriores do MESMO livro: só o texto idêntico barra; completar o texto é o fluxo esperado depois de "faltou". */
  sameBookTexts?: string[];
  minWords?: number;
}

export interface LocalCheck {
  ok: boolean;
  code?: LocalCode;
  say: string;
  words: number;
  minWords: number;
}

/** O que barra antes de gastar uma chamada de IA. O Sábio fala, não a tela. */
export function localCheck(input: LocalCheckInput): LocalCheck {
  const words = bookWordCount(input.text);
  const minWords = input.minWords ?? minWordsFor(input.booksDone);
  if (input.pasted) {
    return { ok: false, code: 'colado', say: 'Isso veio colado. Escreve com as suas mãos, do seu jeito.', words, minWords };
  }
  if (words < minWords) {
    const falta = minWords - words;
    return {
      ok: false,
      code: 'curto',
      say: words === 0
        ? 'Me conta o livro. Pode começar pelo que acontece no começo.'
        : `Tá curto: faltam ${falta} palavras. Me conta o que acontece no meio e como termina.`,
      words,
      minWords,
    };
  }
  if (words > BOOK_MAX_WORDS) {
    return { ok: false, code: 'longo', say: `Ficou grande demais para eu ler de uma vez. Corta para menos de ${BOOK_MAX_WORDS} palavras: só o que importa.`, words, minWords };
  }
  if (repeatedRun(input.text)) {
    return { ok: false, code: 'repetido_palavras', say: 'Tem palavra repetida um monte de vezes seguidas. Isso não conta história. Escreve de verdade.', words, minWords };
  }
  const mine = normalizeBookText(input.text);
  for (const prev of input.sameBookTexts ?? []) {
    if (normalizeBookText(prev) === mine) {
      return { ok: false, code: 'repetido_texto', say: 'Esse é o mesmo texto de antes. Completa o que faltou ou muda alguma coisa e me entrega de novo.', words, minWords };
    }
  }
  for (const prev of input.previousTexts) {
    if (textSimilarity(prev, input.text) >= 0.8) {
      return { ok: false, code: 'repetido_texto', say: 'Esse texto eu já li. Me conta com outras palavras, do jeito que você lembra.', words, minWords };
    }
  }
  return { ok: true, say: '', words, minWords };
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  const a = Date.parse(`${fromYmd}T12:00:00Z`);
  const b = Date.parse(`${toYmd}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function readingDaysLine(days: number): string {
  if (days <= 0) return 'hoje mesmo';
  if (days === 1) return 'em um dia';
  if (days < 7) return `em ${days} dias`;
  if (days < 14) return 'em uma semana';
  if (days < 30) return `em ${Math.round(days / 7)} semanas`;
  return 'em mais de um mês';
}

// ---------- juiz ----------

/** `days` fica guardado no relato para o pai, mas não entra no prompt nem na tela: a data do cadastro não mede quando ele começou a ler (pai, 22/09). */
export function buildBookJudgePrompt(input: { title: string; pages: number; text: string; age: number; days?: number }): { system: string; user: string } {
  const system = `Você é o Sábio da vila de um jogo educativo e professor de 5º ano. Um menino de ${input.age} anos diz que terminou o livro "${input.title}" (${input.pages} páginas) e conta o livro com as próprias palavras. Decida se ele leu de verdade.

Regras:
1. "leu" de 0 a 3: 3 = traz detalhes que só quem leu sabe (nomes, o que acontece, onde, como termina) e eles batem com o livro, se você o conhece; 2 = conta a história com começo, meio e fim, coerente, ainda que simples; 1 = resumo genérico, que caberia em qualquer livro ou saiu da sinopse da capa; 0 = não fala do livro.
2. Se você não conhece o livro, julgue pela coerência interna e pelos detalhes concretos; não reprove por não conhecer.
3. Escrita de criança de ${input.age} anos: erros de ortografia, frases curtas e repetições são ESPERADOS e não tiram ponto. Texto sem erro nenhum, com vocabulário, pontuação e estrutura de resenha adulta marca "suspeito": "ia"; texto que é a sinopse da capa ou de site marca "copiado"; texto que não fala desse livro marca "fora_do_tema". Caso contrário "nenhum".
4. "faltou": lista com o que não apareceu, entre: "comeco", "meio", "fim", "personagem", "opiniao" (opinião com motivo). Vazia se está tudo lá.
5. "comentario": UMA frase do Sábio sobre algo específico que ele escreveu, sem elogio vazio e sem correção de português.
6. "pergunta": uma pergunta curta sobre um fato da HISTÓRIA que NÃO está no texto dele (o que acontece, onde, com quem, o que alguém faz) e que uma criança que leu responde em uma frase; "respostaEsperada": a resposta certa em poucas palavras. Só pergunte se você tem CERTEZA da resposta pelo próprio livro. Nunca pergunte o nome do autor, nem nome de personagem que o livro não dá, nem número de páginas ou capítulos. Se não conhece o livro, pergunte para ele completar um detalhe do que ele mesmo escreveu. Sem certeza: "pergunta" e "respostaEsperada" vazias.
7. "motivo": até 20 palavras, dizendo por que o "leu" é esse.

Responda SOMENTE com JSON: {"leu":0,"motivo":"","faltou":[],"suspeito":"nenhum","comentario":"","pergunta":"","respostaEsperada":""}`;
  const user = `Título: ${input.title}\n\nTexto dele:\n${input.text.trim()}`;
  return { system, user };
}

export function buildVerifyPrompt(input: { title: string; question: string; expected: string; answer: string; text?: string }): { system: string; user: string } {
  const system = `Você conhece livros infantojuvenis e confere a resposta de um menino de 10 anos a uma pergunta sobre o livro "${input.title}".

Regras:
1. "ok": true quando a resposta dele bate com o livro como você o conhece, mesmo que seja diferente da "resposta esperada": a resposta esperada foi escrita por outro leitor e PODE ESTAR ERRADA (por exemplo, dar o nome do autor como se fosse o do personagem). Se a pergunta não tem resposta no livro (o personagem não tem nome, o fato não existe) e ele diz isso, é true.
2. Aceite resposta curta, com erros de português, que traga a ideia certa; aceite também resposta coerente com o que ele mesmo escreveu no relato, quando o livro é pouco conhecido.
3. "ok": false só quando ele diz que não sabe ou não lembra, responde sobre outra coisa, ou contradiz claramente o livro.
4. Na dúvida, true.

Responda SOMENTE com JSON: {"ok": true, "motivo": "até 12 palavras"}`;
  const user = `Pergunta: ${input.question}
Resposta esperada (pode estar errada): ${input.expected}
Resposta dele: ${input.answer.trim()}${input.text ? `

Relato dele sobre o livro:
${input.text.trim()}` : ''}`;
  return { system, user };
}

const SUSPECTS: BookSuspect[] = ['nenhum', 'copiado', 'ia', 'fora_do_tema'];
const FALTOU = new Set(['comeco', 'meio', 'fim', 'personagem', 'opiniao']);

export function parseBookJudge(raw: unknown, model = BOOK_JUDGE_MODEL): BookJudge | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const leuN = Math.round(Number(r.leu));
  if (!Number.isFinite(leuN) || leuN < 0 || leuN > 3) return null;
  const suspeito = SUSPECTS.includes(r.suspeito as BookSuspect) ? (r.suspeito as BookSuspect) : 'nenhum';
  const faltou = Array.isArray(r.faltou) ? r.faltou.map((x) => String(x).toLowerCase()).filter((x) => FALTOU.has(x)) : [];
  const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string).trim() : '');
  const pergunta = str('pergunta');
  const respostaEsperada = str('respostaEsperada');
  return {
    leu: leuN as 0 | 1 | 2 | 3,
    motivo: str('motivo').slice(0, 200),
    faltou,
    suspeito,
    comentario: str('comentario').slice(0, 240),
    ...(pergunta && respostaEsperada ? { pergunta, respostaEsperada } : {}),
    model,
  };
}

export function parseVerify(raw: unknown): { ok: boolean; motivo: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.ok !== 'boolean') return null;
  return { ok: r.ok, motivo: typeof r.motivo === 'string' ? r.motivo.slice(0, 120) : '' };
}

const FALTOU_LINE: Record<string, string> = {
  comeco: 'como a história começa',
  meio: 'o que acontece no meio',
  fim: 'como termina',
  personagem: 'quem é o personagem principal',
  opiniao: 'o que você achou, e por quê',
};

export function faltouLine(faltou: string[]): string {
  const parts = faltou.map((f) => FALTOU_LINE[f]).filter(Boolean);
  if (parts.length === 0) return 'Faltou uma parte da história.';
  if (parts.length === 1) return `Faltou ${parts[0]}.`;
  return `Faltou ${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}.`;
}

export interface VerdictInput {
  judge: BookJudge;
  verifyOk: boolean | null;   // null = não houve pergunta
  title: string;
  gold: number;
}

export interface Verdict {
  verdict: BookVerdict;
  accepted: boolean;
  flagged: boolean;
  say: string;
}

/**
 * Aceito: leu >= 2, sem suspeita forte e (se houve) a pergunta respondida.
 * Suspeita com leu >= 2 aceita e MARCA para o pai (o texto bonito não é castigado; ajuste 3 do pai).
 * Suspeita com leu <= 1 pede reescrita. Fora do tema recusa sem gastar tentativa de "falta".
 */
export function verdictOf(input: VerdictInput): Verdict {
  const { judge } = input;
  if (judge.suspeito === 'fora_do_tema' || judge.leu === 0) {
    return { verdict: 'fora', accepted: false, flagged: false, say: `Isso não parece ser sobre "${input.title}". Me conta desse livro mesmo.` };
  }
  if (input.verifyOk === false) {
    return { verdict: 'falta', accepted: false, flagged: false, say: 'Hum. Isso eu não achei no livro. Me conta de novo essa parte, com o que você lembra.' };
  }
  if (judge.suspeito !== 'nenhum' && judge.leu <= 1) {
    return { verdict: 'suspeito', accepted: false, flagged: true, say: 'Isso está arrumado demais. Me conta do seu jeito, como se fosse para um amigo.' };
  }
  if (judge.leu <= 1 || judge.faltou.length > 0) {
    const line = judge.faltou.length > 0 ? faltouLine(judge.faltou) : 'Ficou genérico: isso caberia em qualquer livro.';
    return { verdict: 'falta', accepted: false, flagged: false, say: `${line} Completa aí e me entrega de novo.` };
  }
  const flagged = judge.suspeito !== 'nenhum';
  const comment = judge.comentario ? ` ${judge.comentario}` : '';
  return { verdict: 'aceito', accepted: true, flagged, say: `Acreditei.${comment} +${input.gold} gold.` };
}

// ---------- o Sábio lendo ----------

export const SABIO_LENDO: string[] = [
  'Deixa eu ler com calma…',
  'Hum. Lendo de novo a sua frase…',
  'Pensando no que você quis dizer…',
  'Quase lá.',
];
export const SABIO_LENDO_STEP_MS = 1600;
export const SABIO_LENDO_MIN_MS = 2400;

export function readingLineAt(ms: number): string {
  const i = Math.min(SABIO_LENDO.length - 1, Math.max(0, Math.floor(ms / SABIO_LENDO_STEP_MS)));
  return SABIO_LENDO[i];
}

export const BOOK_MOLDE = 'O livro conta a história de … No começo … Depois … No fim … O que eu mais gostei foi … porque …';

export const LIKED_LABELS = ['Não gostei', 'Gostei', 'Gostei muito', 'Amei'] as const;
