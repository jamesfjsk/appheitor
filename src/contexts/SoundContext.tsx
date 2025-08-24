import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface SoundContextType {
  playTaskComplete: () => void;
  playLevelUp: () => void;
  playRewardUnlocked: () => void;
  playAchievement: () => void;
  playClick: () => void;
  playError: () => void;
  playNotification: () => void;
  isSoundEnabled: boolean;
  toggleSound: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

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
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    // Load sound preference from Firebase instead of localStorage
    const loadSoundPreference = async () => {
      try {
        // For now, keep sound enabled by default
        // In a full implementation, this would be stored in user preferences in Firebase
        setIsSoundEnabled(true);
      } catch (error) {
        console.error('❌ Error loading sound preference:', error);
        setIsSoundEnabled(true);
      }
    };
    
    loadSoundPreference();

    // Initialize AudioContext after user interaction
    const initAudioContext = () => {
      if (!audioContext) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);
      }
    };

    document.addEventListener('click', initAudioContext, { once: true });
    document.addEventListener('touchstart', initAudioContext, { once: true });

    return () => {
      document.removeEventListener('click', initAudioContext);
      document.removeEventListener('touchstart', initAudioContext);
    };
  }, [audioContext]);

  const toggleSound = async () => {
    const newState = !isSoundEnabled;
    setIsSoundEnabled(newState);
    
    try {
      // In a full implementation, save to Firebase user preferences
      // await FirestoreService.updateUserPreferences(userId, { soundEnabled: newState });
      console.log('🔊 Sound preference updated:', newState);
    } catch (error) {
      console.error('❌ Error saving sound preference:', error);
    }
  };

  // Função para criar tons usando Web Audio API
  const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
    if (!isSoundEnabled || !audioContext) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Erro ao reproduzir som:', error);
    }
  };

  // Função para criar sequências de tons
  const playSequence = (notes: { freq: number; duration: number; delay: number; type?: OscillatorType; volume?: number }[]) => {
    if (!isSoundEnabled || !audioContext) return;

    notes.forEach((note, index) => {
      setTimeout(() => {
        playTone(note.freq, note.duration, note.type || 'sine', note.volume || 0.3);
      }, note.delay);
    });
  };

  const playTaskComplete = () => {
    // Som de sucesso - sequência ascendente
    playSequence([
      { freq: 523, duration: 0.15, delay: 0 },     // C5
      { freq: 659, duration: 0.15, delay: 100 },   // E5
      { freq: 784, duration: 0.3, delay: 200 }     // G5
    ]);
  };

  const playLevelUp = () => {
    // Som épico de level up
    playSequence([
      { freq: 392, duration: 0.2, delay: 0, type: 'square' },    // G4
      { freq: 523, duration: 0.2, delay: 150, type: 'square' },  // C5
      { freq: 659, duration: 0.2, delay: 300, type: 'square' },  // E5
      { freq: 784, duration: 0.4, delay: 450, type: 'square' },  // G5
      { freq: 1047, duration: 0.6, delay: 600, type: 'square', volume: 0.4 } // C6
    ]);
  };

  const playRewardUnlocked = () => {
    // Som mágico de recompensa
    playSequence([
      { freq: 880, duration: 0.1, delay: 0, type: 'triangle' },
      { freq: 1108, duration: 0.1, delay: 80, type: 'triangle' },
      { freq: 1318, duration: 0.1, delay: 160, type: 'triangle' },
      { freq: 1760, duration: 0.3, delay: 240, type: 'triangle', volume: 0.4 }
    ]);
  };

  const playAchievement = () => {
    // Fanfarra de conquista
    playSequence([
      { freq: 523, duration: 0.2, delay: 0, type: 'sawtooth' },   // C5
      { freq: 659, duration: 0.2, delay: 100, type: 'sawtooth' }, // E5
      { freq: 784, duration: 0.2, delay: 200, type: 'sawtooth' }, // G5
      { freq: 1047, duration: 0.4, delay: 300, type: 'sawtooth', volume: 0.4 } // C6
    ]);
  };

  const playClick = () => {
    // Som sutil de clique
    playTone(800, 0.05, 'square', 0.1);
  };

  const playError = () => {
    // Som de erro - tom descendente
    playSequence([
      { freq: 400, duration: 0.2, delay: 0, type: 'sawtooth', volume: 0.2 },
      { freq: 300, duration: 0.3, delay: 150, type: 'sawtooth', volume: 0.2 }
    ]);
  };

  const playNotification = () => {
    // Som de notificação suave
    playSequence([
      { freq: 880, duration: 0.15, delay: 0, type: 'sine', volume: 0.2 },
      { freq: 1108, duration: 0.15, delay: 120, type: 'sine', volume: 0.2 }
    ]);
  };

  const value: SoundContextType = {
    playTaskComplete,
    playLevelUp,
    playRewardUnlocked,
    playAchievement,
    playClick,
    playError,
    playNotification,
    isSoundEnabled,
    toggleSound
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
};