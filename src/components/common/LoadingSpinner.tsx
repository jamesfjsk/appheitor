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
    lg: 'w-20 h-20'
  };

  const colorClasses = {
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
    yellow: 'from-yellow-500 to-yellow-600'
  };

  const textColorClasses = {
    red: 'text-yellow-400',
    blue: 'text-white',
    yellow: 'text-red-600'
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-gradient-to-br ${colorClasses[color]} relative overflow-hidden`}>
      {/* Raios de fundo durante loading */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Raios cruzados */}
        <motion.div
          animate={{
            rotate: [0, 360],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/2 left-1/2 w-96 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent transform -translate-x-1/2 -translate-y-1/2 blur-sm"
        />
        
        <motion.div
          animate={{
            rotate: [90, 450],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
            delay: 1
          }}
          className="absolute top-1/2 left-1/2 w-80 h-0.5 bg-gradient-to-r from-transparent via-red-300 to-transparent transform -translate-x-1/2 -translate-y-1/2 blur-sm"
        />
        
        {/* Círculos de energia */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: [0.5, 1.5, 0.5],
              opacity: [0, 0.2, 0],
              rotate: [0, 180]
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5
            }}
            className={`absolute top-1/2 left-1/2 w-32 h-32 border border-yellow-400 rounded-full transform -translate-x-1/2 -translate-y-1/2`}
            style={{
              transform: `translate(-50%, -50%) scale(${1 + i * 0.3})`
            }}
          />
        ))}
        
        {/* Partículas de velocidade */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            animate={{
              x: ['-50px', '50px'],
              y: ['-50px', '50px'],
              opacity: [0, 0.4, 0],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2
            }}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full blur-sm"
            style={{
              left: `${30 + i * 5}%`,
              top: `${40 + i * 2}%`
            }}
          />
        ))}
      </div>
      
      {/* Spinner principal com efeitos */}
      <motion.div
        className={`relative z-10 ${sizeClasses[size]} ${textColorClasses[color]} mb-6`}
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: { duration: 1, repeat: Infinity, ease: "linear" },
          scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        {/* Glow effect atrás do ícone */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`absolute inset-0 ${textColorClasses[color]} blur-md`}
        >
          <Lightning fill="currentColor" />
        </motion.div>
        
        {/* Ícone principal */}
        <div className="relative z-10">
          <Lightning fill="currentColor" />
        </div>
        
        {/* Raios ao redor do spinner */}
        {size === 'lg' && [...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0.5, 1, 0.5],
              rotate: [0, 360]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.1
            }}
            className={`absolute w-1 h-6 ${textColorClasses[color]} blur-sm`}
            style={{
              left: '50%',
              top: '50%',
              transformOrigin: '50% 60px',
              transform: `translate(-50%, -50%) rotate(${i * 60}deg)`
            }}
          />
        ))}
      </motion.div>
      
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="text-white text-lg font-semibold relative z-10 mb-4"
      >
        {message}
      </motion.p>
      
      {/* Efeito de velocidade no texto */}
      <motion.div
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-20 w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent blur-sm"
      />
      
      {color === 'red' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="text-white/80 text-sm mt-4 text-center max-w-md relative z-10"
        >
          Se estiver demorando muito, pode ser que o banco esteja vazio. 
          Tente usar o botão "Criar Dados de Teste" no painel administrativo.
        </motion.p>
      )}
    </div>
  );
};

export default LoadingSpinner;