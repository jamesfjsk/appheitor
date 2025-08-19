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
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-500 to-red-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          {/* Logo e Título */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full mb-4 shadow-2xl border-4 border-yellow-400"
            >
              <img 
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThmdGPdw5KIVi5gQ-UWFdptTPziXMRjk6phx4Noy3Toh9Nu_nbnP-YZGe9sdfP0jrVakc&usqp=CAU"
                alt="Avatar do Heitor"
                className="w-full h-full object-cover rounded-full"
              />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Heitor Missions</h1>
            <p className="text-gray-600">Sistema de missões personalizado para o Heitor</p>
          </div>

          {/* Status de Conexão */}
          <div className={`mb-6 p-3 rounded-lg flex items-center gap-2 ${
            isOffline ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {isOffline ? (
              <>
                <WifiOff className="w-5 h-5" />
                <span className="text-sm font-medium">Sem conexão - Login indisponível</span>
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5" />
                <span className="text-sm font-medium">Conectado - Firebase ativo</span>
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
                className="w-full p-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-bold text-xl flex items-center justify-center gap-4 hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                  <img 
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThmdGPdw5KIVi5gQ-UWFdptTPziXMRjk6phx4Noy3Toh9Nu_nbnP-YZGe9sdfP0jrVakc&usqp=CAU"
                    alt="Avatar do Heitor"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold">Entrar como Heitor</div>
                  <div className="text-yellow-300 text-sm font-medium">Painel de Missões</div>
                </div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLoginMode('admin_form')}
                className="w-full p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-4 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-bold">Entrar como Pai</div>
                  <div className="text-blue-200 text-sm font-medium">Painel Administrativo</div>
                </div>
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
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-blue-900">Painel Administrativo</div>
                    <div className="text-sm text-blue-700">Acesso para pais e responsáveis</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLoginMode('initial')}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 bg-white/50 hover:bg-white/80 rounded-lg transition-colors font-medium"
                >
                  ← Voltar
                </button>
              </div>

              {/* Nome (apenas para registro) */}
              <div>
                <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  Senha
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
                  placeholder="••••••••"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || isOffline}
                className="w-full py-4 px-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Entrando...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="w-5 h-5" />
                    Entrar como Admin
                  </div>
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