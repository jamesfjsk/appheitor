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
              <p className="text-yellow-900 font-semibold">
                ⚠️ Temporariamente Desativado
              </p>

              <p className="text-sm text-gray-700 mt-2">
                O sistema de penalidades e bônus diários está passando por manutenção.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DailySummaryCard;
