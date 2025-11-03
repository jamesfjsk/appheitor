// ========================================
// 🔥 SCHEMA FIRESTORE ALINHADO - FLASH MISSIONS
// ========================================

export interface User {
  userId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'child';
  managedChildId?: string; // Apenas para admin
  createdAt: Date;
  updatedAt: Date;
  lastLoginTimestamp: Date;
}

export interface UserProgress {
  userId: string;
  level: number;
  totalXP: number;
  availableGold: number;
  totalGoldEarned: number;
  totalGoldSpent: number;
  streak: number;
  longestStreak: number;
  rewardsRedeemed: number;
  totalTasksCompleted: number;
  lastActivityDate: Date;
  updatedAt: Date;
  lastDailySummaryProcessedDate?: Date;
}

export interface Task {
  id: string;
  ownerId: string; // Child UID
  title: string;
  description?: string;
  xp: number;
  gold: number;
  period: 'morning' | 'afternoon' | 'evening';
  time?: string;
  frequency: 'daily' | 'weekday' | 'weekend';
  active: boolean;
  status: 'pending' | 'done';
  lastCompletedDate?: string; // YYYY-MM-DD format
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Admin UID
}

export interface Reward {
  id: string;
  ownerId: string; // Child UID
  title: string;
  description: string;
  category: 'toy' | 'activity' | 'treat' | 'privilege' | 'custom';
  costGold: number;
  emoji: string;
  active: boolean;
  requiredLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RewardRedemption {
  id: string;
  userId: string; // Child UID
  rewardId: string;
  costGold: number;
  status: 'pending' | 'approved' | 'rejected' | 'delivered';
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string; // Admin UID
}

export interface Notification {
  id: string;
  toUserId: string; // Child UID
  title: string;
  message: string;
  type: 'reminder' | 'achievement' | 'reward' | 'general';
  sentAt: Date;
  read: boolean;
  readAt?: Date;
}

export interface SurpriseMissionConfig {
  id: string;
  isEnabled: boolean;
  theme: 'english' | 'math' | 'general' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  goldReward: number;
  questionsCount: number; // Always 30 for now
  lastUpdatedBy: string; // Admin UID
  createdAt: Date;
  updatedAt: Date;
}

export interface DailySurpriseMissionStatus {
  id: string;
  userId: string; // Child UID
  date: string; // YYYY-MM-DD format
  completed: boolean;
  score: number; // Number of correct answers
  totalQuestions: number; // Should be 30
  xpEarned: number;
  goldEarned: number;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurpriseMissionQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface BirthdayEvent {
  id: string;
  userId: string; // Child UID
  birthdayDate: string; // MM-DD format (month-day)
  year: number; // Year of this specific birthday
  age: number; // Age reached
  specialRewards: string[]; // Array of reward IDs given as birthday gifts
  celebrationCompleted: boolean;
  celebrationCompletedAt?: Date;
  specialMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BirthdayConfig {
  id: string;
  userId: string; // Child UID
  birthdayDate: string; // MM-DD format (12-18 for December 18th)
  birthdayYear: number; // Birth year
  isEnabled: boolean;
  specialXPBonus: number; // Extra XP on birthday
  specialGoldBonus: number; // Extra Gold on birthday
  createdAt: Date;
  updatedAt: Date;
}

// Tipos auxiliares
export interface CalendarDay {
  date: Date;
  tasksCompleted: number;
  totalTasks: number;
  pointsEarned: number;
  status: 'completed' | 'partial' | 'missed' | 'future';
  tasks: Task[];
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
}

export interface LevelSystem {
  currentLevel: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpNeededForNext: number;
  progressPercentage: number;
  levelTitle: string;
  nextLevelTitle: string;
  isMaxLevel: boolean;
}

export interface FlashReminder {
  id: string;
  ownerId: string; // Child UID
  title: string;
  message: string;
  icon: string;
  color: 'red' | 'yellow' | 'blue' | 'green' | 'purple' | 'orange';
  priority: 'low' | 'medium' | 'high';
  active: boolean;
  showOnDashboard: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Admin UID
}

export interface Achievement {
  id: string;
  ownerId: string; // Child UID
  title: string;
  description: string;
  icon: string; // emoji ou ícone
  type: 'xp' | 'level' | 'tasks' | 'checkin' | 'streak' | 'redemptions' | 'custom';
  target: number; // valor alvo (ex: 1000 para 1000 XP)
  xpReward: number;
  goldReward: number;
  isActive: boolean;
  createdBy: string; // admin que criou
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAchievement {
  id: string;
  userId: string; // Child UID
  achievementId: string;
  progress: number; // progresso atual
  isCompleted: boolean;
  rewardClaimed: boolean;
  claimedAt?: Date;
  unlockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  ownerId: string; // Admin UID
  title: string;
  content: string;
  category?: 'general' | 'tasks' | 'rewards' | 'progress' | 'important';
  color?: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoldTransaction {
  id: string;
  userId: string; // Child UID
  amount: number; // Positive for gain, negative for spend
  type: 'earned' | 'spent' | 'bonus' | 'penalty' | 'refund' | 'adjustment';
  source: 'task_completion' | 'reward_redemption' | 'daily_bonus' | 'daily_penalty' | 'admin_adjustment' | 'birthday' | 'quiz' | 'surprise_mission' | 'achievement' | 'redemption_refund';
  description: string; // Human-readable description
  relatedId?: string; // Task ID, Reward ID, Achievement ID, etc.
  relatedTitle?: string; // Title of related item for quick reference
  metadata?: Record<string, any>; // Additional context
  balanceBefore: number; // Gold balance before transaction
  balanceAfter: number; // Gold balance after transaction
  createdAt: Date;
  createdBy?: string; // Admin UID for manual adjustments
}

export interface PunishmentMode {
  id: string;
  userId: string; // Child UID
  isActive: boolean;
  startDate: Date;
  endDate: Date; // 7 days from startDate
  tasksCompleted: number;
  tasksRequired: number; // Always 30
  activatedBy: string; // Admin UID
  reason: string;
  lastTaskCompletedAt?: Date;
  deactivatedAt?: Date;
  deactivatedReason?: 'time_completed' | 'tasks_completed' | 'admin_override';
  createdAt: Date;
  updatedAt: Date;
}

export interface PunishmentTaskCompletion {
  id: string;
  punishmentId: string;
  userId: string; // Child UID
  completedAt: Date;
  taskNumber: number; // 1-30
}