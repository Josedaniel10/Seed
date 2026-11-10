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
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  setSearchQuery: (q: string) => void;
  setSelectedRoleFilter: (role: UserRole | 'ALL') => void;
  updateUserRole: (userId: string, newRole: UserRole) => { success: boolean; updatedUser?: Profile };
  toggleUserActive: (userId: string) => { success: boolean; is_active?: boolean };
  addUser: (userData: Omit<Profile, 'id' | 'created_at'> & { id?: string; created_at?: string }) => Profile;
  loadFromSupabase: () => Promise<{ success: boolean; count?: number; error?: string }>;
  resetToInitial: () => void;
}

export const useUserStore = create<UserManagementState>()(
  persist(
    (set, get) => ({
      users: INITIAL_PROFILES,
      searchQuery: '',
      selectedRoleFilter: 'ALL',
      isLoading: false,
      isInitialized: false,
      error: null,

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedRoleFilter: (selectedRoleFilter) => set({ selectedRoleFilter }),

      updateUserRole: (userId: string, newRole: UserRole) => {
        let updatedProfile: Profile | undefined;
        set((state) => {
          const nextUsers = state.users.map((u) => {
            if (u.id === userId) {
              updatedProfile = {
                ...u,
                role: newRole,
                roles: Array.from(new Set([...(u.roles ?? [u.role]), newRole])),
              };
              return updatedProfile;
            }
            return u;
          });
          return { users: nextUsers };
        });

        // Sincronización real con Supabase en la tabla 'profiles'
        const client = getSupabaseClient();
        if (client) {
          client
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId)
            .then(({ error }) => {
              if (error) console.warn('Supabase profile role update error:', error.message);
            });

          // Actualizar o insertar en user_roles también
          client
            .from('user_roles')
            .upsert([
              {
                user_id: userId,
                role: newRole,
                is_active: true,
              },
            ], { onConflict: 'user_id,role' })
            .then(({ error }) => {
              if (error) console.warn('Supabase user role assignment error:', error.message);
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
          client
            .from('profiles')
            .update({ is_active: newStatus })
            .eq('id', userId)
            .then(({ error }) => {
              if (error) console.warn('Supabase profile status update error:', error.message);
            });
        }

        return { success: true, is_active: newStatus };
      },

      addUser: (userData) => {
        const newId = userData.id || (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `usr-${Date.now()}`);

        const newUser: Profile = {
          ...userData,
          id: newId,
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

        return newUser;
      },

      loadFromSupabase: async () => {
        set({ isLoading: true, error: null });
        const client = getSupabaseClient();
        if (!client) {
          set({ isLoading: false, error: 'Supabase no está conectado.' });
          return { success: false, error: 'Supabase no está conectado.' };
        }

        try {
          const [profilesResult, rolesResult] = await Promise.all([
            client.from('profiles').select('*').order('full_name', { ascending: true }),
            client.from('user_roles').select('user_id, role').eq('is_active', true),
          ]);

          const error = profilesResult.error ?? rolesResult.error;
          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          if (profilesResult.data && profilesResult.data.length > 0) {
            const rolesByUserId = new Map<string, UserRole[]>();
            for (const assignment of rolesResult.data ?? []) {
              const roles = rolesByUserId.get(assignment.user_id) ?? [];
              roles.push(assignment.role as UserRole);
              rolesByUserId.set(assignment.user_id, roles);
            }
            const users: Profile[] = (profilesResult.data as Profile[]).map((profile) => ({
              ...profile,
              roles: Array.from(new Set([profile.role, ...(rolesByUserId.get(profile.id) ?? [])])),
            }));

            set({
              users,
              isInitialized: true,
              isLoading: false,
              error: null,
            });
            return { success: true, count: users.length };
          }

          set({ users: [], isInitialized: true, isLoading: false, error: null });
          return { success: true, count: 0 };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error al cargar perfiles desde Supabase';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      resetToInitial: () => set({ users: INITIAL_PROFILES }),
    }),
    {
      name: 'seed_users_management',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            ...persistedState,
            users: [],
            isInitialized: false,
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        selectedRoleFilter: state.selectedRoleFilter,
      }),
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
