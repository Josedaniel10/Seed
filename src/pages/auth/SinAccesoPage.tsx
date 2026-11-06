import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/session.store.ts';
import { ROLE_LABELS, ROLE_HOME_PATHS } from '../../lib/permisos.ts';
import { ShieldAlert, ArrowLeft, Home, RefreshCw } from 'lucide-react';

export function SinAccesoPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();

  const activeRole = user?.activeRole || 'investigador';
  const homePath = ROLE_HOME_PATHS[activeRole];

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5E3DC] p-8 text-center shadow-xs space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
          <ShieldAlert size={28} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-[#14281D]">
            Acceso no autorizado
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Su rol activo actual (<strong>{ROLE_LABELS[activeRole]}</strong>) no cuenta con permisos para ver este módulo institucional o realizar esta acción.
          </p>
        </div>

        {user && user.roles.length > 1 && (
          <div className="p-3 bg-[#F7F6F2] rounded-xl border border-[#E5E3DC] text-xs text-stone-600 text-left space-y-1.5">
            <div className="font-bold text-[#14281D]">Tiene otros roles disponibles:</div>
            <p className="text-[11px] text-stone-500">
              Puede cambiar su rol activo desde el selector en la cabecera superior.
            </p>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(homePath)}
            className="w-full sm:w-auto px-4 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <Home size={14} />
            <span>Volver a mi inicio ({ROLE_LABELS[activeRole]})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
