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
    if (!task.dueTime) return null;
    
    const now = new Date();
    const [hours, minutes] = task.dueTime.split(':').map(Number);
    const dueTime = new Date();
    dueTime.setHours(hours, minutes, 0, 0);
    
    const isOverdue = now > dueTime && task.status !== 'done';
    
    return (
      <div className={`flex items-center space-x-1 text-xs ${
        isOverdue ? 'text-flash-red' : 'text-gray-500'
      }`}>
        <Clock className="w-3 h-3" />
        <span>{task.dueTime}</span>
        {isOverdue && <span className="text-flash-red">⚠️</span>}
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
        ${guidedMode ? 'ring-2 ring-flash-red ring-opacity-50' : ''}
      `}
    >
      {/* Lightning effects for guided mode */}
      {guidedMode && task.status !== 'done' && (
        <motion.div
          animate={{
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,            repeatType: "reverse",
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-flash-red-light rounded-lg"
        />
      )}

      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`task-card ${task.status === 'done' ? 'completed' : ''} ${isCompleting ? 'opacity-75' : ''} relative`}
      >
        <div className="relative flex items-center space-x-4">
          {/* Botão de completar */}
          <motion.button
            onClick={handleToggle}
            disabled={isCompleting || task.status === 'done'}
            whileHover={{ scale: guidedMode ? 1.15 : 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`task-checkbox ${guidedMode ? 'w-12 h-12' : 'w-8 h-8'} ${task.status === 'done' ? 'completed' : ''}`}
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
                  <Star className={`${guidedMode ? 'w-8 h-8' : 'w-7 h-7'} fill-current drop-shadow-md`} />
                </motion.div>
              ) : task.status === 'done' ? (
                <motion.div
                  key="completed"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check className={`${guidedMode ? 'w-6 h-6' : 'w-4 h-4'}`} />
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
                className="absolute inset-0 bg-flash-red rounded-full"
              />
            )}
          </motion.button>

          {/* Conteúdo da tarefa */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`task-title ${guidedMode ? 'text-xl' : 'text-base'}`}>
                  {task.title}
                </h3>
                
                {task.description && (
                  <p className="task-description">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="task-meta">
                    <span className="text-lg">{getPeriodEmoji()}</span>
                    <span className="text-xs font-medium capitalize bg-gray-100 px-2 py-1 rounded">
                      {task.period === 'morning' && 'Manhã'}
                      {task.period === 'afternoon' && 'Tarde'}
                      {task.period === 'evening' && 'Noite'}
                    </span>
                    {getTimeIcon()}
                  </div>
                </div>
              </div>

              {/* Pontos da tarefa */}
              <div className="task-points ml-4 bg-gray-100 rounded-lg p-3 text-center">
                <Zap className="w-4 h-4 text-gold-500 mx-auto mb-1" />
                <span className="text-gray-900 font-bold text-sm block">
                  +{task.xp || 10} XP                </span>
                </span>
                <span className="text-gray-600 font-medium text-xs">
                  +{task.gold || 5} Gold
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Efeito de partículas ao completar */}
        <AnimatePresence>
          {showSuccess && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(guidedMode ? 8 : 4)].map((_, i) => (
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
                    y: `${50 + (Math.random() - 0.5) * 200}%`                  }}
                  }}
                  transition={{ 
                    duration: 0.8,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                  className="absolute inset-0 bg-flash-red rounded-full z-0"
                />
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
              <div className="bg-success text-white px-4 py-2 rounded-lg font-bold text-sm shadow-normal">
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