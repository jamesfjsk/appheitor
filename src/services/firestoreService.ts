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
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  addDoc,
  Timestamp
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
        userId: uid,
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
      // Find existing child user
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'child'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      let childUid = '';
      
      if (!querySnapshot.empty) {
        childUid = querySnapshot.docs[0].id;
      } else {
        // Create default child user if none exists
        const childRef = doc(collection(db, 'users'));
        childUid = childRef.id;
        
        await setDoc(childRef, {
          userId: childUid,
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
        lastDailySummaryProcessedDate: serverTimestamp(),
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
        updatedAt: new Date(),
        lastDailySummaryProcessedDate: new Date()
      };
    } catch (error) {
      console.error('❌ FirestoreService: Error ensuring user progress:', error);
      throw error;
    }
  }

  static async updateUserProgress(userId: string, updates: Partial<UserProgress>): Promise<void> {
    try {
      const progressRef = doc(db, 'progress', userId);
      
      // Ensure availableGold never goes negative
      if (updates.availableGold !== undefined) {
        updates.availableGold = Math.max(0, updates.availableGold);
      }
      
      await updateDoc(progressRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error updating user progress:', error);
      throw error;
    }
  }

  static subscribeToUserProgress(
    userId: string,
    onUpdate: (progress: UserProgress | null) => void,
    onError: (error: Error) => void
  ): () => void {
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
          onUpdate(progress);
        } else {
          onUpdate(null);
        }
      },
      onError
    );
  }

  // ========================================
  // 🔥 TASK MANAGEMENT
  // ========================================

  static async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const taskRef = doc(collection(db, 'tasks'));
      const completeTaskData = {
        ...taskData,
        id: taskRef.id,
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
      const today = new Date().toISOString().split('T')[0];
      
      // Check if task was already completed today
      const taskRef = doc(db, 'tasks', taskId);
      const taskDoc = await getDoc(taskRef);
      
      if (!taskDoc.exists()) {
        throw new Error('Task not found');
      }
      
      const taskData = taskDoc.data();
      if (taskData.status === 'done' && taskData.lastCompletedDate === today) {
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
        const newTotalXP = (currentProgress.totalXP || 0) + xpReward;
        const newAvailableGold = (currentProgress.availableGold || 0) + goldReward;
        const newTotalGoldEarned = (currentProgress.totalGoldEarned || 0) + goldReward;
        const newTotalTasksCompleted = (currentProgress.totalTasksCompleted || 0) + 1;
        
        // Calculate streak
        const lastActivityDate = currentProgress.lastActivityDate?.toDate();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        let newStreak = 1;
        if (lastActivityDate) {
          const lastActivityDateOnly = new Date(lastActivityDate);
          lastActivityDateOnly.setHours(0, 0, 0, 0);
          
          if (lastActivityDateOnly.getTime() === yesterday.getTime()) {
            newStreak = (currentProgress.streak || 0) + 1;
          }
        }
        
        const newLongestStreak = Math.max(currentProgress.longestStreak || 0, newStreak);
        
        batch.update(progressRef, {
          totalXP: newTotalXP,
          availableGold: newAvailableGold,
          totalGoldEarned: newTotalGoldEarned,
          totalTasksCompleted: newTotalTasksCompleted,
          streak: newStreak,
          longestStreak: newLongestStreak,
          lastActivityDate: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Create completion record for history
      const completionRef = doc(collection(db, 'taskCompletions'));
      batch.set(completionRef, {
        taskId,
        userId,
        taskTitle: taskData.title || 'Tarefa',
        date: today,
        xpEarned: xpReward,
        goldEarned: goldReward,
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      
      await batch.commit();
    } catch (error) {
      console.error('❌ FirestoreService: Error completing task:', error);
      throw error;
    }
  }

  static subscribeToUserTasks(
    userId: string,
    onUpdate: (tasks: Task[]) => void,
    onError: (error: Error) => void
  ): () => void {
    console.log('🔥 FirestoreService: Creating tasks listener for:', userId);
    
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('ownerId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(tasksQuery,
      (snapshot) => {
        console.log('📝 FirestoreService: Tasks snapshot received:', snapshot.size, 'documents');
        const tasks: Task[] = snapshot.docs.map(doc => {
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
            createdBy: data.createdBy
          };
        });
        onUpdate(tasks);
      },
      (error) => {
        console.error('❌ FirestoreService: Tasks listener error:', error);
        onError(error);
      }
    );
  }

  // ========================================
  // 🔥 REWARD MANAGEMENT
  // ========================================

  static async createReward(rewardData: Omit<Reward, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const rewardRef = doc(collection(db, 'rewards'));
      const completeRewardData = {
        ...rewardData,
        id: rewardRef.id,
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

  static subscribeToUserRewards(
    userId: string,
    onUpdate: (rewards: Reward[]) => void,
    onError: (error: Error) => void
  ): () => void {
    console.log('🔥 FirestoreService: Creating rewards listener for:', userId);
    
    const rewardsQuery = query(
      collection(db, 'rewards'),
      where('ownerId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(rewardsQuery,
      (snapshot) => {
        console.log('🎁 FirestoreService: Rewards snapshot received:', snapshot.size, 'documents');
        const rewards: Reward[] = snapshot.docs.map(doc => {
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
        console.error('❌ FirestoreService: Rewards listener error:', error);
        onError(error);
      }
    );
  }

  // ========================================
  // 🔥 REDEMPTION MANAGEMENT
  // ========================================

  static async redeemReward(userId: string, rewardId: string, costGold: number): Promise<void> {
    try {
      // Check if user has enough gold
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);
      
      if (!progressDoc.exists()) {
        throw new Error('User progress not found');
      }
      
      const currentProgress = progressDoc.data();
      if ((currentProgress.availableGold || 0) < costGold) {
        throw new Error('Insufficient gold');
      }
      
      const batch = writeBatch(db);
      
      // Create redemption record
      const redemptionRef = doc(collection(db, 'redemptions'));
      batch.set(redemptionRef, {
        id: redemptionRef.id,
        userId,
        rewardId,
        costGold,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Deduct gold immediately (will be refunded if rejected)
      batch.update(progressRef, {
        availableGold: (currentProgress.availableGold || 0) - costGold,
        totalGoldSpent: (currentProgress.totalGoldSpent || 0) + costGold,
        updatedAt: serverTimestamp()
      });
      
      await batch.commit();
    } catch (error) {
      console.error('❌ FirestoreService: Error redeeming reward:', error);
      throw error;
    }
  }

  static async approveRedemption(redemptionId: string, approved: boolean, approvedBy: string): Promise<void> {
    try {
      const redemptionRef = doc(db, 'redemptions', redemptionId);
      const redemptionDoc = await getDoc(redemptionRef);
      
      if (!redemptionDoc.exists()) {
        throw new Error('Redemption not found');
      }
      
      const redemptionData = redemptionDoc.data();
      const batch = writeBatch(db);
      
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
        
        if (progressDoc.exists()) {
          const currentProgress = progressDoc.data();
          batch.update(progressRef, {
            availableGold: (currentProgress.availableGold || 0) + redemptionData.costGold,
            totalGoldSpent: Math.max(0, (currentProgress.totalGoldSpent || 0) - redemptionData.costGold),
            updatedAt: serverTimestamp()
          });
        }
      } else {
        // If approved, increment rewards redeemed counter
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

  static subscribeToUserRedemptions(
    userId: string,
    onUpdate: (redemptions: RewardRedemption[]) => void,
    onError: (error: Error) => void
  ): () => void {
    console.log('🔥 FirestoreService: Creating redemptions listener for:', userId);
    
    const redemptionsQuery = query(
      collection(db, 'redemptions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(redemptionsQuery,
      (snapshot) => {
        console.log('💰 FirestoreService: Redemptions snapshot received:', snapshot.size, 'documents');
        const redemptions: RewardRedemption[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            rewardId: data.rewardId,
            costGold: data.costGold,
            status: data.status,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            approvedBy: data.approvedBy
          };
        });
        onUpdate(redemptions);
      },
      (error) => {
        console.error('❌ FirestoreService: Redemptions listener error:', error);
        onError(error);
      }
    );
  }

  // ========================================
  // 🔥 NOTIFICATION MANAGEMENT
  // ========================================

  static async createNotification(notificationData: Omit<Notification, 'id' | 'sentAt' | 'readAt'>): Promise<void> {
    try {
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        ...notificationData,
        id: notificationRef.id,
        sentAt: serverTimestamp(),
        readAt: null
      });
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

  static subscribeToUserNotifications(
    userId: string,
    onUpdate: (notifications: Notification[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId),
      orderBy('sentAt', 'desc'),
      limit(50)
    );
    
    return onSnapshot(notificationsQuery,
      (snapshot) => {
        const notifications: Notification[] = snapshot.docs.map(doc => {
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
      onError
    );
  }

  // ========================================
  // 🔥 FLASH REMINDER MANAGEMENT
  // ========================================

  static async createFlashReminder(reminderData: Omit<FlashReminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const reminderRef = doc(collection(db, 'flashReminders'));
      const completeReminderData = {
        ...reminderData,
        id: reminderRef.id,
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

  static subscribeToUserFlashReminders(
    userId: string,
    onUpdate: (reminders: FlashReminder[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const remindersQuery = query(
      collection(db, 'flashReminders'),
      where('ownerId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(remindersQuery,
      (snapshot) => {
        const reminders: FlashReminder[] = snapshot.docs.map(doc => {
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
            createdBy: data.createdBy
          };
        });
        onUpdate(reminders);
      },
      onError
    );
  }

  // ========================================
  // 🔥 ACHIEVEMENT MANAGEMENT
  // ========================================

  static async createAchievement(achievementData: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const achievementRef = doc(collection(db, 'achievements'));
      const completeAchievementData = {
        ...achievementData,
        id: achievementRef.id,
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

  static subscribeToUserAchievements(
    userId: string,
    onUpdate: (achievements: Achievement[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const achievementsQuery = query(
      collection(db, 'achievements'),
      where('ownerId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(achievementsQuery,
      (snapshot) => {
        const achievements: Achievement[] = snapshot.docs.map(doc => {
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
            createdBy: data.createdBy,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        });
        onUpdate(achievements);
      },
      onError
    );
  }

  // ========================================
  // 🔥 USER ACHIEVEMENT PROGRESS
  // ========================================

  static async createUserAchievement(userAchievementData: Omit<UserAchievement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const userAchievementRef = doc(collection(db, 'userAchievements'));
      const completeData = {
        ...userAchievementData,
        id: userAchievementRef.id,
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

  static subscribeToUserAchievementProgress(
    userId: string,
    onUpdate: (userAchievements: UserAchievement[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const userAchievementsQuery = query(
      collection(db, 'userAchievements'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(userAchievementsQuery,
      (snapshot) => {
        const userAchievements: UserAchievement[] = snapshot.docs.map(doc => {
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
      onError
    );
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

  static async updateSurpriseMissionConfig(settings: Omit<SurpriseMissionConfig, 'id' | 'createdAt' | 'updatedAt'>, updatedBy: string): Promise<void> {
    try {
      const configRef = doc(db, 'surpriseMissionConfig', 'default');
      const configDoc = await getDoc(configRef);
      
      const configData = {
        ...settings,
        lastUpdatedBy: updatedBy,
        updatedAt: serverTimestamp()
      };
      
      if (configDoc.exists()) {
        await updateDoc(configRef, configData);
      } else {
        await setDoc(configRef, {
          ...configData,
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
      return statusDoc.exists() && statusDoc.data()?.completed === true;
    } catch (error) {
      console.error('❌ FirestoreService: Error checking surprise mission status:', error);
      return false;
    }
  }

  static async markSurpriseMissionCompletedToday(userId: string, date: string, data: {
    score: number;
    totalQuestions: number;
    xpEarned: number;
    goldEarned: number;
    completedAt: Date;
  }): Promise<void> {
    try {
      const statusRef = doc(db, 'dailySurpriseMissionStatus', `${userId}_${date}`);
      await setDoc(statusRef, {
        id: `${userId}_${date}`,
        userId,
        date,
        completed: true,
        score: data.score,
        totalQuestions: data.totalQuestions,
        xpEarned: data.xpEarned,
        goldEarned: data.goldEarned,
        completedAt: Timestamp.fromDate(data.completedAt),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error marking surprise mission as completed:', error);
      throw error;
    }
  }

  static async getSurpriseMissionHistory(userId: string, maxResults: number = 30): Promise<DailySurpriseMissionStatus[]> {
    try {
      const historyQuery = query(
        collection(db, 'dailySurpriseMissionStatus'),
        where('userId', '==', userId),
        limit(maxResults)
      );
      
      const snapshot = await getDocs(historyQuery);
      const results = snapshot.docs.map(doc => {
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
      
      // Sort by createdAt descending in memory since we can't use orderBy without composite index
      return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
      return quizDoc.exists() && quizDoc.data()?.completed === true;
    } catch (error) {
      console.error('❌ FirestoreService: Error checking quiz status:', error);
      return false;
    }
  }

  static async markQuizCompletedToday(userId: string, date: string, data: {
    score: number;
    totalQuestions: number;
    xpEarned: number;
    goldEarned: number;
    completedAt: Date;
  }): Promise<void> {
    try {
      const quizRef = doc(db, 'dailyQuizzes', `${userId}_${date}`);
      await setDoc(quizRef, {
        id: `${userId}_${date}`,
        userId,
        date,
        completed: true,
        score: data.score,
        totalQuestions: data.totalQuestions,
        xpEarned: data.xpEarned,
        goldEarned: data.goldEarned,
        completedAt: Timestamp.fromDate(data.completedAt),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error marking quiz as completed:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 DAILY PROGRESS TRACKING
  // ========================================

  static async processDailySummary(userId: string, date: string): Promise<{
    goldPenalty: number;
    allTasksBonusGold: number;
    tasksAvailable: number;
    tasksCompleted: number;
  }> {
    try {
      console.log('📊 FirestoreService: Processing daily summary for:', { userId, date });
      
      // Get all active tasks for the user
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('ownerId', '==', userId),
        where('active', '==', true)
      );
      
      const tasksSnapshot = await getDocs(tasksQuery);
      const allTasks = tasksSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          frequency: data.frequency || 'daily',
          lastCompletedDate: data.lastCompletedDate
        };
      });
      
      // Filter tasks that should be available on this specific date
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      const availableTasks = allTasks.filter(task => {
        switch (task.frequency) {
          case 'daily':
            return true;
          case 'weekday':
            return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
          case 'weekend':
            return dayOfWeek === 0 || dayOfWeek === 6; // Saturday and Sunday
          default:
            return true;
        }
      });
      
      // Count completed tasks for this specific date
      const completedTasks = availableTasks.filter(task => 
        task.lastCompletedDate === date
      );
      
      const tasksAvailable = availableTasks.length;
      const tasksCompleted = completedTasks.length;
      const tasksNotCompleted = tasksAvailable - tasksCompleted;
      
      console.log('📊 Daily summary calculation:', {
        date,
        dayOfWeek,
        totalTasks: allTasks.length,
        tasksAvailable,
        tasksCompleted,
        tasksNotCompleted
      });
      
      // Calculate penalties and bonuses
      let goldPenalty = 0;
      let allTasksBonusGold = 0;
      
      if (tasksAvailable > 0) {
        if (tasksCompleted === tasksAvailable) {
          // All tasks completed - bonus!
          allTasksBonusGold = 10;
          console.log('🎉 All tasks completed! Bonus: +10 Gold');
        } else {
          // Some tasks not completed - penalty
          goldPenalty = tasksNotCompleted;
          console.log(`❌ ${tasksNotCompleted} tasks not completed. Penalty: -${goldPenalty} Gold`);
        }
      } else {
        console.log('📝 No tasks available for this date - no penalty or bonus');
      }
      
      return {
        goldPenalty,
        allTasksBonusGold,
        tasksAvailable,
        tasksCompleted
      };
    } catch (error) {
      console.error('❌ FirestoreService: Error processing daily summary:', error);
      throw error;
    }
  }

  static async applyDailySummary(userId: string, date: string): Promise<void> {
    try {
      console.log('💰 FirestoreService: Applying daily summary for:', { userId, date });
      
      // Check if already processed
      const dailyProgress = await this.getDailyProgress(userId, date);
      if (dailyProgress?.summaryProcessed) {
        console.log('✅ Daily summary already processed for:', date);
        return;
      }
      
      // Calculate summary
      const summary = await this.processDailySummary(userId, date);
      
      // Apply gold changes if there are penalties or bonuses
      if (summary.goldPenalty > 0 || summary.allTasksBonusGold > 0) {
        const progressRef = doc(db, 'progress', userId);
        const progressDoc = await getDoc(progressRef);
        
        if (progressDoc.exists()) {
          const currentProgress = progressDoc.data();
          const currentGold = currentProgress.availableGold || 0;
          
          let newGold = currentGold;
          
          // Apply penalty (subtract gold, but never go below 0)
          if (summary.goldPenalty > 0) {
            newGold = Math.max(0, newGold - summary.goldPenalty);
            console.log(`💸 Applying penalty: ${currentGold} - ${summary.goldPenalty} = ${newGold}`);
          }
          
          // Apply bonus (add gold)
          if (summary.allTasksBonusGold > 0) {
            newGold = newGold + summary.allTasksBonusGold;
            console.log(`💰 Applying bonus: ${newGold - summary.allTasksBonusGold} + ${summary.allTasksBonusGold} = ${newGold}`);
          }
          
          // Update user progress
          await updateDoc(progressRef, {
            availableGold: newGold,
            totalGoldSpent: summary.goldPenalty > 0 
              ? (currentProgress.totalGoldSpent || 0) + summary.goldPenalty 
              : (currentProgress.totalGoldSpent || 0),
            totalGoldEarned: summary.allTasksBonusGold > 0
              ? (currentProgress.totalGoldEarned || 0) + summary.allTasksBonusGold
              : (currentProgress.totalGoldEarned || 0),
            updatedAt: serverTimestamp()
          });
          
          console.log('✅ User progress updated with daily summary');
        }
      }
      
      // Mark as processed
      await this.setDailySummary(userId, date, {
        goldPenalty: summary.goldPenalty,
        allTasksBonusGold: summary.allTasksBonusGold,
        summaryProcessed: true,
        totalTasksAvailable: summary.tasksAvailable,
        totalTasksCompleted: summary.tasksCompleted
      });
      
      console.log('✅ Daily summary applied and marked as processed');
    } catch (error) {
      console.error('❌ FirestoreService: Error applying daily summary:', error);
      throw error;
    }
  }

  static async processUnprocessedDays(userId: string): Promise<void> {
    try {
      console.log('🔄 FirestoreService: Processing unprocessed days for user:', userId);
      
      // Get user progress to find last processed date
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);
      
      if (!progressDoc.exists()) {
        console.log('❌ User progress not found, skipping daily processing');
        return;
      }
      
      const progressData = progressDoc.data();
      const lastProcessedDate = progressData.lastDailySummaryProcessedDate?.toDate();
      
      // Calculate date range to process
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let startDate = lastProcessedDate || new Date('2024-01-01'); // Default start date
      
      // Don't process today (only completed days)
      const endDate = yesterday;
      
      console.log('📅 Date range for processing:', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        lastProcessedDate: lastProcessedDate?.toISOString().split('T')[0] || 'never'
      });
      
      // Process each day between start and end
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + 1); // Start from day after last processed
      
      let daysProcessed = 0;
      const maxDaysToProcess = 30; // Safety limit
      
      while (currentDate <= endDate && daysProcessed < maxDaysToProcess) {
        const dateString = currentDate.toISOString().split('T')[0];
        
        try {
          console.log(`📊 Processing day: ${dateString}`);
          await this.applyDailySummary(userId, dateString);
          daysProcessed++;
        } catch (error) {
          console.error(`❌ Error processing day ${dateString}:`, error);
          // Continue with next day even if one fails
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Update last processed date
      await updateDoc(progressRef, {
        lastDailySummaryProcessedDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Processed ${daysProcessed} unprocessed days`);
      
      if (daysProcessed > 0) {
        // Show notification about processed days
        console.log(`🔔 Daily summary: Processed ${daysProcessed} days with penalties/bonuses`);
      }
    } catch (error) {
      console.error('❌ FirestoreService: Error processing unprocessed days:', error);
      throw error;
    }
  }
  static async getDailyProgress(userId: string, date: string): Promise<{
    xpEarned: number;
    goldEarned: number;
    tasksCompleted: number;
    goldPenalty?: number;
    allTasksBonusGold?: number;
    summaryProcessed?: boolean;
  } | null> {
    try {
      const progressRef = doc(db, 'dailyProgress', `${userId}_${date}`);
      const progressDoc = await getDoc(progressRef);
      
      if (progressDoc.exists()) {
        const data = progressDoc.data();
        return {
          xpEarned: data.xpEarned || 0,
          goldEarned: data.goldEarned || 0,
          tasksCompleted: data.tasksCompleted || 0,
          goldPenalty: data.goldPenalty || 0,
          allTasksBonusGold: data.allTasksBonusGold || 0,
          summaryProcessed: data.summaryProcessed || false
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ FirestoreService: Error getting daily progress:', error);
      return null;
    }
  }

  static async incrementDailyTaskCompletion(userId: string, date: string, xpGained: number, goldGained: number): Promise<void> {
    try {
      const progressRef = doc(db, 'dailyProgress', `${userId}_${date}`);
      const progressDoc = await getDoc(progressRef);
      
      if (progressDoc.exists()) {
        const currentData = progressDoc.data();
        await updateDoc(progressRef, {
          xpEarned: (currentData.xpEarned || 0) + xpGained,
          goldEarned: (currentData.goldEarned || 0) + goldGained,
          tasksCompleted: (currentData.tasksCompleted || 0) + (xpGained > 0 ? 1 : 0),
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(progressRef, {
          id: `${userId}_${date}`,
          userId,
          date,
          xpEarned: xpGained,
          goldEarned: goldGained,
          tasksCompleted: xpGained > 0 ? 1 : 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('❌ FirestoreService: Error incrementing daily task completion:', error);
      throw error;
    }
  }

  static async setDailySummary(userId: string, date: string, summary: {
    goldPenalty: number;
    allTasksBonusGold: number;
    summaryProcessed: boolean;
    totalTasksAvailable: number;
    totalTasksCompleted: number;
  }): Promise<void> {
    try {
      const progressRef = doc(db, 'dailyProgress', `${userId}_${date}`);
      
      // Use merge to preserve existing task completion data
      await setDoc(progressRef, {
        id: `${userId}_${date}`,
        userId,
        date,
        goldPenalty: summary.goldPenalty,
        allTasksBonusGold: summary.allTasksBonusGold,
        summaryProcessed: summary.summaryProcessed,
        totalTasksAvailable: summary.totalTasksAvailable,
        totalTasksCompleted: summary.totalTasksCompleted,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('❌ FirestoreService: Error setting daily summary:', error);
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
      // Use a simpler query that only filters by userId to avoid composite index requirement
      const completionsQuery = query(
        collection(db, 'taskCompletions'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(completionsQuery);
      
      // Filter by date range in memory after fetching
      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = endDate.toISOString().split('T')[0];
      
      const results = snapshot.docs
        .map(doc => {
        const data = doc.data();
        return {
          taskId: data.taskId,
          taskTitle: data.taskTitle,
          date: data.date,
          xpEarned: data.xpEarned || 0,
          goldEarned: data.goldEarned || 0,
          completedAt: data.completedAt?.toDate() || new Date()
        };
      })
        .filter(completion => 
          completion.date >= startDateString && 
          completion.date <= endDateString
        );
      
      // Sort in memory to avoid composite index requirement
      return results.sort((a, b) => {
        // First sort by date (descending)
        const dateComparison = b.date.localeCompare(a.date);
        if (dateComparison !== 0) return dateComparison;
        
        // Then by completedAt (descending)
        return b.completedAt.getTime() - a.completedAt.getTime();
      });
    } catch (error) {
      console.error('❌ FirestoreService: Error getting task completion history:', error);
      return [];
    }
  }

  // ========================================
  // 🔥 DATA MANAGEMENT
  // ========================================

  static async createDefaultData(childUid: string, adminUid: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Ensure progress exists
      const progressRef = doc(db, 'progress', childUid);
      const progressDoc = await getDoc(progressRef);
      
      if (!progressDoc.exists()) {
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
      }
      
      await batch.commit();
      console.log('✅ FirestoreService: Default data created for child:', childUid);
    } catch (error) {
      console.error('❌ FirestoreService: Error creating default data:', error);
      throw error;
    }
  }

  static async createTestData(childUid: string, adminUid: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Create test tasks
      const testTasks = [
        {
          title: 'Escovar os dentes',
          description: 'Escovar bem os dentes após as refeições',
          xp: 15,
          gold: 8,
          period: 'morning' as const,
          time: '08:00',
          frequency: 'daily' as const
        },
        {
          title: 'Arrumar a cama',
          description: 'Deixar o quarto organizado',
          xp: 20,
          gold: 10,
          period: 'morning' as const,
          frequency: 'daily' as const
        },
        {
          title: 'Fazer o dever de casa',
          description: 'Completar todas as tarefas escolares',
          xp: 30,
          gold: 15,
          period: 'afternoon' as const,
          time: '15:00',
          frequency: 'weekday' as const
        },
        {
          title: 'Organizar os brinquedos',
          description: 'Guardar todos os brinquedos no lugar',
          xp: 25,
          gold: 12,
          period: 'evening' as const,
          frequency: 'daily' as const
        },
        {
          title: 'Ler um livro',
          description: 'Ler pelo menos 15 minutos',
          xp: 35,
          gold: 18,
          period: 'evening' as const,
          time: '19:00',
          frequency: 'daily' as const
        }
      ];
      
      testTasks.forEach(task => {
        const taskRef = doc(collection(db, 'tasks'));
        batch.set(taskRef, {
          ...task,
          id: taskRef.id,
          ownerId: childUid,
          active: true,
          status: 'pending',
          createdBy: adminUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      // Create test rewards
      const testRewards = [
        {
          title: '30 min de videogame extra',
          description: 'Tempo adicional para jogar seus jogos favoritos',
          category: 'activity' as const,
          costGold: 50,
          emoji: '🎮',
          requiredLevel: 1
        },
        {
          title: 'Escolher o filme da noite',
          description: 'Você decide qual filme assistir em família',
          category: 'privilege' as const,
          costGold: 75,
          emoji: '🎬',
          requiredLevel: 5
        },
        {
          title: 'Sorvete especial',
          description: 'Um sorvete delicioso de sobremesa',
          category: 'treat' as const,
          costGold: 40,
          emoji: '🍦',
          requiredLevel: 1
        },
        {
          title: 'Carrinho novo',
          description: 'Um carrinho legal para brincar',
          category: 'toy' as const,
          costGold: 200,
          emoji: '🚗',
          requiredLevel: 10
        },
        {
          title: 'Ida ao parque',
          description: 'Um passeio especial no parque',
          category: 'activity' as const,
          costGold: 150,
          emoji: '🏞️',
          requiredLevel: 8
        }
      ];
      
      testRewards.forEach(reward => {
        const rewardRef = doc(collection(db, 'rewards'));
        batch.set(rewardRef, {
          ...reward,
          id: rewardRef.id,
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
      const batch = writeBatch(db);
      
      // Get all user-related documents
      const collections = ['tasks', 'rewards', 'redemptions', 'notifications', 'flashReminders', 'achievements', 'userAchievements'];
      
      for (const collectionName of collections) {
        const q = query(
          collection(db, collectionName),
          where(collectionName === 'redemptions' || collectionName === 'notifications' || collectionName === 'userAchievements' ? 'userId' : 'ownerId', '==', userId)
        );
        
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }
      
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
      console.log('✅ FirestoreService: Complete user reset performed');
    } catch (error) {
      console.error('❌ FirestoreService: Error performing user reset:', error);
      throw error;
    }
  }

  static async syncUserData(userId: string): Promise<void> {
    try {
      // Force update timestamp to trigger sync
      const progressRef = doc(db, 'progress', userId);
      await updateDoc(progressRef, {
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FirestoreService: User data sync triggered');
    } catch (error) {
      console.error('❌ FirestoreService: Error syncing user data:', error);
      throw error;
    }
  }
}