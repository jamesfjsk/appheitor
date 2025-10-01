import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface XPSnapshot {
  userId: string;
  totalXP: number;
  level: number;
  availableGold: number;
  totalGoldEarned: number;
  timestamp: Date;
  source: 'progress' | 'task_history' | 'redemption_history' | 'achievement_history';
}

export interface RecoveryReport {
  currentProgress: {
    totalXP: number;
    level: number;
    availableGold: number;
    totalGoldEarned: number;
  } | null;
  historicalData: XPSnapshot[];
  estimatedCorrectXP: number;
  estimatedLevel: number;
  estimatedGold: number;
  recommendations: string[];
}

export async function investigateXPLoss(userId: string): Promise<RecoveryReport> {
  console.log(`🔍 XP Recovery: Starting investigation for user ${userId}...`);

  const historicalData: XPSnapshot[] = [];
  const recommendations: string[] = [];

  try {
    // 1. Get current progress
    console.log('📊 Step 1: Getting current progress...');
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);

    const currentProgress = progressSnap.exists() ? {
      totalXP: progressSnap.data().totalXP || 0,
      level: progressSnap.data().level || 1,
      availableGold: progressSnap.data().availableGold || 0,
      totalGoldEarned: progressSnap.data().totalGoldEarned || 0
    } : null;

    console.log('📊 Current Progress:', currentProgress);

    // 2. Check task completion history
    console.log('📋 Step 2: Analyzing task completion history...');
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('ownerId', '==', userId)
    );

    const tasksSnap = await getDocs(tasksQuery);
    console.log(`📋 Found ${tasksSnap.size} tasks`);

    let totalXPFromTasks = 0;
    let totalGoldFromTasks = 0;

    tasksSnap.forEach(taskDoc => {
      const task = taskDoc.data();
      if (task.status === 'done' && task.xpReward) {
        totalXPFromTasks += task.xpReward;
        totalGoldFromTasks += task.goldReward || 0;
      }
    });

    if (totalXPFromTasks > 0) {
      historicalData.push({
        userId,
        totalXP: totalXPFromTasks,
        level: Math.floor(totalXPFromTasks / 100) + 1,
        availableGold: totalGoldFromTasks,
        totalGoldEarned: totalGoldFromTasks,
        timestamp: new Date(),
        source: 'task_history'
      });
      console.log(`✅ Found ${totalXPFromTasks} XP from completed tasks`);
    }

    // 3. Check redemption history (gold spent)
    console.log('🎁 Step 3: Checking redemption history...');
    const redemptionsQuery = query(
      collection(db, 'redemptions'),
      where('userId', '==', userId)
    );

    const redemptionsSnap = await getDocs(redemptionsQuery);
    console.log(`🎁 Found ${redemptionsSnap.size} redemptions`);

    let totalGoldSpent = 0;
    redemptionsSnap.forEach(redDoc => {
      const redemption = redDoc.data();
      totalGoldSpent += redemption.goldCost || 0;
    });

    console.log(`💰 Total gold spent: ${totalGoldSpent}`);

    // 4. Check achievement completions
    console.log('🏆 Step 4: Checking achievement history...');
    const achievementsQuery = query(
      collection(db, 'userAchievements'),
      where('userId', '==', userId),
      where('unlockedAt', '!=', null)
    );

    const achievementsSnap = await getDocs(achievementsQuery);
    console.log(`🏆 Found ${achievementsSnap.size} unlocked achievements`);

    let totalXPFromAchievements = 0;
    let totalGoldFromAchievements = 0;

    achievementsSnap.forEach(achDoc => {
      const achievement = achDoc.data();
      if (achievement.claimed) {
        totalXPFromAchievements += achievement.xpReward || 0;
        totalGoldFromAchievements += achievement.goldReward || 0;
      }
    });

    console.log(`🏆 XP from achievements: ${totalXPFromAchievements}, Gold: ${totalGoldFromAchievements}`);

    // 5. Calculate estimated correct values
    const estimatedTotalXP = totalXPFromTasks + totalXPFromAchievements;
    const estimatedTotalGold = totalGoldFromTasks + totalGoldFromAchievements;
    const estimatedAvailableGold = estimatedTotalGold - totalGoldSpent;
    const estimatedLevel = Math.floor(estimatedTotalXP / 100) + 1;

    console.log('📊 Estimated correct values:', {
      estimatedTotalXP,
      estimatedLevel,
      estimatedAvailableGold,
      estimatedTotalGold
    });

    // 6. Generate recommendations
    if (currentProgress && currentProgress.totalXP < estimatedTotalXP) {
      const xpDifference = estimatedTotalXP - currentProgress.totalXP;
      recommendations.push(`⚠️ PERDA DE XP DETECTADA: ${xpDifference} XP faltando`);
      recommendations.push(`📈 XP atual: ${currentProgress.totalXP}, Esperado: ${estimatedTotalXP}`);
      recommendations.push(`🎯 Use a função restoreXP() para recuperar o progresso`);
    } else if (currentProgress && currentProgress.totalXP === estimatedTotalXP) {
      recommendations.push(`✅ XP está correto! Nenhuma perda detectada.`);
    }

    if (currentProgress && currentProgress.availableGold < estimatedAvailableGold) {
      const goldDifference = estimatedAvailableGold - currentProgress.availableGold;
      recommendations.push(`⚠️ PERDA DE GOLD DETECTADA: ${goldDifference} Gold faltando`);
    }

    return {
      currentProgress,
      historicalData,
      estimatedCorrectXP: estimatedTotalXP,
      estimatedLevel,
      estimatedGold: estimatedAvailableGold,
      recommendations
    };

  } catch (error: any) {
    console.error('❌ XP Recovery: Error investigating XP loss:', error);
    throw error;
  }
}

export async function restoreXP(
  userId: string,
  targetXP: number,
  targetGold: number,
  reason: string
): Promise<void> {
  console.log(`🔧 XP Recovery: Restoring XP for user ${userId}...`);
  console.log(`🎯 Target: ${targetXP} XP, ${targetGold} Gold`);
  console.log(`📝 Reason: ${reason}`);

  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      throw new Error('Progress document not found');
    }

    const currentData = progressSnap.data();
    const newLevel = Math.floor(targetXP / 100) + 1;

    await updateDoc(progressRef, {
      totalXP: targetXP,
      level: newLevel,
      availableGold: targetGold,
      totalGoldEarned: targetGold + (currentData.totalGoldSpent || 0),
      updatedAt: serverTimestamp(),
      restoredAt: serverTimestamp(),
      restoredBy: 'xp-recovery-tool',
      restorationReason: reason,
      previousXP: currentData.totalXP || 0,
      previousLevel: currentData.level || 1,
      previousGold: currentData.availableGold || 0
    });

    console.log('✅ XP Recovery: XP restored successfully!');
    console.log(`📊 New values: Level ${newLevel}, ${targetXP} XP, ${targetGold} Gold`);

  } catch (error: any) {
    console.error('❌ XP Recovery: Error restoring XP:', error);
    throw error;
  }
}

export async function createXPBackup(userId: string): Promise<void> {
  console.log(`💾 XP Recovery: Creating backup for user ${userId}...`);

  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      throw new Error('Progress document not found');
    }

    const data = progressSnap.data();
    const backupRef = doc(collection(db, 'xpBackups'));

    await setDoc(backupRef, {
      userId,
      totalXP: data.totalXP || 0,
      level: data.level || 1,
      availableGold: data.availableGold || 0,
      totalGoldEarned: data.totalGoldEarned || 0,
      totalGoldSpent: data.totalGoldSpent || 0,
      createdAt: serverTimestamp(),
      backupReason: 'manual-backup'
    });

    console.log('✅ XP Recovery: Backup created successfully!');

  } catch (error: any) {
    console.error('❌ XP Recovery: Error creating backup:', error);
    throw error;
  }
}
