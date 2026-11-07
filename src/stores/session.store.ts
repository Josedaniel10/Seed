import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppRole } from '../lib/permissions.ts';

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

const RESEARCHER_USER: UserSession = {
  id: 'usr-inv-01',
  email: 'investigador@universidad.edu.co',
  fullName: 'Dra. Carmen Lucía Morales',
  academicProgram: 'Ingeniería Ambiental y Bioprocesos',
  academicLink: 'Docente planta',
  researchGroupId: 'grp-bio-01',
  roles: ['researcher', 'committee_member', 'investigador', 'miembro_comite'],
  activeRole: 'researcher',
};

const ADMINISTRATIVE_USER: UserSession = {
  id: 'usr-adm-02',
  email: 'administrativo@universidad.edu.co',
  fullName: 'Lic. Fernando Ortiz',
  academicProgram: 'Dirección de Investigaciones',
  academicLink: 'Personal administrativo',
  researchGroupId: 'grp-ti-02',
  roles: ['administrative', 'administrativo'],
  activeRole: 'administrative',
};

const COMMITTEE_MEMBER_USER: UserSession = {
  id: 'usr-com-03',
  email: 'comite@universidad.edu.co',
  fullName: 'Dr. Alejandro Restrepo',
  academicProgram: 'Facultad de Ciencias Básicas',
  academicLink: 'Docente planta',
  researchGroupId: 'grp-mat-03',
  roles: ['committee_member', 'researcher', 'miembro_comite', 'investigador'],
  activeRole: 'committee_member',
};

const SECRETARY_USER: UserSession = {
  id: 'usr-sec-04',
  email: 'secretario@universidad.edu.co',
  fullName: 'Dra. Patricia Salamanca',
  academicProgram: 'Secretaría Técnica de Investigaciones',
  academicLink: 'Docente ocasional',
  researchGroupId: 'grp-ti-02',
  roles: ['secretary', 'administrative', 'secretario', 'administrativo'],
  activeRole: 'secretary',
};

const LEADER_USER: UserSession = {
  id: 'usr-lid-05',
  email: 'lider@universidad.edu.co',
  fullName: 'Dr. Germán Valenzuela',
  academicProgram: 'Líder Grupo Biotecnología',
  academicLink: 'Docente titular',
  researchGroupId: 'grp-bio-01',
  roles: ['leader', 'researcher', 'lider', 'investigador'],
  activeRole: 'leader',
};

const ADMIN_USER: UserSession = {
  id: 'usr-adm-06',
  email: 'admin@universidad.edu.co',
  fullName: 'Ing. Mateo Cárdenas',
  academicProgram: 'Administración del Sistema',
  academicLink: 'Personal administrativo',
  researchGroupId: 'grp-ti-02',
  roles: ['admin', 'researcher', 'investigador'],
  activeRole: 'admin',
};

export const TEST_USERS: Record<string, UserSession> = {
  researcher: RESEARCHER_USER,
  investigador: RESEARCHER_USER,
  administrative: ADMINISTRATIVE_USER,
  administrativo: ADMINISTRATIVE_USER,
  committee_member: COMMITTEE_MEMBER_USER,
  miembro_comite: COMMITTEE_MEMBER_USER,
  integrante_comite: COMMITTEE_MEMBER_USER,
  secretary: SECRETARY_USER,
  secretario: SECRETARY_USER,
  leader: LEADER_USER,
  lider: LEADER_USER,
  lider_grupo: LEADER_USER,
  admin: ADMIN_USER,
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
      user: RESEARCHER_USER,
      isAuthenticated: true,
      isLoading: false,
      unreadNotificationsCount: 3,

      loginWithTestRole: (role) => {
        const testUser = TEST_USERS[role] || RESEARCHER_USER;
        set({
          user: { ...testUser, activeRole: role },
          isAuthenticated: true,
        });
      },

      loginWithCredentials: async (email, _password) => {
        set({ isLoading: true });
        const cleanEmail = email.trim().toLowerCase();

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

        const newUser: UserSession = {
          id: `usr-${Date.now().toString(36)}`,
          email: cleanEmail,
          fullName: cleanEmail.split('@')[0].replace('.', ' '),
          roles: ['researcher', 'investigador'],
          activeRole: 'researcher',
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
