import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Trophy, Star, Zap, Brain, CheckCircle, XCircle, Clock, Play } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';

interface QuizTimeProps {
  onComplete: () => void;
}

const QuizTime: React.FC<QuizTimeProps> = ({ onComplete }) => {
  const { adjustUserXP, adjustUserGold } = useData();
  const { childUid } = useAuth();
  const { playTaskComplete, playLevelUp } = useSound();
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  // Check if quiz should be shown
  useEffect(() => {
    const checkQuizStatus = () => {
      if (!childUid) return;
      
      const today = new Date().toISOString().split('T')[0];
      const quizKey = `quiz_completed_${childUid}_${today}`;
      const quizCompleted = localStorage.getItem(quizKey);
      
      if (!quizCompleted) {
        // Show prompt after 3 seconds
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    };
    
    checkQuizStatus();
  }, [childUid]);

  const handleStartQuiz = () => {
    setShowPrompt(false);
    setIsOpen(true);
    generateQuestions();
  };

  const handlePostpone = () => {
    setShowPrompt(false);
    // Quiz will be prompted again on next login since it's not completed
  };

  const generateQuestions = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Generate quiz questions logic here
      setQuestions([]);
    } catch (error: any) {
      console.error('❌ QuizTime: Error generating questions:', error);
      setError('Erro ao gerar perguntas do quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer) {
      const newAnswers = [...userAnswers, selectedAnswer];
      setUserAnswers(newAnswers);
      
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        // Quiz completed
        calculateResults(newAnswers);
      }
    }
  };

  const calculateResults = async (answers: string[]) => {
    try {
      let correctAnswers = 0;
      
      // Calculate score logic here
      
      setScore(correctAnswers);
      setShowResults(true);
      
      // Award XP and Gold based on score
      let xpReward = 0;
      let goldReward = 0;
      
      if (correctAnswers >= 5) {
        xpReward = 25;
        goldReward = 15;
      } else if (correctAnswers >= 4) {
        xpReward = 20;
        goldReward = 12;
      } else if (correctAnswers >= 3) {
        xpReward = 15;
        goldReward = 8;
      }
      
      if (xpReward > 0) {
        await adjustUserXP(childUid!, xpReward);
        await adjustUserGold(childUid!, goldReward);
        playTaskComplete();
      }
      
      // Mark quiz as completed for today
      const today = new Date().toISOString().split('T')[0];
      const quizKey = `quiz_completed_${childUid}_${today}`;
      localStorage.setItem(quizKey, 'true');
      
      setIsOpen(false);
      onComplete();
    } catch (error: any) {
      console.error('❌ QuizTime: Error saving rewards:', error);
      setError('Erro ao salvar recompensas do quiz');
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setUserAnswers([]);
    setQuestions([]);
    setIsGenerating(false);
    setShowResults(false);
    setScore(0);
    setError(null);
    setIsOpen(false);
    onComplete();
  };

  const closeQuiz = () => {
    setIsOpen(false);
    setShowPrompt(false);
    // Don't mark as completed, so it will show again on next login
  };

  return (
    <>
      {/* Quiz Prompt */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-hero-primary to-hero-secondary p-6 text-center relative overflow-hidden">
                {/* Lightning effects */}
                <motion.div
                  animate={{
                    x: ['-100%', '100%'],
                    opacity: [0, 0.4, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent skew-x-12"
                />
                
                <div className="relative z-10">
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
                    className="w-20 h-20 bg-hero-accent rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-2xl"
                  >
                    <Brain className="w-10 h-10 text-hero-primary" />
                  </motion.div>
                  
                  <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Comic Neue, cursive' }}>
                    ⚡ Quiz Time! ⚡
                  </h2>
                  <p className="text-hero-accent font-bold text-lg">
                    Prepare-se, herói!
                  </p>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 text-center">
                <p className="text-gray-700 text-lg mb-6 leading-relaxed" style={{ fontFamily: 'Comic Neue, cursive' }}>
                  🧠 Hora do quiz diário! Teste seus conhecimentos e ganhe XP e Gold extras!
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 text-yellow-800 font-bold">
                    <Trophy className="w-5 h-5" />
                    <span>Recompensas por acertos:</span>
                  </div>
                  <div className="text-sm text-yellow-700 mt-2 space-y-1">
                    <div>🏆 5 acertos: +25 XP, +15 Gold</div>
                    <div>🥇 4 acertos: +20 XP, +12 Gold</div>
                    <div>🥈 3 acertos: +15 XP, +8 Gold</div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartQuiz}
                    className="flex-1 py-4 bg-gradient-to-r from-hero-primary to-hero-secondary text-white rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    style={{ fontFamily: 'Comic Neue, cursive' }}
                  >
                    <Play className="w-6 h-6" />
                    Vamos lá!
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePostpone}
                    className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
                  >
                    <Clock className="w-5 h-5" />
                    Mais tarde
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.8, opacity: 0, rotateY: 90 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-hero-primary to-hero-secondary p-6 text-white relative overflow-hidden">
                <motion.div
                  animate={{
                    x: ['-100%', '100%'],
                    opacity: [0, 0.3, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent skew-x-12"
                />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-hero-accent rounded-full flex items-center justify-center border-2 border-white">
                      <Brain className="w-6 h-6 text-hero-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold" style={{ fontFamily: 'Comic Neue, cursive' }}>
                        Quiz Time! ⚡
                      </h2>
                      <p className="text-hero-accent font-medium">
                        Pergunta {currentQuestion + 1} de {questions.length}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={closeQuiz}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                    title="Fechar quiz (não será marcado como completo)"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {isGenerating && (
                  <div className="text-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-16 h-16 border-4 border-hero-primary border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-600 text-lg" style={{ fontFamily: 'Comic Neue, cursive' }}>
                      Gerando perguntas incríveis para você...
                    </p>
                  </div>
                )}

                {error && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="text-red-600 text-lg mb-4" style={{ fontFamily: 'Comic Neue, cursive' }}>
                      {error}
                    </p>
                    <button
                      onClick={generateQuestions}
                      className="px-6 py-3 bg-hero-primary text-white rounded-xl font-bold hover:bg-hero-primary/90 transition-colors"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                )}

                {showResults && (
                  <div className="text-center py-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="w-24 h-24 bg-gradient-to-r from-hero-primary to-hero-secondary rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-hero-accent"
                    >
                      <Trophy className="w-12 h-12 text-white" />
                    </motion.div>
                    
                    <h3 className="text-3xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Comic Neue, cursive' }}>
                      Quiz Concluído! 🎉
                    </h3>
                    
                    <div className="bg-gradient-to-r from-hero-primary/10 to-hero-secondary/10 rounded-2xl p-6 mb-6">
                      <p className="text-2xl font-bold text-hero-primary mb-2">
                        {score} de {questions.length} acertos
                      </p>
                      <div className="flex justify-center gap-1 mb-4">
                        {Array.from({ length: questions.length }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-6 h-6 ${
                              i < score ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      
                      {score >= 3 && (
                        <div className="bg-white rounded-xl p-4 border border-hero-primary/20">
                          <p className="text-hero-primary font-bold mb-2">Recompensas Ganhas:</p>
                          <div className="flex justify-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Zap className="w-4 h-4 text-blue-500" />
                              <span>+{score >= 5 ? 25 : score >= 4 ? 20 : 15} XP</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">🪙</span>
                              <span>+{score >= 5 ? 15 : score >= 4 ? 12 : 8} Gold</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={resetQuiz}
                      className="px-8 py-4 bg-gradient-to-r from-hero-primary to-hero-secondary text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all duration-200"
                      style={{ fontFamily: 'Comic Neue, cursive' }}
                    >
                      Continuar Aventura! 🚀
                    </button>
                  </div>
                )}

                {questions.length > 0 && !showResults && !isGenerating && (
                  <div>
                    {/* Question */}
                    <div className="mb-8">
                      <div className="bg-gradient-to-r from-hero-primary/10 to-hero-secondary/10 rounded-2xl p-6 mb-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Comic Neue, cursive' }}>
                          {questions[currentQuestion]?.question}
                        </h3>
                      </div>
                      
                      {/* Answers */}
                      <div className="space-y-3">
                        {questions[currentQuestion]?.options?.map((option: string, index: number) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAnswerSelect(option)}
                            className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                              selectedAnswer === option
                                ? 'border-hero-primary bg-hero-primary/10 text-hero-primary'
                                : 'border-gray-200 hover:border-hero-primary/50 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                selectedAnswer === option
                                  ? 'border-hero-primary bg-hero-primary'
                                  : 'border-gray-300'
                              }`}>
                                {selectedAnswer === option && (
                                  <CheckCircle className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <span className="font-medium">{option}</span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Next Button */}
                    <div className="flex justify-end">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleNextQuestion}
                        disabled={!selectedAnswer}
                        className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-200 ${
                          selectedAnswer
                            ? 'bg-gradient-to-r from-hero-primary to-hero-secondary text-white hover:shadow-lg'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {currentQuestion < questions.length - 1 ? 'Próxima' : 'Finalizar'}
                        <ChevronRight className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default QuizTime;