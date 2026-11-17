import { getUserError } from '../../lib/userMessages.ts';
import { z } from 'zod';
import { getSupabaseClient } from '../../lib/supabase.ts';
import type { ApplicationType, Requirement } from '../../types/database.ts';

export const typeSchema = z.object({ id: z.string(), code: z.string(), name: z.string(), description: z.string().nullable(),
  icon_key: z.string().nullable().optional(), accent_color: z.string().nullable().optional(),
  requires_committee: z.boolean(), is_active: z.boolean(), display_order: z.number(), created_at: z.string() });
export const requirementSchema = z.object({ id: z.string(), application_type_id: z.string(), name: z.string(), description: z.string().nullable(),
  is_mandatory: z.boolean(), is_subsanable: z.boolean(), allowed_formats: z.array(z.string()), max_size_mb: z.number(),
  template_url: z.string().nullable(), template_revision: z.number().optional(), template_updated_at: z.string().nullable().optional(), cure_deadline_days: z.number(), is_active: z.boolean(), created_at: z.string() });
const responseSchema = z.object({ type: typeSchema.nullable(), requirement: requirementSchema.nullable(), deleted: z.boolean() });
type CatalogAction = 'TYPE_CREATE' | 'TYPE_UPDATE' | 'TYPE_DELETE' | 'REQUIREMENT_CREATE' | 'REQUIREMENT_UPDATE' | 'REQUIREMENT_DELETE';

export async function manageCatalog(action: CatalogAction, id: string | null, data: object): Promise<
  { success: true; type: ApplicationType | null; requirement: Requirement | null; deleted: boolean } | { success: false; error: string }
> {
  try {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'No pudimos guardar el catálogo. Inténtalo nuevamente más tarde.' };
    const result = await client.rpc('manage_catalog', { p_action: action, p_id: id, p_data: data });
    if (result.error) return { success: false, error: result.error.code === '23505' ? 'Ya existe un trámite con ese código.' : getUserError(result.error) };
    const parsed = responseSchema.safeParse(result.data);
    if (!parsed.success || (action.startsWith('TYPE_') && !parsed.data.type) || (action.startsWith('REQUIREMENT_') && !parsed.data.requirement)) {
      return { success: false, error: 'No se pudo confirmar el cambio del catálogo.' };
    }
    return { success: true, ...parsed.data };
  } catch {
    return { success: false, error: 'No se pudo guardar el catálogo. Revise la conexión y reintente.' };
  }
}
