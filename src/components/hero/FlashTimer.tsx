import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Play, Pause, RotateCcw, X, Zap, Settings } from 'lucide-react';
import { useSound } from '../../contexts/SoundContext';

interface FlashTimerProps {
  isOpen: boolean;
  onClose: () => void;
}

const FlashTimer: React.FC<FlashTimerProps> = ({ isOpen, onClose }) => {
  const { playTaskComplete, playLevelUp, isSoundEnabled } = useSound();
  
  // Timer state
  const [totalSeconds, setTotalSeconds] = useState(300); // 5 minutes default
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Custom time inputs
  const [customMinutes, setCustomMinutes] = useState(5);
  const [customSeconds, setCustomSeconds] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Preset times in seconds
  const presets = [
    { label: '1 min', seconds: 60, emoji: '⚡' },
    { label: '5 min', seconds: 300, emoji: '🏃' },
    { label: '10 min', seconds: 600, emoji: '💪' },
    { label: '15 min', seconds: 900, emoji: '🎯' },
    { label: '25 min', seconds: 1500, emoji: '🧠' },
    { label: '30 min', seconds: 1800, emoji: '🏆' },
    { label: '45 min', seconds: 2700, emoji: '⭐' },
    { label: '1 hora', seconds: 3600, emoji: '👑' }
  ];

  // Initialize audio context
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    
    document.addEventListener('click', initAudio, { once: true });
    return () => document.removeEventListener('click', initAudio);
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsFinished(true);
            playFinishSound();
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
  }, [isRunning, remainingSeconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const playFinishSound = () => {
    if (!isSoundEnabled || !audioContextRef.current) return;

    try {
      const ctx = audioContextRef.current;
      
      // Play epic finish fanfare
      const notes = [
        { freq: 523, duration: 0.3, delay: 0 },     // C5
        { freq: 659, duration: 0.3, delay: 200 },   // E5
        { freq: 784, duration: 0.3, delay: 400 },   // G5
        { freq: 1047, duration: 0.6, delay: 600 },  // C6
        { freq: 1319, duration: 0.8, delay: 900 }   // E6
      ];

      notes.forEach(note => {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.frequency.setValueAtTime(note.freq, ctx.currentTime);
          oscillator.type = 'square';

          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.duration);

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + note.duration);
        }, note.delay);
      });

      // Vibration if available
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } catch (error) {
      console.warn('Erro ao reproduzir som de finalização:', error);
    }
  };

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

  const getTimerColor = () => {
    const percentage = (remainingSeconds / totalSeconds) * 100;
    if (percentage > 50) return 'from-green-500 to-green-600';
    if (percentage > 25) return 'from-yellow-500 to-yellow-600';
    if (percentage > 10) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        exit={{ scale: 0.8, opacity: 0, rotateY: 90 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-hero-primary to-hero-secondary p-6 text-white relative overflow-hidden">
          {/* Lightning background effect */}
          <motion.div
            animate={{
              x: ['-100%', '100%'],
              opacity: [0, 0.3, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent skew-x-12"
          />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-16 h-16 bg-hero-accent rounded-full flex items-center justify-center border-4 border-white shadow-2xl"
              >
                <Clock className="w-8 h-8 text-hero-primary" />
              </motion.div>
              <div>
                <h2 className="text-3xl font-bold" style={{ fontFamily: 'Comic Neue, cursive' }}>
                  ⚡ Flash Timer ⚡
                </h2>
                <p className="text-hero-accent font-medium">
                  Cronômetro do Velocista
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Configurações"
              >
                <Settings className="w-6 h-6" />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Fechar timer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 border-b border-gray-200 p-6"
            >
              <h3 className="font-bold text-gray-900 mb-4">⚙️ Configurar Tempo:</h3>
              
              {/* Presets */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {presets.map((preset) => (
                  <motion.button
                    key={preset.seconds}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePresetSelect(preset.seconds)}
                    className={`p-3 rounded-lg font-bold text-sm transition-all duration-200 ${
                      totalSeconds === preset.seconds
                        ? 'bg-hero-primary text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="text-lg mb-1">{preset.emoji}</div>
                    <div>{preset.label}</div>
                  </motion.button>
                ))}
              </div>
              
              {/* Custom Time */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">🎯 Tempo Personalizado:</h4>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <span className="text-sm text-gray-600">min</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={customSeconds}
                      onChange={(e) => setCustomSeconds(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <span className="text-sm text-gray-600">seg</span>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCustomTime}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Aplicar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timer Display */}
        <div className="p-8 text-center relative overflow-hidden">
          {/* Background lightning effects */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Rotating energy rings */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  rotate: [0, 360],
                  opacity: [0.1, 0.3, 0.1],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 8 + i * 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className={`absolute top-1/2 left-1/2 w-${32 + i * 16} h-${32 + i * 16} border border-yellow-400/20 rounded-full transform -translate-x-1/2 -translate-y-1/2`}
              />
            ))}
            
            {/* Speed lines */}
            {isRunning && [...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  x: ['-100%', '100%'],
                  opacity: [0, 0.4, 0]
                }}
                transition={{
                  duration: 1 + i * 0.2,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.1
                }}
                className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent"
                style={{
                  top: `${30 + i * 5}%`,
                  transform: `skewX(${-20 + i * 2}deg)`
                }}
              />
            ))}
          </div>

          {/* Main Timer Circle */}
          <div className="relative z-10">
            <motion.div
              animate={isRunning ? {
                scale: [1, 1.02, 1],
                boxShadow: [
                  '0 0 20px rgba(255, 215, 0, 0.3)',
                  '0 0 40px rgba(255, 215, 0, 0.6)',
                  '0 0 20px rgba(255, 215, 0, 0.3)'
                ]
              } : {}}
              transition={{
                duration: 1,
                repeat: isRunning ? Infinity : 0,
                ease: "easeInOut"
              }}
              className="relative w-64 h-64 mx-auto mb-6"
            >
              {/* Progress Ring */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                />
                
                {/* Progress circle */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#timerGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - getProgressPercentage() / 100)}`}
                  className="transition-all duration-1000 ease-linear"
                />
                
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#C8102E" />
                    <stop offset="50%" stopColor="#FFD700" />
                    <stop offset="100%" stopColor="#C8102E" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Timer Display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    animate={isFinished ? {
                      scale: [1, 1.3, 1],
                      color: ['#1F2937', '#C8102E', '#1F2937']
                    } : isRunning && remainingSeconds <= 10 ? {
                      scale: [1, 1.1, 1],
                      color: ['#EF4444', '#DC2626', '#EF4444']
                    } : {}}
                    transition={{
                      duration: isFinished ? 0.5 : 1,
                      repeat: (isFinished || (isRunning && remainingSeconds <= 10)) ? 3 : 0,
                      ease: "easeInOut"
                    }}
                    className="text-4xl font-bold text-gray-900 mb-2"
                    style={{ fontFamily: 'Comic Neue, cursive' }}
                  >
                    {formatTime(remainingSeconds)}
                  </motion.div>
                  
                  {isFinished && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-hero-primary font-bold text-lg"
                    >
                      🎉 TEMPO ESGOTADO! 🎉
                    </motion.div>
                  )}
                  
                  {!isFinished && (
                    <div className="text-gray-600 text-sm">
                      {isRunning ? '⚡ Correndo...' : '⏸️ Pausado'}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Lightning bolts around timer when running */}
              {isRunning && [...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    opacity: [0, 0.8, 0],
                    scale: [0.5, 1, 0.5],
                    rotate: [0, 360]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.2
                  }}
                  className="absolute text-yellow-400 text-2xl"
                  style={{
                    left: '50%',
                    top: '50%',
                    transformOrigin: '50% 140px',
                    transform: `translate(-50%, -50%) rotate(${i * 60}deg)`
                  }}
                >
                  ⚡
                </motion.div>
              ))}
            </motion.div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
              {!isRunning ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStart}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-3"
                  style={{ fontFamily: 'Comic Neue, cursive' }}
                >
                  <Play className="w-6 h-6" />
                  {remainingSeconds === totalSeconds ? 'Iniciar' : 'Continuar'}
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePause}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-2xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-3"
                  style={{ fontFamily: 'Comic Neue, cursive' }}
                >
                  <Pause className="w-6 h-6" />
                  Pausar
                </motion.button>
              )}
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReset}
                className="px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-2xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-3"
                style={{ fontFamily: 'Comic Neue, cursive' }}
              >
                <RotateCcw className="w-6 h-6" />
                Reset
              </motion.button>
            </div>

            {/* Progress Info */}
            <div className="mt-6 bg-gray-50 rounded-2xl p-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Progresso:</span>
                <span className="font-bold text-gray-900">
                  {Math.round(getProgressPercentage())}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <motion.div
                  animate={{ width: `${getProgressPercentage()}%` }}
                  transition={{ duration: 0.3 }}
                  className={`h-2 rounded-full bg-gradient-to-r ${getTimerColor()}`}
                />
              </div>
              
              <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                <span>Tempo total: {formatTime(totalSeconds)}</span>
                <span>Restante: {formatTime(remainingSeconds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Finish Celebration */}
        <AnimatePresence>
          {isFinished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 bg-gradient-to-br from-hero-primary/90 to-hero-secondary/90 flex items-center justify-center z-20"
            >
              <div className="text-center text-white">
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    rotate: [0, 360, 720]
                  }}
                  transition={{
                    duration: 2,
                    repeat: 2,
                    ease: "easeInOut"
                  }}
                  className="text-8xl mb-4"
                >
                  ⚡
                </motion.div>
                
                <motion.h3
                  animate={{
                    scale: [1, 1.1, 1],
                    y: [0, -10, 0]
                  }}
                  transition={{
                    duration: 1,
                    repeat: 3,
                    ease: "easeInOut"
                  }}
                  className="text-4xl font-bold mb-4"
                  style={{ fontFamily: 'Comic Neue, cursive' }}
                >
                  TEMPO ESGOTADO!
                </motion.h3>
                
                <p className="text-hero-accent text-xl font-bold mb-6">
                  Missão cronometrada concluída, velocista! 🏃‍♂️💨
                </p>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsFinished(false);
                    handleReset();
                  }}
                  className="px-8 py-4 bg-hero-accent text-hero-primary rounded-2xl font-bold text-lg transition-all duration-200 shadow-lg"
                  style={{ fontFamily: 'Comic Neue, cursive' }}
                >
                  <Zap className="w-6 h-6 inline mr-2" />
                  Novo Timer!
                </motion.button>
              </div>
              
              {/* Celebration particles */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    opacity: 1, 
                    scale: 0,
                    x: '50%',
                    y: '50%'
                  }}
                  animate={{ 
                    opacity: 0,
                    scale: 1,
                    x: `${50 + (Math.random() - 0.5) * 300}%`,
                    y: `${50 + (Math.random() - 0.5) * 300}%`,
                    rotate: Math.random() * 360
                  }}
                  transition={{ 
                    duration: 2,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                  className="absolute w-4 h-4 text-hero-accent text-xl"
                >
                  {i % 3 === 0 ? '⚡' : i % 3 === 1 ? '⭐' : '💫'}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default FlashTimer;