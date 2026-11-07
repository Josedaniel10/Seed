export type AppRole =
  | 'researcher'
  | 'administrative'
  | 'committee_member'
  | 'secretary'
  | 'leader'
  | 'admin'
  // Legacy Spanish aliases
  | 'investigador'
  | 'administrativo'
  | 'miembro_comite'
  | 'integrante_comite'
  | 'secretario'
  | 'lider'
  | 'lider_grupo';

export interface MenuItem {
  label: string;
  path: string;
  iconName: string;
}

export const ROLE_LABELS: Record<string, string> = {
  researcher: 'Investigador',
  investigador: 'Investigador',
  administrative: 'Personal Administrativo',
  administrativo: 'Personal Administrativo',
  committee_member: 'Integrante del Comité',
  miembro_comite: 'Integrante del Comité',
  integrante_comite: 'Integrante del Comité',
  secretary: 'Secretario(a) del Comité',
  secretario: 'Secretario(a) del Comité',
  leader: 'Líder de Investigación',
  lider: 'Líder de Investigación',
  lider_grupo: 'Líder de Investigación',
  admin: 'Administrador del Sistema',
};

export function normalizeRole(role?: string): string {
  if (!role) return '';
  if (role === 'investigador') return 'researcher';
  if (role === 'administrativo') return 'administrative';
  if (role === 'miembro_comite' || role === 'integrante_comite') return 'committee_member';
  if (role === 'secretario') return 'secretary';
  if (role === 'lider' || role === 'lider_grupo') return 'leader';
  return role;
}

export function roleMatches(userRole?: string, allowedRole?: string): boolean {
  if (!userRole || !allowedRole) return false;
  return normalizeRole(userRole) === normalizeRole(allowedRole);
}

export const ROLE_HOME_PATHS: Record<string, string> = {
  researcher: '/mis-solicitudes',
  investigador: '/mis-solicitudes',
  administrative: '/validacion',
  administrativo: '/validacion',
  committee_member: '/revisiones',
  miembro_comite: '/revisiones',
  integrante_comite: '/revisiones',
  secretary: '/panel',
  secretario: '/panel',
  leader: '/panel',
  lider: '/panel',
  lider_grupo: '/panel',
  admin: '/admin/usuarios',
};

export const ROLE_MENU_ITEMS: Record<string, MenuItem[]> = {
  researcher: [
    { label: 'Mis solicitudes', path: '/mis-solicitudes', iconName: 'FileText' },
    { label: 'Nueva solicitud', path: '/solicitudes/nueva', iconName: 'PlusCircle' },
  ],
  investigador: [
    { label: 'Mis solicitudes', path: '/mis-solicitudes', iconName: 'FileText' },
    { label: 'Nueva solicitud', path: '/solicitudes/nueva', iconName: 'PlusCircle' },
  ],
  administrative: [
    { label: 'Validación', path: '/validacion', iconName: 'ClipboardCheck' },
    { label: 'Panel de seguimiento', path: '/panel', iconName: 'LayoutDashboard' },
  ],
  administrativo: [
    { label: 'Validación', path: '/validacion', iconName: 'ClipboardCheck' },
    { label: 'Panel de seguimiento', path: '/panel', iconName: 'LayoutDashboard' },
  ],
  committee_member: [
    { label: 'Mis revisiones', path: '/revisiones', iconName: 'CheckSquare' },
    { label: 'Sesiones', path: '/sesiones', iconName: 'Calendar' },
    { label: 'Actas y decisiones', path: '/actas', iconName: 'FileCheck' },
  ],
  miembro_comite: [
    { label: 'Mis revisiones', path: '/revisiones', iconName: 'CheckSquare' },
    { label: 'Sesiones', path: '/sesiones', iconName: 'Calendar' },
    { label: 'Actas y decisiones', path: '/actas', iconName: 'FileCheck' },
  ],
  integrante_comite: [
    { label: 'Mis revisiones', path: '/revisiones', iconName: 'CheckSquare' },
    { label: 'Sesiones', path: '/sesiones', iconName: 'Calendar' },
    { label: 'Actas y decisiones', path: '/actas', iconName: 'FileCheck' },
  ],
  secretary: [
    { label: 'Panel de seguimiento', path: '/panel', iconName: 'LayoutDashboard' },
    { label: 'Asignaciones', path: '/asignaciones', iconName: 'UserCheck' },
    { label: 'Sesiones', path: '/sesiones', iconName: 'Calendar' },
    { label: 'Actas y decisiones', path: '/actas', iconName: 'FileCheck' },
    { label: 'Reportes', path: '/reportes', iconName: 'BarChart3' },
  ],
  secretario: [
    { label: 'Panel de seguimiento', path: '/panel', iconName: 'LayoutDashboard' },
    { label: 'Asignaciones', path: '/asignaciones', iconName: 'UserCheck' },
    { label: 'Sesiones', path: '/sesiones', iconName: 'Calendar' },
    { label: 'Actas y decisiones', path: '/actas', iconName: 'FileCheck' },
    { label: 'Reportes', path: '/reportes', iconName: 'BarChart3' },
  ],
  leader: [
    { label: 'Panel de seguimiento', path: '/panel', iconName: 'LayoutDashboard' },
    { label: 'Actas y decisiones', path: '/actas', iconName: 'FileCheck' },
    { label: 'Reportes', path: '/reportes', iconName: 'BarChart3' },
  ],
  lider: [
    { label: 'Panel de seguimiento', path: '/panel', iconName: 'LayoutDashboard' },
    { label: 'Actas y decisiones', path: '/actas', iconName: 'FileCheck' },
    { label: 'Reportes', path: '/reportes', iconName: 'BarChart3' },
  ],
  lider_grupo: [
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

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/my-requests': ['researcher', 'investigador'],
  '/mis-solicitudes': ['researcher', 'investigador'],
  '/requests/new': ['researcher', 'investigador'],
  '/solicitudes/nueva': ['researcher', 'investigador'],
  '/validation': ['administrative', 'administrativo', 'secretary', 'secretario'],
  '/validacion': ['administrative', 'administrativo', 'secretary', 'secretario'],
  '/tracking-board': ['secretary', 'secretario', 'administrative', 'administrativo', 'leader', 'lider'],
  '/panel': ['secretary', 'secretario', 'administrative', 'administrativo', 'leader', 'lider'],
  '/reviews': ['committee_member', 'miembro_comite'],
  '/revisiones': ['committee_member', 'miembro_comite'],
  '/assignments': ['secretary', 'secretario'],
  '/asignaciones': ['secretary', 'secretario'],
  '/sessions': ['secretary', 'secretario', 'committee_member', 'miembro_comite'],
  '/sesiones': ['secretary', 'secretario', 'committee_member', 'miembro_comite'],
  '/minutes': ['secretary', 'secretario', 'committee_member', 'miembro_comite', 'leader', 'lider'],
  '/actas': ['secretary', 'secretario', 'committee_member', 'miembro_comite', 'leader', 'lider'],
  '/reports': ['secretary', 'secretario', 'leader', 'lider', 'admin'],
  '/reportes': ['secretary', 'secretario', 'leader', 'lider', 'admin'],
  '/admin/users': ['admin'],
  '/admin/usuarios': ['admin'],
  '/admin/groups': ['admin'],
  '/admin/grupos': ['admin'],
  '/admin/catalog': ['admin'],
  '/admin/catalogo': ['admin'],
  '/notifications': ['researcher', 'investigador', 'administrative', 'administrativo', 'committee_member', 'miembro_comite', 'secretary', 'secretario', 'leader', 'lider', 'admin'],
  '/notificaciones': ['researcher', 'investigador', 'administrative', 'administrativo', 'committee_member', 'miembro_comite', 'secretary', 'secretario', 'leader', 'lider', 'admin'],
  '/profile': ['researcher', 'investigador', 'administrative', 'administrativo', 'committee_member', 'miembro_comite', 'secretary', 'secretario', 'leader', 'lider', 'admin'],
  '/perfil': ['researcher', 'investigador', 'administrative', 'administrativo', 'committee_member', 'miembro_comite', 'secretary', 'secretario', 'leader', 'lider', 'admin'],
};

export function canRoleAccessRoute(role: AppRole, path: string): boolean {
  if (
    path.startsWith('/requests/') ||
    path.startsWith('/solicitudes/') ||
    path.startsWith('/sessions/') ||
    path.startsWith('/sesiones/')
  ) {
    return true;
  }
  const allowed = ROUTE_PERMISSIONS[path];
  if (!allowed) return true;
  return allowed.includes(role);
}
