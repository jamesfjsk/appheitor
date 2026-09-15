import React, { useState } from 'react';
import { DEFAULT_CHARACTER } from '../../../config/village';
import { useVillage } from '../../../contexts/VillageContext';
import { useSound } from '../../../contexts/SoundContext';
import type { VillageCharacter } from '../../../types/village';

const SKINS = ['skin_1', 'skin_2', 'skin_3', 'skin_4'];
const HAIR = ['hair_1'];
const SHIRTS = ['shirt_1', 'shirt_2', 'shirt_3', 'shirt_4', 'shirt_5', 'shirt_6', 'shirt_7', 'shirt_8'];
const PANTS = ['pants_1', 'pants_2', 'pants_3', 'pants_4', 'pants_5', 'pants_6', 'pants_7', 'pants_8'];

const Onboarding: React.FC = () => {
  const { completeOnboarding } = useVillage();
  const { playClick } = useSound();
  const [step, setStep] = useState(0);
  const [characterName, setCharacterName] = useState('Heitor');
  const [villageName, setVillageName] = useState('Vila do Heitor');
  const [character, setCharacter] = useState<VillageCharacter>({ ...DEFAULT_CHARACTER });
  const [busy, setBusy] = useState(false);

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
    <div className="mn-page min-h-screen flex items-center justify-center p-4">
      <div className="mc-panel rounded-lg max-w-lg w-full p-6 text-white">
        {step === 0 ? (
          <>
            <h1 className="mc-title text-sm mb-3">Crie seu minerador</h1>
            <label className="mc-lbl block mb-1">Nome do personagem</label>
            <input className="w-full h-11 px-3 mb-3 text-[#1f1a17] rounded-md" value={characterName} onChange={(e) => setCharacterName(e.target.value)} maxLength={20} />
            <label className="mc-lbl block mb-1">Nome da vila</label>
            <input className="w-full h-11 px-3 mb-4 text-[#1f1a17] rounded-md" value={villageName} onChange={(e) => setVillageName(e.target.value)} maxLength={30} />
            <p className="text-sm mc-muted mb-2">Pele, cabelo, camisa e calça (grátis)</p>
            <div className="flex gap-2 mb-2 flex-wrap">
              {SKINS.map((id) => (
                <button key={id} type="button" className={`mc-slot w-11 h-11 ${character.skin === id ? 'mc-slot-selected' : ''}`} onClick={() => setCharacter({ ...character, skin: id })} />
              ))}
            </div>
            <div className="flex gap-2 mb-2 flex-wrap">
              {HAIR.map((id) => (
                <button key={id} type="button" className={`mc-slot w-11 h-11 ${character.hair === id ? 'mc-slot-selected' : ''}`} onClick={() => setCharacter({ ...character, hair: id })} />
              ))}
            </div>
            <div className="flex gap-2 mb-2 flex-wrap">
              {SHIRTS.map((id) => (
                <button key={id} type="button" className={`mc-slot w-11 h-11 ${character.shirt === id ? 'mc-slot-selected' : ''}`} onClick={() => setCharacter({ ...character, shirt: id })} />
              ))}
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {PANTS.map((id) => (
                <button key={id} type="button" className={`mc-slot w-11 h-11 ${character.pants === id ? 'mc-slot-selected' : ''}`} onClick={() => setCharacter({ ...character, pants: id })} />
              ))}
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

