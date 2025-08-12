import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Clock, Zap, Calendar, Type, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';

interface TaskFormProps {
  task?: any;
  onClose: () => void;
  isOpen: boolean;
}

const TaskForm: React.FC<TaskFormProps> = ({ task, onClose, isOpen }) => {
  const { addTask, updateTask } = useData();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    xpReward: 10,
    goldReward: 5,
    period: 'morning' as 'morning' | 'afternoon' | 'evening',
    dueTime: '',
    frequency: 'daily' as 'daily' | 'weekly' | 'custom',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        xpReward: task.xpReward || 10,
        goldReward: task.goldReward || 5,
        period: task.period,
        dueTime: task.dueTime || '',
        frequency: task.frequency,
        frequency: task.frequency || 'daily',
        isActive: task.isActive,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        xpReward: 10,
        goldReward: 5,
        period: 'morning',
        dueTime: '',
        frequency: 'daily',
        frequency: 'daily',
        isActive: true,
      });
    }
    setErrors({});
  }, [task, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Título deve ter pelo menos 3 caracteres';
    } else if (formData.title.length > 50) {
      newErrors.title = 'Título deve ter no máximo 50 caracteres';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Descrição deve ter no máximo 200 caracteres';
    }

    if (formData.xpReward < 1 || formData.xpReward > 50) {
      newErrors.xpReward = 'XP deve estar entre 1 e 50';
    }

    if (formData.goldReward < 1 || formData.goldReward > 100) {
      newErrors.goldReward = 'Gold deve estar entre 1 e 100';
    }

    if (formData.dueTime) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(formData.dueTime)) {
        newErrors.dueTime = 'Formato de horário inválido (HH:MM)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    console.log('📝 TaskForm: Salvando tarefa', { task: !!task, formData });

    const taskData = {
      ...formData,
      xp: formData.xpReward,
      gold: formData.goldReward,
      status: 'pending',
    };

    if (task) {
      updateTask(task.id, taskData).then(() => {
        onClose();
        toast.success('Tarefa atualizada com sucesso!');
      }).catch(() => {
        toast.error('Erro ao atualizar tarefa');
      });
    } else {
      addTask(taskData).then(() => {
        onClose();
        toast.success('Tarefa criada com sucesso!');
      }).catch(() => {
        toast.error('Erro ao criar tarefa');
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'morning': return 'Manhã 🌅';
      case 'afternoon': return 'Tarde ☀️';
      case 'evening': return 'Noite 🌙';
      default: return period;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Diária';
      case 'weekday': return 'Dias de Semana (Seg-Sex)';
      case 'weekend': return 'Fim de Semana (Sáb-Dom)';
      default: return frequency;
    }
  };

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
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Título */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Type className="w-4 h-4" />
              <span>Título da Tarefa *</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: Escovar os dentes"
              maxLength={50}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.title.length}/50 caracteres
            </p>
          </div>

          {/* Descrição */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              <span>Descrição (opcional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Detalhes adicionais sobre a tarefa..."
              rows={3}
              maxLength={200}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.description.length}/200 caracteres
            </p>
          </div>

          {/* Grid de configurações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* XP Reward */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span>XP (Experiência) *</span>
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.xpReward}
                onChange={(e) => handleInputChange('xpReward', parseInt(e.target.value) || 10)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.xpReward ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.xpReward && (
                <p className="mt-1 text-sm text-red-600">{errors.xpReward}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">XP fixo por completar (1-50)</p>
            </div>

            {/* Gold Reward */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <span className="w-4 h-4 text-yellow-500">🪙</span>
                <span>Gold (Moedas) *</span>
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.goldReward}
                onChange={(e) => handleInputChange('goldReward', parseInt(e.target.value) || 5)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                  errors.goldReward ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.goldReward && (
                <p className="mt-1 text-sm text-red-600">{errors.goldReward}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Gold para comprar recompensas (1-100)</p>
            </div>

            {/* Horário */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Horário (opcional)</span>
              </label>
              <input
                type="time"
                value={formData.dueTime}
                onChange={(e) => handleInputChange('dueTime', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.dueTime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.dueTime && (
                <p className="mt-1 text-sm text-red-600">{errors.dueTime}</p>
              )}
            </div>

            {/* Período */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-green-500" />
                <span>Período *</span>
              </label>
              <select
                value={formData.period}
                onChange={(e) => handleInputChange('period', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="morning">{getPeriodLabel('morning')}</option>
                <option value="afternoon">{getPeriodLabel('afternoon')}</option>
                <option value="evening">{getPeriodLabel('evening')}</option>
              </select>
            </div>

            {/* Frequência */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span>Frequência *</span>
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => handleInputChange('frequency', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="daily">{getFrequencyLabel('daily')}</option>
                <option value="weekday">{getFrequencyLabel('weekday')}</option>
                <option value="weekend">{getFrequencyLabel('weekend')}</option>
              </select>
            </div>
          </div>

          {/* Status ativo */}
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Tarefa ativa (aparecerá no painel do Heitor)
            </label>
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
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{task ? 'Atualizar' : 'Criar'} Tarefa</span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default TaskForm;