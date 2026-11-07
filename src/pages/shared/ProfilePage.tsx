import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/session.store.ts';
import { ROLE_LABELS } from '../../lib/permissions.ts';
import { LogOut } from 'lucide-react';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useSessionStore();

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
          Mi Perfil Institucional
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Información de cuenta, roles habilitados y adscripción académica.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-6 text-xs">
        <div className="flex items-center gap-4 pb-4 border-b border-stone-100">
          <div className="w-16 h-16 rounded-full bg-[#14281D] text-white font-extrabold text-lg flex items-center justify-center shrink-0">
            {user.fullName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#14281D]">{user.fullName}</h2>
            <p className="text-stone-500 font-mono text-[11px]">{user.email}</p>
            <div className="mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A3E635]/25 text-[#14281D] border border-[#84CC16]">
                Rol activo: {ROLE_LABELS[user.activeRole] || user.activeRole}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-stone-700 uppercase tracking-wider text-[11px]">
            Roles Institucionales Asignados ({user.roles.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {user.roles.map((r) => (
              <span
                key={r}
                className="px-3 py-1 rounded-xl bg-[#F7F6F2] border border-[#E5E3DC] font-semibold text-[#14281D]"
              >
                {ROLE_LABELS[r] || r}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-stone-700 uppercase tracking-wider text-[11px]">
            Adscripción Académica
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#F7F6F2] border border-[#E5E3DC]">
              <span className="text-stone-400 text-[10px] uppercase font-bold block">
                Programa / Unidad
              </span>
              <span className="font-semibold text-[#14281D]">
                {user.academicProgram || 'Facultad de Ingeniería'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F6F2] border border-[#E5E3DC]">
              <span className="text-stone-400 text-[10px] uppercase font-bold block">
                Vínculo Institucional
              </span>
              <span className="font-semibold text-[#14281D]">
                {user.academicLink || 'Docente de Planta'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-100 flex justify-end">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const PerfilPage = ProfilePage;
