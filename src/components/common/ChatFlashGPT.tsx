import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Zap, Maximize2, Minimize2, Trash2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatFlashGPT: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // OpenAI API Key from environment variables
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

  const SYSTEM_MESSAGE = `Você é o Gideon(referencia ao flash), um mentor super-herói baseado no Flash! Você está conversando com o Heitor, uma criança que usa um sistema gamificado de tarefas.

PERSONALIDADE:
- Seja sempre positivo, motivador e encorajador
- Use linguagem simples e divertida, apropriada para crianças
- Inclua emojis relacionados ao Flash (⚡🏃‍♂️💨🔥) nas suas respostas
- Seja detalhado mas caloroso - pode usar várias frases e parágrafos
- Chame o Heitor de "pequeno velocista", "herói", "campeão" ou "jovem Flash"

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
- Histórias motivacionais do Flash
- Dicas de estudo e concentração
- Importância da família e amizade

ESTILO DE RESPOSTA:
- Sempre comece com uma saudação energética
- Use metáforas relacionadas à velocidade e heroísmo
- Pode ser mais detalhado e explicativo agora
- Conte histórias curtas quando apropriado
- Termine com uma frase motivacional
- Mantenha o tom alegre e inspirador

Exemplo: "⚡ Olá, pequeno velocista! Que pergunta incrível! Sabe, quando eu era jovem como você, também precisava aprender sobre responsabilidade. Lembre-se: assim como eu preciso treinar minha velocidade todos os dias para proteger Central City, você precisa praticar seus bons hábitos para se tornar o herói da sua própria vida! Cada tarefa que você completa é como um treino que te deixa mais forte e mais preparado para os desafios. Continue correndo em direção aos seus objetivos, campeão! 🏃‍♂️💨"`;

  // Focus management
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            setIsOpen(false);
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isFullscreen]);

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
          max_tokens: 1000 // Increased from 200 to 1000 for more detailed responses
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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
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
            className={`fixed z-50 ${
              isFullscreen 
                ? 'inset-0' 
                : 'inset-0 flex items-center justify-center p-4'
            }`}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={(e) => e.target === e.currentTarget && !isFullscreen && setIsOpen(false)}
          >
            <motion.div
              ref={modalRef}
              initial={isFullscreen ? { scale: 1 } : { scale: 0.9, opacity: 0, y: 20 }}
              animate={isFullscreen ? { scale: 1 } : { scale: 1, opacity: 1, y: 0 }}
              exit={isFullscreen ? { scale: 1 } : { scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              role="dialog"
              aria-labelledby="chat-title"
              aria-describedby="chat-description"
              className={`${
                isFullscreen 
                  ? 'w-full h-full' 
                  : 'w-full max-w-2xl h-[700px]'
              } rounded-2xl shadow-2xl overflow-hidden flex flex-col`}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.2)'
              }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-500 p-4 text-white relative overflow-hidden flex-shrink-0">
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
                        Giedon -Cofre do Tempo!
                      </h2>
                      <p id="chat-description" className="text-yellow-300 text-sm">
                        Respostas detalhadas e motivação infinita ⚡
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Fullscreen Toggle */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleFullscreen}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                      title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-5 h-5" />
                      ) : (
                        <Maximize2 className="w-5 h-5" />
                      )}
                    </motion.button>

                    {/* Clear Chat */}
                    {messages.length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={clearChat}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        aria-label="Limpar conversa"
                        title="Limpar conversa"
                      >
                        <Trash2 className="w-5 h-5" />
                      </motion.button>
                    )}
                    
                    {/* Close Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setIsOpen(false);
                        setIsFullscreen(false);
                      }}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      aria-label="Fechar chat"
                      title="Fechar chat"
                    >
                      <X className="w-6 h-6" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                className={`flex-1 p-4 overflow-y-auto space-y-4 ${
                  isFullscreen ? 'max-h-none' : 'max-h-96'
                }`} 
                style={{ fontFamily: 'Comic Neue, cursive' }}
              >
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
                      className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-600 shadow-lg"
                    >
                      <Zap className="w-10 h-10 text-red-600" fill="currentColor" />
                    </motion.div>
                    <p className="text-gray-600 text-xl font-bold mb-2">
                      ⚡ Olá, Heitor! Sou o FlashGPT! ⚡
                    </p>
                    <p className="text-gray-500 text-base mt-2 max-w-md mx-auto leading-relaxed">
                      Estou aqui para te ajudar com suas missões, responder suas perguntas e te dar dicas de super-herói! 
                      Pode me perguntar qualquer coisa sobre estudos, responsabilidade, ou até curiosidades sobre velocidade! 🏃‍♂️💨
                    </p>
                    
                    {/* Suggested questions */}
                    <div className="mt-6 space-y-2">
                      <p className="text-sm font-semibold text-gray-700 mb-3">💡 Perguntas que você pode fazer:</p>
                      <div className="grid grid-cols-1 gap-2 max-w-lg mx-auto">
                        {[
                          "Como posso me motivar para fazer as tarefas?",
                          "Me conte uma curiosidade sobre velocidade!",
                          "Dicas para me concentrar nos estudos?",
                          "Como ser mais organizado?"
                        ].map((suggestion, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setInputValue(suggestion)}
                            className="text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 text-sm text-blue-700 transition-colors"
                          >
                            {suggestion}
                          </motion.button>
                        ))}
                      </div>
                    </div>
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
                        className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-red-600 shadow-md flex-shrink-0 mt-1"
                      >
                        <Zap className="w-6 h-6 text-red-600" fill="currentColor" />
                      </motion.div>
                    )}
                    
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'order-first' : ''}`}>
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
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-1 border-2 border-white shadow-md">
                        <img 
                          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThmdGPdw5KIVi5gQ-UWFdptTPziXMRjk6phx4Noy3Toh9Nu_nbnP-YZGe9sdfP0jrVakc&usqp=CAU"
                          alt="Avatar do Heitor"
                          className="w-full h-full object-cover rounded-full"
                        />
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
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-red-600 shadow-md mt-1">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap className="w-6 h-6 text-red-600" fill="currentColor" />
                      </motion.div>
                    </div>
                    <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm max-w-[85%]">
                      <div className="flex gap-1 mb-2">
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
                      <p className="text-xs text-gray-600">
                        Gideon está pensando em uma resposta incrível...
                      </p>
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
              <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua pergunta aqui... (pode ser bem detalhada!)"
                      disabled={isLoading}
                      rows={isFullscreen ? 3 : 2}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed resize-none ${
                        isFullscreen ? 'text-base' : 'text-sm'
                      }`}
                      style={{ fontFamily: 'Comic Neue, cursive' }}
                      maxLength={2000} // Increased from 500 to 2000
                      aria-label="Digite sua mensagem para o FlashGPT"
                    />
                    
                    {/* Character counter */}
                    <div className="flex justify-between items-center mt-2 px-2">
                      <p className="text-xs text-gray-500">
                        {inputValue.length}/2000 caracteres
                      </p>
                      
                      {/* Character count indicator */}
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          inputValue.length < 1600 ? 'bg-green-400' :
                          inputValue.length < 1800 ? 'bg-yellow-400' :
                          'bg-red-400'
                        }`} />
                        <span className={`text-xs font-medium ${
                          inputValue.length < 1600 ? 'text-green-600' :
                          inputValue.length < 1800 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {inputValue.length < 1600 ? 'Ótimo' :
                           inputValue.length < 1800 ? 'Quase no limite' :
                           'Muito longo'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Tip for longer messages */}
                    {inputValue.length > 100 && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-xs text-blue-600 mt-1 px-2"
                      >
                        💡 Ótimo! Perguntas detalhadas me ajudam a dar respostas ainda melhores!
                      </motion.p>
                    )}
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className={`${
                      isFullscreen ? 'w-16 h-16' : 'w-12 h-12'
                    } bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                    aria-label="Enviar mensagem"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap className={`${isFullscreen ? 'w-8 h-8' : 'w-6 h-6'} text-red-600`} />
                      </motion.div>
                    ) : (
                      <Send className={`${isFullscreen ? 'w-8 h-8' : 'w-6 h-6'} text-red-600`} />
                    )}
                  </motion.button>
                </div>

                {/* Enhanced tips for fullscreen mode */}
                {isFullscreen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-blue-900 mb-1">
                          💡 Dicas para conversar com o Gideon:
                        </h4>
                        <ul className="text-xs text-blue-700 space-y-1">
                          <li>• Faça perguntas detalhadas - agora posso dar respostas muito completas!</li>
                          <li>• Pergunte sobre estudos, organização, motivação ou curiosidades</li>
                          <li>• Use Shift+Enter para quebrar linha, Enter para enviar</li>
                          <li>• Posso te ajudar com dever de casa, dicas de concentração e muito mais!</li>
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* API Key warning */}
                {!OPENAI_API_KEY && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-600" />
                      <p className="text-xs text-yellow-700">
                        <strong>Aviso:</strong> API Key do OpenAI não configurada. Configure VITE_OPENAI_API_KEY no arquivo .env para ativar o chat.
                      </p>
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

export default ChatFlashGPT;