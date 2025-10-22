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
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayBrazil, getTodayStartBrazil, getYesterdayBrazil } from '../utils/timezone';
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
  BirthdayConfig,
  GoldTransaction
} from '../types';
import { validateProgressUpdate, createProgressSnapshot } from '../utils/progressMonitor';

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

      // Create default progress
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

      await setDoc(progressRef, defaultProgress);
      
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

  static async forceResetAllCompletedTasks(userId: string): Promise<number> {
    try {
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('ownerId', '==', userId),
        where('status', '==', 'done')
      );

      const tasksSnapshot = await getDocs(tasksQuery);
      const batch = writeBatch(db);

      tasksSnapshot.docs.forEach(taskDoc => {
        const task = taskDoc.data() as Task;
        console.log(`🔄 Force resetting task "${task.title}"`);
        batch.update(taskDoc.ref, {
          status: 'pending',
          updatedAt: serverTimestamp()
        });
      });

      if (tasksSnapshot.size > 0) {
        await batch.commit();
        console.log(`✅ Force reset ${tasksSnapshot.size} completed tasks for user ${userId}`);
      }

      return tasksSnapshot.size;
    } catch (error) {
      console.error('❌ FirestoreService: Error force resetting tasks:', error);
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

  static async completeTaskWithRewards(taskId: string, userId: string, xpReward: number, goldReward: number): Promise<void> {
    try {
      // Get current progress first
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);

      if (!progressDoc.exists()) {
        throw new Error('Progress document not found');
      }

      const currentProgress = progressDoc.data();
      const newXP = (currentProgress.totalXP || 0) + xpReward;
      const newGold = (currentProgress.availableGold || 0) + goldReward;
      const newTotalGold = (currentProgress.totalGoldEarned || 0) + goldReward;

      // Validate progress update
      const validation = await validateProgressUpdate(
        userId,
        {
          totalXP: newXP,
          availableGold: newGold,
          totalGoldEarned: newTotalGold
        },
        `Task completion: ${taskId}`
      );

      // Log warnings
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Progress update warnings:', validation.warnings);
      }

      // Reject if validation failed
      if (!validation.isValid) {
        console.error('❌ Progress update rejected:', validation.errors);
        throw new Error(`Progress validation failed: ${validation.errors.join(', ')}`);
      }

      // Create snapshot before update
      if (validation.snapshot) {
        await createProgressSnapshot(validation.snapshot);
      }

      // Get task details for history
      const taskRef = doc(db, 'tasks', taskId);
      const taskDoc = await getDoc(taskRef);

      if (!taskDoc.exists()) {
        throw new Error('Task not found');
      }

      const taskData = taskDoc.data();
      const taskTitle = taskData.title || 'Tarefa Sem Título';

      // Proceed with batch update
      const batch = writeBatch(db);
      const today = getTodayBrazil();

      // Update task status
      batch.update(taskRef, {
        status: 'done',
        lastCompletedDate: today,
        updatedAt: serverTimestamp()
      });

      // Create task completion record WITH TASK TITLE
      const completionRef = doc(collection(db, 'taskCompletions'));
      batch.set(completionRef, {
        taskId,
        userId,
        taskTitle,
        date: today,
        xpEarned: xpReward,
        goldEarned: goldReward,
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // Update user progress with validated values
      batch.update(progressRef, {
        totalXP: newXP,
        availableGold: newGold,
        totalGoldEarned: newTotalGold,
        totalTasksCompleted: (currentProgress.totalTasksCompleted || 0) + 1,
        lastActivityDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create gold transaction record
      if (goldReward > 0) {
        const transactionRef = doc(collection(db, 'goldTransactions'));
        batch.set(transactionRef, {
          userId,
          amount: goldReward,
          type: 'earned',
          source: 'task_completion',
          description: `Tarefa concluída: ${taskTitle}`,
          relatedId: taskId,
          relatedTitle: taskTitle,
          metadata: { xpEarned: xpReward, period: taskData.period },
          balanceBefore: currentProgress.availableGold || 0,
          balanceAfter: newGold,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
      console.log('✅ Task completed with validated rewards:', { taskId, xpReward, goldReward });
    } catch (error) {
      console.error('❌ FirestoreService: Error completing task with rewards:', error);
      throw error;
    }
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
      const batch = writeBatch(db);

      // Get reward details for transaction
      const rewardRef = doc(db, 'rewards', rewardId);
      const rewardDoc = await getDoc(rewardRef);
      const rewardTitle = rewardDoc.exists() ? rewardDoc.data().title : 'Recompensa';

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

      // Deduct gold from user
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);

      if (progressDoc.exists()) {
        const currentProgress = progressDoc.data();
        const currentGold = currentProgress.availableGold || 0;
        const newGold = Math.max(0, currentGold - costGold);

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
      }

      await batch.commit();
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

  static async createUserAchievement(userAchievementData: Omit<UserAchievement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
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

  static async updateUserAchievement(userAchievementId: string, updates: Partial<UserAchievement>): Promise<void> {
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

  static async updateSurpriseMissionConfig(configData: Omit<SurpriseMissionConfig, 'id' | 'createdAt' | 'updatedAt'>, lastUpdatedBy: string): Promise<void> {
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

  static async getDailyProgress(userId: string, date: string): Promise<any> {
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
      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = endDate.toISOString().split('T')[0];
      
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

  static async processUnprocessedDays(userId: string): Promise<void> {
    try {
      console.log('🔄 FirestoreService: Starting daily processing for user:', userId);
      
      // Get user progress to check last processed date
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);
      
      if (!progressDoc.exists()) {
        console.log('⚠️ FirestoreService: No progress document found, skipping daily processing');
        return;
      }
      
      const progressData = progressDoc.data();
      const lastProcessedDate = progressData.lastDailySummaryProcessedDate?.toDate();
      const todayStart = getTodayStartBrazil();

      // If already processed today, skip
      if (lastProcessedDate && lastProcessedDate >= todayStart) {
        console.log('✅ FirestoreService: Daily processing already completed for today');
        return;
      }

      // Process yesterday (if not already processed)
      const { date: yesterday, dateString: yesterdayString } = getYesterdayBrazil();
      
      // Check if yesterday was already processed
      const yesterdayProgress = await this.getDailyProgress(userId, yesterdayString);
      
      if (!yesterdayProgress || !yesterdayProgress.summaryProcessed) {
        console.log('🔄 FirestoreService: Processing yesterday:', yesterdayString);
        await this.processDailySummary(userId, yesterday);
      }
      
      // Update last processed date
      await updateDoc(progressRef, {
        lastDailySummaryProcessedDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: Daily processing completed');
    } catch (error) {
      console.error('❌ FirestoreService: Error in daily processing:', error);
      throw error;
    }
  }

  static async processDailySummary(userId: string, date: Date): Promise<void> {
    try {
      // 🚨 TEMPORARY: Daily penalties system is DISABLED
      // No gold will be deducted for incomplete tasks
      const DAILY_PENALTIES_ENABLED = false;

      const dateString = date.toISOString().split('T')[0];
      console.log('🔄 FirestoreService: Processing daily summary for:', dateString);

      if (!DAILY_PENALTIES_ENABLED) {
        console.log('⚠️ FirestoreService: Daily penalties system is DISABLED - skipping penalty calculations');

        // Still save daily progress for tracking, but without penalties
        const completions = await this.getTaskCompletionHistory(userId, date, date);
        const dailyProgressRef = doc(db, 'dailyProgress', `${userId}_${dateString}`);
        await setDoc(dailyProgressRef, {
          userId,
          date: dateString,
          xpEarned: completions.reduce((sum, c) => sum + c.xpEarned, 0),
          goldEarned: completions.reduce((sum, c) => sum + c.goldEarned, 0),
          tasksCompleted: completions.length,
          totalTasksAvailable: 0,
          goldPenalty: 0, // NO PENALTIES
          allTasksBonusGold: 0, // NO BONUS EITHER (to keep it fair)
          summaryProcessed: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        console.log('✅ FirestoreService: Daily progress saved (penalties disabled)');
        return;
      }
      
      // Get task completions for the day
      const completions = await this.getTaskCompletionHistory(userId, date, date);
      const tasksCompleted = completions.length;

      // Get all tasks (active and inactive) that existed at that time
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('ownerId', '==', userId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);

      // Filter tasks by frequency based on the day of week
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const tasksForThatDay = tasksSnapshot.docs.filter(doc => {
        const taskData = doc.data();

        // Only count if task was active at that time
        if (taskData.active === false) return false;

        // Check if task was created before or on that day
        const taskCreatedAt = taskData.createdAt?.toDate();
        if (taskCreatedAt && taskCreatedAt > date) return false;

        // Filter by frequency
        switch (taskData.frequency) {
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

      const totalTasksAvailable = tasksForThatDay.length;

      console.log('📊 FirestoreService: Daily summary calculation:', {
        date: dateString,
        dayOfWeek: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayOfWeek],
        totalTasksAvailable,
        tasksCompleted,
        completions: completions.length
      });

      let goldPenalty = 0;
      let allTasksBonusGold = 0;

      // Calculate penalties and bonuses
      if (totalTasksAvailable > 0) {
        const incompleteTasks = totalTasksAvailable - tasksCompleted;

        if (incompleteTasks > 0) {
          goldPenalty = incompleteTasks; // 1 gold penalty per incomplete task
          console.log(`⚠️ FirestoreService: Applying penalty - ${incompleteTasks} tasks incomplete = -${goldPenalty} gold`);
        }

        if (tasksCompleted >= totalTasksAvailable) {
          allTasksBonusGold = 10; // Bonus for completing all tasks
          console.log(`🎁 FirestoreService: All tasks completed! Bonus: +${allTasksBonusGold} gold`);
        }
      } else {
        console.log('⚠️ FirestoreService: No tasks available for this day, skipping penalties/bonuses');
      }
      
      // Apply penalties/bonuses to user progress
      if (goldPenalty > 0 || allTasksBonusGold > 0) {
        const progressRef = doc(db, 'progress', userId);
        const progressDoc = await getDoc(progressRef);

        if (progressDoc.exists()) {
          const currentProgress = progressDoc.data();
          const currentGold = currentProgress.availableGold || 0;

          let newGold = currentGold;
          if (goldPenalty > 0) {
            newGold = Math.max(0, currentGold - goldPenalty); // Never go below 0
          }
          if (allTasksBonusGold > 0) {
            newGold += allTasksBonusGold;
          }

          await updateDoc(progressRef, {
            availableGold: newGold,
            totalGoldEarned: (currentProgress.totalGoldEarned || 0) + allTasksBonusGold,
            updatedAt: serverTimestamp()
          });

          // Create gold transaction records for penalties and bonuses
          if (goldPenalty > 0) {
            const penaltyTransactionRef = doc(collection(db, 'goldTransactions'));
            await setDoc(penaltyTransactionRef, {
              userId,
              amount: -goldPenalty,
              type: 'penalty',
              source: 'daily_penalty',
              description: `Penalidade diária: ${incompleteTasks} tarefas não concluídas`,
              metadata: {
                date: dateString,
                tasksCompleted,
                totalTasksAvailable,
                incompleteTasks
              },
              balanceBefore: currentGold,
              balanceAfter: goldPenalty > 0 && allTasksBonusGold === 0 ? Math.max(0, currentGold - goldPenalty) : currentGold - goldPenalty + allTasksBonusGold,
              createdAt: serverTimestamp()
            });
          }

          if (allTasksBonusGold > 0) {
            const bonusTransactionRef = doc(collection(db, 'goldTransactions'));
            await setDoc(bonusTransactionRef, {
              userId,
              amount: allTasksBonusGold,
              type: 'bonus',
              source: 'daily_bonus',
              description: 'Bônus diário: Todas as tarefas concluídas!',
              metadata: {
                date: dateString,
                tasksCompleted,
                totalTasksAvailable
              },
              balanceBefore: goldPenalty > 0 ? Math.max(0, currentGold - goldPenalty) : currentGold,
              balanceAfter: newGold,
              createdAt: serverTimestamp()
            });
          }

          console.log('💰 FirestoreService: Applied daily adjustments:', {
            goldPenalty,
            allTasksBonusGold,
            oldGold: currentGold,
            newGold
          });
        }
      }
      
      // Save daily summary
      const dailyProgressRef = doc(db, 'dailyProgress', `${userId}_${dateString}`);
      await setDoc(dailyProgressRef, {
        userId,
        date: dateString,
        xpEarned: completions.reduce((sum, c) => sum + c.xpEarned, 0),
        goldEarned: completions.reduce((sum, c) => sum + c.goldEarned, 0),
        tasksCompleted,
        totalTasksAvailable,
        goldPenalty,
        allTasksBonusGold,
        summaryProcessed: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log('✅ FirestoreService: Daily summary processed successfully');
    } catch (error) {
      console.error('❌ FirestoreService: Error processing daily summary:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 REAL-TIME LISTENERS
  // ========================================

  static subscribeToUserTasks(userId: string, onUpdate: (tasks: Task[]) => void, onError?: (error: any) => void): () => void {
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
              createdBy: data.createdBy || ''
            };
          });
          onUpdate(tasks);
        },
        (error) => {
          console.error('❌ FirestoreService: Error in tasks listener:', error);
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up tasks listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserRewards(userId: string, onUpdate: (rewards: Reward[]) => void, onError?: (error: any) => void): () => void {
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
              updatedAt: data.updatedAt?.toDate() || new Date()
            };
          });
          onUpdate(rewards);
        },
        (error) => {
          console.error('❌ FirestoreService: Error in rewards listener:', error);
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up rewards listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserProgress(userId: string, onUpdate: (progress: UserProgress | null) => void, onError?: (error: any) => void): () => void {
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
              lastDailySummaryProcessedDate: data.lastDailySummaryProcessedDate?.toDate()
            };
            onUpdate(progress);
          } else {
            onUpdate(null);
          }
        },
        (error) => {
          console.error('❌ FirestoreService: Error in progress listener:', error);
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up progress listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserRedemptions(userId: string, onUpdate: (redemptions: RewardRedemption[]) => void, onError?: (error: any) => void): () => void {
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
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up redemptions listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserNotifications(userId: string, onUpdate: (notifications: Notification[]) => void, onError?: (error: any) => void): () => void {
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
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up notifications listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserFlashReminders(userId: string, onUpdate: (reminders: FlashReminder[]) => void, onError?: (error: any) => void): () => void {
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
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up flash reminders listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserAchievements(userId: string, onUpdate: (achievements: Achievement[]) => void, onError?: (error: any) => void): () => void {
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
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up achievements listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserAchievementProgress(userId: string, onUpdate: (userAchievements: UserAchievement[]) => void, onError?: (error: any) => void): () => void {
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
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up user achievements listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  // ========================================
  // 🔥 DATA INITIALIZATION
  // ========================================

  static async createDefaultData(childUid: string, adminUid: string): Promise<void> {
    try {
      console.log('🔄 FirestoreService: Creating default data for child:', childUid);
      
      // Ensure progress exists
      await this.ensureUserProgress(childUid);
      
      console.log('✅ FirestoreService: Default data created successfully');
    } catch (error) {
      console.error('❌ FirestoreService: Error creating default data:', error);
      throw error;
    }
  }

  static async createTestData(childUid: string, adminUid: string): Promise<void> {
    try {
      console.log('🔄 FirestoreService: Creating test data for child:', childUid);
      
      const batch = writeBatch(db);
      
      // Test tasks
      const testTasks = [
        { title: 'Escovar os dentes', description: 'Escove bem os dentes pela manhã', period: 'morning', xp: 10, gold: 5 },
        { title: 'Arrumar a cama', description: 'Deixe sua cama arrumadinha', period: 'morning', xp: 15, gold: 8 },
        { title: 'Fazer o dever de casa', description: 'Complete todas as atividades escolares', period: 'afternoon', xp: 25, gold: 15 },
        { title: 'Organizar os brinquedos', description: 'Guarde todos os brinquedos no lugar', period: 'evening', xp: 20, gold: 10 },
        { title: 'Tomar banho', description: 'Tome um banho relaxante', period: 'evening', xp: 15, gold: 8 }
      ];
      
      testTasks.forEach(task => {
        const taskRef = doc(collection(db, 'tasks'));
        batch.set(taskRef, {
          ...task,
          ownerId: childUid,
          frequency: 'daily',
          active: true,
          status: 'pending',
          createdBy: adminUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      // Test rewards
      const testRewards = [
        { title: '30 min de videogame extra', description: 'Tempo adicional para jogar', category: 'activity', costGold: 25, emoji: '🎮', requiredLevel: 1 },
        { title: 'Escolher o filme da noite', description: 'Você decide qual filme assistir', category: 'privilege', costGold: 40, emoji: '🎬', requiredLevel: 5 },
        { title: 'Sorvete especial', description: 'Um sorvete delicioso', category: 'treat', costGold: 35, emoji: '🍦', requiredLevel: 3 },
        { title: 'Ida ao parque', description: 'Um passeio especial no parque', category: 'activity', costGold: 80, emoji: '🏞️', requiredLevel: 10 },
        { title: 'Brinquedo novo', description: 'Um brinquedo legal para você', category: 'toy', costGold: 150, emoji: '🧸', requiredLevel: 15 }
      ];
      
      testRewards.forEach(reward => {
        const rewardRef = doc(collection(db, 'rewards'));
        batch.set(rewardRef, {
          ...reward,
          ownerId: childUid,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      console.log('✅ FirestoreService: Test data created successfully');
    } catch (error) {
      console.error('❌ FirestoreService: Error creating test data:', error);
      throw error;
    }
  }

  static async completeUserReset(userId: string): Promise<void> {
    try {
      console.log('🔄 FirestoreService: Starting complete user reset for:', userId);
      
      const batch = writeBatch(db);
      
      // Delete all user tasks
      const tasksQuery = query(collection(db, 'tasks'), where('ownerId', '==', userId));
      const tasksSnapshot = await getDocs(tasksQuery);
      tasksSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete all user rewards
      const rewardsQuery = query(collection(db, 'rewards'), where('ownerId', '==', userId));
      const rewardsSnapshot = await getDocs(rewardsQuery);
      rewardsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete all user redemptions
      const redemptionsQuery = query(collection(db, 'redemptions'), where('userId', '==', userId));
      const redemptionsSnapshot = await getDocs(redemptionsQuery);
      redemptionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete all user notifications
      const notificationsQuery = query(collection(db, 'notifications'), where('toUserId', '==', userId));
      const notificationsSnapshot = await getDocs(notificationsQuery);
      notificationsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Reset progress
      const progressRef = doc(db, 'progress', userId);
      batch.set(progressRef, {
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
      });
      
      await batch.commit();
      console.log('✅ FirestoreService: Complete user reset finished');
    } catch (error) {
      console.error('❌ FirestoreService: Error in complete user reset:', error);
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
      metadata?: Record<string, any>;
      createdBy?: string;
    }
  ): Promise<string> {
    try {
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);

      if (!progressDoc.exists()) {
        throw new Error('User progress not found');
      }

      const currentProgress = progressDoc.data();
      const balanceBefore = currentProgress.availableGold || 0;
      const balanceAfter = balanceBefore + amount;

      const transactionRef = doc(collection(db, 'goldTransactions'));
      const transactionData = {
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
      };

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

      let transactions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          amount: data.amount,
          type: data.type,
          source: data.source,
          description: data.description,
          relatedId: data.relatedId,
          relatedTitle: data.relatedTitle,
          metadata: data.metadata,
          balanceBefore: data.balanceBefore,
          balanceAfter: data.balanceAfter,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy
        } as GoldTransaction;
      });

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
    onError?: (error: any) => void
  ): () => void {
    try {
      const transactionsQuery = query(
        collection(db, 'goldTransactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      return onSnapshot(
        transactionsQuery,
        (snapshot) => {
          const transactions = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              userId: data.userId,
              amount: data.amount,
              type: data.type,
              source: data.source,
              description: data.description,
              relatedId: data.relatedId,
              relatedTitle: data.relatedTitle,
              metadata: data.metadata,
              balanceBefore: data.balanceBefore,
              balanceAfter: data.balanceAfter,
              createdAt: data.createdAt?.toDate() || new Date(),
              createdBy: data.createdBy
            } as GoldTransaction;
          });
          onUpdate(transactions);
        },
        (error) => {
          console.error('❌ FirestoreService: Error in gold transactions listener:', error);
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up gold transactions listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static async adjustGoldManually(
    userId: string,
    amount: number,
    reason: string,
    adminUid: string
  ): Promise<void> {
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
        amount,
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
    } catch (error) {
      console.error('❌ FirestoreService: Error adjusting gold manually:', error);
      throw error;
    }
  }
}