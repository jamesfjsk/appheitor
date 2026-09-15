import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useVillage } from '../../../contexts/VillageContext';
import { useData } from '../../../contexts/DataContext';
import { useSound } from '../../../contexts/SoundContext';
import { houseSprite, houseTitle } from '../../../config/village';
import type { Period } from '../../../types/village';
import DailyChecklist from '../DailyChecklist';
import CharacterPreview from './CharacterPreview';

const SUN = '/assets/english/ui/sun.webp';
const MOON = '/assets/english/ui/moon.webp';
const CLOCK = '/assets/english/ui/clock.webp';
const LANTERN = '/assets/village/items/lantern.png';
const CHEST = '/assets/village/buildings/bau-1.png';

type Tab = 'missoes' | 'plano' | 'fechar';

const Casa: React.FC<{
  onClose: () => void;
  selectedPeriod: Period;
  onPeriodChange: (p: Period) => void;
  guidedMode: boolean;
  onToggleGuidedMode: () => void;
  hour: number;
  done: number;
  due: number;
  chestReady?: boolean;
  onOpenChest?: () => void;
}> = ({
  onClose, selectedPeriod, onPeriodChange, guidedMode, onToggleGuidedMode,
  hour, done, due, chestReady, onOpenChest,
}) => {
  const { village, economy } = useVillage();
  const { tasks } = useData();
  const { playClick } = useSound();
  const [tab, setTab] = useState<Tab>('missoes');
  const night = hour >= 19 || hour < 6;
  const allDone = due > 0 && done >= due;
  const name = village.characterName || 'Heitor';
  const title = houseTitle(village.season);
  const src = houseSprite(village.season);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="mc-modal mn-casa rounded-lg w-full max-w-4xl max-h-[96vh] overflow-hidden text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mn-casa-hero">
          <img src={src} alt="" className="mn-casa-sprite mc-pixel" draggable={false} />
          <CharacterPreview character={village.character} gear={village.gear} size={88} />
          <div className="min-w-0 flex-1">
            <h2 className="mc-h">
              <img src={src} alt="" className="mc-pixel" draggable={false} />
              Casa do Minerador
            </h2>
            <p className="text-sm mt-1">
              {title} de {name}. {allDone ? 'A chaminé está acesa: o dia foi feito.' : 'Aqui moram as missões do dia.'}
            </p>
            <p className="mc-num text-white mt-2" style={{ fontSize: 12 }}>{done}/{due} hoje</p>
          </div>
          <span className={`mn-casa-window ${night ? '' : 'is-day'}`} aria-hidden />
          <button type="button" className="mc-btn mc-btn-dark w-11 h-11 p-0" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
        <div className={`mn-casa-hearth ${allDone ? 'is-on' : ''}`} aria-hidden />
        <div className="mc-hotbar px-4 pt-3">
          {([
            ['missoes', 'Missões', src],
            ['plano', 'Plano do turno', SUN],
            ['fechar', 'Fechar o dia', MOON],
          ] as const).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              className={`mc-slot rounded px-3 min-h-[44px] ${tab === id ? 'mc-slot-selected' : ''}`}
              onClick={() => { playClick(); setTab(id); }}
            >
              <img src={icon} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
              {label}
            </button>
          ))}
        </div>
        <div className="mn-casa-room">
          {tab === 'missoes' && (
            <>
              {chestReady && onOpenChest && (
                <button
                  type="button"
                  className="mc-btn mc-btn-gold min-h-[44px] px-4 mb-3"
                  onClick={() => { playClick(); onOpenChest(); }}
                >
                  <img src={CHEST} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
                  Baú do Dia
                </button>
              )}
              <DailyChecklist
                tasks={tasks}
                selectedPeriod={selectedPeriod}
                onPeriodChange={onPeriodChange}
                guidedMode={guidedMode}
                onToggleGuidedMode={onToggleGuidedMode}
              />
            </>
          )}
          {tab === 'plano' && (
            <div className="mc-inv rounded-lg p-5 space-y-3">
              <h3 className="mc-h">
                <img src={CLOCK} alt="" className="mc-pixel" draggable={false} />
                Mesa da manhã
              </h3>
              <p className="text-sm">
                De manhã, até o meio-dia, você monta o plano do turno: a ordem das missões e uma missão-foco.
              </p>
              <p className="text-sm mc-muted">
                A mesa ainda está sendo arrumada. Enquanto isso, as missões já estão na aba ao lado.
              </p>
            </div>
          )}
          {tab === 'fechar' && (
            <div className="mc-inv rounded-lg p-5 space-y-3">
              <h3 className="mc-h">
                <img src={LANTERN} alt="" className="mc-pixel" draggable={false} />
                Lanterna da noite
              </h3>
              <p className="text-sm">
                Quando o dia acaba, o Sábio anota o turno e você deixa um recado para o papai.
              </p>
              <p className="text-sm mc-muted">
                Fechar o dia abre daqui em breve. Por agora, conclua as missões e, às {economy.chestOpenHour}h, abra o Baú do Dia.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Casa;
