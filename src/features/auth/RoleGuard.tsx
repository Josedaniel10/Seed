import React from 'react';
import { UserRole } from '../../types/database.ts';
import { useAuthStore } from './authStore.ts';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  currentRole?: UserRole | null;
  children: React.ReactNode;
  fallbackTitle?: string;
  onNavigateHome?: () => void;
}

/**
 * Validador de permisos de ruta por rol (RF-02)
 */
export function checkRoleAccess(
  userRole: UserRole | null | undefined,
  allowedRoles: UserRole[]
): { allowed: boolean; reason?: string } {
  if (!userRole) {
    return {
      allowed: false,
      reason: 'No hay una sesión activa. Debe iniciar sesión para acceder a este módulo.',
    };
  }

  if (!allowedRoles.includes(userRole)) {
    return {
      allowed: false,
      reason: `Acceso restringido: El rol '${userRole}' no cuenta con permisos para acceder a esta vista. Módulos autorizados solo para: ${allowedRoles.join(', ')}.`,
    };
  }

  return { allowed: true };
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  currentRole,
  children,
  fallbackTitle = 'Acceso Restringido por Nivel de Seguridad',
  onNavigateHome,
}) => {
  const storeProfile = useAuthStore((s) => s.profile);
  const activeRole = currentRole ?? storeProfile?.role ?? null;

  const access = checkRoleAccess(activeRole, allowedRoles);

  if (!access.allowed) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 shadow-xs max-w-xl mx-auto text-center space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-700 rounded-full flex items-center justify-center mx-auto border border-rose-100">
          <ShieldAlert size={28} />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-800">
            Control de Acceso
          </div>
          <h3 className="text-lg font-bold text-[#14281D]">{fallbackTitle}</h3>
          <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
            {access.reason}
          </p>
        </div>

        <div className="bg-[#F7F6F2] rounded-xl p-3.5 border border-[#E5E3DC] text-xs text-stone-700 flex items-center justify-between font-mono">
          <span>Tu rol actual:</span>
          <span className="font-bold uppercase text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            {activeRole ? activeRole.replace('_', ' ') : 'NO AUTENTICADO'}
          </span>
        </div>

        {onNavigateHome && (
          <div className="pt-2">
            <button
              onClick={onNavigateHome}
              className="px-4 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft size={14} />
              <span>Regresar al módulo permitido</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
