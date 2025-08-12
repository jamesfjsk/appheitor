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
    <div className="min-h-screen bg-gradient-to-br from-hero-primary via-hero-secondary to-hero-accent flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="decorative-blob w-64 h-64 top-10 -left-20 opacity-30"></div>
        <div className="decorative-blob w-48 h-48 top-1/3 -right-16 opacity-20" style={{ animationDelay: '2s' }}></div>
        <div className="decorative-blob w-32 h-32 bottom-20 left-1/4 opacity-25" style={{ animationDelay: '4s' }}></div>
        <div className="decorative-star text-2xl top-20 right-1/4" style={{ animationDelay: '1s' }}>⭐</div>
        <div className="decorative-star text-xl bottom-32 right-20" style={{ animationDelay: '3s' }}>✨</div>
        <div className="decorative-star text-lg top-1/2 left-20" style={{ animationDelay: '5s' }}>💫</div>
      </div>
      
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="login-card p-8 relative"
        >
          {/* Logo e Título */}
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex items-center justify-center w-24 h-24 flash-avatar mb-6 pulse-glow"
            >
              <Lightning className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" />
            </motion.div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-hero-primary to-hero-accent bg-clip-text text-transparent mb-3">
              Flash Missions
            </h1>
            <p className="text-gray-600 font-medium">Aventuras diárias do super-herói Heitor ⚡</p>
          </div>

          {/* Status de Conexão */}
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 transition-all duration-300 ${
            isOffline ? 'bg-error-50 text-error-600 border border-error-200' : 'bg-success-50 text-success-600 border border-success-200'
          }`}>
            {isOffline ? (
              <>
                <WifiOff className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Sem conexão - Login indisponível</span>
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Conectado - Sistema online ✨</span>
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
                className="btn-hero w-full p-5 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg relative overflow-hidden"
              >
                <Lightning className="w-7 h-7 text-white drop-shadow-md wiggle" fill="currentColor" />
                Entrar como Heitor (Filho)
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 lightning-effect"></div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLoginMode('admin_form')}
                className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-3 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg"
              >
                <Shield className="w-6 h-6" />
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || isOffline}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                  'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isRegistering ? 'Criando conta...' : 'Entrando...'}
                  </div>
                ) : (
                  'Entrar como Admin'
                )}
              </motion.button>
            </motion.form>
          )}

          {/* Mensagem quando offline */}
          {isOffline && (
            <div className="text-center py-8">
              <WifiOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Sem Conexão
              </h3>
              <p className="text-gray-600 text-sm">
                Este aplicativo requer conexão com a internet para funcionar.
                Conecte-se e recarregue a página.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default LoginScreen;