import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppRole, normalizeRole, ROLE_HOME_PATHS } from '../lib/permissions.ts';
import { getSupabaseClient } from '../lib/supabase.ts';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Profile, UserRole } from '../types/database.ts';

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

async function loadAuthenticatedSession(client: SupabaseClient, user: User): Promise<UserSession> {
  const [profile, assignments] = await Promise.all([
    client.from('profiles').select('*').eq('id', user.id).eq('is_active', true)
      .overrideTypes<Profile[], { merge: false }>(),
    client.from('user_roles').select('role').eq('user_id', user.id).eq('is_active', true)
      .overrideTypes<{ role: UserRole }[], { merge: false }>(),
  ]);
  if (profile.error || assignments.error) {
    throw new Error('No se pudo consultar el perfil y sus permisos en Supabase.');
  }
  const record = profile.data?.[0];
  if (!record) {
    throw new Error('La cuenta necesita un perfil activo vinculado en Supabase.');
  }
  const roles = [...new Set([record.role, ...(assignments.data ?? []).map(({ role }) => role)].map(normalizeRole))]
    .filter((role): role is AppRole => Object.hasOwn(ROLE_HOME_PATHS, role));
  const activeRole = roles[0];
  if (!activeRole) throw new Error('El perfil no tiene un rol válido.');
  return {
    id: record.id,
    email: record.email,
    fullName: record.full_name,
    academicProgram: record.academic_program ?? undefined,
    academicLink: record.academic_link ?? undefined,
    researchGroupId: record.research_group_id ?? undefined,
    roles,
    activeRole,
  };
}

// Cuentas de demostración reales del sistema (Sección 3.2 / T7.4 / T7.8)
export const REAL_DEMO_ACCOUNTS: Record<string, { email: string; fullName: string; role: AppRole; program: string; link: string }> = {
  researcher: {
    email: 'investigador@universidad.edu.co',
    fullName: 'Dra. Carmen Lucía Morales',
    role: 'researcher',
    program: 'Ingeniería Ambiental y Bioprocesos',
    link: 'Docente planta',
  },
  administrative: {
    email: 'administrativo@universidad.edu.co',
    fullName: 'Lic. Fernando Ortiz',
    role: 'administrative',
    program: 'Dirección de Investigaciones',
    link: 'Personal administrativo',
  },
  committee_member: {
    email: 'comite@universidad.edu.co',
    fullName: 'Dr. Alejandro Restrepo',
    role: 'committee_member',
    program: 'Facultad de Ciencias Básicas',
    link: 'Docente planta',
  },
  secretary: {
    email: 'secretario@universidad.edu.co',
    fullName: 'Dra. Patricia Salamanca',
    role: 'secretary',
    program: 'Secretaría Técnica de Investigaciones',
    link: 'Docente ocasional',
  },
  leader: {
    email: 'lider@universidad.edu.co',
    fullName: 'Dr. Germán Valenzuela',
    role: 'leader',
    program: 'Líder Grupo Biotecnología',
    link: 'Docente titular',
  },
  admin: {
    email: 'admin@seed.com',
    fullName: 'Administrador Principal Seed',
    role: 'admin',
    program: 'Dirección de Investigaciones y Tecnología',
    link: 'Personal administrativo',
  },
  // Alias de compatibilidad
  admin_legacy: {
    email: 'admin@universidad.edu.co',
    fullName: 'Ing. Mateo Cárdenas',
    role: 'admin',
    program: 'Administración del Sistema',
    link: 'Personal administrativo',
  },
};

// Aliases para búsqueda rápida por email
export const DEMO_ACCOUNTS_BY_EMAIL = Object.values(REAL_DEMO_ACCOUNTS).reduce((acc, curr) => {
  acc[curr.email.toLowerCase()] = curr;
  return acc;
}, {} as Record<string, typeof REAL_DEMO_ACCOUNTS[string]>);

interface RegisterParams {
  fullName: string;
  email: string;
  password?: string;
  academicLink?: string;
  academicProgram?: string;
  researchGroup?: string;
  researchGroupId?: string;
}

export interface RegisterResult {
  success: boolean;
  requiresEmailConfirmation?: boolean;
  email?: string;
  error?: string;
}

export interface LoginResult {
  success: boolean;
  requiresEmailConfirmation?: boolean;
  email?: string;
  error?: string;
}

interface SessionState {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  unreadNotificationsCount: number;

  loginWithCredentials: (email: string, password?: string) => Promise<LoginResult>;
  registerUser: (params: RegisterParams) => Promise<RegisterResult>;
  verifyOtpCode: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  checkEmailConfirmed: (email: string) => Promise<{ confirmed: boolean; user?: UserSession }>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  setActiveRole: (role: AppRole) => void;
  logout: () => Promise<void>;
  initializeSession: () => Promise<void>;
  setupAuthListener: () => () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null, // Arranca sin sesión (T7.4)
      isAuthenticated: false,
      isLoading: true,
      unreadNotificationsCount: 0,

      /**
       * Configura el listener en tiempo real de cambios de autenticación en Supabase
       * (detecta cuando el usuario hace clic en el enlace del correo)
       */
      setupAuthListener: () => {
        const client = getSupabaseClient();
        if (!client) return () => {};

        const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
          if (event === 'INITIAL_SESSION' && !session?.user) {
            set({ user: null, isAuthenticated: false, isLoading: false });
          } else if (
            event === 'INITIAL_SESSION' ||
            event === 'SIGNED_IN' ||
            event === 'USER_UPDATED'
          ) {
            set({ isLoading: true });
            queueMicrotask(() => {
              void get().initializeSession();
            });
          } else if (event === 'SIGNED_OUT') {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      },

      /**
       * Inicializa y sincroniza la sesión activa desde Supabase Auth
       */
      initializeSession: async () => {
        const client = getSupabaseClient();
        if (!client) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          const { data: { session }, error } = await client.auth.getSession();
          if (error) throw error;

          if (session?.user) {
            const restored = await loadAuthenticatedSession(client, session.user);
            const current = get().user;
            if (current?.id === restored.id && restored.roles.includes(current.activeRole)) {
              restored.activeRole = current.activeRole;
            }
            set({ user: restored, isAuthenticated: true, isLoading: false });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (err) {
          console.error('Error al inicializar sesión:', err);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      /**
       * Verifica el código OTP de 6 dígitos que Supabase envía en el correo de confirmación
       */
      verifyOtpCode: async (email: string, token: string) => {
        set({ isLoading: true });
        const cleanEmail = email.trim().toLowerCase();
        const cleanToken = token.trim();
        const client = getSupabaseClient();

        if (!client) {
          set({ isLoading: false });
          return { success: false, error: 'Supabase no está conectado.' };
        }

        try {
          const { data, error } = await client.auth.verifyOtp({
            email: cleanEmail,
            token: cleanToken,
            type: 'signup',
          });

          if (error) {
            set({ isLoading: false });
            return {
              success: false,
              error: 'Código inválido o expirado. Verifique el código de 6 dígitos enviado a su correo.',
            };
          }

          if (!data.session || !data.user) {
            set({ isLoading: false });
            return { success: false, error: 'Supabase no inició una sesión tras verificar el código.' };
          }

          const verified = await loadAuthenticatedSession(client, data.user);
          set({ user: verified, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error al verificar código OTP.';
          set({ isLoading: false });
          return { success: false, error: msg };
        }
      },

      /**
       * Comprueba si el correo ya ha sido confirmado (sondeo automático en segundo plano)
       */
      checkEmailConfirmed: async (email: string) => {
        const cleanEmail = email.trim().toLowerCase();
        const client = getSupabaseClient();
        if (!client) return { confirmed: false };

        try {
          const { data: { session } } = await client.auth.getSession();
          if (session?.user && session.user.email?.toLowerCase() === cleanEmail) {
            await get().initializeSession();
            const user = get().user;
            return user?.id === session.user.id ? { confirmed: true, user } : { confirmed: false };
          }
          return { confirmed: false };
        } catch {
          return { confirmed: false };
        }
      },

      /**
       * Reenvía el correo de confirmación de registro a través de Supabase Auth
       */
      resendConfirmationEmail: async (email: string) => {
        const cleanEmail = email.trim().toLowerCase();
        const client = getSupabaseClient();
        if (!client) {
          return { success: false, error: 'No se detecta conexión activa con Supabase.' };
        }

        try {
          const { error } = await client.auth.resend({
            type: 'signup',
            email: cleanEmail,
          });

          if (error) {
            return {
              success: false,
              error: error.message.includes('rate')
                ? 'Por favor espere unos momentos antes de solicitar otro reenvío.'
                : error.message,
            };
          }

          return {
            success: true,
            message: `Correo de verificación reenviado con éxito a ${cleanEmail}. Por favor revise su bandeja de entrada y spam.`,
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error inesperado al reenviar correo de confirmación.';
          return { success: false, error: msg };
        }
      },

      /**
       * Inicio de sesión real con Supabase Auth
       */
      loginWithCredentials: async (email: string, password = 'password123') => {
        set({ isLoading: true });
        const cleanEmail = email.trim().toLowerCase();
        const client = getSupabaseClient();

        if (client) {
          try {
            const { data: authData, error: authErr } = await client.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });

            if (authErr) {
              const errMsg = authErr.message.toLowerCase();

              // Caso 1: Correo sin confirmar en Supabase Auth
              if (errMsg.includes('email not confirmed') || errMsg.includes('not confirmed') || errMsg.includes('unconfirmed')) {
                set({ isLoading: false });
                return {
                  success: false,
                  requiresEmailConfirmation: true,
                  email: cleanEmail,
                  error: 'Su correo institucional aún no ha sido confirmado. Puede ingresar el código de 6 dígitos que recibió por correo o hacer clic en el enlace.',
                };
              }

              // Las cuentas de demostración no son usuarios autenticados de Supabase.
              const demoMatch = DEMO_ACCOUNTS_BY_EMAIL[cleanEmail];
              if (demoMatch) {
                set({ isLoading: false });
                return {
                  success: false,
                  error: `La cuenta de demostración (${demoMatch.email}) no existe necesariamente en Supabase Auth. Registre esa cuenta en Supabase y use su contraseña real, o quite la configuración de Supabase para usar el modo demostración.`,
                };
              }

              // Caso 3: Credenciales inválidas estándar
              set({ isLoading: false });
              return {
                success: false,
                error: 'Credenciales no válidas. Verifique su correo institucional y contraseña.',
              };
            }

            if (authData.user) {
              const loggedIn = await loadAuthenticatedSession(client, authData.user);
              set({ user: loggedIn, isAuthenticated: true, isLoading: false });
              return { success: true };
            }
          } catch (err: unknown) {
            console.warn('Error durante autenticación con Supabase Auth:', err);
            set({ isLoading: false });
            return {
              success: false,
              error: err instanceof Error
                ? `No se pudo completar el inicio de sesión con Supabase: ${err.message}`
                : 'No se pudo completar el inicio de sesión con Supabase.',
            };
          }
        }

        // 2. Soporte para cuentas de demostración offline
        const demo = DEMO_ACCOUNTS_BY_EMAIL[cleanEmail];
        if (demo) {
          const userSession: UserSession = {
            id: `usr-${demo.role.slice(0, 3)}-01`,
            email: demo.email,
            fullName: demo.fullName,
            academicProgram: demo.program,
            academicLink: demo.link,
            researchGroupId: 'grp-bio-01',
            roles: [demo.role],
            activeRole: demo.role,
          };

          set({
            user: userSession,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        }

        // Credenciales no encontradas
        set({ isLoading: false });
        return {
          success: false,
          error: 'Credenciales no válidas. Verifique su correo institucional y contraseña.',
        };
      },

      /**
       * Registro real de usuario en Supabase Auth con detección de confirmación por correo
       */
      registerUser: async (params: RegisterParams) => {
        set({ isLoading: true });
        const cleanEmail = params.email.trim().toLowerCase();
        const client = getSupabaseClient();

        if (client) {
          if (!params.password) {
            set({ isLoading: false });
            return { success: false, error: 'Ingresa una contraseña para crear tu cuenta.' };
          }
          try {
            // URL de redirección directa a la app al hacer clic en el enlace del correo
            const emailRedirectTo = typeof window !== 'undefined'
              ? `${window.location.origin}/mis-solicitudes`
              : undefined;

            const { data: authData, error: authErr } = await client.auth.signUp({
              email: cleanEmail,
              password: params.password,
              options: {
                emailRedirectTo,
                data: {
                  full_name: params.fullName.trim(),
                  academic_link: params.academicLink,
                  academic_program: params.academicProgram,
                  research_group: params.researchGroup,
                },
              },
            });

            if (authErr) {
              set({ isLoading: false });
              return { success: false, error: authErr.message };
            }

            if (authData.user) {
              const requiresEmailConfirmation = !authData.session;

              // Si requiere confirmación, informamos el estado para ofrecer código o enlace
              if (requiresEmailConfirmation) {
                set({ isLoading: false, user: null, isAuthenticated: false });
                return {
                  success: true,
                  requiresEmailConfirmation: true,
                  email: cleanEmail,
                };
              }

              // Si Supabase tiene autoconfirmación o emitió sesión inmediata
              const newSession = await loadAuthenticatedSession(client, authData.user);

              set({
                user: newSession,
                isAuthenticated: true,
                isLoading: false,
              });

              return {
                success: true,
                requiresEmailConfirmation: false,
                email: cleanEmail,
              };
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al registrar el usuario en Supabase';
            set({ isLoading: false });
            return { success: false, error: msg };
          }
        }

        // Modo offline / fallback
        const newSession: UserSession = {
          id: `usr-reg-${Date.now().toString(36)}`,
          email: cleanEmail,
          fullName: params.fullName.trim(),
          academicLink: params.academicLink,
          academicProgram: params.academicProgram,
          roles: ['researcher'],
          activeRole: 'researcher',
        };

        set({
          user: newSession,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true, requiresEmailConfirmation: false };
      },

      /**
       * Permite al usuario cambiar entre sus roles autorizados
       */
      setActiveRole: (role) => {
        const current = get().user;
        if (current) {
          const normRole = normalizeRole(role) as AppRole;
          const userNormRoles = current.roles.map((r) => normalizeRole(r));
          if (userNormRoles.includes(normRole)) {
            set({
              user: { ...current, activeRole: normRole },
            });
          }
        }
      },

      /**
       * Cierre de sesión real con limpieza de Supabase y de estado local
       */
      logout: async () => {
        try {
          const client = getSupabaseClient();
          if (client) {
            await client.auth.signOut();
          }
        } catch (err) {
          console.warn('Error al cerrar sesión en Supabase:', err);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            unreadNotificationsCount: 0,
          });
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('seed_session_store');
          }
        }
      },
    }),
    {
      name: 'seed_session_store',
      partialize: () => ({}),
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
