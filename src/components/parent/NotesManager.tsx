import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Pin, PinOff, Save, X, StickyNote } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Note } from '../../types';

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Geral', color: 'bg-gray-100 text-gray-700' },
  { value: 'tasks', label: 'Tarefas', color: 'bg-blue-100 text-blue-700' },
  { value: 'rewards', label: 'Recompensas', color: 'bg-green-100 text-green-700' },
  { value: 'progress', label: 'Progresso', color: 'bg-purple-100 text-purple-700' },
  { value: 'important', label: 'Importante', color: 'bg-red-100 text-red-700' }
];

const NotesManager: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote } = useData();
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as Note['category'],
    color: '',
    pinned: false
  });

  const handleCreateNote = () => {
    setIsCreating(true);
    setFormData({
      title: '',
      content: '',
      category: 'general',
      color: '',
      pinned: false
    });
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setFormData({
      title: note.title,
      content: note.content,
      category: note.category || 'general',
      color: note.color || '',
      pinned: note.pinned
    });
  };

  const handleSaveNote = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    try {
      if (editingNoteId) {
        await updateNote(editingNoteId, formData);
        setEditingNoteId(null);
      } else {
        await addNote(formData);
        setIsCreating(false);
      }

      setFormData({
        title: '',
        content: '',
        category: 'general',
        color: '',
        pinned: false
      });
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingNoteId(null);
    setFormData({
      title: '',
      content: '',
      category: 'general',
      color: '',
      pinned: false
    });
  };

  const handleTogglePin = async (note: Note) => {
    try {
      await updateNote(note.id, { pinned: !note.pinned });
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta anotação?')) return;

    try {
      await deleteNote(noteId);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const getCategoryInfo = (category?: Note['category']) => {
    return CATEGORY_OPTIONS.find(opt => opt.value === category) || CATEGORY_OPTIONS[0];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <StickyNote className="w-7 h-7 text-yellow-600" />
            Anotações
          </h2>
          <p className="text-gray-600 mt-1">
            Salve informações importantes, lembretes e observações
          </p>
        </div>

        {!isCreating && !editingNoteId && (
          <button
            onClick={handleCreateNote}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Anotação
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      <AnimatePresence>
        {(isCreating || editingNoteId) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border-2 border-yellow-300 rounded-xl p-6 shadow-lg"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingNoteId ? 'Editar Anotação' : 'Nova Anotação'}
            </h3>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Observações sobre comportamento"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conteúdo
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Escreva suas anotações aqui..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {CATEGORY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, category: option.value as Note['category'] })}
                      className={`px-3 py-2 rounded-lg border-2 transition-all ${
                        formData.category === option.value
                          ? `${option.color} border-current font-semibold`
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pinned */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinned"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                />
                <label htmlFor="pinned" className="text-sm font-medium text-gray-700">
                  Fixar anotação no topo
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveNote}
                  disabled={!formData.title.trim() || !formData.content.trim()}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <StickyNote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Nenhuma anotação ainda</p>
          <p className="text-gray-500 text-sm mt-1">
            Clique em "Nova Anotação" para começar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note, index) => {
            const categoryInfo = getCategoryInfo(note.category);
            const isEditing = editingNoteId === note.id;

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-xl border-2 p-4 hover:shadow-lg transition-all ${
                  note.pinned
                    ? 'border-yellow-400 shadow-md'
                    : 'border-gray-200'
                } ${isEditing ? 'ring-2 ring-yellow-500' : ''}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2 flex-1">
                    {note.pinned && (
                      <Pin className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">
                        {note.title}
                      </h3>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${categoryInfo.color}`}>
                        {categoryInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleTogglePin(note)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title={note.pinned ? 'Desafixar' : 'Fixar'}
                    >
                      {note.pinned ? (
                        <PinOff className="w-4 h-4 text-gray-600" />
                      ) : (
                        <Pin className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEditNote(note)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <p className="text-gray-700 text-sm whitespace-pre-wrap break-words line-clamp-6 mb-3">
                  {note.content}
                </p>

                {/* Footer */}
                <div className="text-xs text-gray-500 border-t pt-2">
                  Última edição: {formatDate(note.updatedAt)}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {notes.length > 0 && (
        <div className="flex gap-4 text-sm text-gray-600">
          <div>
            Total: <strong>{notes.length}</strong> anotações
          </div>
          <div>
            Fixadas: <strong>{notes.filter(n => n.pinned).length}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesManager;
