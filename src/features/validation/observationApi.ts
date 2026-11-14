import { z } from 'zod';
import { getSupabaseClient } from '../../lib/supabase.ts';
import type { Observation, AuditHistory } from '../../types/database.ts';

const resultSchema = z.object({
  observation: z.object({
    id: z.string(), application_id: z.string(), assignment_id: z.string().nullable(), author_id: z.string(),
    category: z.enum(['ACLARACION', 'AJUSTE_OBLIGATORIO', 'SUGERENCIA']), content: z.string(),
    is_resolved: z.boolean(), applicant_response: z.string().nullable(), created_at: z.string(),
    verification_notes: z.string().nullable(), verified_at: z.string().nullable(), verified_by: z.string().nullable(),
  }),
  audit: z.object({
    id: z.string(), application_id: z.string(), actor_id: z.string(), action: z.string(),
    details: z.record(z.string(), z.unknown()), created_at: z.string(),
  }),
});

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
    if (!client) return { success: false, error: 'Conecte Supabase.' };
    const { data, error } = await client.rpc('act_on_observation', args);
    const parsed = resultSchema.safeParse(data);
    if (error || !parsed.success) return { success: false, error: error?.message ?? 'No se pudo confirmar el guardado.' };
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
