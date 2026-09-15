import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProgress } from '../../types';
import { calculateLevelSystem, checkLevelUp } from '../../utils/levelSystem';
import { FirestoreService } from '../../services/firestoreService';
import { getTodayBrazil } from '../../utils/timezone';

const STAR = '/assets/english/ui/star.webp';
const MAP = '/assets/english/ui/map.webp';
const DIAMOND = '/assets/english/ui/diamond.webp';

interface ProgressBarProps {
  progress: UserProgress;
  compact?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, compact = false }) => {
  const levelSystem = calculateLevelSystem(progress.totalXP || 0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [previousXP, setPreviousXP] = useState(progress.totalXP || 0);
  const [dailyXP, setDailyXP] = useState(0);
  
  // Load daily XP from Firebase instead of localStorage
  useEffect(() => {
    const loadDailyXP = async () => {
      if (!progress.userId) return;
      
      try {
        const today = getTodayBrazil();
        const dailyProgress = await FirestoreService.getDailyProgress(progress.userId, today);
        setDailyXP(dailyProgress?.xpEarned || 0);
      } catch (error) {
        console.error('❌ Error loading daily XP:', error);
        setDailyXP(0);
      }
    };
    
    loadDailyXP();
  }, [progress.userId]);

  // Update daily XP when total XP changes
  useEffect(() => {
    const updateDailyXP = async () => {
      if (!progress.userId || previousXP === 0) return;
      
      const xpGained = (progress.totalXP || 0) - previousXP;
      if (xpGained > 0) {
        try {
          const today = getTodayBrazil();
          await FirestoreService.updateDailyProgress(progress.userId, today, xpGained, 0);
          setDailyXP(prev => prev + xpGained);
        } catch (error) {
          console.error('❌ Error updating daily XP:', error);
        }
      }
    };
    
    if (previousXP > 0) {
      updateDailyXP();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- previousXP is a deliberate snapshot of the last seen XP, not a trigger
  }, [progress.totalXP, progress.userId]);
  
  // Check for level up
  useEffect(() => {
    if (previousXP === 0) {
      setPreviousXP(progress.totalXP || 0);
      return;
    }
    
    const levelUpCheck = checkLevelUp(previousXP, progress.totalXP || 0);
    
    if (levelUpCheck.leveledUp && progress.totalXP > 0) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 4000);
    }
    
    setPreviousXP(progress.totalXP || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- previousXP is a deliberate snapshot of the last seen XP, not a trigger
  }, [progress.totalXP]);

  // Função para gerar mensagem motivacional diária
  const getDailyMotivationalMessage = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

    const mensagensHeitorFlash = [
      "Quem consegue se controlar é mais forte do que qualquer armadura.",
      "Coragem é seguir em frente mesmo quando dá vontade de parar.",
      "A maior vitória é vencer a si mesmo todos os dias.",
      "Cada dia é uma nova chance de crescer e melhorar.",
      "A força verdadeira aparece quando você faz o certo mesmo sozinho.",
      "Grandes construções nascem da paciência e do treino constante.",
      "O que você planta hoje, você colhe amanhã. Escolha bem.",
      "Ser confiável nas pequenas coisas mostra que você está pronto para as grandes.",
      "Caminhos bons são feitos de passos firmes, mesmo que pequenos.",
      "Ser bom minerador é fazer boas escolhas, mesmo quando ninguém vê.",
      "Treinar sua mente te leva mais fundo do que qualquer picareta.",
      "Uma mente tranquila acha mais diamantes do que a pressa.",
      "O tempo é seu aliado. Use com calma e sabedoria.",
      "Primeiro a gente cresce por dentro, depois por fora.",
      "As conquistas de hoje nascem do esforço de agora.",
      "Minerar não é só achar o minério — é aprender no caminho.",
      "O mais importante não é vencer, é se tornar alguém melhor.",
      "Dias difíceis treinam sua força. Não fuja deles.",
      "Tudo começa pequeno. Até o mar começou com gotas.",
      "A bondade vale mais que qualquer diamante.",
      "Você não escolhe tudo, mas escolhe como vai agir.",
      "O caminho certo quase nunca é o mais fácil.",
      "Quem tem raízes firmes não cai com o vento.",
      "Cada esforço é uma semente que um dia vira vitória.",
      "Ser calmo no meio da pressa é a ferramenta mais rara.",
      "Subir devagar também é subir. O importante é não parar.",
      "O valor de um minerador está em como ele trata os outros.",
      "O que te move não é a pressa — é o propósito."
    ];

    const messageIndex = dayOfYear % mensagensHeitorFlash.length;
    return mensagensHeitorFlash[messageIndex];
  };

  const xpNoNivel = Math.round(levelSystem.currentXP - levelSystem.xpForCurrentLevel);
  const xpDoNivel = Math.round(levelSystem.xpForNextLevel - levelSystem.xpForCurrentLevel);

  if (compact) {
    return (
      <>
        <section className="mc-panel rounded-lg px-3 py-2 mt-2">
          <div className="flex items-center gap-3">
            <span className="mc-lbl shrink-0">XP</span>
            <div className="mc-bar flex-1">
              <div className="mc-bar-fill" style={{ width: `${levelSystem.progressPercentage}%` }} />
            </div>
            <span className="mc-num text-white shrink-0 text-[10px] sm:text-[12px]">
              {levelSystem.isMaxLevel ? 'máx' : `${xpNoNivel}/${xpDoNivel}`}
            </span>
            {dailyXP > 0 && (
              <span className="mc-font text-[8px] mc-good shrink-0">+{dailyXP}</span>
            )}
          </div>
        </section>
        <AnimatePresence>
          {showLevelUp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div className="mc-modal mc-pop rounded-lg px-8 py-6 text-center">
                <img src={DIAMOND} alt="" className="w-12 h-12 mx-auto mb-3 mc-pixel" draggable={false} />
                <div className="mc-title text-lg">Nível {levelSystem.currentLevel}</div>
                <div className="text-lg text-white mt-2">{levelSystem.levelTitle}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="mc-panel rounded-lg p-4"
      >
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h3 className="mc-lbl">Progresso do minerador</h3>
          <div className="flex items-center gap-2">
            <span className="mc-num text-white">{xpNoNivel} / {xpDoNivel} XP</span>
            {dailyXP > 0 && (
              <span className="mc-font text-[8px] mc-good">+{dailyXP} hoje</span>
            )}
          </div>
        </div>

        <div className="mc-bar">
          <div className="mc-bar-fill" style={{ width: `${levelSystem.progressPercentage}%` }} />
        </div>

        <div className="flex justify-between mt-2">
          <div>
            <div className="mc-num mc-diamond">Nível {levelSystem.currentLevel}</div>
            <div className="text-sm text-white/85">{levelSystem.levelTitle}</div>
          </div>
          {!levelSystem.isMaxLevel && (
            <div className="text-right">
              <div className="mc-num mc-muted">Nível {levelSystem.currentLevel + 1}</div>
              <div className="text-sm mc-muted">{levelSystem.nextLevelTitle}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="mc-slot flex items-center gap-2 px-3 py-2">
            <img src={STAR} alt="" className="w-7 h-7 mc-pixel shrink-0" draggable={false} />
            <div>
              <div className="mc-num text-white">{levelSystem.currentXP}</div>
              <div className="text-xs mc-muted">XP total</div>
            </div>
          </div>
          <div className="mc-slot flex items-center gap-2 px-3 py-2">
            <img src={MAP} alt="" className="w-7 h-7 mc-pixel shrink-0" draggable={false} />
            <div>
              <div className="mc-num text-white">{progress.totalTasksCompleted || 0}</div>
              <div className="text-xs mc-muted">Missões concluídas</div>
            </div>
          </div>
        </div>

        <div className="mc-card rounded px-3 py-2 mt-3 text-sm text-center text-white/90">
          {getDailyMotivationalMessage()}
        </div>
      </motion.section>

      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="mc-panel mc-pop rounded-lg px-8 py-6 text-center">
              <img src={DIAMOND} alt="" className="w-12 h-12 mx-auto mb-3 mc-pixel" draggable={false} />
              <div className="mc-title text-lg">Nível {levelSystem.currentLevel}</div>
              <div className="text-lg text-white mt-2">{levelSystem.levelTitle}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProgressBar;
