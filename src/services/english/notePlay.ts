// ========================================
// Recado v2: quadro, molde e pregos (MINA_CONTRATOS.md §3.2).
// Módulo puro: parte o molde, monta a frase, acende os pregos.
// ========================================

import type { NoteInfo, NoteJudgement } from '../../types/english';
import { missingInfos } from './notePrecheck';

export type TemplateBit = { kind: 'text'; text: string } | { kind: 'gap'; index: number };

/** Parte "I need ___ and ___." em texto e lacunas. */
export function splitTemplate(template: string): TemplateBit[] {
  const chunks = template.split(/_{2,}/);
  const out: TemplateBit[] = [];
  let gaps = 0;
  chunks.forEach((chunk, i) => {
    if (chunk) out.push({ kind: 'text', text: chunk });
    if (i < chunks.length - 1) {
      out.push({ kind: 'gap', index: gaps });
      gaps += 1;
    }
  });
  return out;
}

export function gapCount(template: string): number {
  return splitTemplate(template).filter((b) => b.kind === 'gap').length;
}

/** Junta o molde com as peças. Lacuna vazia vira ___. */
export function fillTemplate(template: string, fills: string[]): string {
  const bits = splitTemplate(template);
  return bits
    .map((b) => {
      if (b.kind === 'text') return b.text;
      const w = (fills[b.index] ?? '').trim();
      return w || '___';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}

/** Prego aceso quando aquela informação já está no texto. */
export function pegLit(text: string, infos: NoteInfo[]): boolean[] {
  const miss = new Set(missingInfos(text, infos).map((m) => m.pt));
  return infos.map((info) => !miss.has(info.pt));
}

export function allPegsOn(text: string, infos: NoteInfo[]): boolean {
  return pegLit(text, infos).every(Boolean);
}

/** Uma frase do Capataz a partir da etiqueta. A regra fica; a boca muda. */
export function chalkLine(j: NoteJudgement): string {
  if (j.note && j.note.trim()) return j.note.trim();
  const tag = j.errors[0]?.tag;
  if (tag === 'plural') return 'Depois de two, three... o nome ganha s. Two bags.';
  if (tag === 'article') return 'Uma coisa só pede a, an ou the. A bag. An apple.';
  if (tag === 'verb') return 'Toda frase precisa de um verbo. I need. It is.';
  if (tag === 'spelling') return 'Olha a letra. Em inglês a palavra se escreve assim.';
  if (tag === 'word_order') return 'Em inglês é quem faz, o verbo, depois o quê.';
  if (tag === 'preposition') return 'Lugar e destino: in, on, under, next to, for.';
  if (!j.isEnglish) return 'O quadro pede inglês. Sem palavra de casa.';
  if (j.missing.length) return `O quadro ainda não tem: ${j.missing.join('; ')}.`;
  return 'O Capataz leu. Pode guardar.';
}

export function missingLine(infos: NoteInfo[]): string {
  if (infos.length === 0) return 'O quadro ainda está vazio. Ouve a frase e começa.';
  const first = infos[0]?.pt ?? 'o pedido';
  return `Isso ainda não é o recado. Faltou ${first}. Ouve o inglês e monta de novo.`;
}

/** Palavras da frase-guia + o que já vinha no banco. Sem isso a bandeja mente. */
export function trayWords(model: string, bank: string[], extraPhrases: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw: string) => {
    const t = raw.replace(/[.,!?;:"“”]/g, '').trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  for (const w of model.split(/\s+/)) add(w);
  for (const phrase of extraPhrases) {
    for (const w of phrase.split(/\s+/)) add(w);
  }
  for (const w of bank) add(w);
  return out;
}

export type MoldedNote = { mold: string; slots: string[] };

/** Encaixa a frase-guia num molde do nível: a estrutura fica, só o miolo some. */
export function slotsFromTemplate(model: string, template: string): string[] | null {
  const m = model.replace(/\s+/g, ' ').trim();
  const parts = template.split(/_{2,}/);
  if (parts.length < 2) return null;
  const slots: string[] = [];
  let pos = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === 0) {
      const head = part.replace(/^\s+/, '');
      if (head) {
        if (!m.toLowerCase().startsWith(head.toLowerCase())) return null;
        pos = head.length;
        while (m[pos] === ' ') pos += 1;
      }
      continue;
    }
    if (!part) {
      const tail = m.slice(pos).replace(/[.,!?]+$/u, '').trim();
      if (!tail) return null;
      slots.push(tail);
      pos = m.length;
      continue;
    }
    const idx = m.toLowerCase().indexOf(part.toLowerCase(), pos);
    if (idx < 0) return null;
    const slot = m.slice(pos, idx).trim();
    if (!slot) return null;
    slots.push(slot);
    pos = idx + part.length;
  }
  const leftover = m.slice(pos).replace(/[.,!?\s]+$/u, '').trim();
  if (leftover) return null;
  return slots.length === parts.length - 1 ? slots : null;
}

/** Uma linha vazia por frase. O inglês fica no áudio — o quadro não escreve a resposta. */
export function moldBySentences(model: string): MoldedNote {
  const sentences = (model.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*/g) ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  const slots = sentences.map((s) => s.replace(/[.!?]+$/u, '').trim()).filter(Boolean);
  if (slots.length === 0) return { mold: '', slots: [] };
  const mold = slots.map(() => '___.').join(' ');
  return { mold, slots };
}

export function moldFromTemplates(model: string, templates: string[]): MoldedNote | null {
  for (const t of templates) {
    const slots = slotsFromTemplate(model, t);
    if (slots) return { mold: t.replace(/\s+/g, ' ').trim(), slots };
  }
  return null;
}

/**
 * Molde do recado inteiro: a frase-guia com cada informação virando lacuna.
 * `slots` é o inglês de cada buraco, na ordem do quadro, para o buraco ter o tamanho certo.
 */
/** Buracos vizinhos viram um só: "I ___ ___." confunde — uma frase, uma lacuna. */
function mergeNeighborPicks(
  picks: { start: number; end: number; en: string }[],
  model: string,
): { start: number; end: number; en: string }[] {
  const sorted = [...picks].sort((a, b) => a.start - b.start);
  const out: { start: number; end: number; en: string }[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    const between = last ? model.slice(last.end, p.start) : '';
    if (last && /^[\s.,;:!?]*$/.test(between)) {
      last.end = p.end;
      last.en = model.slice(last.start, last.end).replace(/\s+/g, ' ').trim();
    } else {
      out.push({ ...p });
    }
  }
  return out;
}

export function moldFromModel(model: string, infos: NoteInfo[]): MoldedNote {
  let out = model.trim();
  if (!out) return { mold: '', slots: [] };
  const picks: { start: number; end: number; en: string }[] = [];
  for (const info of infos) {
    const variants = [...info.en].sort((a, b) => b.length - a.length);
    for (const en of variants) {
      const needle = en.toLowerCase();
      const low = out.toLowerCase();
      let from = 0;
      let at = -1;
      while (from < low.length) {
        const i = low.indexOf(needle, from);
        if (i < 0) break;
        const end = i + en.length;
        const overlap = picks.some((p) => i < p.end && end > p.start);
        if (!overlap) {
          at = i;
          break;
        }
        from = i + 1;
      }
      if (at >= 0) {
        picks.push({ start: at, end: at + en.length, en });
        break;
      }
    }
  }
  const merged = mergeNeighborPicks(picks, out);
  const slots = merged.map((p) => p.en);
  [...merged].sort((a, b) => b.start - a.start).forEach((p) => {
    out = `${out.slice(0, p.start)}___${out.slice(p.end)}`;
  });
  const mold = out
    .replace(/\s+/g, ' ')
    .replace(/\s*___/g, ' ___')
    .replace(/___\s*___/g, '___')
    .replace(/___\s*([.,!?])/g, '___$1')
    .replace(/___\s+/g, '___ ')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/([.,!?])([A-Za-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return { mold, slots };
}

/** Largura do buraco em `ch`: cabe a resposta certa e o que ele já pôs. */
export function gapWidthCh(expected: string, filled: string): number {
  const n = Math.max(expected.trim().length, filled.trim().length, 5);
  return Math.min(32, n + 2);
}

export type PegReview = { pt: string; en: string; ok: boolean };

/** Cada prego do recado: o significado em PT, o inglês, e se acendeu. */
export function pegReview(text: string, infos: NoteInfo[]): PegReview[] {
  const lit = pegLit(text, infos);
  return infos.map((info, i) => ({
    pt: info.pt,
    en: info.en[0] ?? info.pt,
    ok: Boolean(lit[i]),
  }));
}

export function pegSay(p: PegReview): string {
  if (p.ok) return `Pegou: ${p.pt}.`;
  return `Faltou: ${p.pt}.`;
}

const clipQuote = (written: string): string => {
  const wrote = written.replace(/\s+/g, ' ').trim();
  if (!wrote) return 'quase nada';
  return `"${wrote.length > 72 ? `${wrote.slice(0, 69)}…` : wrote}"`;
};

/** Fala deste recado e deste pedaço — sem glossário genérico e sem repetir o modelo. */
export function teachFromRecado(info: NoteInfo, brief: string, written: string): { say: string; hear: string } {
  const en = info.en[0] ?? '';
  return {
    say: `Neste recado, ${info.pt} se diz ${en}. O pedido era: ${brief} Você escreveu ${clipQuote(written)} — isso não traz ${info.pt}. Ouve ${en} e põe no quadro.`,
    hear: en,
  };
}

export function isLazyNote(note: string): boolean {
  const n = note.replace(/\s+/g, ' ').trim();
  if (n.length < 36) return true;
  if (/^faltou dizer/i.test(n)) return true;
  if (/correção automática/i.test(n)) return true;
  if (/informações obrigatórias|requisitos não/i.test(n)) return true;
  return false;
}

export function firstHear(j: NoteJudgement, infos: NoteInfo[]): string {
  const miss = infos.find((info) => j.missing.some((m) => m.toLowerCase() === info.pt.toLowerCase()));
  if (miss?.en[0]) return miss.en[0];
  return j.errors[0]?.fix ?? '';
}

export function explainMiss(missing: NoteInfo[], brief = '', written = ''): { say: string; hear: string } {
  const first = missing[0];
  if (!first) return { say: missingLine([]), hear: '' };
  return teachFromRecado(first, brief, written);
}

export function explainJudge(j: NoteJudgement, infos: NoteInfo[], brief = '', written = ''): { say: string; hear: string } {
  if (j.score >= 3) return { say: recadoGrade(3), hear: '' };
  const hear = firstHear(j, infos);
  if (j.note && !isLazyNote(j.note)) return { say: j.note, hear };
  const lesson = j.lessons?.find((l) => l.say && !isLazyNote(l.say));
  if (lesson?.say) return { say: lesson.say, hear: hear || lesson.pt };
  const miss = infos.filter((info) => j.missing.some((m) => m.toLowerCase() === info.pt.toLowerCase()));
  if (miss[0]) return teachFromRecado(miss[0], brief, written);
  const err = j.errors[0];
  if (err?.wrong && err.fix) {
    return {
      say: `Você escreveu ${err.wrong}. Neste recado o certo é ${err.fix}. ${brief}`.trim(),
      hear: err.fix,
    };
  }
  return { say: chalkLine(j), hear };
}

export function pegLesson(p: PegReview, j: NoteJudgement, brief: string, written: string): string {
  const fromAi = j.lessons?.find((l) => l.pt.toLowerCase() === p.pt.toLowerCase())?.say?.trim();
  if (fromAi && !isLazyNote(fromAi)) return fromAi;
  if (p.ok) return `Neste recado, ${p.pt} é ${p.en}.`;
  return teachFromRecado({ pt: p.pt, en: [p.en] }, brief, written).say;
}

export function recadoGrade(score: number): string {
  if (score >= 3) return 'Três pregos acesos. O quadro está certo.';
  if (score === 2) return 'Dois de três. O giz vermelho marca o que falta.';
  if (score === 1) return 'Um prego acendeu. Olha o giz vermelho.';
  return 'O quadro ainda não falou o pedido. Olha o giz.';
}

export type ChalkTok = { text: string; mark: 'same' | 'bad' | 'good' };

const wordsOf = (s: string): string[] => s.split(/\s+/).filter(Boolean);
const wordKey = (w: string): string => w.toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9']/g, '');

/** Diff por palavra no quadro: o que riscar e o que o Capataz escreveu por cima. */
export function chalkDiff(written: string, corrected: string): { left: ChalkTok[]; right: ChalkTok[] } {
  const x = wordsOf(written);
  const y = wordsOf(corrected);
  const n = x.length;
  const m = y.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = wordKey(x[i]) === wordKey(y[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const left: ChalkTok[] = [];
  const right: ChalkTok[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (wordKey(x[i]) === wordKey(y[j])) {
      left.push({ text: x[i], mark: 'same' });
      right.push({ text: y[j], mark: 'same' });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      left.push({ text: x[i], mark: 'bad' });
      i += 1;
    } else {
      right.push({ text: y[j], mark: 'good' });
      j += 1;
    }
  }
  while (i < n) {
    left.push({ text: x[i], mark: 'bad' });
    i += 1;
  }
  while (j < m) {
    right.push({ text: y[j], mark: 'good' });
    j += 1;
  }
  return { left, right };
}
