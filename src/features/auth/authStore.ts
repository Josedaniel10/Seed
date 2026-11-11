import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Profile, UserRole } from '../../types/database.ts';
import { getSupabaseClient, getSupabaseCredentials } from '../../lib/supabase.ts';
import { RegisterFormData } from './schemas.ts';

export interface AuthState {
  profile: Profile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, mockRole?: UserRole, mockName?: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (data: RegisterFormData) => Promise<{ success: boolean; profile?: Profile; requiresConfirmation?: boolean; error?: string }>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => Promise<void>;
  setProfile: (profile: Profile | null) => void;
  clearError: () => void;
}

export type DemoUserRole =
  | 'investigador'
  | 'administrativo'
  | 'integrante_comite'
  | 'secretario'
  | 'lider_grupo'
  | 'admin';

export const DEMO_USERS: Record<DemoUserRole, { email: string; name: string; program: string; role: UserRole; group: string }> = {
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

      /**
       * Registro real de usuario en Supabase Auth y tabla 'profiles' (RF-01)
       */
      registerUser: async (data: RegisterFormData) => {
        set({ isLoading: true, error: null });

        const client = getSupabaseClient();
        if (!client) {
          const cleanEmail = data.email.trim().toLowerCase();
          const mockProfile: Profile = {
            id: `usr-${Date.now().toString(36)}`,
            email: cleanEmail,
            full_name: data.fullName.trim(),
            role: 'investigador',
            academic_program: data.academicProgram.trim(),
            academic_link: data.academicLink,
            research_group_id: data.researchGroupId,
            is_active: true,
            created_at: new Date().toISOString(),
          };
          set({
            profile: mockProfile,
            token: 'mock-jwt-token-testing',
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true, profile: mockProfile, requiresConfirmation: false };
        }

        try {
          const cleanEmail = data.email.trim().toLowerCase();

          // 1. Registro directo en Supabase Auth (auth.users)
          const { data: authData, error: authErr } = await client.auth.signUp({
            email: cleanEmail,
            password: data.password,
            options: {
              data: {
                full_name: data.fullName.trim(),
                academic_program: data.academicProgram.trim(),
                academic_link: data.academicLink,
                research_group_id: data.researchGroupId,
              },
            },
          });

          if (authErr) {
            set({ isLoading: false, error: authErr.message });
            return { success: false, error: authErr.message };
          }

          if (!authData.user) {
            const msg = 'No se recibió el identificador de usuario desde Supabase.';
            set({ isLoading: false, error: msg });
            return { success: false, error: msg };
          }

          if (!authData.session) {
            set({ isLoading: false });
            return { success: true, requiresConfirmation: true };
          }

          const { data: profiles, error: profileError } = await client.from('profiles')
            .select('*').eq('id', authData.user.id).eq('is_active', true)
            .overrideTypes<Profile[], { merge: false }>();
          const profile = profiles?.[0];
          if (profileError || !profile) {
            throw new Error('Su cuenta necesita un perfil activo para ingresar.');
          }
          set({ profile, token: authData.session.access_token, isAuthenticated: true, isLoading: false, error: null });
          return { success: true, profile, requiresConfirmation: false };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error inesperado al registrar usuario en Supabase';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      resendConfirmationEmail: async (email: string) => {
        const client = getSupabaseClient();
        if (!client) {
          return { success: false, error: 'No se pudo conectar con el servicio. Intente nuevamente.' };
        }

        try {
          const { error } = await client.auth.resend({
            type: 'signup',
            email: email.trim().toLowerCase(),
          });

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true, message: `Correo de verificación reenviado exitosamente a ${email}.` };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error al reenviar correo de confirmación';
          return { success: false, error: msg };
        }
      },

      /**
       * Inicio de sesión real contra Supabase (RF-02)
       */
      login: async (email: string, password: string, mockRole?: UserRole, mockName?: string) => {
        set({ isLoading: true, error: null });
        const cleanEmail = email.trim().toLowerCase();

        const client = getSupabaseClient();
        if (!client) {
          const demoMatch = Object.values(DEMO_USERS).find(
            (u) => u.email.toLowerCase() === cleanEmail
          );

          const assignedRole: UserRole = mockRole || (demoMatch ? demoMatch.role : 'investigador');
          const assignedName = mockName || (demoMatch ? demoMatch.name : cleanEmail.split('@')[0]);

          const mockProfile: Profile = {
            id: `usr-${Date.now().toString(36)}`,
            email: cleanEmail,
            full_name: assignedName,
            role: assignedRole,
            academic_program: demoMatch?.program || 'Investigación General',
            academic_link: 'docente_planta',
            research_group_id: demoMatch?.group || 'grp-bio-01',
            is_active: true,
            created_at: new Date().toISOString(),
          };
          set({
            profile: mockProfile,
            token: 'mock-jwt-token-testing',
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true, profile: mockProfile };
        }

        try {
          // 1. Autenticación real contra Supabase Auth
          const { data: authData, error: authErr } = await client.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (authErr) {
            set({ isLoading: false, error: `No se pudo iniciar sesión: ${authErr.message}` });
            return { success: false, error: authErr.message };
          }

          const user = authData.user;
          const token = authData.session?.access_token || '';

          const { data: profiles, error: profileError } = await client.from('profiles')
            .select('*').eq('id', user.id).eq('is_active', true)
            .overrideTypes<Profile[], { merge: false }>();
          const userProfile = profiles?.[0];
          if (profileError || !userProfile) {
            const msg = 'Su cuenta necesita un perfil activo para ingresar.';
            set({ isLoading: false, error: msg, isAuthenticated: false, profile: null, token: null });
            return { success: false, error: msg };
          }
          set({
            profile: userProfile,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return { success: true };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'No se pudo iniciar sesión. Intente nuevamente.';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      /**
       * Cierre de sesión real en Supabase (RF-02)
       */
      logout: async () => {
        set({ isLoading: true });
        try {
          const client = getSupabaseClient();
          if (client) {
            await client.auth.signOut();
          }
        } catch (err) {
          console.warn('Error durante signOut en Supabase:', err);
        } finally {
          set({
            profile: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });

          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('seed_auth_session');
          }
        }
      },
    }),
    {
      name: 'seed_auth_session',
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
        profile: null,
        token: null,
        isAuthenticated: false,
      }),
    }
  )
);
