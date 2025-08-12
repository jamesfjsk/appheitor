import React from 'react';
import { motion } from 'framer-motion';
import { CloudLightning as Lightning } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'red' | 'blue' | 'yellow';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'red',
  message = 'Carregando...' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const colorClasses = {
    red: 'from-flash-red to-flash-red-dark',
    blue: 'from-blue-600 to-blue-800',
    yellow: 'from-yellow-500 to-yellow-600'
  };

  const textColorClasses = {
    red: 'text-white',
    blue: 'text-white',
    yellow: 'text-white'
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-br ${colorClasses[color]} p-4`}>
      <motion.div
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{
          rotate: { duration: 1, repeat: Infinity, ease: "linear" },
          scale: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
        }}
        className={`${sizeClasses[size]} ${textColorClasses[color]} mb-4`}
      >
        <Lightning fill="currentColor" />
      </motion.div>
      
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-white text-lg font-semibold"
      >
        {message}
      </motion.p>
      
      {color === 'red' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="text-white/80 text-sm mt-4 text-center max-w-md"
        >
          Se estiver demorando muito, pode ser que o banco esteja vazio. 
          Tente usar o botão "Criar Dados de Teste" no painel administrativo.
        </motion.p>
      )}
    </div>
  );
};

export default LoadingSpinner;