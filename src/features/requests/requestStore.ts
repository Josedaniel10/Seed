import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Request,
  RequestDocument,
  AuditHistory,
  RequestDbStatus,
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
import { createUuid } from '../../lib/uuid.ts';

export interface UploadedFilePayload {
  requirement_id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  file_hash_sha256: string;
  mime_type: string;
  file_base64?: string;
}

export interface CreateRequestPayload {
  submission_id?: string;
  request_type_id: string;
  application_type_id?: string; // Legacy alias
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

export type CreateApplicationPayload = CreateRequestPayload;

interface FiledApplication {
  application: Omit<Request, 'request_type_id'> & { application_type_id: string };
  documents: Omit<RequestDocument, 'request_id'>[];
  audit: Omit<AuditHistory, 'request_id'>;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export interface DeadlineInfo {
  deadlineDate: string | null;
  daysRemaining: number;
  isOverdue: boolean;
  isUrgent: boolean;
  description: string;
}

// Strict regulatory state transitions matrix (T3.4 / RF-21)
export const ALLOWED_REQUEST_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['PENDING_DOCUMENTS', 'UNDER_REVIEW', 'REJECTED', 'PENDIENTE_DOCUMENTOS', 'EN_REVISION', 'RECHAZADA'],
  RADICADA: ['PENDING_DOCUMENTS', 'UNDER_REVIEW', 'REJECTED', 'PENDIENTE_DOCUMENTOS', 'EN_REVISION', 'RECHAZADA'],
  PENDING_DOCUMENTS: ['UNDER_REVIEW', 'REJECTED', 'EN_REVISION', 'RECHAZADA'],
  PENDIENTE_DOCUMENTOS: ['UNDER_REVIEW', 'REJECTED', 'EN_REVISION', 'RECHAZADA'],
  UNDER_REVIEW: ['COMMITTEE_READY', 'REJECTED', 'PENDING_DOCUMENTS', 'LISTA_COMITE', 'RECHAZADA', 'PENDIENTE_DOCUMENTOS'],
  EN_REVISION: ['COMMITTEE_READY', 'REJECTED', 'PENDING_DOCUMENTS', 'LISTA_COMITE', 'RECHAZADA', 'PENDIENTE_DOCUMENTOS'],
  COMMITTEE_READY: ['APPROVED', 'APPROVED_WITH_ADJUSTMENTS', 'REJECTED', 'CLOSED', 'APROBADA', 'APROBADA_CON_AJUSTES', 'RECHAZADA', 'CERRADA'],
  LISTA_COMITE: ['APPROVED', 'APPROVED_WITH_ADJUSTMENTS', 'REJECTED', 'CLOSED', 'APROBADA', 'APROBADA_CON_AJUSTES', 'RECHAZADA', 'CERRADA'],
  APPROVED_WITH_ADJUSTMENTS: ['APPROVED', 'CLOSED', 'APROBADA', 'CERRADA'],
  APROBADA_CON_AJUSTES: ['APPROVED', 'CLOSED', 'APROBADA', 'CERRADA'],
  APPROVED: ['CLOSED', 'CERRADA'],
  APROBADA: ['CLOSED', 'CERRADA'],
  REJECTED: ['CLOSED', 'CERRADA'],
  RECHAZADA: ['CLOSED', 'CERRADA'],
  CLOSED: [],
  CERRADA: [],
};

export const ALLOWED_TRANSITIONS = ALLOWED_REQUEST_TRANSITIONS;

export interface RequestState {
  requests: Request[];
  documents: RequestDocument[];
  auditHistory: AuditHistory[];
  assignments: ReviewerAssignment[];
  observations: Observation[];
  isSubmitting: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Supabase synchronization
  loadFromSupabase: () => Promise<{ success: boolean; count?: number; error?: string }>;
  syncWithSupabase: () => Promise<{ success: boolean; count?: number; error?: string }>;

  // Actions
  generateNextFilingNumber: (year?: number) => Promise<string>;
  createRequest: (
    payload: CreateRequestPayload
  ) => Promise<{ success: boolean; request?: Request; application?: Request; error?: string; warning?: string }>;
  createApplication: (
    payload: CreateRequestPayload
  ) => Promise<{ success: boolean; request?: Request; application?: Request; error?: string; warning?: string }>;
  getRequestById: (id: string) => Request | undefined;
  getApplicationById: (id: string) => Request | undefined;
  getRequestsByApplicant: (applicantId: string) => Request[];
  getApplicationsByApplicant: (applicantId: string) => Request[];
  getDocumentsByRequest: (requestId: string) => RequestDocument[];
  getDocumentsByApplication: (applicationId: string) => RequestDocument[];
  getAuditHistoryByRequest: (requestId: string) => AuditHistory[];
  getAuditHistoryByApplication: (applicationId: string) => AuditHistory[];
  cureDocument: (
    requestId: string,
    requirementId: string,
    file: UploadedFilePayload,
    actorId: string,
    actorName: string
  ) => Promise<{ success: boolean; document?: RequestDocument; error?: string }>;
  subsanarDocument: (
    applicationId: string,
    requirementId: string,
    file: UploadedFilePayload,
    actorId: string,
    actorName: string
  ) => Promise<{ success: boolean; document?: RequestDocument; error?: string }>;
  computePendingRequirements: (req: Request) => string;
  computeQueFalta: (req: Request) => string;

  // Validation
  validateRequirementDocument: (
    requestId: string,
    requirementId: string,
    status: DocumentValidationStatus,
    observations: string | null,
    validatedBy: string,
    validatedByName: string
  ) => Promise<{ success: boolean; document?: RequestDocument; error?: string }>;
  finalizeAdministrativeValidation: (
    requestId: string,
    validatedBy: string,
    validatedByName: string
  ) => Promise<{ success: boolean; request?: Request; application?: Request; error?: string }>;

  // State Transitions
  transitionRequestStatus: (
    requestId: string,
    newStatus: RequestDbStatus,
    actorId: string,
    actorName: string,
    reason?: string,
    details?: Record<string, unknown>
  ) => Promise<{ success: boolean; request?: Request; application?: Request; error?: string }>;
  transitionApplicationStatus: (
    applicationId: string,
    newStatus: RequestDbStatus,
    actorId: string,
    actorName: string,
    reason?: string,
    details?: Record<string, unknown>
  ) => Promise<{ success: boolean; request?: Request; application?: Request; error?: string }>;

  // Reviewers & Conflicts
  checkReviewerConflict: (
    reviewerId: string,
    requestId: string
  ) => { hasConflict: boolean; reason?: string };
  assignReviewer: (
    requestId: string,
    reviewerId: string,
    deadlineDate: string,
    assignedBy: string,
    assignerName: string
  ) => Promise<{ success: boolean; assignment?: ReviewerAssignment; error?: string }>;
  getActiveAssignment: (requestId: string) => ReviewerAssignment | undefined;
  getAssignmentsByReviewer: (reviewerId: string) => ReviewerAssignment[];

  // Observations
  addTechnicalObservation: (
    requestId: string,
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
  getObservationsByRequest: (requestId: string) => Observation[];
  getObservationsByApplication: (applicationId: string) => Observation[];

  // Technical Concept
  submitReviewerConcept: (
    requestId: string,
    reviewerId: string,
    reviewerName: string,
    concept: ReviewerConcept,
    justification: string
  ) => Promise<{ success: boolean; request?: Request; application?: Request; error?: string }>;

  // Metrics & Deadlines
  getStatusCounts: () => Record<string, number>;
  getDeadlineStatus: (requestId: string) => DeadlineInfo;

  // Immutability
  assertAuditHistoryImmutable: (recordId: string) => never;
  resetToInitialSeed: () => void;
}

export const INITIAL_REQUESTS: Request[] = [
  {
    id: 'sol-001',
    filing_number: 'Radicado 2026-001',
    request_type_id: 'apt-001',
    application_type_id: 'apt-001',
    applicant_id: 'usr-001',
    title: 'Modelamiento de Redes Neuronales Profundas para Detección Temprana de Fitopatógenos en Cultivos Andinos',
    abstract:
      'Diseño y entrenamiento de modelos convolucionales de visión artificial para la identificación temprana de hongos y patógenos foliares en cultivos andinos, integrando dispositivos edge computing de bajo costo.',
    research_group_id: 'grp-001',
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
    request_type_id: 'apt-002',
    application_type_id: 'apt-002',
    applicant_id: 'usr-001',
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
    request_type_id: 'apt-004',
    application_type_id: 'apt-004',
    applicant_id: 'usr-001',
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
    request_type_id: 'apt-008',
    application_type_id: 'apt-008',
    applicant_id: 'usr-006',
    title: 'Informe Semestral Técnico y Financiero Proyecto AgroTICs 2025-II',
    abstract:
      'Presentación de entregables e hitos cumplidos en el marco del proyecto de internet de las cosas en parcelas piloto campesinas.',
    research_group_id: 'grp-002',
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
    request_type_id: 'apt-009',
    application_type_id: 'apt-009',
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

export const INITIAL_DOCUMENTS: RequestDocument[] = [
  {
    id: 'doc-001',
    request_id: 'sol-001',
    application_id: 'sol-001',
    requirement_id: 'req-001',
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
    request_id: 'sol-001',
    application_id: 'sol-001',
    requirement_id: 'req-002',
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
    request_id: 'sol-001',
    application_id: 'sol-001',
    requirement_id: 'req-003',
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
    request_id: 'sol-001',
    application_id: 'sol-001',
    requirement_id: 'req-013',
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
    request_id: 'sol-002',
    application_id: 'sol-002',
    requirement_id: 'req-004',
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
    request_id: 'sol-003',
    application_id: 'sol-003',
    requirement_id: 'req-008',
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
    request_id: 'sol-001',
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
    request_id: 'sol-002',
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
    request_id: 'sol-002',
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
    request_id: 'sol-003',
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
    request_id: 'sol-003',
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
    request_id: 'sol-003',
    application_id: 'sol-003',
    reviewer_id: 'usr-003',
    deadline_date: '2026-02-12',
    is_active: true,
    assigned_by: 'usr-004',
    concept: null,
    concept_date: null,
    created_at: '2026-02-04T09:30:00Z',
  },
  {
    id: 'asg-002',
    request_id: 'sol-005',
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
    request_id: 'sol-003',
    application_id: 'sol-003',
    assignment_id: 'asg-001',
    author_id: 'usr-003',
    category: 'SUGERENCIA',
    content: 'Se sugiere verificar que los nuevos plazos no traslapen con la temporada de lluvias en campo.',
    is_resolved: true,
    applicant_response: 'Se ajustó el plan de muestreo para evitar temporadas húmedas.',
    created_at: '2026-02-04T11:00:00Z',
  },
];

let filingSequenceLock = Promise.resolve();
const sequenceTracker: Record<number, number> = {};

export const useRequestStore = create<RequestState>()(
  persist(
    (set, get) => ({
      requests: INITIAL_REQUESTS,
      documents: INITIAL_DOCUMENTS,
      auditHistory: INITIAL_AUDIT_HISTORY,
      assignments: INITIAL_ASSIGNMENTS,
      observations: INITIAL_OBSERVATIONS,
      isSubmitting: false,
      isLoading: false,
      isInitialized: false,

      generateNextFilingNumber: async (year?: number): Promise<string> => {
        const targetYear = year || new Date().getFullYear();

        const generateTask = filingSequenceLock.then(async () => {
          const currentRequests = get().requests;
          const prefix = `Radicado ${targetYear}-`;
          let maxSequence = sequenceTracker[targetYear] || 0;

          for (const req of currentRequests) {
            if (req.filing_number.startsWith(prefix)) {
              const numPart = req.filing_number.replace(prefix, '');
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

      createRequest: async (payload: CreateRequestPayload) => {
        set({ isSubmitting: true });

        try {
          const typeId = payload.request_type_id || payload.application_type_id || '';
          const client = getSupabaseClient();
          const reqId = payload.submission_id ?? createUuid();

          if (client) {
            if (!isUuid(typeId) || (payload.research_group_id && !isUuid(payload.research_group_id))) {
              return {
                success: false,
                error: 'El tipo de solicitud o el grupo seleccionado no corresponde al catálogo de Supabase. Actualice la página e intente nuevamente.',
              };
            }

            const { data, error } = await client.rpc('file_application', {
              p_id: reqId,
              p_applicant_id: payload.applicant_id,
              p_type_id: typeId,
              p_title: payload.title,
              p_abstract: payload.abstract,
              p_group_id: payload.research_group_id || null,
              p_budget: payload.budget_requested ?? 0,
              p_tutor_endorsed: !!payload.is_tutor_endorsed,
              p_documents: payload.documents.map(({
                requirement_id, file_name, file_path, file_size_bytes, file_hash_sha256, mime_type,
              }) => ({
                requirement_id, file_name, file_path, file_size_bytes, file_hash_sha256,
                mime_type: mime_type || 'application/pdf',
              })),
            }).overrideTypes<FiledApplication, { merge: false }>();

            if (error || !data || typeof data !== 'object' || !('application' in data)) {
              return {
                success: false,
                error: `No se pudo confirmar la radicación en Supabase: ${error?.message ?? 'respuesta inválida'}`,
              };
            }

            const request = { ...data.application, request_type_id: data.application.application_type_id };
            set((state) => ({
              requests: [request, ...state.requests.filter((item) => item.id !== reqId)],
              documents: [
                ...data.documents.map((document) => ({ ...document, request_id: reqId })),
                ...state.documents.filter((item) => item.application_id !== reqId),
              ],
              auditHistory: [
                ...state.auditHistory.filter((item) => item.id !== data.audit.id),
                { ...data.audit, request_id: reqId },
              ],
            }));
            return { success: true, request, application: request };
          }

          const catalog = useCatalogStore.getState();
          const targetType = catalog.types.find((t) => t.id === typeId);

          if (!targetType) {
            return {
              success: false,
              error: `El tipo de solicitud especificado (${typeId}) no existe en el catálogo institucional.`,
            };
          }

          const typeRequirements = catalog.requirements.filter(
            (r) => (r.request_type_id || r.application_type_id) === typeId
          );
          const mandatoryRequirements = typeRequirements.filter((r) => r.is_mandatory);

          const uploadedReqIds = new Set(payload.documents.map((d) => d.requirement_id));
          const missingMandatory = mandatoryRequirements.filter((m) => !uploadedReqIds.has(m.id));

          if (missingMandatory.length > 0) {
            return {
              success: false,
              error: `Faltan requisitos obligatorios por adjuntar: ${missingMandatory.map((m) => `"${m.name}"`).join(', ')}.`,
            };
          }

          const filingNumber = await get().generateNextFilingNumber();
          const nowIso = new Date().toISOString();

          const newRequest: Request = {
            id: reqId,
            filing_number: filingNumber,
            request_type_id: typeId,
            application_type_id: typeId,
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

          const newDocuments: RequestDocument[] = payload.documents.map((doc) => ({
            id: createUuid(),
            request_id: reqId,
            application_id: reqId,
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
            id: createUuid(),
            request_id: reqId,
            application_id: reqId,
            actor_id: payload.applicant_id,
            action: 'RADICACION_INICIAL',
            previous_status: null,
            new_status: 'RADICADA',
            details: {
              filing_number: filingNumber,
              title: newRequest.title,
              applicant_name: payload.applicant_name || 'Investigador(a)',
              documents_count: newDocuments.length,
              type_code: targetType.code,
              type_name: targetType.name,
              timestamp: nowIso,
            },
            created_at: nowIso,
          };

          set((state) => ({
            requests: [newRequest, ...state.requests],
            documents: [...newDocuments, ...state.documents],
            auditHistory: [...state.auditHistory, newAuditEvent],
          }));

          return {
            success: true,
            request: newRequest,
            application: newRequest,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error interno al radicar solicitud.';
          return { success: false, error: msg };
        } finally {
          set({ isSubmitting: false });
        }
      },

      createApplication: async (payload: CreateRequestPayload) => {
        return get().createRequest(payload);
      },

      cureDocument: async (
        requestId: string,
        requirementId: string,
        file: UploadedFilePayload,
        actorId: string,
        actorName: string
      ) => {
        const req = get().requests.find((a) => a.id === requestId);
        if (!req) {
          return { success: false, error: 'Solicitud no encontrada.' };
        }

        const nowIso = new Date().toISOString();
        const targetDoc = get().documents.find(
          (d) => (d.request_id === requestId || d.application_id === requestId) && d.requirement_id === requirementId
        );

        if (targetDoc) {
          const updatedDoc: RequestDocument = {
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
            id: createUuid(),
            request_id: requestId,
            application_id: requestId,
            actor_id: actorId,
            action: 'SUBSANACION_DOCUMENTO',
            previous_status: req.current_status,
            new_status: req.current_status,
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

          const client = getSupabaseClient();
          if (client) {
            client
              .from('application_documents')
              .update({
                file_name: updatedDoc.file_name,
                file_path: updatedDoc.file_path,
                file_size_bytes: updatedDoc.file_size_bytes,
                file_hash_sha256: updatedDoc.file_hash_sha256,
                mime_type: updatedDoc.mime_type,
                validation_status: updatedDoc.validation_status,
                validation_observations: null,
                validated_by: null,
                validated_at: null,
                uploaded_at: nowIso,
              })
              .eq('id', targetDoc.id)
              .then(({ error }) => {
                if (error) console.warn('Supabase document cure update error:', error.message);
              });

            const supabaseActorId = (actorId && actorId.length > 20) ? actorId : null;
            client
              .from('audit_history')
              .insert({
                id: newAudit.id,
                application_id: requestId,
                actor_id: supabaseActorId,
                action: newAudit.action,
                previous_status: newAudit.previous_status,
                new_status: newAudit.new_status,
                details: newAudit.details,
              })
              .then(({ error }) => {
                if (error) console.warn('Supabase audit insert error:', error.message);
              });
          }

          return { success: true, document: updatedDoc };
        }

        return { success: false, error: 'Requisito documental no encontrado en el expediente.' };
      },

      subsanarDocument: async (
        applicationId: string,
        requirementId: string,
        file: UploadedFilePayload,
        actorId: string,
        actorName: string
      ) => {
        return get().cureDocument(applicationId, requirementId, file, actorId, actorName);
      },

      validateRequirementDocument: async (
        requestId: string,
        requirementId: string,
        status: DocumentValidationStatus,
        observations: string | null,
        validatedBy: string,
        validatedByName: string
      ) => {
        if ((status === 'RECHAZADO' || status === 'REJECTED') && (!observations || observations.trim().length === 0)) {
          return {
            success: false,
            error: 'Todo rechazo documental exige justificación motivada por escrito (RN-05, RF-13).',
          };
        }

        const nowIso = new Date().toISOString();
        const doc = get().documents.find(
          (d) => (d.request_id === requestId || d.application_id === requestId) && d.requirement_id === requirementId
        );

        if (!doc) {
          return { success: false, error: 'Documento no encontrado en el expediente.' };
        }

        const client = getSupabaseClient();
        if (client) {
          const { data, error } = await client.rpc('validate_application_document', {
            p_application_id: requestId,
            p_document_id: doc.id,
            p_file_hash: doc.file_hash_sha256,
            p_status: status,
            p_observations: observations,
          }).overrideTypes<Pick<FiledApplication, 'audit'> & { document: RequestDocument }, { merge: false }>();
          if (error || !data || typeof data !== 'object' || !('document' in data)) {
            return { success: false, error: error?.message ?? 'Supabase no confirmó la validación del documento.' };
          }

          const document = { ...data.document, request_id: requestId };
          set((state) => ({
            documents: state.documents.map((item) => item.id === document.id ? document : item),
            auditHistory: [...state.auditHistory, { ...data.audit, request_id: requestId }],
          }));
          return { success: true, document };
        }

        const updatedDoc: RequestDocument = {
          ...doc,
          validation_status: status,
          validation_observations: observations || null,
          validated_by: validatedBy,
          validated_at: nowIso,
        };

        const auditItem: AuditHistory = {
          id: createUuid(),
          request_id: requestId,
          application_id: requestId,
          actor_id: validatedBy,
          action: (status === 'VALIDO' || status === 'VALID') ? 'DOCUMENTO_VALIDADO' : 'DOCUMENTO_RECHAZADO',
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

      finalizeAdministrativeValidation: async (
        requestId: string,
        validatedBy: string,
        validatedByName: string
      ) => {
        const req = get().requests.find((a) => a.id === requestId);
        if (!req) {
          return { success: false, error: 'Solicitud no encontrada.' };
        }

        const typeId = req.request_type_id || req.application_type_id || '';
        const catalog = useCatalogStore.getState();
        const typeReqs = catalog.requirements.filter(
          (r) => (r.request_type_id || r.application_type_id) === typeId
        );
        const mandatoryReqs = typeReqs.filter((r) => r.is_mandatory);
        const docs = get().documents.filter((d) => d.request_id === requestId || d.application_id === requestId);

        let hasRejectedNonSubsanable = false;
        let hasRejectedSubsanable = false;
        let missingMandatoryCount = 0;

        for (const r of mandatoryReqs) {
          const doc = docs.find((d) => d.requirement_id === r.id);
          if (!doc) {
            missingMandatoryCount++;
            if (!r.is_subsanable) hasRejectedNonSubsanable = true;
            else hasRejectedSubsanable = true;
          } else if (doc.validation_status === 'RECHAZADO' || doc.validation_status === 'REJECTED') {
            if (!r.is_subsanable) hasRejectedNonSubsanable = true;
            else hasRejectedSubsanable = true;
          } else if (doc.validation_status === 'PENDIENTE' || doc.validation_status === 'PENDING') {
            return {
              success: false,
              error: `El requisito obligatorio "${r.name}" aún no ha sido dictaminado como Válido o Rechazado.`,
            };
          }
        }

        let targetStatus: RequestDbStatus;
        let transitionReason: string;

        if (hasRejectedNonSubsanable) {
          targetStatus = 'RECHAZADA';
          transitionReason =
            'Rechazo directo en validación: Requisito esencial no subsanable insatisfecho o rechazado (RN-11).';
        } else if (hasRejectedSubsanable || missingMandatoryCount > 0) {
          targetStatus = 'PENDIENTE_DOCUMENTOS';
          transitionReason =
            'Pendiente por documentos: Se detectaron inconsistencias en requisitos subsanables. Plazo de 5 días hábiles otorgado.';
        } else {
          targetStatus = 'EN_REVISION';
          transitionReason =
            '100% de los requisitos obligatorios verificados conformes a la normativa. Expediente habilitado para evaluación técnica.';
        }

        if (req.current_status === targetStatus) {
          return { success: true, request: req, application: req };
        }

        return get().transitionRequestStatus(
          requestId,
          targetStatus,
          validatedBy,
          validatedByName,
          transitionReason,
          {
            validation_type: 'ADMINISTRATIVA_DOCUMENTAL',
            mandatory_total: mandatoryReqs.length,
            mandatory_valid: docs.filter((d) => d.validation_status === 'VALIDO' || d.validation_status === 'VALID').length,
          }
        );
      },

      transitionRequestStatus: async (
        requestId: string,
        newStatus: RequestDbStatus,
        actorId: string,
        actorName: string,
        reason?: string,
        details?: Record<string, unknown>
      ) => {
        const req = get().requests.find((a) => a.id === requestId);
        if (!req) {
          return { success: false, error: 'Solicitud no encontrada.' };
        }

        const currentStatus = req.current_status;

        if (currentStatus === 'CERRADA' || currentStatus === 'CLOSED') {
          return {
            success: false,
            error: 'RN-01: El expediente se encuentra en estado CERRADA (estado final inmutable). No se admiten transiciones.',
          };
        }

        const allowedNext = ALLOWED_REQUEST_TRANSITIONS[currentStatus] || [];
        if (!allowedNext.includes(newStatus)) {
          return {
            success: false,
            error: `RF-21: Transición no permitida de "${currentStatus}" hacia "${newStatus}". Estados válidos: [${allowedNext.filter((s) => !s.includes('_')).length > 0 ? allowedNext.join(', ') : allowedNext.join(', ')}].`,
          };
        }

        if (
          (newStatus === 'RECHAZADA' || newStatus === 'REJECTED' || newStatus === 'APROBADA_CON_AJUSTES' || newStatus === 'APPROVED_WITH_ADJUSTMENTS') &&
          (!reason || reason.trim().length === 0)
        ) {
          return {
            success: false,
            error: `RN-05: La transición al estado "${newStatus}" exige una justificación motivada por escrito.`,
          };
        }

        if (newStatus === 'EN_REVISION' || newStatus === 'UNDER_REVIEW') {
          const typeId = req.request_type_id || req.application_type_id || '';
          const catalog = useCatalogStore.getState();
          const mandatoryReqs = catalog.requirements.filter(
            (r) => (r.request_type_id || r.application_type_id) === typeId && r.is_mandatory
          );
          const docs = get().documents.filter((d) => d.request_id === requestId || d.application_id === requestId);
          const validReqIds = new Set(
            docs.filter((d) => d.validation_status === 'VALIDO' || d.validation_status === 'VALID').map((d) => d.requirement_id)
          );
          const missingOrInvalid = mandatoryReqs.filter((m) => !validReqIds.has(m.id));

          if (missingOrInvalid.length > 0) {
            return {
              success: false,
              error: `RN-02: No es posible transitar a "En revisión" porque faltan requisitos obligatorios válidos: ${missingOrInvalid.map((m) => m.name).join(', ')}.`,
            };
          }
        }

        const client = getSupabaseClient();
        if (client) {
          const { data, error } = await client.rpc('transition_application_status', {
            p_application_id: requestId,
            p_previous_status: currentStatus,
            p_new_status: newStatus,
            p_reason: reason ?? null,
            p_details: details ?? {},
          }).overrideTypes<Pick<FiledApplication, 'application' | 'audit'>, { merge: false }>();
          if (error || !data || typeof data !== 'object' || !('application' in data)) {
            return { success: false, error: error?.message ?? 'Supabase no confirmó el cambio de estado.' };
          }

          const request = { ...data.application, request_type_id: data.application.application_type_id };
          set((state) => ({
            requests: state.requests.map((item) => item.id === requestId ? request : item),
            auditHistory: [...state.auditHistory, { ...data.audit, request_id: requestId }],
          }));
          return { success: true, request, application: request };
        }

        const nowIso = new Date().toISOString();
        const updatedReq: Request = {
          ...req,
          current_status: newStatus,
          updated_at: nowIso,
        };

        const auditItem: AuditHistory = {
          id: createUuid(),
          request_id: requestId,
          application_id: requestId,
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
          requests: state.requests.map((a) => (a.id === requestId ? updatedReq : a)),
          auditHistory: [...state.auditHistory, auditItem],
        }));

        return { success: true, request: updatedReq, application: updatedReq };
      },

      transitionApplicationStatus: async (
        applicationId: string,
        newStatus: RequestDbStatus,
        actorId: string,
        actorName: string,
        reason?: string,
        details?: Record<string, unknown>
      ) => {
        return get().transitionRequestStatus(applicationId, newStatus, actorId, actorName, reason, details);
      },

      checkReviewerConflict: (reviewerId: string, requestId: string) => {
        const req = get().requests.find((a) => a.id === requestId);
        if (!req) return { hasConflict: true, reason: 'Solicitud no encontrada.' };

        const usersStore = useUserStore.getState();
        const reviewer = usersStore.users.find((u) => u.id === reviewerId);
        if (!reviewer) return { hasConflict: true, reason: 'Evaluador no registrado.' };

        if (reviewer.id === req.applicant_id) {
          return {
            hasConflict: true,
            reason: 'RN-03: Conflicto de intereses directo. El evaluador es el autor solicitante del trámite.',
          };
        }

        if (reviewer.research_group_id && req.research_group_id) {
          if (reviewer.research_group_id === req.research_group_id) {
            return {
              hasConflict: true,
              reason: 'RN-14: Inhabilidad por conflicto de intereses. El evaluador pertenece al mismo grupo de investigación adscrito a la solicitud.',
            };
          }
        }

        return { hasConflict: false };
      },

      assignReviewer: async (
        requestId: string,
        reviewerId: string,
        deadlineDate: string,
        assignedBy: string,
        assignerName: string
      ) => {
        const conflict = get().checkReviewerConflict(reviewerId, requestId);
        if (conflict.hasConflict) {
          return { success: false, error: conflict.reason };
        }

        const req = get().requests.find((a) => a.id === requestId);
        if (!req) return { success: false, error: 'Solicitud no encontrada.' };

        const client = getSupabaseClient();
        if (client) {
          const { data, error } = await client.rpc('assign_application_reviewer', {
            p_application_id: requestId,
            p_reviewer_id: reviewerId,
            p_deadline: deadlineDate,
          }).overrideTypes<Pick<FiledApplication, 'audit'> & { assignment: ReviewerAssignment }, { merge: false }>();
          if (error || !data || typeof data !== 'object' || !('assignment' in data)) {
            return { success: false, error: error?.message ?? 'Supabase no confirmó la asignación.' };
          }

          const assignment = { ...data.assignment, request_id: requestId };
          set((state) => ({
            assignments: [
              ...state.assignments
                .filter((item) => item.id !== assignment.id)
                .map((item) => item.application_id === requestId ? { ...item, is_active: false } : item),
              assignment,
            ],
            auditHistory: [...state.auditHistory, { ...data.audit, request_id: requestId }],
          }));
          return { success: true, assignment };
        }

        const nowIso = new Date().toISOString();
        const reviewerUser = useUserStore.getState().users.find((u) => u.id === reviewerId);
        const reviewerName = reviewerUser?.full_name || 'Evaluador Par';

        const existingAssignments = get().assignments.filter(
          (asg) => (asg.request_id === requestId || asg.application_id === requestId) && asg.is_active
        );

        const updatedAssignments = get().assignments.map((asg) => {
          if ((asg.request_id === requestId || asg.application_id === requestId) && asg.is_active) {
            return { ...asg, is_active: false };
          }
          return asg;
        });

        const newAssignment: ReviewerAssignment = {
          id: `asg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          request_id: requestId,
          application_id: requestId,
          reviewer_id: reviewerId,
          deadline_date: deadlineDate,
          is_active: true,
          assigned_by: assignedBy,
          concept: null,
          concept_date: null,
          created_at: nowIso,
        };

        const auditItem: AuditHistory = {
          id: createUuid(),
          request_id: requestId,
          application_id: requestId,
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

      getActiveAssignment: (requestId: string) => {
        return get().assignments.find(
          (asg) => (asg.request_id === requestId || asg.application_id === requestId) && asg.is_active
        );
      },

      getAssignmentsByReviewer: (reviewerId: string) => {
        return get().assignments.filter((asg) => asg.reviewer_id === reviewerId && asg.is_active);
      },

      addTechnicalObservation: async (
        requestId: string,
        authorId: string,
        authorName: string,
        category: ObservationCategory,
        content: string
      ) => {
        if (!content || content.trim().length === 0) {
          return { success: false, error: 'El contenido de la observación no puede estar vacío.' };
        }

        const nowIso = new Date().toISOString();
        const activeAssignment = get().getActiveAssignment(requestId);

        const newObs: Observation = {
          id: `obs-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          request_id: requestId,
          application_id: requestId,
          assignment_id: activeAssignment?.id || null,
          author_id: authorId,
          category,
          content: content.trim(),
          is_resolved: false,
          applicant_response: null,
          created_at: nowIso,
        };

        const auditItem: AuditHistory = {
          id: createUuid(),
          request_id: requestId,
          application_id: requestId,
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
          id: createUuid(),
          request_id: obs.request_id || obs.application_id || '',
          application_id: obs.request_id || obs.application_id || '',
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

      getObservationsByRequest: (requestId: string) => {
        return get().observations.filter((o) => o.request_id === requestId || o.application_id === requestId);
      },

      getObservationsByApplication: (applicationId: string) => {
        return get().getObservationsByRequest(applicationId);
      },

      submitReviewerConcept: async (
        requestId: string,
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

        const req = get().requests.find((a) => a.id === requestId);
        if (!req) return { success: false, error: 'Solicitud no encontrada.' };

        const activeAsg = get().getActiveAssignment(requestId);
        if (!activeAsg || activeAsg.reviewer_id !== reviewerId) {
          return {
            success: false,
            error: 'El evaluador no tiene una asignación activa sobre esta solicitud.',
          };
        }

        const client = getSupabaseClient();
        if (client) {
          const { data, error } = await client.rpc('submit_application_review', {
            p_application_id: requestId,
            p_assignment_id: activeAsg.id,
            p_concept: concept,
            p_justification: justification,
          }).overrideTypes<Pick<FiledApplication, 'application' | 'audit'> & { assignment: ReviewerAssignment }, { merge: false }>();
          if (error || !data || typeof data !== 'object' || !('assignment' in data)) {
            return { success: false, error: error?.message ?? 'Supabase no confirmó el concepto técnico.' };
          }

          const request = { ...data.application, request_type_id: data.application.application_type_id };
          set((state) => ({
            requests: state.requests.map((item) => item.id === requestId ? request : item),
            assignments: state.assignments.map((item) => item.id === activeAsg.id
              ? { ...data.assignment, request_id: requestId }
              : item),
            auditHistory: [...state.auditHistory, { ...data.audit, request_id: requestId }],
          }));
          return { success: true, request, application: request };
        }

        const nowIso = new Date().toISOString();
        const updatedAsg: ReviewerAssignment = {
          ...activeAsg,
          concept,
          concept_date: nowIso,
        };

        let targetStatus: RequestDbStatus;
        if (concept === 'FAVORABLE' || concept === 'FAVORABLE_CON_AJUSTES' || concept === 'FAVORABLE_WITH_ADJUSTMENTS') {
          targetStatus = 'LISTA_COMITE';
        } else {
          targetStatus = 'RECHAZADA';
        }

        const result = await get().transitionRequestStatus(
          requestId,
          targetStatus,
          reviewerId,
          reviewerName,
          `Emisión de concepto técnico: ${concept}. Justificación: ${justification}`,
          {
            reviewer_concept: concept,
            concept_date: nowIso,
          }
        );
        if (result.success) {
          set((state) => ({
            assignments: state.assignments.map((a) => (a.id === activeAsg.id ? updatedAsg : a)),
          }));
        }
        return result;
      },

      getStatusCounts: () => {
        const reqs = get().requests;
        const counts: Record<string, number> = {
          RADICADA: 0,
          PENDIENTE_DOCUMENTOS: 0,
          EN_REVISION: 0,
          LISTA_COMITE: 0,
          APROBADA: 0,
          APROBADA_CON_AJUSTES: 0,
          RECHAZADA: 0,
          CERRADA: 0,
        };

        for (const req of reqs) {
          const s = req.current_status;
          if (counts[s] !== undefined) {
            counts[s]++;
          } else if (s === 'SUBMITTED') {
            counts.RADICADA++;
          } else if (s === 'PENDING_DOCUMENTS') {
            counts.PENDIENTE_DOCUMENTOS++;
          } else if (s === 'UNDER_REVIEW') {
            counts.EN_REVISION++;
          } else if (s === 'COMMITTEE_READY') {
            counts.LISTA_COMITE++;
          } else if (s === 'APPROVED') {
            counts.APROBADA++;
          } else if (s === 'APPROVED_WITH_ADJUSTMENTS') {
            counts.APROBADA_CON_AJUSTES++;
          } else if (s === 'REJECTED') {
            counts.RECHAZADA++;
          } else if (s === 'CLOSED') {
            counts.CERRADA++;
          }
        }

        return new Proxy(counts, {
          get(target, prop: string) {
            if (prop === 'SUBMITTED') return target.RADICADA;
            if (prop === 'PENDING_DOCUMENTS') return target.PENDIENTE_DOCUMENTOS;
            if (prop === 'UNDER_REVIEW') return target.EN_REVISION;
            if (prop === 'COMMITTEE_READY') return target.LISTA_COMITE;
            if (prop === 'APPROVED') return target.APROBADA;
            if (prop === 'APPROVED_WITH_ADJUSTMENTS') return target.APROBADA_CON_AJUSTES;
            if (prop === 'REJECTED') return target.RECHAZADA;
            if (prop === 'CLOSED') return target.CERRADA;
            return target[prop] ?? 0;
          },
        });
      },

      getDeadlineStatus: (requestId: string) => {
        const req = get().requests.find((a) => a.id === requestId);
        if (!req) {
          return {
            deadlineDate: null,
            daysRemaining: 0,
            isOverdue: false,
            isUrgent: false,
            description: 'No asignado',
          };
        }

        const activeAsg = get().getActiveAssignment(requestId);
        const now = new Date();

        if ((req.current_status === 'EN_REVISION' || req.current_status === 'UNDER_REVIEW') && activeAsg?.deadline_date) {
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

        if (req.current_status === 'PENDIENTE_DOCUMENTOS' || req.current_status === 'PENDING_DOCUMENTS') {
          return {
            deadlineDate: null,
            daysRemaining: 5,
            isOverdue: false,
            isUrgent: true,
            description: '5 días hábiles reglamentarios para subsanar requisitos (RN-11)',
          };
        }

        if (req.current_status === 'RADICADA' || req.current_status === 'SUBMITTED') {
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

      assertAuditHistoryImmutable: (recordId: string) => {
        throw new Error(
          `RNF-03: Operación denegada. La bitácora de auditoría e historial (registro ${recordId}) es estrictamente inmutable y append-only.`
        );
      },

      getRequestById: (id: string) => {
        return get().requests.find((a) => a.id === id);
      },

      getApplicationById: (id: string) => {
        return get().getRequestById(id);
      },

      getRequestsByApplicant: (applicantId: string) => {
        return get().requests.filter((a) => a.applicant_id === applicantId);
      },

      getApplicationsByApplicant: (applicantId: string) => {
        return get().getRequestsByApplicant(applicantId);
      },

      getDocumentsByRequest: (requestId: string) => {
        return get().documents.filter((d) => d.request_id === requestId || d.application_id === requestId);
      },

      getDocumentsByApplication: (applicationId: string) => {
        return get().getDocumentsByRequest(applicationId);
      },

      getAuditHistoryByRequest: (requestId: string) => {
        return get()
          .auditHistory.filter((a) => a.request_id === requestId || a.application_id === requestId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      },

      getAuditHistoryByApplication: (applicationId: string) => {
        return get().getAuditHistoryByRequest(applicationId);
      },

      computePendingRequirements: (req: Request) => {
        switch (req.current_status) {
          case 'SUBMITTED':
          case 'RADICADA':
            return 'En espera de validación documental administrativa';
          case 'PENDING_DOCUMENTS':
          case 'PENDIENTE_DOCUMENTOS':
            return 'Cargar documentos subsanables rechazados';
          case 'UNDER_REVIEW':
          case 'EN_REVISION':
            return 'En evaluación técnica por revisor par asignado';
          case 'COMMITTEE_READY':
          case 'LISTA_COMITE':
            return 'En agenda para deliberación en sesión de comité';
          case 'APPROVED':
          case 'APROBADA':
            return 'Trámite finalizado exitosamente';
          case 'APPROVED_WITH_ADJUSTMENTS':
          case 'APROBADA_CON_AJUSTES':
            return 'Entregar ajustes menores concertados en sesión';
          case 'REJECTED':
          case 'RECHAZADA':
            return 'Solicitud rechazada';
          case 'CLOSED':
          case 'CERRADA':
            return 'Expediente cerrado y archivado';
          default:
            return 'En trámite ordinario';
        }
      },

      computeQueFalta: (req: Request) => {
        return get().computePendingRequirements(req);
      },

      loadFromSupabase: async () => {
        set({ isLoading: true });
        const client = getSupabaseClient();
        if (!client) {
          set({ isLoading: false });
          return { success: false, error: 'Supabase no está conectado.' };
        }

        try {
          const [appsRes, docsRes, audRes, asgRes, obsRes] = await Promise.all([
            client.from('applications').select('*').order('created_at', { ascending: false }),
            client.from('application_documents').select('*'),
            client.from('audit_history').select('*').order('created_at', { ascending: true }),
            client.from('reviewer_assignments').select('*'),
            client.from('observations').select('*'),
          ]);

          const queryError = appsRes.error ?? docsRes.error ?? audRes.error ?? asgRes.error ?? obsRes.error;
          if (queryError) {
            set({ isLoading: false });
            return { success: false, error: queryError.message };
          }

          if (appsRes.data && appsRes.data.length > 0) {
            const mappedApps: Request[] = appsRes.data.map((app: any) => ({
              id: app.id,
              filing_number: app.filing_number,
              request_type_id: app.application_type_id,
              application_type_id: app.application_type_id,
              applicant_id: app.applicant_id,
              title: app.title,
              abstract: app.abstract,
              research_group_id: app.research_group_id,
              budget_requested: Number(app.budget_requested || 0),
              current_status: app.current_status,
              is_tutor_endorsed: !!app.is_tutor_endorsed,
              requires_committee: !!app.requires_committee,
              created_at: app.created_at,
              updated_at: app.updated_at,
            }));

            const mappedDocs: RequestDocument[] = (docsRes.data || []).map((d: any) => ({
              id: d.id,
              request_id: d.application_id,
              application_id: d.application_id,
              requirement_id: d.requirement_id,
              file_name: d.file_name,
              file_path: d.file_path,
              file_size_bytes: Number(d.file_size_bytes || 0),
              file_hash_sha256: d.file_hash_sha256,
              mime_type: d.mime_type,
              validation_status: d.validation_status,
              validation_observations: d.validation_observations,
              validated_by: d.validated_by,
              validated_at: d.validated_at,
              uploaded_at: d.uploaded_at,
            }));

            const mappedAud: AuditHistory[] = (audRes.data || []).map((a: any) => ({
              id: a.id,
              request_id: a.application_id,
              application_id: a.application_id,
              actor_id: a.actor_id,
              action: a.action,
              previous_status: a.previous_status,
              new_status: a.new_status,
              details: a.details || {},
              created_at: a.created_at,
            }));

            const mappedAsg: ReviewerAssignment[] = (asgRes.data || []).map((asg: any) => ({
              id: asg.id,
              request_id: asg.application_id,
              application_id: asg.application_id,
              reviewer_id: asg.reviewer_id,
              deadline_date: asg.deadline_date,
              is_active: asg.is_active,
              assigned_by: asg.assigned_by,
              concept: asg.concept,
              concept_date: asg.concept_date,
              created_at: asg.created_at,
            }));

            const mappedObs: Observation[] = (obsRes.data || []).map((o: any) => ({
              id: o.id,
              request_id: o.application_id,
              application_id: o.application_id,
              assignment_id: o.assignment_id,
              author_id: o.author_id,
              category: o.category,
              content: o.content,
              is_resolved: o.is_resolved,
              applicant_response: o.applicant_response,
              created_at: o.created_at,
            }));

            set({
              requests: mappedApps,
              documents: mappedDocs,
              auditHistory: mappedAud,
              assignments: mappedAsg,
              observations: mappedObs,
              isInitialized: true,
              isLoading: false,
            });
            return { success: true, count: mappedApps.length };
          }

          set({
            requests: [],
            documents: [],
            auditHistory: [],
            assignments: [],
            observations: [],
            isInitialized: true,
            isLoading: false,
          });
          return { success: true, count: 0 };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error al sincronizar solicitudes desde Supabase';
          set({ isLoading: false });
          return { success: false, error: msg };
        }
      },

      syncWithSupabase: async () => {
        return get().loadFromSupabase();
      },

      resetToInitialSeed: () => {
        set({
          requests: INITIAL_REQUESTS,
          documents: INITIAL_DOCUMENTS,
          auditHistory: INITIAL_AUDIT_HISTORY,
          assignments: INITIAL_ASSIGNMENTS,
          observations: INITIAL_OBSERVATIONS,
        });
      },
    }),
    {
      name: 'seed_requests_store',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            ...persistedState,
            requests: [],
            documents: [],
            auditHistory: [],
            assignments: [],
            observations: [],
            isInitialized: false,
          };
        }
        return persistedState;
      },
      partialize: () => ({}),
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

export const useApplicationStore = useRequestStore;
