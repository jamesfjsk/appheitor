// ========================================
// A Base: container da tela da criança (painel de pedra, mesmo estilo do hub).
// Estados: carregando plano (com progresso) -> mapa -> quadro -> contrato (a casca
// mostra o resultado). Ao abrir garante os planos de hoje e de amanhã e assina
// a base e o plano do dia. O contrato aberto é uma cópia: o snapshot só volta a
// valer quando a criança termina ou sai.
// ========================================

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../contexts/AuthContext';
import { useData } from '../../../../contexts/DataContext';
import { useSound } from '../../../../contexts/SoundContext';
import { getTodayBrazil } from '../../../../utils/timezone';
import type { BaseDoc, BuildingId, Contract, DailyPlan } from '../../../../types/english';
import { BUILDING_BY_ID, CONTRACT_ICONS, CONTRACT_TYPES } from '../../../../config/englishBase';
import {
  baseLevelOf,
  buildUpgrade,
  ensureDailyPlan,
  redoContract,
  setThemeRequest,
  subscribeBase,
  subscribePlan,
} from '../../../../services/englishBaseService';
import { createMineSfx } from '../mine/sfx';
import BaseMap from './BaseMap';
import ContractBoard from './ContractBoard';
import ContractShell from './ContractShell';

interface Props {
  onClose: () => void;
}

type View = 'loading' | 'map' | 'board' | 'contract';

const BANNER = '/assets/english/ui/banner.webp';
const PICKAXE = '/assets/english/ui/pickaxe.webp';
const TOTAL_CONTRACTS = 5;

/** Soma dias a uma data YYYY-MM-DD sem depender de fuso */
const addDays = (date: string, n: number): string => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const copyContract = (c: Contract): Contract => JSON.parse(JSON.stringify(c)) as Contract;

/** Quadro abre com status ready ou quando os contratos da ordem já chegaram */
const planReady = (p: DailyPlan | null): boolean =>
  p !== null && (p.status === 'ready' || (p.order.length > 0 && p.order.every((id) => Boolean(p.contracts[id]))));

const EnglishBase: React.FC<Props> = ({ onClose }) => {
  const { childUid } = useAuth();
  const { adjustUserXP } = useData();
  const { isSoundEnabled, playClick, playLevelUp } = useSound();
  // Data fixada na abertura: virar o dia no meio de um contrato não troca o plano
  const [today] = useState(() => getTodayBrazil());
  const [base, setBase] = useState<BaseDoc | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [progress, setProgress] = useState({ ready: 0, total: TOTAL_CONTRACTS });
  const [genError, setGenError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState<View>('loading');
  const [active, setActive] = useState<Contract | null>(null);
  const [building, setBuilding] = useState<BuildingId | null>(null);

  // Sons do mine/sfx.ts seguem a chave global; o AudioContext nasce no primeiro gesto
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

  // Assinaturas: base (cria o doc inicial) e plano de hoje
  useEffect(() => {
    if (!childUid) return;
    const onErr = (e: Error) => {
      console.error('EnglishBase: erro na assinatura', e);
      setLoadError('Não deu para carregar a base. Tente de novo.');
    };
    const unsubBase = subscribeBase(childUid, setBase, onErr);
    const unsubPlan = subscribePlan(childUid, today, setPlan, onErr);
    return () => {
      unsubBase();
      unsubPlan();
    };
  }, [childUid, today]);

  // Garante hoje (com progresso) e depois amanhã em segundo plano
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
    if (view === 'loading' && base && ready) setView('map');
  }, [view, base, ready]);

  const build = async (id: BuildingId) => {
    if (!childUid || building) return;
    setBuilding(id);
    try {
      const { newLevel, xp } = await buildUpgrade(childUid, id);
      sfx.pickaxeUp(newLevel);
      playLevelUp();
      toast.success(`${BUILDING_BY_ID[id].label} chegou ao nível ${newLevel}`);
      if (xp > 0) await adjustUserXP(xp);
    } catch (e) {
      console.error('EnglishBase: erro ao construir', e);
      toast.error('Não deu para construir agora.');
    } finally {
      setBuilding(null);
    }
  };

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

  const saveTheme = async (text: string | null) => {
    if (!childUid) return;
    try {
      await setThemeRequest(childUid, text);
      toast.success(text ? 'Tema de amanhã guardado.' : 'Tema de amanhã apagado.');
    } catch (e) {
      console.error('EnglishBase: erro ao guardar o tema', e);
      toast.error('Não deu para guardar o tema.');
    }
  };

  const backToBoard = () => {
    setActive(null);
    setView('board');
  };

  const buildNow = (id: BuildingId) => {
    setActive(null);
    setView('map');
    void build(id);
  };

  const arrived = plan ? Object.keys(plan.contracts).length : 0;
  const shown = Math.min(progress.total || TOTAL_CONTRACTS, Math.max(progress.ready, arrived));
  const total = progress.total || TOTAL_CONTRACTS;
  const subtitle =
    view === 'loading'
      ? 'Preparando o dia...'
      : view === 'map'
        ? base
          ? `Base nível ${baseLevelOf(base)}`
          : ''
        : view === 'board'
          ? 'Contratos de hoje'
          : active?.title ?? '';
  const errorMsg = loadError ?? genError;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4" onPointerDownCapture={unlockAudio}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        data-testid="english-base"
        className="mc-modal rounded-lg w-full max-w-3xl max-h-[96vh] overflow-y-auto text-white"
        style={{ fontFamily: 'var(--font-hero)' }}
      >
        {/* Cabeçalho: entrada da mina */}
        <div className="relative h-24 sm:h-28 overflow-hidden border-b-4 border-[#17130f]">
          <img src={BANNER} alt="" className="absolute inset-0 w-full h-full object-cover mc-pixel" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2f2a27] via-[#2f2a27]/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-2 flex items-end gap-3">
            <img src={PICKAXE} alt="" className="w-10 h-10 sm:w-14 sm:h-14 mc-pixel drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]" draggable={false} />
            <div className="min-w-0 flex-1">
              <h2 className="mc-title text-sm sm:text-lg">A Base</h2>
              <p className="text-xs sm:text-sm text-white/85 mt-1 truncate">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="mc-btn mc-btn-dark absolute top-2 right-2 w-9 h-9 p-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-5">
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
                    {base && <button onClick={() => setView('map')} className="mc-btn mc-btn-stone px-5 py-2.5 font-bold">Ver a base</button>}
                  </div>
                </>
              ) : (
                <>
                  <p className="mc-font text-[10px] sm:text-xs text-white leading-relaxed">
                    {base ? 'Os vizinhos estão escrevendo os contratos...' : 'Abrindo a base...'} {base && `${shown}/${total}`}
                  </p>
                  <div className="mc-bar max-w-xs mx-auto mt-4"><div className="mc-bar-fill" style={{ width: `${(shown / total) * 100}%` }} /></div>
                </>
              )}
            </div>
          )}

          {childUid && view === 'map' && base && (
            <BaseMap base={base} plan={plan} building={building} onBuild={(id) => void build(id)} onOpenBoard={() => { playClick(); setView('board'); }} onSaveTheme={saveTheme} />
          )}

          {childUid && view === 'board' && base && plan && (
            <ContractBoard plan={plan} base={base} onOpen={openContract} onRedo={redo} onBack={() => setView('map')} />
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
              onBuildNow={buildNow}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EnglishBase;
