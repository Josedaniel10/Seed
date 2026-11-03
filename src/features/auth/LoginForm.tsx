import React, { useState } from 'react';
import { useAuthStore, DEMO_USERS } from './authStore.ts';
import { UserRole } from '../../types/database.ts';
import { LogIn, LogOut, ShieldCheck, Mail, Lock, UserCheck, KeyRound, Sparkles, AlertTriangle } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { profile, isAuthenticated, isLoading, error, login, logout, clearError, resendConfirmationEmail } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setResendStatus(null);
    await login(email, password);
  };

  const handleResendEmail = async () => {
    if (!email) return;
    setResendStatus('Reenviando correo...');
    const res = await resendConfirmationEmail(email);
    if (res.success) {
      setResendStatus(res.message || 'Correo reenviado. Revisa tu bandeja de entrada o spam.');
    } else {
      setResendStatus(`Error: ${res.error}`);
    }
  };

  const handleQuickRoleLogin = async (role: UserRole) => {
    clearError();
    const demo = DEMO_USERS[role];
    await login(demo.email, 'password123', demo.role, demo.name);
  };

  const roleBadges: Record<UserRole, { label: string; bg: string; text: string }> = {
    investigador: { label: 'Investigador', bg: 'bg-stone-100', text: 'text-stone-800' },
    administrativo: { label: 'Administrativo', bg: 'bg-emerald-100', text: 'text-emerald-900' },
    integrante_comite: { label: 'Integrante Comité', bg: 'bg-amber-100', text: 'text-amber-900' },
    secretario: { label: 'Secretario(a)', bg: 'bg-[#A3E635]', text: 'text-[#14281D]' },
    lider_grupo: { label: 'Líder de Grupo', bg: 'bg-teal-100', text: 'text-teal-900' },
    admin: { label: 'Administrador', bg: 'bg-purple-100', text: 'text-purple-900' },
  };

  if (isAuthenticated && profile) {
    const badge = roleBadges[profile.role] || roleBadges.investigador;

    return (
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1E3A2B]">
            <UserCheck size={16} className="text-[#84CC16]" />
            <span>Sesión Activa · RF-02</span>
          </div>

          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border border-black/10 ${badge.bg} ${badge.text}`}>
            Rol: {badge.label}
          </span>
        </div>

        <div className="bg-[#F7F6F2] rounded-xl p-4 border border-[#E5E3DC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#14281D] text-[#F7F6F2] font-bold text-sm flex items-center justify-center shrink-0">
              {profile.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>

            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-[#14281D]">{profile.full_name}</h3>
              <p className="text-xs text-stone-600 font-mono">{profile.email}</p>
              <p className="text-[11px] text-stone-500">
                {profile.academic_program} · {profile.academic_link || 'Docente'}
              </p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            disabled={isLoading}
            className="px-4 py-2 bg-white hover:bg-stone-50 text-rose-800 text-xs font-semibold rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-2xs"
          >
            <LogOut size={14} />
            <span>Cerrar sesión</span>
          </button>
        </div>

        <div className="text-[11px] text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200 flex items-start gap-2">
          <ShieldCheck size={15} className="text-[#84CC16] shrink-0 mt-0.5" />
          <span>
            <strong>Persistencia activa:</strong> Si recargas la página (F5), la sesión y permisos de <strong>{profile.full_name}</strong> se mantienen intactos. Al pulsar <em>Cerrar sesión</em>, el almacenamiento se limpia en su totalidad.
          </span>
        </div>

        {/* Switcher rápido de rol para pruebas */}
        <div className="pt-2 border-t border-stone-100">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-2">
            Alternar rápidamente a otro rol para pruebas de permisos:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(DEMO_USERS) as UserRole[]).map((r) => {
              const u = DEMO_USERS[r];
              const isCurrent = profile.role === r;
              return (
                <button
                  key={r}
                  onClick={() => handleQuickRoleLogin(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-[#14281D] text-white border-[#14281D] font-bold'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {u.role.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 md:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
      <div className="border-b border-stone-100 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1E3A2B]">
          <LogIn size={15} className="text-[#84CC16]" />
          <span>RF-02 · Autenticación y Control de Sesión</span>
        </div>
        <h2 className="text-xl font-extrabold text-[#14281D] mt-1">
          Inicio de Sesión en Seed
        </h2>
        <p className="text-xs text-stone-600 mt-1">
          Acceso seguro institucional con persistencia de sesión en recarga y control de acceso por roles.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-800 space-y-2">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle size={15} className="text-rose-600 shrink-0" />
            <span>
              {error.toLowerCase().includes('email not confirmed')
                ? 'Correo pendiente de confirmación en Supabase'
                : 'Aviso de Autenticación Supabase'}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed">
            {error.toLowerCase().includes('email not confirmed')
              ? 'Tu usuario fue creado exitosamente en la base de datos de Supabase, pero la configuración de tu proyecto requiere que confirmes el enlace enviado a tu correo antes de iniciar sesión.'
              : error}
          </p>

          {error.toLowerCase().includes('email not confirmed') && (
            <div className="pt-1.5 border-t border-rose-200/60 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  className="px-3 py-1 bg-white hover:bg-stone-50 text-rose-900 border border-rose-300 font-semibold text-[11px] rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  Reenviar correo de confirmación
                </button>
              </div>

              {resendStatus && (
                <p className="text-[11px] font-medium text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200">
                  {resendStatus}
                </p>
              )}

              <p className="text-[10px] text-stone-500 bg-white/70 p-2 rounded border border-rose-100">
                <strong>Tip para desarrollo:</strong> Si deseas iniciar sesión de inmediato sin verificar enlaces de correo, en tu panel de <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-semibold text-[#14281D]">Supabase</a> ve a <em>Authentication → Providers → Email</em> y desmarca la casilla <em>"Confirm email"</em>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Formulario manual de login */}
      <form onSubmit={handleManualLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#14281D] mb-1" htmlFor="login-email">
            Correo Institucional
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <Mail size={15} />
            </span>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.usuario@universidad.edu.co"
              required
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E5E3DC] bg-white text-[#14281D] focus:outline-none focus:ring-2 focus:ring-[#14281D]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#14281D] mb-1" htmlFor="login-password">
            Contraseña
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <Lock size={15} />
            </span>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E5E3DC] bg-white text-[#14281D] focus:outline-none focus:ring-2 focus:ring-[#14281D]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
        >
          <LogIn size={14} />
          <span>{isLoading ? 'Verificando credenciales...' : 'Iniciar Sesión'}</span>
        </button>
      </form>

      {/* Selector rápido de roles precargados para pruebas ágiles */}
      <div className="pt-4 border-t border-stone-100 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
          <KeyRound size={14} className="text-[#84CC16]" />
          <span>Acceso Rápido por Rol Institucional (Modo Demostración / Pruebas)</span>
        </div>
        <p className="text-[11px] text-stone-500">
          Haz clic en cualquiera de los roles precargados para autenticarte al instante y probar la persistencia de sesión:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(DEMO_USERS) as UserRole[]).map((r) => {
            const u = DEMO_USERS[r];
            const badge = roleBadges[r];
            return (
              <button
                key={r}
                onClick={() => handleQuickRoleLogin(r)}
                className="p-2.5 text-left rounded-xl border border-[#E5E3DC] hover:border-[#14281D] hover:shadow-xs transition-all bg-[#F7F6F2] hover:bg-white cursor-pointer group"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 group-hover:text-[#14281D]">
                  {badge.label}
                </div>
                <div className="text-xs font-semibold text-[#14281D] truncate mt-0.5">{u.name}</div>
                <div className="text-[10px] text-stone-500 truncate">{u.email}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
