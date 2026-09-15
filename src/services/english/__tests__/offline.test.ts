// ========================================
// Banco de reserva (src/data/englishOfflineContracts.ts): todo item passa no validador
// do tipo sem problemas, respeita faixa de palavras e tokens proibidos do nível, e
// pickOffline é determinístico e evita ids recentes.
// ========================================

import { expect, run, test } from './harness';
import { ENGLISH_WORDS } from '../../../data/englishVocabulary';
import {
  OFFLINE_CONTRACTS,
  OFFLINE_FORGES,
  OFFLINE_LETTERS,
  OFFLINE_NOTES,
  offlineListFor,
  pickOffline,
  type OfflineLevel,
  type OfflineType,
} from '../../../data/englishOfflineContracts';
import { LEVELS, NUMBER_WORDS, findForbiddenTokens, letterWordRange, tokenize } from '../../../config/englishLevels';
import { LETTER_GLOSSARY_MIN, NOTE_BANK_RANGE, SCRAMBLE_WORDS, WORD_SLACK, validateForge, validateLetter, validateNote, wordCount } from '../validators';
import { forgeItemMixFor } from '../prompts';
import { missingInfos } from '../notePrecheck';

const LEVEL_LIST: OfflineLevel[] = [1, 2, 3];
const TYPES: OfflineType[] = ['letter', 'note', 'forge'];
const PER_LEVEL = 6;
const SEED = 7;
/** As 35 palavras do vocabulário conhecido (orange aparece em frutas e em cores) */
const VOCAB_KNOWN = ENGLISH_WORDS.map((w) => w.word);
const ARTICLES = new Set(['a', 'an', 'the']);
const NUMBER_SET = new Set(NUMBER_WORDS);

const fail = (where: string, detail: string): never => {
  throw new Error(`${where}: ${detail}`);
};

const sentencesOf = (text: string): string[] => text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);

// ---------- estrutura ----------

test('vocabulário conhecido tem 35 palavras', () => {
  expect(VOCAB_KNOWN).toHaveLength(35);
  expect(new Set(VOCAB_KNOWN).size).toBe(34);
});

test('6 itens por tipo e nível, ids únicos no banco inteiro, level e tema coerentes', () => {
  const ids = new Set<string>();
  for (const type of TYPES) {
    for (const level of LEVEL_LIST) {
      const list = offlineListFor(type, level);
      expect(list).toHaveLength(PER_LEVEL);
      const themes = new Set<string>();
      for (const entry of list) {
        if (ids.has(entry.id)) fail(entry.id, 'id repetido');
        ids.add(entry.id);
        expect(entry.id).toMatch(new RegExp(`^${type[0]}${level}-0[1-6]$`));
        expect(entry.level).toBe(level);
        expect(entry.theme.length > 0).toBeTruthy();
        themes.add(entry.theme);
      }
      expect(themes.size).toBe(PER_LEVEL);
    }
  }
  expect(ids.size).toBe(TYPES.length * LEVEL_LIST.length * PER_LEVEL);
});

test('OFFLINE_CONTRACTS tem a forma que englishAi.ts lê: [type][level] com entradas { id, content }', () => {
  expect(Object.keys(OFFLINE_CONTRACTS).sort()).toEqual(['forge', 'letter', 'note']);
  expect(Object.keys(OFFLINE_CONTRACTS.letter)).toEqual(['1', '2', '3']);
  expect(OFFLINE_CONTRACTS.letter).toBe(OFFLINE_LETTERS);
  expect(OFFLINE_CONTRACTS.note).toBe(OFFLINE_NOTES);
  expect(OFFLINE_CONTRACTS.forge).toBe(OFFLINE_FORGES);
  const first = OFFLINE_CONTRACTS.letter[1][0];
  expect(typeof first.content.text).toBe('string');
  expect(typeof OFFLINE_CONTRACTS.note[2][0].content.brief).toBe('string');
  expect(OFFLINE_CONTRACTS.forge[3][0].content.items).toHaveLength(6);
});

// ---------- Cartas ----------

test('toda Carta passa em validateLetter com ok e sem problemas, 3 perguntas e glossário novo', () => {
  for (const level of LEVEL_LIST) {
    const lv = LEVELS[level];
    const genres = new Set<string>();
    for (const entry of OFFLINE_LETTERS[level]) {
      const r = validateLetter(entry.content, level, VOCAB_KNOWN, SEED);
      if (!r.ok || r.problems.length) fail(entry.id, r.problems.join(' | ') || 'ok=false');
      expect(r.content.questions).toHaveLength(3);
      expect(r.content.questions.map((qq) => qq.kind)).toEqual(lv.letterQuestionKinds);
      expect(r.content.glossary.length >= LETTER_GLOSSARY_MIN).toBeTruthy();
      expect(r.content.glossary.length <= lv.glossarySize[1]).toBeTruthy();
      expect(r.content.glossary.length).toBe(entry.content.glossary.length);
      for (const g of r.content.glossary) {
        if (VOCAB_KNOWN.includes(g.en.toLowerCase())) fail(entry.id, `glossário com palavra conhecida: ${g.en}`);
        expect(g.pt.length > 0).toBeTruthy();
      }
      for (const qq of r.content.questions) {
        expect(qq.options).toHaveLength(4);
        expect(qq.explanation.length > 0).toBeTruthy();
        expect(qq.evidence.length > 0).toBeTruthy();
      }
      expect(r.content.translation.length > 0).toBeTruthy();
      expect(r.content.title.length > 0).toBeTruthy();
      expect(r.content.sender.length > 0).toBeTruthy();
      genres.add(entry.content.genre);
      // Determinístico com a mesma semente
      expect(validateLetter(entry.content, level, VOCAB_KNOWN, SEED)).toEqual(r);
    }
    expect(genres.size >= 4).toBeTruthy();
  }
});

test('Carta: contagem de palavras dentro da faixa do gênero/nível (sem folga)', () => {
  for (const level of LEVEL_LIST) {
    for (const entry of OFFLINE_LETTERS[level]) {
      const [min, max] = letterWordRange(level, entry.content.genre);
      const words = wordCount(entry.content.text);
      if (words < min || words > max) fail(entry.id, `${words} palavras (esperado ${min}-${max}, gênero ${entry.content.genre})`);
    }
  }
});

test('Carta: nenhum token proibido do nível no texto, nas perguntas e nas opções', () => {
  for (const level of LEVEL_LIST) {
    for (const entry of OFFLINE_LETTERS[level]) {
      const inText = findForbiddenTokens(entry.content.text, level);
      if (inText.length) fail(entry.id, `texto com tokens proibidos: ${inText.join(', ')}`);
      entry.content.questions.forEach((qq, i) => {
        const found = findForbiddenTokens([qq.question, ...qq.options].join(' '), level);
        if (found.length) fail(`${entry.id} pergunta ${i + 1}`, `tokens proibidos: ${found.join(', ')}`);
      });
    }
  }
});

test('Carta: título + remetente distintos por nível (chave da regra dos 14 dias)', () => {
  for (const level of LEVEL_LIST) {
    const keys = new Set(OFFLINE_LETTERS[level].map((e) => `${e.content.title} ${e.content.sender}`.toLowerCase()));
    expect(keys.size).toBe(PER_LEVEL);
  }
});

// ---------- Recados ----------

test('todo Recado passa em validateNote com ok e sem problemas; model contém as 3 informações', () => {
  for (const level of LEVEL_LIST) {
    for (const entry of OFFLINE_NOTES[level]) {
      const r = validateNote(entry.content, level);
      if (!r.ok || r.problems.length) fail(entry.id, r.problems.join(' | ') || 'ok=false');
      expect(r.content.mustInclude).toHaveLength(3);
      expect(missingInfos(entry.content.model, entry.content.mustInclude)).toEqual([]);
      expect(r.content.templates).toEqual(LEVELS[level].noteTemplates);
      expect(r.content.wordBank).toEqual(entry.content.wordBank);
      for (const info of entry.content.mustInclude) {
        expect(info.en.length >= 2).toBeTruthy();
        for (const variant of info.en) {
          const found = findForbiddenTokens(variant, level);
          if (found.length) fail(`${entry.id} "${variant}"`, `tokens proibidos: ${found.join(', ')}`);
        }
      }
    }
  }
});

test('Recado: banco com 10-14 palavras em forma base, sem números, dígitos ou artigos', () => {
  for (const level of LEVEL_LIST) {
    for (const entry of OFFLINE_NOTES[level]) {
      const bank = entry.content.wordBank;
      if (bank.length < NOTE_BANK_RANGE[0] || bank.length > NOTE_BANK_RANGE[1]) fail(entry.id, `banco com ${bank.length} palavras`);
      expect(new Set(bank.map((w) => w.toLowerCase())).size).toBe(bank.length);
      for (const w of bank) {
        if (/\d/.test(w) || NUMBER_SET.has(w) || ARTICLES.has(w)) fail(entry.id, `palavra fora da regra no banco: ${w}`);
        if (w !== w.toLowerCase()) fail(entry.id, `banco com maiúscula: ${w}`);
      }
    }
  }
});

test('Recado: model dentro do nível (frases, tamanho, tokens proibidos) e hint só no nível 3', () => {
  for (const level of LEVEL_LIST) {
    const lv = LEVELS[level];
    for (const entry of OFFLINE_NOTES[level]) {
      const found = findForbiddenTokens(entry.content.model, level);
      if (found.length) fail(entry.id, `model com tokens proibidos: ${found.join(', ')}`);
      const sentences = sentencesOf(entry.content.model);
      if (sentences.length < lv.noteSentences[0] || sentences.length > lv.noteSentences[1]) {
        fail(entry.id, `model com ${sentences.length} frases (esperado ${lv.noteSentences.join('-')})`);
      }
      for (const s of sentences) {
        if (wordCount(s) > lv.maxWords + WORD_SLACK) fail(entry.id, `frase do model com ${wordCount(s)} palavras: "${s}"`);
      }
      expect(entry.content.hint.length > 0).toBe(level === 3);
      expect(entry.content.brief.length > 0).toBeTruthy();
    }
  }
});

test('Recado: brief distinto por nível (chave da regra dos 14 dias)', () => {
  for (const level of LEVEL_LIST) {
    expect(new Set(OFFLINE_NOTES[level].map((e) => e.content.brief)).size).toBe(PER_LEVEL);
  }
});

// ---------- Ferrarias ----------

test('toda Ferraria passa em validateForge com ok e sem problemas, 6 itens, um alvo do cartão do nível', () => {
  for (const level of LEVEL_LIST) {
    const targets = LEVELS[level].forgeTargets;
    const covered = new Set<string>();
    for (const entry of OFFLINE_FORGES[level]) {
      const r = validateForge(entry.content, level, SEED);
      if (!r.ok || r.problems.length) fail(entry.id, r.problems.join(' | ') || 'ok=false');
      expect(r.content.items).toHaveLength(6);
      const target = targets.find((t) => t.label === entry.content.target);
      if (!target) throw new Error(`${entry.id}: alvo fora do cartão do nível: ${entry.content.target}`);
      covered.add(target.id);
      const mix = forgeItemMixFor(level, target.kind);
      const count = { scramble: 0, gap: 0, typed: 0 };
      for (const item of entry.content.items) count[item.kind]++;
      expect(count).toEqual(mix);
      expect(validateForge(entry.content, level, SEED)).toEqual(r);
    }
    expect(covered.size).toBe(targets.length);
  }
});

test('Ferraria: scramble com 4-8 palavras iguais às da resposta; sem tokens proibidos; regras em PT', () => {
  for (const level of LEVEL_LIST) {
    for (const entry of OFFLINE_FORGES[level]) {
      entry.content.items.forEach((item, i) => {
        const where = `${entry.id} item ${i + 1}`;
        expect(item.rule.length > 0).toBeTruthy();
        if (item.kind === 'scramble') {
          const answerWords = tokenize(item.answer);
          if (answerWords.length < SCRAMBLE_WORDS[0] || answerWords.length > SCRAMBLE_WORDS[1]) fail(where, `${answerWords.length} palavras`);
          expect([...item.words].sort()).toEqual([...answerWords].sort());
          const found = findForbiddenTokens(item.answer, level);
          if (found.length) fail(where, `tokens proibidos: ${found.join(', ')}`);
          return;
        }
        expect(item.sentence).toContain('___');
        const filled = item.sentence.replace('___', item.kind === 'gap' ? item.options[item.answer] : item.accepted[0]);
        const found = findForbiddenTokens(filled, level);
        if (found.length) fail(where, `tokens proibidos: ${found.join(', ')}`);
        if (item.kind === 'gap') {
          expect(item.options).toHaveLength(3);
          expect(new Set(item.options.map((o) => o.toLowerCase())).size).toBe(3);
        } else {
          expect(item.prompt.length > 0).toBeTruthy();
          expect(item.accepted.length > 0).toBeTruthy();
        }
      });
    }
  }
});

// ---------- pickOffline ----------

test('pickOffline é determinístico e cobre as 6 entradas ao variar a semente', () => {
  for (const type of TYPES) {
    for (const level of LEVEL_LIST) {
      const seen = new Set<string>();
      for (let seed = 0; seed < 60; seed++) {
        const a = pickOffline(type, level, seed);
        const b = pickOffline(type, level, seed);
        expect(a.id).toBe(b.id);
        expect(a.level).toBe(level);
        seen.add(a.id);
      }
      expect(seen.size).toBe(PER_LEVEL);
    }
  }
});

test('pickOffline evita ids recentes e volta ao banco inteiro quando todos são recentes', () => {
  for (const type of TYPES) {
    for (const level of LEVEL_LIST) {
      const all = offlineListFor(type, level).map((e) => e.id);
      const recent = all.slice(0, 3);
      const seen = new Set<string>();
      for (let seed = 1; seed <= 40; seed++) {
        const chosen = pickOffline(type, level, seed, recent);
        if (recent.includes(chosen.id)) fail(`${type} nível ${level} semente ${seed}`, `escolheu id recente ${chosen.id}`);
        seen.add(chosen.id);
      }
      expect([...seen].sort()).toEqual(all.slice(3).sort());
      const only = pickOffline(type, level, 5, all.slice(1));
      expect(only.id).toBe(all[0]);
      const fallback = pickOffline(type, level, 9, all);
      expect(all).toContain(fallback.id);
      expect(pickOffline(type, level, 9, all).id).toBe(fallback.id);
    }
  }
});

test('pickOffline limita o nível a 1..3 e o conteúdo escolhido passa no validador', () => {
  expect(pickOffline('letter', 0, 3).level).toBe(1);
  expect(pickOffline('note', 9, 3).level).toBe(3);
  expect(pickOffline('forge', Number.NaN, 3).level).toBe(1);
  const letter = pickOffline('letter', 2, 11, ['l2-01']);
  expect(validateLetter(letter.content, 2, VOCAB_KNOWN, 11).ok).toBeTruthy();
  const note = pickOffline('note', 1, 11);
  expect(validateNote(note.content, 1).ok).toBeTruthy();
  const forge = pickOffline('forge', 3, 11);
  expect(validateForge(forge.content, 3, 11).ok).toBeTruthy();
});

void run();
