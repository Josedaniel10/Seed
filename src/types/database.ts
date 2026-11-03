/**
 * Definiciones de tipos TypeScript para el modelo de datos de Supabase en Seed
 */

export type UserRole =
  | 'investigador'
  | 'administrativo'
  | 'integrante_comite'
  | 'secretario'
  | 'lider_grupo'
  | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
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

export interface ApplicationType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  requires_committee: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Requirement {
  id: string;
  application_type_id: string;
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

export type ApplicationDbStatus =
  | 'RADICADA'
  | 'PENDIENTE_DOCUMENTOS'
  | 'EN_REVISION'
  | 'LISTA_COMITE'
  | 'APROBADA'
  | 'APROBADA_CON_AJUSTES'
  | 'RECHAZADA'
  | 'CERRADA';

export interface Application {
  id: string;
  filing_number: string;
  application_type_id: string;
  applicant_id: string;
  title: string;
  abstract: string | null;
  research_group_id: string | null;
  budget_requested: number;
  current_status: ApplicationDbStatus;
  is_tutor_endorsed: boolean;
  requires_committee: boolean;
  created_at: string;
  updated_at: string;
}

export type DocumentValidationStatus = 'PENDIENTE' | 'VALIDO' | 'RECHAZADO';

export interface ApplicationDocument {
  id: string;
  application_id: string;
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

export type ReviewerConcept = 'FAVORABLE' | 'FAVORABLE_CON_AJUSTES' | 'NO_FAVORABLE';

export interface ReviewerAssignment {
  id: string;
  application_id: string;
  reviewer_id: string;
  deadline_date: string;
  is_active: boolean;
  assigned_by: string;
  concept: ReviewerConcept | null;
  concept_date: string | null;
  created_at: string;
}

export type ObservationCategory = 'ACLARACION' | 'AJUSTE_OBLIGATORIO' | 'SUGERENCIA';

export interface Observation {
  id: string;
  application_id: string;
  assignment_id: string | null;
  author_id: string;
  category: ObservationCategory;
  content: string;
  is_resolved: boolean;
  applicant_response: string | null;
  created_at: string;
}

export type SessionType = 'ORDINARIA' | 'EXTRAORDINARIA';

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

export type SessionDecisionType = 'APROBADA' | 'APROBADA_CON_AJUSTES' | 'RECHAZADA' | 'APLAZADA';

export interface SessionDecision {
  id: string;
  session_id: string;
  application_id: string;
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
  application_id: string;
  actor_id: string | null;
  action: string;
  previous_status: ApplicationDbStatus | null;
  new_status: ApplicationDbStatus | null;
  details: Record<string, unknown>;
  created_at: string;
}
