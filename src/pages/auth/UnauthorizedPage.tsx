import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/session.store.ts';
import { ROLE_LABELS, ROLE_HOME_PATHS } from '../../lib/permissions.ts';
import { ShieldAlert, ArrowLeft, Home, RefreshCw } from 'lucide-react';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();

  const activeRole = user?.activeRole || 'researcher';
  const homePath = ROLE_HOME_PATHS[activeRole] || '/requests';

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5E3DC] p-8 text-center shadow-xs space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
          <ShieldAlert size={28} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-[#14281D]">
            Unauthorized Access
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Your current active role (<strong>{ROLE_LABELS[activeRole] || activeRole}</strong>) does not have sufficient permissions to view this institutional module or perform this action.
          </p>
        </div>

        {user && user.roles.length > 1 && (
          <div className="p-3 bg-[#F7F6F2] rounded-xl border border-[#E5E3DC] text-xs text-stone-600 text-left space-y-1.5">
            <div className="font-bold text-[#14281D]">You have other roles assigned:</div>
            <p className="text-[11px] text-stone-500">
              You can switch your active role using the selector in the top bar.
            </p>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(homePath)}
            className="w-full sm:w-auto px-4 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <Home size={14} />
            <span>Return to Home ({ROLE_LABELS[activeRole] || activeRole})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Backward-compatible alias
export const SinAccesoPage = UnauthorizedPage;
