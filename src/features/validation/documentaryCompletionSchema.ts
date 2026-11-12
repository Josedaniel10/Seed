import { z } from 'zod';

const status = z.enum(['SUBMITTED', 'PENDING_DOCUMENTS', 'UNDER_REVIEW', 'COMMITTEE_READY',
  'APPROVED', 'APPROVED_WITH_ADJUSTMENTS', 'REJECTED', 'CLOSED', 'RADICADA',
  'PENDIENTE_DOCUMENTOS', 'EN_REVISION', 'LISTA_COMITE', 'APROBADA', 'APROBADA_CON_AJUSTES', 'RECHAZADA', 'CERRADA']);

export const documentaryCompletionSchema = z.object({
  application: z.object({
    id: z.string().uuid(), filing_number: z.string(), application_type_id: z.string().uuid(),
    applicant_id: z.string().uuid(), title: z.string(), abstract: z.string().nullable(),
    research_group_id: z.string().uuid().nullable(), budget_requested: z.coerce.number(),
    current_status: status, is_tutor_endorsed: z.boolean(), requires_committee: z.boolean(),
    created_at: z.string(), updated_at: z.string(),
  }),
  audits: z.array(z.object({
    id: z.string().uuid(), application_id: z.string().uuid(), actor_id: z.string().uuid().nullable(),
    action: z.string(), previous_status: status.nullable(), new_status: status.nullable(),
    details: z.record(z.string(), z.unknown()), created_at: z.string(),
  })).min(1),
});
