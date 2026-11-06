import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSessionStore, TEST_USERS } from '../../stores/session.store.ts';
import { ROLE_LABELS, ROLE_HOME_PATHS, AppRole } from '../../lib/permisos.ts';
import { Mail, Lock, LogIn, ArrowRight, UserCheck, Shield } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithCredentials, loginWithTestRole, isLoading } = useSessionStore();
  const [email, setEmail] = useState('investigador@universidad.edu.co');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await loginWithCredentials(email, password);
    if (res.success) {
      const activeRole = useSessionStore.getState().user?.activeRole || 'investigador';
      navigate(ROLE_HOME_PATHS[activeRole], { replace: true });
    } else {
      setError(res.error || 'Credenciales no válidas.');
    }
  };

  const handleQuickRoleLogin = (role: AppRole) => {
    loginWithTestRole(role);
    navigate(ROLE_HOME_PATHS[role], { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-[#14281D]">Iniciar Sesión</h2>
        <p className="text-xs text-stone-500">
          Ingrese con su correo institucional para acceder al sistema
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Correo Institucional
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 text-stone-400" size={16} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] focus:ring-1 focus:ring-[#14281D] outline-none"
              placeholder="nombre@universidad.edu.co"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 text-stone-400" size={16} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] focus:ring-1 focus:ring-[#14281D] outline-none"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
        >
          <LogIn size={15} />
          <span>{isLoading ? 'Ingresando...' : 'Acceder a la Plataforma'}</span>
        </button>
      </form>

      {/* Acceso Rápido por Rol Institucional para Pruebas (Sección 8) */}
      <div className="pt-4 border-t border-stone-100 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500">
          <UserCheck size={13} className="text-[#84CC16]" />
          <span>Acceso rápido por rol institucional</span>
        </div>
        <p className="text-[11px] text-stone-500">
          Haga clic en un perfil para ingresar directamente con sus permisos:
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {(Object.keys(TEST_USERS) as AppRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleQuickRoleLogin(r)}
              className="p-2 text-left rounded-xl border border-[#E5E3DC] hover:border-[#14281D] hover:bg-[#F7F6F2] transition-colors cursor-pointer"
            >
              <div className="font-bold text-[#14281D] text-[11px] truncate">
                {ROLE_LABELS[r]}
              </div>
              <div className="text-[10px] text-stone-500 truncate">
                {TEST_USERS[r].fullName.split(' ')[0]} {TEST_USERS[r].fullName.split(' ')[1] || ''}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 text-center text-xs text-stone-500">
        ¿No tiene cuenta de investigador?{' '}
        <Link to="/registro" className="font-bold text-[#14281D] hover:underline">
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
