// ========================================
// A Base: casca de um contrato. Dona do cronômetro, da instrução em PT por tipo,
// do "Aceitar contrato", da transação completeContract, do XP/gold e do resultado.
// O contrato recebido já é uma cópia: o snapshot do plano é ignorado até terminar.
// ========================================

import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../../../contexts/DataContext';
import { useSound } from '../../../../contexts/SoundContext';
import { FirestoreService } from '../../../../services/firestoreService';
import { canBuild, completeContract } from '../../../../services/englishBaseService';
import { stopAudio } from '../../../../services/englishTts';
import type { BaseDoc, BuildingId, Contract, ContractOutcome, ContractType } from '../../../../types/english';
import { BUILDINGS, CONTRACT_ICONS, CONTRACT_LABELS, MATERIAL_ICONS, MATERIAL_LABELS } from '../../../../config/englishBase';
import type { MineSfx } from '../mine/sfx';
import ContractResult, { type CompleteReward } from './ContractResult';
import MerchantContract from './MerchantContract';
import LetterContract from './LetterContract';
import NoteContract from './NoteContract';
import ForgeContract from './ForgeContract';

/** Props comuns das telas de contrato (seção 5), com o contrato já estreitado pelo tipo */
export type ContractScreenProps<T extends ContractType> = {
  contract: Extract<Contract, { type: T }>;
  level: number;
  base: BaseDoc;
  sfx: MineSfx;
  onFinish: (outcome: ContractOutcome) => void;
  onQuit: () => void;
};

interface Props {
  uid: string;
  date: string;
  contract: Contract;
  level: number;
  base: BaseDoc;
  sfx: MineSfx;
  /** Resultado visto: volta ao quadro */
  onDone: () => void;
  /** Desistiu antes de entregar */
  onQuit: () => void;
  /** "Construir / Melhorar X na Vila" no resultado */
  onBuildNow: (id: BuildingId) => void;
}

type Phase = 'intro' | 'play' | 'saving' | 'result' | 'failed';

/** Instrução fixa em PT por tipo (aparece nas 3 primeiras vezes; depois atrás do "?") */
const INSTRUCTIONS: Record<ContractType, string> = {
  merchant:
    'O comerciante fala em inglês o que quer em cada lugar da sala. Clique em Ouvir para cada pedido (pode repetir). Depois clique num item da bandeja, clique no lugar certo e escolha a posição e a quantidade. Quando a sala estiver pronta, clique em Entregar.',
  letter:
    'Leia o texto em inglês. Passe o mouse (ou segure o dedo) nas palavras sublinhadas para ver o significado. Responda às 3 perguntas. Numa delas você vai clicar na frase do texto que prova a resposta.',
  note:
    'Leia o pedido em português e escreva o recado em inglês com as 3 informações. As palavras do banco ajudam. O ferreiro lê o recado e dá a nota em ferro: 3 é recado perfeito.',
  forge:
    'São 6 peças para consertar: monte a frase na ordem certa, escolha a forma certa ou digite a palavra que falta. Se errar, a regra aparece e você tenta mais uma vez.',
};

const INSTRUCTION_TIMES = 3;
const instrKey = (type: ContractType) => `englishBase.instr.${type}`;

const readInstrCount = (type: ContractType): number => {
  try {
    const n = Number(localStorage.getItem(instrKey(type)) ?? '0');
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

const bumpInstrCount = (type: ContractType): void => {
  try {
    localStorage.setItem(instrKey(type), String(readInstrCount(type) + 1));
  } catch {
    // sem localStorage (modo privado): a instrução só aparece mais vezes
  }
};

/** O quadro libera o primeiro contrato antes de o plano fechar: se a entrega chega cedo, espera o plano ficar 'ready' */
const GENERATING_RETRIES = 12;
const GENERATING_WAIT_MS = 5_000;
const isStillGenerating = (e: unknown): boolean => e instanceof Error && /sendo gerado/.test(e.message);

const formatClock = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

/** Primeira construção (na ordem da grade) que já dá para erguer */
const firstBuildable = (base: BaseDoc): BuildingId | null => {
  for (const b of BUILDINGS) {
    if (canBuild(base, b.id).ok) return b.id;
  }
  return null;
};

const ContractShell: React.FC<Props> = ({ uid, date, contract, level, base, sfx, onDone, onQuit, onBuildNow }) => {
  const { adjustUserXP, adjustUserGold } = useData();
  const { playClick, playTaskComplete } = useSound();
  const [phase, setPhase] = useState<Phase>('intro');
  const [showInstr, setShowInstr] = useState(() => readInstrCount(contract.type) < INSTRUCTION_TIMES);
  const [elapsed, setElapsed] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [result, setResult] = useState<{ outcome: ContractOutcome; reward: CompleteReward } | null>(null);
  const [failMsg, setFailMsg] = useState('');
  const startedAtRef = useRef(0);
  const finishingRef = useRef(false);
  const spendLot = firstBuildable(base);

  // Cronômetro só durante o jogo
  useEffect(() => {
    if (phase !== 'play') return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Áudio pendente não pode vazar para o quadro
  useEffect(() => () => stopAudio(), []);

  const accept = () => {
    playClick();
    bumpInstrCount(contract.type);
    startedAtRef.current = Date.now();
    setElapsed(0);
    setShowInstr(false);
    setPhase('play');
  };

  const finish = async (outcome: ContractOutcome) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    stopAudio();
    const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    setPhase('saving');
    let reward: CompleteReward;
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          reward = await completeContract(uid, date, contract.id, contract.version, outcome, durationSec);
          break;
        } catch (e) {
          if (!isStillGenerating(e) || attempt >= GENERATING_RETRIES) throw e;
          await new Promise((r) => window.setTimeout(r, GENERATING_WAIT_MS));
        }
      }
    } catch (e) {
      console.error('ContractShell: erro ao concluir contrato', e);
      setFailMsg('Não deu para entregar este contrato. Ele pode ter sido trocado no painel ou já estar entregue.');
      setPhase('failed');
      return;
    }
    if (reward.materialEarned > 0) sfx.checkpoint();
    if (reward.unlockedBuildings.length > 0) sfx.unlock();
    playTaskComplete();
    setResult({ outcome, reward });
    setPhase('result');

    // XP/gold do perfil: falha aqui não desfaz o contrato (já gravado)
    try {
      if (reward.xp > 0) await adjustUserXP(reward.xp);
      if (reward.gold > 0) {
        await adjustUserGold(reward.gold);
        await FirestoreService.createGoldTransaction(uid, reward.gold, 'earned', 'english_game', `Mina: ${CONTRACT_LABELS[contract.type]} (${contract.title})`, {
          relatedId: contract.id,
          relatedTitle: contract.title,
          metadata: { date, contractId: contract.id, type: contract.type, material: reward.materialEarned, score: outcome.score, max: outcome.max, durationSec },
        });
      }
    } catch (e) {
      console.error('ContractShell: erro ao aplicar XP/gold', e);
      toast.error('O contrato foi salvo, mas o XP/gold não entrou. Avise o papai.');
    }
  };

  const screenProps = { level, base, sfx, onFinish: finish, onQuit };
  const canToggleInstr = phase === 'play';

  return (
    <div data-testid="contract-shell">
      {/* Barra do contrato: tipo, título, cronômetro, ajuda e sair */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <img
          src={CONTRACT_ICONS[contract.type]}
          alt=""
          className={`mc-pixel shrink-0 ${contract.type === 'merchant' || contract.type === 'forge' ? 'w-12 h-12' : 'w-9 h-9'}`}
          draggable={false}
        />
        <div className="min-w-0 flex-1">
          <p className="mc-font text-[9px] mc-muted uppercase">{CONTRACT_LABELS[contract.type]}</p>
          <p className="text-sm font-bold text-white truncate">{contract.title}</p>
        </div>
        {phase === 'play' && (
          <span className="mc-font text-[10px] text-white tabular-nums" aria-label="Tempo">{formatClock(elapsed)}</span>
        )}
        {canToggleInstr && (
          <button onClick={() => setShowInstr((v) => !v)} aria-label="Instruções" className="mc-btn mc-btn-dark w-9 h-9 p-0">
            <HelpCircle className="w-5 h-5" />
          </button>
        )}
        {(phase === 'intro' || phase === 'play') && !confirmQuit && (
          <button onClick={() => (phase === 'intro' ? onQuit() : setConfirmQuit(true))} className="mc-btn mc-btn-stone px-3 py-1.5 text-sm font-bold">Sair</button>
        )}
      </div>

      {confirmQuit && (
        <div className="mc-card p-3 mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-white flex-1">Sair sem entregar? O contrato continua aberto no quadro.</span>
          <button onClick={() => { stopAudio(); onQuit(); }} className="mc-btn mc-btn-red px-3 py-1.5 text-sm font-bold">Sair</button>
          <button onClick={() => setConfirmQuit(false)} className="mc-btn mc-btn-green px-3 py-1.5 text-sm font-bold">Continuar</button>
        </div>
      )}

      {showInstr && (phase === 'intro' || phase === 'play') && (
        <div className="mc-paper rounded p-3 mb-3 text-gray-900 text-sm leading-snug" data-testid="contract-instructions">
          {INSTRUCTIONS[contract.type]}
        </div>
      )}

      {phase === 'intro' && (
        <div className="text-center py-4">
          <img src={CONTRACT_ICONS[contract.type]} alt="" className="w-24 h-24 mx-auto mc-pixel" draggable={false} />
          <p className="mc-title text-xs sm:text-sm mt-3">{contract.title}</p>
          <p className="text-sm text-white/85 mt-2">Tema: {contract.theme}</p>
          <p className="flex items-center justify-center gap-2 mt-3 text-sm text-white/85">
            <img src={MATERIAL_ICONS[contract.material]} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
            Paga até 3 de {MATERIAL_LABELS[contract.material]}
          </p>
          <button onClick={accept} className="mc-btn mc-btn-green mt-6 px-8 py-3 text-base font-bold uppercase" data-testid="accept-contract">
            Aceitar contrato
          </button>
        </div>
      )}

      {phase === 'play' && contract.type === 'merchant' && <MerchantContract contract={contract} {...screenProps} />}
      {phase === 'play' && contract.type === 'letter' && <LetterContract contract={contract} {...screenProps} />}
      {phase === 'play' && contract.type === 'note' && <NoteContract contract={contract} {...screenProps} />}
      {phase === 'play' && contract.type === 'forge' && <ForgeContract contract={contract} {...screenProps} />}

      {phase === 'saving' && <p className="mc-font text-xs text-center mc-muted py-10">Entregando o contrato...</p>}

      {phase === 'failed' && (
        <div className="text-center py-6">
          <p className="text-sm mc-bad">{failMsg}</p>
          <button onClick={onDone} className="mc-btn mc-btn-stone mt-5 px-6 py-3 font-bold">Voltar ao quadro</button>
        </div>
      )}

      {phase === 'result' && result && (
        <ContractResult
          contract={contract}
          outcome={result.outcome}
          reward={result.reward}
          buildable={spendLot}
          builtLevel={spendLot ? (base.buildings[spendLot] ?? 0) : 0}
          onNext={onDone}
          onBuild={onBuildNow}
        />
      )}
    </div>
  );
};

export default ContractShell;
