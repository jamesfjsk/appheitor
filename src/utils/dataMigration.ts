import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface MigrationResult {
  success: boolean;
  message: string;
  details: {
    usersUpdated: number;
    tasksUpdated: number;
    rewardsUpdated: number;
    progressCleaned: number;
  };
}

export async function runDataMigration(): Promise<MigrationResult> {
  console.log('🔄 Starting data migration...');
  
  const result: MigrationResult = {
    success: false,
    message: '',
    details: {
      usersUpdated: 0,
      tasksUpdated: 0,
      rewardsUpdated: 0,
      progressCleaned: 0
    }
  };

  try {
    const batch = writeBatch(db);
    let batchCount = 0;

    // 1. Find and setup users with correct roles
    console.log('🔄 Step 1: Setting up user roles...');
    
    const usersSnapshot = await getDocs(collection(db, 'users'));
    let adminUid = '';
    let childUid = '';
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;
      
      if (userData.email?.includes('pai')) {
        // This is admin
        adminUid = uid;
        
        // Find child UID
        const childQuery = query(
          collection(db, 'users'),
          where('email', '>=', 'heitor'),
          where('email', '<=', 'heitor\uf8ff')
        );
        const childSnapshot = await getDocs(childQuery);
        
        if (!childSnapshot.empty) {
          childUid = childSnapshot.docs[0].id;
        }
        
        batch.update(doc(db, 'users', uid), {
          role: 'admin',
          childId: childUid || null,
          lastLoginTimestamp: serverTimestamp()
        });
        
        result.details.usersUpdated++;
        batchCount++;
        
      } else if (userData.email?.includes('heitor')) {
        // This is child
        childUid = uid;
        
        batch.update(doc(db, 'users', uid), {
          role: 'child',
          lastLoginTimestamp: serverTimestamp()
        });
        
        result.details.usersUpdated++;
        batchCount++;
      }
    }

    console.log('🔄 Found users:', { adminUid, childUid });

    if (!childUid) {
      throw new Error('Child user (Heitor) not found');
    }

    // 2. Update tasks to have correct ownerId
    console.log('🔄 Step 2: Updating tasks...');
    
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      
      if (!taskData.ownerId || taskData.ownerId === adminUid) {
        batch.update(doc(db, 'tasks', taskDoc.id), {
          ownerId: childUid,
          createdBy: adminUid || childUid,
          updatedAt: serverTimestamp()
        });
        
        result.details.tasksUpdated++;
        batchCount++;
      }
    }

    // 3. Update rewards to have correct ownerId
    console.log('🔄 Step 3: Updating rewards...');
    
    const rewardsSnapshot = await getDocs(collection(db, 'rewards'));
    
    for (const rewardDoc of rewardsSnapshot.docs) {
      const rewardData = rewardDoc.data();
      
      if (!rewardData.ownerId || rewardData.ownerId === adminUid) {
        batch.update(doc(db, 'rewards', rewardDoc.id), {
          ownerId: childUid,
          createdBy: adminUid || childUid,
          updatedAt: serverTimestamp()
        });
        
        result.details.rewardsUpdated++;
        batchCount++;
      }
    }

    // 4. Remove admin progress if exists
    console.log('🔄 Step 4: Cleaning admin progress...');
    
    if (adminUid) {
      const adminProgressDoc = await getDoc(doc(db, 'progress', adminUid));
      if (adminProgressDoc.exists()) {
        batch.delete(doc(db, 'progress', adminUid));
        result.details.progressCleaned++;
        batchCount++;
      }
    }

    // 5. Ensure child progress exists
    console.log('🔄 Step 5: Ensuring child progress...');
    
    const childProgressDoc = await getDoc(doc(db, 'progress', childUid));
    if (!childProgressDoc.exists()) {
      batch.set(doc(db, 'progress', childUid), {
        userId: childUid,
        level: 1,
        totalXP: 0,
        availableGold: 0,
        totalGoldEarned: 0,
        totalGoldSpent: 0,
        streak: 0,
        longestStreak: 0,
        totalTasksCompleted: 0,
        rewardsRedeemed: 0,
        unlockedAchievements: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastSyncAt: serverTimestamp()
      });
      batchCount++;
    }

    // Execute batch if there are operations
    if (batchCount > 0) {
      console.log(`🔄 Executing batch with ${batchCount} operations...`);
      await batch.commit();
    }

    result.success = true;
    result.message = `Migration completed successfully! Updated ${result.details.usersUpdated} users, ${result.details.tasksUpdated} tasks, ${result.details.rewardsUpdated} rewards, cleaned ${result.details.progressCleaned} admin progress.`;
    
    console.log('✅ Migration completed:', result);
    return result;

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    result.success = false;
    result.message = `Migration failed: ${error.message}`;
    return result;
  }
}

// Helper function to validate data integrity after migration
export async function validateDataIntegrity(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  try {
    // Check users have correct roles
    const usersSnapshot = await getDocs(collection(db, 'users'));
    let hasAdmin = false;
    let hasChild = false;
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      if (userData.role === 'admin') {
        hasAdmin = true;
        if (!userData.childId) {
          issues.push('Admin user missing childId');
        }
      } else if (userData.role === 'child') {
        hasChild = true;
      }
    }
    
    if (!hasAdmin) issues.push('No admin user found');
    if (!hasChild) issues.push('No child user found');
    
    // Check tasks have ownerId
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      if (!taskData.ownerId) {
        issues.push(`Task ${taskDoc.id} missing ownerId`);
      }
    }
    
    // Check rewards have ownerId
    const rewardsSnapshot = await getDocs(collection(db, 'rewards'));
    for (const rewardDoc of rewardsSnapshot.docs) {
      const rewardData = rewardDoc.data();
      if (!rewardData.ownerId) {
        issues.push(`Reward ${rewardDoc.id} missing ownerId`);
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
    
  } catch (error: any) {
    return {
      valid: false,
      issues: [`Validation failed: ${error.message}`]
    };
  }
}