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

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  unlockedAt?: Date;
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
  type: 'xp' | 'level' | 'tasks' | 'checkin' | 'streak' | 'custom';
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
  unlockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}