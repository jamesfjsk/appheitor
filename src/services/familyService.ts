import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Family, User } from '../types';

export class FamilyService {
  private static readonly FAMILY_ID = 'default';

  // ========================================
  // 🔥 FAMILY MANAGEMENT
  // ========================================

  static async getFamily(): Promise<Family | null> {
    try {
      const familyDoc = await getDoc(doc(db, 'families', this.FAMILY_ID));
      
      if (familyDoc.exists()) {
        const data = familyDoc.data();
        return {
          id: familyDoc.id,
          adminId: data.adminId,
          childId: data.childId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ FamilyService: Error getting family:', error);
      return null;
    }
  }

  static async createOrUpdateFamily(adminId: string, childId: string): Promise<Family> {
    try {
      const familyData = {
        adminId,
        childId,
        updatedAt: serverTimestamp()
      };

      const familyRef = doc(db, 'families', this.FAMILY_ID);
      const existingFamily = await getDoc(familyRef);

      if (existingFamily.exists()) {
        await updateDoc(familyRef, familyData);
      } else {
        await setDoc(familyRef, {
          ...familyData,
          createdAt: serverTimestamp()
        });
      }

      console.log('✅ FamilyService: Family updated:', { adminId, childId });
      
      return {
        id: this.FAMILY_ID,
        adminId,
        childId,
        createdAt: existingFamily.exists() 
          ? existingFamily.data().createdAt?.toDate() || new Date()
          : new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ FamilyService: Error creating/updating family:', error);
      throw error;
    }
  }

  static async relinkChild(newChildId: string): Promise<void> {
    try {
      const familyRef = doc(db, 'families', this.FAMILY_ID);
      await updateDoc(familyRef, {
        childId: newChildId,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ FamilyService: Child relinked:', newChildId);
    } catch (error) {
      console.error('❌ FamilyService: Error relinking child:', error);
      throw error;
    }
  }

  // ========================================
  // 🔥 USER MANAGEMENT
  // ========================================

  static async ensureUserRole(uid: string, email: string): Promise<'admin' | 'child'> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role) {
          return userData.role;
        }
      }

      // Determine role based on email
      const role = email === 'admin@flash.com' ? 'admin' : 'child';
      
      await setDoc(userRef, {
        displayName: role === 'admin' ? 'Pai' : 'Heitor',
        email,
        role,
        createdAt: serverTimestamp(),
        lastLoginTimestamp: serverTimestamp()
      }, { merge: true });

      console.log('✅ FamilyService: User role ensured:', { uid, role });
      return role;
    } catch (error) {
      console.error('❌ FamilyService: Error ensuring user role:', error);
      throw error;
    }
  }

  static async findChildUsers(): Promise<User[]> {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'child')
      );
      
      const querySnapshot = await getDocs(usersQuery);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          displayName: data.displayName || 'Usuário',
          email: data.email || '',
          photoURL: data.photoURL,
          role: data.role,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginTimestamp: data.lastLoginTimestamp?.toDate() || new Date()
        };
      });
    } catch (error) {
      console.error('❌ FamilyService: Error finding child users:', error);
      return [];
    }
  }

  // ========================================
  // 🔥 HEALTH CHECK
  // ========================================

  static async healthCheck(adminId: string): Promise<{
    familyOk: boolean;
    childExists: boolean;
    childId: string | null;
    issues: string[];
  }> {
    const issues: string[] = [];
    let familyOk = false;
    let childExists = false;
    let childId: string | null = null;

    try {
      // Check family document
      const family = await this.getFamily();
      
      if (!family) {
        issues.push('Family document not found');
      } else if (family.adminId !== adminId) {
        issues.push('Family adminId mismatch');
      } else {
        familyOk = true;
        childId = family.childId;
        
        // Check if child exists
        const childDoc = await getDoc(doc(db, 'users', family.childId));
        if (childDoc.exists() && childDoc.data().role === 'child') {
          childExists = true;
        } else {
          issues.push('Child user not found or invalid role');
        }
      }

      return {
        familyOk,
        childExists,
        childId,
        issues
      };
    } catch (error) {
      console.error('❌ FamilyService: Health check failed:', error);
      return {
        familyOk: false,
        childExists: false,
        childId: null,
        issues: [`Health check failed: ${error}`]
      };
    }
  }

  // ========================================
  // 🔥 DATA MIGRATION
  // ========================================

  static async migrateUserDataToOwnerId(): Promise<{
    success: boolean;
    message: string;
    details: {
      tasksMigrated: number;
      rewardsMigrated: number;
      progressMigrated: number;
    };
  }> {
    const details = {
      tasksMigrated: 0,
      rewardsMigrated: 0,
      progressMigrated: 0
    };

    try {
      const batch = writeBatch(db);
      let batchCount = 0;

      // Get family info
      const family = await this.getFamily();
      if (!family) {
        throw new Error('Family not found for migration');
      }

      const collections = ['tasks', 'rewards', 'progress'];
      
      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data();
          const docId = docSnapshot.id;
          
          // Check if this document uses old format (docId == userId)
          if (docId === family.childId || docId === family.adminId) {
            // Create new document with ownerId
            const newDocRef = doc(collection(db, collectionName));
            const newData = {
              ...data,
              ownerId: family.childId, // All data belongs to child
              familyId: 'default',
              migratedFrom: docId,
              migratedAt: serverTimestamp()
            };
            
            // Remove old userId field if exists
            delete newData.userId;
            
            batch.set(newDocRef, newData);
            batch.delete(docSnapshot.ref); // Delete old document
            
            batchCount += 2; // set + delete
            details[`${collectionName}Migrated` as keyof typeof details]++;
          }
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        console.log('✅ FamilyService: Migration completed:', details);
      }

      return {
        success: true,
        message: `Migration completed successfully! Migrated ${details.tasksMigrated} tasks, ${details.rewardsMigrated} rewards, ${details.progressMigrated} progress documents.`,
        details
      };
    } catch (error: any) {
      console.error('❌ FamilyService: Migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${error.message}`,
        details
      };
    }
  }
}