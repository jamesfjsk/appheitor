import React, { useState, useEffect } from 'react';
import { generateQuiz, loadQuizSession, saveQuizSession, clearQuizSession, getQuizHistory, rememberQuizQuestions, QuizSource } from '../../services/aiQuiz';
import { useAuth } from '../../contexts/AuthContext';
import { getTodayBrazil } from '../../utils/timezone';
import { motion } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSound } from '../../contexts/SoundContext';
import { SurpriseMissionQuestion } from '../../types';

const EMERALD = '/assets/english/ui/emerald.webp';
const STAR = '/assets/english/ui/star.webp';
const GOLD = '/assets/english/ui/gold.webp';

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
      return ['Perfeito. Você acertou tudo. Continue assim.'];
    }
    
    // Sort categories by most errors
    const sortedCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3); // Top 3 categories with most errors
    
    sortedCategories.forEach(([category, count]) => {
      switch (category) {
        case 'inglês':
          suggestions.push(`Inglês (${count} erros): pratique vocabulário básico com jogos e desenhos em inglês.`);
          break;
        case 'matemática':
          suggestions.push(`Matemática (${count} erros): treine cálculos mentais e tabuada brincando.`);
          break;
        case 'ciências':
          suggestions.push(`Ciências (${count} erros): explore curiosidades sobre animais e o corpo humano.`);
          break;
        case 'geografia/história':
          suggestions.push(`Geografia/História (${count} erros): descubra mais sobre o Brasil e o mundo.`);
          break;
        default:
          suggestions.push(`${category} (${count} erros): continue estudando e fazendo perguntas.`);
      }
    });
    
    // Add motivational message
    if (totalWrong <= 5) {
      suggestions.push('Você está quase lá. Poucos erros mostram que está aprendendo rápido.');
    } else if (totalWrong <= 10) {
      suggestions.push('Bom trabalho. Com mais prática você vai dominar tudo.');
    } else {
      suggestions.push('Todo minerador começa assim. Continue praticando que você vai longe.');
    }
    
    return suggestions;
  };

  const getPerformanceLevel = (score: number) => {
    const percentage = (score / (questions.length || 30)) * 100;
    
    if (percentage >= 90) return { level: 'Excepcional', color: 'mc-diamond' };
    if (percentage >= 80) return { level: 'Excelente', color: 'mc-good' };
    if (percentage >= 70) return { level: 'Muito Bom', color: 'mc-good' };
    if (percentage >= 60) return { level: 'Bom', color: 'mc-warn' };
    if (percentage >= 50) return { level: 'Regular', color: 'mc-warn' };
    return { level: 'Precisa melhorar', color: 'mc-bad' };
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
    
    if (percentage >= 90) return "Excepcional. Você mostrou que sabe de verdade.";
    if (percentage >= 80) return "Excelente. Performance de minerador experiente.";
    if (percentage >= 70) return "Muito bom. Você está evoluindo rápido.";
    if (percentage >= 60) return "Bom trabalho. Continue treinando.";
    if (percentage >= 50) return "Legal. Todo minerador enfrenta desafios.";
    return "Parabéns por enfrentar o desafio com coragem.";
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

  const themeLabel =
    surpriseMissionConfig.theme === 'english' ? 'Inglês' :
    surpriseMissionConfig.theme === 'math' ? 'Matemática' :
    surpriseMissionConfig.theme === 'general' ? 'Conhecimentos Gerais' :
    'Tudo Misturado';
  const difficultyLabel =
    surpriseMissionConfig.difficulty === 'easy' ? 'Fácil' :
    surpriseMissionConfig.difficulty === 'medium' ? 'Médio' :
    'Difícil';
  const goldGained = Math.round(surpriseMissionConfig.goldReward * 0.1) + Math.round((surpriseMissionConfig.goldReward * 0.9) * (score / total));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="mc-panel rounded-lg w-full max-w-4xl max-h-[95vh] overflow-hidden text-white"
      >
        <div className="p-4 border-b-4 border-[#17130f] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src={EMERALD} alt="" className="w-10 h-10 mc-pixel shrink-0" draggable={false} />
            <div className="min-w-0">
              <h2 className="mc-title text-sm">Missão Surpresa</h2>
              {questions.length > 0 && !showResults && (
                <p className="text-sm text-white/85 mt-1">Pergunta {currentQuestion + 1} de {questions.length}</p>
              )}
              {showResults && <p className="text-sm text-white/85 mt-1">Resultados da Missão Surpresa</p>}
              {isGenerating && <p className="text-sm text-white/85 mt-1">Gerando prova personalizada...</p>}
            </div>
          </div>
          <button type="button" onClick={resetQuiz} className="mc-btn mc-btn-dark w-11 h-11 p-0" title="Fechar missão">
            <X className="w-5 h-5" />
          </button>
        </div>
        {questions.length > 0 && !showResults && (
          <div className="px-4 pt-3">
            <div className="mc-bar">
              <div className="mc-bar-fill" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} />
            </div>
          </div>
        )}
        <div className="px-4 py-3 flex flex-wrap gap-2">
          <span className="mc-slot px-2 py-1 mc-font text-[8px] text-white">{themeLabel}</span>
          <span className="mc-slot px-2 py-1 mc-font text-[8px] text-white">{difficultyLabel}</span>
          <span className="mc-slot px-2 py-1 mc-font text-[8px] text-white">+{surpriseMissionConfig.xpReward} XP +{surpriseMissionConfig.goldReward} Gold</span>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(95vh-180px)]">
          {isGenerating && (
            <div className="text-center py-10">
              <img src={EMERALD} alt="" className="w-14 h-14 mx-auto mb-3 mc-pixel mc-build" draggable={false} />
              <p className="text-lg mb-2">Gerando sua missão surpresa personalizada...</p>
              <p className="text-sm mc-muted">A IA está criando {total} perguntas únicas.</p>
            </div>
          )}

          {error && (
            <div className="text-center py-10">
              <p className="mc-bad text-lg mb-4">{error}</p>
              <button type="button" onClick={generateQuestions} className="mc-btn mc-btn-green px-6 py-3 font-bold">
                Tentar novamente
              </button>
            </div>
          )}

          {showResults && (
            <div>
              <p className="mc-num text-center mb-1" style={{ fontSize: 28 }}>{score} de {questions.length}</p>
              <p className={`text-center font-bold mb-2 ${getPerformanceLevel(score).color}`}>{getPerformanceLevel(score).level}</p>
              <p className="text-center text-white/85 mb-4">{getPerformanceMessage(score)}</p>

              <div className="flex justify-center gap-3 mb-4">
                <span className="mc-slot flex items-center gap-1.5 px-3 py-2">
                  <img src={STAR} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
                  <span className="mc-font text-[9px] mc-good">+{surpriseMissionConfig.xpReward} XP</span>
                </span>
                <span className="mc-slot flex items-center gap-1.5 px-3 py-2">
                  <img src={GOLD} alt="" className="w-6 h-6 mc-pixel" draggable={false} />
                  <span className="mc-font text-[9px] mc-warn">+{goldGained} GOLD</span>
                </span>
              </div>
              <p className="text-center text-sm mc-muted mb-4">
                {Math.round((score / total) * 100)}% de aproveitamento
                {timeStarted && ` · ${Math.round((new Date().getTime() - timeStarted.getTime()) / 60000)} min`}
              </p>

              {(() => {
                const categoryStats: Record<string, { correct: number; total: number }> = {};
                detailedResults.forEach(result => {
                  const category = result.category || 'geral';
                  if (!categoryStats[category]) categoryStats[category] = { correct: 0, total: 0 };
                  categoryStats[category].total++;
                  if (result.isCorrect) categoryStats[category].correct++;
                });
                return Object.keys(categoryStats).length > 1 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {Object.entries(categoryStats).map(([category, stats]) => (
                      <div key={category} className="mc-slot p-2 text-center">
                        <div className="mc-num">{Math.round((stats.correct / stats.total) * 100)}%</div>
                        <div className="text-xs mc-muted capitalize">{category}</div>
                        <div className="mc-font text-[8px] text-white">{stats.correct}/{stats.total}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="mc-card rounded p-4 mb-4">
                <p className="font-bold mb-2">Dicas para melhorar</p>
                <div className="space-y-2">
                  {generateImprovementSuggestions().map((suggestion) => (
                    <p key={suggestion} className="text-sm text-white/85">{suggestion}</p>
                  ))}
                </div>
              </div>

              <div className="mc-inv rounded-lg p-3 mb-4">
                <p className="font-bold mb-3">Revisão das {total} questões</p>
                <div className="mc-hotbar mb-3">
                  {(['all', 'correct', 'wrong'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setReviewFilter(f)}
                      className={`mc-slot rounded text-[13px] min-h-[44px] ${reviewFilter === f ? 'mc-slot-selected' : ''}`}
                    >
                      {f === 'all' ? `Todas (${questions.length})` : f === 'correct' ? `Acertos (${score})` : `Erros (${total - score})`}
                    </button>
                  ))}
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {questions.map((question, index) => {
                    const userAnswer = userAnswers[index];
                    const isCorrect = userAnswer === question.answer;
                    if (reviewFilter === 'correct' && !isCorrect) return null;
                    if (reviewFilter === 'wrong' && isCorrect) return null;
                    return (
                      <div key={index} className={`mc-row rounded p-3 ${isCorrect ? 'is-done' : ''}`} style={!isCorrect ? { borderColor: '#b3261e' } : undefined}>
                        <p className="font-bold text-[15px] mb-1">{index + 1}. {question.question}</p>
                        <p className="text-sm">Sua resposta: {userAnswer}</p>
                        {!isCorrect && <p className="text-sm">Resposta correta: {question.answer}</p>}
                        <p className="text-sm mc-muted mt-1">{question.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mc-card rounded p-4 mb-4 text-center">
                <p className="text-white/90">
                  {score >= 25
                    ? 'Incrível. Você mostrou que tem o conhecimento de um minerador de verdade. Continue estudando.'
                    : score >= 20
                    ? 'Excelente trabalho. Você está no caminho certo. Com mais treino, você domina todos os assuntos.'
                    : score >= 15
                    ? 'Bom trabalho. Você mostrou determinação. Continue praticando as áreas que precisa melhorar.'
                    : score >= 10
                    ? 'Todo minerador começa assim. Você teve coragem de tentar. Agora é hora de treinar mais.'
                    : 'Mesmo o minerador mais experiente precisou treinar. Use as dicas e na próxima você vai melhor.'}
                </p>
              </div>

              <div className="text-center">
                <button type="button" onClick={resetQuiz} className="mc-btn mc-btn-green px-8 py-3 font-bold">
                  Finalizar missão
                </button>
              </div>
            </div>
          )}

          {questions.length > 0 && !showResults && !isGenerating && (
            <div>
              <h3 className="text-xl font-bold mb-4">{questions[currentQuestion]?.question}</h3>
              <div className="mc-inv rounded-lg p-3 space-y-2 mb-4">
                {questions[currentQuestion]?.options?.map((option: string, index: number) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAnswerSelect(option)}
                    className={`mc-row rounded p-4 w-full text-left ${selectedAnswer === option ? 'is-done' : ''}`}
                  >
                    {String.fromCharCode(65 + index)}) {option}
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestion === 0}
                  className="mc-btn mc-btn-stone px-4 py-3 font-bold min-h-[44px]"
                >
                  <ChevronLeft className="w-5 h-5 inline" /> Anterior
                </button>
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  disabled={!selectedAnswer}
                  className="mc-btn mc-btn-green px-4 py-3 font-bold min-h-[44px]"
                >
                  {currentQuestion < questions.length - 1 ? (
                    <>Próxima <ChevronRight className="w-5 h-5 inline" /></>
                  ) : (
                    'Finalizar'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SurpriseMissionQuiz;
