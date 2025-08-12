import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Gift, Star, Type, FileText } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Reward } from '../../types';
import { LEVEL_REWARD_TEMPLATES } from '../../utils/rewardLevels';
import toast from 'react-hot-toast';

interface RewardFormProps {
  reward?: Reward;
  initialData?: any;
  onClose: () => void;
  isOpen: boolean;
}

  const { addReward, updateReward } = useData();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goldCost: 50,
    icon: '🎁',
    category: 'custom' as Reward['category'],
    requiredLevel: 1,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (reward) {
      setFormData({
        title: reward.title,
        description: reward.description,
        goldCost: reward.goldCost || 50,
        icon: reward.icon,
        category: reward.category,
        requiredLevel: reward.requiredLevel || 1,
        isActive: reward.isActive,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        goldCost: 50,
        icon: '🎁',
        category: 'custom',
        requiredLevel: 1,
        isActive: true,
      });
    }
    setErrors({});
  }, [reward, isOpen]);

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

    if (formData.goldCost && (formData.goldCost < 5 || formData.goldCost > 10000)) {
      newErrors.goldCost = 'Gold deve estar entre 5 e 10.000';
    }

    if (formData.requiredLevel < 1 || formData.requiredLevel > 100) {
      newErrors.requiredLevel = 'Nível deve estar entre 1 e 100';
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

    const rewardData = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      costGold: formData.goldCost,
      emoji: formData.icon,
      requiredLevel: formData.requiredLevel,
      active: formData.isActive === true
    };

    if (reward) {
      updateReward(reward.id, rewardData).then(() => {
        onClose();
        toast.success('Recompensa atualizada com sucesso!');
      }).catch(() => {
        toast.error('Erro ao atualizar recompensa');
      });
    } else {
      addReward(rewardData).then(() => {
        onClose();
        toast.success('Recompensa criada com sucesso!');
      }).catch(() => {
        toast.error('Erro ao criar recompensa');
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

  const categoryOptions = [
    { value: 'toy', label: '🧸 Brinquedos' },
    { value: 'activity', label: '🎮 Atividades' },
    { value: 'treat', label: '🍭 Guloseimas' },
    { value: 'privilege', label: '👑 Privilégios' },
    { value: 'custom', label: '⭐ Personalizado' },
  ];

  const iconSuggestions = [
    '🎁', '🏆', '🎮', '🍦', '🍕', '🎬', '📱', '🎨', '⚽', '🎵',
    '🚗', '🧸', '📚', '🍭', '🎪', '🎯', '🎲', '🎸', '🎤', '🎭'
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
            {reward ? 'Editar Recompensa' : 'Nova Recompensa'}
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
              <span>Título da Recompensa *</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: 30 minutos de videogame extra"
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
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Descreva detalhadamente a recompensa..."
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gold Cost */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <span className="w-4 h-4 text-yellow-500">🪙</span>
                <span>Custo em Gold *</span>
              </label>
              <input
                type="number"
                min="5"
                max="10000"
                step="5"
                value={formData.goldCost}
                onChange={(e) => handleInputChange('goldCost', parseInt(e.target.value) || 5)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.goldCost ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.goldCost && (
                <p className="mt-1 text-sm text-red-600">{errors.goldCost}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Entre 5 e 10000 Gold</p>
            </div>

            {/* Required Level */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <span className="w-4 h-4 text-purple-500">🏆</span>
                <span>Nível Necessário *</span>
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.requiredLevel}
                onChange={(e) => handleInputChange('requiredLevel', parseInt(e.target.value) || 1)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                  errors.requiredLevel ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.requiredLevel && (
                <p className="mt-1 text-sm text-red-600">{errors.requiredLevel}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Nível 1-100 para desbloquear</p>
            </div>
            {/* Categoria */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Gift className="w-4 h-4 text-purple-500" />
                <span>Categoria *</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ícone */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <span className="text-lg">🎨</span>
              <span>Ícone da Recompensa *</span>
            </label>
            
            <div className="flex items-center gap-4 mb-3">
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => handleInputChange('icon', e.target.value)}
                className={`w-20 px-3 py-2 border rounded-lg text-center text-2xl ${
                  errors.icon ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="🎁"
                maxLength={2}
              />
              <span className="text-sm text-gray-600">
                Escolha um emoji que represente a recompensa
              </span>
            </div>
            
            {errors.icon && (
              <p className="mb-3 text-sm text-red-600">{errors.icon}</p>
            )}
            
            <div className="grid grid-cols-10 gap-2">
              {iconSuggestions.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleInputChange('icon', icon)}
                  className={`p-2 text-2xl rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                    formData.icon === icon
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Status ativo */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">💡 Sugestões de Níveis:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div><strong>Níveis 1-10:</strong> Guloseimas básicas (15-60 Gold)</div>
                <div><strong>Níveis 11-25:</strong> Tempo de tela, escolhas (40-75 Gold)</div>
                <div><strong>Níveis 26-50:</strong> Atividades, brinquedos pequenos (100-250 Gold)</div>
              </div>
              <div className="space-y-2">
                <div><strong>Níveis 51-75:</strong> Brinquedos médios, roupas (300-800 Gold)</div>
                <div><strong>Níveis 76-90:</strong> Eletrônicos, passeios (600-1500 Gold)</div>
                <div><strong>Níveis 91-100:</strong> Recompensas épicas (1800-2500 Gold)</div>
              </div>
            </div>
            
            <div className="mt-3 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Dica:</strong> Defina o nível necessário baseado no valor da recompensa. 
                Recompensas mais valiosas devem ter níveis mais altos para manter a motivação!
              </p>
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
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{reward ? 'Atualizar' : 'Criar'} Recompensa</span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export { RewardForm };