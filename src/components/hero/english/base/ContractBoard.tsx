// ========================================
// A Base: quadro do dia com os 5 contratos (ícone c_*, tema, material, chip premiado
// ou só material, "Recado: obrigatório", resultado e "Refazer só por material").
// ========================================

import React, { useState } from 'react';
import type { BaseDoc, Contract, DailyPlan } from '../../../../types/english';
import { CONTRACT_ICONS, CONTRACT_LABELS, MATERIAL_ICONS, MATERIAL_LABELS } from '../../../../config/englishBase';
import { REWARDED_OTHER_SLOTS } from '../../../../config/englishRewards';

interface Props {
  plan: DailyPlan;
  base: BaseDoc;
  onOpen: (contractId: string) => void;
  onRedo: (contractId: string) => Promise<void>;
  onBack: () => void;
}

const canRedo = (c: Contract): boolean =>
  c.status === 'done' && c.result !== null && c.result.materialEarned === 0 && !c.retryUsed && (c.type === 'merchant' || c.type === 'letter');

const ContractBoard: React.FC<Props> = ({ plan, base, onOpen, onRedo, onBack }) => {
  const [redoing, setRedoing] = useState<string | null>(null);

  const otherRewarded = plan.rewardedIds.filter((id) => plan.contracts[id]?.type !== 'note').length;
  const slotsLeft = Math.max(0, REWARDED_OTHER_SLOTS - otherRewarded);
  const doneCount = plan.order.filter((id) => plan.contracts[id]?.status === 'done').length;
  const furnaceBonus = doneCount === 0 && base.buildings.fornalha >= 1;

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

  return (
    <div data-testid="contract-board">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <button onClick={onBack} className="mc-btn mc-btn-stone px-4 py-2 text-sm font-bold">Mapa</button>
        <div className="text-right">
          <p className="mc-font text-[10px] text-white">{doneCount}/{plan.order.length} <span className="mc-muted">feitos hoje</span></p>
          <p className="text-[11px] mc-muted">Vagas com XP e gold: Recado + {slotsLeft} de {REWARDED_OTHER_SLOTS}</p>
        </div>
      </div>

      {furnaceBonus && (
        <p className="text-xs mc-diamond mb-3">Fornalha acesa: +1 material no primeiro contrato de hoje.</p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {plan.order.map((id) => {
          const c = plan.contracts[id];
          if (!c) {
            return (
              <div key={id} className="mc-card p-3 opacity-60 min-h-[7rem] flex items-center justify-center">
                <span className="mc-font text-[9px] mc-muted">Chegando...</span>
              </div>
            );
          }
          const done = c.status === 'done';
          const rewarded = willReward(c);
          const isNote = c.type === 'note';
          return (
            <div key={id} className={`mc-card p-3 flex gap-3 ${isNote && !done ? 'ring-2 ring-[#ffd83d]' : ''} ${done ? 'opacity-90' : ''}`} data-testid={`contract-card-${c.type}`}>
              <img src={CONTRACT_ICONS[c.type]} alt="" className="w-14 h-14 mc-pixel shrink-0" draggable={false} />
              <div className="min-w-0 flex-1">
                <p className="mc-font text-[9px] mc-muted uppercase">{CONTRACT_LABELS[c.type]}</p>
                <p className="text-sm font-bold text-white leading-snug">{c.title}</p>
                <p className="text-xs text-white/75 mt-0.5 truncate">Tema: {c.theme}</p>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="mc-slot flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-white">
                    <img src={MATERIAL_ICONS[c.material]} alt="" className="w-4 h-4 mc-pixel" draggable={false} />
                    {MATERIAL_LABELS[c.material]}
                  </span>
                  <span className={`mc-slot px-1.5 py-0.5 mc-font text-[8px] ${rewarded ? 'mc-good' : 'mc-muted'}`}>{rewarded ? '+XP +gold' : 'só material'}</span>
                  {isNote && <span className="mc-slot px-1.5 py-0.5 mc-font text-[8px] mc-warn">Recado: obrigatório</span>}
                </div>

                {done && c.result ? (
                  <div className="mt-2">
                    <p className="text-xs text-white/90">
                      {c.result.materialEarned > 0 ? (
                        <span className="mc-good">+{c.result.materialEarned} {MATERIAL_LABELS[c.material].toLowerCase()}</span>
                      ) : (
                        <span className="mc-muted">sem material</span>
                      )}
                      <span className="mc-muted"> · {c.result.score % 1 === 0 ? c.result.score : c.result.score.toFixed(1)}/{c.result.max}</span>
                      {c.result.xp > 0 && <span className="mc-warn"> · +{c.result.xp} XP{c.result.gold > 0 ? ` +${c.result.gold} gold` : ''}</span>}
                    </p>
                    {canRedo(c) && (
                      <button onClick={() => void redo(id)} disabled={redoing !== null} className="mc-btn mc-btn-stone mt-2 px-3 py-1.5 text-xs font-bold" data-testid={`redo-${c.type}`}>
                        {redoing === id ? 'Abrindo...' : 'Refazer só por material'}
                      </button>
                    )}
                  </div>
                ) : (
                  <button onClick={() => onOpen(id)} className="mc-btn mc-btn-green mt-2 px-4 py-1.5 text-sm font-bold" data-testid={`open-${c.type}`}>
                    {c.retryUsed ? 'Refazer' : 'Abrir'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContractBoard;
