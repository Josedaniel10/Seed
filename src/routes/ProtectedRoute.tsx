import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.ts';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#14281D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-600 font-medium">Verificando sesión institucional...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    // Redirigir a login preservando la ruta que intentaba visitar
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
