import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ResearchGroup, UserRole, Profile } from '../../types/database.ts';
import { getSupabaseClient } from '../../lib/supabase.ts';
import { useUserStore } from '../users/userStore.ts';

export const INITIAL_RESEARCH_GROUPS: ResearchGroup[] = [
  {
    id: 'grp-bio-01',
    name: 'Biotecnología y Recursos Naturales',
    code: 'G-BIO-01',
    faculty: 'Facultad de Ingeniería y Ciencias Aplicadas',
    leader_id: 'usr-005', // Dr. Germán Valenzuela (Líder Grupo)
    is_active: true,
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 'grp-ti-02',
    name: 'Inteligencia Artificial y Sistemas Distribuidos',
    code: 'G-ING-02',
    faculty: 'Facultad de Ingeniería de Sistemas',
    leader_id: 'usr-002', // Lic. Fernando Ortiz
    is_active: true,
    created_at: '2026-01-12T09:00:00Z',
  },
  {
    id: 'grp-mat-03',
    name: 'Nanomateriales y Nanotecnología Aplicada',
    code: 'G-MAT-03',
    faculty: 'Facultad de Ciencias Básicas',
    leader_id: 'usr-003', // Dr. Alejandro Restrepo
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'grp-salud-04',
    name: 'Salud Pública, Epidemiología y Biomedicina',
    code: 'G-SAL-04',
    faculty: 'Facultad de Ciencias de la Salud',
    leader_id: 'usr-001', // Dra. Carmen Lucía Morales
    is_active: true,
    created_at: '2026-01-18T11:00:00Z',
  },
  {
    id: 'grp-soc-05',
    name: 'Innovación Social, Educación y Políticas Públicas',
    code: 'G-SOC-05',
    faculty: 'Facultad de Ciencias Humanas',
    leader_id: 'usr-004', // Dra. Patricia Salamanca
    is_active: true,
    created_at: '2026-01-20T12:00:00Z',
  },
];

interface ResearchGroupsState {
  groups: ResearchGroup[];
  searchQuery: string;
  selectedFacultyFilter: string;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  setSearchQuery: (q: string) => void;
  setSelectedFacultyFilter: (f: string) => void;
  createGroup: (data: {
    name: string;
    code: string;
    faculty: string;
    leader_id: string;
  }) => { success: boolean; group?: ResearchGroup; error?: string };
  updateGroup: (
    groupId: string,
    data: Partial<Omit<ResearchGroup, 'id' | 'created_at'>>
  ) => { success: boolean; group?: ResearchGroup };
  assignGroupLeader: (
    groupId: string,
    leaderId: string
  ) => { success: boolean; group?: ResearchGroup; error?: string };
  toggleGroupActive: (groupId: string) => { success: boolean; is_active?: boolean };
  loadFromSupabase: () => Promise<{ success: boolean; count?: number; error?: string }>;
  syncWithSupabase: () => Promise<{ success: boolean; count?: number; error?: string }>;
}

export const useGroupsStore = create<ResearchGroupsState>()(
  persist(
    (set, get) => ({
      groups: INITIAL_RESEARCH_GROUPS,
      searchQuery: '',
      selectedFacultyFilter: 'ALL',
      isLoading: false,
      isInitialized: false,
      error: null,

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedFacultyFilter: (selectedFacultyFilter) => set({ selectedFacultyFilter }),

      createGroup: (data) => {
        const cleanCode = data.code.trim().toUpperCase();
        const cleanName = data.name.trim();

        // Validar unicidad de código
        const existing = get().groups.find(
          (g) => g.code.toUpperCase() === cleanCode
        );
        if (existing) {
          return { success: false, error: `Ya existe un grupo con el código ${cleanCode}.` };
        }

        const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'c0000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');

        const newGroup: ResearchGroup = {
          id: newId,
          name: cleanName,
          code: cleanCode,
          faculty: data.faculty.trim(),
          leader_id: data.leader_id || null,
          is_active: true,
          created_at: new Date().toISOString(),
        };

        set((state) => ({ groups: [newGroup, ...state.groups] }));

        // Asignar rol lider_grupo al líder seleccionado si no es admin
        if (data.leader_id) {
          const userStore = useUserStore.getState();
          const targetUser = userStore.users.find((u) => u.id === data.leader_id);
          if (targetUser && targetUser.role !== 'admin') {
            userStore.updateUserRole(data.leader_id, 'lider_grupo');
          }
        }

        // Sincronización directa con Supabase
        const client = getSupabaseClient();
        if (client) {
          const supabaseLeaderId = (data.leader_id && data.leader_id.length > 20) ? data.leader_id : null;
          client
            .from('research_groups')
            .insert([{
              id: newGroup.id,
              name: newGroup.name,
              code: newGroup.code,
              faculty: newGroup.faculty,
              leader_id: supabaseLeaderId,
              is_active: newGroup.is_active,
            }])
            .then(({ error }) => {
              if (error) console.warn('Supabase research_groups insert error:', error.message);
            });
        }

        return { success: true, group: newGroup };
      },

      updateGroup: (groupId, data) => {
        let updated: ResearchGroup | undefined;
        set((state) => {
          const nextGroups = state.groups.map((g) => {
            if (g.id === groupId) {
              updated = { ...g, ...data };
              return updated;
            }
            return g;
          });
          return { groups: nextGroups };
        });

        const client = getSupabaseClient();
        if (client && updated) {
          client
            .from('research_groups')
            .update(data)
            .eq('id', groupId)
            .then(({ error }) => {
              if (error) console.warn('Supabase research_groups update error:', error.message);
            });
        }

        return { success: Boolean(updated), group: updated };
      },

      assignGroupLeader: (groupId, leaderId) => {
        let updatedGroup: ResearchGroup | undefined;

        set((state) => {
          const nextGroups = state.groups.map((g) => {
            if (g.id === groupId) {
              updatedGroup = { ...g, leader_id: leaderId };
              return updatedGroup;
            }
            return g;
          });
          return { groups: nextGroups };
        });

        // Actualizar rol del usuario seleccionado a lider_grupo y vincularlo
        if (leaderId) {
          const userStore = useUserStore.getState();
          const targetUser = userStore.users.find((u) => u.id === leaderId);
          if (targetUser && targetUser.role !== 'admin') {
            userStore.updateUserRole(leaderId, 'lider_grupo');
          }
        }

        const client = getSupabaseClient();
        if (client && updatedGroup) {
          const supabaseLeaderId = (leaderId && leaderId.length > 20) ? leaderId : null;
          client
            .from('research_groups')
            .update({ leader_id: supabaseLeaderId })
            .eq('id', groupId)
            .then(({ error }) => {
              if (error) console.warn('Supabase research_groups leader update error:', error.message);
            });
        }

        return { success: Boolean(updatedGroup), group: updatedGroup };
      },

      toggleGroupActive: (groupId) => {
        let newStatus: boolean | undefined;
        set((state) => {
          const nextGroups = state.groups.map((g) => {
            if (g.id === groupId) {
              newStatus = !g.is_active;
              return { ...g, is_active: newStatus };
            }
            return g;
          });
          return { groups: nextGroups };
        });

        const client = getSupabaseClient();
        if (client && newStatus !== undefined) {
          client
            .from('research_groups')
            .update({ is_active: newStatus })
            .eq('id', groupId)
            .then(({ error }) => {
              if (error) console.warn('Supabase research_groups toggle error:', error.message);
            });
        }

        return { success: true, is_active: newStatus };
      },

      loadFromSupabase: async () => {
        set({ isLoading: true, error: null });
        const client = getSupabaseClient();
        if (!client) {
          set({ isLoading: false, error: 'Supabase no está conectado.' });
          return { success: false, error: 'Supabase no está conectado.' };
        }

        try {
          const { data, error } = await client
            .from('research_groups')
            .select('*')
            .order('name', { ascending: true });

          if (error) {
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }

          if (data && data.length > 0) {
            set({
              groups: data as ResearchGroup[],
              isInitialized: true,
              isLoading: false,
              error: null,
            });
            return { success: true, count: data.length };
          }

          set({ isInitialized: true, isLoading: false, error: null });
          return { success: true, count: 0 };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error al sincronizar grupos desde Supabase';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      syncWithSupabase: async () => {
        return get().loadFromSupabase();
      },
    }),
    {
      name: 'seed_research_groups',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Descartar caché con IDs antiguos grp-
          return {
            ...persistedState,
            groups: [],
            isInitialized: false,
          };
        }
        return persistedState;
      },
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
