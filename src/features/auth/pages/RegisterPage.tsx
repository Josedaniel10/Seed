import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../../components/layout/AuthLayout.tsx';
import { RegisterForm } from '../RegisterForm.tsx';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.ts';

export function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();

  useEffect(() => {
    if (isAuthenticated && profile) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, profile, navigate]);

  return (
    <AuthLayout
      title="Registro de Investigador"
      subtitle="Complete sus datos institucionales para radicar proyectos ante el Comité de Investigación"
    >
      <div className="space-y-6">
        <RegisterForm onNavigateLogin={() => navigate('/login')} />

        <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600">
          <span>¿Ya tiene una cuenta registrada?</span>
          <Link
            to="/login"
            className="font-bold text-[#14281D] hover:underline flex items-center gap-1"
          >
            <LogIn size={13} />
            <span>Iniciar Sesión</span>
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
