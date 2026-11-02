import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Profile, UserRole } from '../../types/database.ts';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.ts';

export interface AuthState {
  profile: Profile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, mockRole?: UserRole, mockName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
  clearError: () => void;
}

export const DEMO_USERS: Record<UserRole, { email: string; name: string; program: string; role: UserRole; group: string }> = {
  investigador: {
    email: 'investigador@universidad.edu.co',
    name: 'Dra. Carmen Lucía Morales',
    program: 'Ingeniería Ambiental y Bioprocesos',
    role: 'investigador',
    group: 'grp-bio-01',
  },
  administrativo: {
    email: 'administrativo@universidad.edu.co',
    name: 'Lic. Fernando Ortiz',
    program: 'Dirección de Investigaciones',
    role: 'administrativo',
    group: 'grp-ti-02',
  },
  integrante_comite: {
    email: 'comite@universidad.edu.co',
    name: 'Dr. Alejandro Restrepo',
    program: 'Facultad de Ciencias Básicas',
    role: 'integrante_comite',
    group: 'grp-mat-03',
  },
  secretario: {
    email: 'secretario@universidad.edu.co',
    name: 'Dra. Patricia Salamanca',
    program: 'Secretaría Técnica de Investigaciones',
    role: 'secretario',
    group: 'grp-ti-02',
  },
  lider_grupo: {
    email: 'lider@universidad.edu.co',
    name: 'Dr. Germán Valenzuela',
    program: 'Líder Grupo Biotecnología',
    role: 'lider_grupo',
    group: 'grp-bio-01',
  },
  admin: {
    email: 'admin@universidad.edu.co',
    name: 'Ing. Mateo Cárdenas',
    program: 'Administración del Sistema',
    role: 'admin',
    group: 'grp-ti-02',
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      profile: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      clearError: () => set({ error: null }),

      setProfile: (profile) => set({ profile, isAuthenticated: Boolean(profile) }),

      login: async (email, password, mockRole, mockName) => {
        set({ isLoading: true, error: null });

        try {
          // Si Supabase está configurado en producción con URL real
          if (isSupabaseConfigured) {
            const { data, error: sbError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (sbError) {
              set({ isLoading: false, error: sbError.message });
              return { success: false, error: sbError.message };
            }

            const token = data.session?.access_token || 'sb-token';
            const userProfile: Profile = {
              id: data.user.id,
              email: data.user.email || email,
              full_name: data.user.user_metadata?.full_name || mockName || email.split('@')[0],
              role: (data.user.user_metadata?.role as UserRole) || mockRole || 'investigador',
              academic_program: data.user.user_metadata?.academic_program || 'Investigación General',
              academic_link: data.user.user_metadata?.academic_link || 'docente_planta',
              research_group_id: data.user.user_metadata?.research_group_id || 'grp-bio-01',
              is_active: true,
              created_at: data.user.created_at || new Date().toISOString(),
            };

            set({
              profile: userProfile,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return { success: true };
          }

          // Modo demo / desarrollo inicial: autenticación controlada
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Verificar si coincide con alguno de los roles demo o el especificado
          const matchedDemo = Object.values(DEMO_USERS).find(
            (u) => u.email.toLowerCase() === email.toLowerCase()
          );

          const role: UserRole = mockRole || matchedDemo?.role || 'investigador';
          const name: string = mockName || matchedDemo?.name || email.split('@')[0];
          const program: string = matchedDemo?.program || 'Facultad de Ingeniería';
          const group: string = matchedDemo?.group || 'grp-bio-01';

          const demoProfile: Profile = {
            id: crypto.randomUUID(),
            email,
            full_name: name,
            role,
            academic_program: program,
            academic_link: 'docente_planta',
            research_group_id: group,
            is_active: true,
            created_at: new Date().toISOString(),
          };

          const simulatedToken = `seed-jwt-${Date.now()}-${role}`;

          set({
            profile: demoProfile,
            token: simulatedToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return { success: true };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          if (isSupabaseConfigured) {
            await supabase.auth.signOut();
          }
        } catch {
          // Ignorar error de cierre si no hay conexión
        } finally {
          set({
            profile: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          // Limpieza garantizada de storage
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('seed_auth_session');
          }
        }
      },
    }),
    {
      name: 'seed_auth_session', // Nombre de la clave en localStorage
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
      partialize: (state) => ({
        profile: state.profile,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
