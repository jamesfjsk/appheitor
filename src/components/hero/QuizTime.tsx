import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Trophy, Star, Zap, Brain, CheckCircle, XCircle, Clock, Play } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';
import { FirestoreService } from '../../services/firestoreService';

interface QuizTimeProps {
  onComplete: () => void;
}

const QuizTime: React.FC<QuizTimeProps> = ({ onComplete }) => {
  const { adjustUserXP, adjustUserGold } = useData();
  const { childUid } = useAuth();
  const { playTaskComplete, playLevelUp } = useSound();
  
  // OpenAI API Key from environment variables
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  
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
      
      // Check quiz completion status from Firebase instead of localStorage
      checkQuizCompletionFromFirebase();
    };
    
    checkQuizStatus();
  }, [childUid]);

  const checkQuizCompletionFromFirebase = async () => {
    if (!childUid) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const quizCompleted = await FirestoreService.checkQuizCompletedToday(childUid, today);
      
      if (!quizCompleted) {
        // Show prompt after 3 seconds
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error checking quiz status:', error);
      // If error, don't show quiz to avoid issues
    }
  };

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
      // Try to generate questions with OpenAI first
      try {
        console.log('🧠 QuizTime: Generating questions with OpenAI...');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
{
  role: 'system',
  content: `
Você é um gerador de quiz educativo para o Heitor, um menino de 9 anos que adora lógica, ciência, perguntas que fazem pensar e entender o mundo.

Gere EXATAMENTE 5 perguntas de múltipla escolha em português brasileiro.

⚙️ TEMAS (1 pergunta de cada):
1. Inglês contextual (frases do dia a dia, dedução de significado)
2. Animais & comportamento (causas, hábitos, lógica da natureza)
3. Matemática com raciocínio (desafios de lógica e cálculos mentais simples)
4. Ciências com curiosidade (corpo, espaço, química, física leve)
5. Questão filosófica leve ou dilema de escolha (ética, convivência, valores)

🎯 FORMATO OBRIGATÓRIO – JSON VÁLIDO:
[
  {
    "question": "Pergunta aqui?",
    "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
    "answer": "Opção correta exata",
    "explanation": "Explicação clara, motivadora e educativa"
  }
]

📏 REGRAS:
- Linguagem acessível para criança de 9 anos, mas sem infantilizar
- Foco em raciocínio, observação, dedução e interpretação
- Nunca use linguagem boba, diminutiva ou simplificada demais
- Estimule a mente: não dê respostas óbvias, mas possíveis
- Apenas 1 opção correta por pergunta
- Explicações devem ensinar algo novo ou expandir o raciocínio

⚠️ PROIBIDO:
- Repetir perguntas entre chamadas
- Usar perguntas puramente decorativas ou de memorização vazia
- Criar questões que não provoquem reflexão, raciocínio ou aprendizado

`
},
              {
                role: 'user',
                content: 'Gere 5 perguntas de quiz educativo para o Heitor seguindo exatamente o formato JSON especificado.'
              }
            ],
            temperature: 0.8,
            max_tokens: 1500
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API Error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error('No content received from OpenAI');
        }

        // Parse JSON response
        const generatedQuestions = JSON.parse(content);
        
        if (!Array.isArray(generatedQuestions) || generatedQuestions.length !== 5) {
          throw new Error('Invalid questions format from OpenAI');
        }

        // Validate question structure
        const validQuestions = generatedQuestions.every(q => 
          q.question && 
          Array.isArray(q.options) && 
          q.options.length === 4 && 
          q.answer && 
          q.explanation
        );

        if (!validQuestions) {
          throw new Error('Invalid question structure from OpenAI');
        }

        console.log('✅ QuizTime: Questions generated successfully with OpenAI');
        setQuestions(generatedQuestions);
        
      } catch (openaiError: any) {
        console.warn('⚠️ QuizTime: OpenAI failed, using local questions:', openaiError.message);
        
        // Fallback to local questions
        const response = await fetch('/data/quizData.json');
        if (!response.ok) {
          throw new Error('Failed to load local quiz data');
        }
        
        const localQuestions = await response.json();
        
        // Shuffle and pick 5 random questions
        const shuffled = localQuestions.sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffled.slice(0, 5);
        
        console.log('✅ QuizTime: Using local questions as fallback');
        setQuestions(selectedQuestions);
      }
      
    } catch (error: any) {
      console.error('❌ QuizTime: Error generating questions:', error);
      setError('Erro ao carregar perguntas do quiz. Tente novamente.');
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
      
      // Calculate score based on correct answers
      answers.forEach((answer, index) => {
        if (questions[index] && answer === questions[index].answer) {
          correctAnswers++;
        }
      });
      
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
        goldReward = 10;
      } else if (correctAnswers >= 3) {
        xpReward = 15;
        goldReward = 8;
      } else if (correctAnswers >= 2) {
        xpReward = 10;
        goldReward = 5;
      } else if (correctAnswers >= 1) {
        xpReward = 5;
        goldReward = 3;
      } else {
        xpReward = 2;
        goldReward = 2; // Participation reward
      }
      
      if (xpReward > 0) {
        await adjustUserXP(xpReward);
        await adjustUserGold(goldReward);
        playTaskComplete();
        
        if (correctAnswers >= 4) {
          playLevelUp(); // Special sound for high scores
        }
      }
      
      // Mark quiz as completed for today
      if (childUid) {
        const today = new Date().toISOString().split('T')[0];
        await FirestoreService.markQuizCompletedToday(childUid, today, {
          score: correctAnswers,
          totalQuestions: questions.length,
          xpEarned: xpReward,
          goldEarned: goldReward,
          completedAt: new Date()
        });
      }
      
      // Don't close immediately, let user see results
      onComplete();
    } catch (error: any) {
      console.error('❌ QuizTime: Error saving rewards:', error);
      setError('Erro ao salvar recompensas do quiz');
    }
  };

  const getPerformanceMessage = (score: number) => {
    if (score === 5) return "🏆 PERFEITO! Você é um gênio, velocista!";
    if (score === 4) return "⚡ EXCELENTE! Quase perfeito, herói!";
    if (score === 3) return "🌟 MUITO BOM! Você está aprendendo rápido!";
    if (score === 2) return "💪 BOM TRABALHO! Continue praticando!";
    if (score === 1) return "🎯 LEGAL! Todo herói começa assim!";
    return "🌈 PARABÉNS! Você participou e isso é o mais importante!";
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 2) return 'text-yellow-600';
    return 'text-blue-600';
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
    setIsOpen(false);
    onComplete();
  };

  const closeQuiz = () => {
    setIsOpen(false);
    setShowPrompt(false);
    // Don't mark as completed, so it will show again on next login
  };

  const handleCloseResults = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Quiz Prompt */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -50 }}
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
                    <div>🥇 4 acertos: +20 XP, +10 Gold</div>
                    <div>🥈 3 acertos: +15 XP, +8 Gold</div>
                    <div>🥉 Participação: +2 XP, +2 Gold</div>
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
                      {questions.length > 0 && !showResults && (
                        <div className="flex items-center gap-2">
                          <p className="text-hero-accent font-medium">
                            Pergunta {currentQuestion + 1} de {questions.length}
                          </p>
                          <div className="w-20 bg-white/20 rounded-full h-2">
                            <div 
                              className="bg-hero-accent h-2 rounded-full transition-all duration-300"
                              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {showResults && (
                        <p className="text-hero-accent font-medium">
                          Resultados do Quiz
                        </p>
                      )}
                      {isGenerating && (
                        <p className="text-hero-accent font-medium">
                          Gerando perguntas...
                        </p>
                      )}
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
                      animate={{ 
                        rotate: 360,
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                      }}
                      className="w-16 h-16 bg-gradient-to-r from-hero-primary to-hero-secondary rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-hero-accent"
                    >
                      <Brain className="w-8 h-8 text-white" />
                    </motion.div>
                    <p className="text-gray-600 text-lg mb-2" style={{ fontFamily: 'Comic Neue, cursive' }}>
                      ⚡ Gerando perguntas incríveis para você...
                    </p>
                    <p className="text-gray-500 text-sm">
                      Criando 5 perguntas educativas personalizadas!
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
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="w-24 h-24 bg-gradient-to-r from-hero-primary to-hero-secondary rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-hero-accent"
                    >
                      <Trophy className="w-12 h-12 text-white" />
                    </motion.div>
                    
                    <h3 className="text-3xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'Comic Neue, cursive' }}>
                      Quiz Concluído! 🎉
                    </h3>
                    
                    <div className="bg-gradient-to-r from-hero-primary/10 to-hero-secondary/10 rounded-2xl p-6 mb-6">
                      <p className={`text-2xl font-bold mb-2 ${getScoreColor(score)}`}>
                        {score} de {questions.length} acertos
                      </p>
                      <p className="text-lg font-bold text-hero-primary mb-4">
                        {getPerformanceMessage(score)}
                      </p>
                      
                      <div className="flex justify-center gap-1 mb-4">
                        {Array.from({ length: questions.length }).map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.1 }}
                          >
                            <Star
                              className={`w-8 h-8 ${
                                i < score ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          </motion.div>
                        ))}
                      </div>
                      
                      {score > 0 && (
                        <div className="bg-white rounded-xl p-4 border border-hero-primary/20">
                          <p className="text-hero-primary font-bold mb-2">🎁 Recompensas Ganhas:</p>
                          <div className="flex justify-center gap-4 text-lg font-bold">
                            <div className="flex items-center gap-1 text-blue-600">
                              <Zap className="w-5 h-5" />
                              <span>+{score >= 5 ? 25 : score >= 4 ? 20 : score >= 3 ? 15 : score >= 2 ? 10 : score >= 1 ? 5 : 2} XP</span>
                            </div>
                            <div className="flex items-center gap-1 text-yellow-600">
                              <span className="text-xl">🪙</span>
                              <span>+{score >= 5 ? 12 : score >= 4 ? 10 : score >= 3 ? 8 : score >= 2 ? 5 : score >= 1 ? 3 : 2} Gold</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Review Table */}
                    <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-left">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 text-center">
                        📚 Revisão das Perguntas
                      </h4>
                      
                      <div className="space-y-4 max-h-64 overflow-y-auto">
                        {questions.map((question, index) => {
                          const userAnswer = userAnswers[index];
                          const isCorrect = userAnswer === question.answer;
                          
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={`p-4 rounded-lg border-2 ${
                                isCorrect 
                                  ? 'border-green-200 bg-green-50' 
                                  : 'border-red-200 bg-red-50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isCorrect ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                  {isCorrect ? (
                                    <CheckCircle className="w-5 h-5 text-white" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-white" />
                                  )}
                                </div>
                                
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900 mb-2">
                                    {index + 1}. {question.question}
                                  </h5>
                                  
                                  <div className="text-sm space-y-1">
                                    <div>
                                      <span className="font-medium">Sua resposta: </span>
                                      <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                                        {userAnswer}
                                      </span>
                                    </div>
                                    
                                    {!isCorrect && (
                                      <div>
                                        <span className="font-medium">Resposta correta: </span>
                                        <span className="text-green-600">{question.answer}</span>
                                      </div>
                                    )}
                                    
                                    <div className="mt-2 p-2 bg-white rounded border">
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
                    
                    <button
                      onClick={handleCloseResults}
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
                      <div className="bg-gradient-to-r from-hero-primary/10 to-hero-secondary/10 rounded-2xl p-6 mb-6 relative overflow-hidden">
                        {/* Question number indicator */}
                        <div className="absolute top-4 right-4 bg-hero-accent text-hero-primary w-8 h-8 rounded-full flex items-center justify-center font-bold">
                          {currentQuestion + 1}
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-800 mb-4 pr-12" style={{ fontFamily: 'Comic Neue, cursive' }}>
                          {questions[currentQuestion]?.question}
                        </h3>
                      </div>
                      
                      {/* Answers */}
                      <div className="space-y-3">
                        {questions[currentQuestion]?.options?.map((option: string, index: number) => (
                          <motion.button
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, x: 5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAnswerSelect(option)}
                            className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                              selectedAnswer === option
                                ? 'border-hero-primary bg-hero-primary/10 text-hero-primary shadow-lg'
                                : 'border-gray-200 hover:border-hero-primary/50 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                selectedAnswer === option
                                  ? 'border-hero-primary bg-hero-primary'
                                  : 'border-gray-300'
                              }`}>
                                {selectedAnswer === option && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <CheckCircle className="w-4 h-4 text-white" />
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
                    
                    {/* Next Button */}
                    <div className="flex justify-end">
                      <motion.button
                        whileHover={{ scale: selectedAnswer ? 1.05 : 1 }}
                        whileTap={{ scale: selectedAnswer ? 0.95 : 1 }}
                        onClick={handleNextQuestion}
                        disabled={!selectedAnswer}
                        className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-200 ${
                          selectedAnswer
                            ? 'bg-gradient-to-r from-hero-primary to-hero-secondary text-white hover:shadow-lg'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        style={{ fontFamily: 'Comic Neue, cursive' }}
                      >
                        {currentQuestion < questions.length - 1 ? (
                          <>
                            Próxima Pergunta
                            <ChevronRight className="w-5 h-5" />
                          </>
                        ) : (
                          <>
                            Ver Resultados
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
        )}
      </AnimatePresence>
    </>
  );
};

export default QuizTime;