import React, { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Achievement } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';
import { FirestoreService } from '../../services/firestoreService';
import { calculateLevelSystem } from '../../utils/levelSystem';

const TROPHY = '/assets/english/ui/trophy.webp';
const PIXEL_KEYS = new Set([
  'star', 'trophy', 'gold', 'clock', 'sun', 'sunset', 'moon', 'book', 'cake',
  'diamond', 'emerald', 'map', 'torch', 'chest', 'sword', 'apple', 'bed',
]);

type AchievementWithProgress = Achievement & {
  currentProgress: number;
  progressPercentage: number;
  isCompleted: boolean;
  isReadyToUnlock: boolean;
  unlockedAt?: Date;
  userAchievementId?: string;
  rewardClaimed: boolean;
};

function achievementPixelSrc(achievement: Achievement): string {
  const raw = (achievement.icon || '').toLowerCase().replace(/^i_/, '');
  const byType: Record<Achievement['type'], string> = {
    xp: 'star',
    level: 'diamond',
    tasks: 'map',
    streak: 'torch',
    checkin: 'clock',
    redemptions: 'chest',
    custom: 'emerald',
  };
  const name = PIXEL_KEYS.has(raw) ? raw : (byType[achievement.type] || 'emerald');
  if (name === 'cake') return '/assets/english/ui/base/i_cake.webp';
  return `/assets/english/ui/${name}.webp`;
}

const AchievementsBadges: React.FC = () => {
  const { achievements, userAchievements, progress, claimAchievementReward } = useData();
  const { childUid } = useAuth();
  const { playClick } = useSound();
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementWithProgress | null>(null);

  const levelSystem = calculateLevelSystem(progress.totalXP || 0);

  // Combine achievements with user progress
  const achievementsWithProgress = achievements.map(achievement => {
    const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
    
    // Calculate current progress if no user achievement exists yet
    let currentProgress = userAchievement?.progress || 0;
    if (!userAchievement) {
      switch (achievement.type) {
        case 'xp':
          currentProgress = progress.totalXP || 0;
          break;
        case 'level':
          currentProgress = levelSystem.currentLevel;
          break;
        case 'tasks':
          currentProgress = progress.totalTasksCompleted || 0;
          break;
        case 'streak':
          currentProgress = Math.max(progress.streak || 0, progress.longestStreak || 0);
          break;
        case 'checkin':
          currentProgress = progress.streak || 0;
          break;
        case 'redemptions':
          currentProgress = progress.rewardsRedeemed || 0;
          break;
        default:
          currentProgress = 0;
      }
    } else {
      // Even if userAchievement exists, recalculate current progress for real-time updates
      switch (achievement.type) {
        case 'xp':
          currentProgress = Math.max(userAchievement.progress, progress.totalXP || 0);
          break;
        case 'level':
          currentProgress = Math.max(userAchievement.progress, levelSystem.currentLevel);
          break;
        case 'tasks':
          currentProgress = Math.max(userAchievement.progress, progress.totalTasksCompleted || 0);
          break;
        case 'streak':
          currentProgress = Math.max(userAchievement.progress, Math.max(progress.streak || 0, progress.longestStreak || 0));
          break;
        case 'checkin':
          currentProgress = Math.max(userAchievement.progress, progress.streak || 0);
          break;
        case 'redemptions':
          currentProgress = Math.max(userAchievement.progress, progress.rewardsRedeemed || 0);
          break;
        default:
          currentProgress = userAchievement.progress;
      }
    }
    
    const progressPercentage = Math.min(100, (currentProgress / achievement.target) * 100);
    const isCompleted = userAchievement?.isCompleted || false;
    const isReadyToUnlock = !isCompleted && currentProgress >= achievement.target && achievement.isActive;
    
    return {
      ...achievement,
      currentProgress,
      progressPercentage,
      isCompleted,
      isReadyToUnlock,
      unlockedAt: userAchievement?.unlockedAt,
      userAchievementId: userAchievement?.id,
      rewardClaimed: userAchievement?.rewardClaimed || false
    };
  }).sort((a, b) => {
    // Sort: ready to unlock first, then completed, then by progress percentage desc
    if (a.isReadyToUnlock !== b.isReadyToUnlock) {
      return a.isReadyToUnlock ? -1 : 1;
    }
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? -1 : 1;
    }
    if (a.progressPercentage !== b.progressPercentage) {
      return b.progressPercentage - a.progressPercentage;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const completedCount = achievementsWithProgress.filter(a => a.isCompleted).length;
  const readyToUnlockCount = achievementsWithProgress.filter(a => a.isReadyToUnlock).length;
  const totalCount = achievementsWithProgress.length;

  const getTypeLabel = (type: Achievement['type']) => {
    switch (type) {
      case 'xp': return 'XP';
      case 'level': return 'Nível';
      case 'tasks': return 'Tarefas';
      case 'streak': return 'Sequência';
      case 'checkin': return 'Check-in';
      case 'redemptions': return 'Trocas';
      case 'custom': return 'Especial';
      default: return type;
    }
  };

  return (
    <div className="mc-panel rounded-lg p-4 text-white mc-pop">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="mc-h">
          <img src={TROPHY} alt="" className="mc-pixel" draggable={false} />
          Conquistas
        </h3>
        <div className="flex items-center gap-2">
          {readyToUnlockCount > 0 && (
            <span className="mc-font text-[8px] mc-good">
              {readyToUnlockCount} {readyToUnlockCount === 1 ? 'pronta' : 'prontas'}
            </span>
          )}
          <span className="mc-lbl">{completedCount} de {totalCount} desbloqueadas</span>
        </div>
      </div>

      {achievementsWithProgress.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {achievementsWithProgress.map((achievement) => {
            const selected = selectedAchievement?.id === achievement.id;
            const lockedLook = !achievement.isCompleted && !achievement.isReadyToUnlock;
            return (
              <button
                key={achievement.id}
                type="button"
                title={achievement.title}
                onClick={() => {
                  playClick();
                  setSelectedAchievement(achievement);
                }}
                className={`mc-slot aspect-square flex flex-col items-center justify-center p-1.5 ${
                  achievement.isCompleted ? 'mc-slot-good' : ''
                } ${selected ? 'mc-slot-selected' : ''}`}
                style={achievement.isReadyToUnlock ? { borderColor: '#e8b923' } : undefined}
              >
                <img
                  src={achievementPixelSrc(achievement)}
                  alt=""
                  className="w-9 h-9 mc-pixel"
                  draggable={false}
                  style={lockedLook ? { filter: 'grayscale(1) brightness(.9)', opacity: 0.5 } : undefined}
                />
                {lockedLook && achievement.progressPercentage > 0 && achievement.progressPercentage < 100 && (
                  <div className="mc-bar w-full mt-1" style={{ height: 6 }}>
                    <div className="mc-bar-fill" style={{ width: `${achievement.progressPercentage}%` }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <img
            src={TROPHY}
            alt=""
            className="w-14 h-14 mx-auto mb-2 mc-pixel"
            draggable={false}
            style={{ filter: 'grayscale(1) brightness(.9)', opacity: 0.5 }}
          />
          <p className="text-sm text-white/85">Nenhuma conquista criada ainda</p>
          <p className="text-xs mc-muted mt-1">Peça para o papai criar algumas</p>
        </div>
      )}

      {selectedAchievement && (
        <div className="mc-card p-3 mt-3 mc-pop">
          <div className="flex items-start gap-3">
            <div className="mc-slot w-12 h-12 p-1 shrink-0">
              <img
                src={achievementPixelSrc(selectedAchievement)}
                alt=""
                className="w-full h-full object-contain mc-pixel"
                draggable={false}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-bold leading-tight">{selectedAchievement.title}</p>
              <p className="text-xs font-semibold mc-muted mt-1">{getTypeLabel(selectedAchievement.type)}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAchievement(null)}
              className="mc-btn mc-btn-dark w-[44px] h-[44px] p-0"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[13px] sm:text-sm text-white/85 mt-2">{selectedAchievement.description}</p>
          <div className="flex items-center gap-2 mt-3">
            <div className="mc-bar flex-1">
              <div
                className={`mc-bar-fill ${selectedAchievement.isCompleted ? 'is-gold' : ''}`}
                style={{ width: `${selectedAchievement.progressPercentage}%` }}
              />
            </div>
            <span className="mc-num">{selectedAchievement.currentProgress} / {selectedAchievement.target}</span>
          </div>
          <div className="flex gap-3 mt-2">
            <span className="mc-font text-[9px] mc-good">+{selectedAchievement.xpReward} XP</span>
            <span className="mc-font text-[9px] mc-warn">+{selectedAchievement.goldReward} GOLD</span>
          </div>

          <div className="mt-3">
            {selectedAchievement.isCompleted ? (
              selectedAchievement.rewardClaimed ? (
                <div>
                  <p className="mc-good font-bold">Recompensa resgatada</p>
                  {selectedAchievement.unlockedAt && (
                    <p className="text-sm mc-muted mt-1">
                      {selectedAchievement.unlockedAt.toLocaleDateString('pt-BR')} às {selectedAchievement.unlockedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-bold text-white mb-2">Conquista desbloqueada</p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (selectedAchievement.userAchievementId) {
                          await claimAchievementReward(selectedAchievement.userAchievementId);
                        } else {
                          const newUserAchievementId = await FirestoreService.createUserAchievement({
                            userId: childUid!,
                            achievementId: selectedAchievement.id,
                            progress: selectedAchievement.currentProgress,
                            isCompleted: true,
                            rewardClaimed: false,
                            unlockedAt: new Date()
                          });
                          await claimAchievementReward(newUserAchievementId);
                        }
                        setSelectedAchievement(null);
                      } catch (error) {
                        console.error('🏆 Error claiming achievement reward:', error);
                      }
                    }}
                    className="mc-btn mc-btn-gold w-full py-2.5 font-bold"
                  >
                    Resgatar recompensa
                  </button>
                </div>
              )
            ) : selectedAchievement.isReadyToUnlock ? (
              <div>
                <p className="text-white/85 mb-2">Meta de {selectedAchievement.target} atingida</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (selectedAchievement.userAchievementId) {
                        await FirestoreService.updateUserAchievement(selectedAchievement.userAchievementId, {
                          progress: selectedAchievement.currentProgress,
                          isCompleted: true,
                          unlockedAt: new Date(),
                          updatedAt: new Date()
                        });
                      } else {
                        await FirestoreService.createUserAchievement({
                          userId: childUid!,
                          achievementId: selectedAchievement.id,
                          progress: selectedAchievement.currentProgress,
                          isCompleted: true,
                          rewardClaimed: false,
                          unlockedAt: new Date()
                        });
                      }
                      setSelectedAchievement(null);
                      toast.success(`Conquista desbloqueada: ${selectedAchievement.title}`);
                    } catch (error) {
                      console.error('🏆 Error unlocking achievement:', error);
                      toast.error('Erro ao desbloquear conquista');
                    }
                  }}
                  className="mc-btn mc-btn-green w-full py-2.5 font-bold"
                >
                  Desbloquear
                </button>
              </div>
            ) : selectedAchievement.progressPercentage > 0 ? (
              <p className="text-white/85">Faltam {selectedAchievement.target - selectedAchievement.currentProgress} para completar</p>
            ) : (
              <p className="mc-muted">Ainda bloqueada</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementsBadges;
