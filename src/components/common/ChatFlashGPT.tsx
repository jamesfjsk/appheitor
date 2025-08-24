import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Zap } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatFlashGPT: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // OpenAI API Key from environment variables
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

  const SYSTEM_MESSAGE = `Você é o FlashGPT, um mentor super-herói baseado no Flash! Você está conversando com o Heitor, uma criança que usa um sistema gamificado de tarefas.

PERSONALIDADE:
- Seja sempre positivo, motivador e encorajador
- Use linguagem simples e divertida, apropriada para crianças
- Inclua emojis relacionados ao Flash (⚡🏃‍♂️💨🔥) nas suas respostas
- Seja breve mas caloroso - máximo 2-3 frases por resposta
- Chame o Heitor de "pequeno velocista", "herói" ou "campeão"

CONTEXTO:
- O Heitor tem um sistema de missões diárias (tarefas)
- Ele ganha XP e Gold ao completar tarefas
- Pode resgatar recompensas na loja com Gold
- Tem um sistema de níveis e conquistas
- O tema é super-heróico do Flash

TÓPICOS QUE VOCÊ PODE AJUDAR:
- Motivação para completar tarefas
- Dicas de organização e responsabilidade
- Celebrar conquistas e progressos
- Explicar a importância de bons hábitos
- Contar curiosidades sobre velocidade e ciência (de forma simples)
- Dar conselhos sobre persistência e disciplina

ESTILO DE RESPOSTA:
- Sempre comece com uma saudação energética
- Use metáforas relacionadas à velocidade e heroísmo
- Termine com uma frase motivacional
- Mantenha o tom alegre e inspirador

Exemplo: "⚡ Olá, pequeno velocista! Que pergunta incrível! Lembre-se: assim como eu preciso treinar minha velocidade todos os dias, você precisa praticar seus bons hábitos! Continue correndo em direção aos seus objetivos! 🏃‍♂️💨"`;

  // Focus trap
  useEffect(() => {
    if (isOpen) {
      // Focus no input quando abrir
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }

        if (e.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll(
            'button, input, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (e.shiftKey) {
              if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
              }
            } else {
              if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
              }
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_MESSAGE },
            ...messages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: userMessage.content }
          ],
          temperature: 0.8,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('❌ ChatFlashGPT: Error calling OpenAI API:', error);
      setError('Ops! Algo deu errado. Tente novamente em alguns segundos.');
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚡ Ops! Meus poderes de velocidade falharam por um momento. Tente novamente, pequeno herói! 🦸‍♂️',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
        style={{
          boxShadow: '0 4px 12px rgba(200, 16, 46, 0.3), 0 2px 6px rgba(0, 0, 0, 0.1)'
        }}
        title="Conversar com FlashGPT"
        aria-label="Abrir chat com FlashGPT"
      >
        <motion.div
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <MessageCircle className="w-8 h-8 text-red-600 group-hover:text-red-700" fill="currentColor" />
        </motion.div>
        
        {/* Lightning effect */}
        <motion.div
          animate={{
            opacity: [0, 0.8, 0],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-yellow-400 rounded-full opacity-20"
        />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              role="dialog"
              aria-labelledby="chat-title"
              aria-describedby="chat-description"
              className="w-full max-w-md h-[600px] rounded-2xl shadow-2xl overflow-hidden"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.2)'
              }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-500 p-4 text-white relative overflow-hidden">
                {/* Lightning background effect */}
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
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent skew-x-12"
                />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white shadow-lg"
                    >
                      <Zap className="w-6 h-6 text-red-600" fill="currentColor" />
                    </motion.div>
                    <div>
                      <h2 id="chat-title" className="text-xl font-bold" style={{ fontFamily: 'Comic Neue, cursive' }}>
                        Converse com o FlashGPT!
                      </h2>
                      <p id="chat-description" className="text-yellow-300 text-sm">
                        Seu mentor super-herói pessoal ⚡
                      </p>
                    </div>
                  </div>
                  
                  <button
                    ref={firstFocusableRef}
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    aria-label="Fechar chat"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto max-h-96 space-y-4" style={{ fontFamily: 'Comic Neue, cursive' }}>
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
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
                      className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-600 shadow-lg"
                    >
                      <Zap className="w-8 h-8 text-red-600" fill="currentColor" />
                    </motion.div>
                    <p className="text-gray-600 text-lg font-bold">
                      ⚡ Olá, Heitor! Sou o FlashGPT! ⚡
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      Estou aqui para te ajudar com suas missões e responder suas perguntas!
                    </p>
                  </motion.div>
                )}

                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Avatar do FlashGPT */}
                    {message.role === 'assistant' && (
                      <motion.div
                        animate={{
                          scale: [1, 1.05, 1],
                          rotate: [0, 2, -2, 0]
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-red-600 shadow-md flex-shrink-0"
                      >
                        <Zap className="w-5 h-5 text-red-600" fill="currentColor" />
                      </motion.div>
                    )}
                    
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-sm ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white ml-auto'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                        style={{
                          borderRadius: message.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem'
                        }}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-1 px-2">
                        {message.timestamp.toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>

                    {/* Avatar do usuário */}
                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        H
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-red-600 shadow-md">
                      <Zap className="w-5 h-5 text-red-600" fill="currentColor" />
                    </div>
                    <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                      <div className="flex gap-1">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-lg p-3 text-center"
                  >
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua pergunta aqui..."
                      disabled={isLoading}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      style={{ fontFamily: 'Comic Neue, cursive' }}
                      maxLength={500}
                      aria-label="Digite sua mensagem para o FlashGPT"
                    />
                    <p className="text-xs text-gray-500 mt-1 px-2">
                      {inputValue.length}/500 caracteres
                    </p>
                  </div>
                  
                  <motion.button
                    ref={lastFocusableRef}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="w-12 h-12 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    aria-label="Enviar mensagem"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap className="w-6 h-6 text-red-600" />
                      </motion.div>
                    ) : (
                      <Send className="w-6 h-6 text-red-600" />
                    )}
                  </motion.button>
                </div>

                {/* Clear chat button */}
                {messages.length > 0 && (
                  <div className="mt-3 text-center">
                    <button
                      onClick={clearChat}
                      className="text-xs text-gray-500 hover:text-gray-700 underline transition-colors"
                    >
                      Limpar conversa
                    </button>
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

export default ChatFlashGPT;