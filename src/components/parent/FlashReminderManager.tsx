import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Zap, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { FlashReminder } from '../../types';
import FlashReminderForm from './FlashReminderForm';
import toast from 'react-hot-toast';

const FlashReminderManager: React.FC = () => {
  const { flashReminders, updateFlashReminder, deleteFlashReminder } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<FlashReminder | null>(null);

  const handleEdit = (reminder: FlashReminder) => {
    setEditingReminder(reminder);
    setShowForm(true);
  };

  const handleDelete = async (reminderId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lembrete?')) {
      try {
        await deleteFlashReminder(reminderId);
        toast.success('Lembrete excluído com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir lembrete');
      }
    }
  };

  const handleToggleActive = async (reminder: FlashReminder) => {
    try {
      await updateFlashReminder(reminder.id, { active: !reminder.active });
      toast.success(reminder.active ? 'Lembrete desativado' : 'Lembrete ativado');
    } catch (error) {
      toast.error('Erro ao atualizar lembrete');
    }
  };

  const handleToggleDashboard = async (reminder: FlashReminder) => {
    try {
      await updateFlashReminder(reminder.id, { showOnDashboard: !reminder.showOnDashboard });
      toast.success(reminder.showOnDashboard ? 'Removido do painel' : 'Adicionado ao painel');
    } catch (error) {
      toast.error('Erro ao atualizar lembrete');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingReminder(null);
  };

  const activeReminders = flashReminders.filter(reminder => reminder.active);
  const inactiveReminders = flashReminders.filter(reminder => !reminder.active);

  const getColorClasses = (color: FlashReminder['color']) => {
    switch (color) {
      case 'red': return 'bg-red-100 border-red-300 text-red-800';
      case 'yellow': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'blue': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'green': return 'bg-green-100 border-green-300 text-green-800';
      case 'purple': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'orange': return 'bg-orange-100 border-orange-300 text-orange-800';
      default: return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    }
  };

  const getPriorityLabel = (priority: FlashReminder['priority']) => {
    switch (priority) {
      case 'high': return { label: 'Alta', color: 'bg-red-500 text-white' };
      case 'medium': return { label: 'Média', color: 'bg-yellow-500 text-white' };
      case 'low': return { label: 'Baixa', color: 'bg-green-500 text-white' };
      default: return { label: 'Média', color: 'bg-yellow-500 text-white' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lembretes Flash</h2>
          <p className="text-gray-600">Gerencie lembretes motivacionais para o Heitor</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Lembrete
        </motion.button>
      </div>

      {/* Active Reminders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Lembretes Ativos ({activeReminders.length})
        </h3>
        
        {activeReminders.length > 0 ? (
          <div className="space-y-3">
            {activeReminders.map((reminder, index) => {
              const priorityConfig = getPriorityLabel(reminder.priority);
              
              return (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border-2 rounded-lg p-4 transition-all duration-200 ${getColorClasses(reminder.color)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{reminder.icon}</span>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-lg">{reminder.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                          {reminder.showOnDashboard && (
                            <span className="px-2 py-1 bg-blue-500 text-white rounded-full text-xs font-bold">
                              NO PAINEL
                            </span>
                          )}
                        </div>
                        <p className="text-sm opacity-80">{reminder.message}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleToggleDashboard(reminder)}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          reminder.showOnDashboard
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title={reminder.showOnDashboard ? 'Remover do painel' : 'Mostrar no painel'}
                      >
                        {reminder.showOnDashboard ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEdit(reminder)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleToggleActive(reminder)}
                        className="px-3 py-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all duration-200"
                      >
                        Pausar
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(reminder.id)}
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
            <div className="text-6xl mb-4">⚡</div>
            <p className="text-gray-500 text-lg">Nenhum lembrete ativo</p>
            <p className="text-gray-400 text-sm">Clique em "Novo Lembrete" para começar</p>
          </div>
        )}
      </motion.div>

      {/* Inactive Reminders */}
      {inactiveReminders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-500 mb-4">
            Lembretes Pausados ({inactiveReminders.length})
          </h3>
          
          <div className="space-y-3">
            {inactiveReminders.map((reminder, index) => (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl opacity-50">{reminder.icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-700">{reminder.title}</h4>
                      <p className="text-sm text-gray-500">{reminder.message}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleToggleActive(reminder)}
                      className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-all duration-200"
                    >
                      Ativar
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(reminder.id)}
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

      {/* Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-2">💡 Dicas para Lembretes Flash:</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• <strong>Alta prioridade:</strong> Lembretes importantes que piscam</li>
              <li>• <strong>Mostrar no painel:</strong> Aparece na lateral do painel do Heitor</li>
              <li>• <strong>Rotação automática:</strong> Lembretes alternam a cada 8 segundos</li>
              <li>• <strong>Mensagens curtas:</strong> Mantenha entre 30-80 caracteres</li>
              <li>• <strong>Emojis:</strong> Use emojis para tornar mais divertido</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de Formulário */}
      <AnimatePresence>
        {showForm && (
          <FlashReminderForm
            reminder={editingReminder}
            onClose={handleCloseForm}
            isOpen={showForm}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FlashReminderManager;