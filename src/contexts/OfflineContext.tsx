import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface OfflineContextType {
  isOffline: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline deve ser usado dentro de OfflineProvider');
  }
  return context;
};

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('🌐 Conexão restaurada!', {
        duration: 3000
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.error('📱 Sem conexão com a internet. O aplicativo precisa de internet para funcionar.', {
        duration: 0 // Não remove automaticamente
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value: OfflineContextType = {
    isOffline
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};