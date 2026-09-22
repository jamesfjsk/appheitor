// ========================================
// Painel do pai: A Base (Arena de Inglês, Etapa 1, seção 7 da especificação)
// Plano de hoje e de amanhã, geração dos próximos dias, nível do conteúdo,
// Recados corrigidos dos últimos 30 planos e uso de IA do mês.
// Visual "parent" (Tailwind, cards brancos, azul), não o visual de mina.
// Codificado contra o contrato de englishBaseService.ts e aiUsage.ts.
// ========================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Clock, Hammer, RefreshCw, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { getTodayBrazil } from '../../utils/timezone';
import { addDays } from '../../services/dailyQuizService';
import type {
  BaseDoc,
  Contract,
  ContractResult,
  DailyPlan,
  ForgeItem,
  LetterGenre,
  LetterQuestionKind,
  Material,
  NoteContent,
  NoteErrorTag,
} from '../../types/english';
import { LEVELS, levelFor, type LevelNumber } from '../../config/englishLevels';
import { BUILDINGS, CONTRACT_ICONS, CONTRACT_LABELS, MATERIALS, MATERIAL_ICONS, MATERIAL_LABELS, baseLevel } from '../../config/englishBase';
import {
  ensureDailyPlan,
  generateUpcomingDays,
  getRecentPlans,
  regenerateContract,
  setBaseLevel,
  subscribeBase,
  subscribePlan,
} from '../../services/englishBaseService';
import { AI_MONTHLY_USD_CAP, AI_MONTHLY_USD_WARN, TTS_USD_PER_MILLION_CHARS, estimateCostUsd, subscribeUsage, textCallsOf, usdOfModel, voiceCallsOf, type AiUsageDoc } from '../../services/aiUsage';

const PLAN_SIZE = 5;
const UPCOMING_DAYS = 7;
const NOTE_HISTORY_DAYS = 30;
const TOP_TAGS = 3;

const BTN_PRIMARY = 'px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2';
const BTN_SMALL = 'px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 disabled:opacity-60 inline-flex items-center gap-1.5';

/** Etiquetas do juiz em PT: descrevem o erro (FORGE_TAG_TARGETS nomeia o alvo da Ferraria, outro papel) */
const TAG_LABELS: Record<NoteErrorTag, string> = {
  plural: 'Plural',
  article: 'Artigo',
  verb: 'Verbo',
  spelling: 'Grafia',
  word_order: 'Ordem das palavras',
  preposition: 'Preposição',
  other: 'Outro',
};

const SOURCE_LABELS: Record<DailyPlan['source'], string> = { ai: 'IA', offline: 'Reserva offline', mixed: 'IA + reserva' };
const GENRE_LABELS: Record<LetterGenre, string> = {
  letter: 'Carta',
  scout_report: 'Relatório de batedor',
  dialogue: 'Diálogo',
  notice: 'Aviso',
  list: 'Lista',
};
const QUESTION_KIND_LABELS: Record<LetterQuestionKind, string> = { decision: 'decisão', comprehension: 'compreensão', inference: 'inferência' };
const SCAFFOLD_LABELS: Record<BaseDoc['scaffoldStage'], string> = {
  0: 'molde e banco de palavras',
  1: 'só banco de palavras',
  2: 'banco vira "Dica" paga com 1 ferro',
};

/** Mês sem documento em aiUsage: zero em tudo */
const EMPTY_USAGE: AiUsageDoc = { calls: 0, inputTokens: 0, outputTokens: 0, ttsChars: 0, byModel: {}, tokensByModel: {} };

const fmtDate = (iso: string) => iso.split('-').reverse().join('/');
const fmtInt = (n: number) => n.toLocaleString('pt-BR');
const fmtDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
};
const monthLabel = (ym: string) => ym.split('-').reverse().join('/');
const scoreColor = (score: number) => (score >= 3 ? 'text-green-700' : score === 2 ? 'text-amber-700' : score === 1 ? 'text-orange-700' : 'text-red-700');

/** Contratos na ordem do quadro; durante a geração `order` ou `contracts` podem estar parciais */
function planContracts(plan: DailyPlan): Contract[] {
  const ordered = plan.order.map((id) => plan.contracts[id]).filter((c): c is Contract => Boolean(c));
  const rest = Object.values(plan.contracts).filter((c) => !plan.order.includes(c.id));
  return [...ordered, ...rest];
}

interface NoteEntry {
  date: string;
  theme: string;
  content: NoteContent;
  result: ContractResult;
}

function collectNotes(plans: DailyPlan[]): NoteEntry[] {
  const out: NoteEntry[] = [];
  for (const plan of plans) {
    for (const c of Object.values(plan.contracts)) {
      if (c.type === 'note' && c.result) out.push({ date: plan.date, theme: c.theme, content: c.content, result: c.result });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

function countTags(entries: NoteEntry[]): { tag: NoteErrorTag; count: number }[] {
  const counts = new Map<NoteErrorTag, number>();
  for (const e of entries) {
    for (const err of e.result.correction?.errors ?? []) counts.set(err.tag, (counts.get(err.tag) ?? 0) + 1);
  }
  return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
}

// ---------- Peças visuais ----------

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-xl border border-gray-200 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

const TagList = ({ tags }: { tags: NoteErrorTag[] }) => (
  <span className="flex flex-wrap gap-1">
    {tags.map((t, i) => (
      <span key={`${t}-${i}`} className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
        {TAG_LABELS[t]}
      </span>
    ))}
  </span>
);

const CapWarning = ({ capReached }: { capReached: boolean }) => (
  <p className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${capReached ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>
    <AlertTriangle className="w-4 h-4 shrink-0" />
    {capReached
      ? 'Teto mensal de IA: US$ 50. A geração fica bloqueada até o mês virar.'
      : 'Gasto de IA passou de US$ 40.'}
  </p>
);

const PlanStatus = ({ plan, ready, done }: { plan: DailyPlan; ready: number; done: number }) => {
  if (plan.status === 'generating') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
        <Clock className="w-4 h-4" /> gerando {ready}/{PLAN_SIZE}
      </span>
    );
  }
  if (done > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
        <CheckCircle className="w-4 h-4" /> {done}/{PLAN_SIZE} feitos
      </span>
    );
  }
  return <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">pronto</span>;
};

const ResultBox = ({ result, material }: { result: ContractResult; material: Material }) => {
  const j = result.correction;
  return (
    <div className="mt-2 rounded-xl border border-green-100 bg-green-50 p-3 text-sm space-y-1">
      <p className="text-gray-800">
        <strong>{result.score}/{result.max}</strong> · {result.materialEarned} {MATERIAL_LABELS[material].toLowerCase()} ·{' '}
        {result.rewarded ? 'premiado' : 'só material'} · +{result.xp} XP · +{result.gold} gold · {fmtDuration(result.durationSec)}
      </p>
      {result.answer && (
        <p className="text-gray-700">
          Texto dele: <span className="italic text-gray-900">{result.answer}</span>
        </p>
      )}
      {j && (
        <>
          {j.corrected && j.corrected !== result.answer && (
            <p className="text-gray-700">
              Correção: <span className="italic text-gray-900">{j.corrected}</span>
            </p>
          )}
          {j.note && <p className="text-gray-700">{j.note}</p>}
          {j.missing.length > 0 && <p className="text-red-700">Faltou: {j.missing.join(', ')}</p>}
          {j.errors.length > 0 && <TagList tags={j.errors.map((e) => e.tag)} />}
        </>
      )}
    </div>
  );
};

const ForgeItemLine = ({ item }: { item: ForgeItem }) => {
  switch (item.kind) {
    case 'scramble':
      return (
        <>
          <span className="text-gray-400">ordenar:</span> <span className="text-gray-900">{item.answer}</span>
          <span className="block text-gray-500">{item.rule}</span>
        </>
      );
    case 'gap':
      return (
        <>
          <span className="text-gray-400">lacuna:</span> <span className="text-gray-900">{item.sentence}</span>{' '}
          <span className="text-gray-600">[{item.options.map((o, j) => (j === item.answer ? `${o} (certa)` : o)).join(' / ')}]</span>
          <span className="block text-gray-500">{item.rule}</span>
        </>
      );
    case 'typed':
      return (
        <>
          <span className="text-gray-400">digitar:</span> <span className="text-gray-900">{item.sentence}</span>{' '}
          <span className="text-gray-600">({item.prompt}; aceita: {item.accepted.join(', ')})</span>
          <span className="block text-gray-500">{item.rule}</span>
        </>
      );
  }
};

/** Texto em inglês e tradução de cada tipo de contrato, para o pai conferir */
const ContractBody = ({ contract }: { contract: Contract }) => {
  switch (contract.type) {
    case 'merchant': {
      const { spots, items, sentences, translation } = contract.content;
      return (
        <div className="space-y-2">
          <p className="text-gray-500">
            Sala: {spots.map((s) => s.label).join(', ')} · Bandeja: {items.map((i) => `${i.stock} ${i.id}`).join(', ')}
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            {sentences.map((s, i) => (
              <li key={i}>
                <span className="text-gray-900">{s}</span>
                <span className="block italic text-gray-500">{translation[i] ?? ''}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    }
    case 'letter': {
      const { genre, title, sender, text, translation, glossary, questions } = contract.content;
      return (
        <div className="space-y-2">
          <p className="text-gray-500">
            {GENRE_LABELS[genre]} · de {sender}
          </p>
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="whitespace-pre-line text-gray-900">{text}</p>
          <p className="whitespace-pre-line italic text-gray-500">{translation}</p>
          {glossary.length > 0 && <p className="text-gray-700">Glossário: {glossary.map((g) => `${g.en} = ${g.pt}`).join(' · ')}</p>}
          <ol className="list-decimal pl-5 space-y-2">
            {questions.map((q, i) => (
              <li key={i}>
                <p className="text-gray-900">
                  {q.question} <span className="text-gray-400">({QUESTION_KIND_LABELS[q.kind]})</span>
                </p>
                <ul className="pl-4">
                  {q.options.map((o, j) => (
                    <li key={j} className={j === q.answer ? 'font-semibold text-green-700' : 'text-gray-600'}>
                      {o}
                    </li>
                  ))}
                </ul>
                <p className="text-gray-500">
                  Evidência: "{q.evidence}" · {q.explanation}
                </p>
              </li>
            ))}
          </ol>
        </div>
      );
    }
    case 'note': {
      const { brief, mustInclude, model, wordBank, templates, hint } = contract.content;
      return (
        <div className="space-y-2">
          <p className="text-gray-900">Pedido: {brief}</p>
          <ul className="list-disc pl-5 text-gray-700">
            {mustInclude.map((info, i) => (
              <li key={i}>
                {info.pt} <span className="text-gray-400">({info.en.join(' / ')})</span>
              </li>
            ))}
          </ul>
          <p className="text-gray-700">
            Modelo (escondido dele): <span className="italic text-gray-900">{model}</span>
          </p>
          <p className="text-gray-500">Banco: {wordBank.join(', ')}</p>
          <p className="text-gray-500">Moldes: {templates.join(' | ')}</p>
          {hint && <p className="text-gray-500">Dica: {hint}</p>}
        </div>
      );
    }
    case 'forge': {
      const { target, items } = contract.content;
      return (
        <div className="space-y-2">
          <p className="text-gray-500">Alvo: {target}</p>
          <ol className="list-decimal pl-5 space-y-1">
            {items.map((it, i) => (
              <li key={i}>
                <ForgeItemLine item={it} />
              </li>
            ))}
          </ol>
        </div>
      );
    }
  }
};

interface ContractRowProps {
  contract: Contract;
  planReady: boolean;
  open: boolean;
  disabled: boolean;
  regenerating: boolean;
  onToggle: () => void;
  onRegenerate: () => void;
}

const ContractRow = ({ contract: c, planReady, open, disabled, regenerating, onToggle, onRegenerate }: ContractRowProps) => (
  <li className="rounded-xl border border-gray-200 p-3">
    <div className="flex items-start gap-3">
      <img src={CONTRACT_ICONS[c.type]} alt="" className="w-10 h-10 shrink-0 object-contain" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">
          {CONTRACT_LABELS[c.type]} · {c.title}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
          <span>Tema: {c.theme}</span>
          <span className="inline-flex items-center gap-1">
            <img src={MATERIAL_ICONS[c.material]} alt="" className="w-4 h-4 object-contain" />
            {MATERIAL_LABELS[c.material]}
          </span>
          <span>versão {c.version}</span>
          {c.retryUsed && <span>refeito só por material</span>}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.status === 'done' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
        {c.status === 'done' ? 'feito' : 'aberto'}
      </span>
    </div>
    {c.result && <ResultBox result={c.result} material={c.material} />}
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" onClick={onToggle} className={BTN_SMALL}>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {open ? 'Esconder texto' : 'Ver texto e tradução'}
      </button>
      {planReady && c.status === 'open' && (
        <button type="button" onClick={onRegenerate} disabled={disabled} className={BTN_SMALL}>
          <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating ? 'Regenerando...' : 'Regenerar'}
        </button>
      )}
    </div>
    {open && (
      <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm">
        <ContractBody contract={c} />
      </div>
    )}
  </li>
);

interface PlanCardProps {
  label: string;
  date: string;
  plan: DailyPlan | null | undefined;
  busy: string | null;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
  onGenerate: (date: string) => void;
  onRegenerate: (date: string, c: Contract) => void;
}

const PlanCard = ({ label, date, plan, busy, expanded, onToggle, onGenerate, onRegenerate }: PlanCardProps) => {
  const contracts = plan ? planContracts(plan) : [];
  const done = contracts.filter((c) => c.status === 'done').length;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {label} · {fmtDate(date)}
          </p>
          <h3 className="text-lg font-bold text-gray-900">
            {plan === undefined ? 'Carregando...' : plan === null ? 'Ainda não gerado' : `Plano do dia · ${levelFor(plan.level).label}`}
          </h3>
          {plan && (
            <p className="text-sm text-gray-500">
              {contracts.length} de {PLAN_SIZE} contratos · fonte: {SOURCE_LABELS[plan.source]}
              {plan.themeRequest && <> · pedido da Mesa: "{plan.themeRequest}"</>}
            </p>
          )}
        </div>
        {plan && <PlanStatus plan={plan} ready={contracts.length} done={done} />}
      </div>

      {plan && plan.source !== 'ai' && (
        <p className={`mb-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${plan.source === 'offline' ? 'bg-amber-100 text-amber-900' : 'bg-amber-50 text-amber-800'}`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {plan.source === 'offline'
            ? 'A IA não respondeu: todos os contratos vieram do banco de reserva.'
            : 'Parte dos contratos veio do banco de reserva.'}
        </p>
      )}

      {plan === null && (
        <button type="button" onClick={() => onGenerate(date)} disabled={busy !== null} className={BTN_PRIMARY}>
          <Sparkles className="w-4 h-4" /> {busy === date ? 'Gerando...' : 'Gerar agora'}
        </button>
      )}

      {contracts.length > 0 && (
        <ul className="space-y-3">
          {contracts.map((c) => {
            const key = `${date}:${c.id}`;
            return (
              <ContractRow
                key={c.id}
                contract={c}
                planReady={plan?.status === 'ready'}
                open={Boolean(expanded[key])}
                disabled={busy !== null}
                regenerating={busy === key}
                onToggle={() => onToggle(key)}
                onRegenerate={() => onRegenerate(date, c)}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
};

interface WeekCardProps {
  progress: { done: number; total: number } | null;
  running: boolean;
  disabled: boolean;
  capReached: boolean;
  nearCap: boolean;
  onGenerate: () => void;
}

const WeekCard = ({ progress, running, disabled, capReached, nearCap, onGenerate }: WeekCardProps) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-6">
    <h3 className="mb-1 text-lg font-bold text-gray-900">Gerar próximos {UPCOMING_DAYS} dias</h3>
    <p className="mb-4 text-sm text-gray-500">
      Gera, um dia por vez, os planos de hoje até daqui a {UPCOMING_DAYS} dias. Dias com algum contrato concluído nunca são
      tocados. Cada dia gasta cerca de {PLAN_SIZE} chamadas de IA, mais nas retentativas.
    </p>
    {progress && (
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-gray-700">{running ? 'Gerando...' : 'Concluído'}</span>
          <span className="text-gray-500">
            {progress.done}/{progress.total} dias
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }} />
        </div>
      </div>
    )}
    {(capReached || nearCap) && <CapWarning capReached={capReached} />}
    <div className="mt-3">
      <button type="button" onClick={onGenerate} disabled={disabled || capReached} className={BTN_PRIMARY}>
        <Sparkles className="w-4 h-4" /> {running ? 'Gerando...' : `Gerar próximos ${UPCOMING_DAYS} dias`}
      </button>
    </div>
  </div>
);

interface LevelCardProps {
  current: LevelNumber;
  selected: LevelNumber;
  saving: boolean;
  disabled: boolean;
  onSelect: (n: LevelNumber) => void;
  onSave: () => void;
}

const LevelCard = ({ current, selected, saving, disabled, onSelect, onSave }: LevelCardProps) => {
  const lv = LEVELS[selected];
  const dirty = selected !== current;
  const sentences = lv.noteSentences[0] === lv.noteSentences[1] ? `${lv.noteSentences[0]}` : `${lv.noteSentences[0]}-${lv.noteSentences[1]}`;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="mb-1 text-lg font-bold text-gray-900">Nível do conteúdo</h3>
      <p className="mb-4 text-sm text-gray-500">
        Define a gramática e o tamanho dos textos que a IA pode usar. Ele não vê este número: a Vila mostra o nível de cada obra.
      </p>
      <div className="mb-4 flex gap-2">
        {([1, 2, 3] as LevelNumber[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onSelect(n)}
            className={`flex-1 rounded-xl border px-3 py-2 font-semibold ${selected === n ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            {LEVELS[n].label}
            {current === n && <span className="block text-xs font-normal text-gray-500">atual</span>}
          </button>
        ))}
      </div>
      <div className="space-y-1 rounded-xl bg-gray-50 p-3 text-sm">
        <p className="text-gray-800">
          <strong>Gramática:</strong> {lv.grammar.join(' · ')}
        </p>
        <p className="text-gray-600">
          Frases de até {lv.maxWords} palavras · Carta com {lv.letterWords[0]}-{lv.letterWords[1]} palavras e glossário de {lv.glossarySize[0]}-
          {lv.glossarySize[1]} · Recado com {sentences} frases
        </p>
        <p className="text-gray-600">Moldes do Recado: {lv.noteTemplates.join(' | ')}</p>
        <p className="text-gray-600">Temas: {lv.vocabThemes.join(', ')}</p>
      </div>
      {dirty && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Ao salvar, os planos já gerados que ainda não têm contrato concluído serão gerados de novo no nível novo.
        </p>
      )}
      <div className="mt-3">
        <button type="button" onClick={onSave} disabled={!dirty || disabled} className={BTN_PRIMARY}>
          {saving ? 'Salvando...' : 'Salvar nível'}
        </button>
      </div>
    </div>
  );
};

const NoteRow = ({ entry }: { entry: NoteEntry }) => {
  const { result, content } = entry;
  const j = result.correction;
  const score = j?.score ?? result.score;
  return (
    <li className="flex flex-wrap items-start gap-3 py-3 text-sm">
      <span className="w-24 text-gray-500">{fmtDate(entry.date)}</span>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-gray-500">
          {entry.theme} · pedido: {content.brief}
        </p>
        <p className="text-gray-900">
          Ele: <span className="italic">{result.answer ?? '(sem texto)'}</span>
        </p>
        {j && j.corrected && j.corrected !== result.answer && (
          <p className="text-gray-700">
            Correção: <span className="italic">{j.corrected}</span>
          </p>
        )}
        {j?.note && <p className="text-gray-600">{j.note}</p>}
        {j && j.missing.length > 0 && <p className="text-red-700">Faltou: {j.missing.join(', ')}</p>}
        {j && j.errors.length > 0 && <TagList tags={j.errors.map((x) => x.tag)} />}
      </div>
      <span className={`font-semibold ${scoreColor(score)}`}>nota {score}/3</span>
    </li>
  );
};

interface NotesCardProps {
  entries: NoteEntry[];
  topTags: { tag: NoteErrorTag; count: number }[];
  loading: boolean;
}

const NotesCard = ({ entries, topTags, loading }: NotesCardProps) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-6">
    <h3 className="mb-1 text-lg font-bold text-gray-900">Recados dos últimos {NOTE_HISTORY_DAYS} dias</h3>
    <p className="mb-4 text-sm text-gray-500">
      O que ele escreveu, a correção mínima do juiz e as etiquetas dos erros. A etiqueta mais frequente dos últimos 5 planos vira o alvo da Ferraria.
    </p>
    {topTags.length > 0 && (
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">Erros mais frequentes:</span>
        {topTags.map(({ tag, count }) => (
          <span key={tag} className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900">
            {TAG_LABELS[tag]} · {count}
          </span>
        ))}
      </div>
    )}
    {loading ? (
      <p className="text-sm text-gray-500">Carregando...</p>
    ) : entries.length === 0 ? (
      <p className="text-sm text-gray-500">Nenhum Recado feito ainda.</p>
    ) : (
      <ul className="divide-y divide-gray-100">
        {entries.map((e) => (
          <NoteRow key={e.date} entry={e} />
        ))}
      </ul>
    )}
  </div>
);

interface UsageCardProps {
  usage: AiUsageDoc;
  month: string;
  capReached: boolean;
  nearCap: boolean;
}

const UsageCard = ({ usage, month, capReached, nearCap }: UsageCardProps) => {
  const usd = estimateCostUsd(usage);
  const pct = Math.min(100, (usd / AI_MONTHLY_USD_CAP) * 100);
  const models = Object.entries(usage.byModel)
    .filter(([m]) => !m.startsWith('gpt-4o-mini-tts') && !m.startsWith('tts-'))
    .sort((a, b) => b[1] - a[1]);
  const voiceUsd = (usage.ttsChars * TTS_USD_PER_MILLION_CHARS) / 1_000_000;
  const modelLine = [
    ...models.map(([m, n]) => {
      const part = usdOfModel(usage, m);
      return part > 0 ? `${m} ${fmtInt(n)} · US$ ${part.toFixed(2)}` : `${m} ${fmtInt(n)}`;
    }),
    ...(voiceUsd > 0 ? [`voz US$ ${voiceUsd.toFixed(2)}`] : []),
  ];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="mb-1 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-bold text-gray-900">Uso de IA em {monthLabel(month)}</h3>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Contratos, juiz do Recado, Prova do dia e voz. Gasto estimado: US$ {usd.toFixed(2)} de {AI_MONTHLY_USD_CAP}.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Gasto estimado" value={`US$ ${usd.toFixed(2)} de ${AI_MONTHLY_USD_CAP}`} />
        <Stat label="Chamadas de texto" value={fmtInt(textCallsOf(usage))} />
        <Stat label="Chamadas de voz" value={fmtInt(voiceCallsOf(usage))} />
        <Stat label="Tokens de entrada" value={fmtInt(usage.inputTokens)} />
        <Stat label="Tokens de saída" value={fmtInt(usage.outputTokens)} />
        <Stat label="Caracteres de voz" value={fmtInt(usage.ttsChars)} />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${capReached ? 'bg-red-500' : nearCap ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
      </div>
      {modelLine.length > 0 && <p className="mt-2 text-sm text-gray-500">Por modelo: {modelLine.join(' · ')}</p>}
      {(capReached || nearCap) && <CapWarning capReached={capReached} />}
    </div>
  );
};

// ---------- Painel ----------

const EnglishBaseManager: React.FC = () => {
  const { childUid } = useAuth();
  const today = getTodayBrazil();
  const tomorrow = addDays(today, 1);
  const month = today.slice(0, 7);

  // undefined = ainda carregando; null = o plano não existe
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null | undefined>(undefined);
  const [tomorrowPlan, setTomorrowPlan] = useState<DailyPlan | null | undefined>(undefined);
  const [base, setBase] = useState<BaseDoc | null>(null);
  const [usage, setUsage] = useState<AiUsageDoc | null>(null);
  const [recent, setRecent] = useState<DailyPlan[] | null>(null);
  // Uma operação por vez: chave da ação em andamento (data, `data:contrato`, 'week' ou 'level')
  const [busy, setBusy] = useState<string | null>(null);
  const [weekProgress, setWeekProgress] = useState<{ done: number; total: number } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [levelDraft, setLevelDraft] = useState<LevelNumber | null>(null);

  useEffect(() => {
    if (!childUid) return;
    const fail = (what: string) => (e: Error) => {
      console.error(`EnglishBaseManager: erro ao carregar ${what}`, e);
      toast.error(`Não foi possível carregar ${what}`);
    };
    const unsubs = [
      subscribePlan(childUid, today, setTodayPlan, fail('o plano de hoje')),
      subscribePlan(childUid, tomorrow, setTomorrowPlan, fail('o plano de amanhã')),
      subscribeBase(childUid, setBase, fail('a Base')),
      subscribeUsage(month, setUsage),
    ];
    return () => unsubs.forEach((u) => u());
  }, [childUid, today, tomorrow, month]);

  const loadRecent = useCallback(async () => {
    if (!childUid) return;
    try {
      setRecent(await getRecentPlans(childUid, today, NOTE_HISTORY_DAYS));
    } catch (e) {
      console.error('EnglishBaseManager: erro ao carregar os Recados', e);
      toast.error('Não foi possível carregar os Recados');
      setRecent([]);
    }
  }, [childUid, today]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  const usageDoc = usage ?? EMPTY_USAGE;
  const spent = estimateCostUsd(usageDoc);
  const capReached = spent >= AI_MONTHLY_USD_CAP;
  const nearCap = !capReached && spent >= AI_MONTHLY_USD_WARN;

  // O plano de hoje vem da assinatura (ao vivo); os anteriores da busca única
  const historyPlans = useMemo(() => {
    const list = (recent ?? []).filter((p) => p.date !== today);
    if (todayPlan) list.push(todayPlan);
    return list;
  }, [recent, todayPlan, today]);
  const noteEntries = useMemo(() => collectNotes(historyPlans), [historyPlans]);
  const topTags = useMemo(() => countTags(noteEntries).slice(0, TOP_TAGS), [noteEntries]);

  const currentLevel = levelFor(base?.level ?? 1).level;
  const selectedLevel = levelDraft ?? currentLevel;

  const run = async (key: string, action: () => Promise<unknown>, ok: string, fail: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(ok);
    } catch (e) {
      console.error(`EnglishBaseManager: ${fail}`, e);
      toast.error(e instanceof Error ? e.message : fail);
    } finally {
      setBusy(null);
    }
  };

  const generatePlan = (date: string) => {
    if (!childUid) return;
    void run(date, () => ensureDailyPlan(childUid, date), 'Plano pronto', 'Erro ao gerar o plano');
  };

  const regenerate = (date: string, c: Contract) => {
    if (!childUid) return;
    if (!window.confirm(`Descartar "${c.title}" e gerar outro contrato de ${CONTRACT_LABELS[c.type]} para ${fmtDate(date)}?`)) return;
    void run(`${date}:${c.id}`, () => regenerateContract(childUid, date, c.id), 'Contrato regenerado', 'Erro ao regenerar o contrato');
  };

  const generateWeek = () => {
    if (!childUid) return;
    setWeekProgress({ done: 0, total: UPCOMING_DAYS + 1 });
    void run(
      'week',
      () => generateUpcomingDays(childUid, UPCOMING_DAYS, (done, total) => setWeekProgress({ done, total })),
      'Próximos dias prontos',
      'Erro ao gerar os próximos dias'
    );
  };

  const saveLevel = () => {
    if (!childUid || levelDraft === null || levelDraft === currentLevel) return;
    const label = LEVELS[levelDraft].label;
    if (!window.confirm(`Mudar para o ${label}? Os planos já gerados sem contrato concluído serão gerados de novo.`)) return;
    void run('level', () => setBaseLevel(childUid, levelDraft).then(() => setLevelDraft(null)), `${label} salvo`, 'Erro ao salvar o nível');
  };

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="mb-1 flex items-center gap-3">
          <Hammer className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Mina</h2>
        </div>
        <p className="mb-5 text-sm text-gray-500">
          Cinco contratos por dia gerados por IA no nível escolhido abaixo. O Recado é obrigatório e sempre paga XP e gold; ele escolhe mais
          dois entre os outros. Depois do Recado, o circuito de Redstone do dia paga redstone e XP, sem gold. Os materiais se gastam nas obras da Vila.
        </p>
        {base ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Obras" value={`${baseLevel(base.buildings)} níveis`} />
              <Stat label="Contratos feitos" value={base.contractsDone} />
              <Stat label="Dias jogados" value={base.daysPlayed} />
              <Stat label="Dias seguidos" value={base.streakDays} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {MATERIALS.map((m) => (
                <span key={m} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5">
                  <img src={MATERIAL_ICONS[m]} alt="" className="w-5 h-5 object-contain" />
                  <span className="text-gray-700">{MATERIAL_LABELS[m]}</span>
                  <strong className="text-gray-900">{base.materials[m]}</strong>
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {BUILDINGS.map((b) => {
                const lvl = base.buildings[b.id];
                return (
                  <span key={b.id} className={`rounded-full px-3 py-1 ${lvl > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                    {b.label} {lvl > 0 ? `nível ${lvl}` : 'não construída'}
                  </span>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Andaime do Recado: estágio {base.scaffoldStage} ({SCAFFOLD_LABELS[base.scaffoldStage]}) · {base.noteStreak3} nota(s) 3 seguidas ·{' '}
              {Object.keys(base.vocab).length} palavras vistas
              {base.themeRequest && <> · pedido da Mesa para amanhã: "{base.themeRequest}"</>}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500">Carregando a Base...</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PlanCard label="Hoje" date={today} plan={todayPlan} busy={busy} expanded={expanded} onToggle={toggle} onGenerate={generatePlan} onRegenerate={regenerate} />
        <PlanCard label="Amanhã" date={tomorrow} plan={tomorrowPlan} busy={busy} expanded={expanded} onToggle={toggle} onGenerate={generatePlan} onRegenerate={regenerate} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WeekCard progress={weekProgress} running={busy === 'week'} disabled={busy !== null} capReached={capReached} nearCap={nearCap} onGenerate={generateWeek} />
        <LevelCard current={currentLevel} selected={selectedLevel} saving={busy === 'level'} disabled={busy !== null || !base} onSelect={setLevelDraft} onSave={saveLevel} />
      </div>

      <NotesCard entries={noteEntries} topTags={topTags} loading={recent === null} />

      <UsageCard usage={usageDoc} month={month} capReached={capReached} nearCap={nearCap} />
    </div>
  );
};

export default EnglishBaseManager;
