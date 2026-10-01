// Painel do pai: carreira Engenheiro da Vila (CONTRATOS_E_CARREIRAS.md §12). Tailwind branco e azul.
// A aprovação dos treinos é na aba Encomendas (Conferir). O CareerSync abre os treinos seguintes.
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { ENGENHEIRO, type CompetencyLevel } from '../../config/careers';
import { ENGENHEIRO_MARCO } from '../../config/engenheiroTreinos';
import type { Assignment } from '../../types/assignment';
import { subscribeAssignments } from '../../services/assignmentsService';
import {
  activitiesOf,
  markTrainingDoneOffApp,
  setManualLevel,
  startCareer,
  subscribeCareer,
  syncCareer,
  trainingAssignmentId,
  type CareerState,
} from '../../services/careerService';
import { countersOf, meets, nextRank, requirementLine } from '../../services/village/career';
import { getTodayBrazil } from '../../utils/clock';

const RANK_NAME: Record<string, string> = { aprendiz: 'Aprendiz', tecnico: 'Técnico', engenheiro: 'Engenheiro', inventor: 'Inventor' };
const STATUS_NAME: Record<string, string> = {
  available: 'liberado',
  submitted: 'esperando você aprovar (aba Encomendas)',
  needs_changes: 'ajuste pedido',
  approved: 'feito',
};

/** Fica montado no painel: depois de cada aprovação, recalcula a carreira e abre o treino seguinte. */
export const CareerSync: React.FC = () => {
  const { childUid } = useAuth();
  const [career, setCareer] = useState<CareerState | null>(null);
  const [rows, setRows] = useState<Assignment[] | null>(null);
  const running = useRef(false);

  useEffect(() => {
    if (!childUid) return;
    const a = subscribeCareer(childUid, setCareer);
    const b = subscribeAssignments(childUid, setRows);
    return () => { a(); b(); };
  }, [childUid]);

  useEffect(() => {
    if (!childUid || !career || !rows || running.current) return;
    running.current = true;
    void syncCareer(childUid, rows, career, getTodayBrazil())
      .then((rose) => { if (rose) toast.success(`Ele virou ${RANK_NAME[rose]} da Vila.`); })
      .catch((e) => console.warn('carreira: sync', e))
      .finally(() => { running.current = false; });
  }, [childUid, career, rows]);

  return null;
};

const CareerPanel: React.FC = () => {
  const { childUid } = useAuth();
  const [career, setCareer] = useState<CareerState | null | undefined>(undefined);
  const [rows, setRows] = useState<Assignment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!childUid) return;
    const a = subscribeCareer(childUid, setCareer);
    const b = subscribeAssignments(childUid, setRows);
    return () => { a(); b(); };
  }, [childUid]);

  if (!childUid) return <p className="text-sm text-gray-500">Sem criança ligada a este painel.</p>;
  if (career === undefined) return <p className="text-sm text-gray-500">Carregando…</p>;

  const run = (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    void fn()
      .then(() => toast.success(ok))
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : 'Não deu certo.'))
      .finally(() => setBusy(null));
  };

  if (!career) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <h3 className="text-lg font-bold text-gray-900">Engenheiro da Vila</h3>
        <p className="text-sm text-gray-600">
          A carreira do micro:bit. Ao começar, nasce o Laboratório no lote ao lado do Sábio e abre o treino 1. Cada treino que você
          aprovar (aba Encomendas) libera os próximos. Treino paga XP e 1 redstone, nunca gold.
        </p>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run('start', () => startCareer(childUid, getTodayBrazil()), 'Carreira começada. O Laboratório apareceu na Vila.')}
          className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Começar a carreira Engenheiro da Vila
        </button>
      </div>
    );
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  const next = nextRank(ENGENHEIRO, career.rank);
  const counters = countersOf(activitiesOf(rows));
  const marco = career.trainingsDone.includes(14);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-2">
        <h3 className="text-lg font-bold text-gray-900">Engenheiro da Vila · {RANK_NAME[career.rank]}</h3>
        <p className="text-sm text-gray-600">Começou em {career.startedAt.split('-').reverse().join('/')}. Treinos feitos: {career.trainingsDone.length} de {ENGENHEIRO.trainings.length}.</p>
        {marco && <p className="text-sm font-semibold text-blue-700">{ENGENHEIRO_MARCO.notes[0]}</p>}
        {next && (
          <div className="rounded-xl bg-gray-50 p-3 text-sm">
            <p className="font-semibold text-gray-800">Para {next.name}:</p>
            <ul className="mt-1 space-y-0.5">
              {next.requirements.map((r) => (
                <li key={requirementLine(ENGENHEIRO, r)} className={meets(r, career.competencies, counters) ? 'text-green-700' : 'text-gray-600'}>
                  {meets(r, career.competencies, counters) ? 'feito: ' : 'falta: '}{requirementLine(ENGENHEIRO, r)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="mb-1 text-lg font-bold text-gray-900">Treinos</h3>
        <p className="mb-3 text-sm text-gray-500">
          Aprovar: aba Encomendas, em Conferir. "Já fez fora do app" serve para o que ele fez com você antes do Laboratório abrir, como o primeiro dia (1 a 3).
        </p>
        <div className="divide-y divide-gray-100">
          {ENGENHEIRO.trainings.map((t) => {
            const row = byId.get(trainingAssignmentId(childUid, t.n));
            const status = row ? STATUS_NAME[row.status] || row.status : 'ainda fechado';
            const done = row?.status === 'approved';
            return (
              <div key={t.n} className="flex items-center gap-3 py-2">
                <span className="w-6 text-right text-sm font-semibold text-gray-500">{t.n}</span>
                <span className="flex-1 text-sm text-gray-900">{t.title}</span>
                <span className={`text-xs ${done ? 'text-green-700' : 'text-gray-500'}`}>{status}</span>
                {!done && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => run(`off-${t.n}`, () => markTrainingDoneOffApp(childUid, t.n, getTodayBrazil()), `Treino ${t.n} marcado como feito.`)}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Já fez fora do app
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="mb-1 text-lg font-bold text-gray-900">Competências</h3>
        <p className="mb-3 text-sm text-gray-500">Saem das aprovações. Se você viu algo fora do app, ajuste aqui.</p>
        <div className="divide-y divide-gray-100">
          {ENGENHEIRO.competencies.map((c) => {
            const level = career.competencies[c.id];
            return (
              <div key={c.id} className="flex items-center gap-3 py-2">
                <span className="flex-1 text-sm text-gray-900">{c.name}</span>
                <select
                  value={level || 'nenhum'}
                  disabled={busy !== null}
                  onChange={(e) => run(`comp-${c.id}`, () => setManualLevel(childUid, c.id, e.target.value as CompetencyLevel | 'nenhum'), 'Competência ajustada.')}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
                >
                  <option value="nenhum">Ainda não explorou</option>
                  <option value="praticando">Praticando</option>
                  <option value="domina">Já domina</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CareerPanel;
