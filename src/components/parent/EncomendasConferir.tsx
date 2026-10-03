import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Assignment, AssignmentDraft, AssignmentStatus } from '../../types/assignment';
import type { EconomySettings } from '../../types/village';
import { DEFAULT_ECONOMY } from '../../config/village';
import { subscribeSettings } from '../../services/settingsService';
import {
  approveAssignment,
  requestChanges,
  cancelAssignment,
  changeDue,
  uploadProofPhoto,
} from '../../services/assignmentsService';
import { deadlineWeeks, nextDueOn } from '../../services/assignments/due';
import { isProjectSize } from '../../services/assignments/machine';
import { needsCapWarn, projectWeekCap, usedShortGold, weeklyCapGold } from '../../services/assignments/rewards';
import { COMPETENCY_LABEL, SPECIALTY_LABEL, competencyName } from '../../services/assignments/labels';
import { executionFromProblem } from '../../services/assignments/templates';
import { capWarn } from '../../services/assignments/voice';
import { listGoldTransactions } from '../../services/goldTx';
import { referenceIncome } from '../../services/village/income';
import { getVillage } from '../../services/villageService';
import { addDays, getTodayBrazil, isoWeekOf, nowBrazil } from '../../utils/clock';

function payoutDay(row: Assignment): string | null {
  const iso = row.payout?.at;
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return nowBrazil(ms).date;
}

const BOARD_STATUS: ReadonlySet<AssignmentStatus> = new Set(['available', 'accepted', 'needs_changes']);

const STATUS_LABEL: Record<string, string> = {
  available: 'Disponível',
  accepted: 'Aceita',
  needs_changes: 'Ajuste pedido',
};

const EncomendasConferir: React.FC<{
  uid: string;
  rows: Assignment[];
  onExecution: (draft: AssignmentDraft) => void;
}> = ({ uid, rows, onExecution }) => {
  const [economy, setEconomy] = useState<EconomySettings>(DEFAULT_ECONOMY);
  const [dayGold, setDayGold] = useState(DEFAULT_ECONOMY.incomeDayGold);
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [fixNote, setFixNote] = useState('');
  const [fixDue, setFixDue] = useState('');
  const [missing, setMissing] = useState<number[]>([]);
  const [comps, setComps] = useState<string[]>([]);
  const [saw, setSaw] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [warn, setWarn] = useState<Assignment | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [boardDue, setBoardDue] = useState<Record<string, string>>({});

  useEffect(() => subscribeSettings(
    'economy',
    DEFAULT_ECONOMY as unknown as Record<string, unknown>,
    (value) => setEconomy(value as unknown as EconomySettings),
  ), []);

  useEffect(() => {
    let live = true;
    void Promise.all([listGoldTransactions(uid, 200), getVillage(uid)]).then(([txs, village]) => {
      if (!live) return;
      const week = txs.filter((t) => Date.now() - t.createdAt.getTime() < 7 * 86400000);
      const reserve = economy.incomeDayGold || DEFAULT_ECONOMY.incomeDayGold;
      setDayGold(referenceIncome(week, reserve, {
        launchedOn: village.launchedOn,
        launchedAt: village.launchedAt,
        today: getTodayBrazil(),
      }));
    }).catch(() => { /* o 23 de reserva fica */ });
    return () => { live = false; };
  }, [uid, economy.incomeDayGold]);

  const today = getTodayBrazil();
  const week = isoWeekOf(today);
  const used = usedShortGold(rows.map((row) => ({
    size: row.size,
    status: row.status,
    payoutGold: row.payout?.gold,
    payoutDay: payoutDay(row),
  })), week);
  const cap = weeklyCapGold(dayGold, economy.assignmentWeeklyCapDays);
  const pending = rows.filter((row) => row.status === 'submitted');
  const onBoard = rows.filter((row) => BOARD_STATUS.has(row.status));
  const month = today.slice(0, 7);
  const overMonth = rows.reduce((sum, row) => sum + row.reviews.filter((review) => review.overCap && review.at.slice(0, 7) === month).length, 0);
  const current = pending.find((row) => row.id === open) || null;

  const choose = (row: Assignment) => {
    setOpen(row.id);
    setNote('');
    setFixNote('');
    setFixDue(nextDueOn(row.dueOn, today) ?? addDays(today, 1));
    setMissing([]);
    setComps(row.competencies);
    setSaw(false);
    setFixed(false);
    setFile(null);
  };

  const runApprove = async (row: Assignment, forced: boolean) => {
    const weeks = deadlineWeeks(row.availableOn, row.dueOn);
    if (!forced && needsCapWarn({
      size: row.size,
      gold: row.reward.gold,
      usedShort: used,
      dayGold,
      weeks,
      capDays: economy.assignmentWeeklyCapDays,
    })) {
      setWarn(row);
      return;
    }
    setBusy(true);
    try {
      let photos: string[] = [];
      if (file) {
        try {
          photos = [await uploadProofPhoto(uid, row.id, file, row.reviews.length + 1)];
        } catch {
          toast('A foto não entrou. A aprovação segue.');
          photos = [];
        }
      }
      const out = await approveAssignment(uid, row.id, {
        note,
        missing,
        competencies: comps,
        sawItWorking: saw,
        fixedAfterFailure: fixed,
        overCap: forced,
        photoPaths: photos,
      });
      setWarn(null);
      if (out.already && !out.paid) toast('Esta encomenda já foi aprovada.');
      else toast.success(out.gold > 0 ? `Aprovado. +${out.gold} gold.` : 'Aprovado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não deu para aprovar.');
    } finally {
      setBusy(false);
    }
  };

  const warnCap = warn
    ? (isProjectSize(warn.size) ? projectWeekCap(dayGold, deadlineWeeks(warn.availableOn, warn.dueOn)) : cap)
    : cap;

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="encomendas-conferir">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Para conferir</h2>
      <p className="text-sm text-gray-600 mb-3">
        Aprovado na semana: {used} · teto {cap}
        {overMonth > 0 ? ` · passou do teto ${overMonth} ${overMonth === 1 ? 'vez' : 'vezes'} neste mês` : ''}
      </p>
      {pending.length === 0 && <p className="text-sm text-gray-500">Nenhuma entrega esperando.</p>}
      <ul className="space-y-3">
        {pending.map((row) => {
          const proof = row.submissions[row.submissions.length - 1];
          const renew = nextDueOn(row.dueOn, today) !== null;
          return (
            <li key={row.id} className="border border-gray-200 rounded p-3">
              <button type="button" className="text-left w-full" onClick={() => choose(row)}>
                <p className="font-semibold text-gray-900">{row.title}</p>
                <p className="text-sm text-gray-600">
                  {row.kind === 'training'
                    ? `Treino · ${row.reward.xp} XP e 1 redstone`
                    : `${SPECIALTY_LABEL[row.specialty]} · ${row.reward.gold} gold`}
                  {row.drops > 0 ? ` · desistiu ${row.drops}` : ''}
                  {typeof proof?.hintsUsed === 'number' && proof.hintsUsed > 0 ? ` · pistas ${proof.hintsUsed}` : ''}
                </p>
              </button>
              {current?.id === row.id && proof && (
                <div className="mt-3 space-y-2 text-sm text-gray-800">
                  {row.criteria.map((line, i) => (
                    <p key={line}>{proof.proof.checklist?.[i] ? 'Marcou' : 'Não marcou'} · {line}</p>
                  ))}
                  {proof.proof.answers?.map((item) => (
                    <p key={item.q}><span className="font-medium">{item.q}</span> {item.a}</p>
                  ))}
                  {proof.proof.note && <p>{proof.proof.note}</p>}
                  {proof.whatWentWrong && <p>Deu problema antes de funcionar.</p>}
                  {proof.whatChanged && <p>O que mudou: {proof.whatChanged}</p>}
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(COMPETENCY_LABEL).map((id) => (
                      <label key={id} className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={comps.includes(id)}
                          onChange={() => setComps((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])}
                        />
                        {competencyName(id)}
                      </label>
                    ))}
                  </div>
                  {row.proof.kinds.includes('inPerson') && (
                    <label className="inline-flex items-center gap-1">
                      <input type="checkbox" checked={saw} onChange={(e) => setSaw(e.target.checked)} />
                      Vi funcionando
                    </label>
                  )}
                  {(row.size === 'projeto' || row.size === 'grande') && (
                    <label className="inline-flex items-center gap-1">
                      <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} />
                      Houve falha e ele corrigiu
                    </label>
                  )}
                  <label className="block">
                    Foto, se quiser
                    <input type="file" accept="image/*" className="block mt-1" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" data-testid="aprovar-encomenda" className="px-3 py-2 bg-blue-600 text-white rounded text-sm" disabled={busy} onClick={() => void runApprove(row, false)}>
                      Aprovar
                    </button>
                  </div>
                  <div className="border-t border-gray-100 pt-2 space-y-2">
                    <p className="font-medium">Pedir ajuste</p>
                    {row.criteria.map((line, i) => (
                      <label key={line} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={missing.includes(i)}
                          onChange={() => setMissing((prev) => prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i])}
                        />
                        {line}
                      </label>
                    ))}
                    <textarea className="w-full border rounded p-2" value={fixNote} onChange={(e) => setFixNote(e.target.value)} aria-label="Frase para ele" />
                    {renew && (
                      <label className="block text-sm">
                        Prazo novo
                        <input type="date" className="mt-1 block border rounded px-2 py-1" value={fixDue} onChange={(e) => setFixDue(e.target.value)} />
                      </label>
                    )}
                    <button
                      type="button"
                      data-testid="pedir-ajuste"
                      className="px-3 py-2 border border-blue-600 text-blue-700 rounded text-sm"
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        void requestChanges(row.id, { note: fixNote, missing, dueOn: renew ? fixDue : undefined })
                          .then(() => toast.success('Ajuste pedido.'))
                          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Não deu.'))
                          .finally(() => setBusy(false));
                      }}
                    >
                      Pedir ajuste
                    </button>
                    <button
                      type="button"
                      className="ml-2 px-3 py-2 border border-red-300 text-red-700 rounded text-sm"
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        void cancelAssignment(row.id)
                          .then(() => toast.success('Encomenda cancelada.'))
                          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Não deu.'))
                          .finally(() => setBusy(false));
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {rows.filter((row) => row.status === 'approved' && row.templateId === 'problema').map((row) => (
        <button
          key={row.id}
          type="button"
          className="mt-3 block text-sm text-blue-700 underline"
          onClick={() => onExecution(executionFromProblem(row))}
        >
          Transformar em encomenda de execução
        </button>
      ))}
      <div className="mt-6 border-t border-gray-100 pt-4" data-testid="encomendas-no-quadro">
        <h3 className="text-lg font-bold text-gray-900 mb-2">No quadro</h3>
        {onBoard.length === 0 && <p className="text-sm text-gray-500">Nenhuma encomenda aberta.</p>}
        <ul className="space-y-3">
          {onBoard.map((row) => (
            <li key={row.id} className="border border-gray-200 rounded p-3 space-y-2">
              <p className="font-medium text-gray-900">{row.title}</p>
              <p className="text-sm text-gray-600">{STATUS_LABEL[row.status] || row.status}{row.dueOn ? ` · prazo ${row.dueOn}` : ''}</p>
              <label className="block text-sm text-gray-700">
                Mudar prazo
                <input
                  type="date"
                  className="mt-1 block border rounded px-2 py-1"
                  value={boardDue[row.id] ?? row.dueOn ?? addDays(today, 1)}
                  onChange={(e) => setBoardDue((prev) => ({ ...prev, [row.id]: e.target.value }))}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="mudar-prazo"
                  className="px-3 py-2 border border-blue-600 text-blue-700 rounded text-sm"
                  disabled={busy}
                  onClick={() => {
                    const due = boardDue[row.id] ?? row.dueOn ?? addDays(today, 1);
                    setBusy(true);
                    void changeDue(row.id, due)
                      .then(() => toast.success('Prazo mudou.'))
                      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Não deu.'))
                      .finally(() => setBusy(false));
                  }}
                >
                  Mudar prazo
                </button>
                <button
                  type="button"
                  data-testid="retirar-encomenda"
                  className="px-3 py-2 border border-red-300 text-red-700 rounded text-sm"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void cancelAssignment(row.id)
                      .then(() => toast.success('Encomenda retirada.'))
                      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Não deu.'))
                      .finally(() => setBusy(false));
                  }}
                >
                  Retirar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {warn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow p-6 max-w-md space-y-3" data-testid="encomendas-cap-warn">
            <p className="text-gray-900">{capWarn(warnCap)}</p>
            <div className="flex gap-2">
              <button type="button" className="px-3 py-2 bg-blue-600 text-white rounded text-sm" disabled={busy} onClick={() => void runApprove(warn, true)}>
                Aprovar mesmo assim
              </button>
              <button type="button" className="px-3 py-2 border rounded text-sm" onClick={() => setWarn(null)}>Agora não</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default EncomendasConferir;
