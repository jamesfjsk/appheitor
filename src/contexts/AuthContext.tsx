import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { User } from '../types';
import { FirestoreService } from '../services/firestoreService';
import toast from 'react-hot-toast';
import { getErrorCode } from '../utils/errors';

interface AuthContextType {
  user: User | null;
  childUid: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, userType: 'parent' | 'child') => Promise<void>;
  logout: () => Promise<void>;
  syncData: () => Promise<void>;
  setViewChildUid: (uid: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [childUid, setChildUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const determineRole = (email: string): 'admin' | 'child' => {
    return email.includes('pai') || email.includes('admin') ? 'admin' : 'child';
  };

  const ensureUserSetup = async (firebaseUser: FirebaseUser): Promise<User> => {
    try {
      const role = determineRole(firebaseUser.email || '');
      
      // Ensure user document exists
      const user = await FirestoreService.ensureUserDocument(
        firebaseUser.uid,
        firebaseUser.email || '',
        role
      );

      if (role === 'admin') {
        // Ensure admin has a linked child
        const managedChildId = await FirestoreService.ensureAdminChildLink(firebaseUser.uid);
        setChildUid(managedChildId);
        
        // Ensure child progress exists
        await FirestoreService.ensureUserProgress(managedChildId);
        
        console.log('✅ AUTH - Admin setup complete:', {
          adminUid: firebaseUser.uid,
          childUid: managedChildId
        });
        
        return { ...user, managedChildId };
      } else {
        // Child user
        setChildUid(firebaseUser.uid);
        
        // Ensure child progress exists
        await FirestoreService.ensureUserProgress(firebaseUser.uid);
        
        console.log('✅ AUTH - Child setup complete:', {
          childUid: firebaseUser.uid
        });
        
        return user;
      }
    } catch (error) {
      console.error('❌ AUTH - Error in user setup:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          console.log('🔥 AUTH - User authenticated:', firebaseUser.email);
          const user = await ensureUserSetup(firebaseUser);
          setUser(user);
        } else {
          console.log('🔥 AUTH - User not authenticated');
          setUser(null);
          setChildUid(null);
        }
      } catch (error) {
        console.error('🚨 AUTH - Error in auth state change:', error);
        const code = getErrorCode(error);
        if (code === 'permission-denied') {
          toast.error('Acesso negado. Verifique as regras do Firestore.');
        } else if (code === 'failed-precondition') {
          toast.error('Banco Firestore não configurado.');
        } else {
          toast.error('Erro de autenticação');
        }
        setUser(null);
        setChildUid(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureUserSetup is stable for the lifetime of the provider; the listener must be registered once
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const errorMessages = {
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/invalid-email': 'Email inválido',
        'auth/network-request-failed': 'Erro de conexão'
      };
      
      const message = errorMessages[getErrorCode(error) as keyof typeof errorMessages] || 'Erro ao fazer login';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string, userType: 'parent' | 'child') => {
    try {
      setLoading(true);
      console.log('📝 AUTH - Registering new', userType, 'account:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = await ensureUserSetup(userCredential.user);
      setUser(user);
      toast.success(`Conta criada com sucesso! Bem-vindo, ${displayName}!`);
    } catch (error) {
      const errorMessages = {
        'auth/email-already-in-use': 'Este email já está em uso',
        'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres',
        'auth/invalid-email': 'Email inválido',
        'auth/network-request-failed': 'Erro de conexão'
      };
      
      const message = errorMessages[getErrorCode(error) as keyof typeof errorMessages] || 'Erro ao criar conta';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setChildUid(null);
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Erro no logout:', error);
      toast.error('Erro ao fazer logout');
      throw error;
    }
  };

  const syncData = async () => {
    if (childUid) {
      try {
        await FirestoreService.syncUserData(childUid);
        toast.success('Dados sincronizados.');
      } catch (error) {
        console.error('❌ Erro ao sincronizar dados:', error);
        toast.error('Erro ao sincronizar dados');
      }
    }
  };

  const setViewChildUid = (uid: string) => {
    if (user?.role !== 'admin' || !uid) return;
    setChildUid(uid);
  };

  const value: AuthContextType = {
    user,
    childUid,
    loading,
    login,
    register,
    logout,
    syncData,
    setViewChildUid,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};