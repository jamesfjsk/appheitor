import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useSound } from './SoundContext';
import { useVacation } from './VacationContext';
import { Task, Reward, UserProgress, RewardRedemption, Notification, CalendarDay, Achievement, UserAchievement, FlashReminder, SurpriseMissionConfig, DailySurpriseMissionStatus, Note } from '../types';
import { FirestoreService } from '../services/firestoreService';
import { checkLevelUp, calculateLevelSystem, emitMinerLevelUp } from '../utils/levelSystem';
import { addDays, getTodayBrazil, nowBrazil } from '../utils/clock';
import { DAY_CHANGED_EVENT } from './ClockContext';
import { getErrorMessage, getErrorCode } from '../utils/errors';
import toast from 'react-hot-toast';
import { useOffline } from './OfflineContext';
import { applyVillageStats, getVillage, repairLot } from '../services/villageService';
import { getSettings } from '../services/settingsService';
import { DEFAULT_ECONOMY, DEFAULT_MODULES, DEFAULT_VILLAGE_SETTINGS } from '../config/village';
import { computeTaskLoot, xpWithBoots } from '../services/village/loot';
import { MATERIAL_LABELS } from '../config/englishBase';
import { dueTasksOn, periodAllowedAt } from '../services/village/schedule';
import type { EconomySettings, ModuleSettings, Period, VillageSettings } from '../types/village';
import { bumpChallenge } from '../services/challengesService';
import { applyWeeklyInterest } from '../services/goalsService';

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
  notes: Note[];
  loading: boolean;

  // Task methods
  addTask: (task: Omit<Task, 'id' | 'ownerId' | 'createdBy' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  completeLateTask: (taskId: string) => Promise<void>;

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
  addFlashReminder: (reminder: Omit<FlashReminder, 'id' | 'ownerId' | 'createdBy' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateFlashReminder: (reminderId: string, updates: Partial<FlashReminder>) => Promise<void>;
  deleteFlashReminder: (reminderId: string) => Promise<void>;

  // Achievement methods
  addAchievement: (achievement: Omit<Achievement, 'id' | 'ownerId' | 'createdBy' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAchievement: (achievementId: string, updates: Partial<Achievement>) => Promise<void>;
  deleteAchievement: (achievementId: string) => Promise<void>;
  checkAchievements: () => Promise<void>;
  claimAchievementReward: (userAchievementId: string) => Promise<void>;

  // Surprise Mission methods
  loadSurpriseMissionConfig: () => Promise<void>;
  updateSurpriseMissionSettings: (settings: Omit<SurpriseMissionConfig, 'id' | 'lastUpdatedBy' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  completeSurpriseMission: (score: number, totalQuestions: number, xpEarned: number, goldEarned: number) => Promise<void>;

  // Note methods
  addNote: (note: Omit<Note, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;

  // Progress methods
  adjustUserXP: (amount: number) => Promise<void>;
  adjustUserGold: (amount: number) => Promise<void>;

  // Utility methods
  getCalendarMonth: (year: number, month: number) => Promise<CalendarDay[]>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
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
  const { applyXP: vacationApplyXP, applyGold: vacationApplyGold, isActive: vacationActive } = useVacation();
  const { isOffline } = useOffline();
  
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
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Prevent duplicate listeners and optimize re-renders
  const [, setListenersInitialized] = useState(false);
  const [lastChildUid, setLastChildUid] = useState<string | null>(null);
  const [lastResetDate, setLastResetDate] = useState<string>(getTodayBrazil());

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
          case 'level': {
            const levelSystem = calculateLevelSystem(progress.totalXP || 0);
            currentProgress = levelSystem.currentLevel;
            break;
          }
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
              toast.success(`Conquista desbloqueada: ${achievement.title}`, {
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
            rewardClaimed: false,
            unlockedAt: shouldComplete ? new Date() : null
          });
          
          if (shouldComplete) {
            achievementsUnlocked++;
            playAchievement();
            toast.success(`Conquista desbloqueada: ${achievement.title}`, {
              duration: 6000
            });
            console.log(`✅ New achievement unlocked: ${achievement.title}`);
          }
        }
      }
      
      if (achievementsUnlocked > 0) {
        console.log(`🏆 Total achievements unlocked: ${achievementsUnlocked}`);
      }
    } catch (error) {
      console.error('❌ DataContext: Erro ao verificar conquistas:', error);
    }
  }, [childUid, achievements, userAchievements, progress, playAchievement]);

  // Define all callback methods (must be defined before useMemo)
  const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'ownerId' | 'createdBy' | 'createdAt' | 'updatedAt'>) => {
    if (!childUid || !user?.userId) throw new Error('Usuário não autenticado');
    
    const completeTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: taskData.title,
      description: taskData.description || '',
      xp: Math.trunc(taskData.origin === 'child' ? (taskData.xp || 5) : (taskData.xp || 10)),
      gold: taskData.origin === 'child' ? 0 : (taskData.gold ?? 5),
      period: taskData.period,
      frequency: taskData.frequency || 'daily',
      active: taskData.active !== false,
      status: taskData.status || 'pending',
      ownerId: childUid,
      createdBy: user.userId,
    };
    if (taskData.time) completeTaskData.time = taskData.time;
    if (taskData.optional === true) completeTaskData.optional = true;
    if (taskData.origin) completeTaskData.origin = taskData.origin;
    if (taskData.date) completeTaskData.date = taskData.date;
    
    try {
      await FirestoreService.createTask(completeTaskData);
      toast.success('Tarefa criada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao criar tarefa:', error);
      toast.error('Erro ao criar tarefa');
      throw error;
    }
  }, [childUid, user?.userId]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      await FirestoreService.updateTask(taskId, updates);
      toast.success('Tarefa atualizada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
      throw error;
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await FirestoreService.deleteTask(taskId);
      toast.success('Tarefa excluída com sucesso!');
    } catch (error) {
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
      
      const today = getTodayBrazil();
      if (task.status === 'done' && task.lastCompletedDate === today) {
        throw new Error('Task already completed today');
      }

      if (isOffline) {
        toast.error('Sem internet: a missão não foi salva');
        throw new Error('offline');
      }

      const hour = nowBrazil().hour;
      const [village, economyRaw, villageSetRaw, modulesRaw] = await Promise.all([
        getVillage(childUid),
        getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>),
        getSettings('village', DEFAULT_VILLAGE_SETTINGS as unknown as Record<string, unknown>),
        getSettings('modules', DEFAULT_MODULES as unknown as Record<string, unknown>),
      ]);
      const economy = economyRaw as unknown as EconomySettings;
      const villageSet = villageSetRaw as unknown as VillageSettings;
      const modules = modulesRaw as unknown as ModuleSettings;
      if (!periodAllowedAt(task.period, hour, economy)) {
        const abre = task.period === 'afternoon' ? economy.periodStartHours.afternoon : economy.periodStartHours.evening;
        toast.error(`Abre às ${abre}h`);
        throw new Error('PERIOD_LOCKED');
      }

      const previousXP = progress.totalXP || 0;
      const byPeriod: Record<Period, number> = { morning: 0, afternoon: 0, evening: 0 };
      for (const t of tasks) {
        if (t.id === taskId) continue;
        if (t.status === 'done' && t.lastCompletedDate === today) byPeriod[t.period] += 1;
      }
      const effectsOn = villageSet.effectsEnabled && modules.effects !== false;
      const loot = computeTaskLoot({
        period: task.period,
        gear: village.gear,
        completionsTodayByPeriod: byPeriod,
        settings: economy,
        effectsEnabled: effectsOn,
      });

      const baseXP = task.xp ?? 10;
      const baseGold = task.gold ?? 5;
      const xpReward = xpWithBoots(vacationApplyXP(baseXP), village.gear, effectsOn);
      const goldReward = vacationApplyGold(baseGold);

      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId
            ? { ...t, status: 'done', lastCompletedDate: today, updatedAt: new Date() }
            : t
        )
      );

      const focus = village.plan.date === today && village.plan.focusTaskId === taskId;
      await FirestoreService.completeTaskWithRewards(
        taskId,
        childUid,
        xpReward,
        goldReward,
        loot.qty > 0 ? loot : undefined,
        { focus }
      );

      if (loot.qty > 0) {
        const extra = loot.qty > (economy.materialsPerTask || 1);
        toast.success(`+${loot.qty} ${MATERIAL_LABELS[loot.material]}${extra ? ' · picareta' : ''}`);
      }

      try {
        await bumpChallenge(childUid, 'tasks_count', 1);
      } catch (e) {
        console.warn('desafio tasks_count', e);
      }

      try {
        const deltas: Record<string, number> = { missionsDone: 1 };
        if (task.period === 'morning' && hour < 9) deltas.morningEarly = 1;
        if (focus) deltas.focusBlocks = 1;
        const ids = await applyVillageStats(childUid, deltas);
        if (ids.includes('primeira_picaretada')) {
          toast.success('Primeira picaretada · +10 XP, +1 madeira');
        } else if (ids.length) {
          toast.success('Conquista nova na Torre');
        }
        window.dispatchEvent(new CustomEvent('village-event', { detail: { kind: 'task_done' } }));
      } catch (e) {
        console.warn('stats da vila', e);
      }

      try {
        const streakResult = await FirestoreService.updateStreak(childUid);
        try {
          await bumpChallenge(childUid, 'streak_days', streakResult.streak, true);
        } catch (e) {
          console.warn('desafio streak_days', e);
        }

        if (streakResult.streakIncreased) {
          setTimeout(() => {
            toast.success(`Sequência de ${streakResult.streak} dias`, {
              duration: 4000,
              icon: undefined
            });
          }, 1000);
        }

        if (streakResult.streakReset) {
          setTimeout(() => {
            toast('Sequência zerada. Hoje começa uma nova.', {
              duration: 4000
            });
          }, 1000);
        }
      } catch (error) {
        console.error('❌ Error updating streak:', error);
      }

      const newXP = previousXP + xpReward;
      const levelUpCheck = checkLevelUp(previousXP, newXP);

      if (levelUpCheck.leveledUp) {
        playLevelUp();
        toast.success(`Nível ${levelUpCheck.newLevel} alcançado`, {
          duration: 5000
        });
        emitMinerLevelUp(levelUpCheck);

        const newlyUnlockedRewards = rewards.filter(r => r.active && (r.requiredLevel || 1) === levelUpCheck.newLevel);
        if (newlyUnlockedRewards.length > 0) {
          setTimeout(() => {
            newlyUnlockedRewards.forEach(reward => {
              toast.success(`Nova recompensa liberada: ${reward.title}`);
            });
          }, 2000);
        }
      }

      setTimeout(() => {
        checkAchievements();
      }, 1500);

      const shownQty = loot.qty > 0 && task.optional === true ? loot.qty * 2 : loot.qty;
      const matLabel = shownQty > 0 ? `, +${shownQty} ${loot.material}` : '';
      const goldLabel = goldReward > 0 ? `+${goldReward} gold` : 'sem gold';
      toast.success(`${goldLabel}${matLabel}, +${xpReward} XP`);

      try {
        if ((village.cracks || []).length > 0) {
          const dueNow = dueTasksOn(tasks, today);
          const doneNow = dueNow.filter((t) => {
            if (t.id === taskId) return true;
            const full = tasks.find((x) => x.id === t.id);
            return full?.status === 'done' && full.lastCompletedDate === today;
          }).length;
          if (doneNow >= dueNow.length) {
            const refund = await repairLot(childUid, addDays(today, -1));
            window.dispatchEvent(new CustomEvent('miner-repaired', {
              detail: { gold: refund, lots: village.cracks || [] },
            }));
            toast.success(refund > 0 ? `Lote consertado: +${refund} gold` : 'Lote consertado');
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg && !msg.includes('já foi feito') && !msg.includes('Faça todas')) {
          console.warn('conserto automático', e);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao completar tarefa:', error);
      const msg = getErrorMessage(error);
      if (msg === 'Task already completed today') {
        toast('Missão já feita hoje. Volta amanhã.');
        return;
      } else if (msg === 'offline' || msg === 'PERIOD_LOCKED') {
        return;
      } else {
        toast.error(msg === 'Essa extra não é de hoje' ? msg : 'Sem internet: a missão não foi salva');
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
  }, [childUid, tasks, rewards, progress.totalXP, playLevelUp, checkAchievements, vacationApplyXP, vacationApplyGold, isOffline]);

  const completeLateTask = useCallback(async (taskId: string) => {
    if (!childUid) throw new Error('Child UID não definido');
    const task = tasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada');
    try {
      await FirestoreService.completeTaskWithRewards(taskId, childUid, task.xp ?? 10, task.gold ?? 5, undefined, { late: true });
      toast.success('Missão recuperada (metade do gold, sem material)');
      try {
        await applyVillageStats(childUid, { recoveries: 1 });
      } catch (e) {
        console.warn('stats recuperação', e);
      }
    } catch (error) {
      const msg = getErrorMessage(error);
      toast.error(msg === 'Missão já recuperada' ? msg : (msg || 'Não deu para recuperar'));
      throw error;
    }
  }, [childUid, tasks]);

  const addReward = useCallback(async (rewardData: Omit<Reward, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    if (!childUid) throw new Error('Child UID não definido');
    
    const completeRewardData = {
      title: rewardData.title,
      description: rewardData.description || '',
      category: rewardData.category || 'custom',
      costGold: rewardData.costGold || 50,
      emoji: rewardData.emoji || 'gift',
      requiredLevel: rewardData.requiredLevel || 1,
      active: rewardData.active !== false,
      ownerId: childUid,
      goalOnly: rewardData.goalOnly === true,
    };
    
    try {
      await FirestoreService.createReward(completeRewardData);
      toast.success('Recompensa criada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao criar recompensa:', error);
      toast.error('Erro ao criar recompensa');
      throw error;
    }
  }, [childUid]);

  const updateReward = useCallback(async (rewardId: string, updates: Partial<Reward>) => {
    try {
      await FirestoreService.updateReward(rewardId, updates);
      toast.success('Recompensa atualizada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao atualizar recompensa:', error);
      toast.error('Erro ao atualizar recompensa');
      throw error;
    }
  }, []);

  const deleteReward = useCallback(async (rewardId: string) => {
    try {
      await FirestoreService.deleteReward(rewardId);
      toast.success('Recompensa excluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao excluir recompensa:', error);
      toast.error('Erro ao excluir recompensa');
      throw error;
    }
  }, []);

  const redeemReward = useCallback(async (rewardId: string) => {
    if (!childUid) throw new Error('Child UID não definido');

    try {
      console.log('🔄 DataContext: Starting reward redemption process...', { rewardId, childUid });

      // Check if user has completed at least 5 tasks today using current tasks data
      const today = getTodayBrazil();
      const economy = await getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>) as unknown as EconomySettings;
      const due = dueTasksOn(tasks, today);
      const dueIds = new Set(due.map((t) => t.id));
      const todayCompletions = tasks.filter((task) =>
        dueIds.has(task.id) && task.status === 'done' && task.lastCompletedDate === today
      );
      const minTasks = Math.min(economy.redeemMinTasks ?? 5, Math.max(1, due.length));

      if (todayCompletions.length < minTasks) {
        throw new Error(`Você precisa completar pelo menos ${minTasks} missões hoje para resgatar recompensas. Completadas: ${todayCompletions.length}/${minTasks}`);
      }

      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) throw new Error('Recompensa não encontrada');

      console.log('🎁 DataContext: Reward details:', {
        rewardId: reward.id,
        title: reward.title,
        costGold: reward.costGold,
        availableGold: progress.availableGold
      });

      // Check if there's already a pending redemption for this reward
      const existingPendingRedemption = redemptions.find(r =>
        r.rewardId === rewardId &&
        r.status === 'pending'
      );

      if (existingPendingRedemption) {
        throw new Error('Você já tem um resgate pendente para esta recompensa');
      }

      if ((progress.availableGold || 0) < (reward.costGold || 0)) {
        console.error('❌ DataContext: Insufficient gold!', {
          availableGold: progress.availableGold,
          costGold: reward.costGold
        });
        throw new Error('Gold insuficiente');
      }

      console.log('💰 DataContext: Gold check passed. Calling FirestoreService...');
      await FirestoreService.redeemReward(childUid, rewardId, reward.costGold || 0);
      console.log('✅ DataContext: Reward redemption completed successfully!');
      toast.success('Troca pedida. Aguarde a aprovação.');
    } catch (error) {
      console.error('❌ Erro ao resgatar recompensa:', error);
      const message = getErrorMessage(error);
      if (message.includes('5 missões hoje')) {
        toast.error(message);
      } else if (message.includes('resgate pendente')) {
        toast.error('Você já tem um resgate pendente para esta recompensa!');
      } else if (message === 'Gold insuficiente') {
        toast.error('Você não tem Gold suficiente para esta recompensa');
      } else {
        toast.error('Erro ao resgatar recompensa');
      }
      throw error;
    }
  }, [childUid, rewards, redemptions, tasks, progress.availableGold]);

  const approveRedemption = useCallback(async (redemptionId: string, approved: boolean) => {
    if (!user?.userId) throw new Error('Admin UID não definido');
    
    try {
      await FirestoreService.approveRedemption(redemptionId, approved, user.userId);
      toast.success(approved ? 'Troca aprovada.' : 'Troca recusada.');
    } catch (error) {
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
      toast.success('Notificação enviada para o Heitor.');
    } catch (error) {
      console.error('❌ Erro ao enviar notificação:', error);
      toast.error('Erro ao enviar notificação');
      throw error;
    }
  }, [childUid]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await FirestoreService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
    }
  }, []);

  const addFlashReminder = useCallback(async (reminderData: Omit<FlashReminder, 'id' | 'ownerId' | 'createdBy' | 'createdAt' | 'updatedAt'>) => {
    if (!childUid || !user?.userId) throw new Error('Usuário não autenticado');
    
    const completeReminderData = {
      ...reminderData,
      ownerId: childUid,
      createdBy: user.userId
    };
    
    try {
      await FirestoreService.createFlashReminder(completeReminderData);
      toast.success('Lembrete criado.');
    } catch (error) {
      console.error('❌ Erro ao criar lembrete:', error);
      toast.error('Erro ao criar lembrete');
      throw error;
    }
  }, [childUid, user?.userId]);

  const updateFlashReminder = useCallback(async (reminderId: string, updates: Partial<FlashReminder>) => {
    try {
      await FirestoreService.updateFlashReminder(reminderId, updates);
      toast.success('Lembrete atualizado.');
    } catch (error) {
      console.error('❌ Erro ao atualizar lembrete:', error);
      toast.error('Erro ao atualizar lembrete');
      throw error;
    }
  }, []);

  const deleteFlashReminder = useCallback(async (reminderId: string) => {
    try {
      await FirestoreService.deleteFlashReminder(reminderId);
      toast.success('Lembrete excluído.');
    } catch (error) {
      console.error('❌ Erro ao excluir lembrete:', error);
      toast.error('Erro ao excluir lembrete');
      throw error;
    }
  }, []);

  const addNote = useCallback(async (noteData: Omit<Note, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.userId) throw new Error('Usuário não autenticado');

    const completeNoteData = {
      ...noteData,
      ownerId: user.userId
    };

    try {
      await FirestoreService.createNote(completeNoteData);
      toast.success('Anotação criada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao criar anotação:', error);
      toast.error('Erro ao criar anotação');
      throw error;
    }
  }, [user?.userId]);

  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    try {
      await FirestoreService.updateNote(noteId, updates);
      toast.success('Anotação atualizada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao atualizar anotação:', error);
      toast.error('Erro ao atualizar anotação');
      throw error;
    }
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      await FirestoreService.deleteNote(noteId);
      toast.success('Anotação excluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao excluir anotação:', error);
      toast.error('Erro ao excluir anotação');
      throw error;
    }
  }, []);

  const addAchievement = useCallback(async (achievementData: Omit<Achievement, 'id' | 'ownerId' | 'createdBy' | 'createdAt' | 'updatedAt'>) => {
    if (!childUid || !user?.userId) throw new Error('Usuário não autenticado');
    
    const completeAchievementData = {
      ...achievementData,
      ownerId: childUid,
      createdBy: user.userId
    };
    
    try {
      await FirestoreService.createAchievement(completeAchievementData);
      toast.success('Conquista criada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao criar conquista:', error);
      toast.error('Erro ao criar conquista');
      throw error;
    }
  }, [childUid, user?.userId]);

  const updateAchievement = useCallback(async (achievementId: string, updates: Partial<Achievement>) => {
    try {
      await FirestoreService.updateAchievement(achievementId, updates);
      toast.success('Conquista atualizada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao atualizar conquista:', error);
      toast.error('Erro ao atualizar conquista');
      throw error;
    }
  }, []);

  const deleteAchievement = useCallback(async (achievementId: string) => {
    try {
      await FirestoreService.deleteAchievement(achievementId);
      toast.success('Conquista excluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao excluir conquista:', error);
      toast.error('Erro ao excluir conquista');
      throw error;
    }
  }, []);

  const updateSurpriseMissionSettings = useCallback(async (settings: Omit<SurpriseMissionConfig, 'id' | 'lastUpdatedBy' | 'createdAt' | 'updatedAt'>) => {
    try {
      await FirestoreService.updateSurpriseMissionConfig(settings, user?.userId || '');
      // Reload config inline to avoid circular dependency
      const config = await FirestoreService.getSurpriseMissionConfig();
      setSurpriseMissionConfig(config);
      toast.success('Configurações da Missão Surpresa atualizadas!');
    } catch (error) {
      console.error('❌ Erro ao atualizar configurações da missão surpresa:', error);
      toast.error('Erro ao atualizar configurações');
      throw error;
    }
  }, [user?.userId]);

  const completeSurpriseMission = useCallback(async (score: number, totalQuestions: number, xpEarned: number, goldEarned: number) => {
    if (!childUid) throw new Error('Child UID não definido');

    try {
      const today = getTodayBrazil();

      const finalXP = vacationApplyXP(xpEarned);
      const finalGold = vacationApplyGold(goldEarned);

      await FirestoreService.markSurpriseMissionCompletedToday(childUid, today, {
        score,
        totalQuestions,
        xpEarned: finalXP,
        goldEarned: finalGold,
        completedAt: new Date()
      });

      // Store previous XP for level up check
      const previousXP = progress.totalXP || 0;
      const newTotalXP = (progress.totalXP || 0) + finalXP;
      const newAvailableGold = (progress.availableGold || 0) + finalGold;
      const newTotalGoldEarned = (progress.totalGoldEarned || 0) + finalGold;

      await FirestoreService.updateUserProgress(childUid, {
        totalXP: newTotalXP,
        availableGold: newAvailableGold,
        totalGoldEarned: newTotalGoldEarned,
        updatedAt: new Date()
      });

      // Create gold transaction for surprise mission
      if (finalGold > 0) {
        await FirestoreService.createGoldTransaction(
          childUid,
          finalGold,
          'earned',
          'surprise_mission',
          `Missão Surpresa: ${score} de ${totalQuestions} acertos`,
          {
            metadata: {
              score,
              totalQuestions,
              xpEarned: finalXP,
              accuracy: Math.round((score / totalQuestions) * 100),
              date: today,
              vacationBonus: vacationActive
            }
          }
        );
      }

      // Check for level up
      const levelUpCheck = checkLevelUp(previousXP, newTotalXP);
      if (levelUpCheck.leveledUp) {
        playLevelUp();
        toast.success(`Nível ${levelUpCheck.newLevel} alcançado`, {
          duration: 5000
        });
        emitMinerLevelUp(levelUpCheck);
      }

      setIsSurpriseMissionCompletedToday(true);
      await checkSurpriseMissionStatus();

      // Trigger achievement check
      setTimeout(() => {
        checkAchievements();
      }, 1000);

      toast.success(
        vacationActive
          ? `Ferias em dobro! Missao Surpresa: +${finalXP} XP, +${finalGold} Gold!`
          : `Missão Surpresa concluída: +${finalXP} XP, +${finalGold} gold`
      );
    } catch (error) {
      console.error('❌ Erro ao completar missão surpresa:', error);
      toast.error('Erro ao completar missão surpresa');
      throw error;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- checkSurpriseMissionStatus is declared later in this component (would be a TDZ reference)
  }, [childUid, progress.totalXP, progress.availableGold, progress.totalGoldEarned, playLevelUp, checkAchievements, vacationApplyXP, vacationApplyGold, vacationActive]);

  const claimAchievementReward = useCallback(async (userAchievementId: string) => {
    if (!childUid) throw new Error('Child UID não definido');
    if (!userAchievementId) throw new Error('User Achievement ID não definido');
    
    try {
      let userAchievement = userAchievements.find(ua => ua.id === userAchievementId);
      if (!userAchievement) {
        // If not found in local state, try to unlock the achievement first
        console.log('🏆 User achievement not found in local state, checking if it should be unlocked...');
        await checkAchievements();
        
        // Try again after checking achievements
        const updatedUserAchievement = userAchievements.find(ua => ua.id === userAchievementId);
        if (!updatedUserAchievement) {
          throw new Error('User achievement not found');
        }
        userAchievement = updatedUserAchievement;
        
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
              toast.success(`Conquista desbloqueada: ${achievement.title}`, {
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

      // Create gold transaction for achievement reward
      if (achievement.goldReward > 0) {
        await FirestoreService.createGoldTransaction(
          childUid,
          achievement.goldReward,
          'earned',
          'achievement',
          `Conquista desbloqueada: ${achievement.title}`,
          {
            relatedId: achievement.id,
            relatedTitle: achievement.title,
            metadata: {
              xpReward: achievement.xpReward,
              type: achievement.type
            }
          }
        );
      }

      toast.success(`Recompensa resgatada: +${achievement.xpReward} XP, +${achievement.goldReward} gold`, {
        duration: 5000
      });
    } catch (error) {
      console.error('❌ Erro ao resgatar recompensa da conquista:', error);
      if (getErrorMessage(error) === 'Achievement reward already claimed') {
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
        toast.success(`Nível ${levelUpCheck.newLevel} alcançado`, {
          duration: 5000
        });
        emitMinerLevelUp(levelUpCheck);

        if (levelUpCheck.leveledUp) {
          const newlyUnlockedRewards = rewards.filter(r => r.active && (r.requiredLevel || 1) === levelUpCheck.newLevel);
          if (newlyUnlockedRewards.length > 0) {
            setTimeout(() => {
              newlyUnlockedRewards.forEach(reward => {
                toast.success(`Nova recompensa liberada: ${reward.title}`);
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
    } catch (error) {
      console.error('❌ Erro ao ajustar XP:', error);
      toast.error('Erro ao ajustar XP');
      throw error;
    }
  }, [childUid, rewards, progress.totalXP, playLevelUp, checkAchievements]);

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
    } catch (error) {
      console.error('❌ Erro ao ajustar Gold:', error);
      toast.error('Erro ao ajustar Gold');
      throw error;
    }
  }, [childUid, progress.availableGold, progress.totalGoldEarned]);

  const getCalendarMonth = useCallback(async (year: number, month: number): Promise<CalendarDay[]> => {
    if (!childUid) {
      return [];
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
          gold: task.gold ?? 5,
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
            xp: task.xp || 0
          })) as Task[]
        });
      }
      
      return calendarDays;
    } catch (error) {
      console.error('❌ Error generating calendar month:', error);
      return [];
    }
  }, [tasks, childUid]);

  // Load surprise mission config
  const loadSurpriseMissionConfig = useCallback(async () => {
    if (!childUid) return;
    
    try {
      const config = await FirestoreService.getSurpriseMissionConfig();
      setSurpriseMissionConfig(config);
    } catch (error) {
      console.error('❌ Erro ao carregar configuração da missão surpresa:', error);
    }
  }, [childUid]);

  const checkSurpriseMissionStatus = useCallback(async () => {
    if (!childUid) return;
    
    try {
      const today = getTodayBrazil();
      const isCompleted = await FirestoreService.checkSurpriseMissionCompletedToday(childUid, today);
      setIsSurpriseMissionCompletedToday(isCompleted);
      
      const history = await FirestoreService.getSurpriseMissionHistory(childUid, 30);
      setSurpriseMissionHistory(history);
    } catch (error) {
      // Handle index building error gracefully
      const message = getErrorMessage(error);
      if (message.includes('index is currently building') || 
          message.includes('cannot be used yet') ||
          message.includes('That index is currently building') ||
          getErrorCode(error) === 'failed-precondition') {
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

    // Capture user at the time of effect execution
    const currentUser = user;
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

        if (!hasProgress && currentUser?.role === 'admin') {
          console.log('🔄 DataContext: Creating default data for child:', childUid);
          await FirestoreService.createDefaultData(childUid, currentUser.userId);
        }

        // ⚡ DAILY PROCESSING: Process penalties/bonuses and reset tasks on first load
        console.log('🔄 DataContext: Initiating daily processing...');

        // First, check and reset streak if user was inactive
        FirestoreService.checkAndResetStreakIfNeeded(childUid)
          .then(() => {
            console.log('✅ DataContext: Streak check completed');

            // Then process any unprocessed daily summaries (penalties/bonuses)
            return FirestoreService.processUnprocessedDays(childUid);
          })
          .then(() => applyWeeklyInterest(childUid).catch(() => 0))
          .then(() => {
            console.log('✅ DataContext: Daily summaries processed');

            // Then reset outdated tasks
            return FirestoreService.resetOutdatedTasks(childUid);
          })
          .then(resetCount => {
            console.log(`✅ DataContext: Daily processing complete - ${resetCount} tasks reset`);
          })
          .catch(error => {
            console.error('❌ DataContext: Error in daily processing:', error);
          });

        // Set up real-time listeners with error handling
        const unsubscribeTasks = FirestoreService.subscribeToUserTasks(
          childUid,
          (tasks) => {
            console.log('📝 DataContext: Tasks updated:', tasks.length);

            // Na tela, uma missão só conta como feita se foi feita HOJE.
            // A persistência do reset é responsabilidade de resetOutdatedTasks
            // (na carga e na virada do dia), não do listener.
            const today = getTodayBrazil();
            setTasks(tasks.map(task =>
              task.status === 'done' && task.lastCompletedDate !== today
                ? { ...task, status: 'pending' as const }
                : task
            ));
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

        // Subscribe to notes (admin only)
        if (currentUser?.role === 'admin') {
          const unsubscribeNotes = FirestoreService.subscribeToNotes(
            currentUser.userId,
            (notes) => {
              setNotes(notes);
              console.log('📝 DataContext: Notes updated:', notes.length);
            }
          );
          unsubscribeFunctions.push(unsubscribeNotes);
        }

        setListenersInitialized(true);
        setLoading(false);

        // Load surprise mission config and status once after listeners are set
        setTimeout(async () => {
          try {
            await loadSurpriseMissionConfig();
            await checkSurpriseMissionStatus();

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

      } catch (error) {
        console.error('❌ DataContext: Erro ao inicializar dados:', error);
        setLoading(false);
        setListenersInitialized(false);
        
        const code = getErrorCode(error);
        if (code === 'permission-denied') {
          toast.error('❌ Acesso negado. Verifique as regras do Firestore.');
        } else if (code === 'failed-precondition') {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- listeners must be (re)created only when childUid changes; other values are read once at setup
  }, [childUid]);

  // ⚡ AUTOMATIC DAY CHANGE MONITOR
  // This useEffect checks every minute if the date has changed
  // and automatically resets tasks when a new day begins
  useEffect(() => {
    if (!childUid) return;

    const run = (currentDate: string) => {
      if (currentDate === lastResetDate) return;
      FirestoreService.processUnprocessedDays(childUid)
        .then(() => applyWeeklyInterest(childUid).catch(() => 0))
        .then(() => FirestoreService.resetOutdatedTasks(childUid))
        .then(() => FirestoreService.deactivateExpiredExtras(childUid).catch(() => 0))
        .then(() => {
          setLastResetDate(currentDate);
        })
        .catch((error) => {
          console.error('Erro ao processar novo dia', error);
        });
    };

    const onDay = () => run(getTodayBrazil());
    window.addEventListener(DAY_CHANGED_EVENT, onDay);

    const intervalId = setInterval(() => run(getTodayBrazil()), 60_000);
    const currentDate = getTodayBrazil();
    if (currentDate !== lastResetDate) setLastResetDate(currentDate);

    return () => {
      window.removeEventListener(DAY_CHANGED_EVENT, onDay);
      clearInterval(intervalId);
    };
  }, [childUid, lastResetDate]);

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
    notes,
    loading,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    completeLateTask,
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
    addNote,
    updateNote,
    deleteNote,
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
    notes,
    loading,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    completeLateTask,
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
    addNote,
    updateNote,
    deleteNote,
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
    getCalendarMonth
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};