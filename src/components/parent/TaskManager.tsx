import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Sun, Sunset, Moon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Task } from '../../types';
import TaskForm from './TaskForm';
import toast from 'react-hot-toast';

interface TaskManagerProps {
  tasks: any[];
}

const TaskManager: React.FC<TaskManagerProps> = ({ tasks }) => {
  const { updateTask, deleteTask } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  const periodIcons = {
    morning: Sun,
    afternoon: Sunset,
    evening: Moon
  };

  const periodLabels = {
    morning: 'Manhã',
    afternoon: 'Tarde',
    evening: 'Noite'
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = async (taskId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        await deleteTask(taskId);
        toast.success('Tarefa excluída com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir tarefa');
      }
    }
  };

  const handleToggleActive = async (task: any) => {
    try {
      await updateTask(task.id, { isActive: !task.isActive });
      toast.success(task.isActive ? 'Tarefa desativada' : 'Tarefa ativada');
    } catch (error) {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  const activeTasks = tasks.filter(task => task.active === true);
  const inactiveTasks = tasks.filter(task => task.active === false);
  
  console.log('🔥 TaskManager: Tasks filtering:', {
    totalTasks: tasks.length,
    activeTasks: activeTasks.length,
    inactiveTasks: inactiveTasks.length,
    tasksData: tasks.map(t => ({ id: t.id, title: t.title, active: t.active }))
  });

  return (
    <div className="space-y-6">
      {/* Header com botão de adicionar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Tarefas</h2>
          <p className="text-gray-600">Crie e organize as missões do Heitor</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </motion.button>
      </div>

      {/* Tarefas Ativas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Tarefas Ativas ({activeTasks.length})
        </h3>
        
        {activeTasks.length > 0 ? (
          <div className="space-y-3">
            {activeTasks.map((task, index) => {
              const PeriodIcon = periodIcons[task.period];
              
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <PeriodIcon className="w-4 h-4" />
                        {periodLabels[task.period]}
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-900">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-gray-600">{task.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          {task.xpReward || 10} XP, {task.goldReward || 5} Gold
                        </span>
                        
                        {task.completed && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                            ✓ Completa
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEdit(task)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        >
                          <Edit2 className="w-4 h-4" />
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggleActive(task)}
                          className="px-3 py-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all duration-200"
                        >
                          Pausar
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(task.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-500 text-lg">Nenhuma tarefa ativa</p>
            <p className="text-gray-400 text-sm">Clique em "Nova Tarefa" para começar</p>
          </div>
        )}
      </motion.div>

      {/* Tarefas Inativas */}
      {inactiveTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-500 mb-4">
            Tarefas Pausadas ({inactiveTasks.length})
          </h3>
          
          <div className="space-y-3">
            {inactiveTasks.map((task, index) => {
              const PeriodIcon = periodIcons[task.period];
              
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <PeriodIcon className="w-4 h-4" />
                        {periodLabels[task.period]}
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-700">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-gray-500">{task.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{task.points} pts</span>
                      
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggleActive(task)}
                          className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-all duration-200"
                        >
                          Ativar
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(task.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Modal de Formulário */}
      <AnimatePresence>
        {showForm && (
          <TaskForm
            task={editingTask}
            onClose={handleCloseForm}
            isOpen={showForm}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskManager;