import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Wrench } from 'lucide-react';

interface DailySummaryCardProps {}

const DailySummaryCard: React.FC<DailySummaryCardProps> = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6 }}
      className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-lg border-2 border-yellow-300 p-6 relative overflow-hidden"
    >
      {/* Icon background decoration */}
      <div className="absolute top-0 right-0 opacity-10">
        <Wrench className="w-32 h-32 text-yellow-600 transform rotate-12" />
      </div>

      <div className="relative z-10">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
              <AlertCircle className="w-7 h-7 text-yellow-900" />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-yellow-900 font-bold text-xl mb-2 flex items-center gap-2">
              🚧 Sistema de Recompensas Diárias
            </h3>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-yellow-300">
              <p className="text-yellow-900 font-semibold mb-3">
                ⚠️ Temporariamente Desativado
              </p>

              <div className="text-sm text-gray-700 space-y-2">
                <p>
                  O sistema de penalidades e bônus diários está passando por manutenção.
                </p>

                <div className="bg-green-100 border border-green-300 rounded-lg p-3 mt-3">
                  <p className="text-green-800 font-semibold flex items-center gap-2">
                    ✅ Seu Gold está PROTEGIDO
                  </p>
                  <p className="text-green-700 text-xs mt-1">
                    Você NÃO perderá gold por tarefas incompletas enquanto o sistema estiver em manutenção.
                  </p>
                </div>

                <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mt-2">
                  <p className="text-blue-800 font-semibold">
                    📊 O que continua funcionando:
                  </p>
                  <ul className="text-blue-700 text-xs mt-1 space-y-1 list-disc list-inside">
                    <li>Ganhar XP e Gold ao completar tarefas</li>
                    <li>Resgatar recompensas (com 5 tarefas diárias)</li>
                    <li>Sistema de níveis e conquistas</li>
                    <li>Todas as tarefas e missões</li>
                  </ul>
                </div>

                <p className="text-xs text-gray-600 mt-3 italic">
                  O sistema voltará em breve com melhorias! Continue completando suas missões normalmente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DailySummaryCard;
