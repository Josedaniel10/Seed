export type AppRole =
  | 'investigador'
  | 'administrativo'
  | 'miembro_comite'
  | 'secretario'
  | 'lider'
  | 'admin';

export interface MenuItem {
  label: string;
  path: string;
  iconName: string;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  investigador: 'Investigador',
  administrativo: 'Personal Administrativo',
  miembro_comite: 'Integrante del Comité',
  secretario: 'Secretario(a) del Comité',
  lider: 'Líder de Investigación',
  admin: 'Administrador del Sistema',
};

export const ROLE_HOME_PATHS: Record<AppRole, string> = {
  investigador: '/mis-solicitudes',
  administrativo: '/validacion',
  miembro_comite: '/revisiones',
  secretario: '/panel',
  lider: '/panel',
  admin: '/admin/usuarios',
};

export const ROLE_MENU_ITEMS: Record<AppRole, MenuItem[]> = {
  investigador: [
    { label: 'Mis solicitudes', path: '/mis-solicitudes', iconName: 'FileText' },
    { label: 'Nueva solicitud', path: '/solicitudes/nueva', iconName: 'PlusCircle' },
  ],
  administrativo: [
    { label: 'Validación', path: '/validacion', iconName: 'ClipboardCheck' },
    { label: 'Panel de seguimiento', path: '/panel', iconName: 'LayoutDashboard' },
  ],
  miembro_comite: [
    { label: 'Mis revisiones', path: '/revisiones', iconName: 'CheckSquare' },
    { label: 'Sesiones', path: '/sesiones', iconName: 'Calendar' },
    { label: 'Actas y decisiones', path: '/actas', iconName: 'FileCheck' },
  ],
  secretario: [
    { label: 'Panel de seguimiento', path: '/panel', iconName: 'LayoutDashboard' },
    { label: 'Asignaciones', path: '/asignaciones', iconName: 'UserCheck' },
    { label: 'Sesiones', path: '/sesiones', iconName: 'Calendar' },
    { label: 'Actas y decisiones', path: '/actas', iconName: 'FileCheck' },
    { label: 'Reportes', path: '/reportes', iconName: 'BarChart3' },
  ],
  lider: [
    { label: 'Panel de seguimiento', path: '/panel', iconName: 'LayoutDashboard' },
    { label: 'Actas y decisiones', path: '/actas', iconName: 'FileCheck' },
    { label: 'Reportes', path: '/reportes', iconName: 'BarChart3' },
  ],
  admin: [
    { label: 'Usuarios y roles', path: '/admin/usuarios', iconName: 'Users' },
    { label: 'Grupos de investigación', path: '/admin/grupos', iconName: 'Layers' },
    { label: 'Catálogo de trámites', path: '/admin/catalogo', iconName: 'BookOpen' },
  ],
};

export const ROUTE_PERMISSIONS: Record<string, AppRole[]> = {
  '/mis-solicitudes': ['investigador'],
  '/solicitudes/nueva': ['investigador'],
  '/validacion': ['administrativo', 'secretario'],
  '/panel': ['secretario', 'administrativo', 'lider'],
  '/revisiones': ['miembro_comite'],
  '/asignaciones': ['secretario'],
  '/sesiones': ['secretario', 'miembro_comite'],
  '/actas': ['secretario', 'miembro_comite', 'lider'],
  '/reportes': ['secretario', 'lider', 'admin'],
  '/admin/usuarios': ['admin'],
  '/admin/grupos': ['admin'],
  '/admin/catalogo': ['admin'],
  '/notificaciones': ['investigador', 'administrativo', 'miembro_comite', 'secretario', 'lider', 'admin'],
  '/perfil': ['investigador', 'administrativo', 'miembro_comite', 'secretario', 'lider', 'admin'],
};

export function canRoleAccessRoute(role: AppRole, path: string): boolean {
  // Coincidencia exacta o rutas dinámicas
  if (path.startsWith('/solicitudes/') || path.startsWith('/sesiones/')) {
    return true; // Acceso evaluado en página
  }
  const allowed = ROUTE_PERMISSIONS[path];
  if (!allowed) return true;
  return allowed.includes(role);
}
