// ========================================
// A Base: resultado de um contrato (material, XP/gold, correção, próximos passos)
// Recebe o resultado da transação (completeContract) já aplicado; só apresenta.
// ========================================

import React from 'react';
import { motion } from 'framer-motion';
import type { BuildingId, Contract, ContractOutcome, Material, MaterialCount } from '../../../../types/english';
import { BUILDING_BY_ID, CONTRACT_ICONS, CONTRACT_LABELS, MATERIAL_ICONS, MATERIAL_LABELS } from '../../../../config/englishBase';
import { MIN_XP } from '../../../../config/englishRewards';

/** Devolvido por completeContract (contrato dos serviços) */
export interface CompleteReward {
  xp: number;
  gold: number;
  rewarded: boolean;
  materialEarned: number;
  material: Material;
  unlockedBuildings: BuildingId[];
}

interface Props {
  contract: Contract;
  outcome: ContractOutcome;
  reward: CompleteReward;
  /** Construção que já dá para erguer com os materiais atuais (ou null) */
  buildable: BuildingId | null;
  onNext: () => void;
  onBuild: (id: BuildingId) => void;
}

const NOTE_TAG_PT: Record<string, string> = {
  plural: 'Plural',
  article: 'Artigo',
  verb: 'Verbo',
  spelling: 'Grafia',
  word_order: 'Ordem das palavras',
  preposition: 'Preposição',
  other: 'Outro',
};

/** Ícones do material ganho, aparecendo um a um (o material "voa" para o inventário) */
const MaterialBurst: React.FC<{ material: Material; count: number }> = ({ material, count }) => (
  <div className="flex justify-center gap-2 mt-3 min-h-[3.5rem]">
    {Array.from({ length: Math.max(0, count) }).map((_, i) => (
      <motion.img
        key={i}
        src={MATERIAL_ICONS[material]}
        alt=""
        draggable={false}
        className="w-14 h-14 mc-pixel"
        initial={{ opacity: 0, y: 24, scale: 0.6 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.15 + i * 0.18, type: 'spring', stiffness: 320, damping: 18 }}
      />
    ))}
  </div>
);

const ContractResult: React.FC<Props> = ({ contract, outcome, reward, buildable, onNext, onBuild }) => {
  const count = Math.max(0, Math.min(3, reward.materialEarned)) as MaterialCount;
  const label = MATERIAL_LABELS[reward.material];
  const bonus = count > outcome.materialEarned;

  return (
    <div className="text-center py-2" data-testid="contract-result">
      <img src={CONTRACT_ICONS[contract.type]} alt="" className="w-20 h-20 mx-auto mc-pixel" draggable={false} />
      <p className="mc-title text-xs sm:text-sm mt-2">{count > 0 ? 'Contrato concluído' : 'Contrato entregue'}</p>
      <p className="text-sm text-white/85 mt-1">{CONTRACT_LABELS[contract.type]}: {contract.title}</p>

      <p className="mc-font text-2xl sm:text-3xl text-white mt-4">
        {outcome.score % 1 === 0 ? outcome.score : outcome.score.toFixed(1)}
        <span className="mc-muted text-base"> / {outcome.max}</span>
      </p>

      <MaterialBurst material={reward.material} count={count} />
      {count > 0 ? (
        <p className="mc-font text-[10px] sm:text-xs mc-good mt-1">
          +{count} {label}
          {bonus && <span className="mc-warn"> (Fornalha: +1)</span>}
        </p>
      ) : (
        <p className="text-sm mc-muted mt-1">Sem material desta vez. Ainda vale {MIN_XP} XP pela tentativa.</p>
      )}

      {reward.rewarded && reward.gold > 0 ? (
        <p className="mc-font text-xs sm:text-sm mc-good mt-3">+{reward.xp} XP <span className="mc-warn">+{reward.gold} GOLD</span></p>
      ) : (
        <p className="text-sm mc-muted mt-3">
          +{reward.xp} XP
          {count > 0 && !reward.rewarded && '. As vagas premiadas de hoje já foram usadas: este valeu só o material.'}
        </p>
      )}

      {reward.unlockedBuildings.length > 0 && (
        <p className="mc-font text-[10px] mc-diamond mt-3 uppercase">
          Novos lotes: {reward.unlockedBuildings.map((id) => BUILDING_BY_ID[id].label).join(', ')}
        </p>
      )}

      {/* Correção sempre visível */}
      <div className="mt-5 text-left">
        {contract.type === 'merchant' && (
          <div className="mc-paper rounded p-3 text-gray-900">
            <p className="mc-font text-[9px] uppercase text-gray-600 mb-2">O que o comerciante pediu</p>
            {contract.content.sentences.map((s, i) => (
              <p key={i} className="text-sm leading-snug mb-1.5">
                <span className="font-bold">{i + 1}. {s}</span>
                <span className="block text-xs text-gray-600">{contract.content.translation[i]}</span>
              </p>
            ))}
          </div>
        )}

        {contract.type === 'letter' && (
          <p className="text-sm text-white/85 text-center">
            {outcome.score} de {outcome.max} perguntas certas em "{contract.content.title}".
          </p>
        )}

        {contract.type === 'forge' && (
          <p className="text-sm text-white/85 text-center">
            {outcome.score} de {outcome.max} peças consertadas na Ferraria.
          </p>
        )}

        {contract.type === 'note' && outcome.correction && (
          <div className="mc-paper rounded p-3 text-gray-900">
            <p className="mc-font text-[9px] uppercase text-gray-600 mb-1">Seu recado</p>
            <p className="text-sm">{outcome.answer}</p>
            {outcome.correction.corrected && outcome.correction.corrected !== outcome.answer && (
              <>
                <p className="mc-font text-[9px] uppercase text-gray-600 mt-3 mb-1">Correção do ferreiro</p>
                <p className="text-sm font-bold">{outcome.correction.corrected}</p>
              </>
            )}
            {outcome.correction.note && <p className="text-xs text-gray-700 mt-2">{outcome.correction.note}</p>}
            {outcome.correction.errors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {outcome.correction.errors.map((e, i) => (
                  <span key={i} className="text-[10px] font-bold px-2 py-0.5 border-2 border-gray-800 bg-white/70">{NOTE_TAG_PT[e.tag] ?? e.tag}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-3 max-w-sm mx-auto">
        {buildable && (
          <button onClick={() => onBuild(buildable)} className="mc-btn mc-btn-gold py-3 font-bold text-base" data-testid="result-build">
            <img src={BUILD_ICON(buildable)} alt="" className="w-7 h-7 mc-pixel" draggable={false} />
            Construir {BUILDING_BY_ID[buildable].label} agora
          </button>
        )}
        <button onClick={onNext} className="mc-btn mc-btn-green py-3 font-bold text-base" data-testid="result-next">Próximo contrato</button>
      </div>
    </div>
  );
};

const BUILD_ICON = (id: BuildingId): string => BUILDING_BY_ID[id].icon;

export default ContractResult;
