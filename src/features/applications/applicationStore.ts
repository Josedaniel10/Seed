import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Application,
  ApplicationDocument,
  AuditHistory,
  ApplicationDbStatus,
  DocumentValidationStatus,
} from '../../types/database.ts';
import { useCatalogStore } from '../catalog/catalogStore.ts';
import { getSupabaseClient } from '../../lib/supabase.ts';

export interface UploadedFilePayload {
  requirement_id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  file_hash_sha256: string;
  mime_type: string;
  file_base64?: string;
}

export interface CreateApplicationPayload {
  application_type_id: string;
  applicant_id: string;
  applicant_name?: string;
  title: string;
  abstract: string;
  related_project?: string | null;
  research_group_id?: string | null;
  budget_requested?: number;
  is_tutor_endorsed?: boolean;
  documents: UploadedFilePayload[];
}

export interface ApplicationState {
  applications: Application[];
  documents: ApplicationDocument[];
  auditHistory: AuditHistory[];
  isSubmitting: boolean;

  // Acciones y consultas
  generateNextFilingNumber: (year?: number) => Promise<string>;
  createApplication: (
    payload: CreateApplicationPayload
  ) => Promise<{ success: boolean; application?: Application; error?: string }>;
  getApplicationById: (id: string) => Application | undefined;
  getApplicationsByApplicant: (applicantId: string) => Application[];
  getDocumentsByApplication: (applicationId: string) => ApplicationDocument[];
  getAuditHistoryByApplication: (applicationId: string) => AuditHistory[];
  subsanarDocument: (
    applicationId: string,
    requirementId: string,
    file: UploadedFilePayload,
    actorId: string,
    actorName: string
  ) => Promise<{ success: boolean; document?: ApplicationDocument; error?: string }>;
  computeQueFalta: (app: Application) => string;
  resetToInitialSeed: () => void;
}

// Semilla inicial realista de solicitudes para el prototipo
export const INITIAL_APPLICATIONS: Application[] = [
  {
    id: 'sol-001',
    filing_number: 'Radicado 2026-001',
    application_type_id: 'apt-001', // Presentación de Proyecto (Aval Institucional)
    applicant_id: 'usr-001', // Dra. Carmen Lucía Morales
    title: 'Modelamiento de Redes Neuronales Profundas para Detección Temprana de Fitopatógenos en Cultivos Andinos',
    abstract:
      'Diseño y entrenamiento de modelos convolucionales de visión artificial para la identificación temprana de hongos y patógenos foliares en cultivos andinos, integrando dispositivos edge computing de bajo costo.',
    research_group_id: 'grp-001', // G-BIO-01
    budget_requested: 45000000,
    current_status: 'RADICADA',
    is_tutor_endorsed: true,
    requires_committee: true,
    created_at: '2026-02-01T14:30:00Z',
    updated_at: '2026-02-01T14:30:00Z',
  },
  {
    id: 'sol-002',
    filing_number: 'Radicado 2026-002',
    application_type_id: 'apt-002', // Modificación de Rubro Presupuestal (> 20%)
    applicant_id: 'usr-001', // Dra. Carmen Lucía Morales
    title: 'Reasignación de Rubro para Adquisición de Reactivos de Secuenciación Genómica',
    abstract:
      'Modificación superior al 20% del rubro de materiales y suministros hacia servicios técnicos especializados de secuenciación de alto rendimiento.',
    research_group_id: 'grp-001',
    budget_requested: 18500000,
    current_status: 'PENDIENTE_DOCUMENTOS',
    is_tutor_endorsed: false,
    requires_committee: true,
    created_at: '2026-02-02T10:15:00Z',
    updated_at: '2026-02-03T11:00:00Z',
  },
  {
    id: 'sol-003',
    filing_number: 'Radicado 2026-003',
    application_type_id: 'apt-004', // Prórroga de Cronograma
    applicant_id: 'usr-001', // Dra. Carmen Lucía Morales
    title: 'Ampliación de Plazo Fase Experimental en Bioensayos de Laboratorio',
    abstract:
      'Solicitud de extensión de 3 meses para completar la recolección de datos y ensayos de replicabilidad debido a demoras de importación de reactivos.',
    research_group_id: 'grp-001',
    budget_requested: 0,
    current_status: 'EN_REVISION',
    is_tutor_endorsed: false,
    requires_committee: true,
    created_at: '2026-02-02T16:00:00Z',
    updated_at: '2026-02-04T09:00:00Z',
  },
  {
    id: 'sol-004',
    filing_number: 'Radicado 2026-004',
    application_type_id: 'apt-008', // Informe de Avance Periódico
    applicant_id: 'usr-006', // Dr. Roberto Gómez
    title: 'Informe Semestral Técnico y Financiero Proyecto AgroTICs 2025-II',
    abstract:
      'Presentación de entregables e hitos cumplidos en el marco del proyecto de internet de las cosas en parcelas piloto campesinas.',
    research_group_id: 'grp-002', // G-SOF-02
    budget_requested: 0,
    current_status: 'APROBADA',
    is_tutor_endorsed: true,
    requires_committee: false,
    created_at: '2026-01-25T11:00:00Z',
    updated_at: '2026-01-30T17:00:00Z',
  },
];

export const INITIAL_DOCUMENTS: ApplicationDocument[] = [
  {
    id: 'doc-001',
    application_id: 'sol-001',
    requirement_id: 'req-001', // Formato Oficial de Propuesta
    file_name: 'Propuesta_Tecnica_Fitopatogenos_2026.pdf',
    file_path: 'file-service/storage/f962aac9a12b_propuesta_investigacion_prueba.pdf',
    file_size_bytes: 1450000,
    file_hash_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    mime_type: 'application/pdf',
    validation_status: 'PENDIENTE',
    validation_observations: null,
    validated_by: null,
    validated_at: null,
    uploaded_at: '2026-02-01T14:30:00Z',
  },
  {
    id: 'doc-002',
    application_id: 'sol-001',
    requirement_id: 'req-002', // Carta de Aval del Líder
    file_name: 'Carta_Aval_Lider_Grupo_Firmada.pdf',
    file_path: 'file-service/storage/carta_aval_grupo_firmada.pdf',
    file_size_bytes: 840000,
    file_hash_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    mime_type: 'application/pdf',
    validation_status: 'PENDIENTE',
    validation_observations: null,
    validated_by: null,
    validated_at: null,
    uploaded_at: '2026-02-01T14:32:00Z',
  },
  {
    id: 'doc-003',
    application_id: 'sol-002',
    requirement_id: 'req-004', // Justificación técnica modificación
    file_name: 'Justificacion_Tecnica_Reasignacion.pdf',
    file_path: 'file-service/storage/justificacion_reasignacion.pdf',
    file_size_bytes: 620000,
    file_hash_sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    mime_type: 'application/pdf',
    validation_status: 'RECHAZADO',
    validation_observations:
      'La tabla de cotizaciones no incluye el desglose de IVA ni el proveedor avalado. Se requiere cargar cotización formal actualizada.',
    validated_by: 'usr-002',
    validated_at: '2026-02-03T11:00:00Z',
    uploaded_at: '2026-02-02T10:15:00Z',
  },
];

export const INITIAL_AUDIT_HISTORY: AuditHistory[] = [
  {
    id: 'aud-001',
    application_id: 'sol-001',
    actor_id: 'usr-001',
    action: 'RADICACION_INICIAL',
    previous_status: null,
    new_status: 'RADICADA',
    details: {
      filing_number: 'Radicado 2026-001',
      title: 'Modelamiento de Redes Neuronales Profundas para Detección Temprana de Fitopatógenos en Cultivos Andinos',
      applicant_name: 'Dra. Carmen Lucía Morales',
      documents_count: 2,
    },
    created_at: '2026-02-01T14:30:00Z',
  },
  {
    id: 'aud-002',
    application_id: 'sol-002',
    actor_id: 'usr-001',
    action: 'RADICACION_INICIAL',
    previous_status: null,
    new_status: 'RADICADA',
    details: {
      filing_number: 'Radicado 2026-002',
      title: 'Reasignación de Rubro para Adquisición de Reactivos de Secuenciación Genómica',
      applicant_name: 'Dra. Carmen Lucía Morales',
      documents_count: 2,
    },
    created_at: '2026-02-02T10:15:00Z',
  },
  {
    id: 'aud-003',
    application_id: 'sol-002',
    actor_id: 'usr-002',
    action: 'VALIDACION_DOCUMENTAL_RECHAZADA',
    previous_status: 'RADICADA',
    new_status: 'PENDIENTE_DOCUMENTOS',
    details: {
      reason: 'Requisito subsanable rechazado: Justificación técnica y cotizaciones',
      rejected_documents: ['Justificacion_Tecnica_Reasignacion.pdf'],
    },
    created_at: '2026-02-03T11:00:00Z',
  },
  {
    id: 'aud-004',
    application_id: 'sol-003',
    actor_id: 'usr-001',
    action: 'RADICACION_INICIAL',
    previous_status: null,
    new_status: 'RADICADA',
    details: {
      filing_number: 'Radicado 2026-003',
      title: 'Ampliación de Plazo Fase Experimental en Bioensayos de Laboratorio',
      applicant_name: 'Dra. Carmen Lucía Morales',
      documents_count: 2,
    },
    created_at: '2026-02-02T16:00:00Z',
  },
  {
    id: 'aud-005',
    application_id: 'sol-003',
    actor_id: 'usr-002',
    action: 'VALIDACION_DOCUMENTAL_APROBADA',
    previous_status: 'RADICADA',
    new_status: 'EN_REVISION',
    details: {
      validated_all_mandatory: true,
      notes: '100% de los requisitos obligatorios verificados conformes a la norma.',
    },
    created_at: '2026-02-04T09:00:00Z',
  },
];

// Mutex / Lock atómico para generación concurrente de consecutivos ininterrumpidos (RF-08)
let filingSequenceLock = Promise.resolve();
const sequenceTracker: Record<number, number> = {};

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set, get) => ({
      applications: INITIAL_APPLICATIONS,
      documents: INITIAL_DOCUMENTS,
      auditHistory: INITIAL_AUDIT_HISTORY,
      isSubmitting: false,

      /**
       * Genera un número de radicado consecutivo ininterrumpido (RF-08).
       * Utiliza encadenamiento secuencial atómico con mutex para evitar colisiones
       * cuando dos o más radicaciones se realizan de forma simultánea.
       * Formato estandarizado: "Radicado YYYY-XXX" (e.g. "Radicado 2026-005").
       */
      generateNextFilingNumber: async (year?: number): Promise<string> => {
        const targetYear = year || new Date().getFullYear();

        // Encolamiento atómico mediante Promise chain
        const generateTask = filingSequenceLock.then(async () => {
          const currentApps = get().applications;

          // Buscar el consecutivo más alto existente para el año especificado
          const prefix = `Radicado ${targetYear}-`;
          let maxSequence = sequenceTracker[targetYear] || 0;

          for (const app of currentApps) {
            if (app.filing_number.startsWith(prefix)) {
              const numPart = app.filing_number.replace(prefix, '');
              const parsedNum = parseInt(numPart, 10);
              if (!isNaN(parsedNum) && parsedNum > maxSequence) {
                maxSequence = parsedNum;
              }
            }
          }

          const nextSequence = maxSequence + 1;
          sequenceTracker[targetYear] = nextSequence;

          const paddedNum = String(nextSequence).padStart(3, '0');
          return `${prefix}${paddedNum}`;
        });

        // Actualizar la referencia de lock
        filingSequenceLock = generateTask.then(() => {});
        return generateTask;
      },

      /**
       * Finaliza y registra una nueva solicitud formal de investigación (RF-07, RF-08, RF-09, RF-23).
       * - Valida requisitos obligatorios según catálogo.
       * - Asigna número consecutivo ininterrumpido.
       * - Estado inicial inmutable: 'RADICADA'.
       * - Vincula metadatos y hash SHA-256 de documentos.
       * - Registra el primer evento formal en la bitácora inmutable (audit_history).
       */
      createApplication: async (payload: CreateApplicationPayload) => {
        set({ isSubmitting: true });

        try {
          const catalog = useCatalogStore.getState();
          const targetType = catalog.types.find((t) => t.id === payload.application_type_id);

          if (!targetType) {
            set({ isSubmitting: false });
            return {
              success: false,
              error: `El tipo de solicitud especificado (${payload.application_type_id}) no existe en el catálogo institucional.`,
            };
          }

          // Obtener requisitos del tipo de trámite
          const typeRequirements = catalog.requirements.filter(
            (r) => r.application_type_id === payload.application_type_id
          );
          const mandatoryRequirements = typeRequirements.filter((r) => r.is_mandatory);

          // Verificar que se hayan cargado todos los requisitos obligatorios
          const uploadedReqIds = new Set(payload.documents.map((d) => d.requirement_id));
          const missingMandatory = mandatoryRequirements.filter((m) => !uploadedReqIds.has(m.id));

          if (missingMandatory.length > 0) {
            set({ isSubmitting: false });
            return {
              success: false,
              error: `Faltan requisitos obligatorios por adjuntar: ${missingMandatory.map((m) => `"${m.name}"`).join(', ')}.`,
            };
          }

          // Generar número consecutivo atómico
          const filingNumber = await get().generateNextFilingNumber();

          const nowIso = new Date().toISOString();
          const appId = `sol-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

          // 1. Crear el registro de la solicitud
          const newApplication: Application = {
            id: appId,
            filing_number: filingNumber,
            application_type_id: payload.application_type_id,
            applicant_id: payload.applicant_id,
            title: payload.title.trim(),
            abstract: payload.abstract.trim(),
            research_group_id: payload.research_group_id || null,
            budget_requested: payload.budget_requested || 0,
            current_status: 'RADICADA',
            is_tutor_endorsed: !!payload.is_tutor_endorsed,
            requires_committee: targetType.requires_committee,
            created_at: nowIso,
            updated_at: nowIso,
          };

          // 2. Crear los registros de documentos
          const newDocuments: ApplicationDocument[] = payload.documents.map((doc, idx) => ({
            id: `doc-${Date.now().toString(36)}-${idx}`,
            application_id: appId,
            requirement_id: doc.requirement_id,
            file_name: doc.file_name,
            file_path: doc.file_path,
            file_size_bytes: doc.file_size_bytes,
            file_hash_sha256: doc.file_hash_sha256,
            mime_type: doc.mime_type || 'application/pdf',
            validation_status: 'PENDIENTE',
            validation_observations: null,
            validated_by: null,
            validated_at: null,
            uploaded_at: nowIso,
          }));

          // 3. Crear el primer evento de bitácora inmutable (audit_history)
          const newAuditEvent: AuditHistory = {
            id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            application_id: appId,
            actor_id: payload.applicant_id,
            action: 'RADICACION_INICIAL',
            previous_status: null,
            new_status: 'RADICADA',
            details: {
              filing_number: filingNumber,
              title: newApplication.title,
              applicant_name: payload.applicant_name || 'Investigador(a)',
              documents_count: newDocuments.length,
              type_code: targetType.code,
              type_name: targetType.name,
              timestamp: nowIso,
            },
            created_at: nowIso,
          };

          // Actualizar estado local
          set((state) => ({
            applications: [newApplication, ...state.applications],
            documents: [...newDocuments, ...state.documents],
            auditHistory: [...state.auditHistory, newAuditEvent],
            isSubmitting: false,
          }));

          // Si Supabase está disponible, sincronizar en background
          const supabase = getSupabaseClient();
          if (supabase) {
            Promise.all([
              supabase.from('applications').insert([newApplication]),
              supabase.from('application_documents').insert(newDocuments),
              supabase.from('audit_history').insert([newAuditEvent]),
            ]).catch((err) => {
              console.warn('Sync en background con Supabase no completado:', err);
            });
          }

          return { success: true, application: newApplication };
        } catch (err: unknown) {
          set({ isSubmitting: false });
          const msg = err instanceof Error ? err.message : 'Error interno al radicar solicitud.';
          return { success: false, error: msg };
        }
      },

      /**
       * Permite a un investigador subsanar o recargar un documento
       */
      subsanarDocument: async (
        applicationId: string,
        requirementId: string,
        file: UploadedFilePayload,
        actorId: string,
        actorName: string
      ) => {
        const app = get().applications.find((a) => a.id === applicationId);
        if (!app) {
          return { success: false, error: 'Solicitud no encontrada.' };
        }

        const nowIso = new Date().toISOString();
        let targetDoc = get().documents.find(
          (d) => d.application_id === applicationId && d.requirement_id === requirementId
        );

        if (targetDoc) {
          targetDoc = {
            ...targetDoc,
            file_name: file.file_name,
            file_path: file.file_path,
            file_size_bytes: file.file_size_bytes,
            file_hash_sha256: file.file_hash_sha256,
            mime_type: file.mime_type,
            validation_status: 'PENDIENTE',
            validation_observations: null,
            validated_by: null,
            validated_at: null,
            uploaded_at: nowIso,
          };

          const newAudit: AuditHistory = {
            id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            application_id: applicationId,
            actor_id: actorId,
            action: 'SUBSANACION_DOCUMENTO',
            previous_status: app.current_status,
            new_status: app.current_status,
            details: {
              requirement_id: requirementId,
              file_name: file.file_name,
              file_hash_sha256: file.file_hash_sha256,
              actor_name: actorName,
              timestamp: nowIso,
            },
            created_at: nowIso,
          };

          set((state) => ({
            documents: state.documents.map((d) => (d.id === targetDoc!.id ? targetDoc! : d)),
            auditHistory: [...state.auditHistory, newAudit],
          }));

          return { success: true, document: targetDoc };
        }

        return { success: false, error: 'Requisito documental no encontrado en el expediente.' };
      },

      getApplicationById: (id: string) => {
        return get().applications.find((a) => a.id === id);
      },

      getApplicationsByApplicant: (applicantId: string) => {
        return get().applications.filter((a) => a.applicant_id === applicantId);
      },

      getDocumentsByApplication: (applicationId: string) => {
        return get().documents.filter((d) => d.application_id === applicationId);
      },

      getAuditHistoryByApplication: (applicationId: string) => {
        return get()
          .auditHistory.filter((a) => a.application_id === applicationId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      },

      /**
       * Calcula dinámicamente la columna institucional "Qué Falta" (RF-11)
       */
      computeQueFalta: (app: Application) => {
        switch (app.current_status) {
          case 'RADICADA':
            return 'En espera de validación documental administrativa';
          case 'PENDIENTE_DOCUMENTOS':
            return 'Cargar documentos subsanables rechazados';
          case 'EN_REVISION':
            return 'En evaluación técnica por revisor par';
          case 'LISTA_COMITE':
            return 'En agenda para deliberación en sesión de comité';
          case 'APROBADA':
            return 'Trámite finalizado exitosamente';
          case 'APROBADA_CON_AJUSTES':
            return 'Entregar ajustes menores concertados en acta';
          case 'RECHAZADA':
            return 'Solicitud rechazada';
          case 'CERRADA':
            return 'Expediente cerrado y archivado';
          default:
            return 'En trámite ordinario';
        }
      },

      resetToInitialSeed: () => {
        set({
          applications: INITIAL_APPLICATIONS,
          documents: INITIAL_DOCUMENTS,
          auditHistory: INITIAL_AUDIT_HISTORY,
        });
      },
    }),
    {
      name: 'seed_applications_store',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage;
        }
        if (
          typeof globalThis !== 'undefined' &&
          (globalThis as unknown as { localStorage: Storage }).localStorage
        ) {
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
