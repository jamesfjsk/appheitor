import React, { useState, useEffect } from 'react';
import { generateQuiz, loadQuizSession, saveQuizSession, clearQuizSession, getQuizHistory, rememberQuizQuestions, QuizSource } from '../../services/aiQuiz';
import { useAuth } from '../../contexts/AuthContext';
import { getTodayBrazil } from '../../utils/timezone';
import { motion } from 'framer-motion';
import { X, ChevronRight, Trophy, Star, Zap, Brain, CheckCircle, XCircle, Target, ChevronLeft } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSound } from '../../contexts/SoundContext';
import { SurpriseMissionQuestion } from '../../types';

interface SurpriseMissionQuizProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const SurpriseMissionQuiz: React.FC<SurpriseMissionQuizProps> = ({ isOpen, onClose, onComplete }) => {
  const { surpriseMissionConfig, completeSurpriseMission } = useData();
  const { playTaskComplete, playLevelUp } = useSound();
  
  // OpenAI API Key from environment variables
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [questions, setQuestions] = useState<SurpriseMissionQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [source, setSource] = useState<QuizSource>('ai');
  const { childUid } = useAuth();
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'wrong'>('all');
  const [detailedResults, setDetailedResults] = useState<Array<{
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
    category?: string;
  }>>([]);
  const [timeStarted, setTimeStarted] = useState<Date | null>(null);

  useEffect(() => {
    if (isOpen && surpriseMissionConfig) {
      generateQuestions();
      setTimeStarted(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generateQuestions is recreated every render; the effect should only fire when the quiz opens
  }, [isOpen, surpriseMissionConfig]);

  // Helper function to categorize questions for improvement suggestions
  const getQuestionCategory = (question: string): string => {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('inglês') || questionLower.includes('english') || 
        questionLower.includes('como se diz') || questionLower.includes('cat') || 
        questionLower.includes('dog') || questionLower.includes('house')) {
      return 'inglês';
    }
    
    if (questionLower.includes('+') || questionLower.includes('-') || 
        questionLower.includes('×') || questionLower.includes('÷') || 
        questionLower.includes('quanto é') || questionLower.includes('matemática')) {
      return 'matemática';
    }
    
    if (questionLower.includes('planeta') || questionLower.includes('animal') || 
        questionLower.includes('corpo') || questionLower.includes('ciência')) {
      return 'ciências';
    }
    
    if (questionLower.includes('brasil') || questionLower.includes('geografia') || 
        questionLower.includes('história') || questionLower.includes('país')) {
      return 'geografia/história';
    }
    
    return 'conhecimentos gerais';
  };

  // Generate improvement suggestions based on wrong answers
  const generateImprovementSuggestions = () => {
    const wrongAnswers = detailedResults.filter(result => !result.isCorrect);
    const categoryCounts: Record<string, number> = {};
    
    wrongAnswers.forEach(result => {
      const category = result.category || 'geral';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    const suggestions = [];
    const totalWrong = wrongAnswers.length;
    
    if (totalWrong === 0) {
      return ['🏆 Perfeito! Você domina todos os assuntos! Continue assim, campeão!'];
    }
    
    // Sort categories by most errors
    const sortedCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3); // Top 3 categories with most errors
    
    sortedCategories.forEach(([category, count]) => {
      switch (category) {
        case 'inglês':
          suggestions.push(`📚 Inglês (${count} erros): Pratique vocabulário básico com jogos e desenhos em inglês!`);
          break;
        case 'matemática':
          suggestions.push(`🔢 Matemática (${count} erros): Treine cálculos mentais e tabuada brincando!`);
          break;
        case 'ciências':
          suggestions.push(`🔬 Ciências (${count} erros): Explore curiosidades sobre animais e o corpo humano!`);
          break;
        case 'geografia/história':
          suggestions.push(`🌍 Geografia/História (${count} erros): Descubra mais sobre o Brasil e o mundo!`);
          break;
        default:
          suggestions.push(`🧠 ${category} (${count} erros): Continue estudando e fazendo perguntas!`);
      }
    });
    
    // Add motivational message
    if (totalWrong <= 5) {
      suggestions.push('💪 Você está quase lá! Poucos erros mostram que está aprendendo rápido!');
    } else if (totalWrong <= 10) {
      suggestions.push('🌟 Bom trabalho! Com mais prática você vai dominar tudo!');
    } else {
      suggestions.push('🚀 Todo herói começa assim! Continue praticando que você vai longe!');
    }
    
    return suggestions;
  };

  const getPerformanceLevel = (score: number) => {
    const percentage = (score / (questions.length || 30)) * 100;
    
    if (percentage >= 90) return { level: 'Excepcional', color: 'text-purple-600', emoji: '🏆' };
    if (percentage >= 80) return { level: 'Excelente', color: 'text-green-600', emoji: '⚡' };
    if (percentage >= 70) return { level: 'Muito Bom', color: 'text-blue-600', emoji: '🌟' };
    if (percentage >= 60) return { level: 'Bom', color: 'text-yellow-600', emoji: '💪' };
    if (percentage >= 50) return { level: 'Regular', color: 'text-orange-600', emoji: '🎯' };
    return { level: 'Precisa Melhorar', color: 'text-red-600', emoji: '🌈' };
  };

  const generateQuestions = async () => {
    if (!surpriseMissionConfig || !childUid) return;
    setIsGenerating(true);
    setError(null);
    try {
      const today = getTodayBrazil();
      // Missão pela metade (fechou o app, recarregou): retoma de onde parou
      const cached = loadQuizSession('surprise', childUid, today);
      if (cached) {
        setQuestions(cached.questions);
        setUserAnswers(cached.answers);
        setCurrentQuestion(Math.min(cached.currentQuestion, cached.questions.length - 1));
        setSource(cached.source);
        return;
      }
      const count = surpriseMissionConfig.questionsCount || 30;
      const result = await generateQuiz({
        count,
        theme: surpriseMissionConfig.theme,
        difficulty: surpriseMissionConfig.difficulty,
        avoid: getQuizHistory('surprise', childUid),
      });
      if (result.questions.length === 0) throw new Error('Nenhuma pergunta disponível');
      setQuestions(result.questions);
      setSource(result.source);
      saveQuizSession('surprise', childUid, today, { questions: result.questions, answers: [], currentQuestion: 0, source: result.source, startedAt: new Date().toISOString() });
      rememberQuizQuestions('surprise', childUid, result.questions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('SurpriseMissionQuiz: erro ao gerar perguntas:', error);
      if (message.includes('quota') || message.includes('billing') || message.includes('429')) {
        setError('Limite da IA atingido por agora. Tente de novo mais tarde.');
      } else {
        setError('Não consegui montar a missão agora. Tente novamente.');
      }
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
        if (childUid) saveQuizSession('surprise', childUid, getTodayBrazil(), { questions, answers: newAnswers, currentQuestion: currentQuestion + 1, source, startedAt: '' });
      } else {
        // Quiz completed
        calculateResults(newAnswers);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(userAnswers[currentQuestion - 1] || null);
      // Remove the last answer from userAnswers
      setUserAnswers(prev => {
        const next = prev.slice(0, -1);
        if (childUid) saveQuizSession('surprise', childUid, getTodayBrazil(), { questions, answers: next, currentQuestion: currentQuestion - 1, source, startedAt: '' });
        return next;
      });
    }
  };

  const calculateResults = async (answers: string[]) => {
    if (!surpriseMissionConfig) return;
    
    try {
      let correctAnswers = 0;
      const detailedResults: Array<{
        question: string;
        userAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
        explanation: string;
        category?: string;
      }> = [];
      
      // Calculate score based on correct answers
      answers.forEach((answer, index) => {
        if (questions[index] && answer === questions[index].answer) {
          correctAnswers++;
        }
        
        // Store detailed results for review
        if (questions[index]) {
          detailedResults.push({
            question: questions[index].question,
            userAnswer: answer,
            correctAnswer: questions[index].answer,
            isCorrect: answer === questions[index].answer,
            explanation: questions[index].explanation,
            category: getQuestionCategory(questions[index].question)
          });
        }
      });
      
      setScore(correctAnswers);
      setDetailedResults(detailedResults);
      setShowResults(true);
      
      // Nova lógica: Recompensa por acerto + base de participação
      const baseXP = surpriseMissionConfig.xpReward;
      const baseGold = surpriseMissionConfig.goldReward;
      
      // XP: valor integral (sempre ganha o valor total configurado)
      const finalXP = baseXP;
      
      // Gold: 10% base de participação + 90% por mérito baseado em acertos
      const participationGold = Math.round(baseGold * 0.1); // 10% por participar
      const totalQuestions = questions.length;
      const meritGold = Math.round((baseGold * 0.9) * (correctAnswers / totalQuestions)); // 90% por acertos
      const finalGold = participationGold + meritGold;
      await completeSurpriseMission(correctAnswers, totalQuestions, finalXP, finalGold);
      if (childUid) clearQuizSession('surprise', childUid, getTodayBrazil());
      
      if (correctAnswers >= Math.ceil(questions.length * 0.8)) {
        playLevelUp(); // Special sound for excellent performance
      } else {
        playTaskComplete();
      }
      
      onComplete();
    } catch (error) {
      console.error('❌ SurpriseMissionQuiz: Error saving results:', error);
      setError('Erro ao salvar resultados da missão');
    }
  };

  const getPerformanceMessage = (score: number) => {
    const percentage = (score / (questions.length || 30)) * 100;
    
    if (percentage >= 90) return "🏆 EXCEPCIONAL! Você é um verdadeiro gênio, velocista!";
    if (percentage >= 80) return "⚡ EXCELENTE! Performance digna do Flash!";
    if (percentage >= 70) return "🌟 MUITO BOM! Você está evoluindo rapidamente!";
    if (percentage >= 60) return "💪 BOM TRABALHO! Continue treinando, herói!";
    if (percentage >= 50) return "🎯 LEGAL! Todo herói tem seus desafios!";
    return "🌈 PARABÉNS! Você enfrentou o desafio com coragem!";
  };

  const getScoreColor = (score: number) => {
    const percentage = (score / (questions.length || 30)) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-blue-600';
  };

  const total = questions.length || 30;

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setUserAnswers([]);
    setQuestions([]);
    setIsGenerating(false);
    setShowResults(false);
    setScore(0);
    setDetailedResults([]);
    setReviewFilter('all');
    setError(null);
    setTimeStarted(null);
    onClose();
  };

  if (!isOpen || !surpriseMissionConfig) return null;

  return (
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
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white relative overflow-hidden">
          <motion.div
            animate={{
              x: ['-100%', '100%'],
              opacity: [0, 0.3, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent skew-x-12"
          />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white shadow-2xl"
              >
                <Target className="w-8 h-8 text-purple-600" />
              </motion.div>
              <div>
                <h2 className="text-3xl font-bold" style={{ fontFamily: 'Comic Neue, cursive' }}>
                  🎯 Missão Surpresa! ⚡
                </h2>
                {questions.length > 0 && !showResults && (
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-yellow-300 font-medium">
                      Pergunta {currentQuestion + 1} de {questions.length}
                    </p>
                    <div className="w-32 bg-white/20 rounded-full h-3">
                      <div 
                        className="bg-yellow-400 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {showResults && (
                  <p className="text-yellow-300 font-medium">
                    Resultados da Missão Surpresa
                  </p>
                )}
                {isGenerating && (
                  <p className="text-yellow-300 font-medium">
                    Gerando prova personalizada...
                  </p>
                )}
              </div>
            </div>
            
            <button
              onClick={resetQuiz}
              className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
              title="Fechar missão"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Mission Info */}
          <div className="relative z-10 mt-4 flex items-center justify-center gap-6 text-sm">
            <div className="bg-white/20 px-3 py-1 rounded-full">
              📚 {surpriseMissionConfig.theme === 'english' ? 'Inglês' : 
                   surpriseMissionConfig.theme === 'math' ? 'Matemática' : 
                   surpriseMissionConfig.theme === 'general' ? 'Conhecimentos Gerais' : 
                   'Tudo Misturado'}
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-full">
              🎯 {surpriseMissionConfig.difficulty === 'easy' ? 'Fácil' : 
                   surpriseMissionConfig.difficulty === 'medium' ? 'Médio' : 
                   'Difícil'}
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-full">
              🏆 +{surpriseMissionConfig.xpReward} XP, +{surpriseMissionConfig.goldReward} Gold
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {isGenerating && (
            <div className="text-center py-16">
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                }}
                className="w-20 h-20 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-yellow-400"
              >
                <Brain className="w-10 h-10 text-white" />
              </motion.div>
              <p className="text-gray-600 text-xl mb-4" style={{ fontFamily: 'Comic Neue, cursive' }}>
                🎯 Gerando sua missão surpresa personalizada...
              </p>
              <p className="text-gray-500 text-base">
                A IA está criando {total} perguntas únicas baseadas nas suas configurações!
              </p>
              <div className="mt-6 space-y-2 text-sm text-gray-500">
                <p>• Analisando tema: {surpriseMissionConfig.theme}</p>
                <p>• Ajustando dificuldade: {surpriseMissionConfig.difficulty}</p>
                <p>• Criando {total} questões personalizadas...</p>
                <p>• Preparando explicações educativas...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-red-600 text-lg mb-4" style={{ fontFamily: 'Comic Neue, cursive' }}>
                {error}
              </p>
              <button
                onClick={generateQuestions}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {showResults && (
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-32 h-32 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-yellow-400"
              >
                <Trophy className="w-16 h-16 text-white" />
              </motion.div>
              
              <h3 className="text-4xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Comic Neue, cursive' }}>
                Missão Surpresa Concluída! 🎉
              </h3>
              
              {/* Performance Summary */}
              <div className="bg-gradient-to-r from-purple-600/10 to-purple-700/10 rounded-2xl p-8 mb-8">
                <p className={`text-3xl font-bold mb-4 ${getScoreColor(score)}`}>
                  {score} de {questions.length} acertos
                </p>
                
                <div className={`text-2xl font-bold mb-4 ${getPerformanceLevel(score).color}`}>
                  {getPerformanceLevel(score).emoji} {getPerformanceLevel(score).level}
                </div>
                
                <p className="text-xl font-bold text-purple-600 mb-6">
                  {getPerformanceMessage(score)}
                </p>
                
                {/* Star Rating Visual */}
                <div className="flex justify-center gap-1 mb-8">
                  {Array.from({ length: total }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.02 }}
                    >
                      <Star
                        className={`w-3 h-3 ${
                          i < score ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    </motion.div>
                  ))}
                </div>
                
                {/* Rewards Section */}
                <div className="bg-white rounded-xl p-6 border border-purple-200 mb-6">
                  <p className="text-purple-600 font-bold mb-4 text-lg">🎁 Recompensas Ganhas:</p>
                  
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 text-2xl font-bold text-blue-600 mb-2">
                        <Zap className="w-6 h-6" />
                        <span>+{surpriseMissionConfig.xpReward}</span>
                      </div>
                      <div className="text-sm text-blue-600">XP Ganho</div>
                      <div className="text-xs text-blue-600 font-bold mt-1">
                        Valor Integral
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 text-2xl font-bold text-yellow-600 mb-2">
                        <Star className="w-6 h-6" />
                        <span>+{Math.round(surpriseMissionConfig.goldReward * 0.1) + Math.round((surpriseMissionConfig.goldReward * 0.9) * (score / total))}</span>
                      </div>
                      <div className="text-sm text-yellow-600">Gold Ganho</div>
                      <div className="text-xs text-yellow-600 font-bold mt-1">
                        {Math.round(surpriseMissionConfig.goldReward * 0.1)} base + {Math.round((surpriseMissionConfig.goldReward * 0.9) * (score / total))} mérito
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {Math.round((score / total) * 100)}% de Aproveitamento
                    </div>
                    {timeStarted && (
                      <div className="text-sm text-gray-600 mt-1">
                        Tempo: {Math.round((new Date().getTime() - timeStarted.getTime()) / 60000)} minutos
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Performance Analysis */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-6">
                  <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                    📊 Análise de Performance
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-xl font-bold text-green-600">{score}</div>
                      <div className="text-xs text-green-600">Acertos</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-xl font-bold text-red-600">{total - score}</div>
                      <div className="text-xs text-red-600">Erros</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-xl font-bold text-blue-600">{Math.round((score / total) * 100)}%</div>
                      <div className="text-xs text-blue-600">Aproveitamento</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-xl font-bold text-purple-600">
                        {timeStarted ? Math.round((new Date().getTime() - timeStarted.getTime()) / 60000) : 0}min
                      </div>
                      <div className="text-xs text-purple-600">Duração</div>
                    </div>
                  </div>
                  
                  {/* Category Performance */}
                  {(() => {
                    const categoryStats: Record<string, { correct: number; total: number }> = {};
                    
                    detailedResults.forEach(result => {
                      const category = result.category || 'geral';
                      if (!categoryStats[category]) {
                        categoryStats[category] = { correct: 0, total: 0 };
                      }
                      categoryStats[category].total++;
                      if (result.isCorrect) {
                        categoryStats[category].correct++;
                      }
                    });
                    
                    return Object.keys(categoryStats).length > 1 && (
                      <div>
                        <h5 className="font-semibold text-blue-900 mb-3">📈 Performance por Área:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(categoryStats).map(([category, stats]) => {
                            const percentage = Math.round((stats.correct / stats.total) * 100);
                            return (
                              <div key={category} className="bg-white p-3 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium text-gray-900 capitalize">{category}</span>
                                  <span className={`font-bold ${
                                    percentage >= 80 ? 'text-green-600' :
                                    percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {percentage}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-500 ${
                                      percentage >= 80 ? 'bg-green-500' :
                                      percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {stats.correct}/{stats.total} acertos
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Improvement Suggestions */}
                <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200 mb-6">
                  <h4 className="text-lg font-bold text-yellow-900 mb-4 flex items-center gap-2">
                    💡 Dicas para Melhorar
                  </h4>
                  
                  <div className="space-y-3">
                    {generateImprovementSuggestions().map((suggestion, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.2 }}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border border-yellow-200"
                      >
                        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <p className="text-yellow-800 font-medium">{suggestion}</p>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
                    <p className="text-yellow-800 text-sm font-medium text-center">
                      🎯 Lembre-se: Cada erro é uma oportunidade de aprender algo novo! 
                      Continue praticando e você se tornará um verdadeiro gênio velocista! ⚡
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Detailed Review */}
              <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left">
                <h4 className="text-xl font-bold text-gray-900 mb-4 text-center">
                  📚 Revisão Completa das {total} Questões
                </h4>
                
                {/* Filter buttons */}
                <div className="flex justify-center gap-2 mb-6">
                  <button
                    onClick={() => setReviewFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      reviewFilter === 'all' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Todas ({questions.length})
                  </button>
                  <button
                    onClick={() => setReviewFilter('correct')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      reviewFilter === 'correct' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Acertos ({score})
                  </button>
                  <button
                    onClick={() => setReviewFilter('wrong')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      reviewFilter === 'wrong' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Erros ({total - score})
                  </button>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {questions.map((question, index) => {
                    const userAnswer = userAnswers[index];
                    const isCorrect = userAnswer === question.answer;
                    
                    // Filter logic
                    if (reviewFilter === 'correct' && !isCorrect) return null;
                    if (reviewFilter === 'wrong' && isCorrect) return null;
                    
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`p-4 rounded-lg border-2 ${
                          isCorrect 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                            isCorrect ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {index + 1}
                          </div>
                          
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900 mb-2">
                              {question.question}
                            </h5>
                            
                            <div className="text-sm space-y-2">
                              <div>
                                <span className="font-medium">Sua resposta: </span>
                                <span className={isCorrect ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                  {userAnswer}
                                </span>
                                {isCorrect && <span className="ml-2">✅</span>}
                                {!isCorrect && <span className="ml-2">❌</span>}
                              </div>
                              
                              {!isCorrect && (
                                <div>
                                  <span className="font-medium">Resposta correta: </span>
                                  <span className="text-green-600 font-bold">{question.answer}</span>
                                </div>
                              )}
                              
                              <div className="mt-3 p-3 bg-white rounded border">
                                <span className="font-medium text-blue-600">💡 Explicação: </span>
                                <span className="text-gray-700">{question.explanation}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              
              {/* Motivational Message */}
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-6 mb-6 text-center">
                <h4 className="text-2xl font-bold text-red-600 mb-3">
                  ⚡ Mensagem do Flash ⚡
                </h4>
                <p className="text-red-600 text-lg font-bold leading-relaxed">
                  {score >= 25 ? (
                    "Incrível, velocista! Você mostrou que tem o conhecimento de um verdadeiro herói! Continue estudando e você se tornará imbatível! 🏆⚡"
                  ) : score >= 20 ? (
                    "Excelente trabalho, jovem Flash! Você está no caminho certo. Com mais treino, você dominará todos os assuntos! 🌟💪"
                  ) : score >= 15 ? (
                    "Bom trabalho, herói! Você mostrou determinação. Continue praticando as áreas que precisa melhorar e logo estará voando! 🚀📚"
                  ) : score >= 10 ? (
                    "Todo grande herói começa assim! Você teve coragem de tentar. Agora é hora de treinar mais e voltar ainda mais forte! 💪🎯"
                  ) : (
                    "Ei, campeão! Mesmo o Flash precisou treinar muito para ser rápido. Use essas dicas para estudar e na próxima você vai arrasar! 🌈⚡"
                  )}
                </p>
              </div>
              
              <button
                onClick={resetQuiz}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all duration-200"
                style={{ fontFamily: 'Comic Neue, cursive' }}
              >
                Finalizar Missão! 🚀
              </button>
            </div>
          )}

          {questions.length > 0 && !showResults && !isGenerating && (
            <div>
              {/* Question */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-purple-600/10 to-purple-700/10 rounded-2xl p-8 mb-6 relative overflow-hidden">
                  {/* Question number indicator */}
                  <div className="absolute top-6 right-6 bg-yellow-400 text-purple-600 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                    {currentQuestion + 1}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-800 mb-4 pr-16" style={{ fontFamily: 'Comic Neue, cursive' }}>
                    {questions[currentQuestion]?.question}
                  </h3>
                </div>
                
                {/* Answers */}
                <div className="space-y-4">
                  {questions[currentQuestion]?.options?.map((option: string, index: number) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAnswerSelect(option)}
                      className={`w-full p-6 rounded-xl text-left transition-all duration-200 border-2 ${
                        selectedAnswer === option
                          ? 'border-purple-600 bg-purple-600/10 text-purple-600 shadow-lg'
                          : 'border-gray-200 hover:border-purple-600/50 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          selectedAnswer === option
                            ? 'border-purple-600 bg-purple-600'
                            : 'border-gray-300'
                        }`}>
                          {selectedAnswer === option && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CheckCircle className="w-5 h-5 text-white" />
                            </motion.div>
                          )}
                        </div>
                        <span className="font-medium text-lg" style={{ fontFamily: 'Comic Neue, cursive' }}>
                          {String.fromCharCode(65 + index)}) {option}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
              
              {/* Navigation */}
              <div className="flex justify-between items-center">
                <motion.button
                  whileHover={{ scale: currentQuestion > 0 ? 1.05 : 1 }}
                  whileTap={{ scale: currentQuestion > 0 ? 0.95 : 1 }}
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestion === 0}
                  className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-200 ${
                    currentQuestion > 0
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                  style={{ fontFamily: 'Comic Neue, cursive' }}
                >
                  <ChevronLeft className="w-5 h-5" />
                  Anterior
                </motion.button>
                
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">
                    Questão {currentQuestion + 1} de {questions.length}
                  </div>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: selectedAnswer ? 1.05 : 1 }}
                  whileTap={{ scale: selectedAnswer ? 0.95 : 1 }}
                  onClick={handleNextQuestion}
                  disabled={!selectedAnswer}
                  className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-200 ${
                    selectedAnswer
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  style={{ fontFamily: 'Comic Neue, cursive' }}
                >
                  {currentQuestion < questions.length - 1 ? (
                    <>
                      Próxima
                      <ChevronRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Finalizar
                      <Trophy className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SurpriseMissionQuiz;