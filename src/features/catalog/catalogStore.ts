import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ApplicationType, Requirement } from '../../types/database.ts';
import { getSupabaseClient } from '../../lib/supabase.ts';

export const INITIAL_APPLICATION_TYPES: ApplicationType[] = [
  {
    id: 'apt-001',
    code: 'SOL-AVAL-01',
    name: 'Presentación de Proyecto de Investigación (Aval Institucional)',
    description:
      'Solicitud de aval académico e institucional para nuevos proyectos de investigación docente o de semilleros para convocatorias internas o externas.',
    requires_committee: true,
    is_active: true,
    display_order: 1,
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 'apt-002',
    code: 'MOD-RUB-02',
    name: 'Modificación de Rubro Presupuestal (> 20%)',
    description:
      'Trámite para redistribución de rubros presupuestales asignados cuando la variación supera el 20% del rubro original (RN-13). Exige concepto del comité.',
    requires_committee: true,
    is_active: true,
    display_order: 2,
    created_at: '2026-01-12T09:00:00Z',
  },
  {
    id: 'apt-003',
    code: 'PROR-CRON-03',
    name: 'Prórroga de Cronograma y Tiempo de Ejecución',
    description:
      'Solicitud formal de ampliación de plazo para cumplimiento de objetivos y entregables de proyectos en ejecución activa.',
    requires_committee: true,
    is_active: true,
    display_order: 3,
    created_at: '2026-01-14T10:00:00Z',
  },
  {
    id: 'apt-004',
    code: 'INF-AVAN-04',
    name: 'Informe de Avance Periódico y Cumplimiento',
    description:
      'Reporte semestral o por hitos sobre avances técnicos, financieros y productos generados en el marco del proyecto.',
    requires_committee: false,
    is_active: true,
    display_order: 4,
    created_at: '2026-01-16T11:00:00Z',
  },
  {
    id: 'apt-005',
    code: 'INF-CIER-05',
    name: 'Informe Final, Liquidación y Cierre de Proyecto',
    description:
      'Evaluación y dictamen definitivo sobre el cumplimiento integral de compromisos, productos científicos y cierre formal del expediente.',
    requires_committee: true,
    is_active: true,
    display_order: 5,
    created_at: '2026-01-18T12:00:00Z',
  },
];

export const INITIAL_REQUIREMENTS: Requirement[] = [
  // 1. Requisitos para SOL-AVAL-01
  {
    id: 'req-001',
    application_type_id: 'apt-001',
    name: 'Propuesta Técnica Completa en Formato Institucional',
    description: 'Documento en plantilla institucional con planteamiento del problema, objetivos, marco teórico, metodología y bibliografía.',
    is_mandatory: true,
    is_subsanable: false, // RN-11: Causal no subsanable (documento sustancial del proyecto)
    allowed_formats: ['application/pdf'],
    max_size_mb: 10,
    template_url: '/templates/formato_propuesta_investigacion.pdf',
    cure_deadline_days: 0,
    created_at: '2026-01-10T08:30:00Z',
  },
  {
    id: 'req-002',
    application_type_id: 'apt-001',
    name: 'Presupuesto Detallado y Cronograma Financiero',
    description: 'Discriminación de gastos por rubros (personal, insumos, viajes, publicaciones) en formato de cálculo estandarizado.',
    is_mandatory: true,
    is_subsanable: true, // RN-11: Subsanable (admite ajustes o aclaraciones)
    allowed_formats: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    max_size_mb: 10,
    template_url: '/templates/formato_presupuesto_cronograma.xlsx',
    cure_deadline_days: 5,
    created_at: '2026-01-10T08:35:00Z',
  },
  {
    id: 'req-003',
    application_type_id: 'apt-001',
    name: 'Carta de Aval del Líder del Grupo de Investigación',
    description: 'Aval firmado por el líder del grupo garantizando pertinencia con la línea de investigación declarada.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: '/templates/formato_aval_lider_grupo.pdf',
    cure_deadline_days: 5,
    created_at: '2026-01-10T08:40:00Z',
  },
  {
    id: 'req-004',
    application_type_id: 'apt-001',
    name: 'Aval del Docente Tutor (Obligatorio para Estudiantes/Monitores RN-09)',
    description: 'Obligatorio si el solicitante es estudiante o monitor, certificando acompañamiento y supervisión docente.',
    is_mandatory: false, // Condicional por perfil
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: '/templates/formato_aval_tutor_docente.pdf',
    cure_deadline_days: 5,
    created_at: '2026-01-10T08:45:00Z',
  },

  // 2. Requisitos para MOD-RUB-02 (Modificación de rubro >20%)
  {
    id: 'req-005',
    application_type_id: 'apt-002',
    name: 'Justificación Técnica de Modificación Presupuestal',
    description: 'Memoria explicativa con razones académicas o de mercado que motivan el traslado presupuestal superior al 20%.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-12T09:30:00Z',
  },
  {
    id: 'req-006',
    application_type_id: 'apt-002',
    name: 'Cuadro Comparativo de Rubros Aprobados vs. Propuestos',
    description: 'Tabla comparativa detallada mostrando origen de los fondos, destino, montos en COP y porcentajes de variación.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-12T09:35:00Z',
  },

  // 3. Requisitos para PROR-CRON-03 (Prórroga)
  {
    id: 'req-007',
    application_type_id: 'apt-003',
    name: 'Informe de Estado Actual y Justificación de Prórroga',
    description: 'Exposición fundamentada de imprevistos o necesidades técnicas que sustentan la ampliación del plazo.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 10,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-14T10:30:00Z',
  },
  {
    id: 'req-008',
    application_type_id: 'apt-003',
    name: 'Cronograma de Trabajo Ajustado',
    description: 'Nuevo diagrama de Gantt o cronograma detallando actividades pendientes y fechas límite proyectadas.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-14T10:35:00Z',
  },

  // 4. Requisitos para INF-AVAN-04 (Informe de avance)
  {
    id: 'req-009',
    application_type_id: 'apt-004',
    name: 'Formulario de Informe de Avance Técnico y Financiero',
    description: 'Balance porcentual de cumplimiento de metas y ejecución presupuestal a la fecha de corte.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 10,
    template_url: null,
    cure_deadline_days: 5,
    created_at: '2026-01-16T11:30:00Z',
  },

  // 5. Requisitos para INF-CIER-05 (Informe final)
  {
    id: 'req-010',
    application_type_id: 'apt-005',
    name: 'Informe Final Científico y Productos de Investigación',
    description: 'Manuscrito final con resultados, publicaciones aceptadas, ponencias o patentes generadas.',
    is_mandatory: true,
    is_subsanable: false, // No subsanable si no se entrega el informe
    allowed_formats: ['application/pdf'],
    max_size_mb: 10,
    template_url: null,
    cure_deadline_days: 0,
    created_at: '2026-01-18T12:30:00Z',
  },
  {
    id: 'req-011',
    application_type_id: 'apt-005',
    name: 'Paz y Salvo Financiero de Liquidación Presupuestal',
    description: 'Certificado de ejecución del 100% de los recursos emitido por la Dirección Financiera.',
    is_mandatory: true,
    is_subsanable: true,
    allowed_formats: ['application/pdf'],
    max_size_mb: 5,
    template_url: null,
    cure_deadline_days: 8,
    created_at: '2026-01-18T12:35:00Z',
  },
];

interface CatalogState {
  types: ApplicationType[];
  requirements: Requirement[];
  selectedTypeId: string | null;
  searchQuery: string;
  filterStatus: 'ALL' | 'ACTIVE' | 'INACTIVE';

  setSelectedTypeId: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setFilterStatus: (s: 'ALL' | 'ACTIVE' | 'INACTIVE') => void;

  // Acciones para Tipos de Trámite
  createType: (data: {
    code: string;
    name: string;
    description?: string;
    requires_committee?: boolean;
    display_order?: number;
  }) => { success: boolean; type?: ApplicationType; error?: string };

  updateType: (
    id: string,
    data: Partial<Omit<ApplicationType, 'id' | 'created_at'>>
  ) => { success: boolean; type?: ApplicationType };

  toggleTypeActive: (id: string) => { success: boolean; is_active?: boolean };

  deleteType: (id: string) => { success: boolean; error?: string };

  // Acciones para Requisitos
  addRequirement: (data: {
    application_type_id: string;
    name: string;
    description?: string;
    is_mandatory: boolean;
    is_subsanable: boolean;
    allowed_formats?: string[];
    max_size_mb?: number;
    template_url?: string;
    cure_deadline_days?: number;
  }) => { success: boolean; requirement?: Requirement; error?: string };

  updateRequirement: (
    id: string,
    data: Partial<Omit<Requirement, 'id' | 'created_at' | 'application_type_id'>>
  ) => { success: boolean; requirement?: Requirement };

  removeRequirement: (id: string) => { success: boolean };

  // Sincronización con Supabase
  syncWithSupabase: () => Promise<{
    success: boolean;
    typesCount?: number;
    reqsCount?: number;
    error?: string;
  }>;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      types: INITIAL_APPLICATION_TYPES,
      requirements: INITIAL_REQUIREMENTS,
      selectedTypeId: 'apt-001',
      searchQuery: '',
      filterStatus: 'ALL',

      setSelectedTypeId: (selectedTypeId) => set({ selectedTypeId }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setFilterStatus: (filterStatus) => set({ filterStatus }),

      createType: (data) => {
        const cleanCode = data.code.trim().toUpperCase();
        const cleanName = data.name.trim();

        if (!cleanCode || !cleanName) {
          return { success: false, error: 'El código y el nombre del trámite son obligatorios.' };
        }

        // Validar unicidad del código
        const exists = get().types.some((t) => t.code.toUpperCase() === cleanCode);
        if (exists) {
          return { success: false, error: `Ya existe un tipo de trámite con el código ${cleanCode}.` };
        }

        const newType: ApplicationType = {
          id: `apt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
          code: cleanCode,
          name: cleanName,
          description: data.description?.trim() || null,
          requires_committee: data.requires_committee ?? true,
          is_active: true,
          display_order: data.display_order ?? get().types.length + 1,
          created_at: new Date().toISOString(),
        };

        set((state) => ({ types: [...state.types, newType], selectedTypeId: newType.id }));

        // Notificar a Supabase en segundo plano si está conectado
        const client = getSupabaseClient();
        if (client) {
          client.from('application_types').insert([newType]).then(({ error }) => {
            if (error) console.warn('Supabase application_types insert error:', error.message);
          });
        }

        return { success: true, type: newType };
      },

      updateType: (id, data) => {
        let updated: ApplicationType | undefined;
        set((state) => {
          const nextTypes = state.types.map((t) => {
            if (t.id === id) {
              updated = { ...t, ...data };
              return updated;
            }
            return t;
          });
          return { types: nextTypes };
        });

        const client = getSupabaseClient();
        if (client && updated) {
          client.from('application_types').update(data).eq('id', id).then(({ error }) => {
            if (error) console.warn('Supabase application_types update error:', error.message);
          });
        }

        return { success: Boolean(updated), type: updated };
      },

      toggleTypeActive: (id) => {
        let newStatus: boolean | undefined;
        set((state) => {
          const nextTypes = state.types.map((t) => {
            if (t.id === id) {
              newStatus = !t.is_active;
              return { ...t, is_active: newStatus };
            }
            return t;
          });
          return { types: nextTypes };
        });

        const client = getSupabaseClient();
        if (client && newStatus !== undefined) {
          client.from('application_types').update({ is_active: newStatus }).eq('id', id).then(() => {});
        }

        return { success: true, is_active: newStatus };
      },

      deleteType: (id) => {
        // Eliminar tipo y sus requisitos en cascada
        set((state) => ({
          types: state.types.filter((t) => t.id !== id),
          requirements: state.requirements.filter((r) => r.application_type_id !== id),
          selectedTypeId: state.selectedTypeId === id ? (state.types[0]?.id ?? null) : state.selectedTypeId,
        }));

        const client = getSupabaseClient();
        if (client) {
          client.from('application_types').delete().eq('id', id).then(({ error }) => {
            if (error) console.warn('Supabase application_types delete error:', error.message);
          });
        }

        return { success: true };
      },

      addRequirement: (data) => {
        const cleanName = data.name.trim();
        if (!cleanName) {
          return { success: false, error: 'El nombre del requisito es obligatorio.' };
        }

        const newReq: Requirement = {
          id: `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
          application_type_id: data.application_type_id,
          name: cleanName,
          description: data.description?.trim() || null,
          is_mandatory: data.is_mandatory,
          is_subsanable: data.is_subsanable,
          allowed_formats: data.allowed_formats && data.allowed_formats.length > 0
            ? data.allowed_formats
            : ['application/pdf'],
          max_size_mb: data.max_size_mb || 10,
          template_url: data.template_url?.trim() || null,
          cure_deadline_days: data.is_subsanable ? (data.cure_deadline_days ?? 5) : 0,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          requirements: [...state.requirements, newReq],
        }));

        const client = getSupabaseClient();
        if (client) {
          client.from('requirements').insert([newReq]).then(({ error }) => {
            if (error) console.warn('Supabase requirements insert error:', error.message);
          });
        }

        return { success: true, requirement: newReq };
      },

      updateRequirement: (id, data) => {
        let updated: Requirement | undefined;
        set((state) => {
          const nextReqs = state.requirements.map((r) => {
            if (r.id === id) {
              updated = { ...r, ...data };
              // Si no es subsanable, los días de subsanación quedan en 0
              if (data.is_subsanable === false) {
                updated.cure_deadline_days = 0;
              }
              return updated;
            }
            return r;
          });
          return { requirements: nextReqs };
        });

        const client = getSupabaseClient();
        if (client && updated) {
          client.from('requirements').update(data).eq('id', id).then(({ error }) => {
            if (error) console.warn('Supabase requirements update error:', error.message);
          });
        }

        return { success: Boolean(updated), requirement: updated };
      },

      removeRequirement: (id) => {
        set((state) => ({
          requirements: state.requirements.filter((r) => r.id !== id),
        }));

        const client = getSupabaseClient();
        if (client) {
          client.from('requirements').delete().eq('id', id).then(({ error }) => {
            if (error) console.warn('Supabase requirements delete error:', error.message);
          });
        }

        return { success: true };
      },

      syncWithSupabase: async () => {
        const client = getSupabaseClient();
        if (!client) {
          return { success: false, error: 'Supabase no está conectado. Configure credenciales.' };
        }

        try {
          // 1. Consultar application_types
          const { data: typesData, error: typesErr } = await client
            .from('application_types')
            .select('*')
            .order('display_order', { ascending: true });

          if (typesErr) {
            return { success: false, error: `Error en application_types: ${typesErr.message}` };
          }

          // 2. Consultar requirements
          const { data: reqsData, error: reqsErr } = await client
            .from('requirements')
            .select('*')
            .order('created_at', { ascending: true });

          if (reqsErr) {
            return { success: false, error: `Error en requirements: ${reqsErr.message}` };
          }

          if (typesData && typesData.length > 0) {
            set({ types: typesData as ApplicationType[] });
          }
          if (reqsData && reqsData.length > 0) {
            set({ requirements: reqsData as Requirement[] });
          }

          return {
            success: true,
            typesCount: typesData?.length ?? 0,
            reqsCount: reqsData?.length ?? 0,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error desconocido al sincronizar catálogo';
          return { success: false, error: msg };
        }
      },
    }),
    {
      name: 'seed_catalog_store',
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
