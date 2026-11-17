import { z } from 'zod';
import { typeSchema, requirementSchema } from '../catalog/catalogApi.ts';

// Postgres UUID columns also accept the fixed IDs in seed.sql, which do not
// encode an RFC UUID version/variant. Validate their full GUID shape instead.
const databaseId = z.guid();

const status = z.enum(['SUBMITTED', 'PENDING_DOCUMENTS', 'UNDER_REVIEW', 'COMMITTEE_READY',
  'APPROVED', 'APPROVED_WITH_ADJUSTMENTS', 'REJECTED', 'CLOSED', 'RADICADA',
  'PENDIENTE_DOCUMENTOS', 'EN_REVISION', 'LISTA_COMITE', 'APROBADA', 'APROBADA_CON_AJUSTES', 'RECHAZADA', 'CERRADA']);

export const documentaryCompletionSchema = z.object({
  application: z.object({
    catalog_snapshot: z.object({ type: typeSchema, requirements: z.array(requirementSchema) }).optional(),
    id: databaseId, filing_number: z.string(), application_type_id: databaseId,
    applicant_id: databaseId, title: z.string(), abstract: z.string().nullable(),
    research_group_id: databaseId.nullable(), budget_requested: z.coerce.number(),
    current_status: status, is_tutor_endorsed: z.boolean(), requires_committee: z.boolean(),
    created_at: z.string(), updated_at: z.string(),
  }),
  audits: z.array(z.object({
    id: databaseId, application_id: databaseId, actor_id: databaseId.nullable(),
    action: z.string(), previous_status: status.nullable(), new_status: status.nullable(),
    details: z.record(z.string(), z.unknown()), created_at: z.string(),
  })).min(1),
});
