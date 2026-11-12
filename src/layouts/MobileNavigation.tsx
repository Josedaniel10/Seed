import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MoreHorizontal, User, LogOut, Check,
  FileText, PlusCircle, ClipboardCheck, LayoutDashboard, CheckSquare,
  Calendar, FileCheck, UserCheck, BarChart3, Users, Layers, BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Modal } from '../components/ui/Modal.tsx';
import { SeedLogo } from '../components/SeedLogo.tsx';
import { useSessionStore } from '../stores/session.store.ts';
import { ROLE_HOME_PATHS, ROLE_LABELS, ROLE_MENU_ITEMS } from '../lib/permisos.ts';
import type { AppRole } from '../lib/permisos.ts';

const icons: Record<string, LucideIcon> = {
  FileText, PlusCircle, ClipboardCheck, LayoutDashboard, CheckSquare,
  Calendar, FileCheck, UserCheck, BarChart3, Users, Layers, BookOpen,
};
const shortLabels: Record<string, string> = {
  '/mis-solicitudes': 'Solicitudes', '/solicitudes/nueva': 'Nueva',
  '/panel': 'Panel', '/revisiones': 'Revisiones', '/actas': 'Actas',
  '/admin/usuarios': 'Usuarios', '/admin/grupos': 'Grupos', '/admin/catalogo': 'Catálogo',
};

export function MobileNavigation({ unreadCount }: { unreadCount: number }): ReactElement | null {
  const { user, logout, setActiveRole } = useSessionStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  useEffect(() => setOpenMenuPath(null), [location.key]);
  if (!user) return null;

  const menuItems = ROLE_MENU_ITEMS[user.activeRole] ?? [];
  const primaryItems = menuItems.slice(0, 3);
  const remainingItems = menuItems.slice(3);
  const isRequestDetail = /^\/solicitudes\/(?!nueva$)[^/]+/.test(location.pathname);
  const isSessionDetail = /^\/sesiones\/[^/]+/.test(location.pathname);
  const canGoBack = isRequestDetail || isSessionDetail || location.pathname === '/solicitudes/nueva';
  const navigationState: unknown = location.state;
  const cameFromList = typeof navigationState === 'object' && navigationState !== null
    && 'fromList' in navigationState && typeof navigationState.fromList === 'string'
    && ['/mis-solicitudes', '/panel', '/validacion', '/sesiones', '/notificaciones'].includes(navigationState.fromList);
  const title = menuItems.find((item) => item.path === location.pathname)?.label
    ?? ({ '/perfil': 'Mi perfil', '/notificaciones': 'Notificaciones', '/sin-acceso': 'Sin acceso' }[location.pathname])
    ?? (isSessionDetail ? 'Detalle de sesión' : 'Detalle de solicitud');
  const isMenuOpen = openMenuPath === location.pathname;
  const isMoreActive = location.pathname === '/perfil' || remainingItems.some((item) => item.path === location.pathname);
  const closeMenu = () => setOpenMenuPath(null);
  const handleRoleChange = (role: AppRole) => {
    closeMenu();
    setActiveRole(role);
    navigate(ROLE_HOME_PATHS[role]);
  };

  return <>
    <header className="mobile-app-header md:hidden">
      {canGoBack && <button type="button" aria-label="Volver a la lista" className="app-icon-button"
        onClick={() => {
          if (cameFromList) navigate(-1);
          else navigate(isSessionDetail ? '/sesiones' : ROLE_HOME_PATHS[user.activeRole]);
        }}><ArrowLeft size={22} /></button>}
      <NavLink to={ROLE_HOME_PATHS[user.activeRole]} aria-label="Seed, inicio" className="flex min-w-0 flex-1 items-center gap-3">
        <SeedLogo className="shrink-0" size={30} wordmarkClassName="text-xl font-bold text-[#14281D]" />
        <span className="min-w-0 truncate border-l border-stone-200 pl-3 text-xs font-medium text-stone-500">{title}</span>
      </NavLink>
      <button type="button" aria-label="Abrir perfil y opciones" className="app-icon-button"
        onClick={() => setOpenMenuPath(location.pathname)}><User size={22} /></button>
    </header>

    <nav aria-label="Navegación principal móvil" className="mobile-tab-bar md:hidden">
      {primaryItems.map((item) => {
        const Icon = icons[item.iconName] ?? FileText;
        return <NavLink key={item.path} to={item.path} className={({ isActive }) =>
          `mobile-tab ${isActive || (isRequestDetail && item.path === ROLE_HOME_PATHS[user.activeRole]) ? 'is-active' : ''}`}>
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>{shortLabels[item.path] ?? item.label}</span>
        </NavLink>;
      })}
      <NavLink to="/notificaciones" className={({ isActive }) => `mobile-tab ${isActive ? 'is-active' : ''}`}>
        <span className="relative"><Bell size={22} strokeWidth={1.8} aria-hidden="true" />
          {unreadCount > 0 && <span className="tab-unread" aria-label={`${unreadCount} sin leer`}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </span><span>Avisos</span>
      </NavLink>
      <button type="button" className={`mobile-tab ${isMoreActive || isMenuOpen ? 'is-active' : ''}`}
        aria-expanded={isMenuOpen} aria-haspopup="dialog" onClick={() => setOpenMenuPath(location.pathname)}>
        <MoreHorizontal size={22} aria-hidden="true" /><span>Más</span>
      </button>
    </nav>

    <Modal isOpen={isMenuOpen} onClose={closeMenu} title="Mi cuenta y opciones" subtitle={user.fullName} maxWidth="sm">
      <div className="space-y-4">
        <div className="space-y-1">
          {remainingItems.map((item) => {
            const Icon = icons[item.iconName] ?? FileText;
            return <NavLink key={item.path} to={item.path} onClick={closeMenu} className="sheet-menu-item"><Icon size={20} />{item.label}</NavLink>;
          })}
          <NavLink to="/perfil" onClick={closeMenu} className="sheet-menu-item"><User size={20} />Mi perfil</NavLink>
        </div>
        <fieldset className="border-t border-stone-200 pt-3">
          <legend className="px-1 text-xs font-semibold text-stone-500">Rol activo</legend>
          {user.roles.map((role) => <button key={role} type="button" className="sheet-menu-item w-full text-left"
            aria-pressed={role === user.activeRole} onClick={() => handleRoleChange(role)}>
            <span className="flex-1">{ROLE_LABELS[role]}</span>{role === user.activeRole && <Check size={20} />}
          </button>)}
        </fieldset>
        <button type="button" className="sheet-menu-item w-full text-rose-700 border-t border-stone-200"
          onClick={() => { closeMenu(); logout(); navigate('/login'); }}><LogOut size={20} />Cerrar sesión</button>
      </div>
    </Modal>
  </>;
}
