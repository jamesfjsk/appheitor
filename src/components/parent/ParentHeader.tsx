import React from 'react';
import { motion } from 'framer-motion';
import { Shield, LogOut, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';

interface ParentHeaderProps {}

const ParentHeader: React.FC<ParentHeaderProps> = () => {
  const { logout, user, childUid, syncData } = useAuth();
  const { playClick } = useSound();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Painel Administrativo
            </h1>
            <p className="text-gray-600">
              Bem-vindo, {user?.displayName || 'Admin'}
            </p>
            {childUid && (
              <p className="text-sm text-blue-600">
                Gerenciando filho: {childUid}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              playClick();
              syncData();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
            title="Salvar e sincronizar dados"
          >
            <Save className="w-4 h-4" />
            Sincronizar
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              playClick();
              logout();
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all duration-200 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};

export default ParentHeader;