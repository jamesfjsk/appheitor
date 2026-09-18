import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { COSMETICS, DEFAULT_CHARACTER, PANTS_HEX, SHIRT_HEX } from '../../../config/village';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import type { VillageCharacter } from '../../../types/village';
import CharacterPreview from './CharacterPreview';
import GarmentIcon from './GarmentIcon';

const SHIRTS = ['shirt_1', 'shirt_2', 'shirt_3', 'shirt_4', 'shirt_5', 'shirt_6', 'shirt_7', 'shirt_8'];
const PANTS = ['pants_1', 'pants_2', 'pants_3', 'pants_4', 'pants_5', 'pants_6', 'pants_7', 'pants_8'];
const SAGE = '/assets/village/npc/sabio-iso.png';
const HOUSE = '/assets/village/buildings/casa-1.png';
const LIB = '/assets/village/buildings/mesa-1.png';
const MINE = '/assets/village/buildings/fornalha-1.png';
const CHEST = '/assets/village/buildings/bau-1.png';
const PLACA = '/assets/village/buildings/placa-vila.png';

const SAGE_STEPS = [
  { title: 'A Vila', text: 'A Vila abre tocando. Cada lugar faz uma coisa. Toque para descobrir.', icon: PLACA },
  { title: 'A Casa', text: 'A Casa guarda as missões: manhã, tarde e noite. Cada missão feita paga ouro e material.', icon: HOUSE },
  { title: 'A Biblioteca', text: 'A Biblioteca tem a prova do dia. Sem ela, a Mina, o Mercado e a Ferraria ficam com cadeado.', icon: LIB },
  { title: 'A Mina', text: 'A Mina é onde você trabalha em inglês e ganha material para as obras.', icon: MINE },
  { title: 'O Baú do Dia', text: 'Às 18h, com tudo feito, o Baú do Dia abre. Antes de dormir, feche o dia na Casa.', icon: CHEST },
] as const;

function labelOf(id: string): string {
  return COSMETICS.find((c) => c.id === id)?.label || id;
}

const Onboarding: React.FC = () => {
  const { completeOnboarding } = useVillage();
  const { playClick } = useSound();
  const [step, setStep] = useState(0);
  const [characterName, setCharacterName] = useState('Heitor');
  const [villageName, setVillageName] = useState('Vila do Heitor');
  const [character, setCharacter] = useState<VillageCharacter>({ ...DEFAULT_CHARACTER });
  const [busy, setBusy] = useState(false);
  const sage = step >= 1 ? SAGE_STEPS[step - 1] : null;
  const lastSage = step === SAGE_STEPS.length;

  const pick = (patch: Partial<VillageCharacter>) => {
    playClick();
    setCharacter((prev) => ({ ...prev, ...patch }));
  };

  const next = async () => {
    playClick();
    if (step < SAGE_STEPS.length) {
      setStep((n) => n + 1);
      return;
    }
    setBusy(true);
    try {
      await completeOnboarding({ characterName, villageName, character });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não deu para entrar na Vila');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mn-page min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="mc-modal mn-child-sheet rounded-lg max-w-2xl w-full text-white">
        <div className="mn-child-body p-6">
          {step === 0 ? (
            <>
              <h1 className="mc-title text-sm mb-3">Crie seu minerador</h1>
              <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start mb-4">
                <div className="shrink-0 text-center">
                  <div className="mc-slot w-36 h-36 p-2 flex items-center justify-center mx-auto">
                    <CharacterPreview character={character} size={120} />
                  </div>
                  <p className="mc-lbl mt-2">Assim vai ficar</p>
                </div>
                <div className="flex-1 w-full min-w-0">
                  <label className="mc-lbl block mb-1">Nome do personagem</label>
                  <input className="w-full h-11 px-3 mb-3 text-[#1f1a17] rounded-md" value={characterName} onChange={(e) => setCharacterName(e.target.value)} maxLength={20} />
                  <label className="mc-lbl block mb-1">Nome da vila</label>
                  <input className="w-full h-11 px-3 mb-4 text-[#1f1a17] rounded-md" value={villageName} onChange={(e) => setVillageName(e.target.value)} maxLength={30} />

                  <p className="mc-lbl mb-1">Camisa</p>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {SHIRTS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        title={labelOf(id)}
                        aria-label={labelOf(id)}
                        className={`mc-slot w-11 h-11 flex items-center justify-center ${character.shirt === id ? 'mc-slot-selected' : ''}`}
                        onClick={() => pick({ shirt: id })}
                      >
                        <GarmentIcon kind="shirt" hex={SHIRT_HEX[id]} size={28} />
                      </button>
                    ))}
                  </div>

                  <p className="mc-lbl mb-1">Calça</p>
                  <div className="flex gap-2 mb-1 flex-wrap">
                    {PANTS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        title={labelOf(id)}
                        aria-label={labelOf(id)}
                        className={`mc-slot w-11 h-11 flex items-center justify-center ${character.pants === id ? 'mc-slot-selected' : ''}`}
                        onClick={() => pick({ pants: id })}
                      >
                        <GarmentIcon kind="pants" hex={PANTS_HEX[id]} size={28} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : sage && (
            <>
              <h1 className="mc-title text-sm mb-3">O Sábio</h1>
              <div className="flex gap-4 items-start">
                <img src={SAGE} alt="" className="w-24 h-24 mc-pixel shrink-0" draggable={false} />
                <div className="mc-card p-3 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={sage.icon} alt="" className="w-8 h-8 mc-pixel" draggable={false} />
                    <p className="font-bold">{sage.title}</p>
                  </div>
                  <p className="text-base">{sage.text}</p>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="mn-child-foot">
          <button type="button" disabled={busy} onClick={() => void next()} className="mc-btn mc-btn-green w-full h-12 font-bold">
            {step === 0 ? 'Continuar' : lastSage ? (busy ? 'Entrando...' : 'Entrar na Vila') : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
