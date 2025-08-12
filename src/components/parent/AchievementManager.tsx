import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Trophy, Star, Zap, Target, Calendar, User, Settings } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Achievement, UserAchievement } from '../../types';
import AchievementForm from './AchievementForm';
import toast from 'react-hot-toast';

const AchievementManager: React.FC = () => {
  const { achievements, userAchievements, progress, updateAchievement, deleteAchievement, checkAchievements } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [activeTab, setActiveTab] = useState<'achievements' | 'progress'>('achievements');

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setShowForm(true);
  };

  const handleDelete = async (achievementId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta conquista?')) {
      try {
        await deleteAchievement(achievementId);
        toast.success('Conquista excluída com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir conquista');
      }
    }
  };

  const handleToggleActive = async (achievement: Achievement) => {
    try {
      await updateAchievement(achievement.id, { isActive: !achievement.isActive });
      toast.success(achievement.isActive ? 'Conquista desativada' : 'Conquista ativada');
    } catch (error) {
      toast.error('Erro ao atualizar conquista');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAchievement(null);
  };

  const handleCheckAchievements = async () => {
    try {
      await checkAchievements();
      toast.success('Verificação de conquistas executada!');
    } catch (error) {
      toast.error('Erro ao verificar conquistas');
    }
  };

  const activeAchievements = achievements.filter(achievement => achievement.isActive !== false);
  const inactiveAchievements = achievements.filter(achievement => achievement.isActive === false);

  const getTypeLabel = (type: Achievement['type']) => {
    switch (type) {
      case 'xp': return 'XP Total';
      case 'level': return 'Nível';
      case 'tasks': return 'Tarefas';
      case 'streak': return 'Sequência';
      case 'checkin': return 'Check-in';
      case 'custom': return 'Personalizado';
      default: return type;
    }
  };

  const getTypeColor = (type: Achievement['type']) => {
    switch (type) {
      case 'xp': return 'bg-blue-100 text-blue-800';
      case 'level': return 'bg-purple-100 text-purple-800';
      case 'tasks': return 'bg-green-100 text-green-800';
      case 'streak': return 'bg-orange-100 text-orange-800';
      case 'checkin': return 'bg-pink-100 text-pink-800';
      case 'custom': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserAchievementProgress = (achievementId: string) => {
    return userAchievements.find(ua => ua.achievementId === achievementId);
  };

  const defaultAchievements = [
    {
      title: 'Primeiro Passo',
      description: 'Complete sua primeira tarefa',
      icon: '🌟',
      type: 'tasks' as const,
      target: 1,
      xpReward: 10,
      goldReward: 5
    },
    {
      title: 'Sequência Iniciante',
      description: 'Complete tarefas por 3 dias consecutivos',
      icon: '🔥',
      type: 'streak' as const,
      target: 3,
      xpReward: 25,
      goldReward: 15
    },
    {
      title: 'Flash Nível 5',
      description: 'Alcance o nível 5',
      icon: '⚡',
      type: 'level' as const,
      target: 5,
      xpReward: 50,
      goldReward: 30
    },
    {
      title: 'Dedicado',
      description: 'Complete 10 tarefas no total',
      icon: '🎯',
      type: 'tasks' as const,
      target: 10,
      xpReward: 75,
      goldReward: 50
    },
    {
      title: 'Responsável',
      description: 'Complete 50 tarefas no total',
      icon: '🏆',
      type: 'tasks' as const,
      target: 50,
      xpReward: 100,
      goldReward: 75
    },
    {
      title: 'Mestre da Experiência',
      description: 'Acumule 1000 XP total',
      icon: '💎',
      type: 'xp' as const,
      target: 1000,
      xpReward: 150,
      goldReward: 100
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header com Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sistema de Conquistas</h2>
          <p className="text-gray-600">Gerencie conquistas e acompanhe o progresso do Heitor</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'achievements'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-2" />
            Conquistas ({achievements.length})
          </button>
          
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'progress'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Progresso ({userAchievements.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'achievements' ? (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Controls */}
            <div className="flex flex-wrap gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Conquista
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckAchievements}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Verificar Progresso
              </motion.button>
            </div>

            {/* Templates de Conquistas Padrão */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-yellow-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5" />
                Templates de Conquistas Padrão
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {defaultAchievements.map((template, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-lg p-4 border border-yellow-200 hover:border-yellow-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">{template.title}</h4>
                          <p className="text-xs text-gray-600">{template.description}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className={`px-2 py-1 rounded-full font-medium ${getTypeColor(template.type)}`}>
                        {getTypeLabel(template.type)}: {template.target}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-blue-600">
                          <Zap className="w-3 h-3" />
                          +{template.xpReward}
                        </div>
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Star className="w-3 h-3" />
                          +{template.goldReward}
                        </div>
                      </div>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setEditingAchievement(null);
                        // Set initial data for form
                        setShowForm(true);
                        // Pass template data to form
                        setTimeout(() => {
                          const event = new CustomEvent('useTemplate', { detail: template });
                          window.dispatchEvent(event);
                        }, 100);
                      }}
                      className="w-full mt-3 px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-medium transition-colors"
                    >
                      Usar Template
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Conquistas Ativas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Conquistas Ativas ({activeAchievements.length})
              </h3>
              
              {activeAchievements.length > 0 ? (
                <div className="space-y-4">
                  {activeAchievements.map((achievement, index) => {
                    const userProgress = getUserAchievementProgress(achievement.id);
                    const progressPercentage = userProgress 
                      ? Math.min(100, (userProgress.progress / achievement.target) * 100)
                      : 0;
                    
                    return (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="text-3xl">{achievement.icon}</div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(achievement.type)}`}>
                                  {getTypeLabel(achievement.type)}
                                </span>
                                {userProgress?.isCompleted && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                                    ✓ COMPLETA
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                              
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-blue-600">
                                  <Zap className="w-4 h-4" />
                                  +{achievement.xpReward} XP
                                </div>
                                <div className="flex items-center gap-1 text-yellow-600">
                                  <Star className="w-4 h-4" />
                                  +{achievement.goldReward} Gold
                                </div>
                                <div className="text-gray-500">
                                  Meta: {achievement.target}
                                </div>
                              </div>
                              
                              {/* Progress Bar */}
                              {userProgress && !userProgress.isCompleted && (
                                <div className="mt-3">
                                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Progresso: {userProgress.progress}/{achievement.target}</span>
                                    <span>{Math.round(progressPercentage)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${progressPercentage}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleEdit(achievement)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            >
                              <Edit2 className="w-4 h-4" />
                            </motion.button>
                            
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleToggleActive(achievement)}
                              className="px-3 py-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all duration-200"
                            >
                              {achievement.isActive ? 'Pausar' : 'Ativar'}
                            </motion.button>
                            
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDelete(achievement.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏆</div>
                  <p className="text-gray-500 text-lg">Nenhuma conquista ativa</p>
                  <p className="text-gray-400 text-sm">Use os templates ou crie conquistas personalizadas</p>
                </div>
              )}
            </motion.div>

            {/* Conquistas Inativas */}
            {inactiveAchievements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-500 mb-4">
                  Conquistas Pausadas ({inactiveAchievements.length})
                </h3>
                
                <div className="space-y-3">
                  {inactiveAchievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50 opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl opacity-50">{achievement.icon}</span>
                          <div>
                            <h4 className="font-semibold text-gray-700">{achievement.title}</h4>
                            <p className="text-sm text-gray-500">{achievement.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleToggleActive(achievement)}
                            className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-all duration-200"
                          >
                            Ativar
                          </motion.button>
                          
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDelete(achievement.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="progress"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Progresso do Heitor */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Progresso do Heitor nas Conquistas
              </h3>
              
              {userAchievements.length > 0 ? (
                <div className="space-y-4">
                  {userAchievements.map((userAchievement, index) => {
                    const achievement = achievements.find(a => a.id === userAchievement.achievementId);
                    if (!achievement) return null;
                    
                    const progressPercentage = Math.min(100, (userAchievement.progress / achievement.target) * 100);
                    
                    return (
                      <motion.div
                        key={userAchievement.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`border rounded-lg p-4 ${
                          userAchievement.isCompleted 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            userAchievement.isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            <span className="text-xl">{achievement.icon}</span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
                              {userAchievement.isCompleted && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                                  COMPLETA
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                            
                            {userAchievement.isCompleted ? (
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-green-600 font-medium">
                                  ✓ Desbloqueada em {userAchievement.unlockedAt?.toLocaleDateString('pt-BR')}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-600">+{achievement.xpReward} XP</span>
                                  <span className="text-yellow-600">+{achievement.goldReward} Gold</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">
                                    Progresso: {userAchievement.progress}/{achievement.target}
                                  </span>
                                  <span className="text-gray-600">{Math.round(progressPercentage)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercentage}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-gray-500">Nenhum progresso de conquista ainda</p>
                  <p className="text-gray-400 text-sm">As conquistas aparecerão aqui conforme o Heitor progride</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Formulário */}
      <AnimatePresence>
        {showForm && (
          <AchievementForm
            achievement={editingAchievement}
            onClose={handleCloseForm}
            isOpen={showForm}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AchievementManager;