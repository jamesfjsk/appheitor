import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { FlashIcon } from '../../icons';
import LoadingSpinner from '../common/LoadingSpinner';
import { useOffline } from '../../contexts/OfflineContext';
import toast from 'react-hot-toast';

const BANNER = '/assets/english/ui/banner.webp';
const MINER = '/assets/village/char/miner-iso.png';

const LoginScreen: React.FC = () => {
  const { user, login, loading } = useAuth();
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
    } catch {
      // Error already handled in AuthContext
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mn-page flex items-center justify-center p-4">
      <div className="mc-panel mc-pop rounded-lg overflow-hidden w-full max-w-[440px]">
        <div className="relative h-[140px] overflow-hidden border-b-4 border-[#17130f]">
          <img src={BANNER} alt="" className="absolute inset-0 w-full h-full object-cover mc-pixel" draggable={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2f2a27] via-[#2f2a27]/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
            <h1 className="mc-title text-base sm:text-lg">Miner Missions</h1>
            <p className="text-white/85">Missões do Heitor</p>
          </div>
        </div>

        <div className="p-5">
          <div className="mc-lbl flex items-center gap-2 mb-4">
            <span className={`w-2.5 h-2.5 ${isOffline ? 'bg-[#ff7b6b]' : 'bg-[#9be36a]'}`} />
            {isOffline ? <span className="mc-bad">Sem internet</span> : <span className="mc-good">Conectado</span>}
          </div>

          {loginMode === 'initial' && !isOffline && (
            <div className="space-y-3">
              <button
                type="button"
                data-testid="login-heitor"
                onClick={handleHeitorLogin}
                className="mc-btn mc-btn-row mc-btn-green w-full h-16 rounded-lg px-3 text-left"
              >
                <span className="mc-slot w-12 h-12 p-1 shrink-0">
                  <img src={MINER} alt="" className="w-full h-full object-contain mc-pixel" draggable={false} />
                </span>
                <span>
                  <span className="block text-xl font-bold">Entrar como Heitor</span>
                  <span className="block text-sm text-white/85">Painel de missões</span>
                </span>
              </button>

              <button
                type="button"
                data-testid="login-pai"
                onClick={() => setLoginMode('admin_form')}
                className="mc-btn mc-btn-row mc-btn-stone w-full h-14 rounded-lg px-3 text-left"
              >
                <span className="mc-slot w-12 h-12 flex items-center justify-center shrink-0">
                  <FlashIcon name="shield" className="w-6 h-6" />
                </span>
                <span>
                  <span className="block text-lg font-bold">Entrar como Pai</span>
                  <span className="block text-sm text-white/85">Painel dos pais</span>
                </span>
              </button>

              {import.meta.env.DEV && Boolean(__TEST_CHILD_EMAIL__) && (
                <button
                  type="button"
                  data-testid="login-teste"
                  onClick={async () => {
                    if (isOffline) {
                      toast.error('Sem conexão com a internet. Conecte-se para fazer login.');
                      return;
                    }
                    try {
                      await login(__TEST_CHILD_EMAIL__, __TEST_CHILD_PASSWORD__);
                    } catch {
                      // Error already handled in AuthContext
                    }
                  }}
                  className="mc-btn mc-btn-row mc-btn-stone w-full h-14 rounded-lg px-3 text-left"
                >
                  <span className="mc-slot w-12 h-12 flex items-center justify-center shrink-0">
                    <FlashIcon name="gamepad" className="w-6 h-6" />
                  </span>
                  <span>
                    <span className="block text-lg font-bold">Entrar como conta de teste</span>
                    <span className="block text-sm text-white/85">Só no modo desenvolvimento</span>
                  </span>
                </button>
              )}
            </div>
          )}

          {loginMode === 'admin_form' && !isOffline && (
            <form onSubmit={handleSubmit} className="mc-inv mc-pop rounded-lg p-4 space-y-4">
              <div className="mc-h">
                <FlashIcon name="shield" className="w-[26px] h-[26px]" />
                Entrar como Pai
              </div>

              <div>
                <label htmlFor="email" className="mc-lbl mb-1 block">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full h-11 px-3 bg-white text-[#1f1a17] border-[3px] border-[#373737] rounded-md outline-none focus:border-[#5b9b3a]"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="mc-lbl mb-1 block">Senha</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full h-11 px-3 bg-white text-[#1f1a17] border-[3px] border-[#373737] rounded-md outline-none focus:border-[#5b9b3a]"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading || isOffline}
                className="mc-btn mc-btn-green w-full h-12 rounded-md text-lg font-bold"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={() => setLoginMode('initial')}
                className="mc-muted underline text-sm"
              >
                Voltar
              </button>
            </form>
          )}

          {isOffline && (
            <div className="mc-card rounded-md p-4 text-center">
              <p className="mc-bad font-bold text-lg">Sem conexão</p>
              <p className="text-sm text-white/85 mt-2">
                Este aplicativo precisa de internet para funcionar. Conecte-se e recarregue a página.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
