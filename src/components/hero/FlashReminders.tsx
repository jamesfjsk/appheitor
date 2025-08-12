import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { FlashReminder } from '../../types';
import { useData } from '../../contexts/DataContext';

interface FlashRemindersProps {}

const FlashReminders: React.FC<FlashRemindersProps> = () => {
  const { flashReminders } = useData();
  const [currentReminderIndex, setCurrentReminderIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Filter reminders that should show on dashboard
  const dashboardReminders = flashReminders.filter(reminder => 
    reminder.active && reminder.showOnDashboard
  );

  // Auto-rotate reminders every 8 seconds
  useEffect(() => {
    if (dashboardReminders.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentReminderIndex(prev => 
        prev >= dashboardReminders.length - 1 ? 0 : prev + 1
      );
    }, 8000);

    return () => clearInterval(interval);
  }, [dashboardReminders.length]);

  // Reset index if it's out of bounds
  useEffect(() => {
    if (currentReminderIndex >= dashboardReminders.length) {
      setCurrentReminderIndex(0);
    }
  }, [dashboardReminders.length, currentReminderIndex]);

  const currentReminder = dashboardReminders[currentReminderIndex];

  const getColorClasses = (color: FlashReminder['color']) => {
    switch (color) {
      case 'red': return 'from-red-500 to-red-600 text-white';
      case 'yellow': return 'from-yellow-400 to-yellow-500 text-red-600';
      case 'blue': return 'from-blue-500 to-blue-600 text-white';
      case 'green': return 'from-green-500 to-green-600 text-white';
      case 'purple': return 'from-purple-500 to-purple-600 text-white';
      case 'orange': return 'from-orange-500 to-orange-600 text-white';
      default: return 'from-yellow-400 to-yellow-500 text-red-600';
    }
  };

  const getPriorityPulse = (priority: FlashReminder['priority']) => {
    switch (priority) {
      case 'high': return 'animate-pulse';
      case 'medium': return '';
      case 'low': return '';
      default: return '';
    }
  };

  if (!isVisible || dashboardReminders.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" fill="currentColor" />
            Lembretes Flash
          </h3>
          <button
            onClick={() => setIsVisible(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Mostrar lembretes"
          >
            <Eye className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        
        <div className="text-center py-6">
          <div className="text-4xl mb-2">⚡</div>
          <p className="text-gray-600 text-sm">
            Nenhum lembrete ativo no momento
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Peça para o papai adicionar alguns lembretes!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" fill="currentColor" />
          Lembretes Flash
        </h3>
        
        <div className="flex items-center gap-2">
          {/* Indicator dots */}
          {dashboardReminders.length > 1 && (
            <div className="flex gap-1">
              {dashboardReminders.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentReminderIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentReminderIndex 
                      ? 'bg-yellow-400 scale-125' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}
          
          <button
            onClick={() => setIsVisible(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Ocultar lembretes"
          >
            <EyeOff className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Current Reminder */}
      <AnimatePresence mode="wait">
        {currentReminder && (
          <motion.div
            key={currentReminder.id}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`
              bg-gradient-to-r ${getColorClasses(currentReminder.color)} 
              rounded-xl p-4 relative overflow-hidden
              ${getPriorityPulse(currentReminder.priority)}
            `}
          >
            {/* Background lightning effect */}
            <motion.div
              animate={{
                x: ['-100%', '100%'],
                opacity: [0, 0.3, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <motion.span
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-2xl"
                >
                  {currentReminder.icon}
                </motion.span>
                
                <div className="flex-1">
                  <h4 className="font-bold text-lg">
                    {currentReminder.title}
                  </h4>
                  
                  {currentReminder.priority === 'high' && (
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-xs bg-white/30 px-2 py-1 rounded-full font-bold"
                    >
                      IMPORTANTE
                    </motion.span>
                  )}
                </div>
              </div>
              
              <p className="text-sm opacity-90 leading-relaxed">
                {currentReminder.message}
              </p>
            </div>
            
            {/* Priority indicator */}
            {currentReminder.priority === 'high' && (
              <motion.div
                animate={{
                  opacity: [0.3, 0.8, 0.3],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual navigation */}
      {dashboardReminders.length > 1 && (
        <div className="flex justify-center mt-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setCurrentReminderIndex(prev => 
                prev >= dashboardReminders.length - 1 ? 0 : prev + 1
              );
            }}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            title="Próximo lembrete"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default FlashReminders;