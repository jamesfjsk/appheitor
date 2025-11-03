import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { PunishmentMode } from '../types';
import { FirestoreService } from '../services/firestoreService';
import toast from 'react-hot-toast';

interface PunishmentContextType {
  punishment: PunishmentMode | null;
  isPunished: boolean;
  loading: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  tasksRemaining: number;
  completePunishmentTask: (taskId: string, taskTitle: string) => Promise<void>;
  checkAndDeactivateIfExpired: () => Promise<void>;
}

const PunishmentContext = createContext<PunishmentContextType | undefined>(undefined);

export const usePunishment = () => {
  const context = useContext(PunishmentContext);
  if (!context) {
    throw new Error('usePunishment deve ser usado dentro de PunishmentProvider');
  }
  return context;
};

interface PunishmentProviderProps {
  children: ReactNode;
}

export const PunishmentProvider: React.FC<PunishmentProviderProps> = ({ children }) => {
  const { childUid } = useAuth();
  const [punishment, setPunishment] = useState<PunishmentMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const isPunished = useMemo(() => {
    return punishment?.isActive === true;
  }, [punishment]);

  const tasksRemaining = useMemo(() => {
    if (!punishment) return 0;
    return Math.max(0, (punishment.tasksRequired || 30) - (punishment.tasksCompleted || 0));
  }, [punishment]);

  const updateTimeRemaining = useCallback(() => {
    if (!punishment || !punishment.isActive) {
      setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const now = new Date();
    const endDate = new Date(punishment.endDate);
    const diff = endDate.getTime() - now.getTime();

    if (diff <= 0) {
      setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeRemaining({ days, hours, minutes, seconds });
  }, [punishment]);

  const checkAndDeactivateIfExpired = useCallback(async () => {
    if (!punishment || !punishment.isActive) return;

    const now = new Date();
    const endDate = new Date(punishment.endDate);

    if (now >= endDate) {
      try {
        await FirestoreService.deactivatePunishmentMode(punishment.id, 'time_completed');
        toast.success('🎉 Tempo de punição completado! Você está livre!', {
          duration: 6000
        });
      } catch (error) {
        console.error('❌ Error deactivating expired punishment:', error);
      }
    }
  }, [punishment]);

  const completePunishmentTask = useCallback(async (taskId: string, taskTitle: string) => {
    if (!punishment || !punishment.isActive) {
      throw new Error('Não há punição ativa');
    }

    try {
      await FirestoreService.completePunishmentTask(punishment.id, taskId, taskTitle);

      const newTasksCompleted = (punishment.tasksCompleted || 0) + 1;

      if (newTasksCompleted >= 30) {
        toast.success('🎉 Você completou 30 tarefas! Está livre!', {
          duration: 6000
        });
      } else {
        toast.success(`✅ Tarefa ${newTasksCompleted}/30 completada! Continue assim!`, {
          duration: 4000
        });
      }
    } catch (error: any) {
      console.error('❌ Error completing punishment task:', error);
      if (error.message.includes('esperar')) {
        toast.error(`⏳ ${error.message}`);
      } else {
        toast.error('Erro ao completar tarefa');
      }
      throw error;
    }
  }, [punishment]);

  useEffect(() => {
    if (!childUid) {
      setPunishment(null);
      setLoading(false);
      return;
    }

    console.log('🔥 PunishmentContext: Setting up listener for childUid:', childUid);
    setLoading(true);

    const unsubscribe = FirestoreService.subscribeToActivePunishment(
      childUid,
      (punishmentData) => {
        console.log('📊 PunishmentContext: Punishment updated:', punishmentData);
        setPunishment(punishmentData);
        setLoading(false);
      },
      (error) => {
        console.error('❌ PunishmentContext: Error in punishment listener:', error);
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 PunishmentContext: Cleaning up listener');
      unsubscribe();
    };
  }, [childUid]);

  useEffect(() => {
    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [updateTimeRemaining]);

  useEffect(() => {
    if (!punishment || !punishment.isActive) return;

    const checkInterval = setInterval(() => {
      checkAndDeactivateIfExpired();
    }, 60000);

    checkAndDeactivateIfExpired();

    return () => clearInterval(checkInterval);
  }, [punishment, checkAndDeactivateIfExpired]);

  const value = useMemo<PunishmentContextType>(() => ({
    punishment,
    isPunished,
    loading,
    daysRemaining: timeRemaining.days,
    hoursRemaining: timeRemaining.hours,
    minutesRemaining: timeRemaining.minutes,
    secondsRemaining: timeRemaining.seconds,
    tasksRemaining,
    completePunishmentTask,
    checkAndDeactivateIfExpired
  }), [
    punishment,
    isPunished,
    loading,
    timeRemaining,
    tasksRemaining,
    completePunishmentTask,
    checkAndDeactivateIfExpired
  ]);

  return (
    <PunishmentContext.Provider value={value}>
      {children}
    </PunishmentContext.Provider>
  );
};
