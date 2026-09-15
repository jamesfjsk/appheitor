import React, { useState } from 'react';
import { COSMETICS, DEFAULT_CHARACTER, PANTS_HEX, SHIRT_HEX, SKIN_SPRITE } from '../../../config/village';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import type { VillageCharacter } from '../../../types/village';
import CharacterPreview from './CharacterPreview';

const SKINS = ['skin_1', 'skin_2', 'skin_3', 'skin_4'];
const HAIR = ['hair_1'];
const SHIRTS = ['shirt_1', 'shirt_2', 'shirt_3', 'shirt_4', 'shirt_5', 'shirt_6', 'shirt_7', 'shirt_8'];
const PANTS = ['pants_1', 'pants_2', 'pants_3', 'pants_4', 'pants_5', 'pants_6', 'pants_7', 'pants_8'];

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

  const pick = (patch: Partial<VillageCharacter>) => {
    playClick();
    setCharacter((prev) => ({ ...prev, ...patch }));
  };

  const next = async () => {
    playClick();
    if (step < 1) {
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      await completeOnboarding({ characterName, villageName, character });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mn-page min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="mc-panel rounded-lg max-w-2xl w-full p-6 text-white">
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

                <p className="mc-lbl mb-1">Pele</p>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {SKINS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      title={labelOf(id)}
                      aria-label={labelOf(id)}
                      className={`mc-slot w-11 h-11 p-0.5 overflow-hidden ${character.skin === id ? 'mc-slot-selected' : ''}`}
                      onClick={() => pick({ skin: id })}
                    >
                      <img src={SKIN_SPRITE[id]} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />
                    </button>
                  ))}
                </div>

                <p className="mc-lbl mb-1">Cabelo</p>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {HAIR.map((id) => (
                    <button
                      key={id}
                      type="button"
                      title={labelOf(id)}
                      aria-label={labelOf(id)}
                      className={`mc-slot w-11 h-11 p-0.5 overflow-hidden ${character.hair === id ? 'mc-slot-selected' : ''}`}
                      onClick={() => pick({ hair: id })}
                    >
                      <img src={SKIN_SPRITE[character.skin]} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />
                    </button>
                  ))}
                </div>

                <p className="mc-lbl mb-1">Camisa</p>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {SHIRTS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      title={labelOf(id)}
                      aria-label={labelOf(id)}
                      className={`mc-slot w-11 h-11 ${character.shirt === id ? 'mc-slot-selected' : ''}`}
                      style={{ background: SHIRT_HEX[id] }}
                      onClick={() => pick({ shirt: id })}
                    />
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
                      className={`mc-slot w-11 h-11 ${character.pants === id ? 'mc-slot-selected' : ''}`}
                      style={{ background: PANTS_HEX[id] }}
                      onClick={() => pick({ pants: id })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="mc-title text-sm mb-3">O Sábio</h1>
            <p className="text-base mb-2">As missões de casa pagam gold, XP e materiais.</p>
            <p className="text-base mb-2">A Mina de inglês constrói a base.</p>
            <p className="text-base mb-4">O Baú do Dia abre à noite, com o trabalho feito.</p>
          </>
        )}
        <button type="button" disabled={busy} onClick={() => void next()} className="mc-btn mc-btn-green w-full h-12 font-bold">
          {step === 0 ? 'Continuar' : 'Entrar na Vila'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
