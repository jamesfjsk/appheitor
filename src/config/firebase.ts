import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore,
  enableNetwork, 
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// ========================================
// 🔥 VALIDAÇÃO DAS VARIÁVEIS ENV
// ========================================

const requiredEnvVars = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

const optionalEnvVars = {
  VITE_FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  VITE_FIREBASE_VAPID_KEY: import.meta.env.VITE_FIREBASE_VAPID_KEY,
};

// Verificar variáveis obrigatórias
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value || value.trim() === '')
  .map(([key]) => key);

if (missingVars.length > 0) {
  const errorMessage = `
🚨 ERRO CRÍTICO: Variáveis Firebase não configuradas!
❌ Variáveis faltando: ${missingVars.join(', ')}
📋 SOLUÇÃO: Configure o arquivo .env com as credenciais do Firebase Console
  `;
  console.error(errorMessage);
  throw new Error(`Firebase não configurado: ${missingVars.join(', ')}`);
}

// Configuração do Firebase
const firebaseConfig = {
  apiKey: requiredEnvVars.VITE_FIREBASE_API_KEY,
  authDomain: requiredEnvVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: requiredEnvVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: requiredEnvVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: requiredEnvVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: requiredEnvVars.VITE_FIREBASE_APP_ID,
  measurementId: optionalEnvVars.VITE_FIREBASE_MEASUREMENT_ID || undefined
};

// ========================================
// 🔥 INICIALIZAÇÃO DO FIREBASE
// ========================================

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Inicializar Firestore com opções otimizadas
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});

// Habilitar persistência offline
enableIndexedDbPersistence(db).catch((error) => {
  console.warn('⚠️ Persistência offline não disponível:', error.message);
});

// Messaging (opcional)
let messaging: any = null;
try {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.warn('⚠️ Firebase Messaging não disponível:', error);
}

// ========================================
// 🔥 FUNÇÕES DE NOTIFICAÇÃO
// ========================================

export const getNotificationToken = async (): Promise<string | null> => {
  if (!messaging) return null;
  
  try {
    const vapidKey = optionalEnvVars.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) return null;
    
    const token = await getToken(messaging, { vapidKey });
    return token;
  } catch (error) {
    console.error('❌ Erro ao obter token de notificação:', error);
    return null;
  }
};

export const onMessageListener = () => {
  if (!messaging) {
    return Promise.reject('Messaging não disponível');
  }
  
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
};

export { messaging };