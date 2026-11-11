import { z } from 'zod';
import { getSupabaseClient } from '../../lib/supabase.ts';

export const sessionSchema = z.object({
  id: z.string(), session_number: z.string(),
  session_type: z.enum(['ORDINARIA', 'EXTRAORDINARIA', 'ORDINARY', 'EXTRAORDINARY']),
  scheduled_at: z.string(), location_or_url: z.string(), quorum_required: z.number(),
  is_agenda_closed: z.boolean(), is_completed: z.boolean(), created_at: z.string(),
});
export const agendaSchema = z.object({
  id: z.string(), session_id: z.string(), application_id: z.string(),
  agenda_order: z.number(), speaker_id: z.string().nullable(), created_at: z.string(),
});
export const attendanceSchema = z.object({
  id: z.string(), session_id: z.string(), user_id: z.string(), user_name: z.string(),
  user_role: z.string(), attended: z.boolean(), notes: z.string(), updated_at: z.string(),
});
export const decisionSchema = z.object({
  id: z.string(), session_id: z.string(), application_id: z.string(),
  decision: z.enum(['APROBADA', 'APROBADA_CON_AJUSTES', 'RECHAZADA', 'APLAZADA',
    'APPROVED', 'APPROVED_WITH_ADJUSTMENTS', 'REJECTED', 'POSTPONED']),
  justification: z.string(), registered_by: z.string(), created_at: z.string(),
});
export const minuteSchema = z.object({
  id: z.string(), minute_number: z.string(), year: z.number(), session_id: z.string(),
  draft_content: z.string(), is_approved: z.boolean(), approved_at: z.string().nullable(),
  pdf_path: z.string().nullable(), created_at: z.string(),
});
const sessionResultSchema = z.object({
  session: sessionSchema.optional(), agendaItem: agendaSchema.nullable().optional(),
  attendance: attendanceSchema.optional(), decision: decisionSchema.optional(),
});

export type SessionAction = 'create' | 'add' | 'remove' | 'reorder' | 'speaker'
  | 'close' | 'attendance' | 'decision' | 'finalize';
export type MinutesAction = 'generate' | 'update' | 'approve';
type MutationResult<T> = ({ success: true } & T) | { success: false; error: string } | null;

export async function mutateSession(
  action: SessionAction,
  payload: Record<string, unknown>,
): Promise<MutationResult<z.infer<typeof sessionResultSchema>>> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.rpc('manage_committee_session', {
    p_action: action, p_payload: payload,
  });
  if (error) return { success: false as const, error: error.message };
  const result = sessionResultSchema.safeParse(data);
  if (!result.success) return { success: false as const, error: 'La respuesta de la sesión es inválida.' };
  const expectedFields = {
    create: 'session', add: 'agendaItem', remove: null, reorder: null, speaker: 'agendaItem',
    close: 'session', attendance: 'attendance', decision: 'decision', finalize: 'session',
  } as const;
  const expectedField = expectedFields[action];
  if (expectedField && !result.data[expectedField]) {
    return { success: false, error: 'La respuesta no incluye el registro guardado.' };
  }
  return { success: true as const, ...result.data };
}

export async function mutateMinutes(
  action: MinutesAction,
  payload: Record<string, unknown>,
): Promise<MutationResult<{ minute: z.infer<typeof minuteSchema> }>> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.rpc('manage_committee_minutes', {
    p_action: action, p_payload: payload,
  });
  if (error) return { success: false as const, error: error.message };
  const result = minuteSchema.safeParse(data);
  if (!result.success) return { success: false as const, error: 'La respuesta del acta es inválida.' };
  return { success: true as const, minute: result.data };
}
