import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  LogOut,
  User,
  ChevronDown,
  FileText,
  PlusCircle,
  ClipboardCheck,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FileCheck,
  UserCheck,
  BarChart3,
  Users,
  Layers,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';
import { SeedLogo } from '../components/SeedLogo.tsx';
import { useSessionStore } from '../stores/session.store.ts';
import {
  ROLE_LABELS,
  ROLE_MENU_ITEMS,
  ROLE_HOME_PATHS,
  AppRole,
} from '../lib/permisos.ts';

const ICON_MAP: Record<string, React.ReactNode> = {
  FileText: <FileText size={16} />,
  PlusCircle: <PlusCircle size={16} />,
  ClipboardCheck: <ClipboardCheck size={16} />,
  LayoutDashboard: <LayoutDashboard size={16} />,
  CheckSquare: <CheckSquare size={16} />,
  Calendar: <Calendar size={16} />,
  FileCheck: <FileCheck size={16} />,
  UserCheck: <UserCheck size={16} />,
  BarChart3: <BarChart3 size={16} />,
  Users: <Users size={16} />,
  Layers: <Layers size={16} />,
  BookOpen: <BookOpen size={16} />,
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setActiveRole, logout, unreadNotificationsCount } = useSessionStore();
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const activeRole = user.activeRole;
  const menuItems = ROLE_MENU_ITEMS[activeRole] || [];

  const handleRoleChange = (newRole: AppRole) => {
    setActiveRole(newRole);
    setIsRoleMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate(ROLE_HOME_PATHS[newRole]);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
      isActive
        ? 'bg-[#14281D] text-white font-semibold shadow-xs'
        : 'text-stone-600 hover:text-[#14281D] hover:bg-stone-100'
    }`;

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#14281D] flex flex-col">
      {/* 1. Cabecera Unificada (Sección 6.2) */}
      <header className="h-14 bg-white border-b border-[#E5E3DC] px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
        {/* Logo de Seed (limpio, sin subtítulos técnicos) */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 md:hidden cursor-pointer"
            aria-label="Abrir menú"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <NavLink to={ROLE_HOME_PATHS[activeRole]} className="flex items-center">
            <SeedLogo size={30} />
          </NavLink>

          {/* Selector de Rol Activo (si el usuario tiene más de un rol, o indicador claro) */}
          <div className="relative">
            <button
              onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#F7F6F2] hover:bg-[#EFECE6] border border-[#E5E3DC] text-xs font-semibold text-[#14281D] cursor-pointer transition-colors"
              title="Cambiar rol activo"
            >
              <span className="text-stone-500 font-normal hidden sm:inline">Rol:</span>
              <span className="truncate max-w-[130px] sm:max-w-none">{ROLE_LABELS[activeRole]}</span>
              {user.roles.length > 1 && <ChevronDown size={14} className="text-stone-400 shrink-0" />}
            </button>

            {isRoleMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl border border-[#E5E3DC] shadow-lg py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
                  Cambiar Rol Activo
                </div>
                {user.roles.map((r) => (
                  <button
                    key={r}
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
          <NavLink
            to="/notificaciones"
            className="relative p-2 text-stone-600 hover:text-[#14281D] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            title="Ver notificaciones"
          >
            <Bell size={18} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#84CC16] text-[#14281D] text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </NavLink>

          {/* Menú de Usuario */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
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
              <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-[#E5E3DC] shadow-lg py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
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

      {/* Menú Móvil Desplegable */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E5E3DC] p-3 space-y-1 shadow-md">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Opciones ({ROLE_LABELS[activeRole]})
          </div>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={navLinkClass}
            >
              {ICON_MAP[item.iconName] || <FileText size={16} />}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}

      {/* 2. Cuerpo: Barra Lateral con Opciones del Rol + Contenido */}
      <div className="flex-1 flex min-w-0">
        {/* Barra lateral por rol activo (Sección 3 / Menú lateral por rol) */}
        <aside className="w-60 bg-white border-r border-[#E5E3DC] p-3.5 space-y-1 shrink-0 hidden md:block">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Menú del Rol ({ROLE_LABELS[activeRole]})
          </div>
          {menuItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={navLinkClass}>
              {ICON_MAP[item.iconName] || <FileText size={16} />}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </aside>

        {/* Zona de contenido de la página */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
