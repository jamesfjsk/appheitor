// ========================================
// Mina: quadro do dia com os contratos (jogo vivo da mina).
// ========================================

import React, { useState } from 'react';
import type { BaseDoc, Contract, DailyPlan } from '../../../../types/english';
import { CONTRACT_ICONS, CONTRACT_LABELS, MATERIAL_ICONS, MATERIAL_LABELS } from '../../../../config/englishBase';
import { REWARDED_OTHER_SLOTS } from '../../../../config/englishRewards';
import { visibleCracks } from '../../../../config/village';
import { useVillage } from '../../../../contexts/VillageContext';

interface Props {
  plan: DailyPlan;
  base: BaseDoc;
  onOpen: (contractId: string) => void;
  onRedo: (contractId: string) => Promise<void>;
  onGoVillage?: () => void;
}

const canRedo = (c: Contract): boolean =>
  c.status === 'done' && c.result !== null && c.result.materialEarned === 0 && !c.retryUsed && (c.type === 'merchant' || c.type === 'letter');

const ContractBoard: React.FC<Props> = ({ plan, base, onOpen, onRedo, onGoVillage }) => {
  const [redoing, setRedoing] = useState<string | null>(null);
  const { village } = useVillage();

  const otherRewarded = plan.rewardedIds.filter((id) => plan.contracts[id]?.type !== 'note').length;
  const slotsLeft = Math.max(0, REWARDED_OTHER_SLOTS - otherRewarded);
  const isDone = (c: Contract | undefined): boolean => Boolean(c && (c.status === 'done' || c.result));
  const doneCount = plan.order.filter((id) => isDone(plan.contracts[id])).length;
  const furnaceBonus = doneCount === 0 && base.buildings.fornalha >= 1 && !visibleCracks(village.cracks).includes('fornalha');
  const openIds = plan.order.filter((id) => !isDone(plan.contracts[id]));
  const doneIds = plan.order.filter((id) => isDone(plan.contracts[id]));

  /** Premiado: Recado sempre; os outros enquanto houver vaga e não for refazimento */
  const willReward = (c: Contract): boolean => {
    if (c.type === 'note') return true;
    if (c.status === 'done') return Boolean(c.result?.rewarded);
    return slotsLeft > 0 && !c.retryUsed;
  };

  const redo = async (id: string) => {
    setRedoing(id);
    try {
      await onRedo(id);
    } finally {
      setRedoing(null);
    }
  };

  const renderCard = (id: string) => {
    const c = plan.contracts[id];
    if (!c) {
      return (
        <div key={id} className="mc-card p-3 opacity-60 min-h-[7rem] flex items-center justify-center">
          <span className="mc-font text-sm mc-muted">Chegando...</span>
        </div>
      );
    }
    const done = isDone(c);
    const rewarded = willReward(c);
    const isNote = c.type === 'note';
    const result = c.result;
    return (
      <div
        key={id}
        className={`mc-card mn-contract p-3 flex gap-3 ${isNote && !done ? 'is-need' : ''} ${done ? 'is-done' : ''}`}
        data-testid={`contract-card-${c.type}`}
        data-status={done ? 'done' : 'open'}
      >
        <img
          src={CONTRACT_ICONS[c.type]}
          alt=""
          className={`mc-pixel shrink-0 ${c.type === 'merchant' || c.type === 'forge' ? 'mn-npc-face' : 'w-14 h-14'}`}
          draggable={false}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm mc-muted uppercase">{CONTRACT_LABELS[c.type]}</p>
            {done && (
              <span className="mc-slot mc-slot-good px-2 py-0.5 text-sm font-bold shrink-0" data-testid={`done-${c.type}`}>
                Feito
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-white leading-snug">{c.title}</p>
          {!done && <p className="text-xs text-white/75 mt-0.5 truncate">Tema: {c.theme}</p>}

          {!done && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="mc-slot flex items-center gap-1 px-1.5 py-0.5 text-sm text-white">
                <img src={MATERIAL_ICONS[c.material]} alt="" className="w-4 h-4 mc-pixel" draggable={false} />
                {MATERIAL_LABELS[c.material]}
              </span>
              <span className={`mc-slot px-1.5 py-0.5 text-sm ${rewarded ? 'mc-good' : 'mc-muted'}`}>{rewarded ? '+XP +gold' : 'só material'}</span>
              {isNote && <span className="mc-slot px-1.5 py-0.5 text-sm mc-warn">Obrigatório</span>}
            </div>
          )}

          {done && result ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.materialEarned > 0 && (
                <span className="mc-slot flex items-center gap-1 px-1.5 py-0.5 text-sm mc-good">
                  <img src={MATERIAL_ICONS[c.material]} alt="" className="w-4 h-4 mc-pixel" draggable={false} />
                  +{result.materialEarned} {MATERIAL_LABELS[c.material].toLowerCase()}
                </span>
              )}
              {result.xp > 0 && <span className="mc-slot px-1.5 py-0.5 text-sm mc-good">+{result.xp} XP</span>}
              {result.gold > 0 && <span className="mc-slot px-1.5 py-0.5 text-sm mc-warn">+{result.gold} gold</span>}
              {result.materialEarned === 0 && result.xp === 0 && (
                <span className="text-sm mc-muted">sem prêmio</span>
              )}
            </div>
          ) : null}

          {done && canRedo(c) ? (
            <button onClick={() => void redo(id)} disabled={redoing !== null} className="mc-btn mc-btn-stone mt-2 px-3 py-1.5 text-sm font-bold" data-testid={`redo-${c.type}`}>
              {redoing === id ? 'Abrindo...' : 'Refazer só por material'}
            </button>
          ) : null}

          {!done && (
            <button onClick={() => onOpen(id)} className="mc-btn mc-btn-green mt-2 px-4 py-1.5 text-sm font-bold" data-testid={`open-${c.type}`}>
              {c.retryUsed ? 'Refazer' : 'Abrir'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div data-testid="contract-board">
      <div className="flex items-center justify-end gap-2 mb-3 flex-wrap">
        <div className="text-right">
          <p className="mc-font text-sm text-white">{doneCount}/{plan.order.length} <span className="mc-muted">feitos hoje</span></p>
          <p className="text-sm mc-muted">Vagas com XP e gold: Recado + {slotsLeft} de {REWARDED_OTHER_SLOTS}</p>
        </div>
      </div>

      {furnaceBonus && (
        <p className="text-xs mc-diamond mb-3">Fornalha acesa: +1 material no primeiro contrato de hoje.</p>
      )}

      {openIds.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-bold text-white mb-2">Falta fazer</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {openIds.map(renderCard)}
          </div>
        </div>
      )}

      {doneIds.length > 0 && (
        <div className="mb-2">
          <p className="text-sm font-bold mc-good mb-2">Já feito</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {doneIds.map(renderCard)}
          </div>
        </div>
      )}

      {doneCount >= plan.order.length && plan.order.length > 0 && (
        <div className="mt-4 mc-card p-3 text-center">
          <p className="text-sm text-white/90">Os materiais estão na Vila. Toque numa obra para melhorar.</p>
          {onGoVillage && (
            <button type="button" onClick={onGoVillage} className="mc-btn mc-btn-stone mt-3 px-4 py-2 text-sm font-bold">
              Ir para a Vila
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractBoard;
