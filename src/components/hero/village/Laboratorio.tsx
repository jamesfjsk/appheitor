// Laboratório: a casa da carreira Engenheiro da Vila (CONTRATOS_E_CARREIRAS.md §5.2, §11.5 e §11.6).
// Treinos liberados aos poucos; pistas em degraus, grátis; "Mostrar ao pai" entrega o treino.
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ChildSheet from './ChildSheet';
import { useAuth } from '../../../contexts/AuthContext';
import { useSound } from '../../../contexts/SoundContext';
import { ENGENHEIRO, MAKECODE_URL, METODO_PASSOS, TRAINING_KIT_PAGES, TRAINING_TUTORIALS, tutorialUrl, type CompetencyLevel } from '../../../config/careers';
import type { TrainingDef } from '../../../config/engenheiroTreinos';
import type { Assignment } from '../../../types/assignment';
import { subscribeAssignments, submitAssignment } from '../../../services/assignmentsService';
import { activitiesOf, subscribeCareer, type CareerState } from '../../../services/careerService';
import { countersOf, meets, nextRank, requirementLine } from '../../../services/village/career';
import type { Proof } from '../../../types/proof';

type Tab = 'treinos' | 'competencias' | 'ferramentas';

const RANK_NAME: Record<string, string> = { aprendiz: 'Aprendiz', tecnico: 'Técnico', engenheiro: 'Engenheiro', inventor: 'Inventor' };
const LEVEL_NAME: Record<string, string> = { domina: 'Já domina', praticando: 'Praticando' };
const SEEN_KEY = (uid: string, rank: string) => `mm_lab_celebrated_${uid}_${rank}`;

const Dot: React.FC<{ level?: CompetencyLevel }> = ({ level }) => (
  <span
    aria-hidden
    className="inline-block shrink-0 rounded-full"
    style={{
      width: 14,
      height: 14,
      border: '2px solid #3f8f1f',
      background: level === 'domina' ? '#3f8f1f' : level === 'praticando' ? 'linear-gradient(90deg, #3f8f1f 50%, transparent 50%)' : 'transparent',
    }}
  />
);

const unlockedBy = (n: number): number | null => ENGENHEIRO.trainings.find((t) => t.unlocks.includes(n))?.n ?? null;

const Laboratorio: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { childUid } = useAuth();
  const { playClick, playTaskComplete, playError } = useSound();
  const [career, setCareer] = useState<CareerState | null>(null);
  const [rows, setRows] = useState<Assignment[]>([]);
  const [tab, setTab] = useState<Tab>('treinos');
  const [openN, setOpenN] = useState<number | null>(null);
  const [hints, setHints] = useState(0);
  const [metodo, setMetodo] = useState(false);
  const [learned, setLearned] = useState('');
  const [busy, setBusy] = useState(false);
  const [party, setParty] = useState<string | null>(null);

  useEffect(() => {
    if (!childUid) return;
    const a = subscribeCareer(childUid, setCareer);
    const b = subscribeAssignments(childUid, setRows);
    return () => { a(); b(); };
  }, [childUid]);

  useEffect(() => {
    if (!childUid || !career?.celebrate) return;
    try {
      if (localStorage.getItem(SEEN_KEY(childUid, career.celebrate))) return;
    } catch { /* aba privada */ }
    setParty(career.celebrate);
  }, [childUid, career?.celebrate]);

  const byN = useMemo(() => {
    const out: Record<number, Assignment> = {};
    for (const r of rows) {
      const m = /^eng-(\d+)$/.exec(r.templateId || '');
      if (r.careerId === 'engenheiro' && r.kind === 'training' && m) out[Number(m[1])] = r;
    }
    return out;
  }, [rows]);

  if (!career) {
    return (
      <ChildSheet onClose={onClose} title="Laboratório" wide="md">
        <p className="p-4 text-sm">O Laboratório abre quando o seu pai começar a carreira de Engenheiro da Vila.</p>
      </ChildSheet>
    );
  }

  const rank = career.rank;
  const next = nextRank(ENGENHEIRO, rank);
  const counters = countersOf(activitiesOf(rows));
  const openT: TrainingDef | null = openN ? ENGENHEIRO.trainings.find((t) => t.n === openN) ?? null : null;
  const openRow = openN ? byN[openN] : undefined;
  const hasMetodo = career.tools.includes('metodo');

  const closeParty = () => {
    if (childUid && party) {
      try { localStorage.setItem(SEEN_KEY(childUid, party), '1'); } catch { /* aba privada */ }
    }
    setParty(null);
  };

  const openTraining = (n: number) => {
    playClick();
    setOpenN(n);
    setHints(0);
    setMetodo(false);
    setLearned('');
  };

  const deliver = () => {
    if (!openT || !openRow) return;
    const asks = openT.deliveryQuestion;
    if (asks && learned.trim().length < 3) {
      playError();
      toast('Escreve a resposta antes de mostrar ao pai.');
      return;
    }
    setBusy(true);
    const note = learned.trim();
    const proof: Proof = asks
      ? { kinds: ['inPerson', 'questions'], answers: [{ q: asks, a: note }] }
      : { kinds: ['inPerson'], ...(note ? { note } : {}) };
    void submitAssignment(openRow.id, proof)
      .then(() => {
        playTaskComplete();
        toast.success('Agora mostre ao seu pai funcionando. Ele aprova no painel.');
      })
      .catch((e: unknown) => {
        playError();
        toast.error(e instanceof Error ? e.message : 'Não deu para entregar agora.');
      })
      .finally(() => setBusy(false));
  };

  const tabs = (
    <div className="mc-hotbar px-3 py-2">
      {([['treinos', 'Treinos'], ['competencias', 'Competências'], ['ferramentas', 'Ferramentas']] as Array<[Tab, string]>).map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={`mc-slot rounded px-3 min-h-[44px] ${tab === id ? 'mc-slot-selected' : ''}`}
          onClick={() => { playClick(); setTab(id); setOpenN(null); }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <ChildSheet
      onClose={onClose}
      wide="lg"
      title={(
        <span className="flex items-center gap-2 min-w-0">
          <img src={`/assets/village/buildings/laboratorio-${Math.min(4, ['aprendiz', 'tecnico', 'engenheiro', 'inventor'].indexOf(rank) + 1)}.png`} alt="" className="w-8 h-8 mc-pixel" draggable={false} />
          Engenheiro da Vila · {RANK_NAME[rank]}
        </span>
      )}
      tabs={tabs}
    >
      <div className="p-3 space-y-3" data-testid="laboratorio">
        {party && (
          <div className="mc-inv p-3 text-center space-y-2" data-testid="lab-promocao">
            <p className="mc-title text-sm">Você agora é {RANK_NAME[party]} da Vila.</p>
            <p className="text-sm">O Laboratório cresceu. O Ferreiro veio ver.</p>
            <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-6" onClick={() => { playClick(); closeParty(); }}>Continuar</button>
          </div>
        )}

        {tab === 'treinos' && !openT && (
          <div className="space-y-1">
            <div className="mc-inv p-2 text-sm" data-testid="lab-como">
              <p className="mc-lbl">Como funciona</p>
              <ol className="list-decimal pl-5 space-y-0.5">
                <li>Abra o treino liberado e leia o objetivo.</li>
                <li>Abra o MakeCode e siga os passos. Alguns treinos têm um tutorial guiado, que mostra cada bloco.</li>
                <li>Travou? Veja uma pista de cada vez.</li>
                <li>Funcionou? Aperte "Mostrar ao pai" e mostre a ele. Quando ele aprovar, o próximo treino abre.</li>
              </ol>
            </div>
            {ENGENHEIRO.trainings.map((t) => {
              const row = byN[t.n];
              const st = row?.status;
              const label = st === 'approved' ? 'Feito'
                : st === 'submitted' ? 'Esperando o pai'
                  : st === 'needs_changes' ? 'Ajustar'
                    : row ? 'Abrir'
                      : `Abre depois do treino ${unlockedBy(t.n) ?? t.n - 1}`;
              const can = Boolean(row);
              return (
                <button
                  key={t.n}
                  type="button"
                  disabled={!can}
                  onClick={() => openTraining(t.n)}
                  className={`mc-row rounded px-2 py-2 w-full flex items-center gap-2 text-left ${can ? '' : 'opacity-50'}`}
                  data-testid={`lab-treino-${t.n}`}
                >
                  <span className="mc-num shrink-0 w-7 text-center">{t.n}</span>
                  <span className="text-sm font-bold flex-1 min-w-0 truncate">{t.title}</span>
                  <span className={`text-xs shrink-0 ${st === 'approved' ? 'mc-good' : st === 'needs_changes' ? 'mc-warn' : 'mc-muted'}`}>{label}</span>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'treinos' && openT && (
          <div className="space-y-3" data-testid="lab-treino-aberto">
            <button type="button" className="mc-btn mc-btn-dark min-h-[40px] px-3" onClick={() => { playClick(); setOpenN(null); }}>Voltar aos treinos</button>
            <div>
              <p className="mc-title text-sm">Treino {openT.n}: {openT.title}</p>
              <p className="text-xs mc-muted">{openT.time} · vale {openT.xp} XP e 1 redstone</p>
            </div>
            {openT.objective && <p className="text-sm"><strong>Objetivo:</strong> {openT.objective}</p>}
            {openT.uses && <p className="text-sm"><strong>Vai usar:</strong> {openT.uses}</p>}
            {openT.problem && <p className="text-sm"><strong>O problema:</strong> {openT.problem}</p>}
            {openT.idea && <p className="text-sm"><strong>A ideia:</strong> {openT.idea}</p>}
            {openT.how && <p className="text-sm"><strong>Como é:</strong> {openT.how}</p>}
            {openT.before && <p className="text-sm"><strong>Antes:</strong> {openT.before}</p>}
            {openT.choose && (
              <div className="text-sm">
                <strong>Escolha um:</strong>
                <ul className="list-disc pl-5">{openT.choose.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            )}
            {openT.steps.length > 0 && (
              <div className="mc-inv p-2 text-sm">
                <p className="mc-lbl">Passos</p>
                <ol className="list-decimal pl-5 space-y-1">{openT.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {TRAINING_TUTORIALS[openT.n] && (
                    <a href={tutorialUrl(TRAINING_TUTORIALS[openT.n].path)} target="_blank" rel="noopener noreferrer" className="mc-btn mc-btn-green inline-flex items-center min-h-[40px] px-3" data-testid="lab-tutorial">
                      Tutorial guiado
                    </a>
                  )}
                  <a href={MAKECODE_URL} target="_blank" rel="noopener noreferrer" className="mc-btn mc-btn-stone inline-flex items-center min-h-[40px] px-3">Abrir o MakeCode</a>
                </div>
                {TRAINING_TUTORIALS[openT.n] && (
                  <p className="text-xs mc-muted mt-1">
                    {TRAINING_TUTORIALS[openT.n].pt
                      ? 'O tutorial guiado mostra cada bloco, em português.'
                      : 'O tutorial guiado está em inglês, mas a animação mostra cada bloco.'}
                  </p>
                )}
              </div>
            )}
            {TRAINING_KIT_PAGES[openT.n] && (
              <div className="mc-inv p-2 text-sm" data-testid="lab-pdf">
                <p className="mc-lbl">No PDF do kit</p>
                <ul className="space-y-0.5">
                  {TRAINING_KIT_PAGES[openT.n].map((k) => (
                    <li key={k.label}>{k.label}, página {k.page}</li>
                  ))}
                </ul>
                {TRAINING_KIT_PAGES[openT.n].filter((k) => k.note).map((k) => <p key={`n-${k.label}`} className="text-xs mc-muted mt-1">{k.note}</p>)}
                {career.kitPdfUrl && (
                  <a href={career.kitPdfUrl} target="_blank" rel="noopener noreferrer" className="mc-btn mc-btn-stone inline-flex items-center min-h-[40px] px-3 mt-2">Abrir o PDF do kit</a>
                )}
              </div>
            )}
            <div className="mc-inv p-2 text-sm">
              <p className="mc-lbl">Funciona quando</p>
              {openT.worksWhen.length === 1 ? <p>{openT.worksWhen[0]}</p> : <ul className="list-disc pl-5">{openT.worksWhen.map((w) => <li key={w}>{w}</li>)}</ul>}
            </div>

            <div className="mc-inv p-2 text-sm space-y-1">
              <p className="mc-lbl">Pistas</p>
              {openT.hints.length === 0 && <p>{openT.hintsNote || 'Sem pista neste treino.'}</p>}
              {openT.hints.slice(0, hints).map((h, i) => <p key={h}><strong>{i + 1}.</strong> {h}</p>)}
              {hints < openT.hints.length && (
                <button type="button" className="mc-btn mc-btn-stone min-h-[40px] px-3" onClick={() => { playClick(); setHints((v) => v + 1); }}>
                  {hints === 0 ? 'Ver a primeira pista' : 'Ver a próxima pista'}
                </button>
              )}
              {hasMetodo && (
                <div className="pt-1">
                  <button type="button" className="mc-btn mc-btn-dark min-h-[40px] px-3" onClick={() => { playClick(); setMetodo((v) => !v); }}>Não funcionou?</button>
                  {metodo && (
                    <ol className="list-decimal pl-5 mt-2 space-y-0.5" data-testid="lab-metodo">{METODO_PASSOS.map((s) => <li key={s}>{s}</li>)}</ol>
                  )}
                </div>
              )}
            </div>

            {openRow?.status === 'needs_changes' && (
              <p className="text-sm mc-warn">Seu pai pediu: {[...openRow.reviews].reverse().find((r) => r.verdict === 'needs_changes')?.note || 'um ajuste'}.</p>
            )}
            {(openRow?.status === 'available' || openRow?.status === 'needs_changes') && (
              <div className="mc-inv p-2 space-y-2">
                <p className="text-sm">{openT.deliveryQuestion || 'O que você aprendeu? (se quiser)'}</p>
                <textarea className="mc-input w-full text-sm" rows={2} value={learned} onChange={(e) => setLearned(e.target.value)} maxLength={300} />
                <button type="button" disabled={busy} className="mc-btn mc-btn-green min-h-[44px] px-6" onClick={deliver} data-testid="lab-mostrar">
                  Mostrar ao pai
                </button>
              </div>
            )}
            {openRow?.status === 'submitted' && <p className="text-sm">Entregue. Agora mostre ao seu pai funcionando: ele aprova no painel.</p>}
            {openRow?.status === 'approved' && <p className="text-sm mc-good">Feito. O pai viu funcionar.</p>}
          </div>
        )}

        {tab === 'competencias' && (
          <div className="space-y-3">
            <div className="mc-inv p-2 space-y-1">
              {ENGENHEIRO.competencies.map((c) => {
                const level = career.competencies[c.id];
                return (
                  <div key={c.id} className="mc-row rounded px-2 py-1 flex items-center gap-2">
                    <Dot level={level} />
                    <span className="text-sm flex-1">{c.name}</span>
                    <span className="text-xs mc-muted">{level ? LEVEL_NAME[level] : 'Ainda não explorou'}</span>
                  </div>
                );
              })}
            </div>
            {next && (
              <div className="mc-inv p-2 space-y-1" data-testid="lab-proximo">
                <p className="mc-lbl">Próximo título: {next.name}</p>
                {next.requirements.map((r) => {
                  const ok = meets(r, career.competencies, counters);
                  return (
                    <div key={requirementLine(ENGENHEIRO, r)} className="flex items-center gap-2 text-sm">
                      <Dot level={ok ? 'domina' : undefined} />
                      <span className={ok ? 'mc-good' : ''}>{requirementLine(ENGENHEIRO, r)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'ferramentas' && (
          <div className="mc-inv p-2 text-sm space-y-2">
            <p className="mc-lbl">Método do Engenheiro</p>
            {hasMetodo
              ? <ol className="list-decimal pl-5 space-y-0.5">{METODO_PASSOS.map((s) => <li key={s}>{s}</li>)}</ol>
              : <p>Abre quando o pai aprovar o treino 7, o primeiro circuito.</p>}
          </div>
        )}
      </div>
    </ChildSheet>
  );
};

export default Laboratorio;
