import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormData, ACADEMIC_LINKS } from './schemas.ts';
import { User, Mail, Lock, GraduationCap, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Profile } from '../../types/database.ts';
import { useAuthStore } from './authStore.ts';
import { useUserStore } from '../users/userStore.ts';

// Grupos de investigación institucionales para selección
export const MOCK_RESEARCH_GROUPS = [
  { id: 'grp-bio-01', code: 'G-BIO-01', name: 'Biotecnología y Recursos Naturales' },
  { id: 'grp-ti-02', code: 'G-ING-02', name: 'Inteligencia Artificial y Sistemas Distribuidos' },
  { id: 'grp-mat-03', code: 'G-MAT-03', name: 'Nanomateriales y Nanotecnología Aplicada' },
  { id: 'grp-salud-04', code: 'G-SAL-04', name: 'Salud Pública, Epidemiología y Biomedicina' },
  { id: 'grp-soc-05', code: 'G-SOC-05', name: 'Innovación Social y Políticas Públicas' },
];

interface RegisterFormProps {
  onSuccess?: (profile: Profile) => void;
  onNavigateLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onNavigateLogin }) => {
  const [createdProfile, setCreatedProfile] = useState<Profile | null>(null);
  const [lastPassword, setLastPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const registerUser = useAuthStore((s) => s.registerUser);
  const login = useAuthStore((s) => s.login);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      academicLink: 'docente_planta',
      academicProgram: '',
      researchGroupId: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setLastPassword(data.password);

    // Registro real y persistente en el sistema
    const result = await registerUser(data);

    if (result.success && result.profile) {
      setCreatedProfile(result.profile);
      // Agregar al directorio de usuarios
      useUserStore.getState().addUser(result.profile);

      if (onSuccess) {
        onSuccess(result.profile);
      }
    }

    setIsSubmitting(false);
  };

  const handleLoginImmediately = async () => {
    if (!createdProfile) return;
    await login(createdProfile.email, lastPassword);
    if (onNavigateLogin) {
      onNavigateLogin();
    }
  };

  const handleRegisterAnother = () => {
    setCreatedProfile(null);
    reset();
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 md:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
      <div className="border-b border-stone-100 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1E3A2B]">
          <GraduationCap size={15} className="text-[#84CC16]" />
          <span>RF-01 · Registro de Investigadores</span>
        </div>
        <h2 className="text-xl font-extrabold text-[#14281D] mt-1">
          Inscripción al Sistema del Comité de Investigación
        </h2>
        <p className="text-xs text-stone-600 mt-1">
          Formulario con validación en tiempo real (React Hook Form + Zod) para docentes, investigadores, estudiantes y monitores de semillero.
        </p>
      </div>

      {createdProfile ? (
        <div className="space-y-4">
          <div className="bg-[#A3E635]/20 border border-[#84CC16] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#14281D] font-bold text-sm">
              <CheckCircle2 size={18} className="text-[#14281D]" />
              <span>¡Investigador(a) registrado(a) con éxito!</span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              El usuario y su perfil institucional han sido creados correctamente en la plataforma con rol asignado <strong className="font-semibold text-[#14281D]">Investigador</strong>.
            </p>

            <div className="bg-white rounded-lg p-3.5 border border-[#E5E3DC] text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">ID de Perfil:</span>
                <span className="text-[#14281D]">{createdProfile.id.substring(0, 18)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Nombre Completo:</span>
                <span className="font-semibold text-[#14281D]">{createdProfile.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Correo Institucional:</span>
                <span className="text-stone-800">{createdProfile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Vínculo:</span>
                <span className="text-stone-800">{createdProfile.academic_link}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Programa:</span>
                <span className="text-stone-800">{createdProfile.academic_program}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-sans">Grupo ID:</span>
                <span className="text-stone-800">{createdProfile.research_group_id}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 leading-relaxed space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Mail size={13} className="text-amber-700" />
              <span>Verificación de correo en Supabase</span>
            </p>
            <p>
              Supabase envía un enlace de confirmación a <strong>{createdProfile.email}</strong>. Si al iniciar sesión te indica <em>"Email not confirmed"</em>, haz clic en el enlace de tu correo o desactiva <em>"Confirm email"</em> en tu panel de Supabase (<em>Authentication → Providers → Email</em>).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleLoginImmediately}
              className="flex-1 py-2.5 px-4 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Entrar con esta cuenta ahora</span>
              <CheckCircle2 size={14} className="text-[#84CC16]" />
            </button>

            <button
              onClick={handleRegisterAnother}
              className="py-2.5 px-4 bg-[#F7F6F2] hover:bg-[#EFECE6] text-[#14281D] text-xs font-semibold rounded-lg border border-[#E5E3DC] transition-colors cursor-pointer"
            >
              Registrar otro
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Nombre Completo */}
          <div>
            <label className="block text-xs font-semibold text-[#14281D] mb-1" htmlFor="fullName">
              Nombre Completo *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <User size={15} />
              </span>
              <input
                id="fullName"
                type="text"
                placeholder="Ej. Dra. Carmen Lucía Morales"
                {...register('fullName')}
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-white text-[#14281D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14281D] ${
                  errors.fullName ? 'border-rose-400 bg-rose-50/30' : 'border-[#E5E3DC]'
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="mt-1 text-[11px] text-rose-700 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Correo Electrónico Institucional */}
          <div>
            <label className="block text-xs font-semibold text-[#14281D] mb-1" htmlFor="email">
              Correo Institucional *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Mail size={15} />
              </span>
              <input
                id="email"
                type="email"
                placeholder="investigador@universidad.edu.co"
                {...register('email')}
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-white text-[#14281D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14281D] ${
                  errors.email ? 'border-rose-400 bg-rose-50/30' : 'border-[#E5E3DC]'
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-[11px] text-rose-700 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.email.message}
              </p>
            )}
          </div>

          {/* Contraseña y Confirmación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#14281D] mb-1" htmlFor="password">
                Contraseña *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock size={15} />
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  {...register('password')}
                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-white text-[#14281D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14281D] ${
                    errors.password ? 'border-rose-400 bg-rose-50/30' : 'border-[#E5E3DC]'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-rose-700 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#14281D] mb-1" htmlFor="confirmPassword">
                Confirmar Contraseña *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock size={15} />
                </span>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita su contraseña"
                  {...register('confirmPassword')}
                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-white text-[#14281D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14281D] ${
                    errors.confirmPassword ? 'border-rose-400 bg-rose-50/30' : 'border-[#E5E3DC]'
                  }`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-[11px] text-rose-700 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {/* Vínculo Institucional y Programa Académico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#14281D] mb-1" htmlFor="academicLink">
                Vínculo Institucional *
              </label>
              <select
                id="academicLink"
                {...register('academicLink')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E3DC] bg-white text-[#14281D] focus:outline-none focus:ring-2 focus:ring-[#14281D]"
              >
                {ACADEMIC_LINKS.map((link) => (
                  <option key={link.value} value={link.value}>
                    {link.label}
                  </option>
                ))}
              </select>
              {errors.academicLink && (
                <p className="mt-1 text-[11px] text-rose-700 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.academicLink.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#14281D] mb-1" htmlFor="academicProgram">
                Programa Académico / Facultad *
              </label>
              <input
                id="academicProgram"
                type="text"
                placeholder="Ej. Ingeniería de Sistemas"
                {...register('academicProgram')}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white text-[#14281D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14281D] ${
                  errors.academicProgram ? 'border-rose-400 bg-rose-50/30' : 'border-[#E5E3DC]'
                }`}
              />
              {errors.academicProgram && (
                <p className="mt-1 text-[11px] text-rose-700 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.academicProgram.message}
                </p>
              )}
            </div>
          </div>

          {/* Grupo de Investigación */}
          <div>
            <label className="block text-xs font-semibold text-[#14281D] mb-1" htmlFor="researchGroupId">
              Grupo de Investigación Adscrito *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                <Building2 size={15} />
              </span>
              <select
                id="researchGroupId"
                {...register('researchGroupId')}
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-white text-[#14281D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#14281D] ${
                  errors.researchGroupId ? 'border-rose-400 bg-rose-50/30' : 'border-[#E5E3DC]'
                }`}
              >
                <option value="">-- Seleccione un grupo de investigación avalado --</option>
                {MOCK_RESEARCH_GROUPS.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    [{grp.code}] {grp.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.researchGroupId && (
              <p className="mt-1 text-[11px] text-rose-700 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.researchGroupId.message}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <span>Registrando investigador...</span>
              ) : (
                <>
                  <span>Completar Registro de Investigador</span>
                  <CheckCircle2 size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
