import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { readSoundPref, villageBgm, writeSoundPref } from '../services/village/bgm';
import {
  playUiAchieve,
  playUiClick,
  playUiError,
  playUiHammer,
  playUiLevel,
  playUiNote,
  playUiReward,
  playUiTask,
  playUiTick,
  playUiWhistle,
} from '../services/village/uiSfx';

interface SoundContextType {
  playTaskComplete: () => void;
  playLevelUp: () => void;
  playRewardUnlocked: () => void;
  playAchievement: () => void;
  playClick: () => void;
  playHammer: () => void;
  playError: () => void;
  playTick: () => void;
  playWhistle: () => void;
  playNotification: () => void;
  isSoundEnabled: boolean;
  toggleSound: () => void;
  setBgmWanted: (on: boolean) => void;
  setMusicDuck: (key: string, on: boolean) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound deve ser usado dentro de SoundProvider');
  }
  return context;
};

interface SoundProviderProps {
  children: ReactNode;
}

export const SoundProvider: React.FC<SoundProviderProps> = ({ children }) => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => readSoundPref());
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const enabledRef = useRef(isSoundEnabled);
  const ctxRef = useRef<AudioContext | null>(null);
  enabledRef.current = isSoundEnabled;
  ctxRef.current = audioContext;

  useEffect(() => {
    villageBgm.enable(isSoundEnabled);
  }, [isSoundEnabled]);

  useEffect(() => {
    const initAudioContext = () => {
      setAudioContext((prev) => {
        if (prev) return prev;
        return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      });
      villageBgm.unlock();
    };

    document.addEventListener('click', initAudioContext, { once: true });
    document.addEventListener('touchstart', initAudioContext, { once: true });
    const vis = () => villageBgm.setHidden(document.hidden);
    document.addEventListener('visibilitychange', vis);
    vis();

    return () => {
      document.removeEventListener('click', initAudioContext);
      document.removeEventListener('touchstart', initAudioContext);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);

  const toggleSound = () => {
    const next = !isSoundEnabled;
    setIsSoundEnabled(next);
    writeSoundPref(next);
    villageBgm.enable(next);
  };

  const setBgmWanted = useCallback((on: boolean) => {
    villageBgm.want(on);
  }, []);

  const setMusicDuck = useCallback((key: string, on: boolean) => {
    villageBgm.duck(key, on);
  }, []);

  const playTaskComplete = useCallback(() => playUiTask(ctxRef.current, enabledRef.current), []);
  const playLevelUp = useCallback(() => playUiLevel(ctxRef.current, enabledRef.current), []);
  const playRewardUnlocked = useCallback(() => playUiReward(ctxRef.current, enabledRef.current), []);
  const playAchievement = useCallback(() => playUiAchieve(ctxRef.current, enabledRef.current), []);
  const playClick = useCallback(() => playUiClick(ctxRef.current, enabledRef.current), []);
  const playTick = useCallback(() => playUiTick(ctxRef.current, enabledRef.current), []);
  const playWhistle = useCallback(() => playUiWhistle(ctxRef.current, enabledRef.current), []);
  const playHammer = useCallback(() => playUiHammer(ctxRef.current, enabledRef.current), []);
  const playError = useCallback(() => playUiError(ctxRef.current, enabledRef.current), []);
  const playNotification = useCallback(() => playUiNote(ctxRef.current, enabledRef.current), []);

  const value: SoundContextType = {
    playTaskComplete,
    playLevelUp,
    playRewardUnlocked,
    playAchievement,
    playClick,
    playHammer,
    playError,
    playTick,
    playWhistle,
    playNotification,
    isSoundEnabled,
    toggleSound,
    setBgmWanted,
    setMusicDuck,
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
};