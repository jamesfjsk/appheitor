import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useOffline } from '../../contexts/OfflineContext';

const OfflineBanner: React.FC = () => {
  const { isOffline } = useOffline();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}          className="fixed top-0 left-0 right-0 z-50 bg-flash-red text-white px-4 py-3 shadow-lg"
        >
          <div className="flex items-center justify-center gap-3 max-w-4xl mx-auto">
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium text-sm">
                Sem conexão com a internet. O Flash Missions precisa de internet para funcionar.
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;