import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MATERIAL_ICONS, MATERIAL_LABELS } from '../../../config/englishBase';
import { buildingSprite } from '../../../config/village';
import { tradePreview } from '../../../services/village/shop';
import {
  burnedToday,
  FURNACE_COOK_MS,
  FURNACE_COOK_REDUCED_MS,
} from '../../../services/village/furnace';
import { burnWood, tradeMaterials } from '../../../services/villageService';
import { useAuth } from '../../../contexts/AuthContext';
import { useVillage } from '../../../contexts/VillageContext';
import { useClock } from '../../../contexts/ClockContext';
import { useSound } from '../../../contexts/SoundContext';
import type { Material } from '../../../types/english';
import { createFurnaceSfx, type FurnaceSfx } from './furnaceSfx';

const SMELT: Material[] = ['madeira', 'pedra', 'ferro'];

type CookKind = 'smelt' | 'burn';

function MatSlot({ id, qty, ghost }: { id: Material; qty?: number; ghost?: boolean }) {
  return (
    <span className={`mc-slot mn-forge-slot ${ghost ? 'is-ghost' : ''}`}>
      <img src={MATERIAL_ICONS[id]} alt="" className="mc-pixel" draggable={false} />
      {typeof qty === 'number' && <span className="mc-num mn-forge-qty">{qty}</span>}
    </span>
  );
}

const Fornalha: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => {
  const { village, materials, buildings } = useVillage();
  const { childUid } = useAuth();
  const { today } = useClock();
  const { playClick, playError, isSoundEnabled } = useSound();
  const furnace = buildings.fornalha || 0;
  const [from, setFrom] = useState<Material>('madeira');
  const [to, setTo] = useState<Material>('pedra');
  const [cooking, setCooking] = useState<CookKind | null>(null);
  const [puff, setPuff] = useState(false);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctxRef = useRef<AudioContext | null>(null);
  const sfxRef = useRef<FurnaceSfx | null>(null);
  const live = useRef(true);
  const preview = tradePreview(from, to);
  const alreadyBurned = burnedToday(village, today);
  const wood = materials.madeira || 0;
  const canSmelt = furnace >= 2 && preview.ok && (materials[from] || 0) >= 3 && !cooking;
  const canBurn = furnace >= 3 && !alreadyBurned && wood >= 5 && !cooking;

  const sfx = (): FurnaceSfx => {
    if (!sfxRef.current) {
      sfxRef.current = createFurnaceSfx(() => {
        if (!isSoundEnabled) return null;
        if (!ctxRef.current) {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          ctxRef.current = new AC();
        }
        return ctxRef.current;
      }, () => isSoundEnabled);
    }
    return sfxRef.current;
  };

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      sfxRef.current?.crackleStop();
    };
  }, []);

  const pickFrom = (m: Material) => {
    playClick();
    setFrom(m);
    if (to === m) setTo(SMELT.find((x) => x !== m) || 'pedra');
  };

  const pickTo = (m: Material) => {
    playClick();
    setTo(m);
    if (from === m) setFrom(SMELT.find((x) => x !== m) || 'madeira');
  };

  const runCook = async (kind: CookKind) => {
    if (!childUid || cooking) return;
    playClick();
    const fx = sfx();
    fx.whoosh();
    fx.crackleStart();
    setCooking(kind);
    const waitMs = reduced ? FURNACE_COOK_REDUCED_MS : FURNACE_COOK_MS;
    const t0 = performance.now();
    try {
      if (kind === 'smelt') await tradeMaterials(childUid, from, to);
      else await burnWood(childUid);
    } catch (e) {
      fx.crackleStop();
      fx.thud();
      playError();
      if (live.current) setCooking(null);
      toast.error(e instanceof Error ? e.message : 'Não deu para usar o fogo');
      return;
    }
    const left = Math.max(0, waitMs - (performance.now() - t0));
    await new Promise((r) => window.setTimeout(r, left));
    fx.crackleStop();
    fx.ding();
    if (!live.current) return;
    setPuff(true);
    setCooking(null);
    window.setTimeout(() => { if (live.current) setPuff(false); }, 800);
  };

  const mouthOn = furnace >= 1 || Boolean(cooking);

  return (
    <div className="mn-forge" data-testid="forge-fire">
      <div className={`mn-forge-mouth ${cooking ? 'is-cook' : ''} ${mouthOn ? 'is-lit' : ''}`}>
        <img src={buildingSprite('fornalha', Math.max(1, furnace))} alt="" className="mn-forge-sprite mc-pixel" draggable={false} />
        {mouthOn && <span className="mn-forge-glow" aria-hidden />}
        {puff && !reduced && [0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="mn-forge-puff" style={{ left: `${28 + i * 10}%`, animationDelay: `${i * 70}ms` }} />
        ))}
      </div>
      <p className="text-sm">
        {furnace < 2
          ? 'O primeiro contrato do dia rende +1. Fundir abre no nível 2.'
          : furnace < 3
            ? '3 de um material viram 1 de outro. Redstone não entra.'
            : alreadyBurned
              ? 'A queima de hoje já foi. Amanhã tem mais.'
              : '3 viram 1. Uma vez por dia, 5 madeiras viram 1 redstone.'}
      </p>

      <div className={`mn-forge-block ${furnace < 2 ? 'is-lock' : ''}`}>
        <p className="mn-forge-k">Fundir</p>
        <div className="mn-forge-picks">
          {SMELT.map((m) => (
            <button
              key={`from-${m}`}
              type="button"
              disabled={furnace < 2 || Boolean(cooking)}
              className={`mc-slot mn-forge-pick ${from === m ? 'mc-slot-selected' : ''}`}
              onClick={() => pickFrom(m)}
            >
              <img src={MATERIAL_ICONS[m]} alt="" className="w-6 h-6 mc-pixel" />
              <span className="mn-forge-pick-n">{materials[m] || 0}</span>
              <span className="text-[10px]">{MATERIAL_LABELS[m]}</span>
            </button>
          ))}
        </div>
        <div className="mn-forge-line">
          <MatSlot id={from} ghost={cooking === 'smelt'} />
          <MatSlot id={from} ghost={cooking === 'smelt'} />
          <MatSlot id={from} ghost={cooking === 'smelt'} />
          <span className="mn-forge-arrow" aria-hidden>→</span>
          <MatSlot id={to} qty={puff ? 1 : undefined} ghost={!puff} />
        </div>
        <div className="mn-forge-picks">
          {SMELT.map((m) => (
            <button
              key={`to-${m}`}
              type="button"
              disabled={furnace < 2 || Boolean(cooking)}
              className={`mc-slot mn-forge-pick ${to === m ? 'mc-slot-selected' : ''}`}
              onClick={() => pickTo(m)}
            >
              <img src={MATERIAL_ICONS[m]} alt="" className="w-6 h-6 mc-pixel" />
              <span className="text-[10px]">vira {MATERIAL_LABELS[m]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!canSmelt}
          className={`mc-btn w-full min-h-[44px] font-bold ${canSmelt ? 'mc-btn-green' : 'mc-btn-dark'}`}
          onClick={() => void runCook('smelt')}
        >
          {furnace < 2 ? 'Abre no nível 2' : cooking === 'smelt' ? 'O fogo trabalha...' : preview.ok ? 'Fundir' : 'Escolha dois diferentes'}
        </button>
      </div>

      <div className={`mn-forge-block ${furnace < 3 ? 'is-lock' : ''} ${alreadyBurned ? 'is-ash' : ''}`}>
        <p className="mn-forge-k">Queima</p>
        <div className="mn-forge-line">
          {[0, 1, 2, 3, 4].map((i) => (
            <MatSlot key={i} id="madeira" ghost={cooking === 'burn' || alreadyBurned || wood <= i} />
          ))}
          <span className="mn-forge-arrow" aria-hidden>→</span>
          <MatSlot id="redstone" qty={alreadyBurned || puff ? 1 : undefined} ghost={!alreadyBurned && !puff} />
        </div>
        <button
          type="button"
          disabled={!canBurn}
          className={`mc-btn w-full min-h-[44px] font-bold ${canBurn ? 'mc-btn-gold' : 'mc-btn-dark'}`}
          onClick={() => void runCook('burn')}
        >
          {furnace < 3 ? 'Abre no nível 3' : alreadyBurned ? 'Amanhã tem mais' : cooking === 'burn' ? 'O fogo trabalha...' : wood < 5 ? `Faltam ${5 - wood} madeiras` : 'Queimar 5 madeiras'}
        </button>
      </div>

      <button type="button" className="mc-btn mc-btn-stone w-full min-h-[44px]" onClick={() => { playClick(); onUpgrade(); }}>
        Melhorar a Fornalha
      </button>
    </div>
  );
};

export default Fornalha;
