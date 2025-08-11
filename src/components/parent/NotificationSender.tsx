import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Bell, MessageCircle, Zap } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import toast from 'react-hot-toast';

const NotificationSender: React.FC = () => {
  const { sendNotificationToChild } = useNotifications();
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const templates = [
    {
      id: 'reminder',
      title: '⏰ Lembrete de Missão',
      message: 'Heitor, não esqueça de completar suas missões de hoje!',
      icon: '⏰'
    },
    {
      id: 'motivation',
      title: '⚡ Motivação Flash',
      message: 'Você está indo muito bem, velocista! Continue assim!',
      icon: '⚡'
    },
    {
      id: 'reward',
      title: '🎁 Nova Recompensa',
      message: 'Uma nova recompensa foi adicionada na loja! Vá conferir!',
      icon: '🎁'
    },
    {
      id: 'bedtime',
      title: '🌙 Hora de Dormir',
      message: 'Hora de descansar, herói! Amanhã tem mais aventuras!',
      icon: '🌙'
    }
  ];

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Preencha título e mensagem');
      return;
    }

    try {
      await sendNotificationToChild({
        title,
        body: message,
        icon: '/vite.svg',
        tag: 'parent-message',
        requireInteraction: true
      });
      
      setTitle('');
      setMessage('');
      setSelectedTemplate('');
      toast.success('Notificação enviada para o Heitor!');
    } catch (error) {
      toast.error('Erro ao enviar notificação');
    }
  };

  const handleTemplateSelect = (template: typeof templates[0]) => {
    setTitle(template.title);
    setMessage(template.message);
    setSelectedTemplate(template.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Enviar Notificação para o Heitor
          </h3>
          <p className="text-sm text-gray-600">
            Envie lembretes ou mensagens motivacionais
          </p>
        </div>
      </div>

      {/* Templates */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Modelos Rápidos:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((template) => (
            <motion.button
              key={template.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTemplateSelect(template)}
              className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                selectedTemplate === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{template.icon}</span>
                <span className="font-medium text-gray-900 text-sm">
                  {template.title}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {template.message}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Custom Message Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título da Notificação
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: ⚡ Lembrete Flash"
            maxLength={50}
          />
          <p className="text-xs text-gray-500 mt-1">
            {title.length}/50 caracteres
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensagem
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="Digite sua mensagem motivacional..."
            rows={3}
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1">
            {message.length}/200 caracteres
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSendNotification}
          disabled={!title.trim() || !message.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Enviar Notificação
        </motion.button>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <MessageCircle className="w-4 h-4 text-blue-600 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-blue-900 mb-1">
              Dicas para notificações eficazes:
            </h5>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Use emojis para tornar mais divertido</li>
              <li>• Seja específico sobre a missão</li>
              <li>• Mantenha um tom positivo e motivacional</li>
              <li>• Evite enviar muitas notificações seguidas</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default NotificationSender;