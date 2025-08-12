import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Zap, Type, MessageCircle, Palette, AlertTriangle, Eye } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { FlashReminder } from '../../types';
import toast from 'react-hot-toast';

interface FlashReminderFormProps {
  reminder?: FlashReminder;
  onClose: () => void;
  isOpen: boolean;
}

const FlashReminderForm: React.FC<FlashReminderFormProps> = ({ reminder, onClose, isOpen }) => {
  const { addFlashReminder, updateFlashReminder } = useData();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    icon: '⚡',
    color: 'yellow' as FlashReminder['color'],
    priority: 'medium' as FlashReminder['priority'],
    active: true,
    showOnDashboard: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (reminder) {
      setFormData({
        title: reminder.title,
        message: reminder.message,
        icon: reminder.icon,
        color: reminder.color,
        priority: reminder.priority,
        active: reminder.active,
        showOnDashboard: reminder.showOnDashboard,
      });
    } else {
      setFormData({
        title: '',
        message: '',
        icon: '⚡',
        color: 'yellow',
        priority: 'medium',
        active: true,
        showOnDashboard: true,
      });
    }
    setErrors({});
  }, [reminder, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Título deve ter pelo menos 3 caracteres';
    } else if (formData.title.length > 30) {
      newErrors.title = 'Título deve ter no máximo 30 caracteres';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Mensagem é obrigatória';
    } else if (formData.message.length < 10) {
      newErrors.message = 'Mensagem deve ter pelo menos 10 caracteres';
    } else if (formData.message.length > 100) {
      newErrors.message = 'Mensagem deve ter no máximo 100 caracteres';
    }

    if (!formData.icon.trim()) {
      newErrors.icon = 'Ícone é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    const reminderData = {
      title: formData.title,
      message: formData.message,
      icon: formData.icon,
      color: formData.color,
      priority: formData.priority,
      active: formData.active,
      showOnDashboard: formData.showOnDashboard
    };

    if (reminder) {
      updateFlashReminder(reminder.id, reminderData).then(() => {
        onClose();
        toast.success('Lembrete atualizado com sucesso!');
      }).catch(() => {
        toast.error('Erro ao atualizar lembrete');
      });
    } else {
      addFlashReminder(reminderData).then(() => {
        onClose();
        toast.success('Lembrete criado com sucesso!');
      }).catch(() => {
        toast.error('Erro ao criar lembrete');
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const colorOptions = [
    { value: 'red', label: '🔴 Vermelho', preview: 'bg-red-500' },
    { value: 'yellow', label: '🟡 Amarelo', preview: 'bg-yellow-500' },
    { value: 'blue', label: '🔵 Azul', preview: 'bg-blue-500' },
    { value: 'green', label: '🟢 Verde', preview: 'bg-green-500' },
    { value: 'purple', label: '🟣 Roxo', preview: 'bg-purple-500' },
    { value: 'orange', label: '🟠 Laranja', preview: 'bg-orange-500' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Baixa', description: 'Lembrete sutil' },
    { value: 'medium', label: 'Média', description: 'Lembrete normal' },
    { value: 'high', label: 'Alta', description: 'Lembrete que pisca' },
  ];

  const iconSuggestions = [
    '⚡', '💧', '🦸', '🌬️', '😊', '🗂️', '📚', '🎯', '💪', '🧠',
    '⭐', '🔥', '💎', '🚀', '🌟', '⏰', '🎵', '🎨', '🏃', '🧘'
  ];

  const templates = [
    {
      title: 'Hidratação Flash',
      message: 'Beba água para manter sua energia de super-herói!',
      icon: '💧',
      color: 'blue' as const,
      priority: 'medium' as const
    },
    {
      title: 'Postura de Herói',
      message: 'Sente-se direito como um verdadeiro velocista!',
      icon: '🦸',
      color: 'red' as const,
      priority: 'low' as const
    },
    {
      title: 'Respiração Flash',
      message: 'Respire fundo e mantenha o foco nas missões!',
      icon: '🌬️',
      color: 'green' as const,
      priority: 'medium' as const
    },
    {
      title: 'Energia Positiva',
      message: 'Sorria! Você está fazendo um trabalho incrível!',
      icon: '😊',
      color: 'yellow' as const,
      priority: 'high' as const
    },
    {
      title: 'Organização Flash',
      message: 'Mantenha seu espaço organizado como a STAR Labs!',
      icon: '🗂️',
      color: 'purple' as const,
      priority: 'low' as const
    }
  ];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {reminder ? 'Editar Lembrete Flash' : 'Novo Lembrete Flash'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Templates */}
        {!reminder && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3">🚀 Templates Rápidos:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      title: template.title,
                      message: template.message,
                      icon: template.icon,
                      color: template.color,
                      priority: template.priority
                    });
                  }}
                  className="p-3 text-left border border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{template.icon}</span>
                    <span className="font-medium text-sm">{template.title}</span>
                  </div>
                  <p className="text-xs text-gray-600">{template.message}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Título */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Type className="w-4 h-4" />
              <span>Título do Lembrete *</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: Hidratação Flash"
              maxLength={30}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.title.length}/30 caracteres
            </p>
          </div>

          {/* Mensagem */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <MessageCircle className="w-4 h-4" />
              <span>Mensagem *</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors resize-none ${
                errors.message ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Mensagem motivacional curta e direta..."
              rows={3}
              maxLength={100}
            />
            {errors.message && (
              <p className="mt-1 text-sm text-red-600">{errors.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.message.length}/100 caracteres
            </p>
          </div>

          {/* Grid de configurações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ícone */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <span className="text-lg">🎨</span>
                <span>Ícone *</span>
              </label>
              
              <div className="flex items-center gap-4 mb-3">
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => handleInputChange('icon', e.target.value)}
                  className={`w-16 px-3 py-2 border rounded-lg text-center text-2xl ${
                    errors.icon ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="⚡"
                  maxLength={2}
                />
                <span className="text-sm text-gray-600">
                  Escolha um emoji
                </span>
              </div>
              
              {errors.icon && (
                <p className="mb-3 text-sm text-red-600">{errors.icon}</p>
              )}
              
              <div className="grid grid-cols-5 gap-2">
                {iconSuggestions.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => handleInputChange('icon', icon)}
                    className={`p-2 text-xl rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                      formData.icon === icon
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Palette className="w-4 h-4" />
                <span>Cor do Lembrete *</span>
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleInputChange('color', color.value)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-2 ${
                      formData.color === color.value
                        ? 'border-gray-800 bg-gray-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${color.preview}`}></div>
                    <span className="text-sm font-medium">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prioridade */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Prioridade *</span>
              </label>
              
              <div className="space-y-2">
                {priorityOptions.map((priority) => (
                  <label
                    key={priority.value}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority.value}
                      checked={formData.priority === priority.value}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="w-4 h-4 text-yellow-600 border-gray-300 focus:ring-yellow-500"
                    />
                    <div>
                      <div className="font-medium text-sm">{priority.label}</div>
                      <div className="text-xs text-gray-600">{priority.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Configurações */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                  className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  Lembrete ativo
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="showOnDashboard"
                  checked={formData.showOnDashboard}
                  onChange={(e) => handleInputChange('showOnDashboard', e.target.checked)}
                  className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                />
                <label htmlFor="showOnDashboard" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  Mostrar no painel do Heitor
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">👀 Preview:</h4>
            <div className={`
              bg-gradient-to-r ${
                formData.color === 'red' ? 'from-red-500 to-red-600 text-white' :
                formData.color === 'yellow' ? 'from-yellow-400 to-yellow-500 text-red-600' :
                formData.color === 'blue' ? 'from-blue-500 to-blue-600 text-white' :
                formData.color === 'green' ? 'from-green-500 to-green-600 text-white' :
                formData.color === 'purple' ? 'from-purple-500 to-purple-600 text-white' :
                'from-orange-500 to-orange-600 text-white'
              } rounded-xl p-4 relative overflow-hidden
              ${formData.priority === 'high' ? 'animate-pulse' : ''}
            `}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{formData.icon}</span>
                <div>
                  <h4 className="font-bold text-lg">{formData.title || 'Título do Lembrete'}</h4>
                  <p className="text-sm opacity-90">{formData.message || 'Mensagem do lembrete aparecerá aqui...'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center space-x-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{reminder ? 'Atualizar' : 'Criar'} Lembrete</span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default FlashReminderForm;