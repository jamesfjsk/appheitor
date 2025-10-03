import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useSound } from './SoundContext';
import { Task, Reward, UserProgress, RewardRedemption, Notification, CalendarDay, Achievement, UserAchievement, FlashReminder, SurpriseMissionConfig, DailySurpriseMissionStatus } from '../types';
import { FirestoreService } from '../services/firestoreService';
import { checkLevelUp, calculateLevelSystem } from '../utils/levelSystem';
import { getRewardsUnlockedAtLevel } from '../utils/rewardLevels';
import toast from 'react-hot-toast';

interface DataContextType {
  tasks: Task[];
  rewards: Reward[];
  progress: UserProgress;
  redemptions: RewardRedemption[];
  notifications: Notification[];
  flashReminders: FlashReminder[];
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  surpriseMissionConfig: SurpriseMissionConfig | null;
  isSurpriseMissionCompletedToday: boolean;
  surpriseMissionHistory: DailySurpriseMissionStatus[];
  loading: boolean;
  
  // Task methods
  addTask: (task: Omit<Task, 'id' | 'ownerId' | 'createdBy' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  
  // Reward methods
  addReward: (reward: Omit<Reward, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReward: (rewardId: string, updates: Partial<Reward>) => Promise<void>;
  deleteReward: (rewardId: string) => Promise<void>;
  redeemReward: (rewardId: string) => Promise<void>;
  
  // Redemption methods
  approveRedemption: (redemptionId: string, approved: boolean) => Promise<void>;
  
  // Notification methods
  sendNotification: (title: string, message: string, type?: Notification['type']) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  
  // Flash Reminder methods
  addFlashReminder: (reminder: Omit<FlashReminder, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateFlashReminder: (reminderId: string, updates: Partial<FlashReminder>) => Promise<void>;
  deleteFlashReminder: (reminderId: string) => Promise<void>;
  
  // Achievement methods
  addAchievement: (achievement: Omit<Achievement, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAchievement: (achievementId: string, updates: Partial<Achievement>) => Promise<void>;
  deleteAchievement: (achievementId: string) => Promise<void>;
  checkAchievements: () => Promise<void>;
  claimAchievementReward: (userAchievementId: string) => Promise<void>;
  
  // Surprise Mission methods
  loadSurpriseMissionConfig: () => Promise<void>;
  updateSurpriseMissionSettings: (settings: Omit<SurpriseMissionConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  completeSurpriseMission: (score: number, totalQuestions: number, xpEarned: number, goldEarned: number) => Promise<void>;
  
  // Progress methods
  adjustUserXP: (amount: number) => Promise<void>;
  adjustUserGold: (amount: number) => Promise<void>;
  resetUserData: () => Promise<void>;
  createTestData: () => Promise<void>;
  
  // Utility methods
  getCalendarMonth: (year: number, month: number) => CalendarDay[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData deve ser usado dentro de DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { user, childUid } = useAuth();
  const { playLevelUp, playAchievement } = useSound();
  
  // Initialize all state hooks first (before any conditional logic)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [progress, setProgress] = useState<UserProgress>({
    userId: '',
    level: 1,
    totalXP: 0,
    availableGold: 0,
    totalGoldEarned: 0,
    totalGoldSpent: 0,
    streak: 0,
    longestStreak: 0,
    rewardsRedeemed: 0,
    totalTasksCompleted: 0,
    lastActivityDate: new Date(),
    updatedAt: new Date()
  });
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [flashReminders, setFlashReminders] = useState<FlashReminder[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [surpriseMissionConfig, setSurpriseMissionConfig] = useState<SurpriseMissionConfig | null>(null);
  const [isSurpriseMissionCompletedToday, setIsSurpriseMissionCompletedToday] = useState(false);
  const [surpriseMissionHistory, setSurpriseMissionHistory] = useState<DailySurpriseMissionStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Prevent duplicate listeners and optimize re-renders
  const [listenersInitialized, setListenersInitialized] = useState(false);
  const [lastChildUid, setLastChildUid] = useState<string | null>(null);

  // Define all callback hooks before any conditional logic
  const checkAchievements = useCallback(async () => {
    if (!childUid) return;
    
    try {
      console.log('🏆 DataContext: Checking achievements for user:', childUid);
      console.log('🏆 Current progress:', {
        totalXP: progress.totalXP,
        level: calculateLevelSystem(progress.totalXP || 0).currentLevel,
        totalTasksCompleted: progress.totalTasksCompleted,
        streak: progress.streak,
        longestStreak: progress.longestStreak,
        rewardsRedeemed: progress.rewardsRedeemed
      });
      
      let achievementsUnlocked = 0;
      
      for (const achievement of achievements.filter(a => a.isActive)) {
        const existingUserAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
        
        if (existingUserAchievement?.isCompleted) {
          console.log(`🏆 Achievement ${achievement.title} already completed, skipping`);
          continue;
        }
        
        let currentProgress = 0;
        switch (achievement.type) {
          case 'xp':
            currentProgress = progress.totalXP || 0;
            break;
          case 'level':
            const levelSystem = calculateLevelSystem(progress.totalXP || 0);
            currentProgress = levelSystem.currentLevel;
            break;
          case 'tasks':
            currentProgress = progress.totalTasksCompleted || 0;
            break;
          case 'streak':
            currentProgress = Math.max(progress.streak || 0, progress.longestStreak || 0);
            break;
          case 'checkin':
            currentProgress = progress.streak || 0;
            break;
          case 'redemptions':
            currentProgress = progress.rewardsRedeemed || 0;
            break;
          default:
            currentProgress = 0;
        }
        
        console.log(`🏆 Achievement ${achievement.title}: current=${currentProgress}, target=${achievement.target}, type=${achievement.type}`);
        
        const shouldComplete = currentProgress >= achievement.target;
        
        if (existingUserAchievement) {
          // Update existing user achievement
          if (existingUserAchievement.progress !== currentProgress || (shouldComplete && !existingUserAchievement.isCompleted)) {
            console.log(`🏆 Updating existing achievement ${achievement.title}: shouldComplete=${shouldComplete}`);
            
            await FirestoreService.updateUserAchievement(existingUserAchievement.id, {
              progress: currentProgress,
              isCompleted: shouldComplete,
              unlockedAt: shouldComplete && !existingUserAchievement.isCompleted ? new Date() : existingUserAchievement.unlockedAt || null,
              updatedAt: new Date()
            });
            
            if (shouldComplete && !existingUserAchievement.isCompleted) {
              achievementsUnlocked++;
              playAchievement();
              toast.success(`🏆 Conquista desbloqueada: ${achievement.title}!`, {
                duration: 6000
              });
              console.log(`✅ Achievement unlocked: ${achievement.title}`);
            }
          }
        } else {
          // Create new user achievement
          if (!achievement.id || typeof achievement.id !== 'string') {
            console.error('❌ Invalid achievement ID:', achievement);
            continue;
          }
          
          console.log(`🏆 Creating new user achievement for ${achievement.title}: shouldComplete=${shouldComplete}`);
          
          await FirestoreService.createUserAchievement({
            userId: childUid,
            achievementId: achievement.id,
            progress: currentProgress,
            isCompleted: shouldComplete,
            unlockedAt: shouldComplete ? new Date() : null
          });
          
          if (shouldComplete) {
            achievementsUnlocked++;
            playAchievement();
            toast.success(`🏆 Conquista desbloqueada: ${achievement.title}!`, {
              duration: 6000
            });
            console.log(`✅ New achievement unlocked: ${achievement.title}`);
          }
        }
      }
      
      if (achievementsUnlocked > 0) {
        console.log(`🏆 Total achievements unlocked: ${achievementsUnlocked}`);
      }
    } catch (error: any) {
      console.error('❌ DataContext: Erro ao verificar conquistas:', error);
    }
  }, [childUid, achievements, userAchievements, progress, playAchievement]);

  // Define all callback methods (must be defined before useMemo)
  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'ownerId' | 'createdBy' | 'createdAt' | 'updatedAt'>) => {
    if (!childUid || !user?.userId) throw new Error('Usuário não autenticado');
    
    const completeTaskData = {
      title: taskData.title,
      description: taskData.description || '',
      xp: taskData.xp || 10,
      gold: taskData.gold || 5,
      period: taskData.period,
      time: taskData.time,
      frequency: taskData.frequency || 'daily',
      active: taskData.active !== false,
      status: taskData.status || 'pending',
      ownerId: childUid,
      createdBy: user.userId
    };
    
    try {
      await FirestoreService.createTask(completeTaskData);
      toast.success('Tarefa criada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao criar tarefa:', error);
      toast.error('Erro ao criar tarefa');
      throw error;
    }
  }, [childUid, user?.userId]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      await FirestoreService.updateTask(taskId, updates);
      toast.success('Tarefa atualizada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
      throw error;
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await FirestoreService.deleteTask(taskId);
      toast.success('Tarefa excluída com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao excluir tarefa:', error);
      toast.error('Erro ao excluir tarefa');
      throw error;
    }
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    if (!childUid) throw new Error('Child UID não definido');
    
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Tarefa não encontrada');
      
      // Check if task is already completed today
      const today = new Date().toISOString().split('T')[0];
      if (task.status === 'done' && task.lastCompletedDate === today) {
        throw new Error('Task already completed today');
      }
      
      // Store previous progress for level up check
      const previousXP = progress.totalXP || 0;
      
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === taskId 
            ? { ...t, status: 'done', lastCompletedDate: today, updatedAt: new Date() }
            : t
        )
      );
      
      await FirestoreService.completeTaskWithRewards(
        taskId, 
        childUid, 
        task.xp || 10, 
        task.gold || 5
      );
      
      // Check for level up
      const newXP = previousXP + (task.xp || 10);
      const levelUpCheck = checkLevelUp(previousXP, newXP);
      
      if (levelUpCheck.leveledUp) {
        playLevelUp();
        toast.success(`🎉 LEVEL UP! Você alcançou o nível ${levelUpCheck.newLevel}!`, {
          duration: 5000
        });
        
        // Check for newly unlocked rewards
        const newlyUnlockedRewards = getRewardsUnlockedAtLevel(levelUpCheck.newLevel);
        if (newlyUnlockedRewards.length > 0) {
          setTimeout(() => {
            newlyUnlockedRewards.forEach(reward => {
              toast.success(`🎁 Nova recompensa desbloqueada: ${reward.title}!`);
            });
          }, 2000);
        }
      }
      
      // Trigger achievement check after task completion
      setTimeout(() => {
        checkAchievements();
      }, 1000);
      
      toast.success(`+${task.xp || 10} XP, +${task.gold || 5} Gold! Tarefa completada!`);
    } catch (error: any) {
      console.error('❌ Erro ao completar tarefa:', error);
      if (error.message === 'Task already completed today') {
        toast('⚠️ Tarefa já foi completada hoje!');
      } else {
        toast.error('Erro ao completar tarefa');
        // Revert optimistic update
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === taskId 
              ? { ...t, status: 'pending', lastCompletedDate: undefined }
              : t
          )
        );
      }
      throw error;
    }
  }, [childUid, tasks, progress.totalXP, playLevelUp, checkAchievements]);

  const addReward = useCallback(async (rewardData: Omit<Reward, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    if (!childUid) throw new Error('Child UID não definido');
    
    const completeRewardData = {
      title: rewardData.title,
      description: rewardData.description || '',
      category: rewardData.category || 'custom',
      costGold: rewardData.costGold || 50,
      emoji: rewardData.emoji || '🎁',
      requiredLevel: rewardData.requiredLevel || 1,
      active: rewardData.active !== false,
      ownerId: childUid
    };
    
    try {
      await FirestoreService.createReward(completeRewardData);
      toast.success('Recompensa criada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao criar recompensa:', error);
      toast.error('Erro ao criar recompensa');
      throw error;
    }
  }, [childUid]);

  const updateReward = useCallback(async (rewardId: string, updates: Partial<Reward>) => {
    try {
      await FirestoreService.updateReward(rewardId, updates);
      toast.success('Recompensa atualizada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao atualizar recompensa:', error);
      toast.error('Erro ao atualizar recompensa');
      throw error;
    }
  }, []);

  const deleteReward = useCallback(async (rewardId: string) => {
    try {
      await FirestoreService.deleteReward(rewardId);
      toast.success('Recompensa excluída com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao excluir recompensa:', error);
      toast.error('Erro ao excluir recompensa');
      throw error;
    }
  }, []);

  const redeemReward = useCallback(async (rewardId: string) => {
    if (!childUid) throw new Error('Child UID não definido');
    
    try {
      // Check if user has completed at least 4 tasks today using current tasks data
      const today = new Date().toISOString().split('T')[0];
      
      // Count completed tasks from current tasks data instead of relying on completion history
      const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // Filter tasks that should be available today based on frequency
      const todayTasks = tasks.filter(task => {
        if (!task.active) return false;
        
        switch (task.frequency) {
          case 'daily':
            return true;
          case 'weekday':
            return dayOfWeek >= 1 && dayOfWeek <= 5;
          case 'weekend':
            return dayOfWeek === 0 || dayOfWeek === 6;
          default:
            return true;
        }
      });
      
      // Count how many of today's tasks are completed
      const todayCompletions = todayTasks.filter(task => 
        task.status === 'done' && task.lastCompletedDate === today
      );
      
      console.log('🔍 DataContext: Daily tasks verification for redemption:', {
        today,
        totalActiveTasks: tasks.filter(t => t.active).length,
        todayTasks: todayTasks.length,
        completedToday: todayCompletions.length,
        completedTasks: todayCompletions.map(t => ({ id: t.id, title: t.title }))
      });
      
      if (todayCompletions.length < 4) {
        throw new Error(`Você precisa completar pelo menos 4 missões hoje para resgatar recompensas. Completadas: ${todayCompletions.length}/4`);
      }
      
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) throw new Error('Recompensa não encontrada');
      
      // Check if there's already a pending redemption for this reward
      const existingPendingRedemption = redemptions.find(r => 
        r.rewardId === rewardId && 
        r.status === 'pending'
      );
      
      if (existingPendingRedemption) {
        throw new Error('Você já tem um resgate pendente para esta recompensa');
      }
      
      if ((progress.availableGold || 0) < (reward.costGold || 0)) {
        throw new Error('Gold insuficiente');
      }
      
      await FirestoreService.redeemReward(childUid, rewardId, reward.costGold || 0);
      toast.success('🎁 Recompensa solicitada! Aguarde aprovação.');
    } catch (error: any) {
      console.error('❌ Erro ao resgatar recompensa:', error);
      if (error.message.includes('4 missões hoje')) {
        toast.error(error.message);
      } else if (error.message.includes('resgate pendente')) {
        toast.error('Você já tem um resgate pendente para esta recompensa!');
      } else if (error.message === 'Gold insuficiente') {
        toast.error('Você não tem Gold suficiente para esta recompensa');
      } else {
        toast.error('Erro ao resgatar recompensa');
      }
      throw error;
    }
  }, [childUid, rewards, progress.availableGold]);

  const approveRedemption = useCallback(async (redemptionId: string, approved: boolean) => {
    if (!user?.userId) throw new Error('Admin UID não definido');
    
    try {
      await FirestoreService.approveRedemption(redemptionId, approved, user.userId);
      toast.success(approved ? '✅ Resgate aprovado!' : '❌ Resgate rejeitado!');
    } catch (error: any) {
      console.error('❌ Erro ao processar resgate:', error);
      toast.error('Erro ao processar resgate');
      throw error;
    }
  }, [user?.userId]);

  const sendNotification = useCallback(async (title: string, message: string, type: Notification['type'] = 'general') => {
    if (!childUid) throw new Error('Child UID não definido');
    
    try {
      await FirestoreService.createNotification({
        toUserId: childUid,
        title,
        message,
        type,
        read: false
      });
      toast.success('📤 Notificação enviada para o Heitor!');
    } catch (error: any) {
      console.error('❌ Erro ao enviar notificação:', error);
      toast.error('Erro ao enviar notificação');
      throw error;
    }
  }, [childUid]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await FirestoreService.markNotificationAsRead(notificationId);
    } catch (error: any) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
    }
  }, []);

  const addFlashReminder = useCallback(async (reminderData: Omit<FlashReminder, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    if (!childUid || !user?.userId) throw new Error('Usuário não autenticado');
    
    const completeReminderData = {
      ...reminderData,
      ownerId: childUid,
      createdBy: user.userId
    };
    
    try {
      await FirestoreService.createFlashReminder(completeReminderData);
      toast.success('Lembrete Flash criado com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao criar lembrete:', error);
      toast.error('Erro ao criar lembrete');
      throw error;
    }
  }, [childUid, user?.userId]);

  const updateFlashReminder = useCallback(async (reminderId: string, updates: Partial<FlashReminder>) => {
    try {
      await FirestoreService.updateFlashReminder(reminderId, updates);
      toast.success('Lembrete Flash atualizado com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao atualizar lembrete:', error);
      toast.error('Erro ao atualizar lembrete');
      throw error;
    }
  }, []);

  const deleteFlashReminder = useCallback(async (reminderId: string) => {
    try {
      await FirestoreService.deleteFlashReminder(reminderId);
      toast.success('Lembrete Flash excluído com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao excluir lembrete:', error);
      toast.error('Erro ao excluir lembrete');
      throw error;
    }
  }, []);

  const addAchievement = useCallback(async (achievementData: Omit<Achievement, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    if (!childUid || !user?.userId) throw new Error('Usuário não autenticado');
    
    const completeAchievementData = {
      ...achievementData,
      ownerId: childUid,
      createdBy: user.userId
    };
    
    try {
      await FirestoreService.createAchievement(completeAchievementData);
      toast.success('Conquista criada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao criar conquista:', error);
      toast.error('Erro ao criar conquista');
      throw error;
    }
  }, [childUid, user?.userId]);

  const updateAchievement = useCallback(async (achievementId: string, updates: Partial<Achievement>) => {
    try {
      await FirestoreService.updateAchievement(achievementId, updates);
      toast.success('Conquista atualizada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao atualizar conquista:', error);
      toast.error('Erro ao atualizar conquista');
      throw error;
    }
  }, []);

  const deleteAchievement = useCallback(async (achievementId: string) => {
    try {
      await FirestoreService.deleteAchievement(achievementId);
      toast.success('Conquista excluída com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao excluir conquista:', error);
      toast.error('Erro ao excluir conquista');
      throw error;
    }
  }, []);

  const updateSurpriseMissionSettings = useCallback(async (settings: Omit<SurpriseMissionConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await FirestoreService.updateSurpriseMissionConfig(settings, user?.userId || '');
      // Reload config inline to avoid circular dependency
      const config = await FirestoreService.getSurpriseMissionConfig();
      setSurpriseMissionConfig(config);
      toast.success('Configurações da Missão Surpresa atualizadas!');
    } catch (error: any) {
      console.error('❌ Erro ao atualizar configurações da missão surpresa:', error);
      toast.error('Erro ao atualizar configurações');
      throw error;
    }
  }, [user?.userId]);

  const completeSurpriseMission = useCallback(async (score: number, totalQuestions: number, xpEarned: number, goldEarned: number) => {
    if (!childUid) throw new Error('Child UID não definido');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await FirestoreService.markSurpriseMissionCompletedToday(childUid, today, {
        score,
        totalQuestions,
        xpEarned,
        goldEarned,
        completedAt: new Date()
      });
      
      // Store previous XP for level up check
      const previousXP = progress.totalXP || 0;
      const newTotalXP = (progress.totalXP || 0) + xpEarned;
      const newAvailableGold = (progress.availableGold || 0) + goldEarned;
      const newTotalGoldEarned = (progress.totalGoldEarned || 0) + goldEarned;
      
      await FirestoreService.updateUserProgress(childUid, {
        totalXP: newTotalXP,
        availableGold: newAvailableGold,
        totalGoldEarned: newTotalGoldEarned,
        updatedAt: new Date()
      });
      
      // Check for level up
      const levelUpCheck = checkLevelUp(previousXP, newTotalXP);
      if (levelUpCheck.leveledUp) {
        playLevelUp();
        toast.success(`🎉 LEVEL UP! Você alcançou o nível ${levelUpCheck.newLevel}!`, {
          duration: 5000
        });
      }
      
      setIsSurpriseMissionCompletedToday(true);
      await checkSurpriseMissionStatus();
      
      // Trigger achievement check
      setTimeout(() => {
        checkAchievements();
      }, 1000);
      
      toast.success(`🎯 Missão Surpresa completada! +${xpEarned} XP, +${goldEarned} Gold!`);
    } catch (error: any) {
      console.error('❌ Erro ao completar missão surpresa:', error);
      toast.error('Erro ao completar missão surpresa');
      throw error;
    }
  }, [childUid, progress.totalXP, progress.availableGold, progress.totalGoldEarned, playLevelUp, checkAchievements]);

  const claimAchievementReward = useCallback(async (userAchievementId: string) => {
    if (!childUid) throw new Error('Child UID não definido');
    if (!userAchievementId) throw new Error('User Achievement ID não definido');
    
    try {
      const userAchievement = userAchievements.find(ua => ua.id === userAchievementId);
      if (!userAchievement) {
        // If not found in local state, try to unlock the achievement first
        console.log('🏆 User achievement not found in local state, checking if it should be unlocked...');
        await checkAchievements();
        
        // Try again after checking achievements
        const updatedUserAchievement = userAchievements.find(ua => ua.id === userAchievementId);
        if (!updatedUserAchievement) {
          throw new Error('User achievement not found');
        }
        
        // If it's not completed yet, try to complete it
        if (!updatedUserAchievement.isCompleted) {
          const achievement = achievements.find(a => a.id === updatedUserAchievement.achievementId);
          if (achievement) {
            let currentProgress = 0;
            switch (achievement.type) {
              case 'xp':
                currentProgress = progress.totalXP || 0;
                break;
              case 'level':
                currentProgress = calculateLevelSystem(progress.totalXP || 0).currentLevel;
                break;
              case 'tasks':
                currentProgress = progress.totalTasksCompleted || 0;
                break;
              case 'streak':
                currentProgress = Math.max(progress.streak || 0, progress.longestStreak || 0);
                break;
              case 'checkin':
                currentProgress = progress.streak || 0;
                break;
              case 'redemptions':
                currentProgress = progress.rewardsRedeemed || 0;
                break;
            }
            
            if (currentProgress >= achievement.target) {
              // Complete the achievement
              await FirestoreService.updateUserAchievement(userAchievementId, {
                progress: currentProgress,
                isCompleted: true,
                unlockedAt: new Date(),
                updatedAt: new Date()
              });
              
              playAchievement();
              toast.success(`🏆 Conquista desbloqueada: ${achievement.title}!`, {
                duration: 6000
              });
            } else {
              throw new Error('Achievement requirements not met yet');
            }
          }
        }
      }
      
      const achievement = achievements.find(a => a.id === userAchievement.achievementId);
      if (!achievement) {
        throw new Error('Achievement not found');
      }
      
      if (userAchievement.rewardClaimed) {
        throw new Error('Achievement reward already claimed');
      }
      
      if (!userAchievement.isCompleted) {
        throw new Error('Achievement not completed yet');
      }
      
      await FirestoreService.updateUserAchievement(userAchievementId, {
        rewardClaimed: true,
        claimedAt: new Date(),
        updatedAt: new Date()
      });
      
      const newTotalXP = (progress.totalXP || 0) + achievement.xpReward;
      const newAvailableGold = (progress.availableGold || 0) + achievement.goldReward;
      const newTotalGoldEarned = (progress.totalGoldEarned || 0) + achievement.goldReward;
      
      await FirestoreService.updateUserProgress(childUid, {
        totalXP: newTotalXP,
        availableGold: newAvailableGold,
        totalGoldEarned: newTotalGoldEarned,
        updatedAt: new Date()
      });
      
      toast.success(`🏆 Conquista resgatada! +${achievement.xpReward} XP, +${achievement.goldReward} Gold!`, {
        duration: 5000
      });
    } catch (error: any) {
      console.error('❌ Erro ao resgatar recompensa da conquista:', error);
      if (error.message === 'Achievement reward already claimed') {
        toast.error('Esta recompensa já foi resgatada!');
      } else {
        toast.error('Erro ao resgatar recompensa da conquista');
      }
      throw error;
    }
  }, [childUid, userAchievements, achievements, progress, playAchievement, checkAchievements]);

  const adjustUserXP = useCallback(async (amount: number) => {
    if (!childUid) throw new Error('Child UID não definido');
    
    try {
      await FirestoreService.ensureUserProgress(childUid);
      
      const previousXP = progress.totalXP || 0;
      const newTotalXP = Math.max(0, (progress.totalXP || 0) + amount);
      
      const levelUpCheck = checkLevelUp(previousXP, newTotalXP);
      
      await FirestoreService.updateUserProgress(childUid, {
        totalXP: newTotalXP,
        level: calculateLevelSystem(newTotalXP).currentLevel
      });
      
      if (levelUpCheck.leveledUp) {
        playLevelUp();
        toast.success(`🎉 LEVEL UP! Você alcançou o nível ${levelUpCheck.newLevel}!`, {
          duration: 5000
        });
      
        if (levelUpCheck.leveledUp) {
          const newlyUnlockedRewards = getRewardsUnlockedAtLevel(levelUpCheck.newLevel);
          if (newlyUnlockedRewards.length > 0) {
            setTimeout(() => {
              newlyUnlockedRewards.forEach(reward => {
                toast.success(`🎁 Nova recompensa desbloqueada: ${reward.title}!`);
              });
            }, 2000);
          }
        }
      }
      
      // Trigger achievement check after XP adjustment
      setTimeout(() => {
        checkAchievements();
      }, 500);
      
      toast.success(`${amount > 0 ? '+' : ''}${amount} XP aplicado!`);
    } catch (error: any) {
      console.error('❌ Erro ao ajustar XP:', error);
      toast.error('Erro ao ajustar XP');
      throw error;
    }
  }, [childUid, progress.totalXP, playLevelUp, checkAchievements]);

  const adjustUserGold = useCallback(async (amount: number) => {
    if (!childUid) throw new Error('Child UID não definido');
    
    try {
      await FirestoreService.ensureUserProgress(childUid);
      
      const newAvailableGold = Math.max(0, (progress.availableGold || 0) + amount);
      const updates: Partial<UserProgress> = {
        availableGold: newAvailableGold
      };
      
      if (amount > 0) {
        updates.totalGoldEarned = (progress.totalGoldEarned || 0) + amount;
      }
      
      await FirestoreService.updateUserProgress(childUid, updates);
      toast.success(`${amount > 0 ? '+' : ''}${amount} Gold aplicado!`);
    } catch (error: any) {
      console.error('❌ Erro ao ajustar Gold:', error);
      toast.error('Erro ao ajustar Gold');
      throw error;
    }
  }, [childUid, progress.availableGold, progress.totalGoldEarned]);

  const resetUserData = useCallback(async () => {
    if (!childUid) throw new Error('Child UID não definido');
    
    try {
      await FirestoreService.completeUserReset(childUid);
      toast.success('🔄 Reset completo realizado! Todos os dados foram apagados.');
    } catch (error: any) {
      console.error('❌ Erro ao resetar dados:', error);
      toast.error('Erro ao resetar dados');
      throw error;
    }
  }, [childUid]);

  const createTestData = useCallback(async () => {
    if (!childUid || !user?.userId) throw new Error('Usuário não autenticado');
    
    try {
      await FirestoreService.createTestData(childUid, user.userId);
      toast.success('🎯 Dados de teste criados com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao criar dados de teste:', error);
      toast.error('Erro ao criar dados de teste');
      throw error;
    }
  }, [childUid, user?.userId]);

  const getCalendarMonth = useCallback((year: number, month: number): CalendarDay[] => {
    return new Promise(async (resolve) => {
      if (!childUid) {
        resolve([]);
        return;
      }
      
      try {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const calendarDays: CalendarDay[] = [];
        
        // Get completion data for the entire month
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const completionHistory = await FirestoreService.getTaskCompletionHistory(childUid, monthStart, monthEnd);
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dateString = date.toISOString().split('T')[0];
          
          // Get completions for this specific day
          const dayCompletions = completionHistory.filter(completion => completion.date === dateString);
          
          // Get tasks that were completed on this day from current tasks list
          const dayTasksFromCurrent = tasks.filter(task => 
            task.status === 'done' && 
            task.lastCompletedDate === dateString
          );
          
          // Combine both sources for comprehensive data
          const allDayTasks = [...dayCompletions.map(completion => ({
            id: completion.taskId,
            title: completion.taskTitle,
            xp: completion.xpEarned,
            gold: completion.goldEarned,
            completedAt: completion.completedAt
          })), ...dayTasksFromCurrent.map(task => ({
            id: task.id,
            title: task.title,
            xp: task.xp || 10,
            gold: task.gold || 5,
            completedAt: date
          }))];
          
          // Remove duplicates based on task ID
          const uniqueTasks = allDayTasks.filter((task, index, self) => 
            index === self.findIndex(t => t.id === task.id)
          );
          
          const tasksCompleted = uniqueTasks.length;
          const totalTasks = tasks.filter(task => task.active).length;
          const pointsEarned = uniqueTasks.reduce((sum, task) => sum + (task.xp || 0), 0);
          
          let status: CalendarDay['status'] = 'future';
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          date.setHours(0, 0, 0, 0);
          
          if (date < today) {
            if (tasksCompleted >= totalTasks && totalTasks > 0) {
              status = 'completed';
            } else if (tasksCompleted > 0) {
              status = 'partial';
            } else {
              status = 'missed';
            }
          } else if (date.getTime() === today.getTime()) {
            if (tasksCompleted >= totalTasks && totalTasks > 0) {
              status = 'completed';
            } else if (tasksCompleted > 0) {
              status = 'partial';
            } else {
              status = 'future';
            }
          }
          
          calendarDays.push({
            date: new Date(year, month, day),
            tasksCompleted,
            totalTasks,
            pointsEarned,
            status,
            tasks: uniqueTasks.map(task => ({
              id: task.id,
              title: task.title,
              points: task.xp || 0
            })) as any[]
          });
        }
        
        resolve(calendarDays);
      } catch (error) {
        console.error('❌ Error generating calendar month:', error);
        resolve([]);
      }
    });
  }, [tasks]);

  // Load surprise mission config
  const loadSurpriseMissionConfig = useCallback(async () => {
    if (!childUid) return;
    
    try {
      const config = await FirestoreService.getSurpriseMissionConfig();
      setSurpriseMissionConfig(config);
    } catch (error: any) {
      console.error('❌ Erro ao carregar configuração da missão surpresa:', error);
    }
  }, [childUid]);

  const checkSurpriseMissionStatus = useCallback(async () => {
    if (!childUid) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const isCompleted = await FirestoreService.checkSurpriseMissionCompletedToday(childUid, today);
      setIsSurpriseMissionCompletedToday(isCompleted);
      
      const history = await FirestoreService.getSurpriseMissionHistory(childUid, 30);
      setSurpriseMissionHistory(history);
    } catch (error: any) {
      // Handle index building error gracefully
      if (error.message?.includes('index is currently building') || 
          error.message?.includes('cannot be used yet') ||
          error.message?.includes('That index is currently building') ||
          error.code === 'failed-precondition') {
        console.log('⏳ Firestore index is still building, using default values...');
        setIsSurpriseMissionCompletedToday(false);
        setSurpriseMissionHistory([]);
        return;
      }
      
      console.error('❌ Erro ao verificar status da missão surpresa:', error);
    }
  }, [childUid]);

  // Initialize listeners when childUid changes
  useEffect(() => {
    // Prevent duplicate initialization
    if (!childUid || childUid === lastChildUid) {
      if (!childUid) {
        setTasks([]);
        setRewards([]);
        setRedemptions([]);
        setNotifications([]);
        setFlashReminders([]);
        setAchievements([]);
        setUserAchievements([]);
        setProgress({
          userId: '',
          level: 1,
          totalXP: 0,
          availableGold: 0,
          totalGoldEarned: 0,
          totalGoldSpent: 0,
          streak: 0,
          longestStreak: 0,
          rewardsRedeemed: 0,
          totalTasksCompleted: 0,
          lastActivityDate: new Date(),
          updatedAt: new Date()
        });
        setLoading(false);
        setListenersInitialized(false);
        setLastChildUid(null);
      }
      return;
    }

    console.log('🔥 DataContext: Setting up listeners for childUid:', childUid);
    setLoading(true);
    setListenersInitialized(false);
    setLastChildUid(childUid);

    let unsubscribeFunctions: (() => void)[] = [];

    const initializeData = async () => {
      try {
        // Cleanup any existing listeners first
        unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
        unsubscribeFunctions = [];

        console.log('🔄 DataContext: Initializing fresh listeners for:', childUid);

        // Check if child has data, create defaults if needed
        const hasProgress = await new Promise<boolean>((resolve) => {
          const unsubscribe = FirestoreService.subscribeToUserProgress(
            childUid,
            (progress) => {
              unsubscribe();
              resolve(!!progress);
            },
            () => {
              unsubscribe();
              resolve(false);
            }
          );
        });

        if (!hasProgress && user?.role === 'admin') {
          console.log('🔄 DataContext: Creating default data for child:', childUid);
          await FirestoreService.createDefaultData(childUid, user.userId);
        }

        // ⚡ DAILY RESET: Reset outdated tasks in Firestore on first load
        console.log('🔄 DataContext: Initiating daily task reset...');
        FirestoreService.resetOutdatedTasks(childUid).then(resetCount => {
          console.log(`✅ DataContext: Reset completed - ${resetCount} tasks were reset`);
        }).catch(error => {
          console.error('❌ DataContext: Error resetting outdated tasks:', error);
        });

        // Set up real-time listeners with error handling
        const unsubscribeTasks = FirestoreService.subscribeToUserTasks(
          childUid,
          (tasks) => {
            console.log('📝 DataContext: Tasks updated:', tasks.length);

            // ⚡ CLIENT-SIDE SAFETY: Reset task status locally if lastCompletedDate is not today
            // This is a fallback in case the Firestore reset didn't run
            const today = new Date().toISOString().split('T')[0];
            console.log(`📅 Today's date: ${today}`);

            // Log current task statuses
            tasks.forEach(task => {
              if (task.status === 'done') {
                console.log(`📋 Task "${task.title}": status=${task.status}, lastCompleted=${task.lastCompletedDate}, needsReset=${task.lastCompletedDate !== today}`);
              }
            });

            const resetTasks = tasks.map(task => {
              if (task.status === 'done' && task.lastCompletedDate !== today) {
                console.log(`🔄 CLIENT-SIDE RESET: "${task.title}" - last completed: ${task.lastCompletedDate}, today: ${today}`);

                // CRITICAL FIX: Also update Firestore to ensure persistence
                FirestoreService.updateTask(task.id, {
                  status: 'pending'
                }).catch(err => {
                  console.error(`❌ Failed to update task ${task.id} in Firestore:`, err);
                });

                return {
                  ...task,
                  status: 'pending' as const,
                };
              }
              return task;
            });

            const resetCount = resetTasks.filter((t, i) => t.status !== tasks[i].status).length;
            if (resetCount > 0) {
              console.log(`✅ Client-side reset applied to ${resetCount} tasks (also updating Firestore)`);
            } else {
              console.log('✓ No tasks needed client-side reset');
            }

            setTasks(resetTasks);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de tasks:', error);
            if (!error.message?.includes('index')) {
              setTasks([]);
            }
          }
        );
        unsubscribeFunctions.push(unsubscribeTasks);

        const unsubscribeRewards = FirestoreService.subscribeToUserRewards(
          childUid,
          (rewards) => {
            console.log('🎁 DataContext: Rewards updated:', rewards.length);
            setRewards(rewards);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de rewards:', error);
            if (!error.message?.includes('index')) {
              setRewards([]);
            }
          }
        );
        unsubscribeFunctions.push(unsubscribeRewards);

        const unsubscribeProgress = FirestoreService.subscribeToUserProgress(
          childUid,
          (progress) => {
            if (progress) {
              console.log('📊 DataContext: Progress updated:', {
                level: progress.level,
                totalXP: progress.totalXP,
                availableGold: progress.availableGold
              });
              setProgress(progress);
            }
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de progress:', error);
          }
        );
        unsubscribeFunctions.push(unsubscribeProgress);

        const unsubscribeRedemptions = FirestoreService.subscribeToUserRedemptions(
          childUid,
          (redemptions) => {
            console.log('💰 DataContext: Redemptions updated:', redemptions.length);
            setRedemptions(redemptions);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de redemptions:', error);
            if (!error.message?.includes('index')) {
              setRedemptions([]);
            }
          }
        );
        unsubscribeFunctions.push(unsubscribeRedemptions);

        const unsubscribeNotifications = FirestoreService.subscribeToUserNotifications(
          childUid,
          (notifications) => {
            console.log('🔔 DataContext: Notifications updated:', notifications.length);
            setNotifications(notifications);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de notifications:', error);
            if (!error.message?.includes('index')) {
              setNotifications([]);
            }
          }
        );
        unsubscribeFunctions.push(unsubscribeNotifications);

        const unsubscribeFlashReminders = FirestoreService.subscribeToUserFlashReminders(
          childUid,
          (flashReminders) => {
            console.log('⚡ DataContext: Flash reminders updated:', flashReminders.length);
            setFlashReminders(flashReminders);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de flash reminders:', error);
            if (!error.message?.includes('index')) {
              setFlashReminders([]);
            }
          }
        );
        unsubscribeFunctions.push(unsubscribeFlashReminders);

        const unsubscribeAchievements = FirestoreService.subscribeToUserAchievements(
          childUid,
          (achievements) => {
            console.log('🏆 DataContext: Achievements updated:', achievements.length);
            setAchievements(achievements);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de achievements:', error);
            if (!error.message?.includes('index')) {
              setAchievements([]);
            }
          }
        );
        unsubscribeFunctions.push(unsubscribeAchievements);

        const unsubscribeUserAchievements = FirestoreService.subscribeToUserAchievementProgress(
          childUid,
          (userAchievements) => {
            console.log('🎯 DataContext: User achievements updated:', userAchievements.length);
            setUserAchievements(userAchievements);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de user achievements:', error);
            if (error.message?.includes('index') || error.code === 'failed-precondition') {
              setUserAchievements([]);
            }
          }
        );
        unsubscribeFunctions.push(unsubscribeUserAchievements);

        setListenersInitialized(true);
        setLoading(false);

        // Load surprise mission config and status once after listeners are set
        setTimeout(async () => {
          try {
            await loadSurpriseMissionConfig();
            await checkSurpriseMissionStatus();
            
            // Process unprocessed days for daily penalties/bonuses
            if (childUid) {
              try {
                console.log('🔄 DataContext: Processing unprocessed days for daily penalties...');
                await FirestoreService.processUnprocessedDays(childUid);
                console.log('✅ DataContext: Daily processing completed');
              } catch (error) {
                console.error('❌ DataContext: Error in daily processing:', error);
              }
            }
            
            // Initial achievement check after all data is loaded
            if (achievements.length > 0) {
              setTimeout(() => {
                checkAchievements();
              }, 2000);
            }
          } catch (error) {
            console.error('❌ DataContext: Error loading additional data:', error);
          }
        }, 1000);

      } catch (error: any) {
        console.error('❌ DataContext: Erro ao inicializar dados:', error);
        setLoading(false);
        setListenersInitialized(false);
        
        if (error.code === 'permission-denied') {
          toast.error('❌ Acesso negado. Verifique as regras do Firestore.');
        } else if (error.code === 'failed-precondition') {
          toast.error('❌ Banco Firestore não configurado.');
        }
      }
    };

    initializeData();

    // Cleanup function
    return () => {
      console.log('🧹 DataContext: Cleaning up listeners for:', childUid);
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      setListenersInitialized(false);
    };
  }, [childUid, user?.userId, user?.role]);

  // Remove the old useEffect that was causing duplicate listeners
  // The old useEffect has been replaced with the optimized version above

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<DataContextType>(() => ({
    tasks,
    rewards,
    progress,
    redemptions,
    notifications,
    flashReminders,
    achievements,
    userAchievements,
    surpriseMissionConfig,
    isSurpriseMissionCompletedToday,
    surpriseMissionHistory,
    loading,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    addReward,
    updateReward,
    deleteReward,
    redeemReward,
    approveRedemption,
    sendNotification,
    markNotificationAsRead,
    addFlashReminder,
    updateFlashReminder,
    deleteFlashReminder,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    checkAchievements,
    claimAchievementReward,
    loadSurpriseMissionConfig,
    updateSurpriseMissionSettings,
    completeSurpriseMission,
    adjustUserXP,
    adjustUserGold,
    resetUserData,
    createTestData,
    getCalendarMonth,
  }), [
    tasks,
    rewards,
    progress,
    redemptions,
    notifications,
    flashReminders,
    achievements,
    userAchievements,
    surpriseMissionConfig,
    isSurpriseMissionCompletedToday,
    surpriseMissionHistory,
    loading,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    addReward,
    updateReward,
    deleteReward,
    redeemReward,
    approveRedemption,
    sendNotification,
    markNotificationAsRead,
    addFlashReminder,
    updateFlashReminder,
    deleteFlashReminder,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    checkAchievements,
    claimAchievementReward,
    loadSurpriseMissionConfig,
    updateSurpriseMissionSettings,
    completeSurpriseMission,
    adjustUserXP,
    adjustUserGold,
    resetUserData,
    createTestData,
    getCalendarMonth
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};