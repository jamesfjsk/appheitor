import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SoundProvider } from './contexts/SoundContext';
import { PunishmentProvider } from './contexts/PunishmentContext';
import LoginScreen from './components/auth/LoginScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HeroPanel from './components/hero/HeroPanel';
import ParentPanel from './components/parent/ParentPanel';
import OfflineBanner from './components/common/OfflineBanner';
import DoctorPage from './components/debug/DoctorPage';
import LoadingSpinner from './components/common/LoadingSpinner';
import ChatFlashGPT from './components/common/ChatFlashGPT';
import './index.css';

// Component to handle role-based redirect for root path
const RoleBasedRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Carregando..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user's role from database
  const redirectTo = user.role === 'admin' ? '/admin' : '/flash';
  return <Navigate to={redirectTo} replace />;
};

function App() {
  return (
    <div className="App">
      <OfflineProvider>
        <SoundProvider>
          <AuthProvider>
            <NotificationProvider>
              <DataProvider>
                <PunishmentProvider>
                  <Router>
                  <div className="min-h-screen bg-white">
                    <OfflineBanner />
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
                      <Route path="/doctor" element={<DoctorPage />} />
                      <Route path="/" element={<RoleBasedRedirect />} />
                    </Routes>
                  </div>
                  <Toaster 
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#363636',
                        color: '#fff',
                      },
                    }}
                  />
                  <ChatFlashGPT />
                  </Router>
                </PunishmentProvider>
              </DataProvider>
            </NotificationProvider>
          </AuthProvider>
        </SoundProvider>
      </OfflineProvider>
    </div>
  );
}

export default App;