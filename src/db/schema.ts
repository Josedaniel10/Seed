import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Grupos de Investigación
export const researchGroups = pgTable('research_groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  faculty: text('faculty').notNull(),
  leaderName: text('leader_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Usuarios
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase UID o identificador
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(), // 'investigador', 'administrativo', 'integrante', 'secretario', 'lider', 'admin'
  affiliation: text('affiliation').default('docente'), // 'docente', 'estudiante', 'egresado'
  faculty: text('faculty').default('Facultad de Ingeniería'),
  program: text('program').default('Ingeniería de Sistemas'),
  researchGroupId: integer('research_group_id').references(() => researchGroups.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Tipos de Solicitud (Catálogo dinámico)
export const applicationTypes = pgTable('application_types', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  requiresCommittee: boolean('requires_committee').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Requisitos por Tipo de Solicitud
export const requirements = pgTable('requirements', {
  id: serial('id').primaryKey(),
  applicationTypeId: integer('application_type_id').references(() => applicationTypes.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  isMandatory: boolean('is_mandatory').notNull().default(true),
  isSubsanable: boolean('is_subsanable').notNull().default(true), // RN-11
  allowedFormats: text('allowed_formats').notNull().default('PDF, DOCX'),
  templateUrl: text('template_url'),
  orderIndex: integer('order_index').notNull().default(0),
});

// 5. Solicitudes de Investigación
export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  radicadoNumber: text('radicado_number').notNull().unique(), // Ej: SEC-2026-0001
  title: text('title').notNull(),
  summary: text('summary'),
  applicantId: integer('applicant_id').references(() => users.id).notNull(),
  applicantName: text('applicant_name').notNull(),
  applicantEmail: text('applicant_email').notNull(),
  researchGroupId: integer('research_group_id').references(() => researchGroups.id),
  applicationTypeId: integer('application_type_id').references(() => applicationTypes.id).notNull(),
  applicationTypeName: text('application_type_name').notNull(),
  status: text('status').notNull().default('Radicada'),
  // 'Radicada' | 'Pendiente por documentos' | 'En revisión' | 'Lista para comité' | 'Aprobada' | 'Aprobada con ajustes' | 'Rechazada' | 'Cerrada'
  budget: text('budget'),
  faculty: text('faculty').notNull().default('Facultad de Ingeniería'),
  assignedReviewerId: integer('assigned_reviewer_id').references(() => users.id),
  assignedReviewerName: text('assigned_reviewer_name'),
  reviewerDeadline: timestamp('reviewer_deadline'),
  reviewerConcept: text('reviewer_concept'), // 'favorable', 'favorable_con_ajustes', 'no_favorable'
  reviewerObservations: text('reviewer_observations'),
  committeeDecision: text('committee_decision'), // 'aprobada', 'aprobada_con_ajustes', 'rechazada', 'aplazada'
  committeeJustification: text('committee_justification'),
  subsanacionDeadline: timestamp('subsanacion_deadline'),
  submissionDate: timestamp('submission_date').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 6. Documentos cargados a la solicitud
export const applicationDocuments = pgTable('application_documents', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => applications.id).notNull(),
  requirementId: integer('requirement_id').references(() => requirements.id).notNull(),
  requirementName: text('requirement_name').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  filePath: text('file_path').notNull(),
  fileHash: text('file_hash'),
  validationStatus: text('validation_status').notNull().default('pending'), // 'pending', 'valid', 'rejected'
  rejectionReason: text('rejection_reason'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

// 7. Historial Inmutable de Actuaciones (RF-23)
export const auditHistory = pgTable('audit_history', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => applications.id).notNull(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),
  notes: text('notes'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// 8. Sesiones de Comité de Investigación (RF-24 a RF-28)
export const committeeSessions = pgTable('committee_sessions', {
  id: serial('id').primaryKey(),
  sessionCode: text('session_code').notNull().unique(), // Ej: ORD-2026-03
  sessionDate: timestamp('session_date').notNull(),
  location: text('location').notNull(),
  status: text('status').notNull().default('convocada'), // 'convocada', 'en_curso', 'finalizada'
  quorumConfirmed: boolean('quorum_confirmed').default(false),
  attendeesCount: integer('attendees_count').default(0),
  minutesDraft: text('minutes_draft'),
  minutesPdfUrl: text('minutes_pdf_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relaciones
export const usersRelations = relations(users, ({ one, many }) => ({
  researchGroup: one(researchGroups, {
    fields: [users.researchGroupId],
    references: [researchGroups.id],
  }),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  applicant: one(users, {
    fields: [applications.applicantId],
    references: [users.id],
  }),
  researchGroup: one(researchGroups, {
    fields: [applications.researchGroupId],
    references: [researchGroups.id],
  }),
  applicationType: one(applicationTypes, {
    fields: [applications.applicationTypeId],
    references: [applicationTypes.id],
  }),
  documents: many(applicationDocuments),
  history: many(auditHistory),
}));
