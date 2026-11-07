import React from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.ts';
import { PERMISSIONS_MATRIX } from '../../auth/permissions.ts';
import { DEMO_USERS, DemoUserRole } from '../../auth/authStore.ts';
import { UserRole } from '../../../types/database.ts';

export function RoleMatrixWidget() {
  const { profile, login } = useAuth();

  const handleSwitchRole = (r: DemoUserRole) => {
    const demo = DEMO_USERS[r];
    if (demo) {
      login(demo.email, 'password123', demo.role, demo.name);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E3DC] p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#14281D]" />
          <div>
            <h3 className="font-bold text-xs text-[#14281D]">
              Matriz de Permisos & Cambio Rápido de Rol (RNF-02)
            </h3>
            <p className="text-[11px] text-stone-500">
              Pruebe la interfaz cambiando de rol institucional con un solo clic.
            </p>
          </div>
        </div>

        {profile && (
          <span className="text-[11px] bg-[#A3E635]/25 border border-[#84CC16] text-[#14281D] px-2.5 py-0.5 rounded-full font-mono font-bold self-start sm:self-auto">
            ROL: {profile.role.replace('_', ' ').toUpperCase()}
          </span>
        )}
      </div>

      {/* Quick Role Switch Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(DEMO_USERS) as DemoUserRole[]).map((r) => {
          const isCurrent = profile?.role === r;
          const demo = DEMO_USERS[r];

          return (
            <button
              key={r}
              onClick={() => handleSwitchRole(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                isCurrent
                  ? 'bg-[#14281D] text-white border-[#14281D] shadow-xs'
                  : 'bg-[#F7F6F2] hover:bg-[#EFECE6] text-stone-700 border-[#E5E3DC]'
              }`}
              title={`Cambiar a ${demo.name} (${demo.role})`}
            >
              <span className="capitalize">{r.replace('_', ' ')}</span>
            </button>
          );
        })}
      </div>

      {/* Permissions table */}
      <div className="overflow-x-auto text-[11px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E5E3DC] bg-stone-50 text-stone-600 font-semibold">
              <th className="py-2 px-2.5">Rol</th>
              <th className="py-2 px-2.5">Radicar</th>
              <th className="py-2 px-2.5">Validar Docs</th>
              <th className="py-2 px-2.5">Concepto Técnico</th>
              <th className="py-2 px-2.5">Sesiones</th>
              <th className="py-2 px-2.5">Kanban</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(Object.keys(PERMISSIONS_MATRIX) as UserRole[]).map((r) => {
              const perms = PERMISSIONS_MATRIX[r];
              const isCurrent = profile?.role === r;

              return (
                <tr
                  key={r}
                  className={`transition-colors ${
                    isCurrent ? 'bg-[#A3E635]/15 font-semibold text-[#14281D]' : 'hover:bg-stone-50'
                  }`}
                >
                  <td className="py-2 px-2.5 capitalize">{r.replace('_', ' ')}</td>
                  <td className="py-2 px-2.5">{perms.canFiling ? '✓' : '—'}</td>
                  <td className="py-2 px-2.5">{perms.canValidateDocuments ? '✓' : '—'}</td>
                  <td className="py-2 px-2.5">{perms.canSubmitConcept ? '✓' : '—'}</td>
                  <td className="py-2 px-2.5">{perms.canManageSessions ? '✓' : '—'}</td>
                  <td className="py-2 px-2.5">
                    {perms.isReadOnlyKanban ? (
                      <span className="text-amber-800">Lectura</span>
                    ) : (
                      <span className="text-emerald-800 font-semibold">DnD Activo</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
