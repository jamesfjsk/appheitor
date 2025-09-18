import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Star, Cake, PartyPopper, Heart, Crown, Zap, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';
import { FirestoreService } from '../../services/firestoreService';

interface BirthdayCelebrationProps {
  onComplete: () => void;
}

const BirthdayCelebration: React.FC<BirthdayCelebrationProps> = ({ onComplete }) => {
  const { adjustUserXP, adjustUserGold } = useData();
  const { childUid } = useAuth();
  const { playLevelUp, playAchievement } = useSound();
  
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentAge, setCurrentAge] = useState(0);
  const [celebrationStep, setCelebrationStep] = useState(0);
  const [birthdayRewards, setBirthdayRewards] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if today is birthday
  useEffect(() => {
    const checkBirthday = async () => {
      if (!childUid) return;
      
      try {
        const today = new Date();
        const todayString = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Check if today is December 18th (Heitor's birthday)
        if (todayString === '12-18') {
          const currentYear = today.getFullYear();
          const age = currentYear - 2015; // Heitor nasceu em 2015
          
          // Check if birthday celebration was already completed this year
          const birthdayCompleted = await FirestoreService.checkBirthdayCompletedThisYear(childUid, currentYear);
          
          if (!birthdayCompleted) {
            setCurrentAge(age);
            setShowCelebration(true);
            
            // Create special birthday rewards
            const specialRewards = [
              {
                title: `🎂 Festa de ${age} Anos!`,
                description: `Uma festa incrível para comemorar seus ${age} anos de vida!`,
                xp: age * 10,
                gold: age * 5
              },
              {
                title: '🎁 Presente Especial de Aniversário',
                description: 'Um presente muito especial escolhido especialmente para você!',
                xp: 100,
                gold: 50
              },
              {
                title: '👑 Dia do Rei Aniversariante',
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
        for (const reward of birthdayRewards) {
          await adjustUserXP(reward.xp);
          await adjustUserGold(reward.gold);
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

  const getBirthdayMessage = () => {
    const messages = [
      `🎉 FELIZ ANIVERSÁRIO, HEITOR! 🎉`,
      `Hoje você completa ${currentAge} anos de pura velocidade e heroísmo!`,
      `O Flash ficaria orgulhoso de ver como você cresceu!`,
      `Que este novo ano seja cheio de aventuras incríveis!`
    ];
    
    return messages[celebrationStep] || messages[0];
  };

  const getStepTitle = () => {
    switch (celebrationStep) {
      case 0: return '🎂 Parabéns, Herói!';
      case 1: return '🎁 Presentes Especiais!';
      case 2: return '👑 Você é Incrível!';
      default: return '🎉 Feliz Aniversário!';
    }
  };

  return (
    <AnimatePresence>
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gradient-to-br from-purple-600/90 via-pink-500/90 to-red-500/90 flex items-center justify-center z-50 p-4"
        >
          {/* Confetti and celebration effects */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Confetti particles */}
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 1,
                  scale: 0,
                  x: '50%',
                  y: '50%',
                  rotate: 0
                }}
                animate={{ 
                  opacity: [1, 1, 0],
                  scale: [0, 1, 1],
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  rotate: Math.random() * 720
                }}
                transition={{ 
                  duration: 3,
                  delay: i * 0.05,
                  ease: "easeOut",
                  repeat: Infinity,
                  repeatDelay: 2
                }}
                className={`absolute w-3 h-3 ${
                  i % 4 === 0 ? 'bg-yellow-400' :
                  i % 4 === 1 ? 'bg-pink-400' :
                  i % 4 === 2 ? 'bg-blue-400' : 'bg-green-400'
                } rounded-full`}
              />
            ))}
            
            {/* Birthday balloons */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`balloon-${i}`}
                animate={{
                  y: [0, -20, 0],
                  x: [0, Math.sin(i) * 10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.3
                }}
                className="absolute text-4xl"
                style={{
                  left: `${10 + i * 10}%`,
                  top: `${20 + (i % 3) * 20}%`
                }}
              >
                🎈
              </motion.div>
            ))}
            
            {/* Fireworks */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={`firework-${i}`}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, 360]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.8,
                  ease: "easeOut"
                }}
                className="absolute text-6xl"
                style={{
                  left: `${Math.random() * 80 + 10}%`,
                  top: `${Math.random() * 60 + 20}%`
                }}
              >
                🎆
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotateY: 90 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative"
          >
            {/* Header with birthday theme */}
            <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 p-8 text-white text-center relative overflow-hidden">
              {/* Sparkle effects */}
              <motion.div
                animate={{
                  x: ['-100%', '100%'],
                  opacity: [0, 0.5, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent skew-x-12"
              />
              
              <div className="relative z-10">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-2xl"
                >
                  <Cake className="w-12 h-12 text-pink-600" />
                </motion.div>
                
                <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Comic Neue, cursive' }}>
                  {getStepTitle()}
                </h1>
                
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    color: ['#FFFFFF', '#FFD700', '#FFFFFF']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-2xl font-bold"
                >
                  {currentAge} ANOS DE PURA MAGIA! ⚡
                </motion.div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 text-center">
              {celebrationStep === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="w-32 h-32 mx-auto mb-6 relative">
                    <img 
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThmdGPdw5KIVi5gQ-UWFdptTPziXMRjk6phx4Noy3Toh9Nu_nbnP-YZGe9sdfP0jrVakc&usqp=CAU"
                      alt="Avatar do Heitor"
                      className="w-full h-full object-cover rounded-full border-4 border-yellow-400 shadow-2xl"
                    />
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className="absolute -inset-4 border-4 border-pink-400/50 rounded-full"
                    />
                    <motion.div
                      animate={{
                        rotate: [360, 0],
                        scale: [1.1, 1.3, 1.1]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className="absolute -inset-8 border-2 border-purple-400/30 rounded-full"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Comic Neue, cursive' }}>
                      🎂 Hoje é um dia MUITO especial! 🎂
                    </p>
                    <p className="text-xl text-gray-700 leading-relaxed">
                      Heitor, você está completando <span className="text-pink-600 font-bold">{currentAge} anos</span> de vida!
                    </p>
                    <p className="text-lg text-gray-600">
                      Você cresceu tanto e se tornou um verdadeiro herói! 
                      O Flash ficaria orgulhoso de ver como você é responsável e dedicado! ⚡
                    </p>
                  </div>
                </motion.div>
              )}

              {celebrationStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <h3 className="text-3xl font-bold text-gray-800 mb-6" style={{ fontFamily: 'Comic Neue, cursive' }}>
                    🎁 Presentes Especiais de Aniversário! 🎁
                  </h3>
                  
                  <div className="space-y-4">
                    {birthdayRewards.map((reward, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.3 }}
                        className="bg-gradient-to-r from-yellow-100 to-pink-100 border-2 border-yellow-300 rounded-2xl p-6"
                      >
                        <div className="flex items-center gap-4">
                          <motion.div
                            animate={{
                              scale: [1, 1.2, 1],
                              rotate: [0, 10, -10, 0]
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: index * 0.2
                            }}
                            className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white shadow-lg"
                          >
                            <Gift className="w-8 h-8 text-red-600" />
                          </motion.div>
                          
                          <div className="flex-1 text-left">
                            <h4 className="text-xl font-bold text-gray-900 mb-2">
                              {reward.title}
                            </h4>
                            <p className="text-gray-700 mb-3">
                              {reward.description}
                            </p>
                            <div className="flex items-center gap-4 text-lg font-bold">
                              <div className="flex items-center gap-1 text-blue-600">
                                <Zap className="w-5 h-5" />
                                +{reward.xp} XP
                              </div>
                              <div className="flex items-center gap-1 text-yellow-600">
                                <Star className="w-5 h-5" />
                                +{reward.gold} Gold
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {celebrationStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="text-8xl mb-6"
                  >
                    👑
                  </motion.div>
                  
                  <h3 className="text-4xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Comic Neue, cursive' }}>
                    Você é o Rei do Dia! 👑
                  </h3>
                  
                  <div className="bg-gradient-to-r from-yellow-100 to-pink-100 border-2 border-yellow-300 rounded-2xl p-6">
                    <p className="text-xl text-gray-800 leading-relaxed mb-4">
                      Heitor, você é uma pessoa incrível! 
                    </p>
                    <p className="text-lg text-gray-700 leading-relaxed mb-4">
                      Seus {currentAge} anos são uma prova de como você cresceu, aprendeu e se tornou um verdadeiro herói!
                    </p>
                    <p className="text-lg text-pink-600 font-bold">
                      Que este novo ano seja cheio de aventuras, descobertas e muita felicidade! ⚡💖
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-gray-600 text-lg">
                      Esta data ficará marcada para sempre no seu sistema! 📅
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Todo ano no dia 18 de dezembro, você receberá uma celebração especial!
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCelebrationStep}
                disabled={isProcessing}
                className="mt-8 px-12 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold text-xl transition-all duration-200 shadow-2xl hover:shadow-3xl flex items-center justify-center gap-3 mx-auto"
                style={{ fontFamily: 'Comic Neue, cursive' }}
              >
                {isProcessing ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processando...
                  </>
                ) : celebrationStep === 0 ? (
                  <>
                    <PartyPopper className="w-6 h-6" />
                    Começar Celebração!
                  </>
                ) : celebrationStep === 1 ? (
                  <>
                    <Gift className="w-6 h-6" />
                    Receber Presentes!
                  </>
                ) : (
                  <>
                    <Heart className="w-6 h-6" />
                    Finalizar Celebração!
                  </>
                )}
              </motion.button>

              {/* Skip button for testing */}
              <button
                onClick={() => {
                  setShowCelebration(false);
                  onComplete();
                }}
                className="mt-4 text-gray-500 hover:text-gray-700 text-sm underline"
              >
                Pular celebração (apenas para teste)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default BirthdayCelebration;