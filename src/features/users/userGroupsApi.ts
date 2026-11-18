import { getSupabaseClient } from '../../lib/supabase.ts';

export async function saveUserResearchGroup(userId: string, groupId: string | null,
  previousGroupId: string | null): Promise<{ id: string; research_group_id: string | null }> {
  const client = getSupabaseClient();
  if (!client) throw new Error('No se pudo conectar con el servicio. La asignación no se guardó.');
  if (groupId) {
    const { data, error } = await client.from('research_groups').select('id').eq('id', groupId).eq('is_active', true).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('El grupo seleccionado ya no está activo. Actualiza el listado y elige otro.');
  }
  let update = client.from('profiles').update({ research_group_id: groupId }).eq('id', userId);
  update = previousGroupId ? update.eq('research_group_id', previousGroupId) : update.is('research_group_id', null);
  const { data, error } = await update.select('id,research_group_id').maybeSingle()
    .overrideTypes<{ id: string; research_group_id: string | null } | null, { merge: false }>();
  if (error) throw error;
  if (!data) throw new Error('No se confirmó el cambio. Actualiza los usuarios: la vinculación pudo cambiar o no tienes permiso.');
  return data;
}
