import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  writeBatch,
  getDocs,
  addDoc,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  Task, 
  Reward, 
  UserProgress, 
  RewardRedemption, 
  Notification, 
  User,
  FlashReminder,
  Achievement,
  UserAchievement
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
      // Look for existing child user
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'child')
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      let childUid = '';
      
      if (!usersSnapshot.empty) {
        // Use first child found
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
          updatedAt: data.updatedAt?.toDate() || new Date()
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
      // Check if task was already completed today
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const taskRef = doc(db, 'tasks', taskId);
      const taskDoc = await getDoc(taskRef);
      
      if (!taskDoc.exists()) {
        throw new Error('Task not found');
      }
      
      const taskData = taskDoc.data();
      const lastCompletedDate = taskData.lastCompletedDate;
      
      if (lastCompletedDate === today) {
        throw new Error('Task already completed today');
      }
      
      const batch = writeBatch(db);
      
      // Update task status
      batch.update(taskRef, {
        status: 'done',
        lastCompletedDate: today,
        updatedAt: serverTimestamp()
      });
      
      // Update user progress
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);
      
      if (progressDoc.exists()) {
        const currentProgress = progressDoc.data();
        
        // Calculate new streak
        const lastActivityDate = currentProgress.lastActivityDate?.toDate();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        let newStreak = 1;
        if (lastActivityDate) {
          const lastActivityDateString = lastActivityDate.toISOString().split('T')[0];
          const yesterdayString = yesterday.toISOString().split('T')[0];
          const todayString = today;
          
          if (lastActivityDateString === yesterdayString) {
            // Consecutive day
            newStreak = (currentProgress.streak || 0) + 1;
          } else if (lastActivityDateString === todayString) {
            // Same day, keep current streak
            newStreak = currentProgress.streak || 1;
          } else {
            // Streak broken, start new
            newStreak = 1;
          }
        }
        
        const newLongestStreak = Math.max(newStreak, currentProgress.longestStreak || 0);
        
        batch.update(progressRef, {
          totalXP: (currentProgress.totalXP || 0) + xpReward,
          availableGold: (currentProgress.availableGold || 0) + goldReward,
          totalGoldEarned: (currentProgress.totalGoldEarned || 0) + goldReward,
          totalTasksCompleted: (currentProgress.totalTasksCompleted || 0) + 1,
          streak: newStreak,
          longestStreak: newLongestStreak,
          lastActivityDate: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      await batch.commit();
      
      console.log('✅ Task completed with rewards:', {
        taskId,
        userId,
        xpReward,
        goldReward,
        newTotalTasks: (progressDoc.exists() ? progressDoc.data().totalTasksCompleted || 0 : 0) + 1
      });
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

  static async redeemReward(userId: string, rewardId: string, goldCost: number): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Create redemption
      const redemptionRef = doc(collection(db, 'redemptions'));
      batch.set(redemptionRef, {
        userId,
        rewardId,
        costGold: goldCost,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Deduct gold from user
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);
      
      if (progressDoc.exists()) {
        const currentProgress = progressDoc.data();
        batch.update(progressRef, {
          availableGold: (currentProgress.availableGold || 0) - goldCost,
          totalGoldSpent: (currentProgress.totalGoldSpent || 0) + goldCost,
          updatedAt: serverTimestamp()
        });
      }
      
      await batch.commit();
      
      console.log('✅ Reward redeemed (pending approval):', {
        userId,
        rewardId,
        goldCost,
        status: 'pending'
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error redeeming reward:', error);
      throw error;
    }
  }

  static async approveRedemption(redemptionId: string, approved: boolean, approvedBy: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Update redemption status
      const redemptionRef = doc(db, 'redemptions', redemptionId);
      const redemptionDoc = await getDoc(redemptionRef);
      
      if (!redemptionDoc.exists()) {
        throw new Error('Redemption not found');
      }
      
      const redemptionData = redemptionDoc.data();
      
      batch.update(redemptionRef, {
        status: approved ? 'approved' : 'rejected',
        approvedBy,
        updatedAt: serverTimestamp()
      });
      
      const progressRef = doc(db, 'progress', redemptionData.userId);
      const progressDoc = await getDoc(progressRef);
      
      if (progressDoc.exists()) {
        const currentProgress = progressDoc.data();
        
        if (approved) {
          // If approved, increment rewardsRedeemed counter
          batch.update(progressRef, {
            rewardsRedeemed: (currentProgress.rewardsRedeemed || 0) + 1,
            updatedAt: serverTimestamp()
          });
        } else {
          // If rejected, refund gold to user
          batch.update(progressRef, {
            availableGold: (currentProgress.availableGold || 0) + redemptionData.costGold,
            totalGoldSpent: Math.max(0, (currentProgress.totalGoldSpent || 0) - redemptionData.costGold),
            updatedAt: serverTimestamp()
          });
        }
      }
      
      await batch.commit();
      
      console.log('✅ Redemption processed:', {
        redemptionId,
        approved,
        userId: redemptionData.userId,
        rewardId: redemptionData.rewardId,
        costGold: redemptionData.costGold
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error approving redemption:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 NOTIFICATION MANAGEMENT
  // ========================================

  static async createNotification(notificationData: Omit<Notification, 'id' | 'sentAt'>): Promise<string> {
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
      await updateDoc(doc(db, 'notifications', notificationId), {
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
      await updateDoc(doc(db, 'flashReminders', reminderId), {
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
      console.log('✅ FirestoreService: Achievement created with ID:', achievementRef.id);
      return achievementRef.id;
    } catch (error) {
      console.error('❌ FirestoreService: Error creating achievement:', error);
      throw error;
    }
  }

  static async updateAchievement(achievementId: string, updates: Partial<Achievement>): Promise<void> {
    try {
      await updateDoc(doc(db, 'achievements', achievementId), {
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
      // Validate required fields
      if (!userAchievementData.userId || typeof userAchievementData.userId !== 'string') {
        throw new Error('userId is required and must be a string');
      }
      
      if (!userAchievementData.achievementId || typeof userAchievementData.achievementId !== 'string') {
        throw new Error('achievementId is required and must be a string');
      }
      
      const userAchievementRef = doc(collection(db, 'userAchievements'));
      const completeUserAchievementData = {
        ...userAchievementData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      console.log('✅ FirestoreService: Creating user achievement:', {
        id: userAchievementRef.id,
        userId: userAchievementData.userId,
        achievementId: userAchievementData.achievementId,
        progress: userAchievementData.progress,
        isCompleted: userAchievementData.isCompleted
      });
      
      await setDoc(userAchievementRef, completeUserAchievementData);
      return userAchievementRef.id;
    } catch (error) {
      console.error('❌ FirestoreService: Error creating user achievement:', error);
      throw error;
    }
  }

  static async updateUserAchievement(userAchievementId: string, updates: Partial<UserAchievement>): Promise<void> {
    try {
      await updateDoc(doc(db, 'userAchievements', userAchievementId), {
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
      return null;
    }
  }

  static async updateSurpriseMissionConfig(
    configData: Omit<SurpriseMissionConfig, 'id' | 'createdAt' | 'updatedAt'>,
    adminUid: string
  ): Promise<void> {
    try {
      const configRef = doc(db, 'surpriseMissionConfig', 'default');
      const existingConfig = await getDoc(configRef);
      
      const updateData = {
        ...configData,
        lastUpdatedBy: adminUid,
        updatedAt: serverTimestamp()
      };
      
      if (existingConfig.exists()) {
        await updateDoc(configRef, updateData);
      } else {
        await setDoc(configRef, {
          ...updateData,
          createdAt: serverTimestamp()
        });
      }
      
      console.log('✅ FirestoreService: Surprise mission config updated:', configData);
    } catch (error) {
      console.error('❌ FirestoreService: Error updating surprise mission config:', error);
      throw error;
    }
  }

  static async checkSurpriseMissionCompletedToday(userId: string, date: string): Promise<boolean> {
    try {
      const statusRef = doc(db, 'dailySurpriseMissionStatus', `${userId}_${date}`);
      const statusDoc = await getDoc(statusRef);
      return statusDoc.exists() && statusDoc.data()?.completed === true;
    } catch (error) {
      console.error('❌ FirestoreService: Error checking surprise mission completion:', error);
      return false;
    }
  }

  static async markSurpriseMissionCompletedToday(
    userId: string, 
    date: string, 
    missionData: {
      score: number;
      totalQuestions: number;
      xpEarned: number;
      goldEarned: number;
      completedAt: Date;
    }
  ): Promise<void> {
    try {
      const statusRef = doc(db, 'dailySurpriseMissionStatus', `${userId}_${date}`);
      await setDoc(statusRef, {
        userId,
        date,
        completed: true,
        ...missionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: Surprise mission marked as completed:', {
        userId,
        date,
        score: missionData.score,
        xpEarned: missionData.xpEarned,
        goldEarned: missionData.goldEarned
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error marking surprise mission as completed:', error);
      throw error;
    }
  }

  static async getSurpriseMissionHistory(userId: string, queryLimit: number = 10): Promise<DailySurpriseMissionStatus[]> {
    try {
      // Temporary workaround: Remove orderBy to avoid composite index requirement
      // TODO: Create composite index in Firebase Console for userId + createdAt
      const q = query(
        collection(db, 'dailySurpriseMissionStatus'),
        where('userId', '==', userId),
        limit(queryLimit)
      );
      
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          date: data.date,
          completed: data.completed || false,
          score: data.score || 0,
          totalQuestions: data.totalQuestions || 30,
          xpEarned: data.xpEarned || 0,
          goldEarned: data.goldEarned || 0,
          completedAt: data.completedAt?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as DailySurpriseMissionStatus;
      });
      
      // Sort manually by createdAt descending since we can't use orderBy without index
      return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('❌ FirestoreService: Error getting surprise mission history:', error);
      return [];
    }
  }

  // ========================================
  // 🔥 REAL-TIME LISTENERS
  // ========================================

  static subscribeToUserTasks(userId: string, onUpdate: (tasks: Task[]) => void, onError?: (error: any) => void) {
    try {
      const q = query(
        collection(db, 'tasks'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q, 
        (snapshot) => {
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
          
          const tasks = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Reset task status if it's a new day
            const lastCompletedDate = data.lastCompletedDate;
            const shouldReset = data.status === 'done' && lastCompletedDate !== today;
            
            return {
              id: doc.id,
              ownerId: data.ownerId,
              title: data.title,
              description: data.description,
              xp: data.xp || 10,
              gold: data.gold || 1,
              period: data.period,
              time: data.time,
              frequency: data.frequency || 'daily',
              active: data.active !== false,
              status: shouldReset ? 'pending' : (data.status || 'pending'),
              lastCompletedDate: data.lastCompletedDate,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              createdBy: data.createdBy
            } as Task;
          });
          
          // Auto-reset tasks that need to be reset
          const tasksToReset = tasks.filter(task => 
            task.status === 'done' && 
            task.lastCompletedDate && 
            task.lastCompletedDate !== today
          );
          
          if (tasksToReset.length > 0) {
            console.log(`🔄 Auto-resetting ${tasksToReset.length} tasks for new day`);
            
            // Reset tasks in background
            const resetTasks = async () => {
              const batch = writeBatch(db);
              tasksToReset.forEach(task => {
                batch.update(doc(db, 'tasks', task.id), {
                  status: 'pending',
                  updatedAt: serverTimestamp()
                });
              });
              await batch.commit();
            };
            
            resetTasks().catch(error => {
              console.error('❌ Error auto-resetting tasks:', error);
            });
          }
          
          onUpdate(tasks);
        },
        onError
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up tasks listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserRewards(userId: string, onUpdate: (rewards: Reward[]) => void, onError?: (error: any) => void) {
    try {
      const q = query(
        collection(db, 'rewards'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q,
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
            } as Reward;
          });
          onUpdate(rewards);
        },
        onError
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up rewards listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserProgress(userId: string, onUpdate: (progress: UserProgress | null) => void, onError?: (error: any) => void) {
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
              updatedAt: data.updatedAt?.toDate() || new Date()
            };
            
            console.log('🔥 Progress updated:', {
              userId,
              totalXP: progress.totalXP,
              totalTasksCompleted: progress.totalTasksCompleted,
              streak: progress.streak,
              longestStreak: progress.longestStreak,
              rewardsRedeemed: progress.rewardsRedeemed,
              level: progress.level
            });
            
            onUpdate(progress);
          } else {
            onUpdate(null);
          }
        },
        onError
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up progress listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserRedemptions(userId: string, onUpdate: (redemptions: RewardRedemption[]) => void, onError?: (error: any) => void) {
    try {
      const q = query(
        collection(db, 'redemptions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q,
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
            } as RewardRedemption;
          });
          onUpdate(redemptions);
        },
        onError
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up redemptions listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserNotifications(userId: string, onUpdate: (notifications: Notification[]) => void, onError?: (error: any) => void) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('toUserId', '==', userId),
        orderBy('sentAt', 'desc'),
        limit(50)
      );
      
      return onSnapshot(q,
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
            } as Notification;
          });
          onUpdate(notifications);
        },
        onError
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up notifications listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserFlashReminders(userId: string, onUpdate: (flashReminders: FlashReminder[]) => void, onError?: (error: any) => void) {
    try {
      const q = query(
        collection(db, 'flashReminders'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q,
        (snapshot) => {
          const flashReminders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ownerId: data.ownerId,
              title: data.title,
              message: data.message,
              icon: data.icon || '⚡',
              color: data.color || 'yellow',
              priority: data.priority || 'medium',
              active: data.active !== false,
              showOnDashboard: data.showOnDashboard !== false,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              createdBy: data.createdBy
            } as FlashReminder;
          });
          onUpdate(flashReminders);
        },
        onError
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up flash reminders listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  static subscribeToUserAchievements(userId: string, onUpdate: (achievements: Achievement[]) => void, onError?: (error: any) => void) {
    try {
      const q = query(
        collection(db, 'achievements'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q,
        (snapshot) => {
          const achievements = snapshot.docs.map(doc => {
            const data = doc.data();
            const achievement = {
              id: doc.id, // CRITICAL: Map document ID to achievement.id
              ownerId: data.ownerId,
              title: data.title,
              description: data.description,
              icon: data.icon || '🏆',
              type: data.type || 'custom',
              target: data.target || 1,
              xpReward: data.xpReward || 0,
              goldReward: data.goldReward || 0,
              isActive: data.isActive !== false,
              createdBy: data.createdBy,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            } as Achievement;
            
            console.log('🏆 FirestoreService: Mapped achievement:', {
              docId: doc.id,
              achievementId: achievement.id,
              title: achievement.title
            });
            
            return achievement;
          });
          
          console.log(`🏆 FirestoreService: Loaded ${achievements.length} achievements for user ${userId}`);
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

  static subscribeToUserAchievementProgress(userId: string, onUpdate: (userAchievements: UserAchievement[]) => void, onError?: (error: any) => void) {
    try {
      const q = query(
        collection(db, 'userAchievements'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q,
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
            } as UserAchievement;
          });
          onUpdate(userAchievements);
        },
        onError
      );
    } catch (error) {
      console.error('❌ FirestoreService: Error setting up user achievements listener:', error);
      if (onError) onError(error);
      return () => {};
    }
  }

  // ========================================
  // 🔥 QUIZ MANAGEMENT
  // ========================================

  static async checkQuizCompletedToday(userId: string, date: string): Promise<boolean> {
    try {
      const quizRef = doc(db, 'dailyQuizzes', `${userId}_${date}`);
      const quizDoc = await getDoc(quizRef);
      return quizDoc.exists();
    } catch (error) {
      console.error('❌ FirestoreService: Error checking quiz completion:', error);
      return false;
    }
  }

  static async markQuizCompletedToday(userId: string, date: string, quizData: {
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
        ...quizData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error marking quiz as completed:', error);
      throw error;
    }
  }

  static async getDailyProgress(userId: string, date: string): Promise<{
    xpEarned: number;
    goldEarned: number;
    tasksCompleted: number;
  } | null> {
    try {
      const progressRef = doc(db, 'dailyProgress', `${userId}_${date}`);
      const progressDoc = await getDoc(progressRef);
      
      if (progressDoc.exists()) {
        const data = progressDoc.data();
        return {
          xpEarned: data.xpEarned || 0,
          goldEarned: data.goldEarned || 0,
          tasksCompleted: data.tasksCompleted || 0
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
  // 🔥 DATA MANAGEMENT
  // ========================================

  static async createDefaultData(childUid: string, adminUid: string): Promise<void> {
    try {
      console.log('🔄 FirestoreService: Creating default data for child:', childUid);
      
      const batch = writeBatch(db);
      
      // Ensure progress exists
      const progressRef = doc(db, 'progress', childUid);
      batch.set(progressRef, {
        userId: childUid,
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
      console.log('✅ FirestoreService: Default data created successfully');
    } catch (error) {
      console.error('❌ FirestoreService: Error creating default data:', error);
      throw error;
    }
  }

  static async createTestData(childUid: string, adminUid: string): Promise<void> {
    try {
      console.log('🎯 FirestoreService: Creating test data...');
      
      const batch = writeBatch(db);
      
      // Create test tasks
      const testTasks = [
        {
          title: 'Escovar os dentes',
          description: 'Escove bem os dentes por 2 minutos',
          xp: 10,
          gold: 5,
          period: 'morning',
          time: '07:30',
          frequency: 'daily'
        },
        {
          title: 'Arrumar a cama',
          description: 'Deixe a cama bem arrumadinha',
          xp: 15,
          gold: 8,
          period: 'morning',
          frequency: 'daily'
        },
        {
          title: 'Fazer o dever de casa',
          description: 'Complete todas as atividades escolares',
          xp: 25,
          gold: 15,
          period: 'afternoon',
          frequency: 'weekday'
        },
        {
          title: 'Organizar os brinquedos',
          description: 'Guarde todos os brinquedos no lugar',
          xp: 20,
          gold: 10,
          period: 'evening',
          frequency: 'daily'
        },
        {
          title: 'Ajudar na cozinha',
          description: 'Ajude a preparar o jantar',
          xp: 30,
          gold: 20,
          period: 'evening',
          frequency: 'weekend'
        }
      ];
      
      testTasks.forEach(taskData => {
        const taskRef = doc(collection(db, 'tasks'));
        batch.set(taskRef, {
          ...taskData,
          ownerId: childUid,
          createdBy: adminUid,
          active: true,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      // Create test rewards
      const testRewards = [
        {
          title: '30 min de videogame extra',
          description: 'Tempo adicional para jogar seus jogos favoritos',
          category: 'activity',
          costGold: 25,
          emoji: '🎮',
          requiredLevel: 1
        },
        {
          title: 'Sorvete especial',
          description: 'Um sorvete delicioso de sobremesa',
          category: 'treat',
          costGold: 15,
          emoji: '🍦',
          requiredLevel: 1
        },
        {
          title: 'Escolher o filme da noite',
          description: 'Você decide qual filme assistir em família',
          category: 'privilege',
          costGold: 40,
          emoji: '🎬',
          requiredLevel: 5
        },
        {
          title: 'Carrinho novo',
          description: 'Um carrinho legal para brincar',
          category: 'toy',
          costGold: 100,
          emoji: '🚗',
          requiredLevel: 10
        },
        {
          title: 'Ida ao parque',
          description: 'Um passeio especial no parque',
          category: 'activity',
          costGold: 80,
          emoji: '🏞️',
          requiredLevel: 15
        }
      ];
      
      testRewards.forEach(rewardData => {
        const rewardRef = doc(collection(db, 'rewards'));
        batch.set(rewardRef, {
          ...rewardData,
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
      tasksSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete all user rewards
      const rewardsQuery = query(collection(db, 'rewards'), where('ownerId', '==', userId));
      const rewardsSnapshot = await getDocs(rewardsQuery);
      rewardsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete all user redemptions
      const redemptionsQuery = query(collection(db, 'redemptions'), where('userId', '==', userId));
      const redemptionsSnapshot = await getDocs(redemptionsQuery);
      redemptionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete all user notifications
      const notificationsQuery = query(collection(db, 'notifications'), where('toUserId', '==', userId));
      const notificationsSnapshot = await getDocs(notificationsQuery);
      notificationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete all user achievements
      const achievementsQuery = query(collection(db, 'achievements'), where('ownerId', '==', userId));
      const achievementsSnapshot = await getDocs(achievementsQuery);
      achievementsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete all user achievement progress
      const userAchievementsQuery = query(collection(db, 'userAchievements'), where('userId', '==', userId));
      const userAchievementsSnapshot = await getDocs(userAchievementsQuery);
      userAchievementsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete all flash reminders
      const flashRemindersQuery = query(collection(db, 'flashReminders'), where('ownerId', '==', userId));
      const flashRemindersSnapshot = await getDocs(flashRemindersQuery);
      flashRemindersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
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
      console.error('❌ FirestoreService: Error during complete reset:', error);
      throw error;
    }
  }

  static async syncUserData(userId: string): Promise<void> {
    try {
      console.log('🔄 FirestoreService: Syncing user data for:', userId);
      
      // Force refresh of user progress
      await updateDoc(doc(db, 'progress', userId), {
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: User data synced successfully');
    } catch (error) {
      console.error('❌ FirestoreService: Error syncing user data:', error);
      throw error;
    }
  }

  static async getTaskCompletionHistory(userId: string, startDate: Date, endDate: Date): Promise<Array<{
    taskId: string;
    taskTitle: string;
    date: string;
    xpEarned: number;
    goldEarned: number;
    completedAt: Date;
  }>> {
    try {
      // This is a simplified version - in a real implementation you'd have a completions subcollection
      // For now, return empty array as the current system doesn't track detailed completion history
      return [];
    } catch (error) {
      console.error('❌ FirestoreService: Error getting task completion history:', error);
      return [];
    }
  }
}