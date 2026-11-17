import { NotificationPopover } from '../features/notifications/NotificationPopover.tsx';
import { useEffect, useId, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { AppSidebar } from './AppSidebar.tsx';
import { useDismissiblePopover } from '../hooks/useDismissiblePopover.ts';
import { useRouteScrollRestoration } from '../hooks/useRouteScrollRestoration.ts';
import { MobileNavigation } from './MobileNavigation.tsx';
import { SeedLogo } from '../components/SeedLogo.tsx';
import { SessionSyncNotice } from '../features/auth/SessionSyncNotice.tsx';
import { useSessionStore } from '../stores/session.store.ts';
import {
  ROLE_LABELS,
  ROLE_HOME_PATHS,
} from '../lib/permisos.ts';
import type { AppRole } from '../lib/permisos.ts';

export function AppLayout() {
  useRouteScrollRestoration();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setActiveRole, logout } = useSessionStore();
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const roleMenuRef = useDismissiblePopover(isRoleMenuOpen, () => setIsRoleMenuOpen(false));
  const userMenuRef = useDismissiblePopover(isUserMenuOpen, () => setIsUserMenuOpen(false));
  const roleMenuId = useId();
  const userMenuId = useId();

  useEffect(() => {
    setIsRoleMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.key, user?.id, user?.activeRole]);

  if (!user) return null;

  const activeRole = user.activeRole;

  const handleRoleChange = (newRole: AppRole) => {
    setActiveRole(newRole);
    setIsRoleMenuOpen(false);
    navigate(ROLE_HOME_PATHS[newRole]);
  };

  return (
    <div className="min-h-dvh bg-[#F7F6F2] text-[#14281D] flex flex-col">
      <MobileNavigation />
      {/* 1. Cabecera Unificada (Sección 6.2) */}
      <header className="h-14 bg-white border-b border-[#E5E3DC] px-4 md:px-6 hidden md:flex items-center justify-between sticky top-0 z-40">
        {/* Logo de Seed (limpio, sin subtítulos técnicos) */}
        <div className="flex items-center gap-3 sm:gap-6">
          <NavLink to={ROLE_HOME_PATHS[activeRole]} className="flex items-center">
            <SeedLogo size={30} />
          </NavLink>

          {/* Selector de Rol Activo (si el usuario tiene más de un rol, o indicador claro) */}
          <div ref={roleMenuRef} className="relative">
            <button
              onClick={() => { setIsUserMenuOpen(false); setIsRoleMenuOpen(!isRoleMenuOpen); }}
              aria-label="Cambiar rol activo" aria-expanded={isRoleMenuOpen} aria-controls={roleMenuId}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#F7F6F2] hover:bg-[#EFECE6] border border-[#E5E3DC] text-xs font-semibold text-[#14281D] cursor-pointer transition-colors"
              title="Cambiar rol activo"
            >
              <span className="text-stone-500 font-normal hidden sm:inline">Rol:</span>
              <span className="truncate max-w-[130px] sm:max-w-none">{ROLE_LABELS[activeRole]}</span>
              {user.roles.length > 1 && <ChevronDown size={14} className="text-stone-400 shrink-0" />}
            </button>

            {isRoleMenuOpen && (
              <div id={roleMenuId} role="region" aria-label="Roles disponibles" className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl border border-[#E5E3DC] shadow-lg py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                  Cambiar Rol Activo
                </div>
                {user.roles.map((r) => (
                  <button
                    key={r}
                    aria-pressed={activeRole === r}
                    onClick={() => handleRoleChange(r)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                      activeRole === r
                        ? 'bg-[#A3E635]/20 text-[#14281D] font-bold'
                        : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span>{ROLE_LABELS[r]}</span>
                    {activeRole === r && <span className="w-1.5 h-1.5 rounded-full bg-[#14281D]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notificaciones y Menú de Usuario */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Campana de Notificaciones con Contador */}
          <NotificationPopover onOpen={() => { setIsRoleMenuOpen(false); setIsUserMenuOpen(false); }} />

          {/* Menú de Usuario */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => { setIsRoleMenuOpen(false); setIsUserMenuOpen(!isUserMenuOpen); }}
              aria-label="Abrir menú de perfil" aria-expanded={isUserMenuOpen} aria-controls={userMenuId}
              className="flex items-center gap-2 pl-2 py-1 pr-1.5 rounded-xl hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#14281D] text-white text-xs font-bold flex items-center justify-center shrink-0">
                {user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <span className="text-xs font-semibold text-[#14281D] hidden sm:inline">
                {user.fullName.split(' ')[0]}
              </span>
              <ChevronDown size={14} className="text-stone-400" />
            </button>

            {isUserMenuOpen && (
              <div id={userMenuId} role="region" aria-label="Opciones de perfil" className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-[#E5E3DC] shadow-lg py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="px-3.5 py-2 border-b border-stone-100">
                  <div className="font-bold text-[#14281D] truncate">{user.fullName}</div>
                  <div className="text-[11px] text-stone-500 truncate">{user.email}</div>
                </div>

                <NavLink
                  to="/perfil"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <User size={14} />
                  <span>Mi perfil</span>
                </NavLink>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer border-t border-stone-100"
                >
                  <LogOut size={14} />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Cuerpo: Barra Lateral con Opciones del Rol + Contenido */}
      <div className="flex-1 flex min-w-0">
        {/* Barra lateral por rol activo (Sección 3 / Menú lateral por rol) */}
        <AppSidebar activeRole={activeRole} />

        {/* Zona de contenido de la página */}
        <main className="app-content min-w-0 flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          <SessionSyncNotice />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
