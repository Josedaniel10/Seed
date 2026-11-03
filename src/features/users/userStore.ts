import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Profile, UserRole } from '../../types/database.ts';
import { DEMO_USERS } from '../auth/authStore.ts';
import { getSupabaseClient } from '../../lib/supabase.ts';

// Usuarios institucionales iniciales para gestión y pruebas
export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'usr-001',
    email: DEMO_USERS.investigador.email,
    full_name: DEMO_USERS.investigador.name,
    role: 'investigador',
    academic_program: DEMO_USERS.investigador.program,
    academic_link: 'docente_planta',
    research_group_id: DEMO_USERS.investigador.group,
    is_active: true,
    created_at: '2026-01-15T08:00:00Z',
  },
  {
    id: 'usr-002',
    email: DEMO_USERS.administrativo.email,
    full_name: DEMO_USERS.administrativo.name,
    role: 'administrativo',
    academic_program: DEMO_USERS.administrativo.program,
    academic_link: 'docente_planta',
    research_group_id: DEMO_USERS.administrativo.group,
    is_active: true,
    created_at: '2026-01-10T09:30:00Z',
  },
  {
    id: 'usr-003',
    email: DEMO_USERS.integrante_comite.email,
    full_name: DEMO_USERS.integrante_comite.name,
    role: 'integrante_comite',
    academic_program: DEMO_USERS.integrante_comite.program,
    academic_link: 'docente_planta',
    research_group_id: DEMO_USERS.integrante_comite.group,
    is_active: true,
    created_at: '2026-01-12T11:00:00Z',
  },
  {
    id: 'usr-004',
    email: DEMO_USERS.secretario.email,
    full_name: DEMO_USERS.secretario.name,
    role: 'secretario',
    academic_program: DEMO_USERS.secretario.program,
    academic_link: 'docente_planta',
    research_group_id: DEMO_USERS.secretario.group,
    is_active: true,
    created_at: '2026-01-05T14:15:00Z',
  },
  {
    id: 'usr-005',
    email: DEMO_USERS.lider_grupo.email,
    full_name: DEMO_USERS.lider_grupo.name,
    role: 'lider_grupo',
    academic_program: DEMO_USERS.lider_grupo.program,
    academic_link: 'docente_planta',
    research_group_id: DEMO_USERS.lider_grupo.group,
    is_active: true,
    created_at: '2026-01-08T10:20:00Z',
  },
  {
    id: 'usr-006',
    email: DEMO_USERS.admin.email,
    full_name: DEMO_USERS.admin.name,
    role: 'admin',
    academic_program: DEMO_USERS.admin.program,
    academic_link: 'docente_planta',
    research_group_id: DEMO_USERS.admin.group,
    is_active: true,
    created_at: '2026-01-01T08:00:00Z',
  },
];

interface UserManagementState {
  users: Profile[];
  searchQuery: string;
  selectedRoleFilter: UserRole | 'ALL';
  setSearchQuery: (q: string) => void;
  setSelectedRoleFilter: (role: UserRole | 'ALL') => void;
  updateUserRole: (userId: string, newRole: UserRole) => { success: boolean; updatedUser?: Profile };
  toggleUserActive: (userId: string) => { success: boolean; is_active?: boolean };
  addUser: (userData: Omit<Profile, 'id' | 'created_at'> & { id?: string; created_at?: string }) => Profile;
  resetToInitial: () => void;
}

export const useUserStore = create<UserManagementState>()(
  persist(
    (set, get) => ({
      users: INITIAL_PROFILES,
      searchQuery: '',
      selectedRoleFilter: 'ALL',

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedRoleFilter: (selectedRoleFilter) => set({ selectedRoleFilter }),

      updateUserRole: (userId: string, newRole: UserRole) => {
        let updatedProfile: Profile | undefined;
        set((state) => {
          const nextUsers = state.users.map((u) => {
            if (u.id === userId) {
              updatedProfile = { ...u, role: newRole };
              return updatedProfile;
            }
            return u;
          });
          return { users: nextUsers };
        });

        // Sincronización real con Supabase en la tabla 'profiles'
        const client = getSupabaseClient();
        if (client) {
          client.from('profiles').update({ role: newRole }).eq('id', userId).then(({ error }) => {
            if (error) console.warn('Supabase profile role update error:', error.message);
          });
        }

        return {
          success: Boolean(updatedProfile),
          updatedUser: updatedProfile,
        };
      },

      toggleUserActive: (userId: string) => {
        let newStatus: boolean | undefined;
        set((state) => {
          const nextUsers = state.users.map((u) => {
            if (u.id === userId) {
              newStatus = !u.is_active;
              return { ...u, is_active: newStatus };
            }
            return u;
          });
          return { users: nextUsers };
        });

        const client = getSupabaseClient();
        if (client && newStatus !== undefined) {
          client.from('profiles').update({ is_active: newStatus }).eq('id', userId).then(() => {});
        }

        return { success: true, is_active: newStatus };
      },

      addUser: (userData) => {
        const newUser: Profile = {
          ...userData,
          id: userData.id || `usr-${Date.now()}`,
          created_at: userData.created_at || new Date().toISOString(),
        };

        set((state) => {
          const exists = state.users.some((u) => u.id === newUser.id || u.email === newUser.email);
          if (exists) {
            return {
              users: state.users.map((u) => (u.id === newUser.id || u.email === newUser.email ? newUser : u)),
            };
          }
          return { users: [newUser, ...state.users] };
        });

        const client = getSupabaseClient();
        if (client) {
          client.from('profiles').upsert([newUser]).then(({ error }) => {
            if (error) console.warn('Supabase profile upsert error:', error.message);
          });
        }

        return newUser;
      },

      resetToInitial: () => set({ users: INITIAL_PROFILES }),
    }),
    {
      name: 'seed_users_management',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage;
        }
        if (typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage: Storage }).localStorage) {
          return (globalThis as unknown as { localStorage: Storage }).localStorage;
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
