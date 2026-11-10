/**
 * TypeScript type definitions for the Seed platform data model.
 * Unified English identifiers for requests, documents, users, and committee entities.
 */

export type UserRole =
  | 'researcher'
  | 'administrative'
  | 'committee_member'
  | 'secretary'
  | 'leader'
  | 'admin'
  // Legacy Spanish aliases for backward compatibility
  | 'investigador'
  | 'administrativo'
  | 'integrante_comite'
  | 'miembro_comite'
  | 'secretario'
  | 'lider_grupo'
  | 'lider';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  roles?: UserRole[];
  academic_program: string | null;
  academic_link: string | null; // Docente planta, ocasional, estudiante, monitor
  research_group_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ResearchGroup {
  id: string;
  code: string;
  name: string;
  faculty: string;
  leader_id: string | null;
  is_active?: boolean;
  created_at: string;
}

export interface RequestType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  requires_committee: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
}
export type ApplicationType = RequestType;

export interface Requirement {
  id: string;
  request_type_id?: string;
  application_type_id?: string; // Legacy alias
  name: string;
  description: string | null;
  is_mandatory: boolean;
  is_subsanable: boolean;
  allowed_formats: string[];
  max_size_mb: number;
  template_url: string | null;
  cure_deadline_days: number;
  created_at: string;
}

export type RequestDbStatus =
  | 'SUBMITTED'
  | 'PENDING_DOCUMENTS'
  | 'UNDER_REVIEW'
  | 'COMMITTEE_READY'
  | 'APPROVED'
  | 'APPROVED_WITH_ADJUSTMENTS'
  | 'REJECTED'
  | 'CLOSED'
  // Legacy Spanish aliases
  | 'RADICADA'
  | 'PENDIENTE_DOCUMENTOS'
  | 'EN_REVISION'
  | 'LISTA_COMITE'
  | 'APROBADA'
  | 'APROBADA_CON_AJUSTES'
  | 'RECHAZADA'
  | 'CERRADA';

export type ApplicationDbStatus = RequestDbStatus;

export interface Request {
  id: string;
  filing_number: string;
  request_type_id: string;
  application_type_id?: string; // Legacy alias
  applicant_id: string;
  title: string;
  abstract: string | null;
  research_group_id: string | null;
  budget_requested: number;
  current_status: RequestDbStatus;
  is_tutor_endorsed: boolean;
  requires_committee: boolean;
  created_at: string;
  updated_at: string;
}
export type Application = Request;

export type DocumentValidationStatus =
  | 'PENDING'
  | 'VALID'
  | 'REJECTED'
  // Legacy Spanish aliases
  | 'PENDIENTE'
  | 'VALIDO'
  | 'RECHAZADO';

export interface RequestDocument {
  id: string;
  request_id?: string;
  application_id?: string; // Legacy alias
  requirement_id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  file_hash_sha256: string;
  mime_type: string;
  validation_status: DocumentValidationStatus;
  validation_observations: string | null;
  validated_by: string | null;
  validated_at: string | null;
  uploaded_at: string;
}
export type ApplicationDocument = RequestDocument;

export type ReviewerConcept =
  | 'FAVORABLE'
  | 'FAVORABLE_WITH_ADJUSTMENTS'
  | 'FAVORABLE_CON_AJUSTES'
  | 'UNFAVORABLE'
  | 'NO_FAVORABLE';

export interface ReviewerAssignment {
  id: string;
  request_id?: string;
  application_id?: string; // Legacy alias
  reviewer_id: string;
  deadline_date: string;
  is_active: boolean;
  assigned_by: string;
  concept: ReviewerConcept | null;
  concept_date: string | null;
  created_at: string;
}

export type ObservationCategory =
  | 'CLARIFICATION'
  | 'MANDATORY_ADJUSTMENT'
  | 'SUGGESTION'
  | 'ACLARACION'
  | 'AJUSTE_OBLIGATORIO'
  | 'SUGERENCIA';

export interface Observation {
  id: string;
  request_id?: string;
  application_id?: string; // Legacy alias
  assignment_id: string | null;
  author_id: string;
  category: ObservationCategory;
  content: string;
  is_resolved: boolean;
  applicant_response: string | null;
  created_at: string;
}

export type SessionType =
  | 'ORDINARY'
  | 'EXTRAORDINARY'
  | 'ORDINARIA'
  | 'EXTRAORDINARIA';

export interface CommitteeSession {
  id: string;
  session_number: string;
  session_type: SessionType;
  scheduled_at: string;
  location_or_url: string;
  quorum_required: number;
  is_agenda_closed: boolean;
  is_completed: boolean;
  created_at: string;
}

export interface SessionAgendaItem {
  id: string;
  session_id: string;
  request_id?: string;
  application_id?: string; // Legacy alias
  agenda_order: number;
  speaker_id: string | null;
  speaker_name?: string | null;
  created_at: string;
}

export interface SessionAttendance {
  id: string;
  session_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  attended: boolean;
  notes?: string;
  updated_at: string;
}

export type SessionDecisionType =
  | 'APPROVED'
  | 'APPROVED_WITH_ADJUSTMENTS'
  | 'REJECTED'
  | 'POSTPONED'
  | 'APROBADA'
  | 'APROBADA_CON_AJUSTES'
  | 'RECHAZADA'
  | 'APLAZADA';

export interface SessionDecision {
  id: string;
  session_id: string;
  request_id?: string;
  application_id?: string; // Legacy alias
  decision: SessionDecisionType;
  justification: string;
  registered_by: string;
  created_at: string;
}

export interface CommitteeMinutes {
  id: string;
  minute_number: string;
  year: number;
  session_id: string;
  draft_content: string;
  is_approved: boolean;
  approved_at: string | null;
  pdf_path: string | null;
  created_at: string;
}

export interface AuditHistory {
  id: string;
  request_id?: string;
  application_id?: string; // Legacy alias
  actor_id: string | null;
  action: string;
  previous_status: RequestDbStatus | null;
  new_status: RequestDbStatus | null;
  details: Record<string, unknown>;
  created_at: string;
}
