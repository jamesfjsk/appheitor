/** Revisão de lote da prova v3: o que o validador por item não vê.
 *  O veredito que tira pergunta da prova é a chamada em aiDailyQuiz (P0.6). reviewBatch fica como log. */

import { contentWords, normalizeQuizText } from './provaRules';
import { numbersOf, OPINIAO, reachable, type RawQuestion } from './validateQuestion';

export const REVIEWER_MODEL = 'gpt-4o-mini';

export function reviewSystem(level: number): string {
  return `Você é professor de 5º ano corrigindo a prova de outro professor. Para cada pergunta, diga se ela pode ir para um menino de 10 anos.
Reprove (ok: false) se: houver mais de uma alternativa defensável; a pergunta pedir o que ele faria, acharia ou prefere (opinião) e a skill NÃO for LIC.DILEMA; a conta não fechar; faltar dado no enunciado; a certa for a única completa; o inglês estiver fora do cartão do nível ${level} ou testar um fato em vez da língua; o "why" não ensinar a regra ou a conta.
A skill LIC.DILEMA é um dilema de propósito. Aprove. Não reprove por opinião, por "o que você faz" nem por "a certa é a única completa": as quatro atitudes são curtas de propósito. Reprove o dilema só se duas atitudes forem igualmente sábias.
Antes de reprovar a conta, calcule. Se o número da resposta é o resultado das duas etapas, ok true.
"O que aconteceria se" é causa e efeito, não opinião. Não reprove por esse formato.
Não reprove um fato só porque o tema é grande. Reprove fato sem consenso só quando duas opções podem estar certas para um professor de 5º ano. Se uma opção é claramente a certa, ok true. Na dúvida, aprove e marque "duvida": true.
Não reescreva. Não elogie. O motivo tem no máximo 12 palavras e diz o que está errado, não o que fazer.
Quando a aprovação for no limite, ok true e "duvida": true. Se o campo faltar, vale false. "duvida" só importa quando ok é true.
Responda SOMENTE em JSON: {"itens":[{"n":1,"ok":true,"motivo":"","duvida":false}]}`;
}

export interface ReviewItem {
  n: number;
  ok: boolean;
  motivo: string;
  /** Aprovação no limite. Ausente no JSON vale false. */
  duvida: boolean;
}

export interface QuizDuvida {
  n: number;
  question: string;
  motivo: string;
}

/** null = resposta malformada: o veredito local continua valendo. */
export function parseReview(raw: unknown): ReviewItem[] | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { itens?: unknown }).itens)) return null;
  const itens: ReviewItem[] = [];
  for (const item of (raw as { itens: unknown[] }).itens) {
    if (!item || typeof item !== 'object') return null;
    const row = item as { n?: unknown; ok?: unknown; motivo?: unknown; duvida?: unknown };
    const n = Number(row.n);
    if (!Number.isInteger(n) || n < 1 || typeof row.ok !== 'boolean') return null;
    itens.push({
      n,
      ok: row.ok,
      motivo: typeof row.motivo === 'string' ? row.motivo : '',
      duvida: row.duvida === true,
    });
  }
  return itens;
}

export function applyReview(
  questions: RawQuestion[],
  review: ReviewItem[] | null,
): { kept: RawQuestion[]; motivos: { n: number; motivo: string; question: string }[]; duvidas: QuizDuvida[] } {
  if (!review) return { kept: questions, motivos: [], duvidas: [] };
  const bad = new Map(review.filter((item) => !item.ok).map((item) => [item.n, item.motivo]));
  const motivos: { n: number; motivo: string; question: string }[] = [];
  const duvidas: QuizDuvida[] = [];
  for (const item of review) {
    if (!item.ok || !item.duvida) continue;
    const q = questions[item.n - 1];
    if (!q) continue;
    duvidas.push({ n: item.n, question: String(q.question ?? ''), motivo: item.motivo });
  }
  const kept = questions.filter((q, i) => {
    if (!bad.has(i + 1)) return true;
    motivos.push({ n: i + 1, motivo: bad.get(i + 1) ?? '', question: String(q.question ?? '') });
    return false;
  });
  return { kept, motivos, duvidas };
}

/** O revisor chama o dilema de opinião ou de "única completa". O formato é esse: a pergunta fica, com dúvida. */
export function rescueDilemma(questions: RawQuestion[], review: ReviewItem[] | null): ReviewItem[] | null {
  if (!review) return review;
  return review.map((item) => {
    if (item.ok) return item;
    const q = questions[item.n - 1];
    if (!q) return item;
    const motivo = normalizeQuizText(item.motivo);
    const dilema = q.skill === 'LIC.DILEMA' || q.kind === 'dilemma';
    const falsoDeConta = /nao e sobre lingua|nao e sobre conta|nao trata de lingua/.test(motivo);
    const falsoDeOpiniao = dilema && /opinia|unica completa|unica mais longa|o que (ele|voce)/.test(motivo);
    const licao = q.skill === 'LIC.IDEIA' || q.skill === 'LIC.APLICA';
    const unicaFalsa = licao && /unica completa|unica mais longa/.test(motivo);
    const nq = normalizeQuizText(String(q.question ?? ''));
    const stemOpiniao = OPINIAO.test(nq) || /como voce|o que voce|voce usaria|voce demonstra/.test(nq);
    const opiniaoFalsa = /opinia/.test(motivo) && !stemOpiniao && !dilema;
    const nums = numbersOf(String(q.question ?? ''));
    const [ans] = numbersOf(String(q.answer ?? ''));
    const contaFecha = ans != null && !reachable(nums, ans, 1) && reachable(nums, ans, 2);
    const contaFalsa = /conta nao fecha/.test(motivo) && contaFecha;
    const duas = dilema && /duas atitudes|igualmente sabias|duas opcoes podem/.test(motivo);
    const ajuda = /\b(explic|ensin|cham|ajud|conto|avis|peco|convid)/;
    const erradas = (q.options ?? []).filter((o) => normalizeQuizText(o) !== normalizeQuizText(String(q.answer ?? '')));
    const segundaAjuda = erradas.some((o) => ajuda.test(normalizeQuizText(o)));
    const duasFalsas = duas && erradas.length > 0 && !segundaAjuda;
    if (!falsoDeConta && !falsoDeOpiniao && !opiniaoFalsa && !unicaFalsa && !contaFalsa && !duasFalsas) return item;
    return { ...item, ok: true, duvida: true, motivo: item.motivo || 'no limite' };
  });
}

export function reviewBatch(questions: RawQuestion[], lesson = ''): string[] {
  const issues: string[] = [];
  const math = questions.filter((q) => q.subject === 'matematica');
  const twoStep = math.filter((q) => {
    const [ans] = numbersOf(q.answer ?? '');
    if (ans == null) return false;
    const nums = numbersOf(q.question ?? '');
    return !reachable(nums, ans, 1) && reachable(nums, ans, 2);
  });
  if (math.length > 0 && twoStep.length < 1) issues.push('falta_duas_etapas');

  const altFormat = questions.filter((q) =>
    /o que aconteceria se|ache o erro|qual frase e verdadeira|estime /i.test(q.question ?? ''),
  );
  if (altFormat.length < 2) issues.push('falta_formato');

  const en = questions.filter((q) => q.subject === 'ingles');
  if (en.length >= 3) {
    const skills = new Set(en.map((q) => q.skill).filter(Boolean));
    if (skills.size > 1) issues.push('ingles_mistura_regra');
  }

  if (lesson) {
    const idea = new Set(contentWords(lesson));
    const lessonQs = questions.filter((q) => q.kind === 'lesson');
    const off = lessonQs.filter((q) => !contentWords(q.question ?? '').some((w) => idea.has(w)));
    if (off.length > 0) issues.push('licao_sem_ideia');
  }

  const seen = new Set<string>();
  for (const q of questions) {
    const h = normalizeQuizText(q.question ?? '');
    if (seen.has(h)) issues.push('lote_duplicata');
    seen.add(h);
  }

  return issues;
}
