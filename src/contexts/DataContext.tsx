import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Task, Reward, UserProgress, RewardRedemption, Notification, CalendarDay, Achievement, UserAchievement, FlashReminder } from '../types';
import { FirestoreService } from '../services/firestoreService';
import { checkLevelUp } from '../utils/levelSystem';
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
  const [loading, setLoading] = useState(true);

  // Initialize listeners when childUid changes
  useEffect(() => {
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
      return;
    }

    console.log('🔥 DataContext: Setting up listeners for childUid:', childUid);
    setLoading(true);

    const initializeData = async () => {
      try {
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

        // Set up real-time listeners
        const unsubscribeTasks = FirestoreService.subscribeToUserTasks(
          childUid,
          (tasks) => {
            console.log('🔥 DataContext: Tasks received:', tasks.length);
            setTasks(tasks);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de tasks:', error);
          }
        );

        const unsubscribeRewards = FirestoreService.subscribeToUserRewards(
          childUid,
          (rewards) => {
            console.log('🔥 DataContext: Rewards received:', rewards.length);
            setRewards(rewards);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de rewards:', error);
          }
        );

        const unsubscribeProgress = FirestoreService.subscribeToUserProgress(
          childUid,
          (progress) => {
            if (progress) {
              console.log('🔥 DataContext: Progress received:', progress);
              
              // Store previous progress for achievement checking
              const previousProgress = { ...progress };
              
              setProgress(progress);
              
              // Trigger achievement check after progress update
              setTimeout(() => {
                console.log('🏆 Auto-triggering achievement check after progress update');
                checkAchievements();
              }, 1000);
            }
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de progress:', error);
          }
        );

        const unsubscribeRedemptions = FirestoreService.subscribeToUserRedemptions(
          childUid,
          (redemptions) => {
            console.log('✅ DataContext: Redemptions received:', redemptions.length);
            setRedemptions(redemptions);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de redemptions:', error);
            // Don't throw error for index issues - they should be resolved now
            if (error.message?.includes('index')) {
              console.warn('⚠️ Index ainda sendo criado para redemptions. Aguarde alguns minutos.');
            }
          }
        );

        const unsubscribeNotifications = FirestoreService.subscribeToUserNotifications(
          childUid,
          (notifications) => {
            console.log('✅ DataContext: Notifications received:', notifications.length);
            setNotifications(notifications);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de notifications:', error);
          }
        );

        const unsubscribeFlashReminders = FirestoreService.subscribeToUserFlashReminders(
          childUid,
          (flashReminders) => {
            console.log('✅ DataContext: Flash reminders received:', flashReminders.length);
            setFlashReminders(flashReminders);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de flash reminders:', error);
            // Don't throw error for index issues - they should be resolved now
            if (error.message?.includes('index')) {
              console.warn('⚠️ Index ainda sendo criado para flashReminders. Aguarde alguns minutos.');
            }
          }
        );

        const unsubscribeAchievements = FirestoreService.subscribeToUserAchievements(
          childUid,
          (achievements) => {
            console.log('✅ DataContext: Achievements received:', achievements.length);
            setAchievements(achievements);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de achievements:', error);
          }
        );

        const unsubscribeUserAchievements = FirestoreService.subscribeToUserAchievementProgress(
          childUid,
          (userAchievements) => {
            console.log('✅ DataContext: User achievements received:', userAchievements.length);
            setUserAchievements(userAchievements);
          },
          (error) => {
            console.error('❌ DataContext: Erro no listener de user achievements:', error);
            // Handle index building errors gracefully
            if (error.message?.includes('index') || error.code === 'failed-precondition') {
              console.warn('⚠️ Index para userAchievements ainda sendo construído. Aguarde alguns minutos.');
              // Set empty array while index is building
              setUserAchievements([]);
            } else {
              console.error('❌ Erro crítico no listener de user achievements:', error);
            }
          }
        );

        setLoading(false);

        // Cleanup function
        return () => {
          unsubscribeTasks();
          unsubscribeRewards();
          unsubscribeProgress();
          unsubscribeRedemptions();
          unsubscribeNotifications();
          unsubscribeFlashReminders();
          unsubscribeAchievements();
          unsubscribeUserAchievements();
        };
      } catch (error: any) {
        console.error('❌ DataContext: Erro ao inicializar dados:', error);
        setLoading(false);
        
        if (error.code === 'permission-denied') {
          toast.error('❌ Acesso negado. Verifique as regras do Firestore.');
        } else if (error.code === 'failed-precondition') {
          toast.error('❌ Banco Firestore não configurado.');
        }
      }
    };

    const cleanup = initializeData();
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, [childUid, user?.userId, user?.role]);

  // Task methods
  const addTask = async (taskData: Omit<Task, 'id' | 'ownerId' | 'createdBy' | 'createdAt' | 'updatedAt'>) => {
    if (!childUid || !user?.userId) throw new Error('Usuário não autenticado');
          toast('⚠️ Tarefa já foi completada hoje! Será renovada amanhã.', {
            duration: 4000,
            style: {
              background: '#10B981',
              color: '#FFFFFF',
            },
          });
    const completeTaskData = {
      ...taskData,
      ownerId: childUid,
      createdBy: user.userId,
      status: 'pending'
    };
    
    console.log('🔥 DataContext: Creating task with data:', completeTaskData);
    
    try {
      await FirestoreService.createTask(completeTaskData);
      toast.success('Tarefa criada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao criar tarefa:', error);
      if (error.code === 'permission-denied') {
        console.error('🚨 PERMISSION DENIED - Task Creation:', {
          childUid,
          adminUid: user.userId,
          userRole: user.role,
          taskData: { ...taskData, ownerId: childUid, createdBy: user.userId }
        });
        toast.error('❌ Permissão negada ao criar tarefa. Verifique se você é admin.');
      } else {
        toast.error('Erro ao criar tarefa');
      }
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await FirestoreService.updateTask(taskId, updates);
      toast.success('Tarefa atualizada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await FirestoreService.deleteTask(taskId);
      toast.success('Tarefa excluída com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao excluir tarefa:', error);
      toast.error('Erro ao excluir tarefa');
      throw error;
    }
  };

  const completeTask = async (taskId: string) => {
    if (!childUid) throw new Error('Child UID não definido');
    
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Tarefa não encontrada');
      
      // Optimistic UI update - immediately mark task as done
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === taskId 
            ? { ...t, status: 'done', updatedAt: new Date() }
            : t
        )
      );
      
      console.log('🔥 DataContext: Completing task with subcollection approach:', {
        taskId,
        childUid,
        xp: task.xp,
        gold: task.gold,
        userRole: user?.role
      });
      
      await FirestoreService.completeTaskWithRewards(
        taskId, 
        childUid, 
        task.xp || 10, 
        task.gold || 5
      );
      
      // Check for achievements after task completion
      setTimeout(() => {
        checkAchievements();
      }, 1000);
      
      toast.success(`+${task.xp || 10} XP, +${task.gold || 5} Gold! Tarefa completada!`);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.error('❌ Erro ao completar tarefa:', error);
        console.error('🚨 PERMISSION DENIED - Task Completion:', {
          taskId,
          childUid,
          userRole: user?.role,
          userUid: user?.userId,
          errorMessage: error.message
        });
        toast.error('❌ Permissão negada ao completar tarefa. Verifique as regras do Firestore.');
        // Revert optimistic update on permission error
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === taskId 
              ? { ...t, status: 'pending' }
              : t
          )
        );
      } else if (error.message === 'Task already completed today') {
        // Task is already completed in database, keep UI state as 'done'
        toast('⚠️ Tarefa já foi completada hoje!');
      } else {
        console.error('❌ Erro ao completar tarefa:', error);
        toast.error('Erro ao completar tarefa');
        // Revert optimistic update on other errors
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === taskId 
              ? { ...t, status: 'pending' }
              : t
          )
        );
      }
      throw error;
    }
  };

  // Reward methods
  const addReward = async (rewardData: Omit<Reward, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    if (!childUid) throw new Error('Child UID não definido');
    
    const completeRewardData = {
      title: rewardData.title,
      description: rewardData.description || '',
      category: rewardData.category || 'custom',
      costGold: rewardData.costGold || 50,
      emoji: rewardData.emoji || '🎁',
      requiredLevel: rewardData.requiredLevel || 1,
      active: rewardData.active !== false, // Default to true
      ownerId: childUid
    };
    
    console.log('🔥 DataContext: Creating reward with data:', completeRewardData);
    
    try {
      await FirestoreService.createReward(completeRewardData);
      toast.success('Recompensa criada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao criar recompensa:', error);
      if (error.code === 'permission-denied') {
        console.error('🚨 PERMISSION DENIED - Reward Creation:', {
          childUid,
          adminUid: user?.userId,
          userRole: user?.role,
          rewardData: { ...rewardData, ownerId: childUid }
        });
        toast.error('❌ Permissão negada ao criar recompensa. Verifique se você é admin.');
      } else {
        toast.error('Erro ao criar recompensa');
      }
      throw error;
    }
  };

  const updateReward = async (rewardId: string, updates: Partial<Reward>) => {
    try {
      await FirestoreService.updateReward(rewardId, updates);
      toast.success('Recompensa atualizada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao atualizar recompensa:', error);
      toast.error('Erro ao atualizar recompensa');
      throw error;
    }
  };

  const deleteReward = async (rewardId: string) => {
    try {
      await FirestoreService.deleteReward(rewardId);
      toast.success('Recompensa excluída com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao excluir recompensa:', error);
      toast.error('Erro ao excluir recompensa');
      throw error;
    }
  };

  const redeemReward = async (rewardId: string) => {
    if (!childUid) throw new Error('Child UID não definido');
    
    try {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) throw new Error('Recompensa não encontrada');
      
      if ((progress.availableGold || 0) < (reward.costGold || 0)) {
        throw new Error('Gold insuficiente');
      }
      
      await FirestoreService.redeemReward(childUid, rewardId, reward.costGold || 0);
      
      // Check for redemption-based achievements
      setTimeout(() => {
        checkAchievements();
      }, 1000);
      
      toast.success('🎁 Recompensa solicitada! Aguarde aprovação.');
    } catch (error: any) {
      console.error('❌ Erro ao resgatar recompensa:', error);
      if (error.message === 'Gold insuficiente') {
        toast.error('Você não tem Gold suficiente para esta recompensa');
      } else {
        toast.error('Erro ao resgatar recompensa');
      }
      throw error;
    }
  };

  // Redemption methods
  const approveRedemption = async (redemptionId: string, approved: boolean) => {
    if (!user?.userId) throw new Error('Admin UID não definido');
    
    try {
      await FirestoreService.approveRedemption(redemptionId, approved, user.userId);
      toast.success(approved ? '✅ Resgate aprovado!' : '❌ Resgate rejeitado!');
    } catch (error: any) {
      console.error('❌ Erro ao processar resgate:', error);
      toast.error('Erro ao processar resgate');
      throw error;
    }
  };

  // Notification methods
  const sendNotification = async (title: string, message: string, type: Notification['type'] = 'general') => {
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
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await FirestoreService.markNotificationAsRead(notificationId);
    } catch (error: any) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
    }
  };

  // Flash Reminder methods
  const addFlashReminder = async (reminderData: Omit<FlashReminder, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
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
  };

  const updateFlashReminder = async (reminderId: string, updates: Partial<FlashReminder>) => {
    try {
      await FirestoreService.updateFlashReminder(reminderId, updates);
      toast.success('Lembrete Flash atualizado com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao atualizar lembrete:', error);
      toast.error('Erro ao atualizar lembrete');
      throw error;
    }
  };

  const deleteFlashReminder = async (reminderId: string) => {
    try {
      await FirestoreService.deleteFlashReminder(reminderId);
      toast.success('Lembrete Flash excluído com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao excluir lembrete:', error);
      toast.error('Erro ao excluir lembrete');
      throw error;
    }
  };

  // Achievement methods
  const addAchievement = async (achievementData: Omit<Achievement, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
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
  };

  const updateAchievement = async (achievementId: string, updates: Partial<Achievement>) => {
    try {
      await FirestoreService.updateAchievement(achievementId, updates);
      toast.success('Conquista atualizada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao atualizar conquista:', error);
      toast.error('Erro ao atualizar conquista');
      throw error;
    }
  };

  const deleteAchievement = async (achievementId: string) => {
    try {
      await FirestoreService.deleteAchievement(achievementId);
      toast.success('Conquista excluída com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao excluir conquista:', error);
      toast.error('Erro ao excluir conquista');
      throw error;
    }
  };

  const checkAchievements = async () => {
    if (!childUid) return;
    
    try {
      console.log('🏆 Checking achievements for user:', childUid);
      console.log('🏆 Current progress:', progress);
      console.log('🏆 Available achievements:', achievements.length);
      
      // Check each active achievement
      for (const achievement of achievements.filter(a => a.isActive)) {
        const existingUserAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
        
        // Skip if already completed
        if (existingUserAchievement?.isCompleted) {
          continue;
        }
        
        // Calculate current progress
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
        
        console.log(`🏆 Achievement "${achievement.title}": ${currentProgress}/${achievement.target}`);
        
        // Check if achievement should be completed
        const shouldComplete = currentProgress >= achievement.target;
        
        if (existingUserAchievement) {
          // Update existing progress
          if (existingUserAchievement.progress !== currentProgress || (shouldComplete && !existingUserAchievement.isCompleted)) {
            await FirestoreService.updateUserAchievement(existingUserAchievement.id, {
              progress: currentProgress,
              isCompleted: shouldComplete,
              unlockedAt: shouldComplete && !existingUserAchievement.isCompleted ? new Date() : existingUserAchievement.unlockedAt,
              updatedAt: new Date()
            });
            
            if (shouldComplete && !existingUserAchievement.isCompleted) {
              console.log(`🏆 Achievement completed: ${achievement.title}`);
              toast.success(`🏆 Conquista desbloqueada: ${achievement.title}!`, {
                duration: 6000
              });
            }
          }
        } else {
          // Create new user achievement if achievement ID is valid
          if (!achievement.id || typeof achievement.id !== 'string') {
            console.error('❌ Invalid achievement ID:', achievement);
            continue;
          }
          
          await FirestoreService.createUserAchievement({
            userId: childUid,
            achievementId: achievement.id,
            progress: currentProgress,
            isCompleted: shouldComplete,
            rewardClaimed: false,
            unlockedAt: shouldComplete ? new Date() : undefined
          });
          
          if (shouldComplete) {
            console.log(`🏆 New achievement completed: ${achievement.title}`);
            toast.success(`🏆 Conquista desbloqueada: ${achievement.title}!`, {
              duration: 6000
            });
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao verificar conquistas:', error);
      // Don't show error toast for index building issues
      if (!error.message?.includes('index')) {
        toast.error('Erro ao verificar conquistas');
      }
    }
  };

  const claimAchievementReward = async (userAchievementId: string) => {
    if (!childUid) throw new Error('Child UID não definido');
    if (!userAchievementId) throw new Error('User Achievement ID não definido');
    
    try {
      console.log('🏆 Claiming achievement reward:', { userAchievementId, childUid });
      
      // Find the user achievement and corresponding achievement
      const userAchievement = userAchievements.find(ua => ua.id === userAchievementId);
      if (!userAchievement) {
        throw new Error('User achievement not found');
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
      
      // Update user achievement to mark reward as claimed
      await FirestoreService.updateUserAchievement(userAchievementId, {
        rewardClaimed: true,
        claimedAt: new Date(),
        updatedAt: new Date()
      });
      
      // Add XP and Gold to user progress
      const newTotalXP = (progress.totalXP || 0) + achievement.xpReward;
      const newAvailableGold = (progress.availableGold || 0) + achievement.goldReward;
      const newTotalGoldEarned = (progress.totalGoldEarned || 0) + achievement.goldReward;
      
      await FirestoreService.updateUserProgress(childUid, {
        totalXP: newTotalXP,
        availableGold: newAvailableGold,
        totalGoldEarned: newTotalGoldEarned,
        updatedAt: new Date()
      });
      
      console.log('🏆 Achievement reward claimed successfully:', {
        achievement: achievement.title,
        xpReward: achievement.xpReward,
        goldReward: achievement.goldReward,
        newTotalXP,
        newAvailableGold
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
  };

  // Progress methods
  const adjustUserXP = async (amount: number) => {
    if (!childUid) throw new Error('Child UID não definido');
    
    try {
      await FirestoreService.ensureUserProgress(childUid);
      
      const previousXP = progress.totalXP || 0;
      const newTotalXP = Math.max(0, (progress.totalXP || 0) + amount);
      
      // Check for level up using new system
      const levelUpCheck = checkLevelUp(previousXP, newTotalXP);
      
      await FirestoreService.updateUserProgress(childUid, {
        totalXP: newTotalXP,
        level: levelUpCheck.newLevel
      });
      
      if (levelUpCheck.leveledUp) {
        toast.success(`🎉 LEVEL UP! Você alcançou o nível ${levelUpCheck.newLevel}!`, {
          duration: 5000
        });
      
      // Check for newly unlocked rewards
      if (levelUpCheck.leveledUp) {
        const newlyUnlockedRewards = getRewardsUnlockedAtLevel(levelUpCheck.newLevel);
        if (newlyUnlockedRewards.length > 0) {
          setTimeout(() => {
            newlyUnlockedRewards.forEach(reward => {
              toast.success(`🎁 Nova recompensa desbloqueada: ${reward.title}!`);
            });
          }, 2000); // Show after level up animation
        }
      }
      }
      
      toast.success(`${amount > 0 ? '+' : ''}${amount} XP aplicado!`);
    } catch (error: any) {
      console.error('❌ Erro ao ajustar XP:', error);
      toast.error('Erro ao ajustar XP');
      throw error;
    }
  };

  const adjustUserGold = async (amount: number) => {
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
  };

  const resetUserData = async () => {
    if (!childUid) throw new Error('Child UID não definido');
    
    try {
      await FirestoreService.completeUserReset(childUid);
      
      toast.success('🔄 Reset completo realizado! Todos os dados foram apagados.');
    } catch (error: any) {
      console.error('❌ Erro ao resetar dados:', error);
      toast.error('Erro ao resetar dados');
      throw error;
    }
  };

  const createTestData = async () => {
    if (!childUid || !user?.userId) throw new Error('Usuário não autenticado');
    
    try {
      await FirestoreService.createTestData(childUid, user.userId);
      toast.success('🎯 Dados de teste criados com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao criar dados de teste:', error);
      toast.error('Erro ao criar dados de teste');
      throw error;
    }
  };

  // Utility methods
  const getCalendarMonth = (year: number, month: number): CalendarDay[] => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarDays: CalendarDay[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayTasks = tasks.filter(task => 
        task.status === 'done' && 
        task.updatedAt.toDateString() === date.toDateString()
      );
      
      const tasksCompleted = dayTasks.length;
      const totalTasks = tasks.filter(task => task.active).length;
      const pointsEarned = dayTasks.reduce((sum, task) => sum + (task.xp || 0), 0);
      
      let status: CalendarDay['status'] = 'future';
      if (date < new Date()) {
        if (tasksCompleted === totalTasks && totalTasks > 0) {
          status = 'completed';
        } else if (tasksCompleted > 0) {
          status = 'partial';
        } else {
          status = 'missed';
        }
      }
      
      calendarDays.push({
        date,
        tasksCompleted,
        totalTasks,
        pointsEarned,
        status,
        tasks: dayTasks
      });
    }
    
    return calendarDays;
  };

  const value: DataContextType = {
    tasks,
    rewards,
    progress,
    redemptions,
    notifications,
    flashReminders,
    achievements,
    userAchievements,
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
    adjustUserXP,
    adjustUserGold,
    resetUserData,
    createTestData,
    getCalendarMonth
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};