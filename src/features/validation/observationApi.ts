import { getUserError } from '../../lib/userMessages.ts';
import { z } from 'zod';
import { getSupabaseClient } from '../../lib/supabase.ts';
import type { Observation, AuditHistory } from '../../types/database.ts';

export const observationSchema = z.object({
  id: z.string(), application_id: z.string(), assignment_id: z.string().nullable(), author_id: z.string(),
  category: z.enum(['ACLARACION', 'AJUSTE_OBLIGATORIO', 'SUGERENCIA']), content: z.string(),
  is_resolved: z.boolean(), applicant_response: z.string().nullable(), created_at: z.string(),
  verification_notes: z.string().nullable(), verified_at: z.string().nullable(), verified_by: z.string().nullable(),
});
const auditSchema = z.object({
  id: z.string(), application_id: z.string(), actor_id: z.string(), action: z.string(),
  details: z.record(z.string(), z.unknown()), created_at: z.string(),
});
const resultSchema = z.object({ observation: observationSchema, audit: auditSchema });

export async function fetchObservationSnapshot(signal: AbortSignal): Promise<{ observations: Observation[]; audit: AuditHistory[] }> {
  const client = getSupabaseClient();
  if (!client) throw new Error('No pudimos conectar. Revisa tu conexión e inténtalo nuevamente.');
  const [observations, audit] = await Promise.all([
    client.from('observations').select('*').order('created_at').abortSignal(signal),
    client.from('audit_history').select('*').in('action', ['AJUSTE_ADD', 'AJUSTE_RESPOND', 'AJUSTE_VERIFY']).order('created_at').abortSignal(signal),
  ]);
  if (observations.error || audit.error) throw new Error(getUserError(observations.error ?? audit.error, 'No pudimos cargar las observaciones. Inténtalo nuevamente.'));
  return {
    observations: z.array(observationSchema).parse(observations.data),
    audit: z.array(auditSchema).parse(audit.data).map(event => ({ ...event, previous_status: null, new_status: null })),
  };
}

interface ObservationAction {
  p_application_id: string;
  p_action: 'ADD' | 'RESPOND' | 'VERIFY';
  p_observation_id?: string;
  p_content: string;
  p_category?: string;
  p_accept?: boolean;
  p_expected_response?: string;
}

export async function observationAction(args: ObservationAction): Promise<
  { success: true; observation: Observation; audit: AuditHistory } | { success: false; error: string }
> {
  try {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'No pudimos guardar los cambios. Revisa tu conexión e inténtalo nuevamente; el texto sigue en el formulario.' };
    const { data, error } = await client.rpc('act_on_observation', args);
    const parsed = resultSchema.safeParse(data);
    if (error || !parsed.success) return { success: false, error: getUserError(error, 'No se pudo confirmar el guardado.') };
    const { observation, audit } = parsed.data;
    if (observation.application_id !== args.p_application_id || audit.application_id !== args.p_application_id
      || (args.p_observation_id && observation.id !== args.p_observation_id)) {
      return { success: false, error: 'No se pudo confirmar el expediente actualizado.' };
    }
    return { success: true, observation, audit: { ...audit, previous_status: null, new_status: null } };
  } catch {
    return { success: false, error: 'No se pudo confirmar el guardado. Revise la conexión.' };
  }
}
