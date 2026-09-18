import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, X, Settings } from 'lucide-react';
import { useSound } from '../../contexts/SoundContext';

const CLOCK = '/assets/english/ui/clock.webp';

interface FlashTimerProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
  minutes?: number;
  onFinished?: () => void;
}

const FlashTimer: React.FC<FlashTimerProps> = ({ isOpen, onClose, embedded = false, minutes, onFinished }) => {
  const { playLevelUp } = useSound();
  
  // Timer state
  const [totalSeconds, setTotalSeconds] = useState(minutes ? minutes * 60 : 300);
  const [remainingSeconds, setRemainingSeconds] = useState(minutes ? minutes * 60 : 300);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Custom time inputs
  const [customMinutes, setCustomMinutes] = useState(5);
  const [customSeconds, setCustomSeconds] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const finishedOnceRef = useRef(false);

  // Preset times in seconds
  const presets = [
    { label: '1 min', seconds: 60 },
    { label: '5 min', seconds: 300 },
    { label: '10 min', seconds: 600 },
    { label: '15 min', seconds: 900 },
    { label: '25 min', seconds: 1500 },
    { label: '30 min', seconds: 1800 },
    { label: '45 min', seconds: 2700 },
    { label: '1 hora', seconds: 3600 }
  ];

  useEffect(() => {
    if (!minutes) return;
    const sec = minutes * 60;
    setTotalSeconds(sec);
    setRemainingSeconds(sec);
    setIsFinished(false);
    setIsRunning(false);
    finishedOnceRef.current = false;
  }, [minutes]);

  // Timer logic
  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsFinished(true);
            playLevelUp();
            if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
            if (!finishedOnceRef.current) {
              finishedOnceRef.current = true;
              onFinished?.();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- interval must follow remainingSeconds; playLevelUp is stable
  }, [isRunning, remainingSeconds, playLevelUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
  };

  const handleStart = () => {
    if (remainingSeconds === 0) {
      setRemainingSeconds(totalSeconds);
      setIsFinished(false);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
    setIsFinished(false);
  };

  const handlePresetSelect = (seconds: number) => {
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    setIsRunning(false);
    setIsFinished(false);
    setShowSettings(false);
  };

  const handleCustomTime = () => {
    const totalCustomSeconds = (customMinutes * 60) + customSeconds;
    if (totalCustomSeconds > 0 && totalCustomSeconds <= 7200) { // Max 2 hours
      setTotalSeconds(totalCustomSeconds);
      setRemainingSeconds(totalCustomSeconds);
      setIsRunning(false);
      setIsFinished(false);
      setShowSettings(false);
    }
  };

  if (!isOpen) return null;

  const body = (
        <div className="text-white relative">
        <div className="p-4 border-b-4 border-[#17130f] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={CLOCK} alt="" className="w-10 h-10 mc-pixel" draggable={false} />
            <h2 className="mc-title text-sm">Cronômetro</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0"
              title="Configurações"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-b-4 border-[#17130f]"
            >
              <p className="mc-lbl mb-3">Configurar tempo</p>
              <div className="mc-hotbar mb-4">
                {presets.map((preset) => (
                  <button
                    key={preset.seconds}
                    type="button"
                    onClick={() => handlePresetSelect(preset.seconds)}
                    className={`mc-slot rounded ${totalSeconds === preset.seconds ? 'mc-slot-selected' : ''}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="mc-card rounded p-3 flex items-center gap-3 flex-wrap">
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 0)}
                  className="w-16 h-11 px-2 bg-white text-[#1f1a17] border-[3px] border-[#373737] rounded-md text-center"
                />
                <span className="text-sm mc-muted">min</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customSeconds}
                  onChange={(e) => setCustomSeconds(parseInt(e.target.value) || 0)}
                  className="w-16 h-11 px-2 bg-white text-[#1f1a17] border-[3px] border-[#373737] rounded-md text-center"
                />
                <span className="text-sm mc-muted">seg</span>
                <button type="button" onClick={handleCustomTime} className="mc-btn mc-btn-stone px-4 min-h-[44px] font-bold">
                  Aplicar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 text-center">
          <p className="mc-num mb-2" style={{ fontSize: 36 }}>{formatTime(remainingSeconds)}</p>
          {isFinished ? (
            <p className="mc-good font-bold mb-4">Tempo esgotado</p>
          ) : (
            <p className="mc-muted text-sm mb-4">{isRunning ? 'Em andamento' : 'Pausado'}</p>
          )}

          <div className="mc-bar mb-5">
            <div
              className={`mc-bar-fill ${isFinished ? 'is-gold' : ''}`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>

          <div className="flex justify-center gap-3 flex-wrap">
            {!isRunning ? (
              <button type="button" onClick={handleStart} className="mc-btn mc-btn-green px-6 py-3 font-bold min-h-[44px]">
                <Play className="w-5 h-5 inline mr-2" />
                {remainingSeconds === totalSeconds ? 'Iniciar' : 'Continuar'}
              </button>
            ) : (
              <button type="button" onClick={handlePause} className="mc-btn mc-btn-stone px-6 py-3 font-bold min-h-[44px]">
                <Pause className="w-5 h-5 inline mr-2" />
                Pausar
              </button>
            )}
            <button type="button" onClick={handleReset} className="mc-btn mc-btn-red px-6 py-3 font-bold min-h-[44px]">
              <RotateCcw className="w-5 h-5 inline mr-2" />
              Zerar
            </button>
          </div>

          <div className="mt-4 flex justify-between text-xs mc-muted">
            <span>Total {formatTime(totalSeconds)}</span>
            <span>Restante {formatTime(remainingSeconds)}</span>
          </div>
        </div>

        <AnimatePresence>
          {isFinished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 p-4"
            >
              <div className="mc-panel rounded-lg p-6 text-center max-w-sm">
                <img src={CLOCK} alt="" className="w-12 h-12 mx-auto mb-3 mc-pixel" draggable={false} />
                <h3 className="mc-title text-sm mb-2">Tempo esgotado</h3>
                <p className="text-white/85 mb-4">Missão cronometrada concluída.</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsFinished(false);
                    handleReset();
                  }}
                  className="mc-btn mc-btn-green px-6 py-3 font-bold"
                >
                  Novo cronômetro
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
  </div>
  );

  if (embedded) return <div className="mc-card rounded overflow-hidden">{body}</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="mc-panel rounded-lg w-full max-w-lg overflow-hidden text-white relative"
      >
        {body}
      </motion.div>
    </motion.div>
  );
};

export default FlashTimer;
