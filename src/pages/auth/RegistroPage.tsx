import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSessionStore } from '../../stores/session.store.ts';
import { ROLE_HOME_PATHS } from '../../lib/permisos.ts';
import { User, Mail, Lock, BookOpen, Layers, CheckCircle2, AlertCircle, RefreshCw, Send, KeyRound, Sparkles } from 'lucide-react';

export function RegistroPage() {
  const navigate = useNavigate();
  const { registerUser, verifyOtpCode, resendConfirmationEmail, checkEmailConfirmed, user, isAuthenticated, isLoading } = useSessionStore();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    academicLink: 'Docente planta',
    academicProgram: 'Ingeniería Ambiental y Bioprocesos',
    researchGroup: 'Grupo de Investigación en Biotecnología Aplicada',
  });
  const [isSuccess, setIsSuccess] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ loading: boolean; message?: string; error?: string } | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Si el usuario ya está autenticado (por ejemplo tras hacer clic en el enlace del correo),
  // redirigir automáticamente a su módulo inicial
  useEffect(() => {
    if (isAuthenticated && user) {
      const homePath = ROLE_HOME_PATHS[user.activeRole] || '/mis-solicitudes';
      navigate(homePath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Sondeo automático cada 3 segundos mientras espera confirmación
  // Si el usuario hace clic en el enlace desde otra pestaña o dispositivo, la app lo detecta sola
  useEffect(() => {
    if (!requiresConfirmation || !registeredEmail) return;

    const intervalId = setInterval(async () => {
      const res = await checkEmailConfirmed(registeredEmail);
      if (res.confirmed) {
        setIsSuccess(true);
        setTimeout(() => {
          navigate(ROLE_HOME_PATHS.researcher, { replace: true });
        }, 1000);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [requiresConfirmation, registeredEmail, checkEmailConfirmed, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendStatus(null);

    const res = await registerUser({
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
      academicLink: formData.academicLink,
      academicProgram: formData.academicProgram,
      researchGroup: formData.researchGroup,
    });

    if (res.success) {
      if (res.requiresEmailConfirmation) {
        setRequiresConfirmation(true);
        setRegisteredEmail(res.email || formData.email);
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          navigate(ROLE_HOME_PATHS.researcher, { replace: true });
        }, 1200);
      }
    } else {
      setError(res.error || 'Ocurrió un error al registrar el usuario.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError('Por favor ingrese el código completo de 6 dígitos.');
      return;
    }
    setError(null);
    setIsVerifyingOtp(true);
    const res = await verifyOtpCode(registeredEmail, otpCode);
    setIsVerifyingOtp(false);

    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        navigate(ROLE_HOME_PATHS.researcher, { replace: true });
      }, 1000);
    } else {
      setError(res.error || 'Código incorrecto o expirado.');
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResendStatus({ loading: true });
    const res = await resendConfirmationEmail(registeredEmail);
    if (res.success) {
      setResendStatus({ loading: false, message: res.message });
    } else {
      setResendStatus({ loading: false, error: res.error });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-[#14281D]">Registro de Investigadores</h2>
        <p className="text-xs text-stone-500">
          Cree su cuenta institucional para radicar proyectos y solicitudes
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {requiresConfirmation ? (
        <div className="p-5 rounded-2xl bg-white border border-[#E5E3DC] space-y-5 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
            <Mail size={24} />
          </div>

          <div className="text-center space-y-1.5">
            <h3 className="font-bold text-sm text-[#14281D]">
              Activación de Cuenta Institucional
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
              Hemos enviado un correo a <strong className="text-[#14281D]">{registeredEmail}</strong>.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200">
              <Sparkles size={12} className="text-emerald-600 animate-pulse" />
              <span>Detectando confirmación en tiempo real...</span>
            </div>
          </div>

          {/* Opción 1: Ingreso rápido de Código OTP (6 dígitos) */}
          <form onSubmit={handleVerifyOtp} className="p-4 rounded-xl bg-[#F7F6F2] border border-[#E5E3DC] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#14281D]">
              <KeyRound size={14} className="text-[#84CC16]" />
              <span>Opción rápida: Ingrese el código de 6 dígitos</span>
            </div>
            <p className="text-[11px] text-stone-500">
              Revise su correo y digite el código numérico recibido:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="flex-1 px-3 py-2 text-center tracking-widest text-base font-mono font-bold rounded-xl border border-[#E5E3DC] focus:border-[#14281D] focus:ring-1 focus:ring-[#14281D] outline-none bg-white"
              />
              <button
                type="submit"
                disabled={isVerifyingOtp || otpCode.length < 6}
                className="px-4 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {isVerifyingOtp ? 'Validando...' : 'Activar y entrar'}
              </button>
            </div>
          </form>

          {/* Opción 2: Enlace directo o Reenvío */}
          <div className="space-y-3 pt-1 border-t border-stone-100">
            <p className="text-[11px] text-stone-500 text-center">
              O simplemente haga clic en el botón <strong>"Confirm your mail"</strong> del correo recibido; esta pantalla se actualizará automáticamente y lo llevará a su panel.
            </p>

            {resendStatus?.message && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                <span>{resendStatus.message}</span>
              </div>
            )}

            {resendStatus?.error && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-amber-600" />
                <span>{resendStatus.error}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendStatus?.loading}
                className="text-stone-600 hover:text-[#14281D] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {resendStatus?.loading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                <span>¿No llegó? Reenviar correo</span>
              </button>

              <Link to="/login" className="font-semibold text-[#14281D] hover:underline">
                Volver a Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      ) : isSuccess ? (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 size={22} className="text-emerald-700 shrink-0" />
          <div>
            <div className="font-bold text-sm text-emerald-900">¡Cuenta activada con éxito!</div>
            <p className="text-emerald-700">Cargando su espacio de trabajo institucional...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-stone-400" size={16} />
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] focus:ring-1 focus:ring-[#14281D] outline-none bg-white"
                placeholder="Dra. Carmen Lucía Morales"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Correo Institucional
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-stone-400" size={16} />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] focus:ring-1 focus:ring-[#14281D] outline-none bg-white"
                placeholder="investigador@universidad.edu.co"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Vínculo Institucional
              </label>
              <select
                value={formData.academicLink}
                onChange={(e) => setFormData({ ...formData, academicLink: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none bg-white"
              >
                <option value="Docente planta">Docente de planta</option>
                <option value="Docente ocasional">Docente ocasional</option>
                <option value="Estudiante de posgrado">Estudiante de posgrado</option>
                <option value="Estudiante de pregrado">Estudiante de pregrado</option>
                <option value="Monitor de investigación">Monitor de investigación</option>
                <option value="Personal administrativo">Personal administrativo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-stone-400" size={16} />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Programa Académico / Facultad
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-2.5 text-stone-400" size={16} />
              <input
                type="text"
                required
                value={formData.academicProgram}
                onChange={(e) => setFormData({ ...formData, academicProgram: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none bg-white"
                placeholder="Facultad de Ingeniería / Ciencias Básicas"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Grupo de Investigación
            </label>
            <div className="relative">
              <Layers className="absolute left-3 top-2.5 text-stone-400" size={16} />
              <input
                type="text"
                required
                value={formData.researchGroup}
                onChange={(e) => setFormData({ ...formData, researchGroup: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E3DC] outline-none bg-white"
                placeholder="Grupo de Biotecnología Aplicada"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-2.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-60"
          >
            <span>{isLoading ? 'Registrando cuenta...' : 'Crear Cuenta de Investigador'}</span>
          </button>
        </form>
      )}

      <div className="pt-2 text-center text-xs text-stone-500">
        ¿Ya tiene una cuenta institucional?{' '}
        <Link to="/login" className="font-bold text-[#14281D] hover:underline">
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
