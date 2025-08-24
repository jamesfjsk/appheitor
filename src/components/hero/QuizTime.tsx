@@ .. @@
 import React, { useState, useEffect } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
-import { X, ChevronRight, Trophy, Star, Zap, Brain, CheckCircle, XCircle } from 'lucide-react';
+import { X, ChevronRight, Trophy, Star, Zap, Brain, CheckCircle, XCircle, Clock, Play } from 'lucide-react';
 import { useData } from '../../contexts/DataContext';
 import { useAuth } from '../../contexts/AuthContext';
 import { useSound } from '../../contexts/SoundContext';
@@ .. @@
 
 interface QuizTimeProps {
-  isOpen: boolean;
-  onClose: () => void;
+  onComplete: () => void;
 }
 
-const QuizTime: React.FC<QuizTimeProps> = ({ isOpen, onClose }) => {
+const QuizTime: React.FC<QuizTimeProps> = ({ onComplete }) => {
   const { adjustUserXP, adjustUserGold } = useData();
   const { childUid } = useAuth();
   const { playTaskComplete, playLevelUp } = useSound();
   
+  const [showPrompt, setShowPrompt] = useState(false);
+  const [isOpen, setIsOpen] = useState(false);
   const [currentQuestion, setCurrentQuestion] = useState(0);
   const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
   const [userAnswers, setUserAnswers] = useState<string[]>([]);
@@ -25,6 +27,35 @@ const QuizTime: React.FC<QuizTimeProps> = ({ isOpen, onClose }) => {
   const [showResults, setShowResults] = useState(false);
   const [score, setScore] = useState(0);
 
+  // Check if quiz should be shown
+  useEffect(() => {
+    const checkQuizStatus = () => {
+      if (!childUid) return;
+      
+      const today = new Date().toISOString().split('T')[0];
+      const quizKey = `quiz_completed_${childUid}_${today}`;
+      const quizCompleted = localStorage.getItem(quizKey);
+      
+      if (!quizCompleted) {
+        // Show prompt after 3 seconds
+        const timer = setTimeout(() => {
+          setShowPrompt(true);
+        }, 3000);
+        
+        return () => clearTimeout(timer);
+      }
+    };
+    
+    checkQuizStatus();
+  }, [childUid]);
+
+  const handleStartQuiz = () => {
+    setShowPrompt(false);
+    setIsOpen(true);
+    generateQuestions();
+  };
+
+  const handlePostpone = () => {
+    setShowPrompt(false);
+    // Quiz will be prompted again on next login since it's not completed
+  };
+
   const generateQuestions = async () => {
     setIsGenerating(true);
     setError(null);
@@ .. @@
       
       // Mark quiz as completed for today
       const today = new Date().toISOString().split('T')[0];
       const quizKey = `quiz_completed_${childUid}_${today}`;
       localStorage.setItem(quizKey, 'true');
       
-      onClose();
+      setIsOpen(false);
+      onComplete();
     } catch (error: any) {
       console.error('❌ QuizTime: Error saving rewards:', error);
       toast.error('Erro ao salvar recompensas do quiz');
@@ .. @@
     setShowResults(false);
     setScore(0);
     setError(null);
-    generateQuestions();
+    setIsOpen(false);
+    onComplete();
   };
 
-  if (!isOpen) return null;
+  const closeQuiz = () => {
+    setIsOpen(false);
+    setShowPrompt(false);
+    // Don't mark as completed, so it will show again on next login
+  };
 
   return (
-    <motion.div
-      initial={{ opacity: 0 }}
-      animate={{ opacity: 1 }}
-      exit={{ opacity: 0 }}
-      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
-      onClick={(e) => e.target === e.currentTarget && onClose()}
-    >
+    <>
+      {/* Quiz Prompt */}
+      <AnimatePresence>
+        {showPrompt && (
+          <motion.div
+            initial={{ opacity: 0 }}
+            animate={{ opacity: 1 }}
+            exit={{ opacity: 0 }}
+            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
+          >
+            <motion.div
+              initial={{ scale: 0.8, opacity: 0, y: 50 }}
+              animate={{ scale: 1, opacity: 1, y: 0 }}
+              exit={{ scale: 0.8, opacity: 0, y: 50 }}
+              transition={{ duration: 0.5, ease: "easeOut" }}
+              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
+            >
+              {/* Header */}
+              <div className="bg-gradient-to-r from-hero-primary to-hero-secondary p-6 text-center relative overflow-hidden">
+                {/* Lightning effects */}
+                <motion.div
+                  animate={{
+                    x: ['-100%', '100%'],
+                    opacity: [0, 0.4, 0]
+                  }}
+                  transition={{
+                    duration: 2,
+                    repeat: Infinity,
+                    ease: "linear"
+                  }}
+                  className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent skew-x-12"
+                />
+                
+                <div className="relative z-10">
+                  <motion.div
+                    animate={{
+                      scale: [1, 1.1, 1],
+                      rotate: [0, 5, -5, 0]
+                    }}
+                    transition={{
+                      duration: 2,
+                      repeat: Infinity,
+                      ease: "easeInOut"
+                    }}
+                    className="w-20 h-20 bg-hero-accent rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-2xl"
+                  >
+                    <Brain className="w-10 h-10 text-hero-primary" />
+                  </motion.div>
+                  
+                  <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Comic Neue, cursive' }}>
+                    ⚡ Quiz Time! ⚡
+                  </h2>
+                  <p className="text-hero-accent font-bold text-lg">
+                    Prepare-se, herói!
+                  </p>
+                </div>
+              </div>
+              
+              {/* Content */}
+              <div className="p-6 text-center">
+                <p className="text-gray-700 text-lg mb-6 leading-relaxed" style={{ fontFamily: 'Comic Neue, cursive' }}>
+                  🧠 Hora do quiz diário! Teste seus conhecimentos e ganhe XP e Gold extras!
+                </p>
+                
+                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
+                  <div className="flex items-center justify-center gap-2 text-yellow-800 font-bold">
+                    <Trophy className="w-5 h-5" />
+                    <span>Recompensas por acertos:</span>
+                  </div>
+                  <div className="text-sm text-yellow-700 mt-2 space-y-1">
+                    <div>🏆 5 acertos: +25 XP, +15 Gold</div>
+                    <div>🥇 4 acertos: +20 XP, +12 Gold</div>
+                    <div>🥈 3 acertos: +15 XP, +8 Gold</div>
+                  </div>
+                </div>
+                
+                <div className="flex gap-3">
+                  <motion.button
+                    whileHover={{ scale: 1.02 }}
+                    whileTap={{ scale: 0.98 }}
+                    onClick={handleStartQuiz}
+                    className="flex-1 py-4 bg-gradient-to-r from-hero-primary to-hero-secondary text-white rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
+                    style={{ fontFamily: 'Comic Neue, cursive' }}
+                  >
+                    <Play className="w-6 h-6" />
+                    Vamos lá!
+                  </motion.button>
+                  
+                  <motion.button
+                    whileHover={{ scale: 1.02 }}
+                    whileTap={{ scale: 0.98 }}
+                    onClick={handlePostpone}
+                    className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
+                  >
+                    <Clock className="w-5 h-5" />
+                    Mais tarde
+                  </motion.button>
+                </div>
+              </div>
+            </motion.div>
+          </motion.div>
+        )}
+      </AnimatePresence>
+
+      {/* Quiz Modal */}
+      <AnimatePresence>
+        {isOpen && (
+          <motion.div
+            initial={{ opacity: 0 }}
+            animate={{ opacity: 1 }}
+            exit={{ opacity: 0 }}
+            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
+          >
       <motion.div
         initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
         animate={{ scale: 1, opacity: 1, rotateY: 0 }}
@@ .. @@
               <button
-                onClick={onClose}
+                onClick={closeQuiz}
                 className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
+                title="Fechar quiz (não será marcado como completo)"
               >
                 <X className="w-6 h-6" />
               </button>
@@ .. @@
           </motion.div>
         )}
       </AnimatePresence>
-    </motion.div>
+        )}
+      </AnimatePresence>
+    </>
   );
 };
 
 export default QuizTime;