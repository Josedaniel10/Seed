import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Application,
  ApplicationDocument,
  AuditHistory,
  ApplicationDbStatus,
  DocumentValidationStatus,
  ReviewerAssignment,
  ReviewerConcept,
  Observation,
  ObservationCategory,
  Profile,
} from '../../types/database.ts';
import { useCatalogStore } from '../catalog/catalogStore.ts';
import { useUserStore } from '../users/userStore.ts';
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

export interface DeadlineInfo {
  deadlineDate: string | null;
  daysRemaining: number;
  isOverdue: boolean;
  isUrgent: boolean;
  description: string;
}

// Matriz estricta de transiciones de estados (T3.4 / RF-21)
export const ALLOWED_TRANSITIONS: Record<ApplicationDbStatus, ApplicationDbStatus[]> = {
  RADICADA: ['PENDIENTE_DOCUMENTOS', 'EN_REVISION', 'RECHAZADA'],
  PENDIENTE_DOCUMENTOS: ['EN_REVISION', 'RECHAZADA'],
  EN_REVISION: ['LISTA_COMITE', 'RECHAZADA', 'PENDIENTE_DOCUMENTOS'],
  LISTA_COMITE: ['APROBADA', 'APROBADA_CON_AJUSTES', 'RECHAZADA', 'CERRADA'],
  APROBADA_CON_AJUSTES: ['APROBADA', 'CERRADA'],
  APROBADA: ['CERRADA'],
  RECHAZADA: ['CERRADA'],
  CERRADA: [], // Estado final inmutable (RN-01)
};

export interface ApplicationState {
  applications: Application[];
  documents: ApplicationDocument[];
  auditHistory: AuditHistory[];
  assignments: ReviewerAssignment[];
  observations: Observation[];
  isSubmitting: boolean;

  // Acciones Sprint 2
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

  // Acciones Sprint 3: Validación Documental
  validateRequirementDocument: (
    applicationId: string,
    requirementId: string,
    status: DocumentValidationStatus,
    observations: string | null,
    validatedBy: string,
    validatedByName: string
  ) => Promise<{ success: boolean; document?: ApplicationDocument; error?: string }>;
  finalizeAdministrativeValidation: (
    applicationId: string,
    validatedBy: string,
    validatedByName: string
  ) => Promise<{ success: boolean; application?: Application; error?: string }>;

  // Acciones Sprint 3: Transición de Estados
  transitionApplicationStatus: (
    applicationId: string,
    newStatus: ApplicationDbStatus,
    actorId: string,
    actorName: string,
    reason?: string,
    details?: Record<string, unknown>
  ) => Promise<{ success: boolean; application?: Application; error?: string }>;

  // Acciones Sprint 3: Asignación de Revisores y Conflicto de Intereses
  checkReviewerConflict: (
    reviewerId: string,
    applicationId: string
  ) => { hasConflict: boolean; reason?: string };
  assignReviewer: (
    applicationId: string,
    reviewerId: string,
    deadlineDate: string,
    assignedBy: string,
    assignerName: string
  ) => Promise<{ success: boolean; assignment?: ReviewerAssignment; error?: string }>;
  getActiveAssignment: (applicationId: string) => ReviewerAssignment | undefined;
  getAssignmentsByReviewer: (reviewerId: string) => ReviewerAssignment[];

  // Acciones Sprint 3: Observaciones y Ajustes
  addTechnicalObservation: (
    applicationId: string,
    authorId: string,
    authorName: string,
    category: ObservationCategory,
    content: string
  ) => Promise<{ success: boolean; observation?: Observation; error?: string }>;
  respondToObservation: (
    observationId: string,
    applicantResponse: string,
    actorId: string,
    actorName: string
  ) => Promise<{ success: boolean; observation?: Observation; error?: string }>;
  getObservationsByApplication: (applicationId: string) => Observation[];

  // Acciones Sprint 3: Concepto Técnico
  submitReviewerConcept: (
    applicationId: string,
    reviewerId: string,
    reviewerName: string,
    concept: ReviewerConcept,
    justification: string
  ) => Promise<{ success: boolean; application?: Application; error?: string }>;

  // Acciones Sprint 3: Métricas y Plazos
  getStatusCounts: () => Record<ApplicationDbStatus, number>;
  getDeadlineStatus: (applicationId: string) => DeadlineInfo;

  // Inmutabilidad
  assertAuditHistoryImmutable: (recordId: string) => never;
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
  {
    id: 'sol-005',
    filing_number: 'Radicado 2026-005',
    application_type_id: 'apt-009', // Cierre
    applicant_id: 'usr-006',
    title: 'Cierre y Liquidación Proyecto Fitoquímica Avanzada',
    abstract: 'Informe final de actividades, publicación de 2 artículos indexados y balance contable.',
    research_group_id: 'grp-002',
    budget_requested: 0,
    current_status: 'LISTA_COMITE',
    is_tutor_endorsed: true,
    requires_committee: true,
    created_at: '2026-01-28T09:00:00Z',
    updated_at: '2026-02-03T15:00:00Z',
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
    requirement_id: 'req-002', // Presupuesto Detallado
    file_name: 'Presupuesto_Detallado_Fitopatogenos.xlsx',
    file_path: 'file-service/storage/presupuesto_fitopatogenos.xlsx',
    file_size_bytes: 350000,
    file_hash_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    mime_type: 'application/pdf',
    validation_status: 'PENDIENTE',
    validation_observations: null,
    validated_by: null,
    validated_at: null,
    uploaded_at: '2026-02-01T14:32:00Z',
  },
  {
    id: 'doc-002-b',
    application_id: 'sol-001',
    requirement_id: 'req-003', // Carta de Aval Líder
    file_name: 'Carta_Aval_Lider_Grupo_Firmada.pdf',
    file_path: 'file-service/storage/carta_aval_grupo_firmada.pdf',
    file_size_bytes: 840000,
    file_hash_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8b',
    mime_type: 'application/pdf',
    validation_status: 'PENDIENTE',
    validation_observations: null,
    validated_by: null,
    validated_at: null,
    uploaded_at: '2026-02-01T14:33:00Z',
  },
  {
    id: 'doc-002-c',
    application_id: 'sol-001',
    requirement_id: 'req-013', // Declaración Honestidad
    file_name: 'Declaracion_Honestidad_Originalidad.pdf',
    file_path: 'file-service/storage/declaracion_honestidad.pdf',
    file_size_bytes: 420000,
    file_hash_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8c',
    mime_type: 'application/pdf',
    validation_status: 'PENDIENTE',
    validation_observations: null,
    validated_by: null,
    validated_at: null,
    uploaded_at: '2026-02-01T14:34:00Z',
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
  {
    id: 'doc-004',
    application_id: 'sol-003',
    requirement_id: 'req-008', // Justificación de prórroga
    file_name: 'Justificacion_Prorroga_Bioensayos.pdf',
    file_path: 'file-service/storage/justificacion_prorroga.pdf',
    file_size_bytes: 520000,
    file_hash_sha256: '992d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe311',
    mime_type: 'application/pdf',
    validation_status: 'VALIDO',
    validation_observations: null,
    validated_by: 'usr-002',
    validated_at: '2026-02-04T09:00:00Z',
    uploaded_at: '2026-02-02T16:00:00Z',
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

export const INITIAL_ASSIGNMENTS: ReviewerAssignment[] = [
  {
    id: 'asg-001',
    application_id: 'sol-003',
    reviewer_id: 'usr-003', // Dr. Alejandro Restrepo (Ciencias Básicas)
    deadline_date: '2026-02-12',
    is_active: true,
    assigned_by: 'usr-004', // Secretaría Técnica
    concept: null,
    concept_date: null,
    created_at: '2026-02-04T09:30:00Z',
  },
  {
    id: 'asg-002',
    application_id: 'sol-005',
    reviewer_id: 'usr-003',
    deadline_date: '2026-02-02',
    is_active: true,
    assigned_by: 'usr-004',
    concept: 'FAVORABLE',
    concept_date: '2026-02-02T14:00:00Z',
    created_at: '2026-01-29T10:00:00Z',
  },
];

export const INITIAL_OBSERVATIONS: Observation[] = [
  {
    id: 'obs-001',
    application_id: 'sol-003',
    assignment_id: 'asg-001',
    author_id: 'usr-003', // Dr. Alejandro Restrepo
    category: 'SUGERENCIA',
    content: 'Se sugiere verificar que los nuevos plazos no traslapen con la temporada de lluvias en campo.',
    is_resolved: true,
    applicant_response: 'Se ajustó el plan de muestreo para evitar temporadas húmedas.',
    created_at: '2026-02-04T11:00:00Z',
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
      assignments: INITIAL_ASSIGNMENTS,
      observations: INITIAL_OBSERVATIONS,
      isSubmitting: false,

      generateNextFilingNumber: async (year?: number): Promise<string> => {
        const targetYear = year || new Date().getFullYear();

        const generateTask = filingSequenceLock.then(async () => {
          const currentApps = get().applications;
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

        filingSequenceLock = generateTask.then(() => {});
        return generateTask;
      },

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

          const typeRequirements = catalog.requirements.filter(
            (r) => r.application_type_id === payload.application_type_id
          );
          const mandatoryRequirements = typeRequirements.filter((r) => r.is_mandatory);

          const uploadedReqIds = new Set(payload.documents.map((d) => d.requirement_id));
          const missingMandatory = mandatoryRequirements.filter((m) => !uploadedReqIds.has(m.id));

          if (missingMandatory.length > 0) {
            set({ isSubmitting: false });
            return {
              success: false,
              error: `Faltan requisitos obligatorios por adjuntar: ${missingMandatory.map((m) => `"${m.name}"`).join(', ')}.`,
            };
          }

          const filingNumber = await get().generateNextFilingNumber();
          const nowIso = new Date().toISOString();
          const appId = `sol-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

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

          set((state) => ({
            applications: [newApplication, ...state.applications],
            documents: [...newDocuments, ...state.documents],
            auditHistory: [...state.auditHistory, newAuditEvent],
            isSubmitting: false,
          }));

          return { success: true, application: newApplication };
        } catch (err: unknown) {
          set({ isSubmitting: false });
          const msg = err instanceof Error ? err.message : 'Error interno al radicar solicitud.';
          return { success: false, error: msg };
        }
      },

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
        const targetDoc = get().documents.find(
          (d) => d.application_id === applicationId && d.requirement_id === requirementId
        );

        if (targetDoc) {
          const updatedDoc: ApplicationDocument = {
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
            documents: state.documents.map((d) => (d.id === targetDoc.id ? updatedDoc : d)),
            auditHistory: [...state.auditHistory, newAudit],
          }));

          return { success: true, document: updatedDoc };
        }

        return { success: false, error: 'Requisito documental no encontrado en el expediente.' };
      },

      // ==============================================================
      // SPRINT 3: VALIDACIÓN DOCUMENTAL (RF-12, RF-13, RF-14, RN-02, RN-11)
      // ==============================================================

      /**
       * Valida o rechaza un documento individual con motivo motivado por escrito (RF-13, RN-05)
       */
      validateRequirementDocument: async (
        applicationId: string,
        requirementId: string,
        status: DocumentValidationStatus,
        observations: string | null,
        validatedBy: string,
        validatedByName: string
      ) => {
        if (status === 'RECHAZADO' && (!observations || observations.trim().length === 0)) {
          return {
            success: false,
            error: 'Todo rechazo documental exige justificación motivada por escrito (RN-05, RF-13).',
          };
        }

        const nowIso = new Date().toISOString();
        const doc = get().documents.find(
          (d) => d.application_id === applicationId && d.requirement_id === requirementId
        );

        if (!doc) {
          return { success: false, error: 'Documento no encontrado en el expediente.' };
        }

        const updatedDoc: ApplicationDocument = {
          ...doc,
          validation_status: status,
          validation_observations: observations || null,
          validated_by: validatedBy,
          validated_at: nowIso,
        };

        const auditItem: AuditHistory = {
          id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          application_id: applicationId,
          actor_id: validatedBy,
          action: status === 'VALIDO' ? 'DOCUMENTO_VALIDADO' : 'DOCUMENTO_RECHAZADO',
          previous_status: null,
          new_status: null,
          details: {
            requirement_id: requirementId,
            file_name: doc.file_name,
            status,
            observations,
            validated_by_name: validatedByName,
            timestamp: nowIso,
          },
          created_at: nowIso,
        };

        set((state) => ({
          documents: state.documents.map((d) => (d.id === doc.id ? updatedDoc : d)),
          auditHistory: [...state.auditHistory, auditItem],
        }));

        return { success: true, document: updatedDoc };
      },

      /**
       * Finaliza la validación documental y transita automáticamente el estado (RF-14, RN-02, RN-11)
       * - Si falta o se rechaza un requisito NO subsanable -> Rechazo inmediato ('RECHAZADA').
       * - Si falta o se rechaza un requisito subsanable -> 'PENDIENTE_DOCUMENTOS'.
       * - Si el 100% de los requisitos obligatorios están conformes -> 'EN_REVISION'.
       */
      finalizeAdministrativeValidation: async (
        applicationId: string,
        validatedBy: string,
        validatedByName: string
      ) => {
        const app = get().applications.find((a) => a.id === applicationId);
        if (!app) {
          return { success: false, error: 'Solicitud no encontrada.' };
        }

        const catalog = useCatalogStore.getState();
        const typeReqs = catalog.requirements.filter(
          (r) => r.application_type_id === app.application_type_id
        );
        const mandatoryReqs = typeReqs.filter((r) => r.is_mandatory);
        const docs = get().documents.filter((d) => d.application_id === applicationId);

        // Evaluar requisitos obligatorios
        let hasRejectedNonSubsanable = false;
        let hasRejectedSubsanable = false;
        let missingMandatoryCount = 0;

        for (const req of mandatoryReqs) {
          const doc = docs.find((d) => d.requirement_id === req.id);
          if (!doc) {
            missingMandatoryCount++;
            if (!req.is_subsanable) hasRejectedNonSubsanable = true;
            else hasRejectedSubsanable = true;
          } else if (doc.validation_status === 'RECHAZADO') {
            if (!req.is_subsanable) hasRejectedNonSubsanable = true;
            else hasRejectedSubsanable = true;
          } else if (doc.validation_status === 'PENDIENTE') {
            return {
              success: false,
              error: `El requisito obligatorio "${req.name}" aún no ha sido dictaminado como Válido o Rechazado.`,
            };
          }
        }

        let targetStatus: ApplicationDbStatus;
        let transitionReason: string;

        if (hasRejectedNonSubsanable) {
          // RN-11: La falta de un requisito no subsanable causa rechazo inmediato en validación
          targetStatus = 'RECHAZADA';
          transitionReason =
            'Rechazo directo en validación: Requisito esencial no subsanable insatisfecho o rechazado (RN-11).';
        } else if (hasRejectedSubsanable || missingMandatoryCount > 0) {
          // RN-11: La falta de un requisito subsanable pasa a PENDIENTE_DOCUMENTOS con plazo
          targetStatus = 'PENDIENTE_DOCUMENTOS';
          transitionReason =
            'Pendiente por documentos: Se detectaron inconsistencias en requisitos subsanables. Plazo de 5 días hábiles otorgado.';
        } else {
          // RN-02: Solo pasa a En revisión si el 100% de los requisitos obligatorios están marcados como válidos
          targetStatus = 'EN_REVISION';
          transitionReason =
            '100% de los requisitos obligatorios verificados conformes a la normativa. Expediente habilitado para evaluación técnica.';
        }

        return get().transitionApplicationStatus(
          applicationId,
          targetStatus,
          validatedBy,
          validatedByName,
          transitionReason,
          {
            validation_type: 'ADMINISTRATIVA_DOCUMENTAL',
            mandatory_total: mandatoryReqs.length,
            mandatory_valid: docs.filter((d) => d.validation_status === 'VALIDO').length,
          }
        );
      },

      // ==============================================================
      // SPRINT 3: TRANSICIÓN REGLAMENTARIA DE ESTADOS (RF-21, RN-01, RN-05)
      // ==============================================================

      /**
       * Función de transición reglamentaria con validación de matriz de estados (RF-21)
       */
      transitionApplicationStatus: async (
        applicationId: string,
        newStatus: ApplicationDbStatus,
        actorId: string,
        actorName: string,
        reason?: string,
        details?: Record<string, unknown>
      ) => {
        const app = get().applications.find((a) => a.id === applicationId);
        if (!app) {
          return { success: false, error: 'Solicitud no encontrada.' };
        }

        const currentStatus = app.current_status;

        // Validar si el estado actual es final
        if (currentStatus === 'CERRADA') {
          return {
            success: false,
            error: 'RN-01: El expediente se encuentra en estado CERRADA (estado final inmutable). No se admiten transiciones.',
          };
        }

        // Validar salto en la matriz reglamentaria
        const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
        if (!allowedNext.includes(newStatus)) {
          return {
            success: false,
            error: `RF-21: Transición no permitida de "${currentStatus}" hacia "${newStatus}". Estados válidos: [${allowedNext.join(', ')}].`,
          };
        }

        // RN-05: Toda decisión de rechazo o aprobación con ajustes exige justificación motivada
        if ((newStatus === 'RECHAZADA' || newStatus === 'APROBADA_CON_AJUSTES') && (!reason || reason.trim().length === 0)) {
          return {
            success: false,
            error: `RN-05: La transición al estado "${newStatus}" exige una justificación motivada por escrito.`,
          };
        }

        // RN-02: Solo pasa a En revisión si el 100% de los requisitos obligatorios son válidos
        if (newStatus === 'EN_REVISION') {
          const catalog = useCatalogStore.getState();
          const mandatoryReqs = catalog.requirements.filter(
            (r) => r.application_type_id === app.application_type_id && r.is_mandatory
          );
          const docs = get().documents.filter((d) => d.application_id === applicationId);
          const validReqIds = new Set(
            docs.filter((d) => d.validation_status === 'VALIDO').map((d) => d.requirement_id)
          );
          const missingOrInvalid = mandatoryReqs.filter((m) => !validReqIds.has(m.id));

          if (missingOrInvalid.length > 0) {
            return {
              success: false,
              error: `RN-02: No es posible transitar a "En revisión" porque faltan requisitos obligatorios válidos: ${missingOrInvalid.map((m) => m.name).join(', ')}.`,
            };
          }
        }

        const nowIso = new Date().toISOString();
        const updatedApp: Application = {
          ...app,
          current_status: newStatus,
          updated_at: nowIso,
        };

        const auditItem: AuditHistory = {
          id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          application_id: applicationId,
          actor_id: actorId,
          action: `TRANSICION_ESTADO_${newStatus}`,
          previous_status: currentStatus,
          new_status: newStatus,
          details: {
            actor_name: actorName,
            reason: reason || null,
            ...(details || {}),
            timestamp: nowIso,
          },
          created_at: nowIso,
        };

        set((state) => ({
          applications: state.applications.map((a) => (a.id === applicationId ? updatedApp : a)),
          auditHistory: [...state.auditHistory, auditItem],
        }));

        return { success: true, application: updatedApp };
      },

      // ==============================================================
      // SPRINT 3: ASIGNACIÓN DE EVALUADOR Y CONFLICTO DE INTERESES (RF-15, RN-03, RN-14)
      // ==============================================================

      /**
       * Valida conflicto de intereses ampliado (RN-03, RN-14):
       * 1. Un evaluador no puede evaluar su propia solicitud radicada.
       * 2. Un evaluador no puede evaluar solicitudes de su mismo grupo de investigación.
       */
      checkReviewerConflict: (reviewerId: string, applicationId: string) => {
        const app = get().applications.find((a) => a.id === applicationId);
        if (!app) return { hasConflict: true, reason: 'Solicitud no encontrada.' };

        const usersStore = useUserStore.getState();
        const reviewer = usersStore.users.find((u) => u.id === reviewerId);
        if (!reviewer) return { hasConflict: true, reason: 'Evaluador no registrado.' };

        // RN-03: No puede evaluar su propia solicitud
        if (reviewer.id === app.applicant_id) {
          return {
            hasConflict: true,
            reason: 'RN-03: Conflicto de intereses directo. El evaluador es el autor solicitante del trámite.',
          };
        }

        // RN-14: No puede evaluar a miembros de su mismo grupo de investigación
        if (reviewer.research_group_id && app.research_group_id) {
          if (reviewer.research_group_id === app.research_group_id) {
            return {
              hasConflict: true,
              reason: 'RN-14: Inhabilidad por conflicto de intereses. El evaluador pertenece al mismo grupo de investigación adscrito a la solicitud.',
            };
          }
        }

        return { hasConflict: false };
      },

      /**
       * Asigna o reasigna un evaluador par preservando el historial inactivo (RF-15, RF-16, RN-08)
       */
      assignReviewer: async (
        applicationId: string,
        reviewerId: string,
        deadlineDate: string,
        assignedBy: string,
        assignerName: string
      ) => {
        const conflict = get().checkReviewerConflict(reviewerId, applicationId);
        if (conflict.hasConflict) {
          return { success: false, error: conflict.reason };
        }

        const app = get().applications.find((a) => a.id === applicationId);
        if (!app) return { success: false, error: 'Solicitud no encontrada.' };

        const nowIso = new Date().toISOString();
        const reviewerUser = useUserStore.getState().users.find((u) => u.id === reviewerId);
        const reviewerName = reviewerUser?.full_name || 'Evaluador Par';

        // RN-08: Reasignar conserva las asignaciones anteriores marcadas como inactivas
        const existingAssignments = get().assignments.filter(
          (asg) => asg.application_id === applicationId && asg.is_active
        );

        const updatedAssignments = get().assignments.map((asg) => {
          if (asg.application_id === applicationId && asg.is_active) {
            return { ...asg, is_active: false };
          }
          return asg;
        });

        const newAssignment: ReviewerAssignment = {
          id: `asg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          application_id: applicationId,
          reviewer_id: reviewerId,
          deadline_date: deadlineDate,
          is_active: true,
          assigned_by: assignedBy,
          concept: null,
          concept_date: null,
          created_at: nowIso,
        };

        const auditItem: AuditHistory = {
          id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          application_id: applicationId,
          actor_id: assignedBy,
          action: existingAssignments.length > 0 ? 'REASIGNACION_EVALUADOR' : 'ASIGNACION_EVALUADOR',
          previous_status: null,
          new_status: null,
          details: {
            reviewer_id: reviewerId,
            reviewer_name: reviewerName,
            assigner_name: assignerName,
            deadline_date: deadlineDate,
            previous_deactivated_count: existingAssignments.length,
            timestamp: nowIso,
          },
          created_at: nowIso,
        };

        set((state) => ({
          assignments: [...updatedAssignments, newAssignment],
          auditHistory: [...state.auditHistory, auditItem],
        }));

        return { success: true, assignment: newAssignment };
      },

      getActiveAssignment: (applicationId: string) => {
        return get().assignments.find((asg) => asg.application_id === applicationId && asg.is_active);
      },

      getAssignmentsByReviewer: (reviewerId: string) => {
        return get().assignments.filter((asg) => asg.reviewer_id === reviewerId && asg.is_active);
      },

      // ==============================================================
      // SPRINT 3: OBSERVACIONES TÉCNICAS Y AJUSTES (RF-17, RF-18)
      // ==============================================================

      addTechnicalObservation: async (
        applicationId: string,
        authorId: string,
        authorName: string,
        category: ObservationCategory,
        content: string
      ) => {
        if (!content || content.trim().length === 0) {
          return { success: false, error: 'El contenido de la observación no puede estar vacío.' };
        }

        const nowIso = new Date().toISOString();
        const activeAssignment = get().getActiveAssignment(applicationId);

        const newObs: Observation = {
          id: `obs-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          application_id: applicationId,
          assignment_id: activeAssignment?.id || null,
          author_id: authorId,
          category,
          content: content.trim(),
          is_resolved: false,
          applicant_response: null,
          created_at: nowIso,
        };

        const auditItem: AuditHistory = {
          id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          application_id: applicationId,
          actor_id: authorId,
          action: 'OBSERVACION_TECNICA_REGISTRADA',
          previous_status: null,
          new_status: null,
          details: {
            category,
            author_name: authorName,
            content_snippet: content.substring(0, 100),
            timestamp: nowIso,
          },
          created_at: nowIso,
        };

        set((state) => ({
          observations: [...state.observations, newObs],
          auditHistory: [...state.auditHistory, auditItem],
        }));

        return { success: true, observation: newObs };
      },

      respondToObservation: async (
        observationId: string,
        applicantResponse: string,
        actorId: string,
        actorName: string
      ) => {
        if (!applicantResponse || applicantResponse.trim().length === 0) {
          return { success: false, error: 'La respuesta al ajuste no puede estar vacía.' };
        }

        const obs = get().observations.find((o) => o.id === observationId);
        if (!obs) return { success: false, error: 'Observación no encontrada.' };

        const nowIso = new Date().toISOString();
        const updatedObs: Observation = {
          ...obs,
          applicant_response: applicantResponse.trim(),
          is_resolved: true,
        };

        const auditItem: AuditHistory = {
          id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          application_id: obs.application_id,
          actor_id: actorId,
          action: 'RESPUESTA_AJUSTES_INVESTIGADOR',
          previous_status: null,
          new_status: null,
          details: {
            observation_id: observationId,
            actor_name: actorName,
            response_snippet: applicantResponse.substring(0, 100),
            timestamp: nowIso,
          },
          created_at: nowIso,
        };

        set((state) => ({
          observations: state.observations.map((o) => (o.id === observationId ? updatedObs : o)),
          auditHistory: [...state.auditHistory, auditItem],
        }));

        return { success: true, observation: updatedObs };
      },

      getObservationsByApplication: (applicationId: string) => {
        return get().observations.filter((o) => o.application_id === applicationId);
      },

      // ==============================================================
      // SPRINT 3: CONCEPTO TÉCNICO Y PASE A LISTA PARA COMITÉ (RF-19, RF-20)
      // ==============================================================

      submitReviewerConcept: async (
        applicationId: string,
        reviewerId: string,
        reviewerName: string,
        concept: ReviewerConcept,
        justification: string
      ) => {
        if (!justification || justification.trim().length === 0) {
          return {
            success: false,
            error: 'RN-05: La emisión de concepto técnico exige fundamentación y justificación escrita.',
          };
        }

        const app = get().applications.find((a) => a.id === applicationId);
        if (!app) return { success: false, error: 'Solicitud no encontrada.' };

        const activeAsg = get().getActiveAssignment(applicationId);
        if (!activeAsg || activeAsg.reviewer_id !== reviewerId) {
          return {
            success: false,
            error: 'El evaluador no tiene una asignación activa sobre esta solicitud.',
          };
        }

        const nowIso = new Date().toISOString();
        const updatedAsg: ReviewerAssignment = {
          ...activeAsg,
          concept,
          concept_date: nowIso,
        };

        // Reglas RF-19 y RF-20:
        // Favorable o Favorable con ajustes -> Pasa a LISTA_COMITE
        // No favorable -> Pasa a RECHAZADA
        let targetStatus: ApplicationDbStatus;
        if (concept === 'FAVORABLE' || concept === 'FAVORABLE_CON_AJUSTES') {
          targetStatus = 'LISTA_COMITE';
        } else {
          targetStatus = 'RECHAZADA';
        }

        set((state) => ({
          assignments: state.assignments.map((a) => (a.id === activeAsg.id ? updatedAsg : a)),
        }));

        return get().transitionApplicationStatus(
          applicationId,
          targetStatus,
          reviewerId,
          reviewerName,
          `Emisión de concepto técnico: ${concept}. Justificación: ${justification}`,
          {
            reviewer_concept: concept,
            concept_date: nowIso,
          }
        );
      },

      // ==============================================================
      // SPRINT 3: MÉTRICAS Y PLAZOS (RF-22, RF-35)
      // ==============================================================

      getStatusCounts: () => {
        const apps = get().applications;
        const counts: Record<ApplicationDbStatus, number> = {
          RADICADA: 0,
          PENDIENTE_DOCUMENTOS: 0,
          EN_REVISION: 0,
          LISTA_COMITE: 0,
          APROBADA: 0,
          APROBADA_CON_AJUSTES: 0,
          RECHAZADA: 0,
          CERRADA: 0,
        };

        for (const app of apps) {
          if (counts[app.current_status] !== undefined) {
            counts[app.current_status]++;
          }
        }

        return counts;
      },

      getDeadlineStatus: (applicationId: string) => {
        const app = get().applications.find((a) => a.id === applicationId);
        if (!app) {
          return {
            deadlineDate: null,
            daysRemaining: 0,
            isOverdue: false,
            isUrgent: false,
            description: 'No asignado',
          };
        }

        const activeAsg = get().getActiveAssignment(applicationId);
        const now = new Date();

        if (app.current_status === 'EN_REVISION' && activeAsg?.deadline_date) {
          const deadline = new Date(activeAsg.deadline_date);
          const diffTime = deadline.getTime() - now.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const isOverdue = daysRemaining < 0;
          const isUrgent = daysRemaining >= 0 && daysRemaining <= 3;

          return {
            deadlineDate: activeAsg.deadline_date,
            daysRemaining,
            isOverdue,
            isUrgent,
            description: isOverdue
              ? `Plazo vencido hace ${Math.abs(daysRemaining)} días`
              : `${daysRemaining} días restantes para concepto técnico`,
          };
        }

        if (app.current_status === 'PENDIENTE_DOCUMENTOS') {
          return {
            deadlineDate: null,
            daysRemaining: 5,
            isOverdue: false,
            isUrgent: true,
            description: '5 días hábiles reglamentarios para subsanar requisitos (RN-11)',
          };
        }

        if (app.current_status === 'RADICADA') {
          return {
            deadlineDate: null,
            daysRemaining: 3,
            isOverdue: false,
            isUrgent: false,
            description: '3 días hábiles para validación administrativa inicial',
          };
        }

        return {
          deadlineDate: null,
          daysRemaining: 0,
          isOverdue: false,
          isUrgent: false,
          description: 'En curso ordinario',
        };
      },

      // T3.5 / RNF-03: Inmutabilidad estricta de la bitácora
      assertAuditHistoryImmutable: (recordId: string) => {
        throw new Error(
          `RNF-03: Operación denegada. La bitácora de auditoría e historial (registro ${recordId}) es estrictamente inmutable y append-only.`
        );
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

      computeQueFalta: (app: Application) => {
        switch (app.current_status) {
          case 'RADICADA':
            return 'En espera de validación documental administrativa';
          case 'PENDIENTE_DOCUMENTOS':
            return 'Cargar documentos subsanables rechazados';
          case 'EN_REVISION':
            return 'En evaluación técnica por revisor par asignado';
          case 'LISTA_COMITE':
            return 'En agenda para deliberación en sesión de comité';
          case 'APROBADA':
            return 'Trámite finalizado exitosamente';
          case 'APROBADA_CON_AJUSTES':
            return 'Entregar ajustes menores concertados en sesión';
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
          assignments: INITIAL_ASSIGNMENTS,
          observations: INITIAL_OBSERVATIONS,
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
