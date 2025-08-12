import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download, 
  Wrench, 
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Users,
  FileText,
  Bell,
  Gift
} from 'lucide-react';
import { ScanResult, FixResult, CollectionIssue } from '../../../hooks/useDataDoctor';

interface CollectionCardProps {
  collectionName: 'tasks' | 'rewards' | 'progress' | 'redemptions' | 'notifications';
  scanResult?: ScanResult;
  fixResult?: FixResult;
  selectedChild: string;
  onFix: (
    collectionName: 'tasks' | 'rewards' | 'progress' | 'redemptions' | 'notifications',
    strategy: 'use_userId' | 'assign_to_child',
    selectedIssueIds?: string[]
  ) => Promise<void>;
  onDownloadCSV: () => void;
  isFixing: boolean;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
  collectionName,
  scanResult,
  fixResult,
  selectedChild,
  onFix,
  onDownloadCSV,
  isFixing
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  
  const ISSUES_PER_PAGE = 10;

  if (!scanResult) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 capitalize mb-2">
            {collectionName}
          </h3>
          <p className="text-gray-500">Aguardando análise...</p>
        </div>
      </div>
    );
  }

  const { stats } = scanResult;
  const hasIssues = stats.issues.length > 0;
  const totalPages = Math.ceil(stats.issues.length / ISSUES_PER_PAGE);
  const currentIssues = stats.issues.slice(
    currentPage * ISSUES_PER_PAGE,
    (currentPage + 1) * ISSUES_PER_PAGE
  );

  const getCollectionIcon = () => {
    switch (collectionName) {
      case 'tasks': return FileText;
      case 'rewards': return Gift;
      case 'progress': return Users;
      case 'redemptions': return Clock;
      case 'notifications': return Bell;
      default: return Database;
    }
  };

  const getCollectionColor = () => {
    if (!hasIssues) return 'border-green-200 bg-green-50';
    if (stats.valid > stats.issues.length) return 'border-yellow-200 bg-yellow-50';
    return 'border-red-200 bg-red-50';
  };

  const getStatusIcon = () => {
    if (!hasIssues) return <CheckCircle className="w-6 h-6 text-green-600" />;
    if (stats.valid > stats.issues.length) return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
    return <XCircle className="w-6 h-6 text-red-600" />;
  };

  const getIssueTypeLabel = (issue: CollectionIssue['issue']) => {
    switch (issue) {
      case 'missing_ownerId': return 'Sem ownerId';
      case 'missing_userId': return 'Sem userId';
      case 'missing_toUserId': return 'Sem toUserId';
      case 'invalid_type': return 'Tipo inválido';
      case 'orphaned': return 'Usuário órfão';
      case 'mismatch': return 'Divergência';
      default: return issue;
    }
  };

  const getIssueTypeColor = (issue: CollectionIssue['issue']) => {
    switch (issue) {
      case 'missing_ownerId':
      case 'missing_userId':
      case 'missing_toUserId':
        return 'bg-red-100 text-red-800';
      case 'invalid_type': return 'bg-orange-100 text-orange-800';
      case 'orphaned': return 'bg-purple-100 text-purple-800';
      case 'mismatch': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleIssueSelection = (issueId: string) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelectedIssues(newSelected);
  };

  const selectAllCurrentPage = () => {
    const newSelected = new Set(selectedIssues);
    currentIssues.forEach(issue => newSelected.add(issue.docId));
    setSelectedIssues(newSelected);
  };

  const clearSelection = () => {
    setSelectedIssues(new Set());
  };

  const Icon = getCollectionIcon();

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 ${getCollectionColor()}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-900 capitalize">
              {collectionName}
            </h3>
          </div>
          {getStatusIcon()}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
            <div className="text-sm text-gray-600">Válidos</div>
          </div>
        </div>

        {hasIssues && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {stats.missingOwnerId > 0 && (
              <div className="bg-red-100 text-red-800 px-2 py-1 rounded">
                {stats.missingOwnerId} sem ownerId
              </div>
            )}
            {stats.missingUserId > 0 && (
              <div className="bg-red-100 text-red-800 px-2 py-1 rounded">
                {stats.missingUserId} sem userId
              </div>
            )}
            {stats.missingToUserId > 0 && (
              <div className="bg-red-100 text-red-800 px-2 py-1 rounded">
                {stats.missingToUserId} sem toUserId
              </div>
            )}
            {stats.invalidType > 0 && (
              <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                {stats.invalidType} tipo inválido
              </div>
            )}
            {stats.orphaned > 0 && (
              <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                {stats.orphaned} órfãos
              </div>
            )}
            {stats.mismatch > 0 && (
              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {stats.mismatch} divergentes
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {hasIssues && (
        <div className="p-6 space-y-4">
          {/* Fix Buttons */}
          <div className="grid grid-cols-1 gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onFix(collectionName, 'use_userId')}
              disabled={isFixing}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              Usar userId como ownerId
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onFix(collectionName, 'assign_to_child')}
              disabled={isFixing || !selectedChild}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              Atribuir ao Filho Selecionado
            </motion.button>
          </div>

          {/* Export Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onDownloadCSV}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV de Problemas
          </motion.button>

          {/* Details Toggle */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showDetails ? 'Ocultar' : 'Ver'} Detalhes ({stats.issues.length})
          </motion.button>
        </div>
      )}

      {/* Fix Result */}
      {fixResult && (
        <div className="p-6 border-t border-gray-200 bg-green-50">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-900">Correção Concluída</span>
          </div>
          <div className="text-sm text-green-700 space-y-1">
            <p>• {fixResult.totalFixed} documentos corrigidos</p>
            <p>• {fixResult.batchesExecuted} lotes executados</p>
            <p>• Duração: {fixResult.duration}ms</p>
            {fixResult.errors.length > 0 && (
              <p className="text-red-600">• {fixResult.errors.length} erros</p>
            )}
          </div>
        </div>
      )}

      {/* Issue Details */}
      <AnimatePresence>
        {showDetails && hasIssues && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">
                  Problemas Detectados ({stats.issues.length})
                </h4>
                
                {stats.issues.length > ISSUES_PER_PAGE && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded"
                    >
                      ←
                    </button>
                    <span>
                      {currentPage + 1} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage === totalPages - 1}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>

              {/* Selection Controls */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={selectAllCurrentPage}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium"
                >
                  Selecionar Página
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"
                >
                  Limpar Seleção
                </button>
                {selectedIssues.size > 0 && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">
                    {selectedIssues.size} selecionados
                  </span>
                )}
              </div>

              {/* Issues List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentIssues.map((issue, index) => (
                  <motion.div
                    key={issue.docId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      selectedIssues.has(issue.docId)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIssues.has(issue.docId)}
                        onChange={() => toggleIssueSelection(issue.docId)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-gray-900 truncate">
                            {issue.docId}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIssueTypeColor(issue.issue)}`}>
                            {getIssueTypeLabel(issue.issue)}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-1">
                          {issue.details}
                        </p>
                        
                        {(issue.currentUserId || issue.currentOwnerId || issue.currentToUserId) && (
                          <div className="text-xs text-gray-500 space-y-1">
                            {issue.currentUserId && (
                              <div>userId: <span className="font-mono">{issue.currentUserId}</span></div>
                            )}
                            {issue.currentOwnerId && (
                              <div>ownerId: <span className="font-mono">{String(issue.currentOwnerId)}</span></div>
                            )}
                            {issue.currentToUserId && (
                              <div>toUserId: <span className="font-mono">{String(issue.currentToUserId)}</span></div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Fix Selected Button */}
              {selectedIssues.size > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onFix(collectionName, 'use_userId', Array.from(selectedIssues))}
                      disabled={isFixing}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Wrench className="w-4 h-4" />
                      Corrigir Selecionados (userId)
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onFix(collectionName, 'assign_to_child', Array.from(selectedIssues))}
                      disabled={isFixing || !selectedChild}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Atribuir Selecionados ao Filho
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan Info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>
            Analisado em {scanResult.scannedAt.toLocaleTimeString('pt-BR')}
          </span>
          <span>
            {scanResult.duration}ms
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default CollectionCard;