import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  User, 
  Task, 
  Reward, 
  UserProgress, 
  RewardRedemption, 
  Notification,
  FlashReminder,
  Achievement,
  UserAchievement,
  SurpriseMissionConfig,
  DailySurpriseMissionStatus
} from '../types';

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
      // First check if admin already has a linked child
      const adminDoc = await getDoc(doc(db, 'users', adminUid));
      if (adminDoc.exists() && adminDoc.data().managedChildId) {
        const childId = adminDoc.data().managedChildId;
        
        // Verify child still exists
        const childDoc = await getDoc(doc(db, 'users', childId));
        if (childDoc.exists() && childDoc.data().role === 'child') {
          return childId;
        }
      }

      // Find or create child user
      const childQuery = query(
        collection(db, 'users'),
        where('role', '==', 'child'),
        limit(1)
      );
      
      const childSnapshot = await getDocs(childQuery);
      let childUid: string;

      if (!childSnapshot.empty) {
        childUid = childSnapshot.docs[0].id;
      } else {
        // Create default child user
        const childRef = doc(collection(db, 'users'));
        await setDoc(childRef, {
          email: 'heitor@flash.com',
          displayName: 'Heitor',
          role: 'child',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginTimestamp: serverTimestamp()
        });
        childUid = childRef.id;
      }

      // Link admin to child
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
      
      // Ensure document exists first
      await this.ensureUserProgress(userId);
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(progressRef, updateData);
      console.log('✅ FirestoreService: User progress updated:', { userId, updates });
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
      const tasksRef = collection(db, 'tasks');
      const docRef = await addDoc(tasksRef, {
        ...taskData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: Task created:', docRef.id);
      return docRef.id;
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
      
      console.log('✅ FirestoreService: Task updated:', taskId);
    } catch (error) {
      console.error('❌ FirestoreService: Error updating task:', error);
      throw error;
    }
  }

  static async deleteTask(taskId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      console.log('✅ FirestoreService: Task deleted:', taskId);
    } catch (error) {
      console.error('❌ FirestoreService: Error deleting task:', error);
      throw error;
    }
  }

  static async completeTaskWithRewards(taskId: string, userId: string, xpReward: number, goldReward: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Use transaction to ensure data consistency
      await runTransaction(db, async (transaction) => {
        // 1. Update task status
        const taskRef = doc(db, 'tasks', taskId);
        const taskDoc = await transaction.get(taskRef);
        
        if (!taskDoc.exists()) {
          throw new Error('Task not found');
        }

        const taskData = taskDoc.data();
        
        // Check if already completed today
        if (taskData.status === 'done' && taskData.lastCompletedDate === today) {
          throw new Error('Task already completed today');
        }

        transaction.update(taskRef, {
          status: 'done',
          lastCompletedDate: today,
          updatedAt: serverTimestamp()
        });

        // 2. Update user progress
        const progressRef = doc(db, 'progress', userId);
        const progressDoc = await transaction.get(progressRef);
        
        let currentProgress: any = {
          totalXP: 0,
          availableGold: 0,
          totalGoldEarned: 0,
          totalTasksCompleted: 0,
          streak: 0,
          longestStreak: 0,
          level: 1
        };

        if (progressDoc.exists()) {
          currentProgress = progressDoc.data();
        }

        // Calculate new values
        const newTotalXP = (currentProgress.totalXP || 0) + xpReward;
        const newAvailableGold = (currentProgress.availableGold || 0) + goldReward;
        const newTotalGoldEarned = (currentProgress.totalGoldEarned || 0) + goldReward;
        const newTotalTasksCompleted = (currentProgress.totalTasksCompleted || 0) + 1;
        
        // Calculate new level based on XP
        const newLevel = this.calculateLevelFromXP(newTotalXP);
        
        // Update streak logic
        const lastActivityDate = currentProgress.lastActivityDate?.toDate() || new Date(0);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        let newStreak = currentProgress.streak || 0;
        let newLongestStreak = currentProgress.longestStreak || 0;
        
        // Check if this is continuation of streak
        if (lastActivityDate.toDateString() === yesterday.toDateString()) {
          newStreak += 1;
        } else if (lastActivityDate.toDateString() !== new Date().toDateString()) {
          // Reset streak if gap > 1 day
          newStreak = 1;
        }
        
        newLongestStreak = Math.max(newLongestStreak, newStreak);

        const progressUpdates = {
          userId,
          level: newLevel,
          totalXP: newTotalXP,
          availableGold: newAvailableGold,
          totalGoldEarned: newTotalGoldEarned,
          totalTasksCompleted: newTotalTasksCompleted,
          streak: newStreak,
          longestStreak: newLongestStreak,
          lastActivityDate: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        if (progressDoc.exists()) {
          transaction.update(progressRef, progressUpdates);
        } else {
          transaction.set(progressRef, {
            ...progressUpdates,
            totalGoldSpent: 0,
            rewardsRedeemed: 0,
            createdAt: serverTimestamp()
          });
        }

        // 3. Record task completion for history
        const completionRef = doc(collection(db, 'taskCompletions'));
        transaction.set(completionRef, {
          taskId,
          taskTitle: taskData.title,
          userId,
          date: today,
          xpEarned: xpReward,
          goldEarned: goldReward,
          completedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      });

      console.log('✅ FirestoreService: Task completed with rewards:', { taskId, userId, xpReward, goldReward });
    } catch (error) {
      console.error('❌ FirestoreService: Error completing task:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 REWARD MANAGEMENT
  // ========================================

  static async createReward(rewardData: Omit<Reward, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const rewardsRef = collection(db, 'rewards');
      const docRef = await addDoc(rewardsRef, {
        ...rewardData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: Reward created:', docRef.id);
      return docRef.id;
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
      
      console.log('✅ FirestoreService: Reward updated:', rewardId);
    } catch (error) {
      console.error('❌ FirestoreService: Error updating reward:', error);
      throw error;
    }
  }

  static async deleteReward(rewardId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'rewards', rewardId));
      console.log('✅ FirestoreService: Reward deleted:', rewardId);
    } catch (error) {
      console.error('❌ FirestoreService: Error deleting reward:', error);
      throw error;
    }
  }

  static async redeemReward(userId: string, rewardId: string, costGold: number): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Check user has enough gold
        const progressRef = doc(db, 'progress', userId);
        const progressDoc = await transaction.get(progressRef);
        
        if (!progressDoc.exists()) {
          throw new Error('User progress not found');
        }

        const progressData = progressDoc.data();
        const availableGold = progressData.availableGold || 0;
        
        if (availableGold < costGold) {
          throw new Error('Insufficient gold');
        }

        // 2. Check for existing pending redemption
        const existingRedemptionsQuery = query(
          collection(db, 'redemptions'),
          where('userId', '==', userId),
          where('rewardId', '==', rewardId),
          where('status', '==', 'pending')
        );
        
        const existingRedemptions = await getDocs(existingRedemptionsQuery);
        if (!existingRedemptions.empty) {
          throw new Error('Redemption already pending for this reward');
        }

        // 3. Create redemption record
        const redemptionRef = doc(collection(db, 'redemptions'));
        transaction.set(redemptionRef, {
          userId,
          rewardId,
          costGold,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // 4. Deduct gold (temporarily - will be restored if rejected)
        transaction.update(progressRef, {
          availableGold: availableGold - costGold,
          totalGoldSpent: (progressData.totalGoldSpent || 0) + costGold,
          updatedAt: serverTimestamp()
        });
      });

      console.log('✅ FirestoreService: Reward redeemed:', { userId, rewardId, costGold });
    } catch (error) {
      console.error('❌ FirestoreService: Error redeeming reward:', error);
      throw error;
    }
  }

  static async approveRedemption(redemptionId: string, approved: boolean, approvedBy: string): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const redemptionRef = doc(db, 'redemptions', redemptionId);
        const redemptionDoc = await transaction.get(redemptionRef);
        
        if (!redemptionDoc.exists()) {
          throw new Error('Redemption not found');
        }

        const redemptionData = redemptionDoc.data();
        
        if (redemptionData.status !== 'pending') {
          throw new Error('Redemption already processed');
        }

        // Update redemption status
        transaction.update(redemptionRef, {
          status: approved ? 'approved' : 'rejected',
          approvedBy,
          updatedAt: serverTimestamp()
        });

        // If rejected, restore gold to user
        if (!approved) {
          const progressRef = doc(db, 'progress', redemptionData.userId);
          const progressDoc = await transaction.get(progressRef);
          
          if (progressDoc.exists()) {
            const progressData = progressDoc.data();
            transaction.update(progressRef, {
              availableGold: (progressData.availableGold || 0) + redemptionData.costGold,
              totalGoldSpent: Math.max(0, (progressData.totalGoldSpent || 0) - redemptionData.costGold),
              updatedAt: serverTimestamp()
            });
          }
        } else {
          // If approved, increment rewards redeemed counter
          const progressRef = doc(db, 'progress', redemptionData.userId);
          const progressDoc = await transaction.get(progressRef);
          
          if (progressDoc.exists()) {
            const progressData = progressDoc.data();
            transaction.update(progressRef, {
              rewardsRedeemed: (progressData.rewardsRedeemed || 0) + 1,
              updatedAt: serverTimestamp()
            });
          }
        }
      });

      console.log('✅ FirestoreService: Redemption processed:', { redemptionId, approved });
    } catch (error) {
      console.error('❌ FirestoreService: Error processing redemption:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 DAILY PROCESSING & PENALTIES
  // ========================================

  static async processUnprocessedDays(userId: string): Promise<void> {
    try {
      console.log('🔄 FirestoreService: Starting daily processing for user:', userId);
      
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);
      
      if (!progressDoc.exists()) {
        console.log('⚠️ No progress document found, skipping daily processing');
        return;
      }

      const progressData = progressDoc.data();
      const lastProcessedDate = progressData.lastDailySummaryProcessedDate?.toDate();
      
      // Start from yesterday if no last processed date
      const startDate = lastProcessedDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Process each day from last processed to yesterday
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + 1); // Start from day after last processed
      
      while (currentDate < today) {
        await this.processDailySummary(userId, new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Update last processed date
      await updateDoc(progressRef, {
        lastDailySummaryProcessedDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: Daily processing completed for user:', userId);
    } catch (error) {
      console.error('❌ FirestoreService: Error in daily processing:', error);
      throw error;
    }
  }

  static async processDailySummary(userId: string, date: Date): Promise<void> {
    try {
      const dateString = date.toISOString().split('T')[0];
      console.log('🔄 FirestoreService: Processing daily summary for:', { userId, date: dateString });
      
      // Check if already processed
      const dailyProgressRef = doc(db, 'dailyProgress', `${userId}_${dateString}`);
      const dailyProgressDoc = await getDoc(dailyProgressRef);
      
      if (dailyProgressDoc.exists() && dailyProgressDoc.data().summaryProcessed) {
        console.log('⚠️ Daily summary already processed for:', dateString);
        return;
      }

      // Get task completions for this day
      const completionsQuery = query(
        collection(db, 'taskCompletions'),
        where('userId', '==', userId),
        where('date', '==', dateString)
      );
      
      const completionsSnapshot = await getDocs(completionsQuery);
      const completions = completionsSnapshot.docs.map(doc => doc.data());
      
      // Get active tasks for this day (approximate - we don't have historical task states)
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('ownerId', '==', userId),
        where('active', '==', true)
      );
      
      const tasksSnapshot = await getDocs(tasksQuery);
      const activeTasks = tasksSnapshot.docs.map(doc => doc.data());
      
      // Filter tasks that should be available on this day
      const availableTasks = activeTasks.filter(task => {
        const dayOfWeek = date.getDay();
        switch (task.frequency) {
          case 'daily': return true;
          case 'weekday': return dayOfWeek >= 1 && dayOfWeek <= 5;
          case 'weekend': return dayOfWeek === 0 || dayOfWeek === 6;
          default: return true;
        }
      });

      const totalTasksCompleted = completions.length;
      const totalTasksAvailable = availableTasks.length;
      const incompleteTasks = Math.max(0, totalTasksAvailable - totalTasksCompleted);
      
      // Calculate penalties and bonuses
      let goldPenalty = 0;
      let allTasksBonusGold = 0;
      
      if (totalTasksAvailable > 0) {
        // Penalty: -1 Gold per incomplete task
        goldPenalty = incompleteTasks;
        
        // Bonus: +10 Gold if all tasks completed
        if (totalTasksCompleted >= totalTasksAvailable) {
          allTasksBonusGold = 10;
        }
      }

      // Apply penalties/bonuses if any
      if (goldPenalty > 0 || allTasksBonusGold > 0) {
        const progressRef = doc(db, 'progress', userId);
        const progressDoc = await getDoc(progressRef);
        
        if (progressDoc.exists()) {
          const currentProgress = progressDoc.data();
          const currentGold = currentProgress.availableGold || 0;
          
          let newGold = currentGold;
          let newTotalGoldEarned = currentProgress.totalGoldEarned || 0;
          
          // Apply penalty (never go below 0)
          if (goldPenalty > 0) {
            newGold = Math.max(0, newGold - goldPenalty);
          }
          
          // Apply bonus
          if (allTasksBonusGold > 0) {
            newGold += allTasksBonusGold;
            newTotalGoldEarned += allTasksBonusGold;
          }
          
          await updateDoc(progressRef, {
            availableGold: newGold,
            totalGoldEarned: newTotalGoldEarned,
            updatedAt: serverTimestamp()
          });
          
          console.log('💰 Daily penalties/bonuses applied:', {
            userId,
            date: dateString,
            goldPenalty,
            allTasksBonusGold,
            newGold
          });
        }
      }

      // Record daily progress summary
      await setDoc(dailyProgressRef, {
        userId,
        date: dateString,
        totalTasksCompleted,
        totalTasksAvailable,
        xpEarned: completions.reduce((sum, c) => sum + (c.xpEarned || 0), 0),
        goldEarned: completions.reduce((sum, c) => sum + (c.goldEarned || 0), 0),
        goldPenalty,
        allTasksBonusGold,
        summaryProcessed: true,
        processedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ FirestoreService: Daily summary processed:', {
        userId,
        date: dateString,
        totalTasksCompleted,
        totalTasksAvailable,
        goldPenalty,
        allTasksBonusGold
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error processing daily summary:', error);
      throw error;
    }
  }

  static async getDailyProgress(userId: string, date: string): Promise<any> {
    try {
      const dailyProgressRef = doc(db, 'dailyProgress', `${userId}_${date}`);
      const dailyProgressDoc = await getDoc(dailyProgressRef);
      
      if (dailyProgressDoc.exists()) {
        const data = dailyProgressDoc.data();
        return {
          ...data,
          processedAt: data.processedAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
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
      const dailyProgressRef = doc(db, 'dailyProgress', `${userId}_${date}`);
      const dailyProgressDoc = await getDoc(dailyProgressRef);
      
      if (dailyProgressDoc.exists()) {
        const currentData = dailyProgressDoc.data();
        await updateDoc(dailyProgressRef, {
          xpEarned: (currentData.xpEarned || 0) + xpGained,
          goldEarned: (currentData.goldEarned || 0) + goldGained,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(dailyProgressRef, {
          userId,
          date,
          xpEarned: xpGained,
          goldEarned: goldGained,
          totalTasksCompleted: 0,
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
        orderBy('date', 'desc'),
        orderBy('completedAt', 'desc')
      );
      
      const snapshot = await getDocs(completionsQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          taskId: data.taskId,
          taskTitle: data.taskTitle,
          date: data.date,
          xpEarned: data.xpEarned || 0,
          goldEarned: data.goldEarned || 0,
          completedAt: data.completedAt?.toDate() || new Date()
        };
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error getting task completion history:', error);
      return [];
    }
  }

  // ========================================
  // 🔥 LEVEL CALCULATION
  // ========================================

  static calculateLevelFromXP(totalXP: number): number {
    if (totalXP < 100) return 1;
    if (totalXP < 250) return 2;
    if (totalXP < 450) return 3;
    if (totalXP < 700) return 4;
    if (totalXP < 1000) return 5;
    
    // A partir de 1000 XP, cada 350 XP = 1 nível
    return Math.min(100, 6 + Math.floor((totalXP - 1000) / 350));
  }

  // ========================================
  // 🔥 NOTIFICATION MANAGEMENT
  // ========================================

  static async createNotification(notificationData: Omit<Notification, 'id' | 'sentAt'>): Promise<string> {
    try {
      const notificationsRef = collection(db, 'notifications');
      const docRef = await addDoc(notificationsRef, {
        ...notificationData,
        sentAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: Notification created:', docRef.id);
      return docRef.id;
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
      
      console.log('✅ FirestoreService: Notification marked as read:', notificationId);
    } catch (error) {
      console.error('❌ FirestoreService: Error marking notification as read:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 FLASH REMINDERS
  // ========================================

  static async createFlashReminder(reminderData: Omit<FlashReminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const remindersRef = collection(db, 'flashReminders');
      const docRef = await addDoc(remindersRef, {
        ...reminderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: Flash reminder created:', docRef.id);
      return docRef.id;
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
      
      console.log('✅ FirestoreService: Flash reminder updated:', reminderId);
    } catch (error) {
      console.error('❌ FirestoreService: Error updating flash reminder:', error);
      throw error;
    }
  }

  static async deleteFlashReminder(reminderId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'flashReminders', reminderId));
      console.log('✅ FirestoreService: Flash reminder deleted:', reminderId);
    } catch (error) {
      console.error('❌ FirestoreService: Error deleting flash reminder:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 ACHIEVEMENTS
  // ========================================

  static async createAchievement(achievementData: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const achievementsRef = collection(db, 'achievements');
      const docRef = await addDoc(achievementsRef, {
        ...achievementData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: Achievement created:', docRef.id);
      return docRef.id;
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
      
      console.log('✅ FirestoreService: Achievement updated:', achievementId);
    } catch (error) {
      console.error('❌ FirestoreService: Error updating achievement:', error);
      throw error;
    }
  }

  static async deleteAchievement(achievementId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'achievements', achievementId));
      console.log('✅ FirestoreService: Achievement deleted:', achievementId);
    } catch (error) {
      console.error('❌ FirestoreService: Error deleting achievement:', error);
      throw error;
    }
  }

  static async createUserAchievement(userAchievementData: Omit<UserAchievement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const userAchievementsRef = collection(db, 'userAchievements');
      const docRef = await addDoc(userAchievementsRef, {
        ...userAchievementData,
        rewardClaimed: false,
        claimedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: User achievement created:', docRef.id);
      return docRef.id;
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
      
      console.log('✅ FirestoreService: User achievement updated:', userAchievementId);
    } catch (error) {
      console.error('❌ FirestoreService: Error updating user achievement:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 SURPRISE MISSIONS
  // ========================================

  static async getSurpriseMissionConfig(): Promise<SurpriseMissionConfig | null> {
    try {
      const configQuery = query(collection(db, 'surpriseMissionConfig'), limit(1));
      const snapshot = await getDocs(configQuery);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
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
      return null;
    }
  }

  static async updateSurpriseMissionConfig(configData: Omit<SurpriseMissionConfig, 'id' | 'createdAt' | 'updatedAt'>, updatedBy: string): Promise<void> {
    try {
      // Get existing config or create new one
      const configQuery = query(collection(db, 'surpriseMissionConfig'), limit(1));
      const snapshot = await getDocs(configQuery);
      
      const updateData = {
        ...configData,
        lastUpdatedBy: updatedBy,
        updatedAt: serverTimestamp()
      };

      if (!snapshot.empty) {
        const configRef = doc(db, 'surpriseMissionConfig', snapshot.docs[0].id);
        await updateDoc(configRef, updateData);
      } else {
        const configRef = doc(collection(db, 'surpriseMissionConfig'));
        await setDoc(configRef, {
          ...updateData,
          createdAt: serverTimestamp()
        });
      }
      
      console.log('✅ FirestoreService: Surprise mission config updated');
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
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: Surprise mission marked as completed:', { userId, date, results });
    } catch (error) {
      console.error('❌ FirestoreService: Error marking surprise mission as completed:', error);
      throw error;
    }
  }

  static async getSurpriseMissionHistory(userId: string, limit: number = 30): Promise<DailySurpriseMissionStatus[]> {
    try {
      const historyQuery = query(
        collection(db, 'dailySurpriseMissionStatus'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limit)
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
      console.error('❌ FirestoreService: Error checking quiz status:', error);
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
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: Quiz marked as completed:', { userId, date, results });
    } catch (error) {
      console.error('❌ FirestoreService: Error marking quiz as completed:', error);
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
        (doc) => {
          if (doc.exists()) {
            const data = doc.data();
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
              type: data.type || 'custom',
              target: data.target || 1,
              xpReward: data.xpReward || 0,
              goldReward: data.goldReward || 0,
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
  // 🔥 DATA MANAGEMENT
  // ========================================

  static async createDefaultData(childUid: string, adminUid: string): Promise<void> {
    try {
      console.log('🔄 FirestoreService: Creating default data for child:', childUid);
      
      // Ensure progress exists
      await this.ensureUserProgress(childUid);
      
      // Create default tasks if none exist
      const existingTasksQuery = query(
        collection(db, 'tasks'),
        where('ownerId', '==', childUid),
        limit(1)
      );
      
      const existingTasks = await getDocs(existingTasksQuery);
      
      if (existingTasks.empty) {
        const defaultTasks = [
          {
            title: 'Escovar os dentes',
            description: 'Manter os dentes limpos e saudáveis',
            xp: 10,
            gold: 5,
            period: 'morning' as const,
            time: '07:30',
            frequency: 'daily' as const,
            active: true,
            status: 'pending' as const,
            ownerId: childUid,
            createdBy: adminUid
          },
          {
            title: 'Arrumar a cama',
            description: 'Deixar o quarto organizado',
            xp: 15,
            gold: 8,
            period: 'morning' as const,
            frequency: 'daily' as const,
            active: true,
            status: 'pending' as const,
            ownerId: childUid,
            createdBy: adminUid
          }
        ];

        for (const task of defaultTasks) {
          await this.createTask(task);
        }
      }

      // Create default rewards if none exist
      const existingRewardsQuery = query(
        collection(db, 'rewards'),
        where('ownerId', '==', childUid),
        limit(1)
      );
      
      const existingRewards = await getDocs(existingRewardsQuery);
      
      if (existingRewards.empty) {
        const defaultRewards = [
          {
            title: '30 min de videogame extra',
            description: 'Tempo adicional para jogar seus jogos favoritos',
            category: 'activity' as const,
            costGold: 25,
            emoji: '🎮',
            active: true,
            requiredLevel: 1,
            ownerId: childUid
          },
          {
            title: 'Escolher o filme da noite',
            description: 'Você decide qual filme assistir em família',
            category: 'privilege' as const,
            costGold: 40,
            emoji: '🎬',
            active: true,
            requiredLevel: 5,
            ownerId: childUid
          }
        ];

        for (const reward of defaultRewards) {
          await this.createReward(reward);
        }
      }

      console.log('✅ FirestoreService: Default data created successfully');
    } catch (error) {
      console.error('❌ FirestoreService: Error creating default data:', error);
      throw error;
    }
  }

  static async createTestData(childUid: string, adminUid: string): Promise<void> {
    try {
      console.log('🎯 FirestoreService: Creating test data for child:', childUid);
      
      const testTasks = [
        {
          title: 'Fazer o dever de casa',
          description: 'Completar todas as atividades escolares',
          xp: 25,
          gold: 15,
          period: 'afternoon' as const,
          time: '14:00',
          frequency: 'weekday' as const,
          active: true,
          status: 'pending' as const,
          ownerId: childUid,
          createdBy: adminUid
        },
        {
          title: 'Organizar os brinquedos',
          description: 'Deixar o quarto arrumado',
          xp: 15,
          gold: 10,
          period: 'evening' as const,
          frequency: 'daily' as const,
          active: true,
          status: 'pending' as const,
          ownerId: childUid,
          createdBy: adminUid
        },
        {
          title: 'Ajudar na cozinha',
          description: 'Auxiliar no preparo das refeições',
          xp: 20,
          gold: 12,
          period: 'evening' as const,
          frequency: 'weekend' as const,
          active: true,
          status: 'pending' as const,
          ownerId: childUid,
          createdBy: adminUid
        }
      ];

      const testRewards = [
        {
          title: 'Sorvete especial',
          description: 'Um sorvete delicioso de sobremesa',
          category: 'treat' as const,
          costGold: 20,
          emoji: '🍦',
          active: true,
          requiredLevel: 1,
          ownerId: childUid
        },
        {
          title: 'Ida ao parque',
          description: 'Um passeio especial no parque',
          category: 'activity' as const,
          costGold: 60,
          emoji: '🏞️',
          active: true,
          requiredLevel: 10,
          ownerId: childUid
        },
        {
          title: 'Carrinho novo',
          description: 'Um carrinho legal para brincar',
          category: 'toy' as const,
          costGold: 100,
          emoji: '🚗',
          active: true,
          requiredLevel: 15,
          ownerId: childUid
        }
      ];

      // Create tasks
      for (const task of testTasks) {
        await this.createTask(task);
      }

      // Create rewards
      for (const reward of testRewards) {
        await this.createReward(reward);
      }

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
      
      // Delete all user achievements
      const achievementsQuery = query(collection(db, 'achievements'), where('ownerId', '==', userId));
      const achievementsSnapshot = await getDocs(achievementsQuery);
      achievementsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete all user achievement progress
      const userAchievementsQuery = query(collection(db, 'userAchievements'), where('userId', '==', userId));
      const userAchievementsSnapshot = await getDocs(userAchievementsQuery);
      userAchievementsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete all flash reminders
      const remindersQuery = query(collection(db, 'flashReminders'), where('ownerId', '==', userId));
      const remindersSnapshot = await getDocs(remindersQuery);
      remindersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete all task completions
      const completionsQuery = query(collection(db, 'taskCompletions'), where('userId', '==', userId));
      const completionsSnapshot = await getDocs(completionsQuery);
      completionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete all daily progress
      const dailyProgressQuery = query(collection(db, 'dailyProgress'), where('userId', '==', userId));
      const dailyProgressSnapshot = await getDocs(dailyProgressQuery);
      dailyProgressSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Reset user progress
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
      
      // Force refresh of user progress
      await this.ensureUserProgress(userId);
      
      // Trigger any pending daily processing
      await this.processUnprocessedDays(userId);
      
      console.log('✅ FirestoreService: User data synced successfully');
    } catch (error) {
      console.error('❌ FirestoreService: Error syncing user data:', error);
      throw error;
    }
  }
}