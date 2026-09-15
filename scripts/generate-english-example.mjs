// Gera um dia real da Base (5 contratos) contra a API da OpenAI, aplica os
// validadores da fundação (src/services/english/validators.ts) com 1 retentativa
// e grava o plano em JSON e numa versão em markdown legível para o pai.
// Também serve de calibração dos prompts: --runs N repete o dia com sementes
// diferentes e imprime taxa de aprovação de primeira, motivos de reprovação,
// latência e tokens por tipo de contrato.
//
// Uso:
//   node scripts/generate-english-example.mjs --level 1 --out docs/exemplos/plano-nivel1.json --md docs/exemplos/plano-nivel1.md
//   node scripts/generate-english-example.mjs --level 2 --runs 3 --stats /tmp/calib-n2.json
// Opções: --level 1|2|3 (1), --runs N (1), --out, --md, --stats (JSON bruto com todas
// as tentativas), --date yyyy-mm-dd (hoje em Brasília), --uid (exemplo), --fifth letter|merchant (letter),
// --only c2,c5 (gera só esses contratos), --known none|sample|auto (vocabulário conhecido simulado).
// A chave vem de .env (linha VITE_OPENAI_API_KEY=...), lida à mão: sem dotenv.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4.1-mini';
const TEMPERATURE = 0.8;
// A especificação pede 20 s por contrato; aqui a folga é maior para medir a latência real sem abortar
const TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 2;

const TYPE_LABELS = { merchant: 'Comerciante', letter: 'Carta', note: 'Recado', forge: 'Ferraria' };
const MATERIAL_OF = { merchant: 'madeira', letter: 'pedra', note: 'ferro', forge: 'redstone' };
const THEMES = {
  1: { mine: 'a mina', ball: 'o campinho de futebol' },
  2: { mine: 'a expedição na mina', ball: 'o time de futebol' },
  3: { mine: 'a mina abandonada', ball: 'o campeonato da vila' },
};
// Vocabulário "já visto" usado nas rodadas de calibração (a rodada 0 simula o primeiro dia: nada visto)
const SAMPLE_VOCAB = [
  'torch', 'sword', 'apple', 'table', 'chest', 'door', 'ball', 'map', 'cake', 'key', 'book', 'red', 'blue',
  'big', 'dog', 'cave', 'mine', 'team', 'player', 'fast', 'need', 'want', 'have', 'put', 'give',
];
const SAMPLE_NAMES = ['Steve', 'Alex', 'Bob'];

// ---------- argumentos ----------

function parseArgs(argv) {
  const args = { level: 1, runs: 1, out: '', md: '', stats: '', date: '', uid: 'exemplo', fifth: 'letter', only: '', known: 'auto' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const value = argv[i + 1];
    if (!(key in args)) throw new Error(`opção desconhecida: ${a}`);
    args[key] = key === 'level' || key === 'runs' ? Number(value) : String(value ?? '');
    i++;
  }
  if (![1, 2, 3].includes(args.level)) throw new Error('--level precisa ser 1, 2 ou 3');
  if (!Number.isInteger(args.runs) || args.runs < 1) throw new Error('--runs precisa ser inteiro >= 1');
  if (!args.date) args.date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return args;
}

function readApiKey() {
  const env = readFileSync(join(root, '.env'), 'utf8');
  for (const rawLine of env.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('VITE_OPENAI_API_KEY=')) continue;
    const value = line.slice('VITE_OPENAI_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
    if (value) return value;
  }
  throw new Error('VITE_OPENAI_API_KEY não encontrada em .env');
}

// ---------- módulos puros via esbuild ----------

const ENTRY = [
  "export * as prompts from './src/services/english/prompts';",
  "export * as validators from './src/services/english/validators';",
  "export * as merchantRoom from './src/services/english/merchantRoom';",
  "export * as shuffle from './src/services/english/shuffle';",
  "export * as levels from './src/config/englishLevels';",
  "export * as base from './src/config/englishBase';",
].join('\n');

async function loadModules() {
  const esbuild = require('esbuild');
  const outDir = mkdtempSync(join(tmpdir(), 'english-example-'));
  const outfile = join(outDir, 'english.cjs');
  await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: root, loader: 'ts' },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    logLevel: 'warning',
    outfile,
  });
  return { mod: require(outfile), cleanup: () => rmSync(outDir, { recursive: true, force: true }) };
}

// ---------- OpenAI ----------

async function callOpenAI(key, built) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = performance.now();
  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        temperature: TEMPERATURE,
        max_tokens: built.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: built.system },
          { role: 'user', content: built.user },
        ],
      }),
    });
    const latencyMs = Math.round(performance.now() - t0);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const data = await response.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? '';
    let json = null;
    let parseError = null;
    try {
      json = JSON.parse(content);
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e);
    }
    return {
      json,
      parseError,
      finish: choice?.finish_reason ?? '',
      latencyMs,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Uma chamada + validação, com 1 retentativa citando os problemas; Comerciante não retenta (frase ruim vira a de reserva) */
async function generateContract(ctx, spec) {
  const attempts = [];
  let problems = [];
  let final = { ok: false, content: null, replaced: [] };
  const maxAttempts = spec.type === 'merchant' ? 1 : MAX_ATTEMPTS;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const input = attempt === 1 ? spec.input : { ...spec.input, retryProblems: problems };
    const built = ctx.mod.prompts.buildPrompt(spec.type, input);
    let call;
    try {
      call = await callOpenAI(ctx.key, built);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      attempts.push({ attempt, ok: false, cleanOk: false, replaced: [], latencyMs: 0, inputTokens: 0, outputTokens: 0, finish: 'error', problems: [`erro de rede: ${message}`], raw: null });
      problems = ['a chamada anterior falhou; responda de novo'];
      console.log(`  ${spec.id} ${spec.type} tentativa ${attempt}: ERRO ${message}`);
      continue;
    }
    let v;
    if (call.json) {
      v = spec.validate(call.json);
    } else {
      v = { ok: false, content: null, problems: [`JSON inválido: ${call.parseError}`] };
    }
    if (call.finish === 'length') v.problems.push('resposta truncada por max_tokens');
    const replaced = v.replaced ?? [];
    const cleanOk = v.ok && !(spec.type === 'merchant' && replaced.length > 0);
    attempts.push({
      attempt,
      ok: v.ok,
      cleanOk,
      replaced,
      latencyMs: call.latencyMs,
      inputTokens: call.inputTokens,
      outputTokens: call.outputTokens,
      finish: call.finish,
      problems: v.problems,
      raw: call.json,
    });
    const status = v.ok ? (cleanOk ? 'ok' : `ok com ${replaced.length} frase(s) de reserva`) : 'REPROVADO';
    const detail = spec.detail ? ` (${spec.detail})` : '';
    console.log(`  ${spec.id} ${TYPE_LABELS[spec.type]}${detail} tentativa ${attempt}: ${status} em ${(call.latencyMs / 1000).toFixed(1)}s, ${call.inputTokens}/${call.outputTokens} tokens`);
    for (const p of v.problems) console.log(`      - ${p}`);
    final = v;
    problems = v.problems;
    if (v.ok) break;
  }
  return { attempts, ok: final.ok, content: final.ok ? final.content : null, problems, source: final.ok ? 'ai' : 'offline' };
}

// ---------- um dia ----------

function daySpecs(ctx, run) {
  const { mod, args } = ctx;
  const level = args.level;
  const lv = mod.levels.levelFor(level);
  const themes = THEMES[level];
  const daySeed = mod.shuffle.seedFromString(`${args.uid}|${args.date}|${run}`);
  const seedFor = (id) => mod.shuffle.mixSeed(daySeed, id);
  // --known none|sample|auto: auto = primeiro dia do nível 1 sem nada visto; qualquer outra rodada com a amostra
  const firstDay = args.known === 'none' || (args.known === 'auto' && run === 0 && level === 1);
  const vocabKnown = firstDay ? [] : SAMPLE_VOCAB;
  const avoidNames = firstDay ? [] : SAMPLE_NAMES;
  const genres = mod.levels.LETTER_GENRES;
  const genre1 = genres[(run * 2) % genres.length];
  const genre2 = genres[(run * 2 + 1) % genres.length];
  const target = lv.forgeTargets[run % lv.forgeTargets.length];
  const common = (id, theme) => ({ level, theme, vocabKnown, avoidNames, seed: seedFor(id) });

  const merchantSpec = (id, theme) => {
    const room = mod.merchantRoom.buildMerchantRoom(seedFor(id), level);
    const offline = mod.merchantRoom.offlineSentences(room.steps, mod.base.MERCHANT_CATALOGS, room.items);
    return {
      id,
      type: 'merchant',
      theme,
      detail: `${room.steps.length} passos`,
      room,
      input: { ...common(id, theme), steps: room.steps, sentences: offline.sentences, items: room.items },
      validate: (json) => mod.validators.validateMerchant({ ...room, sentences: json.sentences, translation: json.translation }, level),
    };
  };
  const letterSpec = (id, theme, genre) => ({
    id,
    type: 'letter',
    theme,
    detail: genre,
    input: { ...common(id, theme), genre },
    validate: (json) => mod.validators.validateLetter(json, level, vocabKnown, seedFor(id)),
  });

  const merchant = merchantSpec('c1', themes.mine);
  const letter = letterSpec('c2', themes.ball, genre1);
  const note = {
    id: 'c3',
    type: 'note',
    theme: themes.mine,
    detail: '',
    input: common('c3', themes.mine),
    validate: (json) => mod.validators.validateNote(json, level),
  };
  const forge = {
    id: 'c4',
    type: 'forge',
    theme: themes.ball,
    detail: target.id,
    target,
    input: { ...common('c4', themes.ball), target, letterNames: [], letterItems: [], yesterdayMistakes: [] },
    validate: (json) => mod.validators.validateForge(json, level, seedFor('c4')),
  };
  const fifth = args.fifth === 'merchant' ? merchantSpec('c5', themes.ball) : letterSpec('c5', themes.mine, genre2);
  return { merchant, letter, note, forge, fifth, daySeed };
}

function contractTitle(spec, content) {
  if (spec.type === 'merchant') return 'Pedido do Comerciante';
  if (spec.type === 'letter') return content?.title || 'Carta';
  if (spec.type === 'note') return 'Recado para o ferreiro';
  return spec.target.label;
}

async function generateDay(ctx, run) {
  const specs = daySpecs(ctx, run);
  console.log(`\n== Rodada ${run} (nível ${ctx.args.level}, semente ${specs.daySeed >>> 0})`);
  // --only c2,c5 calibra um tipo isolado sem gastar chamadas com os outros
  const only = ctx.args.only ? new Set(ctx.args.only.split(',').map((s) => s.trim())) : null;
  const skipped = { attempts: [], ok: false, content: null, problems: [], source: 'skipped' };
  const gen = (spec) => (only && !only.has(spec.id) ? Promise.resolve(skipped) : generateContract(ctx, spec));
  // Quatro contratos em paralelo; a Ferraria vem depois para receber nomes e itens da Carta (continuidade)
  const [merchant, letter, note, fifth] = await Promise.all([gen(specs.merchant), gen(specs.letter), gen(specs.note), gen(specs.fifth)]);
  if (letter.ok) {
    specs.forge.input.letterNames = [letter.content.sender].filter(Boolean);
    specs.forge.input.letterItems = letter.content.glossary.slice(0, 4).map((g) => g.en);
  }
  const forge = await gen(specs.forge);
  const results = { c1: merchant, c2: letter, c3: note, c4: forge, c5: fifth };
  const specById = { c1: specs.merchant, c2: specs.letter, c3: specs.note, c4: specs.forge, c5: specs.fifth };
  const order = ['c1', 'c2', 'c3', 'c4', 'c5'];
  const contracts = {};
  const generation = {};
  for (const id of order) {
    const spec = specById[id];
    const r = results[id];
    contracts[id] = {
      id,
      type: spec.type,
      material: MATERIAL_OF[spec.type],
      theme: spec.theme,
      title: contractTitle(spec, r.content),
      version: 1,
      status: 'open',
      result: null,
      retryUsed: false,
      content: r.content,
    };
    generation[id] = {
      type: spec.type,
      detail: spec.detail,
      source: r.source,
      problems: r.problems,
      attempts: r.attempts.map(({ raw, ...rest }) => rest),
      rawAttempts: r.attempts.map((a) => a.raw),
    };
  }
  const sources = order.map((id) => results[id].source).filter((s) => s !== 'skipped');
  const source = sources.every((s) => s === 'ai') ? 'ai' : sources.every((s) => s === 'offline') ? 'offline' : 'mixed';
  const plan = {
    id: `${ctx.args.uid}_${ctx.args.date}`,
    userId: ctx.args.uid,
    date: ctx.args.date,
    level: ctx.args.level,
    status: 'ready',
    generatingAt: null,
    order,
    contracts,
    rewardedIds: [],
    generatedAt: new Date().toISOString(),
    source,
    reviewedByParent: false,
    themeRequest: null,
  };
  return { run, seed: specs.daySeed >>> 0, plan, generation };
}

// ---------- estatísticas ----------

/** Agrupa um problema do validador num motivo curto (para a tabela de calibração) */
function reasonOf(problem) {
  const p = problem.toLowerCase();
  if (p.includes('erro de rede')) return 'rede';
  if (p.includes('json inválido')) return 'JSON inválido';
  if (p.includes('truncada')) return 'truncado';
  if (p.includes('tokens proibidos')) return 'tokens proibidos';
  if (p.includes('evidence')) return 'evidence fora do texto';
  if (p.includes('anti-cola')) return 'anti-cola';
  if (p.includes('mais longa')) return 'certa mais longa';
  if (p.includes('contém outra')) return 'opção contém outra';
  if (p.includes('opções distintas')) return 'opções repetidas';
  if (p.includes('answer fora')) return 'answer inválido';
  if (p.includes('enunciado')) return 'enunciado longo';
  if (p.includes('glossário')) return 'glossário curto';
  if (p.includes('palavras (esperado')) return 'contagem de palavras';
  if (p.includes('pergunta(s) válida')) return 'poucas perguntas';
  if (p.includes('model não contém')) return 'model sem info';
  if (p.includes('mustinclude')) return 'mustInclude';
  if (p.includes('banco com')) return 'banco';
  if (p.includes('model com frase')) return 'model longo';
  if (p.includes('scramble')) return 'scramble';
  if (p.includes('gap')) return 'gap';
  if (p.includes('typed')) return 'typed';
  if (p.includes('repetida')) return 'frase repetida';
  if (p.includes('item(ns) válido')) return 'poucos itens';
  if (p.includes('fora da lista')) return 'palavra fora da allowlist';
  if (p.includes('frase ')) return 'frase do Comerciante trocada';
  return problem.slice(0, 40);
}

function summarize(days) {
  const byType = {};
  for (const day of days) {
    for (const id of day.plan.order) {
      const g = day.generation[id];
      if (g.source === 'skipped') continue;
      const t = byType[g.type] ?? (byType[g.type] = { n: 0, firstOk: 0, secondOk: 0, failed: 0, reasons: {}, latency: [], inTok: [], outTok: [] });
      t.n++;
      const first = g.attempts[0];
      if (first?.cleanOk) t.firstOk++;
      else if (g.source === 'ai') t.secondOk++;
      else t.failed++;
      if (first && !first.cleanOk) {
        for (const p of first.problems) {
          const r = reasonOf(p);
          t.reasons[r] = (t.reasons[r] ?? 0) + 1;
        }
      }
      for (const a of g.attempts) {
        if (a.latencyMs) t.latency.push(a.latencyMs);
        t.inTok.push(a.inputTokens);
        t.outTok.push(a.outputTokens);
      }
    }
  }
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const max = (xs) => (xs.length ? Math.max(...xs) : 0);
  return Object.entries(byType).map(([type, t]) => ({
    type,
    n: t.n,
    firstOk: t.firstOk,
    secondOk: t.secondOk,
    failed: t.failed,
    reasons: t.reasons,
    avgLatencyMs: avg(t.latency),
    maxLatencyMs: max(t.latency),
    avgInputTokens: avg(t.inTok),
    avgOutputTokens: avg(t.outTok),
    maxOutputTokens: max(t.outTok),
  }));
}

function printSummary(rows, level) {
  console.log(`\n== Resumo nível ${level}`);
  for (const r of rows) {
    const reasons = Object.entries(r.reasons)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} x${v}`)
      .join(', ');
    const latency = `${(r.avgLatencyMs / 1000).toFixed(1)}s (máx ${(r.maxLatencyMs / 1000).toFixed(1)}s)`;
    const tokens = `${r.avgInputTokens} entrada / ${r.avgOutputTokens} saída (máx ${r.maxOutputTokens})`;
    console.log(`${TYPE_LABELS[r.type].padEnd(12)} 1ª tentativa ${r.firstOk}/${r.n}, 2ª ${r.secondOk}, reserva ${r.failed}; latência média ${latency}; tokens ${tokens}${reasons ? `; motivos: ${reasons}` : ''}`);
  }
}

// ---------- markdown para o pai ----------

const RELATION_EN = { on: 'on', in: 'in', under: 'under', next_to: 'next to' };

function mdMerchant(c, mod) {
  const lines = [];
  const catalogs = mod.base.MERCHANT_CATALOGS;
  const spotDef = (id) => catalogs.spots.find((s) => s.id === id);
  const itemDef = (id) => catalogs.items.find((i) => i.id === id);
  lines.push(`Sala: ${c.spots.map((s) => `${s.label} (${spotDef(s.id)?.pt ?? s.id})`).join(', ')}.`);
  lines.push(`Bandeja: ${c.items.map((i) => `${i.stock} x ${itemDef(i.id)?.label ?? i.id}`).join(', ')}.`);
  lines.push('');
  lines.push('| Passo | Pedido em inglês (falado) | Com lacunas (2ª escuta) | Tradução | Resposta esperada |');
  lines.push('|---|---|---|---|---|');
  c.steps.forEach((s, i) => {
    const expected = `${s.qty} x ${s.item} ${RELATION_EN[s.relation]} ${s.spot}`;
    lines.push(`| ${i + 1} | ${c.sentences[i]} | ${c.gapped[i]} | ${c.translation[i]} | ${expected} |`);
  });
  return lines;
}

function mdLetter(c) {
  const lines = [];
  lines.push(`Gênero: ${c.genre}. Título: **${c.title}**. Remetente: ${c.sender}.`);
  lines.push('');
  lines.push('Texto em inglês:');
  lines.push('');
  for (const l of c.text.split(/\r?\n/)) lines.push(`> ${l}`);
  lines.push('');
  lines.push('Tradução:');
  lines.push('');
  for (const l of c.translation.split(/\r?\n/)) lines.push(`> ${l}`);
  lines.push('');
  lines.push(`Glossário: ${c.glossary.map((g) => `${g.en} = ${g.pt}`).join('; ')}.`);
  lines.push('');
  c.questions.forEach((q, i) => {
    lines.push(`${i + 1}. (${q.kind}) ${q.question}`);
    q.options.forEach((o, j) => lines.push(`   - ${o}${j === q.answer ? ' (certa)' : ''}`));
    lines.push(`   - Evidência no texto: "${q.evidence}"`);
    lines.push(`   - Explicação: ${q.explanation}`);
  });
  return lines;
}

function mdNote(c) {
  const lines = [];
  lines.push(`Pedido (o que o Heitor lê): ${c.brief}`);
  lines.push('');
  lines.push('Informações obrigatórias (dica em PT e formas aceitas em inglês):');
  for (const m of c.mustInclude) lines.push(`- ${m.pt}: ${m.en.join(' | ')}`);
  lines.push('');
  lines.push(`Moldes do nível: ${c.templates.map((t) => `"${t}"`).join(', ')}`);
  lines.push(`Banco de palavras: ${c.wordBank.join(', ')}`);
  lines.push(`Resposta-modelo (escondida): ${c.model}`);
  if (c.hint) lines.push(`Dica de estrutura: ${c.hint}`);
  return lines;
}

function mdForge(c) {
  const lines = [];
  lines.push(`Alvo: ${c.target}`);
  lines.push('');
  c.items.forEach((it, i) => {
    if (it.kind === 'scramble') {
      lines.push(`${i + 1}. Ordenar: [${it.words.join(' | ')}] -> "${it.answer}"`);
    } else if (it.kind === 'gap') {
      lines.push(`${i + 1}. Lacuna: ${it.sentence} -> ${it.options.map((o, j) => (j === it.answer ? `**${o}**` : o)).join(' / ')}`);
    } else {
      lines.push(`${i + 1}. Digitar: ${it.prompt} -> ${it.sentence} -> ${it.accepted.join(' ou ')}`);
    }
    lines.push(`   - Regra: ${it.rule}`);
  });
  return lines;
}

function toMarkdown(day, mod) {
  const { plan, generation } = day;
  const lines = [];
  lines.push(`# Plano de exemplo, nível ${plan.level} (${plan.date})`);
  lines.push('');
  lines.push(`Gerado por \`scripts/generate-english-example.mjs\` com ${MODEL} (temperatura ${TEMPERATURE}), semente ${day.seed}. Fonte do plano: ${plan.source}.`);
  lines.push('O Recado é obrigatório; o Heitor escolhe mais 2 entre os outros 4. Comerciante paga madeira, Carta pedra, Recado ferro, Ferraria redstone.');
  lines.push('');
  for (const id of plan.order) {
    const c = plan.contracts[id];
    const g = generation[id];
    lines.push(`## ${id}: ${TYPE_LABELS[c.type]} - ${c.title}`);
    lines.push('');
    lines.push(`Tema: ${c.theme}. Material: ${c.material}. Fonte: ${g.source === 'ai' ? 'IA' : 'reserva (a IA reprovou duas vezes)'}. Tentativas: ${g.attempts.length}.`);
    lines.push('');
    if (!c.content) lines.push('Sem conteúdo aprovado nesta geração.');
    else if (c.type === 'merchant') lines.push(...mdMerchant(c.content, mod));
    else if (c.type === 'letter') lines.push(...mdLetter(c.content));
    else if (c.type === 'note') lines.push(...mdNote(c.content));
    else lines.push(...mdForge(c.content));
    lines.push('');
    const allProblems = g.attempts.flatMap((a, i) => a.problems.map((p) => `tentativa ${i + 1}: ${p}`));
    if (allProblems.length) {
      lines.push('Observações do validador:');
      for (const p of allProblems) lines.push(`- ${p}`);
      lines.push('');
    }
  }
  lines.push('## Medições');
  lines.push('');
  lines.push('| Contrato | Tentativa | Resultado | Latência | Tokens entrada | Tokens saída |');
  lines.push('|---|---|---|---|---|---|');
  for (const id of plan.order) {
    const g = generation[id];
    for (const a of g.attempts) {
      const res = a.cleanOk ? 'aprovado' : a.ok ? `aprovado com ${a.replaced.length} frase(s) de reserva` : 'reprovado';
      lines.push(`| ${id} ${TYPE_LABELS[g.type]} | ${a.attempt} | ${res} | ${(a.latencyMs / 1000).toFixed(1)} s | ${a.inputTokens} | ${a.outputTokens} |`);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

// ---------- main ----------

function writeText(path, text) {
  const abs = resolve(root, path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text, 'utf8');
  console.log(`gravado: ${abs}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const key = readApiKey();
  const { mod, cleanup } = await loadModules();
  const ctx = { args, key, mod };
  const days = [];
  try {
    for (let run = 0; run < args.runs; run++) days.push(await generateDay(ctx, run));
  } finally {
    cleanup();
  }
  const rows = summarize(days);
  printSummary(rows, args.level);
  const first = days[0];
  if (args.out) {
    const generation = Object.fromEntries(Object.entries(first.generation).map(([id, g]) => [id, { source: g.source, problems: g.problems, attempts: g.attempts }]));
    writeText(args.out, `${JSON.stringify({ plan: first.plan, generation, model: MODEL, temperature: TEMPERATURE, seed: first.seed }, null, 2)}\n`);
  }
  if (args.md) writeText(args.md, toMarkdown(first, mod));
  if (args.stats) writeText(args.stats, `${JSON.stringify({ level: args.level, date: args.date, model: MODEL, summary: rows, days }, null, 2)}\n`);
  const totalCalls = days.reduce((n, d) => n + Object.values(d.generation).reduce((m, g) => m + g.attempts.length, 0), 0);
  console.log(`\nChamadas à API nesta execução: ${totalCalls}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
