import { useState } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  writeBatch, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types';

export interface CollectionIssue {
  docId: string;
  issue: 'missing_ownerId' | 'missing_userId' | 'missing_toUserId' | 'invalid_type' | 'orphaned' | 'mismatch';
  details: string;
  currentUserId?: string;
  currentOwnerId?: any;
  currentToUserId?: any;
}

export interface CollectionStats {
  total: number;
  valid: number;
  missingOwnerId: number;
  missingUserId: number;
  missingToUserId: number;
  invalidType: number;
  orphaned: number;
  mismatch: number;
  issues: CollectionIssue[];
}

export interface ScanResult {
  collectionName: string;
  stats: CollectionStats;
  scannedAt: Date;
  duration: number;
}

export interface FixResult {
  collectionName: string;
  strategy: 'use_userId' | 'assign_to_child';
  targetChildId?: string;
  totalFixed: number;
  batchesExecuted: number;
  duration: number;
  errors: string[];
}

export const useDataDoctor = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [scanResults, setScanResults] = useState<Record<string, ScanResult>>({});
  const [availableChildren, setAvailableChildren] = useState<User[]>([]);

  // ========================================
  // 🔍 SCAN OPERATIONS
  // ========================================

  const loadAvailableChildren = async (): Promise<User[]> => {
    try {
      console.log('🔍 DataDoctor: Loading available children...');
      
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'child')
      );
      
      const snapshot = await getDocs(usersQuery);
      const children = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: doc.id,
          displayName: data.displayName || 'Usuário',
          email: data.email || '',
          role: data.role,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastLoginTimestamp: data.lastLoginTimestamp?.toDate() || new Date()
        } as User;
      });
      
      setAvailableChildren(children);
      console.log('✅ DataDoctor: Found children:', children.length);
      return children;
    } catch (error: any) {
      console.error('❌ DataDoctor: Error loading children:', error);
      throw error;
    }
  };

  const scanCollection = async (collectionName: 'tasks' | 'rewards' | 'progress' | 'redemptions' | 'notifications'): Promise<ScanResult> => {
    const startTime = Date.now();
    console.log(`🔍 DataDoctor: Starting scan of ${collectionName}...`);
    
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const docs = snapshot.docs;
      
      console.log(`📊 DataDoctor: Found ${docs.length} documents in ${collectionName}`);
      
      const stats: CollectionStats = {
        total: docs.length,
        valid: 0,
        missingOwnerId: 0,
        missingUserId: 0,
        missingToUserId: 0,
        invalidType: 0,
        orphaned: 0,
        mismatch: 0,
        issues: []
      };

      // Get all user IDs for validation
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const validUserIds = new Set(usersSnapshot.docs.map(doc => doc.id));
      
      for (const docSnapshot of docs) {
        const data = docSnapshot.data();
        const docId = docSnapshot.id;
        
        // Determine which fields to check based on collection
        const fieldsToCheck = getFieldsToCheck(collectionName);
        let hasIssue = false;
        
        for (const field of fieldsToCheck) {
          const fieldValue = data[field];
          
          // Check 1: Missing field
          if (!fieldValue) {
            stats[`missing${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof CollectionStats]++;
            stats.issues.push({
              docId,
              issue: `missing_${field}` as CollectionIssue['issue'],
              details: `Document missing ${field} field`,
              currentUserId: data.userId,
              currentOwnerId: data.ownerId,
              currentToUserId: data.toUserId
            });
            hasIssue = true;
            break;
          }
          
          // Check 2: Invalid type
          if (typeof fieldValue !== 'string') {
            stats.invalidType++;
            stats.issues.push({
              docId,
              issue: 'invalid_type',
              details: `${field} is ${typeof fieldValue}, expected string`,
              currentUserId: data.userId,
              currentOwnerId: data.ownerId,
              currentToUserId: data.toUserId
            });
            hasIssue = true;
            break;
          }
          
          // Check 3: Orphaned (user doesn't exist)
          if (!validUserIds.has(fieldValue)) {
            stats.orphaned++;
            stats.issues.push({
              docId,
              issue: 'orphaned',
              details: `${field} "${fieldValue}" does not exist in users collection`,
              currentUserId: data.userId,
              currentOwnerId: data.ownerId,
              currentToUserId: data.toUserId
            });
            hasIssue = true;
            break;
          }
        }
        
        // Check 4: userId vs ownerId mismatch (if both exist)
        if (!hasIssue && data.userId && data.ownerId && data.userId !== data.ownerId) {
          stats.mismatch++;
          stats.issues.push({
            docId,
            issue: 'mismatch',
            details: `userId "${data.userId}" differs from ownerId "${data.ownerId}"`,
            currentUserId: data.userId,
            currentOwnerId: data.ownerId,
            currentToUserId: data.toUserId
          });
          hasIssue = true;
        }
        
        // If no issues, document is valid
        if (!hasIssue) {
          stats.valid++;
        }
      }
      
      const duration = Date.now() - startTime;
      const result: ScanResult = {
        collectionName,
        stats,
        scannedAt: new Date(),
        duration
      };
      
      console.log(`✅ DataDoctor: Scan completed for ${collectionName}:`, {
        total: stats.total,
        valid: stats.valid,
        issues: stats.issues.length,
        duration: `${duration}ms`
      });
      
      return result;
    } catch (error: any) {
      console.error(`❌ DataDoctor: Error scanning ${collectionName}:`, error);
      throw error;
    }
  };

  const getFieldsToCheck = (collectionName: string): string[] => {
    switch (collectionName) {
      case 'tasks':
      case 'rewards':
        return ['ownerId'];
      case 'progress':
        return ['userId'];
      case 'redemptions':
        return ['userId'];
      case 'notifications':
        return ['toUserId'];
      default:
        return ['ownerId'];
    }
  };

  const scanAllCollections = async (): Promise<void> => {
    setIsScanning(true);
    
    try {
      await loadAvailableChildren();
      
      const collections: ('tasks' | 'rewards' | 'progress' | 'redemptions' | 'notifications')[] = 
        ['tasks', 'rewards', 'progress', 'redemptions', 'notifications'];
      const results: Record<string, ScanResult> = {};
      
      for (const collectionName of collections) {
        const result = await scanCollection(collectionName);
        results[collectionName] = result;
      }
      
      setScanResults(results);
      console.log('🎯 DataDoctor: All scans completed:', results);
    } catch (error: any) {
      console.error('❌ DataDoctor: Error during scan:', error);
      throw error;
    } finally {
      setIsScanning(false);
    }
  };

  // ========================================
  // 🔧 FIX OPERATIONS
  // ========================================

  const fixDocuments = async (
    collectionName: 'tasks' | 'rewards' | 'progress' | 'redemptions' | 'notifications',
    strategy: 'use_userId' | 'assign_to_child',
    targetChildId?: string,
    selectedIssueIds?: string[]
  ): Promise<FixResult> => {
    const startTime = Date.now();
    console.log(`🔧 DataDoctor: Starting fix for ${collectionName} with strategy ${strategy}...`);
    
    if (strategy === 'assign_to_child' && !targetChildId) {
      throw new Error('Target child ID required for assign_to_child strategy');
    }
    
    setIsFixing(true);
    
    try {
      const scanResult = scanResults[collectionName];
      if (!scanResult) {
        throw new Error(`No scan result found for ${collectionName}. Run scan first.`);
      }
      
      // Filter issues to fix
      const issuesToFix = selectedIssueIds 
        ? scanResult.stats.issues.filter(issue => selectedIssueIds.includes(issue.docId))
        : scanResult.stats.issues;
      
      console.log(`🔧 DataDoctor: Fixing ${issuesToFix.length} issues in ${collectionName}`);
      
      const BATCH_SIZE = 400;
      const batches: string[][] = [];
      
      // Group issues into batches
      for (let i = 0; i < issuesToFix.length; i += BATCH_SIZE) {
        batches.push(issuesToFix.slice(i, i + BATCH_SIZE).map(issue => issue.docId));
      }
      
      let totalFixed = 0;
      const errors: string[] = [];
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = writeBatch(db);
        const docIds = batches[batchIndex];
        let batchOperations = 0;
        
        console.log(`🔧 DataDoctor: Processing batch ${batchIndex + 1}/${batches.length} (${docIds.length} docs)`);
        
        for (const docId of docIds) {
          try {
            const docRef = doc(db, collectionName, docId);
            const docSnapshot = await getDoc(docRef);
            
            if (!docSnapshot.exists()) {
              errors.push(`Document ${docId} no longer exists`);
              continue;
            }
            
            const data = docSnapshot.data();
            const fieldsToCheck = getFieldsToCheck(collectionName);
            
            let newValue: string;
            
            if (strategy === 'use_userId' && data.userId && typeof data.userId === 'string') {
              newValue = data.userId;
            } else if (strategy === 'assign_to_child' && targetChildId) {
              newValue = targetChildId;
            } else {
              errors.push(`Cannot determine value for document ${docId}`);
              continue;
            }
            
            // Prepare updates for all required fields
            const updates: any = {
              updatedAt: serverTimestamp(),
              fixedAt: serverTimestamp(),
              fixedBy: 'data-doctor',
              fixedStrategy: strategy
            };
            
            // Set the appropriate field(s)
            for (const field of fieldsToCheck) {
              updates[field] = newValue;
            }
            
            batch.update(docRef, updates);
            batchOperations++;
            totalFixed++;
            
          } catch (error: any) {
            errors.push(`Error processing ${docId}: ${error.message}`);
          }
        }
        
        // Commit batch
        if (batchOperations > 0) {
          await batch.commit();
          console.log(`✅ DataDoctor: Batch ${batchIndex + 1} committed with ${batchOperations} updates`);
        }
      }
      
      const duration = Date.now() - startTime;
      const result: FixResult = {
        collectionName,
        strategy,
        targetChildId,
        totalFixed,
        batchesExecuted: batches.length,
        duration,
        errors
      };
      
      console.log(`🎯 DataDoctor: Fix completed for ${collectionName}:`, result);
      
      // Re-scan to verify fixes
      const newScanResult = await scanCollection(collectionName);
      setScanResults(prev => ({
        ...prev,
        [collectionName]: newScanResult
      }));
      
      return result;
    } catch (error: any) {
      console.error(`❌ DataDoctor: Error fixing ${collectionName}:`, error);
      throw error;
    } finally {
      setIsFixing(false);
    }
  };

  // ========================================
  // 📊 EXPORT OPERATIONS
  // ========================================

  const exportIssuesCSV = (collectionName: string): string => {
    const scanResult = scanResults[collectionName];
    if (!scanResult) return '';
    
    const headers = ['Document ID', 'Issue Type', 'Details', 'Current userId', 'Current ownerId', 'Current toUserId'];
    const rows = scanResult.stats.issues.map(issue => [
      issue.docId,
      issue.issue,
      issue.details,
      issue.currentUserId || '',
      issue.currentOwnerId || '',
      issue.currentToUserId || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csvContent;
  };

  const downloadCSV = (collectionName: string) => {
    const csvContent = exportIssuesCSV(collectionName);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${collectionName}_issues_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ========================================
  // 📋 FINAL REPORT
  // ========================================

  const generateFinalReport = (): {
    allValid: boolean;
    summary: Record<string, { total: number; valid: number; issues: number }>;
    recommendations: string[];
  } => {
    const summary: Record<string, { total: number; valid: number; issues: number }> = {};
    const recommendations: string[] = [];
    let allValid = true;
    
    Object.entries(scanResults).forEach(([collectionName, result]) => {
      const stats = result.stats;
      summary[collectionName] = {
        total: stats.total,
        valid: stats.valid,
        issues: stats.issues.length
      };
      
      if (stats.issues.length > 0) {
        allValid = false;
        recommendations.push(`Fix ${stats.issues.length} issues in ${collectionName} collection`);
      }
    });
    
    if (allValid) {
      recommendations.push('✅ All collections are healthy! No action needed.');
    }
    
    return {
      allValid,
      summary,
      recommendations
    };
  };

  return {
    // State
    isScanning,
    isFixing,
    scanResults,
    availableChildren,
    
    // Operations
    loadAvailableChildren,
    scanCollection,
    scanAllCollections,
    fixDocuments,
    exportIssuesCSV,
    downloadCSV,
    generateFinalReport
  };
};