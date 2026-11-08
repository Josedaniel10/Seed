import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSessionStore } from '../../stores/session.store.ts';
import { ROLE_HOME_PATHS } from '../../lib/permisos.ts';
import { Mail, Lock, LogIn, AlertCircle, RefreshCw, Send, CheckCircle2, KeyRound } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithCredentials, verifyOtpCode, resendConfirmationEmail, isLoading } = useSessionStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ loading: boolean; message?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendStatus(null);
    setUnconfirmedEmail(null);

    const res = await loginWithCredentials(email, password);
    if (res.success) {
      const activeRole = useSessionStore.getState().user?.activeRole || 'researcher';
      const homePath = ROLE_HOME_PATHS[activeRole] || '/mis-solicitudes';
      navigate(homePath, { replace: true });
    } else {
      if (res.requiresEmailConfirmation && res.email) {
        setUnconfirmedEmail(res.email);
        setShowOtpInput(true);
      }
      setError(res.error || 'Credenciales no válidas. Verifique su correo institucional y contraseña.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unconfirmedEmail || !otpCode || otpCode.length < 6) {
      setError('Por favor ingrese el código de 6 dígitos.');
      return;
    }
    setError(null);
    setIsVerifyingOtp(true);
    const res = await verifyOtpCode(unconfirmedEmail, otpCode);
    setIsVerifyingOtp(false);

    if (res.success) {
      const activeRole = useSessionStore.getState().user?.activeRole || 'researcher';
      navigate(ROLE_HOME_PATHS[activeRole] || '/mis-solicitudes', { replace: true });
    } else {
      setError(res.error || 'Código incorrecto o expirado.');
    }
  };

  const handleResendEmail = async () => {
    if (!unconfirmedEmail) return;
    setResendStatus({ loading: true });
    const res = await resendConfirmationEmail(unconfirmedEmail);
    if (res.success) {
      setResendStatus({ loading: false, message: res.message });
    } else {
      setResendStatus({ loading: false, error: res.error });
    }
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
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
          <div className="space-y-2 flex-1">
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Si el correo no está confirmado, ofrece ingresar el código OTP o reenviar correo */}
      {showOtpInput && unconfirmedEmail && (
        <div className="p-4 rounded-xl bg-[#F7F6F2] border border-[#E5E3DC] space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#14281D]">
            <KeyRound size={14} className="text-[#84CC16]" />
            <span>Confirmar cuenta con código de 6 dígitos</span>
          </div>
          <p className="text-[11px] text-stone-500">
            Digite el código numérico que recibió en <strong>{unconfirmedEmail}</strong>:
          </p>

          <form onSubmit={handleVerifyOtp} className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="flex-1 px-3 py-2 text-center tracking-widest text-base font-mono font-bold rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none bg-white"
            />
            <button
              type="submit"
              disabled={isVerifyingOtp || otpCode.length < 6}
              className="px-4 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {isVerifyingOtp ? 'Validando...' : 'Activar y entrar'}
            </button>
          </form>

          <div className="pt-1 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={resendStatus?.loading}
              className="text-stone-600 hover:text-[#14281D] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {resendStatus?.loading ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
              <span>Reenviar correo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOtpInput(false)}
              className="text-stone-500 hover:text-stone-700 hover:underline"
            >
              Volver a login normal
            </button>
          </div>
        </div>
      )}

      {resendStatus?.message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>{resendStatus.message}</span>
        </div>
      )}

      {resendStatus?.error && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-amber-600" />
          <span>{resendStatus.error}</span>
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
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] focus:ring-1 focus:ring-[#14281D] outline-none bg-white"
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
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] focus:ring-1 focus:ring-[#14281D] outline-none bg-white"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-60"
        >
          <LogIn size={15} />
          <span>{isLoading ? 'Ingresando...' : 'Acceder a la Plataforma'}</span>
        </button>
      </form>

      <div className="pt-2 text-center text-xs text-stone-500">
        ¿No tiene cuenta de investigador?{' '}
        <Link to="/registro" className="font-bold text-[#14281D] hover:underline">
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
