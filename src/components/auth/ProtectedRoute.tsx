import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'admin' | 'child';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();


  // Show loading while auth is being determined
  if (loading) {
    return <LoadingSpinner message="Verificando autenticação..." />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    const qs = typeof window !== 'undefined' ? window.location.search : '';
    return <Navigate to={`/login${qs}`} replace />;
  }

  // Check if user has the required role
  if (user.role !== requiredRole) {
    const qs = typeof window !== 'undefined' ? window.location.search : '';
    const redirectTo = (user.role === 'admin' ? '/admin' : '/flash') + qs;
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;