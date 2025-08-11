import { 
  collection,
  doc, 
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  runTransaction,
  serverTimestamp,
  increment,
  DocumentReference,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Task, Reward, UserProgress, RewardRedemption, Notification, User } from '../types';
import { getLevelFromXP } from '../utils/levelSystem';

// Utility function for server timestamp
export const nowTs = () => serverTimestamp();

export class FirestoreService {
  // ========================================
  // 🔥 USER MANAGEMENT
  // ========================================

  static async ensureUserDocument(uid: string, email: string, role: 'admin' | 'child'): Promise<User> {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    const userData = {
      userId: uid,
      email,
      displayName: role === 'admin' ? 'Pai' : 'Heitor',
      role,
      updatedAt: nowTs(),
      lastLoginTimestamp: nowTs()
    };

    if (userDoc.exists()) {
      await updateDoc(userRef, userData);
      const data = userDoc.data();
      return {
        ...userData,
        managedChildId: data.managedChildId,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: new Date(),
        lastLoginTimestamp: new Date()
      } as User;
    } else {
      await setDoc(userRef, {
        ...userData,
        createdAt: nowTs()
      });
      return {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginTimestamp: new Date()
      } as User;
    }
  }

  static async ensureAdminChildLink(adminUid: string): Promise<string> {
    const adminRef = doc(db, 'users', adminUid);
    const adminDoc = await getDoc(adminRef);
    
    if (adminDoc.exists() && adminDoc.data().managedChildId) {
      return adminDoc.data().managedChildId;
    }

    // Find or create child user
    const childQuery = query(
      collection(db, 'users'),
      where('role', '==', 'child')
    );
    
    const childSnapshot = await getDocs(childQuery);
    let childUid: string;

    if (!childSnapshot.empty) {
      childUid = childSnapshot.docs[0].id;
    } else {
      // Create default child
      const childRef = doc(collection(db, 'users'));
      await setDoc(childRef, {
        userId: childRef.id,
        email: 'heitor@flash.com',
        displayName: 'Heitor',
        role: 'child',
        createdAt: nowTs(),
        updatedAt: nowTs(),
        lastLoginTimestamp: nowTs()
      });
      childUid = childRef.id;
    }

    // Link admin to child
    await updateDoc(adminRef, {
      managedChildId: childUid,
      updatedAt: nowTs()
    });

    return childUid;
  }

  static async ensureUserProgress(userId: string): Promise<void> {
    const progressRef = doc(db, 'progress', userId);
    const progressDoc = await getDoc(progressRef);
    
    if (!progressDoc.exists()) {
      await setDoc(progressRef, {
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
        lastActivityDate: nowTs(),
        updatedAt: nowTs()
      });
    }
  }

  // ========================================
  // 🔥 TASK OPERATIONS
  // ========================================

  static async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const taskRef = doc(collection(db, 'tasks'));
    
    // Ensure required fields are present
    if (!taskData.ownerId || typeof taskData.ownerId !== 'string' || taskData.ownerId.trim() === '') {
      throw new Error('ownerId is required and must be a non-empty string');
    }
    
    // Ensure all required fields for Firestore rules and Data Doctor
    const completeTaskData = {
      ownerId: taskData.ownerId,
      userId: taskData.ownerId, // Add userId field for Data Doctor compatibility
      title: taskData.title,
      description: taskData.description || '',
      xp: taskData.xp || 10,
      gold: taskData.gold || 5,
      period: taskData.period,
      time: taskData.time || '',
      frequency: taskData.frequency || 'daily',
      active: taskData.active !== false, // Default to true
      status: taskData.status || 'pending',
      createdBy: taskData.createdBy || taskData.ownerId,
      createdAt: nowTs(),
      updatedAt: nowTs()
    };
    
    console.log('🔥 FirestoreService: Creating task with complete data:', completeTaskData);
    
    await setDoc(taskRef, completeTaskData);
    return taskRef.id;
  }

  static async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: nowTs()
    });
  }

  static async deleteTask(taskId: string): Promise<void> {
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
  }

  static subscribeToUserTasks(
    childUid: string, 
    callback: (tasks: Task[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const q = query(
      collection(db, 'tasks'),
      where('ownerId', '==', childUid)
    );

    // Also subscribe to task completions to determine status
    const completionsMap = new Map<string, boolean>();
    const today = new Date().toISOString().split('T')[0];

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        // First, get all tasks
        const tasksPromises = snapshot.docs
          .map(taskDoc => {
            const data = taskDoc.data();
            const task = {
              id: taskDoc.id,
             ownerId: data.ownerId,
             title: data.title,
             description: data.description,
             xp: data.xp,
             gold: data.gold,
             period: data.period,
             time: data.time,
             frequency: data.frequency,
             active: data.active,
              status: 'pending', // Will be updated based on completion
             createdBy: data.createdBy,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            };
            
            // Check if task was completed today
            const completionRef = doc(db, 'tasks', taskDoc.id, 'completions', today);
            return getDoc(completionRef).then(completionDoc => ({
              ...task,
              status: completionDoc.exists() ? 'done' : 'pending'
            }));
          })
        
        // Wait for all completion checks to complete
        Promise.all(tasksPromises).then(tasks => {
          const sortedTasks = tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          console.log('🔥 FirestoreService: Tasks with completion status:', sortedTasks.map(t => ({
            id: t.id,
            title: t.title,
            active: t.active,
            ownerId: t.ownerId,
            status: t.status
          })));
          
          callback(sortedTasks);
        }).catch(error => {
          console.error('❌ Error checking task completions:', error);
          if (errorCallback) errorCallback(error);
        });
      },
      (error) => {
        console.error('❌ Erro no listener de tasks:', error);
        if (errorCallback) errorCallback(error);
      }
    );
  }

  // ========================================
  // 🔥 REWARD OPERATIONS
  // ========================================

  static async createReward(rewardData: Omit<Reward, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const rewardRef = doc(collection(db, 'rewards'));
    
    // Ensure required fields are present for Firestore rules validation
    if (!rewardData.ownerId || typeof rewardData.ownerId !== 'string' || rewardData.ownerId.trim() === '') {
      throw new Error('ownerId is required and must be a non-empty string');
    }
    
    // Ensure all required fields for Firestore rules and Data Doctor
    const completeRewardData = {
      ownerId: rewardData.ownerId,
      userId: rewardData.ownerId, // Add userId field for Data Doctor compatibility
      title: rewardData.title,
      description: rewardData.description || '',
      category: rewardData.category || 'custom',
      costGold: rewardData.costGold || 50,
      emoji: rewardData.emoji || '🎁',
      requiredLevel: rewardData.requiredLevel || 1,
      active: rewardData.active !== false, // Default to true unless explicitly false
      createdAt: nowTs(),
      updatedAt: nowTs()
    };
    
    console.log('🔥 FirestoreService: Creating reward with complete data:', completeRewardData);
    
    await setDoc(rewardRef, completeRewardData);
    return rewardRef.id;
  }

  static async updateReward(rewardId: string, updates: Partial<Reward>): Promise<void> {
    const rewardRef = doc(db, 'rewards', rewardId);
    console.log('🔥 FirestoreService: Updating reward:', { rewardId, updates });
    await updateDoc(rewardRef, {
      ...updates,
      updatedAt: nowTs()
    });
    console.log('✅ FirestoreService: Reward updated successfully');
  }

  static async deleteReward(rewardId: string): Promise<void> {
    const rewardRef = doc(db, 'rewards', rewardId);
    await deleteDoc(rewardRef);
  }

  static subscribeToUserRewards(
    childUid: string, 
    callback: (rewards: Reward[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    // Temporary workaround: Use simpler query until indexes are created
    const q = query(
      collection(db, 'rewards'),
      where('ownerId', '==', childUid)
    );

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const rewards = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            } as Reward;
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Client-side sorting
        callback(rewards);
      },
      (error) => {
        console.error('❌ Erro no listener de rewards:', error);
        if (errorCallback) errorCallback(error);
      }
    );
  }

  // ========================================
  // 🔥 PROGRESS OPERATIONS
  // ========================================

  static async updateUserProgress(userId: string, updates: Partial<UserProgress>): Promise<void> {
    const progressRef = doc(db, 'progress', userId);
    await updateDoc(progressRef, {
      ...updates,
      updatedAt: nowTs()
    });
  }

  static subscribeToUserProgress(
    userId: string, 
    callback: (progress: UserProgress | null) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const progressRef = doc(db, 'progress', userId);

    return onSnapshot(
      progressRef,
      (snapshot: DocumentSnapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const progress = {
            ...data,
            lastActivityDate: data.lastActivityDate?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as UserProgress;
          callback(progress);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('❌ Erro no listener de progress:', error);
        if (errorCallback) errorCallback(error);
      }
    );
  }

  // ========================================
  // 🔥 REDEMPTION OPERATIONS
  // ========================================

  static async createRedemption(redemptionData: Omit<RewardRedemption, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const redemptionRef = doc(collection(db, 'redemptions'));
    await setDoc(redemptionRef, {
      ...redemptionData,
      createdAt: nowTs(),
      updatedAt: nowTs()
    });
    return redemptionRef.id;
  }

  static async updateRedemption(redemptionId: string, updates: Partial<RewardRedemption>): Promise<void> {
    const redemptionRef = doc(db, 'redemptions', redemptionId);
    await updateDoc(redemptionRef, {
      ...updates,
      updatedAt: nowTs()
    });
  }

  static subscribeToUserRedemptions(
    childUid: string, 
    callback: (redemptions: RewardRedemption[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    // Temporary workaround: Use simpler query until indexes are created
    const q = query(
      collection(db, 'redemptions'),
      where('userId', '==', childUid)
    );

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const redemptions = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            } as RewardRedemption;
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Client-side sorting
        callback(redemptions);
      },
      (error) => {
        console.error('❌ Erro no listener de redemptions:', error);
        if (errorCallback) errorCallback(error);
      }
    );
  }

  // ========================================
  // 🔥 NOTIFICATION OPERATIONS
  // ========================================

  static async createNotification(notificationData: Omit<Notification, 'id' | 'sentAt'>): Promise<string> {
    const notificationRef = doc(collection(db, 'notifications'));
    
    // Ensure all required fields are properly set
    const completeNotificationData = {
      toUserId: notificationData.toUserId,
      userId: notificationData.toUserId, // Add userId field for Data Doctor compatibility
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type || 'general',
      read: notificationData.read || false,
      readAt: notificationData.readAt || null,
      sentAt: nowTs()
    };
    
    console.log('🔥 FirestoreService: Creating notification with complete data:', completeNotificationData);
    
    await setDoc(notificationRef, completeNotificationData);
    return notificationRef.id;
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: nowTs()
    });
  }

  static subscribeToUserNotifications(
    childUid: string, 
    callback: (notifications: Notification[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    // Temporary workaround: Use simpler query until indexes are created
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', childUid)
    );

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const notifications = snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              sentAt: data.sentAt?.toDate() || new Date(),
              readAt: data.readAt?.toDate()
            } as Notification;
          })
          .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime()) // Client-side sorting
          .slice(0, 50); // Client-side limit
        callback(notifications);
      },
      (error) => {
        console.error('❌ Erro no listener de notifications:', error);
        if (errorCallback) errorCallback(error);
      }
    );
  }

  // ========================================
  // 🔥 TRANSACTION OPERATIONS
  // ========================================

  static async completeTaskWithRewards(taskId: string, childUid: string, xpReward: number, goldReward: number): Promise<void> {
    const today = new Date();
    const dateId = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    await runTransaction(db, async (transaction) => {
      const completionRef = doc(db, 'tasks', taskId, 'completions', dateId);
      const progressRef = doc(db, 'progress', childUid);

      const progressDoc = await transaction.get(progressRef);
      if (!progressDoc.exists()) {
        throw new Error('User progress not found');
      }

      // Check if task was already completed today
      const existingCompletion = await transaction.get(completionRef);
      if (existingCompletion.exists()) {
        throw new Error('Task already completed today');
      }

      const currentProgress = progressDoc.data() as UserProgress;
      const newTotalXP = (currentProgress.totalXP || 0) + xpReward;
      const newAvailableGold = (currentProgress.availableGold || 0) + goldReward;
      const newTotalGoldEarned = (currentProgress.totalGoldEarned || 0) + goldReward;
      const newLevel = getLevelFromXP(newTotalXP);
      const newTasksCompleted = (currentProgress.totalTasksCompleted || 0) + 1;

      // Create completion record
      transaction.set(completionRef, {
        userId: childUid,
        taskId: taskId,
        xpEarned: xpReward,
        goldEarned: goldReward,
        completedAt: nowTs(),
        createdAt: nowTs()
      });

      // Update progress
      transaction.update(progressRef, {
        level: newLevel,
        totalXP: newTotalXP,
        availableGold: newAvailableGold,
        totalGoldEarned: newTotalGoldEarned,
        totalTasksCompleted: newTasksCompleted,
        lastActivityDate: nowTs(),
        updatedAt: nowTs()
      });
    });
  }

  static async redeemReward(childUid: string, rewardId: string, goldCost: number): Promise<string> {
    return await runTransaction(db, async (transaction) => {
      const progressRef = doc(db, 'progress', childUid);
      const progressDoc = await transaction.get(progressRef);

      if (!progressDoc.exists()) {
        throw new Error('User progress not found');
      }

      const currentProgress = progressDoc.data() as UserProgress;
      const availableGold = currentProgress.availableGold || 0;

      if (availableGold < goldCost) {
        throw new Error('Insufficient gold');
      }

      // Create redemption
      const redemptionRef = doc(collection(db, 'redemptions'));
      transaction.set(redemptionRef, {
        userId: childUid,
        rewardId,
        costGold: goldCost,
        status: 'pending',
        createdAt: nowTs(),
        updatedAt: nowTs()
      });

      // Update progress
      transaction.update(progressRef, {
        availableGold: availableGold - goldCost,
        totalGoldSpent: (currentProgress.totalGoldSpent || 0) + goldCost,
        rewardsRedeemed: (currentProgress.rewardsRedeemed || 0) + 1,
        updatedAt: nowTs()
      });

      return redemptionRef.id;
    });
  }

  static async approveRedemption(redemptionId: string, approved: boolean, adminUid: string): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const redemptionRef = doc(db, 'redemptions', redemptionId);
      const redemptionDoc = await transaction.get(redemptionRef);

      if (!redemptionDoc.exists()) {
        throw new Error('Redemption not found');
      }

      const redemption = redemptionDoc.data() as RewardRedemption;

      if (approved) {
        // Approve redemption
        transaction.update(redemptionRef, {
          status: 'approved',
          approvedBy: adminUid,
          updatedAt: nowTs()
        });
      } else {
        // Reject and refund gold
        const progressRef = doc(db, 'progress', redemption.userId);
        const progressDoc = await transaction.get(progressRef);

        if (progressDoc.exists()) {
          const currentProgress = progressDoc.data() as UserProgress;
          transaction.update(progressRef, {
            availableGold: (currentProgress.availableGold || 0) + redemption.costGold,
            totalGoldSpent: Math.max(0, (currentProgress.totalGoldSpent || 0) - redemption.costGold),
            rewardsRedeemed: Math.max(0, (currentProgress.rewardsRedeemed || 0) - 1),
            updatedAt: nowTs()
          });
        }

        transaction.update(redemptionRef, {
          status: 'rejected',
          approvedBy: adminUid,
          updatedAt: nowTs()
        });
      }
    });
  }

  // ========================================
  // 🔥 BATCH OPERATIONS
  // ========================================

  static async createTestData(childUid: string, adminUid: string): Promise<void> {
    console.log('🧪 FirestoreService: Creating test data for:', childUid);
    
    const batch = writeBatch(db);

    // Create 5 varied test tasks
    const testTasks = [
      {
        title: 'Escovar os dentes',
        description: 'Escovar bem os dentes por 2 minutos',
        period: 'morning' as const,
        xp: 15,
        gold: 8,
        time: '07:30'
      },
      {
        title: 'Fazer o dever de casa',
        description: 'Completar todas as lições da escola',
        period: 'afternoon' as const,
        xp: 30,
        gold: 20,
        time: '15:00'
      },
      {
        title: 'Organizar o quarto',
        description: 'Arrumar a cama e guardar os brinquedos',
        period: 'morning' as const,
        xp: 25,
        gold: 15,
        time: '08:00'
      },
      {
        title: 'Ajudar na cozinha',
        description: 'Ajudar a preparar o jantar',
        period: 'evening' as const,
        xp: 20,
        gold: 12,
        time: '18:30'
      },
      {
        title: 'Ler um livro',
        description: 'Ler pelo menos 15 minutos',
        period: 'evening' as const,
        xp: 35,
        gold: 25,
        time: '19:00'
      }
    ];

    testTasks.forEach(task => {
      const taskRef = doc(collection(db, 'tasks'));
      batch.set(taskRef, {
        ownerId: childUid,
        userId: childUid,
        title: task.title,
        description: task.description,
        period: task.period,
        status: 'pending',
        xp: task.xp,
        gold: task.gold,
        time: task.time,
        frequency: 'daily',
        active: true,
        createdBy: adminUid,
        createdAt: nowTs(),
        updatedAt: nowTs()
      });
    });

    // Create 5 varied test rewards
    const testRewards = [
      {
        title: '30 min de videogame extra',
        description: 'Tempo adicional para jogar seus jogos favoritos',
        costGold: 40,
        emoji: '🎮',
        category: 'activity' as const
      },
      {
        title: 'Escolher o filme da noite',
        description: 'Você decide qual filme assistir em família',
        costGold: 60,
        emoji: '🎬',
        category: 'privilege' as const
      },
      {
        title: 'Sorvete especial',
        description: 'Um sorvete gostoso de sobremesa',
        costGold: 25,
        emoji: '🍦',
        category: 'treat' as const
      },
      {
        title: 'Brinquedo novo pequeno',
        description: 'Um brinquedo legal até R$ 20',
        costGold: 100,
        emoji: '🧸',
        category: 'toy' as const
      },
      {
        title: 'Dormir 30 min mais tarde',
        description: 'Ficar acordado 30 minutos a mais no fim de semana',
        costGold: 80,
        emoji: '🌙',
        category: 'privilege' as const
      }
    ];

    testRewards.forEach(reward => {
      const rewardRef = doc(collection(db, 'rewards'));
      batch.set(rewardRef, {
        ownerId: childUid,
        userId: childUid,
        title: reward.title,
        description: reward.description,
        category: reward.category,
        costGold: reward.costGold,
        emoji: reward.emoji,
        active: true,
        requiredLevel: 1, // Default level for existing rewards
        createdAt: nowTs(),
        updatedAt: nowTs()
      });
    });

    await batch.commit();
    console.log('✅ FirestoreService: Test data created successfully');
  }

  static async createDefaultData(childUid: string, adminUid: string): Promise<void> {
    console.log('🔄 FirestoreService: Creating default data for:', childUid);
    
    const batch = writeBatch(db);

    // Create default tasks
    const defaultTasks = [
      {
        ownerId: childUid,
        title: 'Escovar os dentes',
        description: 'Escovar bem os dentes por 2 minutos',
        period: 'morning' as const,
        status: 'pending' as const,
        xp: 10,
        gold: 5,
        frequency: 'daily' as const,
        active: true,
        createdBy: adminUid
      },
      {
        ownerId: childUid,
        title: 'Arrumar a cama',
        description: 'Deixar o quarto organizado',
        period: 'morning' as const,
        status: 'pending' as const,
        xp: 15,
        gold: 8,
        frequency: 'daily' as const,
        active: true,
        createdBy: adminUid
      },
      {
        ownerId: childUid,
        title: 'Fazer o dever de casa',
        description: 'Completar todas as lições',
        period: 'afternoon' as const,
        status: 'pending' as const,
        xp: 25,
        gold: 15,
        frequency: 'daily' as const,
        active: true,
        createdBy: adminUid
      },
      {
        ownerId: childUid,
        title: 'Organizar os brinquedos',
        description: 'Guardar tudo no lugar certo',
        period: 'evening' as const,
        status: 'pending' as const,
        xp: 20,
        gold: 10,
        frequency: 'daily' as const,
        active: true,
        createdBy: adminUid
      }
    ];

    defaultTasks.forEach(task => {
      const taskRef = doc(collection(db, 'tasks'));
      batch.set(taskRef, {
        ownerId: childUid,
        userId: childUid, // Add userId field for Data Doctor compatibility
        title: task.title,
        description: task.description || '',
        period: task.period,
        status: task.status,
        xp: task.xp,
        gold: task.gold,
        frequency: task.frequency,
        active: task.active,
        createdBy: task.createdBy,
        createdAt: nowTs(),
        updatedAt: nowTs()
      });
    });

    // Create default rewards
    const defaultRewards = [
      {
        title: '30 min de videogame extra',
        description: 'Tempo adicional para jogar seus jogos favoritos',
        costGold: 50,
        emoji: '🎮',
        category: 'activity' as const,
        active: true
      },
      {
        title: 'Escolher o jantar',
        description: 'Você decide o que vamos jantar hoje',
        costGold: 75,
        emoji: '🍕',
        category: 'privilege' as const,
        active: true
      },
      {
        title: 'Doce especial',
        description: 'Um doce gostoso como recompensa',
        costGold: 30,
        emoji: '🍭',
        category: 'treat' as const,
        active: true
      },
      {
        title: 'Filme em família',
        description: 'Assistir um filme juntos no fim de semana',
        costGold: 100,
        emoji: '🎬',
        category: 'activity' as const,
        active: true
      }
    ];

    defaultRewards.forEach(reward => {
      const rewardRef = doc(collection(db, 'rewards'));
      batch.set(rewardRef, {
        ownerId: childUid,
        userId: childUid, // Add userId field for Data Doctor compatibility
        title: reward.title,
        description: reward.description,
        category: reward.category,
        costGold: reward.costGold,
        emoji: reward.emoji,
        requiredLevel: reward.requiredLevel || 1,
        active: reward.active,
        requiredLevel: 1, // Default level for existing rewards
        createdAt: nowTs(),
        updatedAt: nowTs()
      });
    });

    await batch.commit();
    console.log('✅ FirestoreService: Default data created successfully');
  }

  // ========================================
  // 🔥 DATA DOCTOR OPERATIONS
  // ========================================

  static async scanCollectionIntegrity(collectionName: string): Promise<{
    total: number;
    valid: number;
    missingOwnerId: number;
    invalidOwnerIdType: number;
    orphanedOwnerId: number;
    userIdOwnerIdMismatch: number;
    issues: Array<{
      docId: string;
      issue: string;
      details: string;
      userId?: string;
      ownerId?: any;
    }>;
  }> {
    const snapshot = await getDocs(collection(db, collectionName));
    const docs = snapshot.docs;
    
    const stats = {
      total: docs.length,
      valid: 0,
      missingOwnerId: 0,
      invalidOwnerIdType: 0,
      orphanedOwnerId: 0,
      userIdOwnerIdMismatch: 0,
      issues: [] as Array<{
        docId: string;
        issue: string;
        details: string;
        userId?: string;
        ownerId?: any;
      }>
    };

    // Get all user IDs for validation
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const validUserIds = new Set(usersSnapshot.docs.map(doc => doc.id));
    
    for (const docSnapshot of docs) {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      const ownerIdField = collectionName === 'redemptions' || collectionName === 'notifications' ? 'userId' : 'ownerId';
      const toUserIdField = collectionName === 'notifications' ? 'toUserId' : null;
      
      // Check the appropriate field based on collection
      const ownerIdValue = toUserIdField ? data[toUserIdField] : data[ownerIdField];
      
      // Check 1: Missing ownerId/userId/toUserId
      if (!ownerIdValue) {
        stats.missingOwnerId++;
        stats.issues.push({
          docId,
          issue: `missing_${ownerIdField}`,
          details: `Document missing ${ownerIdField} field`,
          userId: data.userId,
          ownerId: data.ownerId
        });
        continue;
      }
      
      // Check 2: Invalid type
      if (typeof ownerIdValue !== 'string') {
        stats.invalidOwnerIdType++;
        stats.issues.push({
          docId,
          issue: `invalid_${ownerIdField}_type`,
          details: `${ownerIdField} is ${typeof ownerIdValue}, expected string`,
          ownerId: ownerIdValue,
          userId: data.userId
        });
        continue;
      }
      
      // Check 3: Orphaned (user doesn't exist)
      if (!validUserIds.has(ownerIdValue)) {
        stats.orphanedOwnerId++;
        stats.issues.push({
          docId,
          issue: `orphaned_${ownerIdField}`,
          details: `${ownerIdField} "${ownerIdValue}" does not exist in users collection`,
          ownerId: ownerIdValue,
          userId: data.userId
        });
        continue;
      }
      
      // Check 4: userId vs ownerId mismatch (if both exist)
      if (data.userId && data.ownerId && data.userId !== data.ownerId) {
        stats.userIdOwnerIdMismatch++;
        stats.issues.push({
          docId,
          issue: 'userId_ownerId_mismatch',
          details: `userId "${data.userId}" differs from ownerId "${data.ownerId}"`,
          ownerId: data.ownerId,
          userId: data.userId
        });
        continue;
      }
      
      // If we reach here, document is valid
      stats.valid++;
    }
    
    return stats;
  }

  static async fixCollectionDocuments(
    collectionName: string,
    strategy: 'use_userId' | 'assign_to_child',
    targetChildId?: string,
    selectedDocIds?: string[]
  ): Promise<{
    totalFixed: number;
    batchesExecuted: number;
    errors: string[];
  }> {
    const BATCH_SIZE = 400;
    let totalFixed = 0;
    let batchesExecuted = 0;
    const errors: string[] = [];

    // Get documents to fix
    const snapshot = await getDocs(collection(db, collectionName));
    let docsToFix = snapshot.docs;

    // Filter by selected IDs if provided
    if (selectedDocIds && selectedDocIds.length > 0) {
      docsToFix = docsToFix.filter(doc => selectedDocIds.includes(doc.id));
    }

    // Process in batches
    for (let i = 0; i < docsToFix.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchDocs = docsToFix.slice(i, i + BATCH_SIZE);
      let batchOperations = 0;

      for (const docSnapshot of batchDocs) {
        try {
          const data = docSnapshot.data();
          const docRef = doc(db, collectionName, docSnapshot.id);
          
          let newOwnerId: string;
          const ownerIdField = collectionName === 'redemptions' || collectionName === 'notifications' ? 'userId' : 'ownerId';
          const toUserIdField = collectionName === 'notifications' ? 'toUserId' : null;
          
          if (strategy === 'use_userId' && data.userId && typeof data.userId === 'string') {
            newOwnerId = data.userId;
          } else if (strategy === 'assign_to_child' && targetChildId) {
            newOwnerId = targetChildId;
          } else {
            errors.push(`Cannot determine ${ownerIdField} for document ${docSnapshot.id}`);
            continue;
          }
          
          const updates: any = {
            [ownerIdField]: newOwnerId,
            updatedAt: nowTs(),
            fixedAt: nowTs(),
            fixedBy: 'data-doctor',
            fixedStrategy: strategy
          };

          // For notifications, also set toUserId
          if (toUserIdField) {
            updates[toUserIdField] = newOwnerId;
          }
          
          batch.update(docRef, updates);
          batchOperations++;
          totalFixed++;
          
        } catch (error: any) {
          errors.push(`Error processing ${docSnapshot.id}: ${error.message}`);
        }
      }
      
      if (batchOperations > 0) {
        await batch.commit();
        batchesExecuted++;
      }
    }

    return {
      totalFixed,
      batchesExecuted,
      errors
    };
  }

  // ========================================
  // 🔥 COMPLETE RESET OPERATIONS
  // ========================================

  static async completeUserReset(childUid: string): Promise<void> {
    console.log('🔄 FirestoreService: Starting complete reset for:', childUid);
    
    const batch = writeBatch(db);
    let batchCount = 0;
    const BATCH_SIZE = 400;

    try {
      // 1. Delete all tasks for this child
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('ownerId', '==', childUid)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      
      for (const taskDoc of tasksSnapshot.docs) {
        // Delete task completions subcollection first
        const completionsQuery = query(collection(db, 'tasks', taskDoc.id, 'completions'));
        const completionsSnapshot = await getDocs(completionsQuery);
        
        for (const completionDoc of completionsSnapshot.docs) {
          batch.delete(completionDoc.ref);
          batchCount++;
          
          // Execute batch if approaching limit
          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            batchCount = 0;
          }
        }
        
        // Delete the task document
        batch.delete(taskDoc.ref);
        batchCount++;
        
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batchCount = 0;
        }
      }

      // 2. Delete all rewards for this child
      const rewardsQuery = query(
        collection(db, 'rewards'),
        where('ownerId', '==', childUid)
      );
      const rewardsSnapshot = await getDocs(rewardsQuery);
      
      for (const rewardDoc of rewardsSnapshot.docs) {
        batch.delete(rewardDoc.ref);
        batchCount++;
        
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batchCount = 0;
        }
      }

      // 3. Delete all redemptions for this child
      const redemptionsQuery = query(
        collection(db, 'redemptions'),
        where('userId', '==', childUid)
      );
      const redemptionsSnapshot = await getDocs(redemptionsQuery);
      
      for (const redemptionDoc of redemptionsSnapshot.docs) {
        batch.delete(redemptionDoc.ref);
        batchCount++;
        
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batchCount = 0;
        }
      }

      // 4. Delete all notifications for this child
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('toUserId', '==', childUid)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      
      for (const notificationDoc of notificationsSnapshot.docs) {
        batch.delete(notificationDoc.ref);
        batchCount++;
        
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batchCount = 0;
        }
      }

      // 5. Reset user progress
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
        lastActivityDate: nowTs(),
        updatedAt: nowTs(),
        resetAt: nowTs(),
        resetBy: 'admin'
      });
      batchCount++;

      // Execute final batch
      if (batchCount > 0) {
        await batch.commit();
      }

      console.log('✅ FirestoreService: Complete reset finished for:', childUid);
    } catch (error) {
      console.error('❌ FirestoreService: Error during complete reset:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 ADMIN UTILITIES
  // ========================================

  static async getChildUsers(): Promise<User[]> {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'child')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        userId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastLoginTimestamp: data.lastLoginTimestamp?.toDate() || new Date()
      } as User;
    });
  }

  static async syncUserData(childUid: string): Promise<void> {
    await this.updateUserProgress(childUid, {
      updatedAt: new Date()
    });
  }
}