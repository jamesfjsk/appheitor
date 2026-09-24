import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClockProvider } from './contexts/ClockContext';
import { DataProvider } from './contexts/DataContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SoundProvider } from './contexts/SoundContext';
import { PunishmentProvider } from './contexts/PunishmentContext';
import { VacationProvider } from './contexts/VacationContext';
import LoginScreen from './components/auth/LoginScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HeroPanel from './components/hero/HeroPanel';
import ParentPanel from './components/parent/ParentPanel';
import OfflineBanner from './components/common/OfflineBanner';
import LoadingSpinner from './components/common/LoadingSpinner';
import ChatFlashGPT from './components/common/ChatFlashGPT';
import { AI_CHAT_ENABLED } from './config/rules';
import { installErrorLog } from './services/observability';
import { useAppUpdate } from './hooks/useAppUpdate';
import './index.css';

installErrorLog();

// Component to handle role-based redirect for root path
const RoleBasedRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Carregando..." />;
  }

  if (!user) {
    const qs = typeof window !== 'undefined' ? window.location.search : '';
    return <Navigate to={`/login${qs}`} replace />;
  }

  const qs = typeof window !== 'undefined' ? window.location.search : '';
  const redirectTo = (user.role === 'admin' ? '/admin' : '/flash') + qs;
  return <Navigate to={redirectTo} replace />;
};

function App() {
  useAppUpdate();
  const forceBoot = import.meta.env.DEV
    && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('boot') === '1';

  return (
    <div className="App">
      <OfflineProvider>
        <SoundProvider>
          <AuthProvider>
            <ClockProvider>
            <NotificationProvider>
              <VacationProvider>
              <DataProvider>
                <PunishmentProvider>
                  <Router>
                  <div className="min-h-screen bg-white">
                    <OfflineBanner />
                    {forceBoot ? (
                      <LoadingSpinner />
                    ) : (
                    <Routes>
                      <Route path="/login" element={<LoginScreen />} />
                      <Route 
                        path="/flash" 
                        element={
                          <ProtectedRoute requiredRole="child">
                            <HeroPanel />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/admin" 
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <ParentPanel />
                          </ProtectedRoute>
                        } 
                      />
                      <Route path="/" element={<RoleBasedRedirect />} />
                    </Routes>
                    )}
                  </div>
                  <Toaster 
                    position="bottom-center"
                    gutter={8}
                    containerStyle={{ bottom: 96, zIndex: 35 }}
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#363636',
                        color: '#fff',
                      },
                    }}
                  />
                  {AI_CHAT_ENABLED && <ChatFlashGPT />}
                  </Router>
                </PunishmentProvider>
              </DataProvider>
              </VacationProvider>
            </NotificationProvider>
            </ClockProvider>
          </AuthProvider>
        </SoundProvider>
      </OfflineProvider>
    </div>
  );
}

export default App;