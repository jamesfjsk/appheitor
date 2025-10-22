import { collection, getDocs, query, where, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { GoldTransaction } from '../types';

export class GoldHistoryMigration {
  static async migrateExistingData(userId: string): Promise<{
    success: boolean;
    transactionsCreated: number;
    errors: string[];
  }> {
    console.log('🔄 Starting gold history migration for user:', userId);

    const errors: string[] = [];
    let transactionsCreated = 0;

    try {
      const progressRef = doc(db, 'progress', userId);
      const progressDoc = await getDoc(progressRef);

      if (!progressDoc.exists()) {
        return {
          success: false,
          transactionsCreated: 0,
          errors: ['User progress not found']
        };
      }

      const currentGold = progressDoc.data().availableGold || 0;
      let runningBalance = 0;

      // 1. Migrate task completions
      console.log('📋 Migrating task completions...');
      const completionsQuery = query(
        collection(db, 'taskCompletions'),
        where('userId', '==', userId)
      );

      const completionsSnapshot = await getDocs(completionsQuery);
      const completionsByDate: Record<string, any[]> = {};

      completionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.date || data.completedAt?.toDate().toISOString().split('T')[0];
        if (!completionsByDate[date]) {
          completionsByDate[date] = [];
        }
        completionsByDate[date].push({
          id: doc.id,
          ...data,
          completedAt: data.completedAt?.toDate() || new Date(date)
        });
      });

      // Sort dates chronologically
      const sortedDates = Object.keys(completionsByDate).sort();

      for (const date of sortedDates) {
        const completions = completionsByDate[date].sort((a, b) =>
          a.completedAt.getTime() - b.completedAt.getTime()
        );

        for (const completion of completions) {
          const goldEarned = completion.goldEarned || 0;

          if (goldEarned > 0) {
            const transactionId = `migration_task_${completion.id}`;
            const transactionRef = doc(db, 'goldTransactions', transactionId);

            // Check if already migrated
            const existingDoc = await getDoc(transactionRef);
            if (existingDoc.exists()) {
              console.log(`⏭️ Skipping task completion ${completion.id} - already migrated`);
              runningBalance += goldEarned;
              continue;
            }

            const balanceBefore = runningBalance;
            runningBalance += goldEarned;

            await setDoc(transactionRef, {
              userId,
              amount: goldEarned,
              type: 'earned',
              source: 'task_completion',
              description: `Tarefa concluída: ${completion.taskTitle || 'Tarefa'}`,
              relatedId: completion.taskId,
              relatedTitle: completion.taskTitle,
              metadata: {
                xpEarned: completion.xpEarned || 0,
                migrated: true,
                originalDate: date
              },
              balanceBefore,
              balanceAfter: runningBalance,
              createdAt: completion.completedAt || new Date(date)
            });

            transactionsCreated++;
            console.log(`✅ Migrated task completion: ${completion.taskTitle} (+${goldEarned})`);
          }
        }
      }

      // 2. Migrate redemptions (spent gold)
      console.log('🎁 Migrating redemptions...');
      const redemptionsQuery = query(
        collection(db, 'redemptions'),
        where('userId', '==', userId)
      );

      const redemptionsSnapshot = await getDocs(redemptionsQuery);
      const redemptions = redemptionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      for (const redemption of redemptions) {
        const costGold = redemption.costGold || 0;

        // Migrate spent transaction
        const spentTransactionId = `migration_redemption_${redemption.id}`;
        const spentTransactionRef = doc(db, 'goldTransactions', spentTransactionId);

        const existingSpent = await getDoc(spentTransactionRef);
        if (!existingSpent.exists() && costGold > 0) {
          // Get reward details
          const rewardRef = doc(db, 'rewards', redemption.rewardId);
          const rewardDoc = await getDoc(rewardRef);
          const rewardTitle = rewardDoc.exists() ? rewardDoc.data().title : 'Recompensa';

          const balanceBefore = runningBalance;
          runningBalance -= costGold;

          await setDoc(spentTransactionRef, {
            userId,
            amount: -costGold,
            type: 'spent',
            source: 'reward_redemption',
            description: `Resgate de recompensa: ${rewardTitle}`,
            relatedId: redemption.rewardId,
            relatedTitle: rewardTitle,
            metadata: {
              redemptionId: redemption.id,
              status: redemption.status,
              migrated: true
            },
            balanceBefore,
            balanceAfter: runningBalance,
            createdAt: redemption.createdAt
          });

          transactionsCreated++;
          console.log(`✅ Migrated redemption: ${rewardTitle} (-${costGold})`);
        }

        // Migrate refund if rejected
        if (redemption.status === 'rejected') {
          const refundTransactionId = `migration_refund_${redemption.id}`;
          const refundTransactionRef = doc(db, 'goldTransactions', refundTransactionId);

          const existingRefund = await getDoc(refundTransactionRef);
          if (!existingRefund.exists() && costGold > 0) {
            const rewardRef = doc(db, 'rewards', redemption.rewardId);
            const rewardDoc = await getDoc(rewardRef);
            const rewardTitle = rewardDoc.exists() ? rewardDoc.data().title : 'Recompensa';

            const balanceBefore = runningBalance;
            runningBalance += costGold;

            await setDoc(refundTransactionRef, {
              userId,
              amount: costGold,
              type: 'refund',
              source: 'redemption_refund',
              description: `Reembolso de resgate rejeitado: ${rewardTitle}`,
              relatedId: redemption.rewardId,
              relatedTitle: rewardTitle,
              metadata: {
                redemptionId: redemption.id,
                rejectedBy: redemption.approvedBy,
                migrated: true
              },
              balanceBefore,
              balanceAfter: runningBalance,
              createdAt: redemption.updatedAt?.toDate() || redemption.createdAt
            });

            transactionsCreated++;
            console.log(`✅ Migrated refund: ${rewardTitle} (+${costGold})`);
          }
        }
      }

      // 3. Migrate daily progress (bonuses and penalties)
      console.log('📊 Migrating daily progress...');
      const progressQuery = query(
        collection(db, 'dailyProgress'),
        where('userId', '==', userId)
      );

      const progressSnapshot = await getDocs(progressQuery);
      const dailyProgress = progressSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date,
        createdAt: doc.data().createdAt?.toDate() || new Date(doc.data().date)
      })).sort((a, b) => a.date.localeCompare(b.date));

      for (const progress of dailyProgress) {
        // Migrate penalty
        if (progress.goldPenalty > 0) {
          const penaltyTransactionId = `migration_penalty_${progress.id}`;
          const penaltyTransactionRef = doc(db, 'goldTransactions', penaltyTransactionId);

          const existingPenalty = await getDoc(penaltyTransactionRef);
          if (!existingPenalty.exists()) {
            const incompleteTasks = progress.totalTasksAvailable - progress.tasksCompleted;
            const balanceBefore = runningBalance;
            runningBalance = Math.max(0, runningBalance - progress.goldPenalty);

            await setDoc(penaltyTransactionRef, {
              userId,
              amount: -progress.goldPenalty,
              type: 'penalty',
              source: 'daily_penalty',
              description: `Penalidade diária: ${incompleteTasks} tarefas não concluídas`,
              metadata: {
                date: progress.date,
                tasksCompleted: progress.tasksCompleted,
                totalTasksAvailable: progress.totalTasksAvailable,
                incompleteTasks,
                migrated: true
              },
              balanceBefore,
              balanceAfter: runningBalance,
              createdAt: progress.createdAt
            });

            transactionsCreated++;
            console.log(`✅ Migrated penalty for ${progress.date}: -${progress.goldPenalty}`);
          }
        }

        // Migrate bonus
        if (progress.allTasksBonusGold > 0) {
          const bonusTransactionId = `migration_bonus_${progress.id}`;
          const bonusTransactionRef = doc(db, 'goldTransactions', bonusTransactionId);

          const existingBonus = await getDoc(bonusTransactionRef);
          if (!existingBonus.exists()) {
            const balanceBefore = runningBalance;
            runningBalance += progress.allTasksBonusGold;

            await setDoc(bonusTransactionRef, {
              userId,
              amount: progress.allTasksBonusGold,
              type: 'bonus',
              source: 'daily_bonus',
              description: 'Bônus diário: Todas as tarefas concluídas!',
              metadata: {
                date: progress.date,
                tasksCompleted: progress.tasksCompleted,
                totalTasksAvailable: progress.totalTasksAvailable,
                migrated: true
              },
              balanceBefore,
              balanceAfter: runningBalance,
              createdAt: progress.createdAt
            });

            transactionsCreated++;
            console.log(`✅ Migrated bonus for ${progress.date}: +${progress.allTasksBonusGold}`);
          }
        }
      }

      // Final balance check
      console.log('💰 Migration completed!');
      console.log(`   Calculated balance: ${runningBalance}`);
      console.log(`   Current balance: ${currentGold}`);
      console.log(`   Transactions created: ${transactionsCreated}`);

      if (Math.abs(runningBalance - currentGold) > 1) {
        console.warn('⚠️ Balance mismatch detected! You may need to adjust manually.');
        errors.push(`Balance mismatch: calculated ${runningBalance}, actual ${currentGold}`);
      }

      return {
        success: true,
        transactionsCreated,
        errors
      };

    } catch (error) {
      console.error('❌ Migration error:', error);
      return {
        success: false,
        transactionsCreated,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  static async checkMigrationStatus(userId: string): Promise<{
    hasTransactions: boolean;
    transactionCount: number;
    oldestTransaction: Date | null;
    newestTransaction: Date | null;
  }> {
    try {
      const transactionsQuery = query(
        collection(db, 'goldTransactions'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(transactionsQuery);
      const transactions = snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      if (transactions.length === 0) {
        return {
          hasTransactions: false,
          transactionCount: 0,
          oldestTransaction: null,
          newestTransaction: null
        };
      }

      const dates = transactions.map(t => t.createdAt.getTime());

      return {
        hasTransactions: true,
        transactionCount: transactions.length,
        oldestTransaction: new Date(Math.min(...dates)),
        newestTransaction: new Date(Math.max(...dates))
      };
    } catch (error) {
      console.error('Error checking migration status:', error);
      return {
        hasTransactions: false,
        transactionCount: 0,
        oldestTransaction: null,
        newestTransaction: null
      };
    }
  }
}
