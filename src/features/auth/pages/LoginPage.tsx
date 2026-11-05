import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../../components/layout/AuthLayout.tsx';
import { LoginForm } from '../LoginForm.tsx';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.ts';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, profile } = useAuth();

  // If already authenticated, redirect to home or previous route
  useEffect(() => {
    if (isAuthenticated && profile) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, profile, navigate, location]);

  return (
    <AuthLayout
      title="Portal del Comité de Investigación"
      subtitle="Ingrese con su correo institucional para acceder a la gestión de trámites"
    >
      <div className="space-y-6">
        <LoginForm
          onLoginSuccess={() => {
            const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
            navigate(from, { replace: true });
          }}
        />

        <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600">
          <span>¿No tiene cuenta de investigador?</span>
          <Link
            to="/register"
            className="font-bold text-[#14281D] hover:underline flex items-center gap-1"
          >
            <UserPlus size={13} />
            <span>Registrar nueva cuenta</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
