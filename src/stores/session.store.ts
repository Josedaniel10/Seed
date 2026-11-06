import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppRole } from '../lib/permisos.ts';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  academicProgram?: string;
  academicLink?: string;
  researchGroupId?: string;
  roles: AppRole[];
  activeRole: AppRole;
}

export const TEST_USERS: Record<AppRole, UserSession> = {
  investigador: {
    id: 'usr-inv-01',
    email: 'investigador@universidad.edu.co',
    fullName: 'Dra. Carmen Lucía Morales',
    academicProgram: 'Ingeniería Ambiental y Bioprocesos',
    academicLink: 'Docente planta',
    researchGroupId: 'grp-bio-01',
    roles: ['investigador', 'miembro_comite'], // Multi-rol para probar el selector
    activeRole: 'investigador',
  },
  administrativo: {
    id: 'usr-adm-02',
    email: 'administrativo@universidad.edu.co',
    fullName: 'Lic. Fernando Ortiz',
    academicProgram: 'Dirección de Investigaciones',
    academicLink: 'Personal administrativo',
    researchGroupId: 'grp-ti-02',
    roles: ['administrativo'],
    activeRole: 'administrativo',
  },
  miembro_comite: {
    id: 'usr-com-03',
    email: 'comite@universidad.edu.co',
    fullName: 'Dr. Alejandro Restrepo',
    academicProgram: 'Facultad de Ciencias Básicas',
    academicLink: 'Docente planta',
    researchGroupId: 'grp-mat-03',
    roles: ['miembro_comite', 'investigador'], // Multi-rol
    activeRole: 'miembro_comite',
  },
  secretario: {
    id: 'usr-sec-04',
    email: 'secretario@universidad.edu.co',
    fullName: 'Dra. Patricia Salamanca',
    academicProgram: 'Secretaría Técnica de Investigaciones',
    academicLink: 'Docente ocasional',
    researchGroupId: 'grp-ti-02',
    roles: ['secretario', 'administrativo'],
    activeRole: 'secretario',
  },
  lider: {
    id: 'usr-lid-05',
    email: 'lider@universidad.edu.co',
    fullName: 'Dr. Germán Valenzuela',
    academicProgram: 'Líder Grupo Biotecnología',
    academicLink: 'Docente titular',
    researchGroupId: 'grp-bio-01',
    roles: ['lider', 'investigador'],
    activeRole: 'lider',
  },
  admin: {
    id: 'usr-adm-06',
    email: 'admin@universidad.edu.co',
    fullName: 'Ing. Mateo Cárdenas',
    academicProgram: 'Administración del Sistema',
    academicLink: 'Personal administrativo',
    researchGroupId: 'grp-ti-02',
    roles: ['admin', 'investigador'],
    activeRole: 'admin',
  },
};

interface SessionState {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  unreadNotificationsCount: number;

  loginWithTestRole: (role: AppRole) => void;
  loginWithCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  setActiveRole: (role: AppRole) => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      user: TEST_USERS.investigador, // Default para sesión de prueba activa inicial
      isAuthenticated: true,
      isLoading: false,
      unreadNotificationsCount: 3,

      loginWithTestRole: (role) => {
        const testUser = TEST_USERS[role];
        set({
          user: { ...testUser, activeRole: role },
          isAuthenticated: true,
        });
      },

      loginWithCredentials: async (email, password) => {
        set({ isLoading: true });
        const cleanEmail = email.trim().toLowerCase();

        // Buscar coincidencia en usuarios de prueba
        const matched = Object.values(TEST_USERS).find(
          (u) => u.email.toLowerCase() === cleanEmail
        );

        if (matched) {
          set({
            user: { ...matched },
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        }

        // Si es cualquier otro correo, se autentica por defecto como investigador (Sección 2.2)
        const newUser: UserSession = {
          id: `usr-${Date.now().toString(36)}`,
          email: cleanEmail,
          fullName: cleanEmail.split('@')[0].replace('.', ' '),
          roles: ['investigador'],
          activeRole: 'investigador',
        };

        set({
          user: newUser,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      },

      setActiveRole: (role) => {
        const current = get().user;
        if (current && current.roles.includes(role)) {
          set({
            user: { ...current, activeRole: role },
          });
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'seed_session_store',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);
