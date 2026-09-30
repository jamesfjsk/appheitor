import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { useVillage } from '../../../contexts/VillageContext';
import { useClock } from '../../../contexts/ClockContext';
import { useSound } from '../../../contexts/SoundContext';
import type { Assignment, AssignmentStatus } from '../../../types/assignment';
import { acceptAssignment, dropAssignment, submitAssignment, subscribeAssignments } from '../../../services/assignmentsService';
import { effectiveStatus, isProjectSize } from '../../../services/assignments/machine';
import { SPECIALTY_LABEL, SIZE_TIME, WEEKDAY_NAME, competencyName } from '../../../services/assignments/labels';
import { templateById } from '../../../services/assignments/templates';
import {
  approvedKicker,
  approvedLine,
  changesLead,
  competencyLine,
  dropLine,
  dueLine,
  emptyBoardLine,
  expiredLine,
  goldGainLine,
  limitLine,
  newCardKicker,
  offlineLine,
  planAsk,
  projectLimitLine,
  rewardLine,
  sinceLine,
  submittedLine,
  adultBand,
} from '../../../services/assignments/voice';
import { addDays, nowBrazil, weekdayOf } from '../../../utils/clock';
import ProofSheet from '../proof/ProofSheet';

const GOLD = '/assets/english/ui/gold.webp';

const RANK: Record<AssignmentStatus, number> = {
  needs_changes: 0,
  accepted: 1,
  available: 2,
  submitted: 3,
  expired: 4,
  approved: 5,
  cancelled: 9,
};

function weekdayName(date: string | undefined): string {
  if (!date) return 'hoje';
  return WEEKDAY_NAME[weekdayOf(date)] || 'hoje';
}

function dayOf(iso: string | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return nowBrazil(ms).date;
}

function visible(row: Assignment, today: string): boolean {
  if (row.status === 'cancelled') return false;
  const eff = effectiveStatus(row, today);
  if (eff === 'expired') {
    if (!row.dueOn) return false;
    return today <= addDays(row.dueOn, 1);
  }
  if (row.status === 'approved') {
    const day = dayOf(row.payout?.at);
    if (!day) return true;
    return day >= addDays(today, -14);
  }
  return true;
}

function asksMeta(row: Assignment): boolean {
  return row.size === 'projeto' || row.size === 'grande' || Boolean(templateById(row.templateId)?.meta);
}

const EncomendasQuadro: React.FC = () => {
  const { childUid } = useAuth();
  const { economy } = useVillage();
  const { today } = useClock();
  const { playClick, playTaskComplete, playRewardUnlocked, playError } = useSound();
  const [rows, setRows] = useState<Assignment[]>([]);
  const [offline, setOffline] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [mode, setMode] = useState<'board' | 'detail' | 'proof' | 'drop'>('board');
  const [plan, setPlan] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!childUid) return;
    setOffline(false);
    return subscribeAssignments(childUid, (next) => {
      setRows(next);
      setOffline(false);
    }, () => setOffline(true));
  }, [childUid]);

  const selected = rows.find((row) => row.id === pick) || null;
  const activeMax = economy.assignmentActiveMax || 3;
  const projectMax = economy.assignmentProjectMax || 1;
  const active = rows.filter((row) => row.kind === 'paid' && (row.status === 'accepted' || row.status === 'needs_changes'));
  const projectCount = active.filter((row) => isProjectSize(row.size)).length;

  const board = useMemo(
    () => rows.filter((row) => visible(row, today)).sort((a, b) => (RANK[effectiveStatus(a, today)] ?? 9) - (RANK[effectiveStatus(b, today)] ?? 9)),
    [rows, today],
  );

  useEffect(() => {
    if (mode === 'detail' && selected?.status === 'approved') playRewardUnlocked();
  }, [mode, selected?.id, selected?.status, playRewardUnlocked]);

  const fail = (error: unknown) => {
    playError();
    toast.error(error instanceof Error ? error.message : 'Não deu agora.');
  };

  const open = (id: string) => {
    playClick();
    setPick(id);
    setMode('detail');
    setPlan('');
  };

  if (!childUid) return <p className="text-sm">Entra na Vila para ver o quadro.</p>;
  if (offline && rows.length === 0) return <p className="text-sm">{offlineLine()}</p>;

  if (mode !== 'board' && selected) {
    const eff = effectiveStatus(selected, today);
    const note = templateById(selected.templateId)?.childNote;
    const lastFix = [...selected.reviews].reverse().find((review) => review.verdict === 'needs_changes');
    const gained = selected.payout?.gold ?? selected.reward.gold;
    const skill = [...selected.reviews].reverse().find((review) => review.verdict === 'approved')?.competencies?.[0];
    const blocked = eff === 'available' && active.length >= activeMax;
    const projectBlocked = eff === 'available' && isProjectSize(selected.size) && projectCount >= projectMax;

    if (mode === 'drop') {
      return (
        <div className="space-y-3" data-testid="encomendas-drop">
          <p className="text-sm">{dropLine()}</p>
          <button
            type="button"
            className="mc-btn mc-btn-wood min-h-[44px] w-full"
            disabled={busy}
            onClick={() => {
              playClick();
              setBusy(true);
              void dropAssignment(selected.id)
                .then(() => { setMode('board'); toast.success(dropLine()); })
                .catch(fail)
                .finally(() => setBusy(false));
            }}
          >
            Desistir desta encomenda
          </button>
          <button type="button" className="mc-btn mc-btn-stone min-h-[44px] w-full" onClick={() => { playClick(); setMode('detail'); }}>
            Ficar com ela
          </button>
        </div>
      );
    }

    if (mode === 'proof') {
      return (
        <ProofSheet
          criteria={selected.criteria}
          questions={selected.proof.questions ?? []}
          kinds={selected.proof.kinds}
          adult={selected.adult}
          askMeta={asksMeta(selected)}
          again={selected.status === 'needs_changes'}
          busy={busy}
          onCancel={() => setMode('detail')}
          onSubmit={(payload) => {
            setBusy(true);
            void submitAssignment(selected.id, payload.proof, payload)
              .then(() => {
                playTaskComplete();
                setMode('detail');
                toast.success(submittedLine());
              })
              .catch(fail)
              .finally(() => setBusy(false));
          }}
        />
      );
    }

    return (
      <div className="space-y-3" data-testid={eff === 'approved' ? 'encomendas-approved' : eff === 'needs_changes' ? 'encomendas-changes' : eff === 'accepted' ? 'encomendas-progress' : 'encomendas-detail'}>
        <button type="button" className="mc-btn mc-btn-stone min-h-[44px] px-3" onClick={() => { playClick(); setMode('board'); }}>
          Voltar ao quadro
        </button>
        <p className="mc-lbl">{SPECIALTY_LABEL[selected.specialty]}</p>
        <h3 className="text-base font-bold">{selected.title}</h3>
        {selected.story && <p className="text-sm">{selected.story}</p>}
        {selected.adult && <p className="mc-card p-3 text-sm font-bold">{adultBand()}</p>}
        {note && <p className="mc-card p-3 text-sm">{note}</p>}

        {eff === 'approved' && (
          <div className="mc-card p-3 mc-pop space-y-1">
            <p className="font-bold">{approvedKicker()}</p>
            <p className="text-sm">{approvedLine()}</p>
            <p className="mc-num flex items-center gap-2">
              <img src={GOLD} alt="" className="w-8 h-8 mc-pixel" draggable={false} />
              {goldGainLine(gained)}
            </p>
            {skill && <p className="text-sm">{competencyLine(competencyName(skill))}</p>}
          </div>
        )}

        {eff === 'expired' && <p className="text-sm">{expiredLine()}</p>}
        {eff === 'submitted' && <p className="text-sm">{submittedLine()}</p>}

        {eff === 'needs_changes' && (
          <div className="mc-card p-3 space-y-2">
            <p className="text-sm font-bold">{changesLead()}</p>
            {lastFix?.note && <p className="text-sm">{lastFix.note}</p>}
            {selected.criteria.map((line, i) => (
              <p key={line} className="text-sm">{lastFix?.missing?.includes(i) ? 'Ainda' : 'Feito'} · {line}</p>
            ))}
          </div>
        )}

        {eff !== 'approved' && eff !== 'expired' && (
          <>
            <div>
              <p className="text-sm font-bold">O que é pedido</p>
              <p className="text-sm">{selected.deliverable}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold">Para ficar pronto</p>
              {selected.criteria.map((line) => <p key={line} className="text-sm">· {line}</p>)}
            </div>
            <p className="text-sm flex items-center gap-2">
              <img src={GOLD} alt="" className="w-8 h-8 mc-pixel" draggable={false} />
              <span className="mc-num">{rewardLine(selected.reward.gold)}</span>
            </p>
            {selected.size && <p className="text-sm">{SIZE_TIME[selected.size]}</p>}
            {selected.dueOn && <p className="text-sm">{dueLine(weekdayOf(selected.dueOn))}</p>}
            {selected.reward.xp > 0 && <p className="text-sm">{selected.reward.xp} XP</p>}
          </>
        )}

        {eff === 'accepted' && selected.acceptedAt && (
          <p className="text-sm">{sinceLine(weekdayName(dayOf(selected.acceptedAt) || undefined))}</p>
        )}

        {eff === 'available' && asksMeta(selected) && (
          <label className="block space-y-1">
            <span className="text-sm">{planAsk()}</span>
            <input className="w-full rounded p-2 text-sm text-black min-h-[44px]" value={plan} onChange={(e) => setPlan(e.target.value)} />
          </label>
        )}

        {eff === 'available' && blocked && <p className="text-sm">{limitLine(activeMax)}</p>}
        {eff === 'available' && !blocked && projectBlocked && <p className="text-sm">{projectLimitLine()}</p>}

        {eff === 'available' && !blocked && !projectBlocked && (
          <button
            type="button"
            data-testid="aceitar-encomenda"
            className="mc-btn mc-btn-green min-h-[44px] w-full"
            disabled={busy}
            onClick={() => {
              playClick();
              setBusy(true);
              void acceptAssignment(selected.id, plan)
                .then(() => toast.success('Encomenda aceita.'))
                .catch(fail)
                .finally(() => setBusy(false));
            }}
          >
            Aceitar encomenda
          </button>
        )}

        {(eff === 'accepted' || eff === 'needs_changes') && (
          <>
            <button type="button" className="mc-btn mc-btn-green min-h-[44px] w-full" onClick={() => { playClick(); setMode('proof'); }}>
              {eff === 'needs_changes' ? 'Entregar de novo' : 'Entregar'}
            </button>
            <button type="button" className="mc-btn mc-btn-wood min-h-[44px] w-full" onClick={() => { playClick(); setMode('drop'); }}>
              Desistir desta encomenda
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="encomendas-board">
      {board.length === 0 && <p className="text-sm">{emptyBoardLine()}</p>}
      {board.map((row) => {
        const eff = effectiveStatus(row, today);
        const kicker = eff === 'approved'
          ? approvedKicker()
          : eff === 'needs_changes'
            ? 'Ainda não está pronto'
            : eff === 'accepted'
              ? 'Em andamento'
              : eff === 'submitted'
                ? 'Entregue'
                : eff === 'expired'
                  ? 'O prazo passou'
                  : newCardKicker();
        return (
          <article key={row.id} className="mc-card p-3 space-y-2" data-testid="encomenda-card">
            <p className="mc-lbl">{kicker}</p>
            <p className="text-sm">{SPECIALTY_LABEL[row.specialty]}</p>
            <h3 className="font-bold">{row.title}</h3>
            {row.story && eff === 'available' && <p className="text-sm">{row.story}</p>}
            <p className="text-sm flex items-center gap-2">
              <img src={GOLD} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
              {rewardLine(row.reward.gold)}
            </p>
            {row.size && <p className="text-sm">{SIZE_TIME[row.size]}</p>}
            {row.dueOn && eff === 'available' && <p className="text-sm">{dueLine(weekdayOf(row.dueOn))}</p>}
            <button type="button" className="mc-btn mc-btn-green min-h-[44px] px-3" onClick={() => open(row.id)}>
              Ver encomenda
            </button>
          </article>
        );
      })}
    </div>
  );
};

export default EncomendasQuadro;
