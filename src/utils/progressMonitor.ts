import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ProgressSnapshot {
  userId: string;
  totalXP: number;
  level: number;
  availableGold: number;
  totalGoldEarned: number;
  timestamp: Date;
  reason: string;
}

export interface ProgressValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  snapshot: ProgressSnapshot | null;
}

/**
 * Validates progress update to prevent data loss
 */
export async function validateProgressUpdate(
  userId: string,
  newProgress: {
    totalXP?: number;
    level?: number;
    availableGold?: number;
    totalGoldEarned?: number;
  },
  reason: string
): Promise<ProgressValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Get current progress
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      return {
        isValid: true,
        errors: [],
        warnings: ['No existing progress found - creating new'],
        snapshot: null
      };
    }

    const currentProgress = progressSnap.data();
    const currentXP = currentProgress.totalXP || 0;
    const currentLevel = currentProgress.level || 1;
    const currentGold = currentProgress.availableGold || 0;
    const currentTotalGold = currentProgress.totalGoldEarned || 0;

    // Validate XP changes
    if (newProgress.totalXP !== undefined) {
      // XP should never decrease (except for admin corrections)
      if (newProgress.totalXP < currentXP && !reason.includes('correction') && !reason.includes('recovery')) {
        errors.push(`XP DECREASE DETECTED: ${currentXP} → ${newProgress.totalXP} (-${currentXP - newProgress.totalXP})`);
      }

      // Validate level consistency
      const expectedLevel = Math.floor(newProgress.totalXP / 100) + 1;
      if (newProgress.level !== undefined && newProgress.level !== expectedLevel) {
        warnings.push(`Level mismatch: provided ${newProgress.level}, expected ${expectedLevel} for ${newProgress.totalXP} XP`);
      }
    }

    // Validate gold changes
    if (newProgress.totalGoldEarned !== undefined) {
      // Total gold earned should never decrease
      if (newProgress.totalGoldEarned < currentTotalGold && !reason.includes('correction') && !reason.includes('recovery')) {
        errors.push(`TOTAL GOLD DECREASE DETECTED: ${currentTotalGold} → ${newProgress.totalGoldEarned}`);
      }
    }

    // Validate available gold
    if (newProgress.availableGold !== undefined) {
      // Available gold can decrease (spending) but should be reasonable
      const goldChange = newProgress.availableGold - currentGold;
      if (goldChange < -1000) {
        warnings.push(`Large gold decrease: ${currentGold} → ${newProgress.availableGold} (-${Math.abs(goldChange)})`);
      }
    }

    // Create snapshot if valid
    const snapshot: ProgressSnapshot = {
      userId,
      totalXP: newProgress.totalXP ?? currentXP,
      level: newProgress.level ?? currentLevel,
      availableGold: newProgress.availableGold ?? currentGold,
      totalGoldEarned: newProgress.totalGoldEarned ?? currentTotalGold,
      timestamp: new Date(),
      reason
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      snapshot
    };

  } catch (error: any) {
    return {
      isValid: false,
      errors: [`Validation error: ${error.message}`],
      warnings: [],
      snapshot: null
    };
  }
}

/**
 * Creates a progress snapshot in Firestore for audit trail
 */
export async function createProgressSnapshot(snapshot: ProgressSnapshot): Promise<void> {
  try {
    await addDoc(collection(db, 'progressSnapshots'), {
      ...snapshot,
      timestamp: serverTimestamp()
    });
    console.log('✅ Progress snapshot created:', snapshot);
  } catch (error) {
    console.error('❌ Failed to create progress snapshot:', error);
    // Don't throw - snapshot is optional
  }
}

/**
 * Safe progress update with validation and snapshot
 */
export async function safeUpdateProgress(
  userId: string,
  updates: {
    totalXP?: number;
    level?: number;
    availableGold?: number;
    totalGoldEarned?: number;
  },
  reason: string
): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
  try {
    // Validate the update
    const validation = await validateProgressUpdate(userId, updates, reason);

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Progress update warnings:', validation.warnings);
    }

    // Reject if invalid
    if (!validation.isValid) {
      console.error('❌ Progress update rejected:', validation.errors);
      return {
        success: false,
        error: `Progress update rejected: ${validation.errors.join(', ')}`,
        warnings: validation.warnings
      };
    }

    // Create snapshot before update
    if (validation.snapshot) {
      await createProgressSnapshot(validation.snapshot);
    }

    // Perform the update
    const progressRef = doc(db, 'progress', userId);
    await updateDoc(progressRef, {
      ...updates,
      lastUpdated: serverTimestamp()
    });

    console.log('✅ Progress updated safely:', { userId, updates, reason });

    return {
      success: true,
      warnings: validation.warnings
    };

  } catch (error: any) {
    console.error('❌ Safe progress update failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Monitors progress changes and alerts on anomalies
 */
export async function checkProgressHealth(userId: string): Promise<{
  healthy: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      issues.push('No progress document found');
      recommendations.push('Create initial progress document');
      return { healthy: false, issues, recommendations };
    }

    const progress = progressSnap.data();
    const totalXP = progress.totalXP || 0;
    const level = progress.level || 1;
    const availableGold = progress.availableGold || 0;
    const totalGoldEarned = progress.totalGoldEarned || 0;

    // Check XP-Level consistency
    const expectedLevel = Math.floor(totalXP / 100) + 1;
    if (level !== expectedLevel) {
      issues.push(`Level mismatch: current ${level}, expected ${expectedLevel}`);
      recommendations.push(`Update level to ${expectedLevel}`);
    }

    // Check negative values
    if (totalXP < 0) {
      issues.push('Negative XP detected');
      recommendations.push('Reset XP to 0 or investigate data corruption');
    }

    if (availableGold < 0) {
      issues.push('Negative available gold detected');
      recommendations.push('Reset gold to 0');
    }

    // Check gold consistency
    if (availableGold > totalGoldEarned) {
      issues.push(`Available gold (${availableGold}) exceeds total earned (${totalGoldEarned})`);
      recommendations.push('Adjust available gold or total earned');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };

  } catch (error: any) {
    return {
      healthy: false,
      issues: [`Health check error: ${error.message}`],
      recommendations: ['Run Firebase Doctor to check connectivity']
    };
  }
}
