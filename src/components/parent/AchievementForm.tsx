import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Trophy, Type, FileText, Target, Zap, Star } from 'lucide-react';
import { IconPicker } from '../../icons';
import { useData } from '../../contexts/DataContext';
import { Achievement } from '../../types';
import toast from 'react-hot-toast';

type AchievementTemplate = Pick<Achievement, 'title' | 'description' | 'icon' | 'type' | 'target' | 'xpReward' | 'goldReward'>;

interface AchievementFormProps {
  achievement?: Achievement | null;
  onClose: () => void;
  isOpen: boolean;
}

const AchievementForm: React.FC<AchievementFormProps> = ({ achievement, onClose, isOpen }) => {
  const { addAchievement, updateAchievement } = useData();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'trophy',
    type: 'tasks' as Achievement['type'],
    target: 1,
    xpReward: 25,
    goldReward: 15,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (achievement) {
      setFormData({
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        type: achievement.type,
        target: achievement.target,
        xpReward: achievement.xpReward,
        goldReward: achievement.goldReward,
        isActive: achievement.isActive,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        icon: 'trophy',
        type: 'tasks',
        target: 1,
        xpReward: 25,
        goldReward: 15,
        isActive: true,
      });
    }
    setErrors({});
  }, [achievement, isOpen]);

  // Listen for template usage
  useEffect(() => {
    const handleUseTemplate = (event: Event) => {
      const template = (event as CustomEvent<AchievementTemplate>).detail;
      setFormData({
        title: template.title,
        description: template.description,
        icon: template.icon,
        type: template.type,
        target: template.target,
        xpReward: template.xpReward,
        goldReward: template.goldReward,
        isActive: true,
      });
    };

    window.addEventListener('useTemplate', handleUseTemplate);
    return () => window.removeEventListener('useTemplate', handleUseTemplate);
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Título deve ter pelo menos 3 caracteres';
    } else if (formData.title.length > 50) {
      newErrors.title = 'Título deve ter no máximo 50 caracteres';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Descrição deve ter pelo menos 10 caracteres';
    } else if (formData.description.length > 200) {
      newErrors.description = 'Descrição deve ter no máximo 200 caracteres';
    }

    if (formData.target < 1 || formData.target > 10000) {
      newErrors.target = 'Meta deve estar entre 1 e 10.000';
    }

    if (formData.xpReward < 0 || formData.xpReward > 500) {
      newErrors.xpReward = 'Recompensa XP deve estar entre 0 e 500';
    }

    if (formData.goldReward < 0 || formData.goldReward > 1000) {
      newErrors.goldReward = 'Recompensa Gold deve estar entre 0 e 1.000';
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

    const achievementData = {
      title: formData.title,
      description: formData.description,
      icon: formData.icon,
      type: formData.type,
      target: formData.target,
      xpReward: formData.xpReward,
      goldReward: formData.goldReward,
      isActive: formData.isActive
    };

    if (achievement) {
      updateAchievement(achievement.id, achievementData).then(() => {
        onClose();
        toast.success('Conquista atualizada com sucesso!');
      }).catch(() => {
        toast.error('Erro ao atualizar conquista');
      });
    } else {
      addAchievement(achievementData).then(() => {
        onClose();
        toast.success('Conquista criada com sucesso!');
      }).catch(() => {
        toast.error('Erro ao criar conquista');
      });
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const typeOptions = [
    { value: 'xp', label: 'XP Total', description: 'Baseado no XP acumulado' },
    { value: 'level', label: 'Nível', description: 'Baseado no nível alcançado' },
    { value: 'tasks', label: 'Tarefas', description: 'Baseado em tarefas completadas' },
    { value: 'streak', label: 'Sequência', description: 'Baseado em dias consecutivos' },
    { value: 'checkin', label: 'Check-in', description: 'Baseado em check-ins diários' },
    { value: 'redemptions', label: 'Resgates', description: 'Baseado em recompensas resgatadas' },
    { value: 'custom', label: 'Personalizado', description: 'Conquista manual' },
  ];

  const getTargetSuggestions = () => {
    switch (formData.type) {
      case 'xp':
        return [100, 250, 500, 1000, 2000, 5000];
      case 'level':
        return [5, 10, 15, 25, 50, 75];
      case 'tasks':
        return [1, 5, 10, 25, 50, 100];
      case 'streak':
        return [3, 7, 14, 30, 60, 100];
      case 'checkin':
        return [7, 14, 30, 60, 100, 365];
      case 'redemptions':
        return [1, 3, 5, 10, 25, 50];
      default:
        return [1, 5, 10, 25, 50, 100];
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
            {achievement ? 'Editar Conquista' : 'Nova Conquista'}
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
              <span>Título da Conquista *</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: Primeiro Passo"
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
              <span>Descrição *</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Descreva o que o Heitor precisa fazer para conquistar..."
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
            {/* Tipo */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Trophy className="w-4 h-4" />
                <span>Tipo de Conquista *</span>
              </label>
              
              <div className="space-y-2">
                {typeOptions.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="type"
                      value={type.value}
                      checked={formData.type === type.value}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="w-4 h-4 text-yellow-600 border-gray-300 focus:ring-yellow-500"
                    />
                    <div>
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-600">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Ícone */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Trophy className="w-4 h-4" />
                <span>Ícone *</span>
              </label>
              <IconPicker
                value={formData.icon}
                onChange={(key) => handleInputChange('icon', key)}
                error={errors.icon}
              />
            </div>
          </div>

          {/* Meta e Recompensas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Meta */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Target className="w-4 h-4" />
                <span>Meta *</span>
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={formData.target}
                onChange={(e) => handleInputChange('target', parseInt(e.target.value) || 1)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                  errors.target ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.target && (
                <p className="mt-1 text-sm text-red-600">{errors.target}</p>
              )}
              
              {/* Target suggestions */}
              <div className="mt-2 flex flex-wrap gap-1">
                {getTargetSuggestions().map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleInputChange('target', suggestion)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      formData.target === suggestion
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* XP Reward */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span>Recompensa XP *</span>
              </label>
              <input
                type="number"
                min="0"
                max="500"
                value={formData.xpReward}
                onChange={(e) => handleInputChange('xpReward', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.xpReward ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.xpReward && (
                <p className="mt-1 text-sm text-red-600">{errors.xpReward}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">XP ganho ao completar</p>
            </div>

            {/* Gold Reward */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>Recompensa Gold *</span>
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                value={formData.goldReward}
                onChange={(e) => handleInputChange('goldReward', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                  errors.goldReward ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.goldReward && (
                <p className="mt-1 text-sm text-red-600">{errors.goldReward}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Gold ganho ao completar</p>
            </div>
          </div>

          {/* Status ativo */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Conquista ativa (será verificada automaticamente)
            </label>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">👀 Preview:</h4>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-xl">
                  {formData.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{formData.title || 'Título da Conquista'}</h4>
                  <p className="text-sm text-gray-600">{formData.description || 'Descrição da conquista...'}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="text-blue-600">+{formData.xpReward} XP</span>
                    <span className="text-yellow-600">+{formData.goldReward} Gold</span>
                    <span className="text-gray-500">Meta: {formData.target}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Explicação dos Tipos */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-900 mb-2">💡 Tipos de Conquista:</h5>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>XP Total:</strong> Verifica XP acumulado total</li>
              <li>• <strong>Nível:</strong> Verifica nível atual do usuário</li>
              <li>• <strong>Tarefas:</strong> Verifica total de tarefas completadas</li>
              <li>• <strong>Sequência:</strong> Verifica maior sequência de dias consecutivos</li>
              <li>• <strong>Check-in:</strong> Verifica dias consecutivos atuais</li>
              <li>• <strong>Resgates:</strong> Verifica total de recompensas resgatadas</li>
              <li>• <strong>Personalizado:</strong> Deve ser desbloqueado manualmente</li>
            </ul>
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
              <span>{achievement ? 'Atualizar' : 'Criar'} Conquista</span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AchievementForm;