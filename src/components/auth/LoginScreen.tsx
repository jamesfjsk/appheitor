import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CloudLightning as Lightning, Shield, Wifi, WifiOff } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import { useOffline } from '../../contexts/OfflineContext';
import toast from 'react-hot-toast';

const LoginScreen: React.FC = () => {
  const { user, login, register, loading } = useAuth();
  const { isOffline } = useOffline();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loginMode, setLoginMode] = useState<'initial' | 'admin_form'>('initial');


  // If user is already logged in, redirect to appropriate panel
  if (user && !loading) {
    const redirectTo = user.role === 'admin' ? '/admin' : '/flash';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isOffline) {
      toast.error('Sem conexão com a internet. Conecte-se para fazer login.');
      return;
    }


    try {
      await login(formData.email, formData.password);
      // Navigation will be handled by the redirect logic above after login
    } catch (error) {
      console.error('🚨 LOGIN - Erro no processo de login:', error);
      // Erro já tratado no contexto
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  
  const handleHeitorLogin = async () => {
    if (isOffline) {
      toast.error('Sem conexão com a internet. Conecte-se para fazer login.');
      return;
    }
    try {
      await login('heitor@flash.com', '123456');
    } catch (error) {
      // Error already handled in AuthContext
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="login-container">
      
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="login-card"
        >
          {/* Logo e Título */}
          <div className="text-center mb-8">
            <motion.div
              className="flash-logo"
            >
              <Lightning className="w-6 h-6" fill="currentColor" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Flash Missions
            </h1>
            <p className="text-gray-600">Sistema de tarefas para o Heitor</p>
          </div>

          {/* Status de Conexão */}
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 transition-all duration-300 ${
            isOffline ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'
          }`}>
            {isOffline ? (
              <>
                <WifiOff className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">Sem conexão - Login indisponível</span>
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">Sistema online</span>
              </>
            )}
          </div>

          {/* Seleção de Perfil */}
          {loginMode === 'initial' && !isOffline && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 mb-6"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleHeitorLogin}
                className="btn-primary w-full"
              >
                <Lightning className="w-5 h-5" fill="currentColor" />
                Entrar como Heitor (Filho)
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLoginMode('admin_form')}
                className="btn-secondary w-full"
              >
                <Shield className="w-5 h-5" />
                Entrar como Pai
              </motion.button>
            </motion.div>
          )}

          {/* Formulário de Login */}
          {loginMode === 'admin_form' && !isOffline && (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setLoginMode('initial')}
                  className="ml-auto text-sm text-gray-500 hover:text-gray-700"
                >
                  Trocar
                </button>
              </div>
                      Entrando...
              {/* Nome (apenas para registro) */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="••••••••"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || isOffline}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isRegistering ? 'Criando conta...' : 'Entrando...'}
                  </div>
                ) : (
                  'Entrar como Pai'
                )}
              </motion.button>
            </motion.form>
          )}

          {/* Mensagem quando offline */}
          {isOffline && (
            <div className="text-center py-8">
              <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sem Conexão
              </h3>
              <p className="text-gray-600 text-sm">
                Conecte-se à internet para fazer login.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default LoginScreen;