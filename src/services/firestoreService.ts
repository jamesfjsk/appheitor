import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  increment,
  runTransaction,
  type FirestoreError,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { addDays, getTodayBrazil, getYesterdayBrazil, nowBrazil } from '../utils/clock';
import { format } from 'date-fns';
import { getLevelFromXP } from '../utils/levelSystem';
import { processPendingDays } from './dailyRulesService';
import { initialBaseDoc } from '../config/englishBase';
import { DEFAULT_ECONOMY } from '../config/village';
import { periodAllowedAt } from './village/schedule';
import { lateTaskReward, lateWindow } from './village/late';
import { getSettings } from './settingsService';
import { getVillage } from './villageService';
import type { EconomySettings } from '../types/village';
import type { Material } from '../types/english';
import {
  User,
  Task,
  Reward,
  UserProgress,
  RewardRedemption,
  Notification,
  Achievement,
  UserAchievement,
  FlashReminder,
  SurpriseMissionConfig,
  DailySurpriseMissionStatus,
  BirthdayEvent,
  GoldTransaction,
  DailyProgress,
  PunishmentMode,
  PunishmentTaskCompletion
} from '../types';

function omitUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as T;
}

function asDate(value: unknown): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? new Date(0) : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function mapGoldTransaction(id: string, data: Record<string, unknown>): GoldTransaction {
  return {
    id,
    userId: String(data.userId || ''),
    amount: Number(data.amount) || 0,
    type: data.type as GoldTransaction['type'],
    source: data.source as GoldTransaction['source'],
    description: String(data.description || ''),
    relatedId: data.relatedId as string | undefined,
    relatedTitle: data.relatedTitle as string | undefined,
    metadata: data.metadata as Record<string, unknown> | undefined,
    balanceBefore: Number(data.balanceBefore) || 0,
    balanceAfter: Number(data.balanceAfter) || 0,
    createdAt: asDate(data.createdAt),
    createdBy: data.createdBy as string | undefined,
  };
}

export class FirestoreService {
  // ========================================
  // 🔥 USER MANAGEMENT
  // ========================================

  static async ensureUserDocument(uid: string, email: string, role: 'admin' | 'child'): Promise<User> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          userId: uid,
          email: userData.email || email,
          displayName: userData.displayName || (role === 'admin' ? 'Pai' : 'Heitor'),
          role: userData.role || role,
          managedChildId: userData.managedChildId,
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
          lastLoginTimestamp: userData.lastLoginTimestamp?.toDate() || new Date()
        };
      }

      // Create new user document
      const newUserData = {
        email,
        displayName: role === 'admin' ? 'Pai' : 'Heitor',
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginTimestamp: serverTimestamp()
      };

      await setDoc(userRef, newUserData);
      
      return {
        userId: uid,
        email,
        displayName: role === 'admin' ? 'Pai' : 'Heitor',
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginTimestamp: new Date()
      };
    } catch (error) {
      console.error('❌ FirestoreService: Error ensuring user document:', error);
      throw error;
    }
  }

  static async ensureAdminChildLink(adminUid: string): Promise<string> {
    try {
      // First check if admin already has a managedChildId
      const adminDoc = await getDoc(doc(db, 'users', adminUid));
      if (adminDoc.exists() && adminDoc.data().managedChildId) {
        return adminDoc.data().managedChildId;
      }

      // Look for existing child user
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'child')
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      
      let childUid: string;
      
      if (!usersSnapshot.empty) {
        // Use existing child
        childUid = usersSnapshot.docs[0].id;
      } else {
        // Create default child user
        const childRef = doc(collection(db, 'users'));
        childUid = childRef.id;
        
        await setDoc(childRef, {
          email: 'heitor@flash.com',
          displayName: 'Heitor',
          role: 'child',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginTimestamp: serverTimestamp()
        });
      }

      // Update admin with child link
      await updateDoc(doc(db, 'users', adminUid), {
        managedChildId: childUid,
        updatedAt: serverTimestamp()
      });

      return childUid;
    } catch (error) {
      console.error('❌ FirestoreService: Error ensuring admin-child link:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 PROGRESS MANAGEMENT
  // ========================================

  static async ensureUserProgress(userId: string): Promise<UserProgress> {
    try {
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);

      if (progressDoc.exists()) {
        const data = progressDoc.data();
        console.log('✅ FirestoreService.ensureUserProgress: Document exists', {
          userId,
          totalXP: data.totalXP,
          availableGold: data.availableGold,
          totalGoldEarned: data.totalGoldEarned
        });
        return {
          userId,
          level: data.level || 1,
          totalXP: data.totalXP || 0,
          availableGold: data.availableGold || 0,
          totalGoldEarned: data.totalGoldEarned || 0,
          totalGoldSpent: data.totalGoldSpent || 0,
          streak: data.streak || 0,
          longestStreak: data.longestStreak || 0,
          rewardsRedeemed: data.rewardsRedeemed || 0,
          totalTasksCompleted: data.totalTasksCompleted || 0,
          lastActivityDate: data.lastActivityDate?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastDailySummaryProcessedDate: data.lastDailySummaryProcessedDate?.toDate()
        };
      }

      // Create default progress with merge to prevent accidental overwrites
      console.warn('⚠️ FirestoreService.ensureUserProgress: Document does NOT exist! Creating defaults with MERGE:', userId);
      const defaultProgress = {
        userId,
        level: 1,
        totalXP: 0,
        availableGold: 0,
        totalGoldEarned: 0,
        totalGoldSpent: 0,
        streak: 0,
        longestStreak: 0,
        rewardsRedeemed: 0,
        totalTasksCompleted: 0,
        lastActivityDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // CRITICAL: Use merge: true to prevent overwriting existing data in case of race conditions
      await setDoc(progressRef, defaultProgress, { merge: true });
      
      return {
        userId,
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
      };
    } catch (error) {
      console.error('❌ FirestoreService: Error ensuring user progress:', error);
      throw error;
    }
  }

  static async updateUserProgress(userId: string, updates: Partial<UserProgress>): Promise<void> {
    try {
      const progressRef = doc(db, 'progress', userId);
      await updateDoc(progressRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error updating user progress:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 TASK MANAGEMENT
  // ========================================

  static async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const taskRef = doc(collection(db, 'tasks'));
      const completeTaskData = {
        ...taskData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(taskRef, completeTaskData);
      return taskRef.id;
    } catch (error) {
      console.error('❌ FirestoreService: Error creating task:', error);
      throw error;
    }
  }

  static async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error updating task:', error);
      throw error;
    }
  }

  // ⚡ DAILY RESET: Reset tasks that were completed on previous days
  static async resetOutdatedTasks(userId: string): Promise<number> {
    try {
      const today = getTodayBrazil();

      const tasksQuery = query(
        collection(db, 'tasks'),
        where('ownerId', '==', userId),
        where('status', '==', 'done')
      );

      const tasksSnapshot = await getDocs(tasksQuery);
      const batch = writeBatch(db);
      let resetCount = 0;

      tasksSnapshot.docs.forEach(taskDoc => {
        const task = taskDoc.data() as Task;
        const needsReset = !task.lastCompletedDate || task.lastCompletedDate !== today;

        if (needsReset) {
          console.log(`🔄 Resetting task "${task.title}" - last completed: ${task.lastCompletedDate || 'UNDEFINED'}, today: ${today}`);
          batch.update(taskDoc.ref, {
            status: 'pending',
            updatedAt: serverTimestamp()
          });
          resetCount++;
        }
      });

      if (resetCount > 0) {
        await batch.commit();
        console.log(`✅ Reset ${resetCount} outdated tasks for user ${userId}`);
      }

      return resetCount;
    } catch (error) {
      console.error('❌ FirestoreService: Error resetting outdated tasks:', error);
      throw error;
    }
  }

  static async deleteTask(taskId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      console.error('❌ FirestoreService: Error deleting task:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 STREAK SYSTEM
  // ========================================

  // ========================================
  // 🔥 SEQUÊNCIA DE DIAS (STREAK)
  // Baseada em datas "YYYY-MM-DD" no fuso do Brasil, sem aritmética de horas.
  // Regra: primeira missão do dia conta o dia. Ontem contou -> +1. Antes de ontem -> volta a 1.
  // ========================================

  /** Data (Brasil) da última missão concluída, a partir do campo novo ou do timestamp antigo */
  private static lastStreakDate(data: Record<string, unknown>): string | null {
    if (typeof data.lastStreakDate === 'string' && data.lastStreakDate) return data.lastStreakDate;
    const legacy = data.lastActivityDate as { toDate?: () => Date } | undefined;
    const d = legacy?.toDate?.();
    return d ? nowBrazil(d.getTime()).date : null;
  }

  private static yesterdayString(): string {
    return getYesterdayBrazil().dateString;
  }

  static async updateStreak(userId: string): Promise<{
    streak: number;
    longestStreak: number;
    streakIncreased: boolean;
    streakReset: boolean;
  }> {
    try {
      const progressRef = doc(db, 'progress', userId);
      const today = getTodayBrazil();
      const yesterday = this.yesterdayString();
      let result = { streak: 1, longestStreak: 1, streakIncreased: true, streakReset: false };

      await runTransaction(db, async (tx) => {
        const progressDoc = await tx.get(progressRef);
        if (!progressDoc.exists()) {
          result = { streak: 1, longestStreak: 1, streakIncreased: true, streakReset: false };
          return;
        }
        const data = progressDoc.data();
        const currentStreak = data.streak || 0;
        const currentLongestStreak = data.longestStreak || 0;
        const last = this.lastStreakDate(data);
        let newStreak: number;
        let streakIncreased = false;
        let streakReset = false;
        if (last === today) {
          newStreak = Math.max(currentStreak, 1);
        } else if (last === yesterday && currentStreak > 0) {
          newStreak = currentStreak + 1;
          streakIncreased = true;
        } else {
          newStreak = 1;
          streakIncreased = true;
          streakReset = last !== null && last !== yesterday && currentStreak > 0;
        }
        const newLongestStreak = Math.max(currentLongestStreak, newStreak);
        tx.update(progressRef, {
          streak: newStreak,
          longestStreak: newLongestStreak,
          lastStreakDate: today,
          lastActivityDate: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        result = { streak: newStreak, longestStreak: newLongestStreak, streakIncreased, streakReset };
      });
      return result;
    } catch (error) {
      console.error('❌ FirestoreService: Error updating streak:', error);
      throw error;
    }
  }

  /** Ao abrir o app: se nem hoje nem ontem tiveram missão, a sequência volta a 0 */
  static async checkAndResetStreakIfNeeded(userId: string): Promise<void> {
    try {
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);
      if (!progressDoc.exists()) return;

      const data = progressDoc.data();
      const currentStreak = data.streak || 0;
      const last = this.lastStreakDate(data);
      if (!last || currentStreak === 0) return;

      const today = getTodayBrazil();
      const yesterday = this.yesterdayString();
      if (last !== today && last !== yesterday) {
        console.log('💔 Sequência zerada por inatividade. Última missão em', last);
        await updateDoc(progressRef, { streak: 0, updatedAt: serverTimestamp() });
      }
    } catch (error) {
      console.error('❌ FirestoreService: Error checking streak:', error);
    }
  }

  // ========================================
  // 🔥 TASK COMPLETION
  // ========================================

  static async completeTaskWithRewards(
    taskId: string,
    userId: string,
    xpReward: number,
    goldReward: number,
    loot?: { material: Material; qty: number },
    opts?: { late?: boolean; focus?: boolean }
  ): Promise<void> {
    try {
      const today = getTodayBrazil();
      const hour = nowBrazil().hour;
      const economy = await getSettings('economy', DEFAULT_ECONOMY as unknown as Record<string, unknown>) as unknown as EconomySettings;
      const village = await getVillage(userId);
      const late = opts?.late === true;
      const date = late ? addDays(today, -1) : today;
      if (late && !lateWindow(hour, economy)) {
        throw new Error('A janela de recuperar já fechou');
      }
      if (late) {
        const daily = await getDoc(doc(db, 'dailyProgress', `${userId}_${date}`));
        if (!daily.exists() || daily.data().summaryProcessed !== true) {
          throw new Error('Ontem ainda não fechou');
        }
      }
      const latePay = late ? lateTaskReward({ gold: goldReward, xp: xpReward }, economy) : null;
      const progressRef = doc(db, 'progress', userId);
      const taskRef = doc(db, 'tasks', taskId);
      const baseRef = doc(db, 'englishBase', userId);
      const now = new Date().toISOString();

      await runTransaction(db, async (tx) => {
        const taskDoc = await tx.get(taskRef);
        if (!taskDoc.exists()) throw new Error('Task not found');
        const taskData = taskDoc.data();
        if (taskData.status === 'proposed') throw new Error('Essa missão ainda não foi aprovada');
        if (taskData.lastCompletedDate === date) throw new Error('Task already completed today');
        if (!late && !periodAllowedAt(taskData.period || 'morning', hour, economy)) {
          throw new Error('PERIOD_LOCKED');
        }

        const progressDoc = await tx.get(progressRef);
        if (!progressDoc.exists()) throw new Error('Progress document not found');
        const baseDoc = await tx.get(baseRef);

        const childOwn = taskData.origin === 'child';
        let goldPay = latePay ? latePay.gold : goldReward;
        const xpPay = latePay ? latePay.xp : xpReward;
        if (childOwn) goldPay = 0;
        let lootPay = late ? undefined : loot;
        if (lootPay && lootPay.qty > 0) {
          let qty = lootPay.qty;
          if (taskData.optional === true) qty *= 2;
          if (opts?.focus && village.plan.date === today && village.plan.focusTaskId === taskId) qty *= 2;
          lootPay = { material: lootPay.material, qty };
        }

        const goldBefore = Number(progressDoc.data()?.availableGold) || 0;
        const goldAfter = goldBefore + goldPay;
        const taskTitle = taskData.title || 'Tarefa Sem Título';

        tx.update(taskRef, {
          status: 'done',
          lastCompletedDate: date,
          updatedAt: serverTimestamp(),
        });

        const completionRef = doc(collection(db, 'taskCompletions'));
        tx.set(completionRef, omitUndefined({
          taskId,
          userId,
          taskTitle,
          date,
          xpEarned: xpPay,
          goldEarned: goldPay,
          materialsEarned: lootPay && lootPay.qty > 0 ? { [lootPay.material]: lootPay.qty } : {},
          completedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          late: late || undefined,
          focus: opts?.focus === true || undefined,
        }));

        tx.update(progressRef, {
          totalXP: increment(xpPay),
          availableGold: goldAfter,
          totalGoldEarned: increment(Math.max(0, goldPay)),
          totalTasksCompleted: increment(1),
          updatedAt: serverTimestamp(),
        });

        if (lootPay && lootPay.qty > 0) {
          if (!baseDoc.exists()) {
            const initial = initialBaseDoc(userId, now);
            initial.materials[lootPay.material] = (initial.materials[lootPay.material] || 0) + lootPay.qty;
            tx.set(baseRef, initial);
          } else {
            tx.update(baseRef, {
              [`materials.${lootPay.material}`]: increment(lootPay.qty),
              updatedAt: now,
            });
          }
        } else if (!baseDoc.exists()) {
          tx.set(baseRef, initialBaseDoc(userId, now));
        }

        if (goldPay !== 0) {
          tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
            userId,
            amount: goldPay,
            type: 'earned' as const,
            source: late ? 'late_task' : 'task_completion',
            description: late ? `Missão recuperada: ${taskTitle}` : `Tarefa concluída: ${taskTitle}`,
            relatedId: taskId,
            relatedTitle: taskTitle,
            metadata: { xpEarned: xpPay, period: taskData.period, materialsEarned: lootPay ?? null, late, focus: opts?.focus === true },
            balanceBefore: goldBefore,
            balanceAfter: goldAfter,
            createdAt: serverTimestamp(),
          }));
        }
      });
      console.log('✅ Task completed with validated rewards:', { taskId, xpReward, goldReward, loot, late });
    } catch (error) {
      console.error('❌ FirestoreService: Error completing task with rewards:', error);
      throw error;
    }
  }

  static async revertTaskCompletion(taskId: string, date: string, adminUid: string): Promise<void> {
    if (date !== getTodayBrazil()) {
      throw new Error('Só dá para desfazer missão de hoje.');
    }
    const completions = await getDocs(
      query(collection(db, 'taskCompletions'), where('taskId', '==', taskId), where('date', '==', date))
    );
    const live = completions.docs.find((d) => d.data().reverted !== true);
    if (!live) throw new Error('Conclusão não encontrada');
    const data = live.data();
    const userId = String(data.userId || '');
    const xp = Number(data.xpEarned) || 0;
    const gold = Number(data.goldEarned) || 0;
    const materials = (data.materialsEarned || {}) as Record<string, number>;

    await runTransaction(db, async (tx) => {
      const completionRef = live.ref;
      const cSnap = await tx.get(completionRef);
      if (!cSnap.exists() || cSnap.data().reverted === true) return;
      const progressRef = doc(db, 'progress', userId);
      const taskRef = doc(db, 'tasks', taskId);
      const baseRef = doc(db, 'englishBase', userId);
      const pSnap = await tx.get(progressRef);
      const tSnap = await tx.get(taskRef);
      const bSnap = await tx.get(baseRef);
      const goldBefore = Number(pSnap.data()?.availableGold) || 0;
      const goldAfter = Math.max(0, goldBefore - gold);
      const xpNow = Math.max(0, (Number(pSnap.data()?.totalXP) || 0) - xp);

      tx.update(completionRef, { reverted: true, revertedBy: adminUid, revertedAt: serverTimestamp() });
      if (tSnap.exists() && tSnap.data().lastCompletedDate === date) {
        tx.update(taskRef, { status: 'pending', lastCompletedDate: '', updatedAt: serverTimestamp() });
      }
      if (pSnap.exists()) {
        tx.update(progressRef, {
          totalXP: xpNow,
          availableGold: goldAfter,
          totalTasksCompleted: increment(-1),
          updatedAt: serverTimestamp(),
        });
      }
      if (gold > 0) {
        tx.set(doc(collection(db, 'goldTransactions')), omitUndefined({
          userId,
          amount: goldAfter - goldBefore,
          type: 'refund' as const,
          source: 'task_reversal' as const,
          description: `Não foi feita: ${data.taskTitle || taskId}`,
          relatedId: taskId,
          relatedTitle: data.taskTitle,
          metadata: { date, reverted: true },
          balanceBefore: goldBefore,
          balanceAfter: goldAfter,
          createdAt: serverTimestamp(),
          createdBy: adminUid,
        }));
      }
      if (bSnap.exists()) {
        // Valor absoluto, nunca negativo (a criança pode já ter gasto o material devolvido)
        const current = (bSnap.data()?.materials || {}) as Record<string, unknown>;
        const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
        for (const [m, qty] of Object.entries(materials)) {
          if (typeof qty === 'number' && qty > 0) {
            const have = typeof current[m] === 'number' ? (current[m] as number) : 0;
            updates[`materials.${m}`] = Math.max(0, have - qty);
          }
        }
        tx.update(baseRef, updates);
      }
    });
  }

  // ========================================
  // 🔥 REWARD MANAGEMENT
  // ========================================

  static async createReward(rewardData: Omit<Reward, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const rewardRef = doc(collection(db, 'rewards'));
      const completeRewardData = {
        ...rewardData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(rewardRef, completeRewardData);
      return rewardRef.id;
    } catch (error) {
      console.error('❌ FirestoreService: Error creating reward:', error);
      throw error;
    }
  }

  static async updateReward(rewardId: string, updates: Partial<Reward>): Promise<void> {
    try {
      const rewardRef = doc(db, 'rewards', rewardId);
      await updateDoc(rewardRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error updating reward:', error);
      throw error;
    }
  }

  static async deleteReward(rewardId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'rewards', rewardId));
    } catch (error) {
      console.error('❌ FirestoreService: Error deleting reward:', error);
      throw error;
    }
  }

  static async redeemReward(userId: string, rewardId: string, costGold: number): Promise<void> {
    try {
      console.log('🔄 FirestoreService: Starting reward redemption...', { userId, rewardId, costGold });

      const batch = writeBatch(db);

      // Get reward details for transaction
      const rewardRef = doc(db, 'rewards', rewardId);
      const rewardDoc = await getDoc(rewardRef);
      const rewardTitle = rewardDoc.exists() ? rewardDoc.data().title : 'Recompensa';
      console.log('📦 FirestoreService: Reward details:', { rewardId, rewardTitle });

      // Create redemption record
      const redemptionRef = doc(collection(db, 'redemptions'));
      batch.set(redemptionRef, {
        userId,
        rewardId,
        costGold,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('📝 FirestoreService: Created redemption record:', redemptionRef.id);

      // Deduct gold from user
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);

      if (progressDoc.exists()) {
        const currentProgress = progressDoc.data();
        const currentGold = currentProgress.availableGold || 0;
        const newGold = Math.max(0, currentGold - costGold);

        console.log('💰 FirestoreService: Gold deduction:', {
          currentGold,
          costGold,
          newGold,
          willDeduct: currentGold - costGold
        });

        batch.update(progressRef, {
          availableGold: newGold,
          totalGoldSpent: (currentProgress.totalGoldSpent || 0) + costGold,
          updatedAt: serverTimestamp()
        });

        // Create gold transaction record
        const transactionRef = doc(collection(db, 'goldTransactions'));
        batch.set(transactionRef, {
          userId,
          amount: -costGold,
          type: 'spent',
          source: 'reward_redemption',
          description: `Resgate de recompensa: ${rewardTitle}`,
          relatedId: rewardId,
          relatedTitle: rewardTitle,
          metadata: { redemptionId: redemptionRef.id, status: 'pending' },
          balanceBefore: currentGold,
          balanceAfter: newGold,
          createdAt: serverTimestamp()
        });
        console.log('📊 FirestoreService: Created gold transaction record');
      } else {
        console.warn('⚠️ FirestoreService: Progress document not found for user:', userId);
      }

      console.log('💾 FirestoreService: Committing batch...');
      await batch.commit();
      console.log('✅ FirestoreService: Reward redemption completed successfully!');
    } catch (error) {
      console.error('❌ FirestoreService: Error redeeming reward:', error);
      throw error;
    }
  }

  static async approveRedemption(redemptionId: string, approved: boolean, approvedBy: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      const redemptionRef = doc(db, 'redemptions', redemptionId);
      const redemptionDoc = await getDoc(redemptionRef);
      
      if (!redemptionDoc.exists()) {
        throw new Error('Redemption not found');
      }
      
      const redemptionData = redemptionDoc.data();
      
      // Update redemption status
      batch.update(redemptionRef, {
        status: approved ? 'approved' : 'rejected',
        approvedBy,
        updatedAt: serverTimestamp()
      });

      // If rejected, refund the gold
      if (!approved) {
        const progressRef = doc(db, 'progress', redemptionData.userId);
        const progressDoc = await getDoc(progressRef);

        // Get reward details for transaction
        const rewardRef = doc(db, 'rewards', redemptionData.rewardId);
        const rewardDoc = await getDoc(rewardRef);
        const rewardTitle = rewardDoc.exists() ? rewardDoc.data().title : 'Recompensa';

        if (progressDoc.exists()) {
          const currentProgress = progressDoc.data();
          const currentGold = currentProgress.availableGold || 0;
          const newGold = currentGold + redemptionData.costGold;

          batch.update(progressRef, {
            availableGold: newGold,
            totalGoldSpent: Math.max(0, (currentProgress.totalGoldSpent || 0) - redemptionData.costGold),
            updatedAt: serverTimestamp()
          });

          // Create gold transaction record for refund
          const transactionRef = doc(collection(db, 'goldTransactions'));
          batch.set(transactionRef, {
            userId: redemptionData.userId,
            amount: redemptionData.costGold,
            type: 'refund',
            source: 'redemption_refund',
            description: `Reembolso de resgate rejeitado: ${rewardTitle}`,
            relatedId: redemptionData.rewardId,
            relatedTitle: rewardTitle,
            metadata: { redemptionId, rejectedBy: approvedBy },
            balanceBefore: currentGold,
            balanceAfter: newGold,
            createdAt: serverTimestamp(),
            createdBy: approvedBy
          });
        }
      } else {
        // If approved, increment rewardsRedeemed counter
        const progressRef = doc(db, 'progress', redemptionData.userId);
        const progressDoc = await getDoc(progressRef);
        
        if (progressDoc.exists()) {
          const currentProgress = progressDoc.data();
          batch.update(progressRef, {
            rewardsRedeemed: (currentProgress.rewardsRedeemed || 0) + 1,
            updatedAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('❌ FirestoreService: Error approving redemption:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 NOTIFICATION MANAGEMENT
  // ========================================

  static async createNotification(notificationData: Omit<Notification, 'id' | 'sentAt' | 'readAt'>): Promise<string> {
    try {
      const notificationRef = doc(collection(db, 'notifications'));
      const completeNotificationData = {
        ...notificationData,
        sentAt: serverTimestamp()
      };
      
      await setDoc(notificationRef, completeNotificationData);
      return notificationRef.id;
    } catch (error) {
      console.error('❌ FirestoreService: Error creating notification:', error);
      throw error;
    }
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error marking notification as read:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 FLASH REMINDER MANAGEMENT
  // ========================================

  static async createFlashReminder(reminderData: Omit<FlashReminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const reminderRef = doc(collection(db, 'flashReminders'));
      const completeReminderData = {
        ...reminderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(reminderRef, completeReminderData);
      return reminderRef.id;
    } catch (error) {
      console.error('❌ FirestoreService: Error creating flash reminder:', error);
      throw error;
    }
  }

  static async updateFlashReminder(reminderId: string, updates: Partial<FlashReminder>): Promise<void> {
    try {
      const reminderRef = doc(db, 'flashReminders', reminderId);
      await updateDoc(reminderRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error updating flash reminder:', error);
      throw error;
    }
  }

  static async deleteFlashReminder(reminderId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'flashReminders', reminderId));
    } catch (error) {
      console.error('❌ FirestoreService: Error deleting flash reminder:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 ACHIEVEMENT MANAGEMENT
  // ========================================

  static async createAchievement(achievementData: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const achievementRef = doc(collection(db, 'achievements'));
      const completeAchievementData = {
        ...achievementData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(achievementRef, completeAchievementData);
      return achievementRef.id;
    } catch (error) {
      console.error('❌ FirestoreService: Error creating achievement:', error);
      throw error;
    }
  }

  static async updateAchievement(achievementId: string, updates: Partial<Achievement>): Promise<void> {
    try {
      const achievementRef = doc(db, 'achievements', achievementId);
      await updateDoc(achievementRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error updating achievement:', error);
      throw error;
    }
  }

  static async deleteAchievement(achievementId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'achievements', achievementId));
    } catch (error) {
      console.error('❌ FirestoreService: Error deleting achievement:', error);
      throw error;
    }
  }

  static async createUserAchievement(userAchievementData: Omit<UserAchievement, 'id' | 'createdAt' | 'updatedAt' | 'unlockedAt'> & { unlockedAt?: Date | null }): Promise<string> {
    try {
      const userAchievementRef = doc(collection(db, 'userAchievements'));
      const completeData = {
        ...userAchievementData,
        rewardClaimed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(userAchievementRef, completeData);
      return userAchievementRef.id;
    } catch (error) {
      console.error('❌ FirestoreService: Error creating user achievement:', error);
      throw error;
    }
  }

  static async updateUserAchievement(userAchievementId: string, updates: Omit<Partial<UserAchievement>, 'unlockedAt'> & { unlockedAt?: Date | null }): Promise<void> {
    try {
      const userAchievementRef = doc(db, 'userAchievements', userAchievementId);
      await updateDoc(userAchievementRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error updating user achievement:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 SURPRISE MISSION MANAGEMENT
  // ========================================

  static async getSurpriseMissionConfig(): Promise<SurpriseMissionConfig | null> {
    try {
      const configRef = doc(db, 'surpriseMissionConfig', 'default');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        const data = configDoc.data();
        return {
          id: configDoc.id,
          isEnabled: data.isEnabled || false,
          theme: data.theme || 'mixed',
          difficulty: data.difficulty || 'medium',
          xpReward: data.xpReward || 50,
          goldReward: data.goldReward || 25,
          questionsCount: data.questionsCount || 30,
          lastUpdatedBy: data.lastUpdatedBy || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ FirestoreService: Error getting surprise mission config:', error);
      throw error;
    }
  }

  static async updateSurpriseMissionConfig(configData: Omit<SurpriseMissionConfig, 'id' | 'lastUpdatedBy' | 'createdAt' | 'updatedAt'>, lastUpdatedBy: string): Promise<void> {
    try {
      const configRef = doc(db, 'surpriseMissionConfig', 'default');
      const configDoc = await getDoc(configRef);
      
      const completeData = {
        ...configData,
        lastUpdatedBy,
        updatedAt: serverTimestamp()
      };
      
      if (configDoc.exists()) {
        await updateDoc(configRef, completeData);
      } else {
        await setDoc(configRef, {
          ...completeData,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('❌ FirestoreService: Error updating surprise mission config:', error);
      throw error;
    }
  }

  static async checkSurpriseMissionCompletedToday(userId: string, date: string): Promise<boolean> {
    try {
      const statusRef = doc(db, 'dailySurpriseMissionStatus', `${userId}_${date}`);
      const statusDoc = await getDoc(statusRef);
      
      return statusDoc.exists() && statusDoc.data().completed === true;
    } catch (error) {
      console.error('❌ FirestoreService: Error checking surprise mission status:', error);
      return false;
    }
  }

  static async markSurpriseMissionCompletedToday(userId: string, date: string, results: {
    score: number;
    totalQuestions: number;
    xpEarned: number;
    goldEarned: number;
    completedAt: Date;
  }): Promise<void> {
    try {
      const statusRef = doc(db, 'dailySurpriseMissionStatus', `${userId}_${date}`);
      await setDoc(statusRef, {
        userId,
        date,
        completed: true,
        score: results.score,
        totalQuestions: results.totalQuestions,
        xpEarned: results.xpEarned,
        goldEarned: results.goldEarned,
        completedAt: Timestamp.fromDate(results.completedAt),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error marking surprise mission completed:', error);
      throw error;
    }
  }

  static async getSurpriseMissionHistory(userId: string, limitCount: number = 30): Promise<DailySurpriseMissionStatus[]> {
    try {
      const historyQuery = query(
        collection(db, 'dailySurpriseMissionStatus'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(historyQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          date: data.date,
          completed: data.completed,
          score: data.score,
          totalQuestions: data.totalQuestions,
          xpEarned: data.xpEarned,
          goldEarned: data.goldEarned,
          completedAt: data.completedAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error getting surprise mission history:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 BIRTHDAY MANAGEMENT
  // ========================================

  static async checkBirthdayCompletedThisYear(userId: string, year: number): Promise<boolean> {
    try {
      const birthdayRef = doc(db, 'birthdayEvents', `${userId}_${year}`);
      const birthdayDoc = await getDoc(birthdayRef);
      
      return birthdayDoc.exists() && birthdayDoc.data().celebrationCompleted === true;
    } catch (error) {
      console.error('❌ FirestoreService: Error checking birthday completion:', error);
      return false;
    }
  }

  static async markBirthdayCompleted(userId: string, year: number, age: number): Promise<void> {
    try {
      const birthdayRef = doc(db, 'birthdayEvents', `${userId}_${year}`);
      await setDoc(birthdayRef, {
        userId,
        birthdayDate: '12-18', // Heitor's birthday: December 18th
        year,
        age,
        specialRewards: [], // Could be populated with specific reward IDs
        celebrationCompleted: true,
        celebrationCompletedAt: serverTimestamp(),
        specialMessage: `Parabéns pelos seus ${age} anos, Heitor! Você é incrível! ⚡🎂`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error marking birthday completed:', error);
      throw error;
    }
  }

  static async getBirthdayHistory(userId: string): Promise<BirthdayEvent[]> {
    try {
      const birthdayQuery = query(
        collection(db, 'birthdayEvents'),
        where('userId', '==', userId),
        orderBy('year', 'desc')
      );
      
      const snapshot = await getDocs(birthdayQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          birthdayDate: data.birthdayDate,
          year: data.year,
          age: data.age,
          specialRewards: data.specialRewards || [],
          celebrationCompleted: data.celebrationCompleted,
          celebrationCompletedAt: data.celebrationCompletedAt?.toDate(),
          specialMessage: data.specialMessage,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error getting birthday history:', error);
      return [];
    }
  }

  // ========================================
  // 🔥 QUIZ MANAGEMENT
  // ========================================

  static async checkQuizCompletedToday(userId: string, date: string): Promise<boolean> {
    try {
      const quizRef = doc(db, 'dailyQuizzes', `${userId}_${date}`);
      const quizDoc = await getDoc(quizRef);
      
      return quizDoc.exists() && quizDoc.data().completed === true;
    } catch (error) {
      console.error('❌ FirestoreService: Error checking quiz completion:', error);
      return false;
    }
  }

  static async markQuizCompletedToday(userId: string, date: string, results: {
    score: number;
    totalQuestions: number;
    xpEarned: number;
    goldEarned: number;
    completedAt: Date;
  }): Promise<void> {
    try {
      const quizRef = doc(db, 'dailyQuizzes', `${userId}_${date}`);
      await setDoc(quizRef, {
        userId,
        date,
        completed: true,
        score: results.score,
        totalQuestions: results.totalQuestions,
        xpEarned: results.xpEarned,
        goldEarned: results.goldEarned,
        completedAt: Timestamp.fromDate(results.completedAt),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error marking quiz completed:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 DAILY PROGRESS TRACKING
  // ========================================

  static async getDailyProgress(userId: string, date: string): Promise<DailyProgress | null> {
    try {
      const progressRef = doc(db, 'dailyProgress', `${userId}_${date}`);
      const progressDoc = await getDoc(progressRef);
      
      if (progressDoc.exists()) {
        const data = progressDoc.data();
        return {
          userId: data.userId,
          date: data.date,
          xpEarned: data.xpEarned || 0,
          goldEarned: data.goldEarned || 0,
          tasksCompleted: data.tasksCompleted || 0,
          totalTasksAvailable: data.totalTasksAvailable || 0,
          goldPenalty: data.goldPenalty || 0,
          allTasksBonusGold: data.allTasksBonusGold || 0,
          summaryProcessed: data.summaryProcessed || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ FirestoreService: Error getting daily progress:', error);
      return null;
    }
  }

  static async updateDailyProgress(userId: string, date: string, xpGained: number, goldGained: number): Promise<void> {
    try {
      const progressRef = doc(db, 'dailyProgress', `${userId}_${date}`);
      const progressDoc = await getDoc(progressRef);
      
      if (progressDoc.exists()) {
        const currentData = progressDoc.data();
        await updateDoc(progressRef, {
          xpEarned: (currentData.xpEarned || 0) + xpGained,
          goldEarned: (currentData.goldEarned || 0) + goldGained,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(progressRef, {
          userId,
          date,
          xpEarned: xpGained,
          goldEarned: goldGained,
          tasksCompleted: 0,
          totalTasksAvailable: 0,
          goldPenalty: 0,
          allTasksBonusGold: 0,
          summaryProcessed: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('❌ FirestoreService: Error updating daily progress:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 TASK COMPLETION HISTORY
  // ========================================

  static async getTaskCompletionHistory(userId: string, startDate: Date, endDate: Date): Promise<Array<{
    taskId: string;
    taskTitle: string;
    date: string;
    xpEarned: number;
    goldEarned: number;
    completedAt: Date;
  }>> {
    try {
      const startDateString = format(startDate, 'yyyy-MM-dd');
      const endDateString = format(endDate, 'yyyy-MM-dd');
      
      const completionsQuery = query(
        collection(db, 'taskCompletions'),
        where('userId', '==', userId),
        where('date', '>=', startDateString),
        where('date', '<=', endDateString),
        orderBy('date', 'asc'),
        orderBy('completedAt', 'desc')
      );
      
      const snapshot = await getDocs(completionsQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          taskId: data.taskId,
          taskTitle: data.taskTitle || 'Tarefa',
          date: data.date,
          xpEarned: data.xpEarned || 0,
          goldEarned: data.goldEarned || 0,
          completedAt: data.completedAt?.toDate() || new Date()
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('index') || errorMessage.includes('Index')) {
        console.log('📋 Firestore index is building for taskCompletions. Returning empty array.');
        return [];
      } else {
        console.error('❌ FirestoreService: Error getting task completion history:', error);
        throw error;
      }
    }
  }

  // ========================================
  // 🔥 DAILY PROCESSING (PENALTIES/BONUSES)
  // ========================================

  /** Fecha os dias pendentes (penalidade/bônus). Implementação em dailyRulesService. */
  static async processUnprocessedDays(userId: string): Promise<void> {
    const results = await processPendingDays(userId);
    if (results.length > 0) console.log('✅ Fechamento diário:', results);
  }

  static subscribeToUserTasks(userId: string, onUpdate: (tasks: Task[]) => void, onError?: (error: FirestoreError) => void): () => void {
    try {
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(tasksQuery, 
        (snapshot) => {
          const tasks = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ownerId: data.ownerId,
              title: data.title,
              description: data.description,
              xp: data.xp || 10,
              gold: data.gold || 5,
              period: data.period,
              time: data.time,
              frequency: data.frequency || 'daily',
              active: data.active !== false,
              status: data.status || 'pending',
              lastCompletedDate: data.lastCompletedDate,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              createdBy: data.createdBy || '',
              optional: data.optional === true,
              origin: data.origin === 'child' || data.origin === 'agenda' ? data.origin : 'admin',
            };
          });
          onUpdate(tasks);
        },
        (error) => {
          console.error('❌ FirestoreService: Error in tasks listener:', error);
          if (onError) onError(error as FirestoreError);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up tasks listener:', error);
      if (onError) onError(error as FirestoreError);
      return () => {};
    }
  }

  static subscribeToUserRewards(userId: string, onUpdate: (rewards: Reward[]) => void, onError?: (error: FirestoreError) => void): () => void {
    try {
      const rewardsQuery = query(
        collection(db, 'rewards'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(rewardsQuery,
        (snapshot) => {
          const rewards = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ownerId: data.ownerId,
              title: data.title,
              description: data.description,
              category: data.category || 'custom',
              costGold: data.costGold || 50,
              emoji: data.emoji || '🎁',
              active: data.active !== false,
              requiredLevel: data.requiredLevel || 1,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              goalOnly: data.goalOnly === true,
            };
          });
          onUpdate(rewards);
        },
        (error) => {
          console.error('❌ FirestoreService: Error in rewards listener:', error);
          if (onError) onError(error as FirestoreError);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up rewards listener:', error);
      if (onError) onError(error as FirestoreError);
      return () => {};
    }
  }

  static subscribeToUserProgress(userId: string, onUpdate: (progress: UserProgress | null) => void, onError?: (error: FirestoreError) => void): () => void {
    try {
      const progressRef = doc(db, 'progress', userId);

      return onSnapshot(progressRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const progress: UserProgress = {
              userId,
              level: data.level || 1,
              totalXP: data.totalXP || 0,
              availableGold: data.availableGold || 0,
              totalGoldEarned: data.totalGoldEarned || 0,
              totalGoldSpent: data.totalGoldSpent || 0,
              streak: data.streak || 0,
              longestStreak: data.longestStreak || 0,
              rewardsRedeemed: data.rewardsRedeemed || 0,
              totalTasksCompleted: data.totalTasksCompleted || 0,
              lastActivityDate: data.lastActivityDate?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              lastDailySummaryProcessedDate: data.lastDailySummaryProcessedDate?.toDate(),
              quizEnabled: data.quizEnabled
            };
            onUpdate(progress);
          } else {
            onUpdate(null);
          }
        },
        (error) => {
          console.error('❌ FirestoreService: Error in progress listener:', error);
          if (onError) onError(error as FirestoreError);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up progress listener:', error);
      if (onError) onError(error as FirestoreError);
      return () => {};
    }
  }

  static subscribeToUserRedemptions(userId: string, onUpdate: (redemptions: RewardRedemption[]) => void, onError?: (error: FirestoreError) => void): () => void {
    try {
      const redemptionsQuery = query(
        collection(db, 'redemptions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(redemptionsQuery,
        (snapshot) => {
          const redemptions = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              userId: data.userId,
              rewardId: data.rewardId,
              costGold: data.costGold || 0,
              status: data.status || 'pending',
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              approvedBy: data.approvedBy
            };
          });
          onUpdate(redemptions);
        },
        (error) => {
          console.error('❌ FirestoreService: Error in redemptions listener:', error);
          if (onError) onError(error as FirestoreError);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up redemptions listener:', error);
      if (onError) onError(error as FirestoreError);
      return () => {};
    }
  }

  static subscribeToUserNotifications(userId: string, onUpdate: (notifications: Notification[]) => void, onError?: (error: FirestoreError) => void): () => void {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('toUserId', '==', userId),
        orderBy('sentAt', 'desc'),
        limit(50)
      );

      return onSnapshot(notificationsQuery,
        (snapshot) => {
          const notifications = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              toUserId: data.toUserId,
              title: data.title,
              message: data.message,
              type: data.type || 'general',
              sentAt: data.sentAt?.toDate() || new Date(),
              read: data.read || false,
              readAt: data.readAt?.toDate()
            };
          });
          onUpdate(notifications);
        },
        (error) => {
          console.error('❌ FirestoreService: Error in notifications listener:', error);
          if (onError) onError(error as FirestoreError);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up notifications listener:', error);
      if (onError) onError(error as FirestoreError);
      return () => {};
    }
  }

  static subscribeToUserFlashReminders(userId: string, onUpdate: (reminders: FlashReminder[]) => void, onError?: (error: FirestoreError) => void): () => void {
    try {
      const remindersQuery = query(
        collection(db, 'flashReminders'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(remindersQuery,
        (snapshot) => {
          const reminders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ownerId: data.ownerId,
              title: data.title,
              message: data.message,
              icon: data.icon,
              color: data.color || 'yellow',
              priority: data.priority || 'medium',
              active: data.active !== false,
              showOnDashboard: data.showOnDashboard !== false,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              createdBy: data.createdBy || ''
            };
          });
          onUpdate(reminders);
        },
        (error) => {
          console.error('❌ FirestoreService: Error in flash reminders listener:', error);
          if (onError) onError(error as FirestoreError);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up flash reminders listener:', error);
      if (onError) onError(error as FirestoreError);
      return () => {};
    }
  }

  static subscribeToUserAchievements(userId: string, onUpdate: (achievements: Achievement[]) => void, onError?: (error: FirestoreError) => void): () => void {
    try {
      const achievementsQuery = query(
        collection(db, 'achievements'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(achievementsQuery,
        (snapshot) => {
          const achievements = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ownerId: data.ownerId,
              title: data.title,
              description: data.description,
              icon: data.icon,
              type: data.type,
              target: data.target,
              xpReward: data.xpReward,
              goldReward: data.goldReward,
              isActive: data.isActive !== false,
              createdBy: data.createdBy || '',
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            };
          });
          onUpdate(achievements);
        },
        (error) => {
          console.error('❌ FirestoreService: Error in achievements listener:', error);
          if (onError) onError(error as FirestoreError);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up achievements listener:', error);
      if (onError) onError(error as FirestoreError);
      return () => {};
    }
  }

  static subscribeToUserAchievementProgress(userId: string, onUpdate: (userAchievements: UserAchievement[]) => void, onError?: (error: FirestoreError) => void): () => void {
    try {
      const userAchievementsQuery = query(
        collection(db, 'userAchievements'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(userAchievementsQuery,
        (snapshot) => {
          const userAchievements = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              userId: data.userId,
              achievementId: data.achievementId,
              progress: data.progress || 0,
              isCompleted: data.isCompleted || false,
              rewardClaimed: data.rewardClaimed || false,
              claimedAt: data.claimedAt?.toDate(),
              unlockedAt: data.unlockedAt?.toDate(),
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            };
          });
          onUpdate(userAchievements);
        },
        (error) => {
          console.error('❌ FirestoreService: Error in user achievements listener:', error);
          if (onError) onError(error as FirestoreError);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up user achievements listener:', error);
      if (onError) onError(error as FirestoreError);
      return () => {};
    }
  }

  // ========================================
  // 🔥 DATA INITIALIZATION
  // ========================================

  static async createDefaultData(childUid: string, adminUid: string): Promise<void> {
    try {
      console.log('🔄 FirestoreService: Creating default data for child:', childUid, 'by admin:', adminUid);
      
      // Ensure progress exists
      await this.ensureUserProgress(childUid);
      
      console.log('✅ FirestoreService: Default data created successfully');
    } catch (error) {
      console.error('❌ FirestoreService: Error creating default data:', error);
      throw error;
    }
  }

  static async syncUserData(userId: string): Promise<void> {
    try {
      console.log('🔄 FirestoreService: Syncing user data for:', userId);

      // Force refresh user progress
      await this.ensureUserProgress(userId);

      console.log('✅ FirestoreService: User data synced successfully');
    } catch (error) {
      console.error('❌ FirestoreService: Error syncing user data:', error);
      throw error;
    }
  }

  // ========================================
  // 📝 NOTES MANAGEMENT
  // ========================================

  static async createNote(noteData: Omit<import('../types').Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const noteRef = doc(collection(db, 'notes'));
      const completeNoteData = {
        ...noteData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(noteRef, completeNoteData);
      console.log('✅ FirestoreService: Note created:', noteRef.id);
      return noteRef.id;
    } catch (error) {
      console.error('❌ FirestoreService: Error creating note:', error);
      throw error;
    }
  }

  static async updateNote(noteId: string, updates: Partial<import('../types').Note>): Promise<void> {
    try {
      const noteRef = doc(db, 'notes', noteId);
      await updateDoc(noteRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ FirestoreService: Note updated:', noteId);
    } catch (error) {
      console.error('❌ FirestoreService: Error updating note:', error);
      throw error;
    }
  }

  static async deleteNote(noteId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'notes', noteId));
      console.log('✅ FirestoreService: Note deleted:', noteId);
    } catch (error) {
      console.error('❌ FirestoreService: Error deleting note:', error);
      throw error;
    }
  }

  static subscribeToNotes(ownerId: string, callback: (notes: import('../types').Note[]) => void): () => void {
    const q = query(
      collection(db, 'notes'),
      where('ownerId', '==', ownerId),
      orderBy('pinned', 'desc'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const notes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        } as import('../types').Note));

        callback(notes);
      },
      (error) => {
        console.error('❌ FirestoreService: Error in notes subscription:', error);
      }
    );

    return unsubscribe;
  }

  // ========================================
  // 💰 GOLD TRANSACTION MANAGEMENT
  // ========================================

  static async createGoldTransaction(
    userId: string,
    amount: number,
    type: GoldTransaction['type'],
    source: GoldTransaction['source'],
    description: string,
    options?: {
      relatedId?: string;
      relatedTitle?: string;
      metadata?: Record<string, unknown>;
      createdBy?: string;
    }
  ): Promise<string> {
    try {
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);

      if (!progressDoc.exists()) {
        throw new Error('User progress not found');
      }

      if (!amount) {
        return '';
      }

      const currentProgress = progressDoc.data();
      // Callers (quiz, inglês, conquista, aniversário, missão surpresa)
      // já aplicaram o gold no progress. O saldo lido aqui é o DEPOIS.
      const balanceAfter = currentProgress.availableGold || 0;
      const balanceBefore = balanceAfter - amount;

      const transactionRef = doc(collection(db, 'goldTransactions'));
      const transactionData = omitUndefined({
        userId,
        amount,
        type,
        source,
        description,
        relatedId: options?.relatedId,
        relatedTitle: options?.relatedTitle,
        metadata: options?.metadata,
        balanceBefore,
        balanceAfter,
        createdAt: serverTimestamp(),
        createdBy: options?.createdBy
      });

      await setDoc(transactionRef, transactionData);
      console.log('✅ FirestoreService: Gold transaction created:', {
        id: transactionRef.id,
        amount,
        type,
        source,
        description
      });

      return transactionRef.id;
    } catch (error) {
      console.error('❌ FirestoreService: Error creating gold transaction:', error);
      throw error;
    }
  }

  static async getGoldTransactionHistory(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: GoldTransaction['type'];
      source?: GoldTransaction['source'];
      limitCount?: number;
    }
  ): Promise<GoldTransaction[]> {
    try {
      let q = query(
        collection(db, 'goldTransactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      if (options?.limitCount) {
        q = query(q, limit(options.limitCount));
      }

      const snapshot = await getDocs(q);

      let transactions = snapshot.docs.map((item) => mapGoldTransaction(item.id, item.data()));

      if (options?.startDate) {
        transactions = transactions.filter(t => t.createdAt >= options.startDate!);
      }

      if (options?.endDate) {
        transactions = transactions.filter(t => t.createdAt <= options.endDate!);
      }

      if (options?.type) {
        transactions = transactions.filter(t => t.type === options.type);
      }

      if (options?.source) {
        transactions = transactions.filter(t => t.source === options.source);
      }

      return transactions;
    } catch (error) {
      console.error('❌ FirestoreService: Error getting gold transaction history:', error);
      return [];
    }
  }

  static subscribeToGoldTransactions(
    userId: string,
    onUpdate: (transactions: GoldTransaction[]) => void,
    onError?: (error: FirestoreError) => void,
    options?: { since?: Date | null; limitCount?: number }
  ): () => void {
    const cap = options?.limitCount ?? 2000;
    const since = options?.since || null;

    const emit = (items: GoldTransaction[]) => {
      const sorted = [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onUpdate(since ? sorted.filter((item) => item.createdAt >= since) : sorted);
    };

    const listenSimple = (): (() => void) => {
      const simpleQuery = query(
        collection(db, 'goldTransactions'),
        where('userId', '==', userId),
        limit(cap)
      );
      return onSnapshot(
        simpleQuery,
        (snapshot) => emit(snapshot.docs.map((item) => mapGoldTransaction(item.id, item.data()))),
        (error) => {
          console.error('❌ FirestoreService: Error in gold transactions fallback listener:', error);
          if (onError) onError(error as FirestoreError);
          onUpdate([]);
        }
      );
    };

    try {
      const constraints = [
        where('userId', '==', userId),
        ...(since ? [where('createdAt', '>=', Timestamp.fromDate(since))] : []),
        orderBy('createdAt', 'desc'),
        limit(cap)
      ];
      const transactionsQuery = query(collection(db, 'goldTransactions'), ...constraints);

      let unsubscribe = onSnapshot(
        transactionsQuery,
        (snapshot) => emit(snapshot.docs.map((item) => mapGoldTransaction(item.id, item.data()))),
        (error) => {
          console.warn('⚠️ FirestoreService: gold index/query failed, using fallback:', error.code);
          unsubscribe = listenSimple();
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up gold transactions listener:', error);
      if (onError) onError(error as FirestoreError);
      return listenSimple();
    }
  }

  static async adjustGoldManually(
    userId: string,
    amount: number,
    reason: string,
    adminUid: string
  ): Promise<{ before: number; after: number }> {
    try {
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);

      if (!progressDoc.exists()) {
        throw new Error('User progress not found');
      }

      const currentProgress = progressDoc.data();
      const currentGold = currentProgress.availableGold || 0;
      const newGold = Math.max(0, currentGold + amount);

      const batch = writeBatch(db);

      batch.update(progressRef, {
        availableGold: newGold,
        totalGoldEarned: amount > 0 ? (currentProgress.totalGoldEarned || 0) + amount : currentProgress.totalGoldEarned,
        updatedAt: serverTimestamp()
      });

      const transactionRef = doc(collection(db, 'goldTransactions'));
      batch.set(transactionRef, {
        userId,
        amount: newGold - currentGold,
        type: 'adjustment',
        source: 'admin_adjustment',
        description: `Ajuste manual: ${reason}`,
        metadata: { reason, adminUid },
        balanceBefore: currentGold,
        balanceAfter: newGold,
        createdAt: serverTimestamp(),
        createdBy: adminUid
      });

      await batch.commit();
      console.log('✅ FirestoreService: Manual gold adjustment completed:', {
        amount,
        reason,
        oldBalance: currentGold,
        newBalance: newGold
      });
      return { before: currentGold, after: newGold };
    } catch (error) {
      console.error('❌ FirestoreService: Error adjusting gold manually:', error);
      throw error;
    }
  }

  /**
   * Ajuste manual de XP com motivo, em transação (não sobrescreve XP que a criança
   * ganhe no mesmo instante). Registra em xpAdjustments; o XP não passa pelo livro de gold.
   */
  static async adjustXPManually(userId: string, amount: number, reason: string, adminUid: string): Promise<{ before: number; after: number }> {
    const progressRef = doc(db, 'progress', userId);
    const logRef = doc(collection(db, 'xpAdjustments'));
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(progressRef);
      if (!snap.exists()) throw new Error('User progress not found');
      const before = Number(snap.data().totalXP) || 0;
      const after = Math.max(0, before + amount);
      tx.update(progressRef, { totalXP: after, level: getLevelFromXP(after), updatedAt: serverTimestamp() });
      tx.set(logRef, {
        userId,
        amount: after - before,
        reason,
        xpBefore: before,
        xpAfter: after,
        createdAt: serverTimestamp(),
        createdBy: adminUid,
      });
      return { before, after };
    });
  }

  // ========================================
  // 🔥 PUNISHMENT MODE MANAGEMENT
  // ========================================

  static async activatePunishmentMode(
    userId: string,
    adminUid: string,
    reason: string
  ): Promise<string> {
    try {
      console.log('🔄 FirestoreService: Activating punishment mode...', { userId, adminUid, reason });

      // First, deactivate any existing active punishments
      const existingQuery = query(
        collection(db, 'punishmentMode'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const existingSnapshot = await getDocs(existingQuery);
      console.log('📊 FirestoreService: Found existing active punishments:', existingSnapshot.size);

      if (!existingSnapshot.empty) {
        const batch = writeBatch(db);
        existingSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            isActive: false,
            deactivatedAt: serverTimestamp(),
            deactivatedReason: 'replaced_by_new',
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
        console.log('✅ FirestoreService: Deactivated existing punishments');
      }

      // Create new punishment
      const punishmentRef = doc(collection(db, 'punishmentMode'));
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const punishmentData = {
        userId,
        isActive: true,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        tasksCompleted: 0,
        tasksRequired: 30,
        activatedBy: adminUid,
        reason,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('💾 FirestoreService: Saving punishment data to Firestore...', punishmentRef.id);
      await setDoc(punishmentRef, punishmentData);
      console.log('✅ FirestoreService: Punishment mode activated successfully:', punishmentRef.id);

      return punishmentRef.id;
    } catch (error) {
      console.error('❌ FirestoreService: Error activating punishment mode:', error);
      const details = error as { code?: string; message?: string; stack?: string } | null;
      console.error('Error details:', {
        code: details?.code,
        message: details?.message,
        stack: details?.stack
      });
      throw error;
    }
  }

  static async deactivatePunishmentMode(
    punishmentId: string,
    reason: 'time_completed' | 'tasks_completed' | 'admin_override'
  ): Promise<void> {
    try {
      const punishmentRef = doc(db, 'punishmentMode', punishmentId);
      await updateDoc(punishmentRef, {
        isActive: false,
        deactivatedAt: serverTimestamp(),
        deactivatedReason: reason,
        updatedAt: serverTimestamp()
      });
      console.log('✅ FirestoreService: Punishment mode deactivated:', { punishmentId, reason });
    } catch (error) {
      console.error('❌ FirestoreService: Error deactivating punishment mode:', error);
      throw error;
    }
  }

  static async getActivePunishment(userId: string): Promise<PunishmentMode | null> {
    try {
      const punishmentsQuery = query(
        collection(db, 'punishmentMode'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(punishmentsQuery);
      if (snapshot.empty) {
        return null;
      }

      const punishments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      punishments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const mostRecent = punishments[0];
      const data = snapshot.docs.find(d => d.id === mostRecent.id)?.data();

      if (!data) return null;

      return {
        id: mostRecent.id,
        userId: data.userId,
        isActive: data.isActive,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        tasksCompleted: data.tasksCompleted || 0,
        tasksRequired: data.tasksRequired || 30,
        activatedBy: data.activatedBy,
        reason: data.reason,
        lastTaskCompletedAt: data.lastTaskCompletedAt?.toDate(),
        deactivatedAt: data.deactivatedAt?.toDate(),
        deactivatedReason: data.deactivatedReason,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    } catch (error) {
      console.error('❌ FirestoreService: Error getting active punishment:', error);
      throw error;
    }
  }

  static subscribeToActivePunishment(
    userId: string,
    onUpdate: (punishment: PunishmentMode | null) => void,
    onError?: (error: FirestoreError) => void
  ): () => void {
    try {
      const punishmentsQuery = query(
        collection(db, 'punishmentMode'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      return onSnapshot(
        punishmentsQuery,
        (snapshot) => {
          if (snapshot.empty) {
            onUpdate(null);
            return;
          }

          const punishments = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              userId: data.userId,
              isActive: data.isActive,
              startDate: data.startDate?.toDate() || new Date(),
              endDate: data.endDate?.toDate() || new Date(),
              tasksCompleted: data.tasksCompleted || 0,
              tasksRequired: data.tasksRequired || 30,
              activatedBy: data.activatedBy,
              reason: data.reason,
              lastTaskCompletedAt: data.lastTaskCompletedAt?.toDate(),
              deactivatedAt: data.deactivatedAt?.toDate(),
              deactivatedReason: data.deactivatedReason,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            };
          });

          punishments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          onUpdate(punishments[0] || null);
        },
        (error) => {
          console.error('❌ FirestoreService: Error in punishment listener:', error);
          if (onError) onError(error as FirestoreError);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up punishment listener:', error);
      if (onError) onError(error as FirestoreError);
      return () => {};
    }
  }

  static async completePunishmentTask(punishmentId: string, taskId: string, taskTitle: string): Promise<void> {
    try {
      const punishmentRef = doc(db, 'punishmentMode', punishmentId);
      const punishmentDoc = await getDoc(punishmentRef);

      if (!punishmentDoc.exists()) {
        throw new Error('Punishment not found');
      }

      const data = punishmentDoc.data();
      const currentTasksCompleted = data.tasksCompleted || 0;
      const newTasksCompleted = currentTasksCompleted + 1;

      const lastTaskTime = data.lastTaskCompletedAt?.toDate();
      const now = new Date();

      if (lastTaskTime) {
        const timeDiff = now.getTime() - lastTaskTime.getTime();
        const minutesDiff = timeDiff / (1000 * 60);

        if (minutesDiff < 30) {
          const minutesRemaining = Math.ceil(30 - minutesDiff);
          throw new Error(`Você precisa esperar mais ${minutesRemaining} minutos antes da próxima tarefa`);
        }
      }

      const updates: Record<string, unknown> = {
        tasksCompleted: newTasksCompleted,
        lastTaskCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (newTasksCompleted >= 30) {
        updates.isActive = false;
        updates.deactivatedAt = serverTimestamp();
        updates.deactivatedReason = 'tasks_completed';
      }

      await updateDoc(punishmentRef, updates);

      const taskCompletionRef = doc(collection(db, 'punishmentTaskCompletions'));
      await setDoc(taskCompletionRef, {
        punishmentId,
        userId: data.userId,
        completedAt: serverTimestamp(),
        taskNumber: newTasksCompleted,
        taskId,
        taskTitle
      });

      console.log('✅ FirestoreService: Punishment task completed:', {
        punishmentId,
        tasksCompleted: newTasksCompleted
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error completing punishment task:', error);
      throw error;
    }
  }

  static async checkAndDeactivateExpiredPunishments(): Promise<void> {
    try {
      const now = new Date();
      const punishmentsQuery = query(
        collection(db, 'punishmentMode'),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(punishmentsQuery);
      const batch = writeBatch(db);
      let deactivatedCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const endDate = data.endDate?.toDate();

        if (endDate && now >= endDate) {
          batch.update(doc.ref, {
            isActive: false,
            deactivatedAt: serverTimestamp(),
            deactivatedReason: 'time_completed',
            updatedAt: serverTimestamp()
          });
          deactivatedCount++;
        }
      });

      if (deactivatedCount > 0) {
        await batch.commit();
        console.log(`✅ FirestoreService: Deactivated ${deactivatedCount} expired punishments`);
      }
    } catch (error) {
      console.error('❌ FirestoreService: Error checking expired punishments:', error);
      throw error;
    }
  }

  static async getPunishmentTaskHistory(punishmentId: string): Promise<PunishmentTaskCompletion[]> {
    try {
      const historyQuery = query(
        collection(db, 'punishmentTaskCompletions'),
        where('punishmentId', '==', punishmentId)
      );

      const snapshot = await getDocs(historyQuery);
      const history = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          punishmentId: data.punishmentId,
          userId: data.userId,
          completedAt: data.completedAt?.toDate() || new Date(),
          taskNumber: data.taskNumber,
          taskId: data.taskId,
          taskTitle: data.taskTitle
        };
      });

      history.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
      return history;
    } catch (error) {
      console.error('❌ FirestoreService: Error getting punishment task history:', error);
      return [];
    }
  }

  static subscribeToPunishmentTaskHistory(
    punishmentId: string,
    onUpdate: (history: PunishmentTaskCompletion[]) => void,
    onError?: (error: FirestoreError) => void
  ): () => void {
    try {
      const historyQuery = query(
        collection(db, 'punishmentTaskCompletions'),
        where('punishmentId', '==', punishmentId)
      );

      return onSnapshot(
        historyQuery,
        (snapshot) => {
          const history = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              punishmentId: data.punishmentId,
              userId: data.userId,
              completedAt: data.completedAt?.toDate() || new Date(),
              taskNumber: data.taskNumber,
              taskId: data.taskId,
              taskTitle: data.taskTitle
            };
          });

          history.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

          onUpdate(history);
        },
        (error) => {
          console.error('❌ FirestoreService: Error in punishment history listener:', error);
          if (onError) onError(error as FirestoreError);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up punishment history listener:', error);
      if (onError) onError(error as FirestoreError);
      return () => {};
    }
  }
}