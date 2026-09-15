import { CHILD_BIRTHDAY_MMDD, childAgeInYear } from '../../config/rules';
import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';
import { FirestoreService } from '../../services/firestoreService';

const BANNER = '/assets/english/ui/banner.webp';
const CAKE = '/assets/english/ui/base/i_cake.webp';
const STAR = '/assets/english/ui/star.webp';
const GOLD = '/assets/english/ui/gold.webp';

const FIREWORKS = [
  { left: '8%', top: '12%', color: '#ffd83d', delay: '0ms' },
  { left: '22%', top: '6%', color: '#ff7b6b', delay: '40ms' },
  { left: '38%', top: '14%', color: '#5ee0e6', delay: '80ms' },
  { left: '54%', top: '4%', color: '#9be36a', delay: '120ms' },
  { left: '70%', top: '11%', color: '#c084fc', delay: '160ms' },
  { left: '86%', top: '7%', color: '#f59e0b', delay: '200ms' },
  { left: '12%', top: '78%', color: '#9be36a', delay: '80ms' },
  { left: '30%', top: '86%', color: '#ffd83d', delay: '140ms' },
  { left: '62%', top: '82%', color: '#5ee0e6', delay: '40ms' },
  { left: '84%', top: '74%', color: '#ff7b6b', delay: '180ms' },
];

interface BirthdayCelebrationProps {
  onComplete: () => void;
}

interface BirthdayReward {
  title: string;
  description: string;
  xp: number;
  gold: number;
}

const BirthdayCelebration: React.FC<BirthdayCelebrationProps> = ({ onComplete }) => {
  const { adjustUserXP, adjustUserGold } = useData();
  const { childUid } = useAuth();
  const { playLevelUp, playAchievement } = useSound();
  
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentAge, setCurrentAge] = useState(0);
  const [celebrationStep, setCelebrationStep] = useState(0);
  const [birthdayRewards, setBirthdayRewards] = useState<BirthdayReward[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if today is birthday
  useEffect(() => {
    const checkBirthday = async () => {
      if (!childUid) return;
      
      try {
        const today = new Date();
        const todayString = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Check if today is December 18th (Heitor's birthday)
        if (todayString === CHILD_BIRTHDAY_MMDD) {
          const currentYear = today.getFullYear();
          const age = childAgeInYear(currentYear);
          
          // Check if birthday celebration was already completed this year
          const birthdayCompleted = await FirestoreService.checkBirthdayCompletedThisYear(childUid, currentYear);
          
          if (!birthdayCompleted) {
            setCurrentAge(age);
            setShowCelebration(true);
            
            // Create special birthday rewards
            const specialRewards = [
              {
                title: `Festa de ${age} Anos!`,
                description: `Uma festa incrível para comemorar seus ${age} anos de vida!`,
                xp: age * 10,
                gold: age * 5
              },
              {
                title: 'Presente Especial de Aniversário',
                description: 'Um presente muito especial escolhido especialmente para você!',
                xp: 100,
                gold: 50
              },
              {
                title: 'Dia do Rei Aniversariante',
                description: 'Hoje você é o rei! Escolha tudo que quiser fazer!',
                xp: 50,
                gold: 25
              }
            ];
            
            setBirthdayRewards(specialRewards);
          }
        }
      } catch (error) {
        console.error('❌ Error checking birthday:', error);
      }
    };
    
    checkBirthday();
  }, [childUid]);

  useEffect(() => {
    if (showCelebration) playLevelUp();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- playLevelUp é recriado a cada render do SoundProvider; o som deve tocar uma vez por abertura
  }, [showCelebration]);

  const handleCelebrationStep = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      if (celebrationStep === 0) {
        // Step 1: Birthday wishes
        playAchievement();
        setCelebrationStep(1);
      } else if (celebrationStep === 1) {
        // Step 2: Give special rewards
        let totalGold = 0;
        let totalXP = 0;

        for (const reward of birthdayRewards) {
          await adjustUserXP(reward.xp);
          await adjustUserGold(reward.gold);
          totalGold += reward.gold;
          totalXP += reward.xp;
        }

        // Create gold transaction for birthday rewards
        if (childUid && totalGold > 0) {
          await FirestoreService.createGoldTransaction(
            childUid,
            totalGold,
            'bonus',
            'birthday',
            `Presente de aniversário: ${currentAge} anos!`,
            {
              metadata: {
                age: currentAge,
                xpEarned: totalXP,
                rewards: birthdayRewards
              }
            }
          );
        }

        playLevelUp();
        setCelebrationStep(2);
      } else if (celebrationStep === 2) {
        // Step 3: Mark birthday as completed and close
        if (childUid) {
          const today = new Date();
          await FirestoreService.markBirthdayCompleted(childUid, today.getFullYear(), currentAge);
        }
        
        setTimeout(() => {
          setShowCelebration(false);
          onComplete();
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error in birthday celebration:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepTitle = () => {
    switch (celebrationStep) {
      case 0: return 'Parabéns, minerador!';
      case 1: return 'Presentes especiais';
      case 2: return 'Você é incrível';
      default: return 'Feliz aniversário, Heitor!';
    }
  };

  const buttonLabel = isProcessing
    ? 'Processando...'
    : celebrationStep === 0
      ? 'Começar celebração'
      : celebrationStep === 1
        ? 'Receber presentes'
        : 'Finalizar celebração';

  return (
    <AnimatePresence>
      {showCelebration && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {FIREWORKS.map((dot, i) => (
              <span
                key={i}
                className="absolute w-2.5 h-2.5 mc-pop"
                style={{
                  left: dot.left,
                  top: dot.top,
                  backgroundColor: dot.color,
                  animationDelay: dot.delay,
                  boxShadow: `2px 2px 0 #17130f`,
                }}
              />
            ))}
          </div>

          <div className="mc-panel rounded-lg max-w-lg w-full overflow-hidden relative mc-pop">
            <div className="relative h-[140px] overflow-hidden border-b-4 border-[#17130f]">
              <img src={BANNER} alt="" className="absolute inset-0 w-full h-full object-cover mc-pixel" draggable={false} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2f2a27] via-[#2f2a27]/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
                <h1 className="mc-title text-sm sm:text-base">Feliz aniversário, Heitor!</h1>
              </div>
            </div>

            <div className="p-5 text-center">
              <img src={CAKE} alt="" className="w-24 h-24 mx-auto mb-3 mc-pixel" draggable={false} />
              <p className="mc-num text-[#ffd83d] mb-1" style={{ fontSize: 18 }}>{currentAge} anos</p>
              <p className="text-white font-bold text-lg mb-4">{getStepTitle()}</p>

              {celebrationStep === 0 && (
                <div className="space-y-3 text-left">
                  <p className="text-white/90 text-[17px] leading-relaxed">
                    Hoje é um dia muito especial. Você está completando {currentAge} anos.
                  </p>
                  <p className="text-sm mc-muted">
                    Você cresceu, aprendeu e mostrou responsabilidade nas missões de todo dia.
                  </p>
                </div>
              )}

              {celebrationStep === 1 && (
                <div className="space-y-2 text-left">
                  {birthdayRewards.map((reward) => (
                    <div key={reward.title} className="mc-card rounded p-3">
                      <h4 className="font-bold text-[17px] text-white mb-1">{reward.title}</h4>
                      <p className="text-[13px] mc-muted mb-2">{reward.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="mc-slot flex items-center gap-1.5 px-2 py-1">
                          <img src={STAR} alt="" className="w-5 h-5 mc-pixel" draggable={false} />
                          <span className="mc-font text-[8px] mc-good">+{reward.xp} XP</span>
                        </span>
                        <span className="mc-slot flex items-center gap-1.5 px-2 py-1">
                          <img src={GOLD} alt="" className="w-5 h-5 mc-pixel" draggable={false} />
                          <span className="mc-font text-[8px] mc-warn">+{reward.gold} GOLD</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {celebrationStep === 2 && (
                <div className="space-y-3">
                  <p className="text-white/90 text-[17px] leading-relaxed">
                    Heitor, seus {currentAge} anos mostram o quanto você cresceu e aprendeu.
                  </p>
                  <p className="text-sm mc-muted">
                    Que este novo ano seja cheio de missões, descobertas e muita felicidade.
                  </p>
                  <p className="text-xs mc-muted">
                    Todo ano, no seu aniversário, você recebe uma celebração especial.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleCelebrationStep}
                disabled={isProcessing}
                className={`mt-6 w-full py-3 font-bold mc-btn ${celebrationStep === 2 ? 'mc-btn-green' : 'mc-btn-gold'}`}
              >
                {buttonLabel}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCelebration(false);
                  onComplete();
                }}
                className="mt-3 text-sm mc-muted underline"
              >
                Pular celebração (apenas para teste)
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BirthdayCelebration;
