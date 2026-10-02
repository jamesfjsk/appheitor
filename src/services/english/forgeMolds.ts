// Barras da Ferraria saem de molde (§9.3). A resposta é calculada pela regra. Sem IA.

import type { ForgeItem } from '../../types/english';
import { unitById, type EnglishUnit } from '../../config/englishUnits';
import { shuffleOptions } from './shuffle';

export interface ReviewBar {
  item: ForgeItem;
}

const COMMON = new Set([
  'i', 'you', 'we', 'they', 'he', 'she', 'it', 'a', 'an', 'the', 'my', 'is', 'am', 'are',
  'to', 'in', 'on', 'under', 'and', 'but', 'because', 'there', 'have', 'want', 'need',
  'can', "can't", 'cannot', "don't", "doesn't", 'does', 'not', 'some', 'any', 'of', 'for',
  'please', 'thank', 'with', 'now', 'first', 'after', 'too', 'at', 'do', 'on', 'bed', 'fast',
  'home', 'soccer', 'pizza', 'water', 'play', 'like', 'fish', 'milk', 'books', 'mom', 'dad',
  'going', 'doing', 'playing', 'liking', 'reading', 'running', 'watching',
]);

const DAY1 = ['choose', 'choose', 'gap', 'gap', 'gap', 'build'] as const;
const LATER = ['choose', 'gap', 'gap', 'build', 'build', 'type'] as const;

interface Raw {
  kind: 'choose' | 'gap' | 'build' | 'type';
  item: ForgeItem;
}

function gap(sentence: string, options: string[], answer: number, rule: string): ForgeItem {
  return { kind: 'gap', sentence, options, answer, rule };
}

function build(pieces: string[], rule: string): ForgeItem {
  return { kind: 'scramble', words: pieces, answer: pieces.join(' '), rule };
}

function typed(prompt: string, sentence: string, accepted: string[], rule: string): ForgeItem {
  return { kind: 'typed', prompt, sentence, accepted, rule };
}

function choosePair(right: string, wrong: string, rule: string): ForgeItem {
  return gap('Qual está certa?', [right, wrong], 0, rule);
}

const POOLS: Record<string, Raw[]> = {
  u1: [
    { kind: 'choose', item: gap('The eggs ___ cold.', ['is', 'are'], 1, 'Duas ou mais usam are.') },
    { kind: 'choose', item: gap('My dogs ___ hungry.', ['is', 'are'], 1, 'Duas ou mais usam are.') },
    { kind: 'gap', item: gap('I ___ at school.', ['am', 'is', 'are'], 0, 'I usa am.') },
    { kind: 'gap', item: gap('The lamp ___ new.', ['am', 'is', 'are'], 1, 'Uma coisa usa is.') },
    { kind: 'gap', item: gap('You ___ ready.', ['am', 'is', 'are'], 2, 'You usa are.') },
    { kind: 'build', item: build(['My dog', 'is', 'in the garden'], 'Um bicho usa is.') },
    { kind: 'build', item: build(['The books', 'are', 'on the table'], 'Duas ou mais usam are.') },
    { kind: 'type', item: typed('My boots ___ wet.', 'My boots ___ wet.', ['are'], 'Duas ou mais usam are.') },
    { kind: 'choose', item: gap('The cat ___ tired.', ['is', 'are'], 0, 'Um bicho usa is.') },
    { kind: 'gap', item: gap('They ___ late.', ['am', 'is', 'are'], 2, 'They usa are.') },
  ],
  u2: [
    { kind: 'choose', item: gap('I want ___ apple.', ['a', 'an'], 1, 'Som de vogal pede an.') },
    { kind: 'choose', item: gap('I have ___ dog.', ['a', 'an'], 0, 'Os outros sons pedem a.') },
    { kind: 'gap', item: gap('There is ___ old book in the box.', ['a', 'an'], 1, 'Old começa com som de vogal.') },
    { kind: 'gap', item: gap('It is ___ big egg.', ['a', 'an'], 0, 'Big começa com som de consoante.') },
    { kind: 'gap', item: gap('I want ___ orange.', ['a', 'an'], 1, 'Orange pede an.') },
    { kind: 'build', item: build(['I', 'have', 'an', 'egg'], 'Egg pede an.') },
    { kind: 'build', item: build(['I', 'want', 'a', 'ball'], 'Ball pede a.') },
    { kind: 'type', item: typed('I want ___ orange.', 'I want ___ orange.', ['an'], 'Orange pede an.') },
    { kind: 'choose', item: gap('I have ___ umbrella.', ['a', 'an'], 1, 'Umbrella pede an.') },
    { kind: 'gap', item: gap('There is ___ lamp in the box.', ['a', 'an'], 0, 'Lamp pede a.') },
  ],
  u3: [
    { kind: 'choose', item: gap('I see three ___.', ['book', 'books'], 1, 'Mais de um ganha -s.') },
    { kind: 'choose', item: gap('I have two ___.', ['dog', 'dogs'], 1, 'Mais de um ganha -s.') },
    { kind: 'gap', item: gap('I have ___ cats.', ['one', 'two', 'a'], 1, 'O número vem antes do plural.') },
    { kind: 'gap', item: gap('There are ___ eggs.', ['one', 'three', 'a'], 1, 'Mais de um usa o número e o -s.') },
    { kind: 'gap', item: gap('I need ___ books.', ['one', 'two', 'a'], 1, 'Mais de um ganha -s.') },
    { kind: 'build', item: build(['I', 'have', 'two', 'dogs'], 'O número vem antes.') },
    { kind: 'build', item: build(['I', 'see', 'three', 'books'], 'Mais de um ganha -s.') },
    { kind: 'type', item: typed('There are five ___. (book)', 'There are five ___.', ['books'], 'Mais de um ganha -s.') },
    { kind: 'choose', item: gap('I have one ___.', ['cat', 'cats'], 0, 'Um não ganha -s.') },
    { kind: 'gap', item: gap('I see ___ balls.', ['a', 'two', 'one'], 1, 'O número vem antes.') },
  ],
  u4: [
    { kind: 'choose', item: gap('There ___ three books on the table.', ['is', 'are'], 1, 'Duas ou mais: there are.') },
    { kind: 'choose', item: gap('There ___ a cat under the bed.', ['is', 'are'], 0, 'Uma coisa: there is.') },
    { kind: 'gap', item: gap('There ___ an egg in the fridge.', ['is', 'are', 'am'], 0, 'Uma coisa: there is.') },
    { kind: 'gap', item: gap('There ___ two balls in my bag.', ['is', 'are', 'am'], 1, 'Duas ou mais: there are.') },
    { kind: 'gap', item: gap('There ___ a lamp on the table.', ['is', 'are', 'am'], 0, 'Uma coisa: there is.') },
    { kind: 'build', item: build(['There is', 'a cat', 'under the bed'], 'Uma coisa: there is.') },
    { kind: 'build', item: build(['There are', 'two eggs', 'in the box'], 'Duas ou mais: there are.') },
    { kind: 'type', item: typed('There ___ two balls in my bag.', 'There ___ two balls in my bag.', ['are'], 'Duas ou mais: there are.') },
    { kind: 'choose', item: gap('There ___ one book in the box.', ['is', 'are'], 0, 'Uma coisa: there is.') },
    { kind: 'gap', item: gap('There ___ three eggs on the table.', ['is', 'are', 'am'], 1, 'Duas ou mais: there are.') },
  ],
  u5: [
    { kind: 'choose', item: choosePair('I want to sleep.', 'I want sleep.', 'Ação pede to.') },
    { kind: 'choose', item: choosePair('I want pizza.', 'I want to pizza.', 'Coisa fica sem to.') },
    { kind: 'gap', item: gap('I need ___ my homework.', ['to do', 'do', 'doing'], 0, 'Ação depois de need pede to.') },
    { kind: 'gap', item: gap('We want ___ soccer.', ['to play', 'play', 'playing'], 0, 'Ação depois de want pede to.') },
    { kind: 'gap', item: gap('They need ___ home.', ['to go', 'go', 'going'], 0, 'Ação depois de need pede to.') },
    { kind: 'build', item: build(['I want', 'to play', 'soccer'], 'Ação pede to.') },
    { kind: 'build', item: build(['I need', 'to sleep'], 'Ação pede to.') },
    { kind: 'type', item: typed('We want ___ eat pizza.', 'We want ___ eat pizza.', ['to'], 'Ação pede to.') },
    { kind: 'choose', item: choosePair('I need to read.', 'I need read.', 'Ação pede to.') },
    { kind: 'gap', item: gap('I want ___.', ['water', 'to water', 'to'], 0, 'Coisa fica sem to.') },
  ],
  u6: [
    { kind: 'choose', item: gap('A fish ___ walk.', ['can', "can't"], 1, 'Um peixe não anda.') },
    { kind: 'choose', item: gap('A bird ___ fly.', ['can', "can't"], 0, 'Um pássaro voa.') },
    { kind: 'gap', item: gap('I can ___ fast.', ['run', 'to run', 'runs'], 0, 'Depois de can, a ação fica sem to.') },
    { kind: 'gap', item: gap('A cat ___ climb a tree.', ['can', "can't", 'to'], 0, 'Um gato sobe.') },
    { kind: 'gap', item: gap('A dog ___ fly.', ['can', "can't", 'to'], 1, 'Um cachorro não voa.') },
    { kind: 'build', item: build(['A bird', 'can', 'fly'], 'Um pássaro voa.') },
    { kind: 'build', item: build(['A fish', "can't", 'walk'], 'Um peixe não anda.') },
    { kind: 'type', item: typed('A dog ___ fly.', 'A dog ___ fly.', ["can't", 'cant', 'cannot', 'can not'], 'Um cachorro não voa.') },
    { kind: 'choose', item: gap('A cow ___ fly.', ['can', "can't"], 1, 'Uma vaca não voa.') },
    { kind: 'gap', item: gap('A frog ___ jump.', ['can', "can't", 'to'], 0, 'Um sapo pula.') },
  ],
  u7: [
    { kind: 'choose', item: gap('My dad ___ tea.', ['drink', 'drinks'], 1, 'He, she e o nome ganham -s.') },
    { kind: 'choose', item: gap('I ___ soccer.', ['play', 'plays'], 0, 'I fica sem -s.') },
    { kind: 'gap', item: gap('She ___ soccer.', ['play', 'plays', 'playing'], 1, 'She ganha -s.') },
    { kind: 'gap', item: gap('They ___ books.', ['read', 'reads', 'reading'], 0, 'They fica sem -s.') },
    { kind: 'gap', item: gap('Leo ___ chess.', ['play', 'plays', 'playing'], 1, 'O nome ganha -s.') },
    { kind: 'build', item: build(['My dog', 'sleeps', 'on the bed'], 'Um bicho no singular ganha -s.') },
    { kind: 'build', item: build(['Ana', 'reads', 'books'], 'O nome ganha -s.') },
    { kind: 'type', item: typed('Ana ___ books. (read)', 'Ana ___ books.', ['reads'], 'O nome ganha -s.') },
    { kind: 'choose', item: gap('We ___ pizza.', ['like', 'likes'], 0, 'We fica sem -s.') },
    { kind: 'gap', item: gap('He ___ fast.', ['run', 'runs', 'running'], 1, 'He ganha -s.') },
  ],
  u8: [
    { kind: 'choose', item: gap('My mom ___ drink coffee.', ["don't", "doesn't"], 1, 'She usa doesn\'t.') },
    { kind: 'choose', item: gap('I ___ like fish.', ["don't", "doesn't"], 0, 'I usa don\'t.') },
    { kind: 'gap', item: gap("Ana doesn't ___ milk.", ['like', 'likes', 'liking'], 0, 'Depois de doesn\'t a ação fica sem -s.') },
    { kind: 'gap', item: gap('They ___ play chess.', ["don't", "doesn't", 'not'], 0, 'They usa don\'t.') },
    { kind: 'gap', item: gap('Leo ___ eat carrots.', ["don't", "doesn't", 'not'], 1, 'O nome usa doesn\'t.') },
    { kind: 'build', item: build(['I', "don't like", 'fish'], 'I usa don\'t.') },
    { kind: 'build', item: build(['She', "doesn't like", 'fish'], 'She usa doesn\'t.') },
    { kind: 'type', item: typed('My dog ___ like cats.', 'My dog ___ like cats.', ["doesn't", 'doesnt', 'does not'], 'Um bicho no singular usa doesn\'t.') },
    { kind: 'choose', item: gap('We ___ watch TV.', ["don't", "doesn't"], 0, 'We usa don\'t.') },
    { kind: 'gap', item: gap("He doesn't ___ chess.", ['play', 'plays', 'playing'], 0, 'Depois de doesn\'t a ação fica sem -s.') },
  ],
  u9: [
    { kind: 'choose', item: gap('Are there ___ apples?', ['some', 'any'], 1, 'Pergunta pede any.') },
    { kind: 'choose', item: gap('I have ___ bananas.', ['some', 'any'], 0, 'Frase que afirma pede some.') },
    { kind: 'gap', item: gap('There are ___ eggs.', ['some', 'any'], 0, 'Frase que afirma pede some.') },
    { kind: 'gap', item: gap("I don't have ___ water.", ['some', 'any'], 1, 'Frase com not pede any.') },
    { kind: 'gap', item: gap('Do you have ___ books?', ['some', 'any'], 1, 'Pergunta pede any.') },
    { kind: 'build', item: build(['I', 'have', 'some', 'apples'], 'Frase que afirma pede some.') },
    { kind: 'build', item: build(['Are there', 'any', 'eggs'], 'Pergunta pede any.') },
    { kind: 'type', item: typed("We don't have ___ milk.", "We don't have ___ milk.", ['any'], 'Frase com not pede any.') },
    { kind: 'choose', item: gap('We need ___ bread.', ['some', 'any'], 0, 'Frase que afirma pede some.') },
    { kind: 'gap', item: gap('Is there ___ juice?', ['some', 'any'], 1, 'Pergunta pede any.') },
  ],
  u10: [
    { kind: 'choose', item: choosePair('I stay home because it is cold.', 'I stay home because is cold.', 'O motivo tem alguém fazendo.') },
    { kind: 'choose', item: choosePair('I am happy because it is Friday.', 'I am happy because is Friday.', 'O motivo tem alguém fazendo.') },
    { kind: 'gap', item: gap('I sleep because ___ am tired.', ['I', 'it', 'is'], 0, 'O motivo começa com alguém.') },
    { kind: 'gap', item: gap('I eat because ___ am hungry.', ['I', 'it', 'is'], 0, 'O motivo começa com alguém.') },
    { kind: 'gap', item: gap('I wear a coat because ___ is cold.', ['it', 'I', 'is'], 0, 'O motivo tem alguém fazendo.') },
    { kind: 'build', item: build(['I eat', 'because', 'I am hungry'], 'because liga o que acontece ao motivo.') },
    { kind: 'build', item: build(['I wait', 'because', 'dinner is first'], 'because liga o que acontece ao motivo.') },
    { kind: 'type', item: typed('I am late ___ the bus is slow.', 'I am late ___ the bus is slow.', ['because'], 'because liga o motivo.') },
    { kind: 'choose', item: choosePair('I sleep because I am tired.', 'I sleep because am tired.', 'O motivo tem alguém fazendo.') },
    { kind: 'gap', item: gap('I am late because ___ bus is slow.', ['the', 'a', 'is'], 0, 'O motivo tem alguém fazendo.') },
  ],
};

function take(pool: Raw[], kind: Raw['kind'], seed: number, n: number, freeze: boolean, used: Set<string>): ForgeItem {
  const rows = pool.filter((row) => row.kind === kind);
  const pick = Math.abs(seed + n) % rows.length;
  for (let hop = 0; hop < rows.length; hop++) {
    const row = rows[(pick + hop) % rows.length];
    const key = JSON.stringify(row.item);
    if (used.has(key)) continue;
    used.add(key);
    return reshape(row.item, seed + n * 11, freeze);
  }
  return reshape(rows[pick].item, seed + n * 11, freeze);
}

function reshape(item: ForgeItem, seed: number, freeze: boolean): ForgeItem {
  if (freeze || item.kind !== 'gap') return item;
  const moved = shuffleOptions(item.options, item.answer, seed);
  return { ...item, options: moved.options, answer: moved.answer };
}

export function forgeItemsFor(unitId: string, dayInUnit: number, seed: number, review: ReviewBar[] = []): ForgeItem[] {
  const pool = POOLS[unitId] ?? POOLS.u1;
  const mix = dayInUnit <= 1 ? DAY1 : LATER;
  const freeze = seed === 1 && dayInUnit <= 1;
  const used = new Set<string>();
  const made = mix.map((kind, i) => take(pool, kind, seed, i, freeze, used));
  const extra = review.slice(0, 2).map((row) => row.item);
  if (extra.length === 0) return made;
  return [...made.slice(0, 6 - extra.length), ...extra];
}

function tokens(text: string): string[] {
  return text.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
}

function allowed(unit: EnglishUnit): Set<string> {
  const set = new Set(COMMON);
  for (const word of unit.words) set.add(word.toLowerCase());
  return set;
}

export function checkForgeItem(unitId: string, item: ForgeItem): string[] {
  const unit = unitById(unitId);
  const words = allowed(unit);
  const problems: string[] = [];
  const know = (text: string) => {
    for (const token of tokens(text)) {
      const stem = token.endsWith('ing') && token.length > 4 ? token.slice(0, -3) : token.endsWith('s') && token.length > 3 ? token.slice(0, -1) : token;
      if (!words.has(token) && !words.has(stem)) problems.push(`fora:${token}`);
    }
  };
  if (item.kind === 'gap') {
    if (item.options.length < 2) problems.push('opcoes');
    if (new Set(item.options).size !== item.options.length) problems.push('iguais');
    if (item.answer < 0 || item.answer >= item.options.length) problems.push('resposta');
    if (item.sentence !== 'Qual está certa?') know(item.sentence);
    item.options.forEach(know);
  } else if (item.kind === 'scramble') {
    if (item.words.length < 2 || item.words.length > 5) problems.push('pecas');
    if (new Set(item.words.map((w) => w.toLowerCase())).size !== item.words.length) problems.push('repetida');
    if (item.words.join(' ') !== item.answer) problems.push('ordem');
    item.words.forEach(know);
  } else {
    if (item.accepted.length < 1) problems.push('aceite');
    know(item.sentence);
    const forms = new Set(item.accepted.map((s) => s.toLowerCase().replace(/[’]/g, "'")));
    if (item.accepted[0] && !forms.has(item.accepted[0].toLowerCase())) problems.push('forma');
  }
  return problems;
}

/** Só uma opção é a certa. As outras são a forma errada da mesma regra. */
export function soleAnswer(item: ForgeItem): boolean {
  if (item.kind === 'gap') {
    const right = item.options[item.answer];
    return item.options.filter((option) => option === right).length === 1 && new Set(item.options).size === item.options.length;
  }
  if (item.kind === 'scramble') return new Set(item.words).size === item.words.length;
  return item.accepted.length > 0 && new Set(item.accepted.map((s) => s.toLowerCase())).size === item.accepted.length;
}

export function typedAccepts(item: ForgeItem, said: string): boolean {
  if (item.kind !== 'typed') return false;
  const norm = (s: string) => s.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
  const got = norm(said);
  return item.accepted.some((form) => norm(form) === got);
}
