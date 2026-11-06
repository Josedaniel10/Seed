import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  Layers,
  ClipboardCheck,
  Calendar,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { SeedLogo } from '../SeedLogo.tsx';
import { useAuth } from '../../hooks/useAuth.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { useGroupsStore } from '../../features/groups/groupsStore.ts';

export function Sidebar() {
  const { profile, isAuthenticated, logout, isAdmin, canAccessValidation, canAccessSessions } = useAuth();
  const catalogCount = useCatalogStore((s) => s.types.length);
  const groupsCount = useGroupsStore((s) => s.groups.length);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
      isActive
        ? 'bg-[#14281D] text-white font-semibold shadow-xs'
        : 'text-stone-600 hover:text-[#14281D] hover:bg-stone-100/80'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-[#E5E3DC] flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 pb-4 border-b border-[#E5E3DC]">
        <NavLink to="/" className="flex items-center gap-3">
          <SeedLogo size={32} />
        </NavLink>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 p-3.5 space-y-6 overflow-y-auto text-xs">
        {/* Section: Principal */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Principal
          </div>
          <NavLink to="/" className={navLinkClass} end>
            <div className="flex items-center gap-2.5">
              <LayoutDashboard size={16} />
              <span>Panel de Control</span>
            </div>
          </NavLink>
        </div>

        {/* Section: Catálogo & Trámites */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Trámites & Requisitos
          </div>
          <NavLink to="/catalog" className={navLinkClass}>
            <div className="flex items-center gap-2.5">
              <FileText size={16} />
              <span>Catálogo de Trámites</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
              {catalogCount}
            </span>
          </NavLink>

          <NavLink to="/groups" className={navLinkClass}>
            <div className="flex items-center gap-2.5">
              <Layers size={16} />
              <span>Grupos de Investigación</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
              {groupsCount}
            </span>
          </NavLink>
        </div>

        {/* Section: Operación del Comité */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Comité Evaluador
          </div>
          <NavLink to="/validation" className={navLinkClass}>
            <div className="flex items-center gap-2.5">
              <ClipboardCheck size={16} />
              <span>Validación Documental</span>
            </div>
          </NavLink>

          <NavLink to="/sessions" className={navLinkClass}>
            <div className="flex items-center gap-2.5">
              <Calendar size={16} />
              <span>Sesiones de Comité</span>
            </div>
          </NavLink>
        </div>

        {/* Section: Administración */}
        {isAdmin && (
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Administración
            </div>
            <NavLink to="/users" className={navLinkClass}>
              <div className="flex items-center gap-2.5">
                <Users size={16} />
                <span>Usuarios y Roles</span>
              </div>
            </NavLink>
          </div>
        )}
      </nav>

      {/* User Footer Profile */}
      <div className="p-3.5 border-t border-[#E5E3DC] bg-[#FAF9F6]">
        {isAuthenticated && profile ? (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-[#E5E3DC]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#14281D] text-white text-xs font-bold flex items-center justify-center shrink-0">
                {profile.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="text-left overflow-hidden">
                <div className="font-bold text-[#14281D] truncate text-xs">{profile.full_name}</div>
                <div className="text-[10px] text-stone-500 capitalize tracking-wide">
                  {profile.role.replace('_', ' ')}
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Cerrar sesión"
              className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            className="w-full py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <span>Iniciar Sesión</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
}
