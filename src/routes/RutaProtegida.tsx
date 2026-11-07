import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessionStore } from '../stores/session.store.ts';
import { AppRole, roleMatches } from '../lib/permisos.ts';

interface RutaProtegidaProps {
  children: React.ReactNode;
  rolesPermitidos?: AppRole[];
}

export function RutaProtegida({ children, rolesPermitidos }: RutaProtegidaProps) {
  const { user, isAuthenticated, isLoading } = useSessionStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#14281D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-600 font-medium">Cargando sesión institucional...</p>
        </div>
      </div>
    );
  }

  // 1. Sin sesión: redirige a /login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Con sesión pero sin el rol permitido: redirige a /sin-acceso
  if (rolesPermitidos && rolesPermitidos.length > 0) {
    const hasRole = rolesPermitidos.some((r) => roleMatches(user.activeRole, r));
    if (!hasRole) {
      return <Navigate to="/sin-acceso" replace />;
    }
  }

  return <>{children}</>;
}
