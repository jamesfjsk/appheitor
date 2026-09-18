// ========================================
// Mina: hub de jogos da criança. Contratos de inglês e o circuito de Redstone
// do dia. Obras ficam no lote da Vila, não aqui. Carrega o plano do dia e
// assina englishBase.
// ========================================

import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSound } from '../../../../contexts/SoundContext';
import { addDays, getTodayBrazil } from '../../../../utils/clock';
import type { BaseDoc, BuildingId, Contract, DailyPlan } from '../../../../types/english';
import { CONTRACT_ICONS, CONTRACT_TYPES } from '../../../../config/englishBase';
import {
  ensureDailyPlan,
  redoContract,
  subscribeBase,
  subscribePlan,
} from '../../../../services/englishBaseService';
import { createMineSfx } from '../mine/sfx';
import ContractBoard from './ContractBoard';
import ContractShell from './ContractShell';
import { useData } from '../../../../contexts/DataContext';
import { useVillage } from '../../../../contexts/VillageContext';
import { claimKey, hasClaim } from '../../../../services/village/claims';
import { noteDoneOf } from '../../../../services/village/redstone';
import { pickaxeInfo } from '../../../../config/village';

const CartBench = lazy(() => import('./CartBench'));

interface Props {
  onClose: () => void;
  /** Material ganho na Mina se gasta no lote da Vila (Construir / Melhorar). */
  onOpenLot?: (id: BuildingId) => void;
}

type View = 'loading' | 'board' | 'contract' | 'redstone';

const BANNER = '/assets/english/ui/banner.webp';
const TOTAL_CONTRACTS = 5;

const copyContract = (c: Contract): Contract => JSON.parse(JSON.stringify(c)) as Contract;

/** Quadro só abre com o plano pronto; geração a meio fica na tela de espera. */
const planReady = (p: DailyPlan | null): boolean => p !== null && p.status === 'ready';

const EnglishBase: React.FC<Props> = ({ onClose, onOpenLot }) => {
  const { childUid } = useAuth();
  const { isSoundEnabled, playClick } = useSound();
  const { progress: userProgress } = useData();
  const { village, modules } = useVillage();
  const cartOn = modules.logic === true; // Vagoneta só com o módulo ligado no painel (18/09)
  const [today] = useState(() => getTodayBrazil());
  const [base, setBase] = useState<BaseDoc | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [progress, setProgress] = useState({ ready: 0, total: TOTAL_CONTRACTS });
  const [genError, setGenError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState<View>('loading');
  const [active, setActive] = useState<Contract | null>(null);
  const [backToRedstone, setBackToRedstone] = useState(false);

  const soundRef = useRef(isSoundEnabled);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [sfx] = useState(() => createMineSfx(() => audioCtxRef.current, () => soundRef.current));
  useEffect(() => {
    soundRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  const unlockAudio = () => {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctor();
      if (audioCtxRef.current.state === 'suspended') void audioCtxRef.current.resume();
    } catch {
      audioCtxRef.current = null;
    }
  };

  useEffect(() => {
    if (!childUid) return;
    const onErr = (e: Error) => {
      console.error('EnglishBase: erro na assinatura', e);
      setLoadError('Não deu para abrir a Mina. Tente de novo.');
    };
    const unsubBase = subscribeBase(childUid, setBase, onErr);
    const unsubPlan = subscribePlan(childUid, today, setPlan, onErr);
    return () => {
      unsubBase();
      unsubPlan();
    };
  }, [childUid, today]);

  useEffect(() => {
    if (!childUid) return;
    let cancelled = false;
    setGenError(null);
    void (async () => {
      try {
        await ensureDailyPlan(childUid, today, {
          onProgress: (ready, total) => {
            if (!cancelled) setProgress({ ready, total });
          },
        });
      } catch (e) {
        console.error('EnglishBase: erro ao gerar o plano de hoje', e);
        if (!cancelled) setGenError('Os vizinhos não conseguiram escrever os contratos de hoje.');
        return;
      }
      try {
        await ensureDailyPlan(childUid, addDays(today, 1));
      } catch (e) {
        console.warn('EnglishBase: plano de amanhã não gerado', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childUid, today, retry]);

  const ready = planReady(plan);
  useEffect(() => {
    if (view === 'loading' && base && ready) setView('board');
  }, [view, base, ready]);

  const openContract = (id: string) => {
    const c = plan?.contracts[id];
    if (!c || c.status !== 'open') return;
    playClick();
    setActive(copyContract(c));
    setView('contract');
  };

  const redo = async (id: string) => {
    if (!childUid) return;
    try {
      await redoContract(childUid, today, id);
      toast.success('Contrato aberto de novo: vale só o material.');
    } catch (e) {
      console.error('EnglishBase: erro ao refazer contrato', e);
      toast.error('Não deu para reabrir o contrato.');
    }
  };

  const backToBoard = () => {
    setActive(null);
    if (backToRedstone) {
      setBackToRedstone(false);
      setView('redstone');
      return;
    }
    setView('board');
  };

  const openRecado = () => {
    playClick();
    const id = plan?.order.find((cid) => plan.contracts[cid]?.type === 'note' && plan.contracts[cid]?.status === 'open');
    if (!id || !plan) {
      setView('board');
      return;
    }
    setBackToRedstone(true);
    setActive(copyContract(plan.contracts[id] as Contract));
    setView('contract');
  };

  const spendOnLot = (id: BuildingId) => {
    playClick();
    if (onOpenLot) onOpenLot(id);
    else onClose();
  };

  const arrived = plan ? Object.keys(plan.contracts).length : 0;
  const shown = Math.min(progress.total || TOTAL_CONTRACTS, Math.max(progress.ready, arrived));
  const total = progress.total || TOTAL_CONTRACTS;
  const pick = pickaxeInfo(village.gear.pickaxe);
  const subtitle =
    view === 'loading'
      ? 'Preparando os jogos...'
      : view === 'board'
        ? `Jogos de hoje · ${pick.label}`
        : active?.title ?? '';
  const errorMsg = loadError ?? genError;

  if (childUid && view === 'redstone' && cartOn) {
    return (
      <Suspense fallback={<div className="rs-play" data-testid="redstone-play"><p className="rs-banner rs-play-note">Abrindo a bancada...</p></div>}>
        <CartBench
          uid={childUid}
          date={today}
          minerLevel={userProgress.level || 1}
          redstoneDone={Number(village.stats.redstoneDone) || 0}
          redstonePerfect={Number(village.stats.redstonePerfect) || 0}
          noteDone={noteDoneOf(plan)}
          claimed={hasClaim(village, claimKey('redstone', today))}
          onQuit={() => {
            playClick();
            setBackToRedstone(false);
            setView('board');
          }}
          onGoRecado={openRecado}
        />
      </Suspense>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4" onPointerDownCapture={unlockAudio}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        data-testid="english-base"
        className="mc-modal mn-child-sheet rounded-lg w-full text-white max-w-3xl overflow-hidden"
        style={{ fontFamily: 'var(--font-hero)' }}
      >
        <div className="relative overflow-hidden border-b-4 border-[#17130f] h-24 sm:h-28 shrink-0">
          <img src={BANNER} alt="" className="absolute inset-0 w-full h-full object-cover mc-pixel" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2f2a27] via-[#2f2a27]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-2 flex items-end gap-3">
            <img src={pick.sprite} alt="" className="w-10 h-10 sm:w-14 sm:h-14 mc-pixel drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]" draggable={false} />
            <div className="min-w-0 flex-1">
              <h2 className="mc-title text-sm sm:text-lg">Mina</h2>
              <p className="text-xs sm:text-sm text-white/85 mt-1 truncate">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="mc-btn mc-btn-dark absolute top-2 right-2 w-9 h-9 p-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mn-child-body p-3 sm:p-5">
          {!childUid && <p className="text-sm mc-bad text-center py-10">Entre com a conta da criança para jogar.</p>}

          {childUid && view === 'loading' && (
            <div className="text-center py-8" data-testid="base-loading">
              <div className="flex justify-center gap-3 mb-5">
                {Array.from({ length: total }).map((_, i) => (
                  <img key={i} src={CONTRACT_ICONS[CONTRACT_TYPES[i % CONTRACT_TYPES.length]]} alt="" draggable={false} className={`w-12 h-12 mc-pixel transition-opacity ${i < shown ? 'opacity-100' : 'opacity-30'}`} />
                ))}
              </div>
              {errorMsg ? (
                <>
                  <p className="text-sm mc-bad">{errorMsg}</p>
                  <div className="mt-5 flex justify-center gap-3 flex-wrap">
                    <button onClick={() => { setLoadError(null); setRetry((r) => r + 1); }} className="mc-btn mc-btn-green px-5 py-2.5 font-bold">Tentar de novo</button>
                    {base && plan && <button onClick={() => setView('board')} className="mc-btn mc-btn-stone px-5 py-2.5 font-bold">Ver os jogos</button>}
                  </div>
                </>
              ) : (
                <>
                  <p className="mc-font text-[10px] sm:text-xs text-white leading-relaxed">
                    {base ? 'Os vizinhos estão escrevendo os contratos...' : 'Abrindo a Mina...'} {base && `${shown}/${total}`}
                  </p>
                  <div className="mc-bar max-w-xs mx-auto mt-4"><div className="mc-bar-fill" style={{ width: `${(shown / total) * 100}%` }} /></div>
                </>
              )}
            </div>
          )}

          {childUid && view === 'board' && base && plan && (
            <nav className="flex gap-2 mb-3" aria-label="Jogos da mina">
              <button
                type="button"
                className="mc-btn px-3 py-1.5 text-sm font-bold mc-btn-green"
                onClick={() => { playClick(); setView('board'); }}
                data-testid="tab-contracts"
              >
                Contratos
              </button>
              {cartOn && (
                <button
                  type="button"
                  className="mc-btn px-3 py-1.5 text-sm font-bold mc-btn-stone"
                  onClick={() => { playClick(); setView('redstone'); }}
                  data-testid="tab-redstone"
                >
                  Vagoneta
                </button>
              )}
            </nav>
          )}

          {childUid && view === 'board' && base && plan && (
            <ContractBoard plan={plan} base={base} onOpen={openContract} onRedo={redo} onGoVillage={onClose} />
          )}
          {childUid && view === 'board' && !plan && (
            <p className="mc-font text-xs text-center mc-muted py-10">Os contratos ainda não chegaram.</p>
          )}

          {childUid && view === 'contract' && base && plan && active && (
            <ContractShell
              key={`${active.id}-${active.version}`}
              uid={childUid}
              date={today}
              contract={active}
              level={plan.level}
              base={base}
              sfx={sfx}
              onDone={backToBoard}
              onQuit={backToBoard}
              onBuildNow={spendOnLot}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EnglishBase;
