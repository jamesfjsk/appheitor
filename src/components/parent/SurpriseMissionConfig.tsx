import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Zap, Target, BookOpen, Calculator, Globe, Shuffle, AlertTriangle, Star, Trophy } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { SurpriseMissionConfig } from '../../types';
import toast from 'react-hot-toast';

const SurpriseMissionConfigComponent: React.FC = () => {
  const { surpriseMissionConfig, updateSurpriseMissionSettings, surpriseMissionHistory } = useData();
  const [formData, setFormData] = useState({
    isEnabled: false,
    theme: 'mixed' as SurpriseMissionConfig['theme'],
    difficulty: 'medium' as SurpriseMissionConfig['difficulty'],
    xpReward: 50,
    goldReward: 25,
    questionsCount: 30
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (surpriseMissionConfig) {
      setFormData({
        isEnabled: surpriseMissionConfig.isEnabled,
        theme: surpriseMissionConfig.theme,
        difficulty: surpriseMissionConfig.difficulty,
        xpReward: surpriseMissionConfig.xpReward,
        goldReward: surpriseMissionConfig.goldReward,
        questionsCount: surpriseMissionConfig.questionsCount
      });
    }
  }, [surpriseMissionConfig]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.xpReward < 10 || formData.xpReward > 500) {
      newErrors.xpReward = 'XP deve estar entre 10 e 500';
    }

    if (formData.goldReward < 5 || formData.goldReward > 200) {
      newErrors.goldReward = 'Gold deve estar entre 5 e 200';
    }

    if (formData.questionsCount !== 30) {
      newErrors.questionsCount = 'Número de questões deve ser 30';
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

    setIsSaving(true);
    
    try {
      await updateSurpriseMissionSettings(formData);
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const themeOptions = [
    { 
      value: 'english', 
      label: '🇺🇸 Inglês', 
      icon: BookOpen, 
      description: 'Vocabulário, gramática básica e conversação',
      color: 'bg-blue-100 text-blue-800'
    },
    { 
      value: 'math', 
      label: '🔢 Matemática', 
      icon: Calculator, 
      description: 'Operações básicas, formas geométricas e problemas',
      color: 'bg-green-100 text-green-800'
    },
    { 
      value: 'general', 
      label: '🌍 Conhecimentos Gerais', 
      icon: Globe, 
      description: 'Ciências, história, geografia e cultura geral',
      color: 'bg-purple-100 text-purple-800'
    },
    { 
      value: 'mixed', 
      label: '🎲 Tudo Misturado', 
      icon: Shuffle, 
      description: 'Mistura de todos os temas para desafio completo',
      color: 'bg-orange-100 text-orange-800'
    }
  ];

  const difficultyOptions = [
    { 
      value: 'easy', 
      label: '😊 Fácil', 
      description: 'Perguntas básicas adequadas para a idade',
      color: 'bg-green-100 text-green-800',
      xpSuggestion: 30,
      goldSuggestion: 15
    },
    { 
      value: 'medium', 
      label: '🤔 Médio', 
      description: 'Perguntas de nível intermediário com desafio',
      color: 'bg-yellow-100 text-yellow-800',
      xpSuggestion: 50,
      goldSuggestion: 25
    },
    { 
      value: 'hard', 
      label: '🧠 Difícil', 
      description: 'Perguntas avançadas que estimulam o aprendizado',
      color: 'bg-red-100 text-red-800',
      xpSuggestion: 80,
      goldSuggestion: 40
    }
  ];

  const getThemeConfig = (theme: string) => {
    return themeOptions.find(t => t.value === theme) || themeOptions[3];
  };

  const getDifficultyConfig = (difficulty: string) => {
    return difficultyOptions.find(d => d.value === difficulty) || difficultyOptions[1];
  };

  const applySuggestedRewards = () => {
    const difficultyConfig = getDifficultyConfig(formData.difficulty);
    setFormData(prev => ({
      ...prev,
      xpReward: difficultyConfig.xpSuggestion,
      goldReward: difficultyConfig.goldSuggestion
    }));
    toast.success('Recompensas sugeridas aplicadas!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Missão Surpresa</h2>
          <p className="text-gray-600">Configure provas personalizadas geradas por IA para o Heitor</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            formData.isEnabled 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {formData.isEnabled ? '✅ Ativa' : '⏸️ Pausada'}
          </div>
        </div>
      </div>

      {/* Status e Histórico */}
      {surpriseMissionHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Histórico Recente</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {surpriseMissionHistory.length}
              </div>
              <div className="text-sm text-blue-600">Missões Realizadas</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {surpriseMissionHistory.reduce((sum, h) => sum + h.score, 0)}
              </div>
              <div className="text-sm text-green-600">Total de Acertos</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {Math.round((surpriseMissionHistory.reduce((sum, h) => sum + h.score, 0) / (surpriseMissionHistory.length * 30)) * 100)}%
              </div>
              <div className="text-sm text-yellow-600">Taxa de Acerto</div>
            </div>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {surpriseMissionHistory.slice(0, 5).map((history) => (
              <div key={history.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">
                    {history.date} - {history.score}/{history.totalQuestions} acertos
                  </span>
                  <div className="text-xs text-gray-600">
                    +{history.xpEarned} XP, +{history.goldEarned} Gold
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-600">
                    {Math.round((history.score / history.totalQuestions) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Configuração Principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Toggle Ativo/Inativo */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">⚡ Status da Missão Surpresa</h3>
                <p className="text-blue-700 text-sm">
                  {formData.isEnabled 
                    ? 'A Missão Surpresa aparecerá no painel do Heitor (se não foi completada hoje)'
                    : 'A Missão Surpresa está desabilitada e não aparecerá para o Heitor'
                  }
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => handleInputChange('isEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className={`font-bold ${formData.isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                  {formData.isEnabled ? 'ATIVA' : 'PAUSADA'}
                </span>
              </div>
            </div>
          </div>

          {/* Configurações do Quiz */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Tema */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                📚 Tema da Prova
              </label>
              
              <div className="space-y-3">
                {themeOptions.map((theme) => {
                  const Icon = theme.icon;
                  return (
                    <label
                      key={theme.value}
                      className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        formData.theme === theme.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={theme.value}
                        checked={formData.theme === theme.value}
                        onChange={(e) => handleInputChange('theme', e.target.value)}
                        className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-gray-900">{theme.label}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${theme.color}`}>
                            {theme.value.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{theme.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Dificuldade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                🎯 Dificuldade da Prova
              </label>
              
              <div className="space-y-3">
                {difficultyOptions.map((difficulty) => (
                  <label
                    key={difficulty.value}
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      formData.difficulty === difficulty.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      value={difficulty.value}
                      checked={formData.difficulty === difficulty.value}
                      onChange={(e) => handleInputChange('difficulty', e.target.value)}
                      className="w-5 h-5 text-orange-600 border-gray-300 focus:ring-orange-500 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">{difficulty.label}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficulty.color}`}>
                          {difficulty.value.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{difficulty.description}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-blue-600">Sugestão: +{difficulty.xpSuggestion} XP</span>
                        <span className="text-yellow-600">+{difficulty.goldSuggestion} Gold</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={applySuggestedRewards}
                className="mt-3 w-full px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium transition-colors text-sm"
              >
                💡 Aplicar Recompensas Sugeridas
              </motion.button>
            </div>
          </div>

          {/* Recompensas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span>Recompensa XP *</span>
              </label>
              <input
                type="number"
                min="10"
                max="500"
                step="5"
                value={formData.xpReward}
                onChange={(e) => handleInputChange('xpReward', parseInt(e.target.value) || 10)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.xpReward ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.xpReward && (
                <p className="mt-1 text-sm text-red-600">{errors.xpReward}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">XP ganho ao completar (10-500)</p>
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>Recompensa Gold *</span>
              </label>
              <input
                type="number"
                min="5"
                max="200"
                step="5"
                value={formData.goldReward}
                onChange={(e) => handleInputChange('goldReward', parseInt(e.target.value) || 5)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors ${
                  errors.goldReward ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.goldReward && (
                <p className="mt-1 text-sm text-red-600">{errors.goldReward}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Gold ganho ao completar (5-200)</p>
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Target className="w-4 h-4 text-purple-500" />
                <span>Número de Questões</span>
              </label>
              <input
                type="number"
                value={formData.questionsCount}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">Fixo em 30 questões por prova</p>
            </div>
          </div>

          {/* Preview da Configuração */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
            <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              👀 Preview da Missão Surpresa
            </h4>
            
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">🎯 Missão Surpresa Disponível!</h4>
                  <p className="text-gray-600">
                    Tema: {getThemeConfig(formData.theme).label} | 
                    Dificuldade: {getDifficultyConfig(formData.difficulty).label}
                  </p>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-center gap-4 text-lg font-bold">
                  <div className="flex items-center gap-1 text-blue-600">
                    <Zap className="w-5 h-5" />
                    +{formData.xpReward} XP
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Star className="w-5 h-5" />
                    +{formData.goldReward} Gold
                  </div>
                </div>
                <p className="text-center text-yellow-800 text-sm mt-2">
                  30 questões de {getThemeConfig(formData.theme).label.toLowerCase()} - Nível {getDifficultyConfig(formData.difficulty).label.toLowerCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSaving}
              className="flex items-center space-x-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-bold text-lg transition-colors shadow-lg"
            >
              <Save className="w-5 h-5" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Configurações'}</span>
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* Informações e Dicas */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1" />
          <div>
            <h4 className="font-bold text-yellow-900 mb-3">💡 Como Funciona a Missão Surpresa:</h4>
            <ul className="text-sm text-yellow-800 space-y-2">
              <li>• <strong>Ativação:</strong> Quando ativa, aparece um botão especial no painel do Heitor</li>
              <li>• <strong>XP:</strong> Valor integral sempre (estimula participação)</li>
              <li>• <strong>Gold:</strong> 10% base + 90% proporcional aos acertos</li>
              <li>• <strong>Exemplo:</strong> 50 Gold configurado = 5 base + até 45 por mérito</li>
              <li>• <strong>0 acertos:</strong> Ganha 5 Gold (10% de 50)</li>
              <li>• <strong>15 acertos (50%):</strong> Ganha 27 Gold (5 + 22)</li>
              <li>• <strong>30 acertos (100%):</strong> Ganha 50 Gold completo</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sugestões de Configuração */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h5 className="font-bold text-green-900 mb-2">😊 Configuração Fácil</h5>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Tema: Tudo Misturado</li>
            <li>• Dificuldade: Fácil</li>
            <li>• Recompensa: 30 XP, 15 Gold</li>
            <li>• Ideal para começar</li>
          </ul>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h5 className="font-bold text-yellow-900 mb-2">🤔 Configuração Balanceada</h5>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Tema: Conhecimentos Gerais</li>
            <li>• Dificuldade: Médio</li>
            <li>• Recompensa: 50 XP, 25 Gold</li>
            <li>• Equilibrio perfeito</li>
          </ul>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h5 className="font-bold text-red-900 mb-2">🧠 Configuração Desafiadora</h5>
          <ul className="text-sm text-red-700 space-y-1">
            <li>• Tema: Matemática</li>
            <li>• Dificuldade: Difícil</li>
            <li>• Recompensa: 80 XP, 40 Gold</li>
            <li>• Para verdadeiros heróis</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SurpriseMissionConfigComponent;