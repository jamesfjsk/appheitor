import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Star, Zap } from 'lucide-react';
import { Task } from '../../types';
import { useSound } from '../../contexts/SoundContext';
import toast from 'react-hot-toast';

interface TaskItemProps {
  task: Task;
  onComplete: (taskId: string, completed: boolean) => void;
  index: number;
  guidedMode?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onComplete, index, guidedMode = false }) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showXPGain, setShowXPGain] = useState(false);
  const { playTaskComplete, playClick } = useSound();

  const handleToggle = async () => {
    // Prevent any action if task is already completed
    if (task.status === 'done') {
      playClick();
      toast('✅ Tarefa já foi completada hoje! Disponível novamente amanhã.', {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#FFFFFF',
        },
      });
      return;
    }

    // Prevent multiple clicks while completing
    if (isCompleting) {
      return;
    }

    setIsCompleting(true);

    try {
      // Animação de sucesso
      setShowSuccess(true);
      
      // Som de conclusão de tarefa
      playTaskComplete();
      
      // Vibração tátil se disponível
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      
      // Show XP gain animation
      setShowXPGain(true);
      setTimeout(() => {
        setShowXPGain(false);
      }, 2000);

      // Complete the task immediately
      await onComplete(task.id, true);
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 800);
    } catch (error) {
      console.error('Erro ao completar tarefa:', error);
      setShowSuccess(false);
    } finally {
      // Always reset completing state after a delay
      setTimeout(() => {
        setIsCompleting(false);
      }, 1000);
    }
  };

  const getTimeIcon = () => {
    if (!task.time) return null;
    
    const now = new Date();
    const [hours, minutes] = task.time.split(':').map(Number);
    const dueTime = new Date();
    dueTime.setHours(hours, minutes, 0, 0);
    
    const isOverdue = now > dueTime && task.status !== 'done';
    
    return (
      <div className={`flex items-center space-x-1 text-xs ${
        isOverdue ? 'text-red-500' : 'text-gray-500'
      }`}>
        <Clock className="w-3 h-3" />
        <span>{task.time}</span>
        {isOverdue && <span className="animate-pulse">⚠️</span>}
      </div>
    );
  };

  const getPeriodColor = () => {
    switch (task.period) {
      case 'morning': return 'from-yellow-400 to-orange-400';
      case 'afternoon': return 'from-blue-400 to-indigo-400';
      case 'evening': return 'from-purple-400 to-pink-400';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const getPeriodEmoji = () => {
    switch (task.period) {
      case 'morning': return '🌅';
      case 'afternoon': return '☀️';
      case 'evening': return '🌙';
      default: return '⭐';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`
        relative
        ${guidedMode ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}
      `}
    >
      {/* Lightning effects for guided mode */}
      {guidedMode && task.status !== 'done' && (
        <>
          <motion.div
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.02, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-transparent rounded-2xl"
          />
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent skew-x-12"
          />
        </>
      )}

      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative overflow-hidden rounded-2xl p-4 border-2 transition-all duration-300
          ${task.status === 'done'
            ? 'bg-white/30 border-hero-accent shadow-lg shadow-hero-accent/20 scale-95' 
            : 'bg-white/20 border-white/30 hover:border-hero-accent/50'
          }
          ${isCompleting ? 'animate-pulse' : ''}
        `}
      >
        {/* Efeito de fundo gradiente por período */}
        <div className={`absolute inset-0 bg-gradient-to-r ${getPeriodColor()} opacity-10`} />
        
        <div className="relative flex items-center space-x-4">
          {/* Botão de completar */}
          <motion.button
            onClick={handleToggle}
            disabled={isCompleting || task.status === 'done'}
            whileHover={{ scale: guidedMode ? 1.15 : 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`
              relative ${guidedMode ? 'w-16 h-16' : 'w-12 h-12'} rounded-full border-3 flex items-center justify-center
              transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-hero-accent/50
              ${task.status === 'done'
                ? 'bg-hero-accent border-hero-accent text-hero-primary shadow-lg cursor-default'
                : 'bg-white/20 border-white/50 text-white hover:border-hero-accent hover:bg-hero-accent/20'
              }
              ${isCompleting || task.status === 'done' ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.4 }}
                >
                  <Star className={`${guidedMode ? 'w-8 h-8' : 'w-6 h-6'} fill-current`} />
                </motion.div>
              ) : task.status === 'done' ? (
                <motion.div
                  key="completed"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check className={`${guidedMode ? 'w-8 h-8' : 'w-6 h-6'}`} />
                </motion.div>
              ) : (
                <motion.div
                  key="incomplete"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={`${guidedMode ? 'w-6 h-6' : 'w-4 h-4'} rounded-full border-2 border-current`} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Efeito de brilho ao completar */}
            {showSuccess && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 bg-hero-accent rounded-full"
              />
            )}
          </motion.button>

          {/* Conteúdo da tarefa */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`
                  ${guidedMode ? 'text-xl' : 'text-lg'} font-bold transition-all duration-300
                  ${task.status === 'done'
                    ? 'text-hero-accent line-through' 
                    : 'text-white'
                  }
                `}>
                  {task.title}
                </h3>
                
                {task.description && (
                  <p className={`
                    text-sm mt-1 transition-all duration-300
                    ${task.status === 'done'
                      ? 'text-white/60 line-through' 
                      : 'text-white/80'
                    }
                  `}>
                    {task.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getPeriodEmoji()}</span>
                    <span className="text-xs text-gray-500 font-medium capitalize">
                      {task.period === 'morning' && 'Manhã'}
                      {task.period === 'afternoon' && 'Tarde'}
                      {task.period === 'evening' && 'Noite'}
                    </span>
                  </div>
                  
                  {getTimeIcon()}
                </div>
              </div>

              {/* Pontos da tarefa */}
              <div className="flex items-center space-x-1 ml-4">
                <Zap className="w-4 h-4 text-hero-accent" />
                <span className="text-hero-accent font-bold text-sm">
                  +{task.xp || 10} XP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Efeito de partículas ao completar */}
        <AnimatePresence>
          {showSuccess && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(guidedMode ? 12 : 8)].map((_, i) => (
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
                    x: `${50 + (Math.random() - 0.5) * 200}%`,
                    y: `${50 + (Math.random() - 0.5) * 200}%`
                  }}
                  transition={{ 
                    duration: 0.8,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                  className={`absolute ${guidedMode ? 'w-3 h-3' : 'w-2 h-2'} bg-hero-accent rounded-full`}
                />
              ))}
            
            {/* Lightning bolts for guided mode */}
            {guidedMode && [...Array(4)].map((_, i) => (
              <motion.div
                key={`lightning-${i}`}
                initial={{ 
                  opacity: 1, 
                  scale: 0,
                  x: '50%',
                  y: '50%',
                  rotate: Math.random() * 360
                }}
                animate={{ 
                  opacity: 0,
                  scale: 1.5,
                  x: `${50 + (Math.random() - 0.5) * 300}%`,
                  y: `${50 + (Math.random() - 0.5) * 300}%`,
                  rotate: Math.random() * 720
                }}
                transition={{ 
                  duration: 1.2,
                  delay: i * 0.15,
                  ease: "easeOut"
                }}
                className="absolute text-yellow-400 text-lg"
              >
                ⚡
              </motion.div>
            ))}
            </div>
          )}
        </AnimatePresence>
        
        {/* XP Gain Animation */}
        <AnimatePresence>
          {showXPGain && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 0 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.2, 1.2, 0.8],
                y: [0, -20, -40, -60]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 pointer-events-none z-20"
            >
              <div className="bg-gradient-to-r from-blue-400 to-yellow-400 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg">
                +{task.xp || 10} XP, +{task.gold || 5} Gold
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default TaskItem;