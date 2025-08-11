import React, { createContext, useContext, useEffect, useState } from 'react';
import { getNotificationToken, onMessageListener } from '../config/firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { NotificationPayload } from '../types';

interface NotificationContextType {
  requestPermission: () => Promise<boolean>;
  showTaskReminder: (taskTitle: string) => void;
  showAchievementUnlocked: (achievement: string) => void;
  showRewardAvailable: (message: string) => void;
  showParentNotification: (title: string, message: string) => void;
  sendNotificationToChild: (payload: NotificationPayload) => Promise<void>;
  isSupported: boolean;
  permission: NotificationPermission;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported] = useState('Notification' in window);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
      
      // Inicializar Firebase Messaging
      initializeFirebaseMessaging();
    }
  }, [isSupported]);

  const initializeFirebaseMessaging = async () => {
    try {
      // Registrar service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('📱 Service Worker registrado:', registration);
      }
      
      // Escutar mensagens em foreground
      onMessageListener()
        .then((payload: any) => {
          console.log('📨 Mensagem recebida em foreground:', payload);
          
          // Mostrar toast com a mensagem
          toast(payload.notification?.body || 'Nova notificação!', {
            duration: 6000,
            style: {
              background: 'linear-gradient(135deg, #C8102E, #FF3131)',
              color: '#FFFFFF',
              fontWeight: 'bold',
            },
          });
        })
        .catch((err) => console.log('❌ Erro ao escutar mensagens:', err));
        
    } catch (error) {
      console.warn('⚠️ Erro ao inicializar Firebase Messaging:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Obter token FCM
        const token = await getNotificationToken();
        if (token) {
          setFcmToken(token);
          console.log('📱 Token FCM obtido:', token);
          
          // Aqui você pode salvar o token no Firestore para o usuário
          // await saveTokenToFirestore(token);
        }
        
        toast.success('🔔 Notificações ativadas! Você receberá lembretes das missões.', {
          duration: 4000
        });
      }
      
      return result === 'granted';
    } catch (error) {
      console.error('Erro ao solicitar permissão de notificação:', error);
      return false;
    }
  };

  const showTaskReminder = (taskTitle: string) => {
    if (permission === 'granted') {
      new Notification('⚡ Missão Pendente!', {
        body: `Heitor, não esqueça: ${taskTitle}`,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'task-reminder',
        requireInteraction: true,
      });
    }
    
    // Fallback visual sempre
    toast('⚡ Missão Pendente: ' + taskTitle, {
      duration: 6000,
      style: {
        background: 'linear-gradient(135deg, #C8102E, #FF3131)',
        color: '#FFFFFF',
        fontWeight: 'bold',
      },
    });
  };

  const showAchievementUnlocked = (achievement: string) => {
    if (permission === 'granted') {
      new Notification('🏆 Conquista Desbloqueada!', {
        body: `Parabéns Heitor! Você conquistou: ${achievement}`,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'achievement',
        requireInteraction: true,
      });
    }

    // Celebração visual sempre
    toast.success('🏆 ' + achievement + ' desbloqueada!', {
      duration: 8000,
      style: {
        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
        color: '#1F2937',
        fontWeight: 'bold',
        fontSize: '16px',
      },
    });
  };

  const showRewardAvailable = (message: string) => {
    if (permission === 'granted') {
      new Notification('🎁 Nova Recompensa!', {
        body: message,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'reward-available',
        requireInteraction: true,
      });
    }

    // Notificação visual sempre
    toast.success(message, {
      duration: 6000,
      style: {
        background: 'linear-gradient(135deg, #10B981, #059669)',
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: '16px',
      },
    });
  };

  const showParentNotification = (title: string, message: string) => {
    if (permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'parent-notification',
        requireInteraction: false,
      });
    }

    // Toast para o pai
    toast(message, {
      duration: 4000,
      style: {
        background: '#2563EB',
        color: '#FFFFFF',
        fontWeight: 'bold',
      },
    });
  };

  const sendNotificationToChild = async (payload: NotificationPayload) => {
    // Em uma implementação real, isso enviaria via Firebase Cloud Messaging
    // Por enquanto, simular com toast local
    console.log('📤 Enviando notificação para criança:', payload);
    
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (user?.userType === 'child') {
      // Se estamos no painel da criança, mostrar a notificação
      if (permission === 'granted') {
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/vite.svg',
          badge: payload.badge || '/vite.svg',
          tag: payload.tag || 'parent-message',
          requireInteraction: payload.requireInteraction || false,
          data: payload.data
        });
      }
      
      toast(payload.body, {
        duration: 6000,
        style: {
          background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
          color: '#FFFFFF',
          fontWeight: 'bold',
        },
      });
    }
    
    // Confirmar envio para o pai
    if (user?.userType === 'parent') {
      toast.success('📤 Notificação enviada para o Heitor!');
    }
  };
  return (
    <NotificationContext.Provider value={{
      requestPermission,
      showTaskReminder,
      showAchievementUnlocked,
      showRewardAvailable,
      showParentNotification,
      sendNotificationToChild,
      isSupported,
      permission,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};