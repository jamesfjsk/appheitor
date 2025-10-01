import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Star, Zap } from 'lucide-react';
import { Task } from '../../types';
import { useSound } from '../../contexts/SoundContext';
import toast from 'react-hot-toast';
import SpeedForce from './SpeedForce';

// Helper function to check if task is completed today
const isTaskCompletedToday = (task: Task): boolean => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  return task.status === 'done' && task.lastCompletedDate === today;
};

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
    if (isTaskCompletedToday(task)) {
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
      console.log('⚠️ Task completion already in progress, ignoring click');
      return;
    }

    console.log('🎯 Starting task completion:', { taskId: task.id, title: task.title });
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
      
      console.log('✅ Task completed successfully:', task.id);
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 800);
    } catch (error) {
      console.error('Erro ao completar tarefa:', error);
      setShowSuccess(false);
      setShowXPGain(false);
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
    const isCompletedToday = isTaskCompletedToday(task);
    
    return (
      <div className={`flex items-center space-x-1 text-xs ${
        isCompletedToday ? 'text-green-500' : isOverdue ? 'text-red-500' : 'text-gray-500'
      }`}>
        <Clock className="w-3 h-3" />
        <span>{task.time}</span>
        {isCompletedToday && <span>✅</span>}
        {!isCompletedToday && isOverdue && <span className="animate-pulse">⚠️</span>}
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
        ${isTaskCompletedToday(task)
      }
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
          relative overflow-hidden rounded-2xl p-4 border-2 transition-all duration-300 card-lift
          ${task.status === 'done'
            ? 'bg-green-50 border-green-300 shadow-lg shadow-green-200 scale-95 success-ripple'
            : 'glass-card border-gray-200 hover:border-hero-accent/50 shadow-lg hover:shadow-xl'
          }
          ${isCompleting ? 'animate-pulse' : ''}
        `}
      >
        {/* SpeedForce effect for active tasks */}
        {!isTaskCompletedToday(task) && guidedMode && (
          <SpeedForce intensity="medium" />
        )}

        {/* Efeito de fundo gradiente por período - mais sutil */}
        <div className={`absolute inset-0 bg-gradient-to-r ${getPeriodColor()} opacity-5`} />
        
        {/* Raios sutis de energia na tarefa */}
        {!isTaskCompletedToday(task) && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <motion.div
              animate={{
                x: ['-100%', '100%'],
                opacity: [0, 0.1, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 3
              }}
              className="absolute top-1/2 w-full h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent transform -translate-y-1/2"
            />
          </div>
        )}
        
        <div className="relative flex items-center space-x-4">
          {/* Botão de completar */}
          <motion.button
            onClick={handleToggle}
            disabled={isCompleting || isTaskCompletedToday(task)}
            whileHover={{ scale: guidedMode ? 1.15 : 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`
              relative ${guidedMode ? 'w-20 h-20' : 'w-16 h-16'} rounded-full border-4 flex items-center justify-center
              transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-hero-accent/50 btn-glow
              ${isTaskCompletedToday(task)
                ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-400 text-white shadow-2xl cursor-default energy-glow'
                : 'bg-gradient-to-br from-yellow-400 to-yellow-500 border-yellow-300 text-red-600 hover:from-yellow-300 hover:to-yellow-400 hover:border-yellow-200 shadow-xl hover:shadow-2xl lightning-bolt'
              }
              ${isCompleting || isTaskCompletedToday(task) ? 'cursor-not-allowed' : 'cursor-pointer'}
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
                  <Star className={`${guidedMode ? 'w-10 h-10' : 'w-8 h-8'} fill-current drop-shadow-lg`} />
                </motion.div>
              ) : isTaskCompletedToday(task) ? (
                <motion.div
                  key="completed"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check className={`${guidedMode ? 'w-10 h-10' : 'w-8 h-8'} drop-shadow-lg`} />
                </motion.div>
              ) : (
                <motion.div
                  key="incomplete"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={`${guidedMode ? 'w-8 h-8 border-4' : 'w-6 h-6 border-3'} rounded-full border-current shadow-inner`} />
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
                  ${guidedMode ? 'text-2xl' : 'text-xl'} font-bold transition-all duration-300
                  ${isTaskCompletedToday(task)
                    ? 'text-green-600 line-through' 
                    : 'text-gray-900'
                  }
                `}>
                  {task.title}
                </h3>
                
                {task.description && (
                  <p className={`
                    ${guidedMode ? 'text-base' : 'text-sm'} mt-1 transition-all duration-300
                    ${isTaskCompletedToday(task)
                      ? 'text-green-500 line-through' 
                      : 'text-gray-600'
                    }
                  `}>
                    {task.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getPeriodEmoji()}</span>
                    <span className="text-xs text-gray-600 font-medium capitalize">
                      {task.period === 'morning' && 'Manhã'}
                      {task.period === 'afternoon' && 'Tarde'}
                      {task.period === 'evening' && 'Noite'}
                    </span>
                  </div>
                  
                  {getTimeIcon()}
                </div>
              </div>

              {/* Pontos da tarefa */}
              <div className={`flex items-center space-x-2 ml-4 ${guidedMode ? 'flex-col space-x-0 space-y-1' : ''}`}>
                <div className="flex items-center space-x-1">
                  <Zap className={`${guidedMode ? 'w-6 h-6' : 'w-5 h-5'} text-blue-500`} />
                  <span className={`text-blue-600 font-bold ${guidedMode ? 'text-lg' : 'text-base'}`}>
                  +{task.xp || 10} XP
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className={`${guidedMode ? 'text-lg' : 'text-sm'}`}>🪙</span>
                  <span className={`text-yellow-600 font-bold ${guidedMode ? 'text-lg' : 'text-base'}`}>
                    +{task.gold || 1} Gold
                  </span>
                </div>
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
                y: [-20, -40, -40, -60]
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